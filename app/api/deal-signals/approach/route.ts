import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';
import { defaultWeights, TRIGGER_SIGNAL_KEYS, HIGH_EQUITY_THRESHOLD_PERCENT, LONG_TERM_OWNERSHIP_YEARS } from '@/lib/dealSignalsCatalog';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANALYTICS_AI_MODEL || 'claude-haiku-4-5-20251001';

// Below this signal strength, the model never gets to write the opening or closing
// of the outreach section - only the analytical middle. Two different models both
// found a way to sneak a "reach out" / "inquiry" suggestion past pure prompt
// instructions telling them not to, so the boundaries are now owned by code instead.
const EXPLORATORY_THRESHOLD = 40;
const EXPLORATORY_OPENING = 'Treat this as a research lead, not yet an actionable opportunity. Before anything else, verify the signal itself:';
const EXPLORATORY_CLOSING = 'Revisit this property only if further verification strengthens the signal - no outreach to the owner is warranted at this stage.';

export async function POST(req: NextRequest) {
  try {
    const { propertyId } = await req.json();
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          }
        }
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Load snapshot and latest event for this property
    const { data: snapshot } = await admin
      .from('deal_signal_property_snapshots')
      .select('*')
      .eq('property_id', propertyId)
      .maybeSingle();

    if (!snapshot) {
      return NextResponse.json({ error: 'Property snapshot not found' }, { status: 404 });
    }

    const { data: latestEvents } = await admin
      .from('deal_signal_events')
      .select('signal_key, detected_at, property_snapshot')
      .eq('property_id', propertyId)
      .order('detected_at', { ascending: false })
      .limit(5);

    // Load user weights to detect anomalies - also used below to invalidate the
    // cache when the user has re-weighted their signals since this was generated.
    const { data: weightsRow } = await admin
      .from('deal_signal_weights')
      .select('weights, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    // Check if we have a cached approach summary that's still valid. Regenerate if
    // either a new signal has fired, or the user's weighting has changed, since the
    // cached version was generated - a stale weighting can change which factors get
    // called out as driving the score.
    const latestEventTime = latestEvents?.[0]?.detected_at;
    const weightsUpdatedTime = weightsRow?.updated_at;
    const cacheIsStale =
      (latestEventTime && new Date(snapshot.approach_generated_at || 0) < new Date(latestEventTime)) ||
      (weightsUpdatedTime && new Date(snapshot.approach_generated_at || 0) < new Date(weightsUpdatedTime));

    if (snapshot.approach_generated_at && !cacheIsStale) {
      // Cache is still valid
      return NextResponse.json(snapshot.approach_summary);
    }

    const weights: Record<string, number> = { ...defaultWeights, ...(weightsRow?.weights || {}) };
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0) || 1;

    // signalStrength is never stored - it's derived from this user's weights applied to
    // the property's flags, same as the card badge in dashboard/signals/route.ts. Must
    // stay in sync with that calculation or the tier this route picks won't match what
    // the user sees on the card.
    const propSnapshot = latestEvents?.[0]?.property_snapshot || {};
    const activeFlags = TRIGGER_SIGNAL_KEYS.filter((key) => snapshot.flags?.[key]);
    const isAbsenteeOwner = !!propSnapshot.absenteeOwner;
    const isHighEquity = propSnapshot.equityPercent != null && propSnapshot.equityPercent >= HIGH_EQUITY_THRESHOLD_PERCENT;
    const isLongTermOwned = propSnapshot.yearsOwned != null && propSnapshot.yearsOwned >= LONG_TERM_OWNERSHIP_YEARS;

    let rawScore = 0;
    for (const key of activeFlags) rawScore += weights[key] || 0;
    if (isAbsenteeOwner) rawScore += weights.absentee_owner || 0;
    if (isHighEquity) rawScore += weights.high_equity || 0;
    if (isLongTermOwned) rawScore += weights.years_owned || 0;

    const signalStrength = Math.min(100, Math.round((rawScore / totalWeight) * 100));

    // Detect anomalous weights (>50% of total)
    const anomalousWeights: Record<string, number> = {};
    for (const [key, value] of Object.entries(weights)) {
      if (value > 0 && value / totalWeight > 0.5) {
        anomalousWeights[key] = value;
      }
    }

    // Generate new approach summary via Anthropic
    const isExploratoryTier = signalStrength < EXPLORATORY_THRESHOLD;
    const prompt = buildApproachPrompt(snapshot, latestEvents || [], anomalousWeights, signalStrength);

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    const responseText = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    const secondSectionHeader = isExploratoryTier ? 'Verification Focus' : 'How to Approach';
    const parsed = parseApproachResponse(responseText, secondSectionHeader);

    if (!parsed.whyNow || !parsed.howToApproach) {
      console.error('Deal Signals approach: empty section(s) after generation, not caching', {
        propertyId, signalStrength, whyNowEmpty: !parsed.whyNow, secondSectionEmpty: !parsed.howToApproach
      });
      return NextResponse.json({ error: 'Failed to generate a complete strategy - please try again' }, { status: 502 });
    }

    // Below the exploratory threshold, the model only ever wrote the analytical
    // middle - the opening and closing that frame it (and rule out contact) are
    // owned by code, not the prompt.
    const approach = isExploratoryTier
      ? {
          whyNow: parsed.whyNow,
          howToApproach: `${EXPLORATORY_OPENING} ${parsed.howToApproach} ${EXPLORATORY_CLOSING}`
        }
      : parsed;

    // Cache the result
    const now = new Date().toISOString();
    await admin
      .from('deal_signal_property_snapshots')
      .update({
        approach_summary: approach,
        approach_generated_at: now
      })
      .eq('property_id', propertyId);

    return NextResponse.json(approach);
  } catch (err: any) {
    console.error('Deal Signals approach error:', err);
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}

function buildApproachPrompt(snapshot: any, events: any[], anomalousWeights: Record<string, number>, signalStrength: number): string {
  const address = snapshot.address || 'the property';
  const units = snapshot.units || 'unknown';
  const yearBuilt = snapshot.year_built || 'unknown';
  const estimatedValue = snapshot.estimated_value || 'unknown';
  const absentee = snapshot.absentee_owner ? 'Yes' : 'No';
  const equity = snapshot.equity_percent || 100;

  const activeSignals = Object.entries(snapshot.flags || {})
    .filter(([_, v]) => v === true)
    .map(([k]) => k)
    .join(', ');

  const recentEvents = events
    .slice(0, 3)
    .map(e => `${e.signal_key} (${new Date(e.detected_at).toLocaleDateString()})`)
    .join(', ');

  // Determine signal tier and section-2 instructions.
  // Below EXPLORATORY_THRESHOLD, the model is only asked for the analytical
  // middle of the section (under a neutral "Verification Focus" header) - the
  // route.ts caller wraps it with a fixed opening/closing that rule out contact.
  // Prompt instructions alone weren't reliable here: two different models both
  // found a way to sneak a "reach out" / "inquiry" suggestion past a direct
  // instruction not to, so those boundaries are now owned by code instead.
  let signalTier = '';
  let section2Header = '';
  let section2Instructions = '';
  const genericGuidance = `Be specific about: what to lead with, what tone to strike, and what NOT to do. If there's a hard deadline (like an auction), make that the conversation hook. Avoid generic real estate advice.`;

  if (signalStrength < EXPLORATORY_THRESHOLD) {
    signalTier = 'Exploratory Only';
    section2Header = 'Verification Focus';
    section2Instructions = `This is a WEAK signal (below ${EXPLORATORY_THRESHOLD}%) - it may be stale, incomplete, or premature to act on. Write 2-3 sentences identifying which verification steps matter MOST for THIS specific property, given its active signals (${activeSignals || 'none listed'})${Object.keys(anomalousWeights).length > 0 ? ` and the investor's heavy weighting on ${Object.keys(anomalousWeights).join(', ')}` : ''}. Be concrete and specific to this property (e.g. which records to check and why, given what's active) rather than a generic checklist. This is purely about verifying the signal itself - do not mention contacting, messaging, calling, or reaching out to the owner in any form.`;
  } else if (signalStrength < 60) {
    signalTier = 'Marginal';
    section2Header = 'How to Approach';
    section2Instructions = `This is a MARGINAL signal (40-60%). Devote the first 2-3 sentences of "How to Approach" entirely to verification steps (confirm ownership, property condition, occupancy) with no mention of contacting the owner. Only in the final sentence may you note that a low-commitment inquiry could be considered, and only after verification - frame it as optional, not a recommendation.`;
  } else if (signalStrength < 80) {
    signalTier = 'Solid';
    section2Header = 'How to Approach';
    section2Instructions = `This is a SOLID signal (60-80%) and worth direct contact. Write "How to Approach" as practical, respectful guidance for opening a conversation with this owner. ${genericGuidance}`;
  } else {
    signalTier = 'High Confidence';
    section2Header = 'How to Approach';
    section2Instructions = `This is a STRONG signal (80%+) - prioritize this opportunity. Write "How to Approach" as confident, action-oriented guidance for contacting this owner. ${genericGuidance}`;
  }

  const anomalyWarning = Object.keys(anomalousWeights).length > 0
    ? `\n\nIMPORTANT: This property's score is heavily driven by the investor's weighting on ${Object.keys(anomalousWeights).join(', ')}. Verify this matches their actual strategy, as it may be skewing the signal.`
    : '';

  return `You are advising a real estate investor on how to approach an off-market multifamily property opportunity.

Signal Strength: ${signalStrength}% (${signalTier})

Property Details:
- Address: ${address}
- Units: ${units}
- Year Built: ${yearBuilt}
- Estimated Value: $${estimatedValue?.toLocaleString()}
- Equity Position: ${equity}%
- Absentee Owner: ${absentee}
- Active Signals: ${activeSignals}
- Recent Events: ${recentEvents}${anomalyWarning}

Write two concise sections in plain English:

1. "Why Now" (3-4 sentences) - explain what's likely going on with this owner and why this is a timely opportunity to reach out. Focus on neutral facts (ownership situation, property condition, equity position) rather than distress signals. What combination of factors makes them potentially receptive to a conversation?${Object.keys(anomalousWeights).length > 0 ? ' If the investor\'s weighting on a particular factor is unusually high, you may mention it as context (e.g., "Your heavy weighting on absentee owners suggests...") only if it genuinely affects the opportunity assessment.' : ''}

2. "${section2Header}" - ${section2Instructions}

Do NOT mention the property's distress signals directly (foreclosure, liens, etc.) in the ${section2Header} section - that comes across as predatory.${signalStrength >= EXPLORATORY_THRESHOLD ? ' Instead, focus on positioning yourself as someone with useful information.' : ''}

Output exactly this format (with headers, no other text):

**Why Now**
[3-4 sentences]

**${section2Header}**
[${signalStrength < EXPLORATORY_THRESHOLD ? '2-3 sentences' : '3-4 sentences'}]`;
}

function parseApproachResponse(text: string, secondSectionHeader: string): { whyNow: string; howToApproach: string } {
  const escapedHeader = secondSectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const whyNowMatch = text.match(new RegExp(`\\*\\*Why Now\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*${escapedHeader}\\*\\*)`));
  const howToApproachMatch = text.match(new RegExp(`\\*\\*${escapedHeader}\\*\\*\\s*([\\s\\S]*?)$`));

  return {
    whyNow: (whyNowMatch?.[1] || '').trim(),
    howToApproach: (howToApproachMatch?.[1] || '').trim()
  };
}
