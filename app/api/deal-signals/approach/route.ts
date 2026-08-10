import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANALYTICS_AI_MODEL || 'claude-haiku-4-5-20251001';

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

    // Check if we have a cached approach summary that's still valid
    // (regenerate if a new signal has fired since the cached version was generated)
    const { data: latestEvents } = await admin
      .from('deal_signal_events')
      .select('signal_key, detected_at')
      .eq('property_id', propertyId)
      .order('detected_at', { ascending: false })
      .limit(5);

    const latestEventTime = latestEvents?.[0]?.detected_at;
    if (snapshot.approach_generated_at && latestEventTime &&
        new Date(snapshot.approach_generated_at) >= new Date(latestEventTime)) {
      // Cache is still valid
      return NextResponse.json(snapshot.approach_summary);
    }

    // Generate new approach summary via Anthropic
    const prompt = buildApproachPrompt(snapshot, latestEvents || []);

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const approach = parseApproachResponse(responseText);

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

function buildApproachPrompt(snapshot: any, events: any[]): string {
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

  return `You are advising a real estate investor on how to approach an off-market multifamily property opportunity.

Property Details:
- Address: ${address}
- Units: ${units}
- Year Built: ${yearBuilt}
- Estimated Value: $${estimatedValue?.toLocaleString()}
- Equity Position: ${equity}%
- Absentee Owner: ${absentee}
- Active Signals: ${activeSignals}
- Recent Events: ${recentEvents}

Write two concise sections (3-4 sentences each) in plain English:

1. "Why Now" - explain what's likely going on with this owner and why this is a timely opportunity to reach out. Focus on neutral facts (ownership situation, property condition, equity position) rather than distress signals. What combination of factors makes them potentially receptive to a conversation?

2. "How to Approach" - give practical, respectful guidance on how to open a conversation with this owner. Be specific about: what to lead with, what tone to strike, and what NOT to do. If there's a hard deadline (like an auction), make that the conversation hook. Avoid generic real estate advice.

Do NOT mention the property's distress signals directly (foreclosure, liens, etc.) in the How to Approach section - that comes across as predatory. Instead, focus on positioning yourself as someone with useful information.

Output exactly this format (with headers):

**Why Now**
[3-4 sentences]

**How to Approach**
[3-4 sentences]`;
}

function parseApproachResponse(text: string): { whyNow: string; howToApproach: string } {
  const whyNowMatch = text.match(/\*\*Why Now\*\*\s*([\s\S]*?)(?=\*\*How to Approach\*\*)/);
  const howToApproachMatch = text.match(/\*\*How to Approach\*\*\s*([\s\S]*?)$/);

  return {
    whyNow: (whyNowMatch?.[1] || '').trim(),
    howToApproach: (howToApproachMatch?.[1] || '').trim()
  };
}
