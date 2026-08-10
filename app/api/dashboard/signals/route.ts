/*
 * Deal Signals feed aggregation.
 * Turns deal_signal_property_snapshots + deal_signal_events into the SignalEvent[] shape
 * SignalCard expects. Runs server-side with the admin client because snapshots/events have
 * no user-facing RLS policies (they're shared/system tables, not user-owned) - matching an
 * event to a user's digest has to happen here, not via client-side RLS.
 *
 * One card per PROPERTY, not per event: a property's card accumulates all its currently-true
 * trigger flags and a combined score, rather than showing a separate card each time a new
 * signal fires on the same property.
 *
 * Properties whose score cleared the market's min_signal_strength threshold during the
 * per-market baseline scan (lib/server/dealSignalsBaseline.ts) get an is_baseline event and
 * show up here immediately, phrased without any "X days ago" claim (we don't know when a
 * pre-existing condition actually started). Properties below that threshold only get a
 * flags-only snapshot (no event, needed for correct future diffing) and won't appear here
 * until a real steady-state change pushes them over - see the "if (!latestEvent) continue"
 * skip below.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getLocationKey, type DealSignalsLocation } from '@/lib/server/dealSignalsLocation';
import { passesMarketFilters, type MarketCriteria } from '@/lib/server/dealSignalsMarketFilters';
import {
  TRIGGER_SIGNAL_KEYS,
  getSignalLabel,
  defaultWeights,
  HIGH_EQUITY_THRESHOLD_PERCENT,
  LONG_TERM_OWNERSHIP_YEARS
} from '@/lib/dealSignalsCatalog';

interface MarketRow extends DealSignalsLocation, MarketCriteria {
  id: string;
}

const REASON_TEMPLATES: Record<string, (detectedLabel: string) => string> = {
  pre_foreclosure: (d) => `Notice of default filed ${d} - first foreclosure filing on record for this owner.`,
  foreclosure: (d) => `Active foreclosure proceeding filed ${d}.`,
  auction: (d) => `Foreclosure auction scheduled - detected ${d}.`,
  reo: (d) => `Bank repossessed this property after a failed foreclosure - detected ${d}.`,
  death: (d) => `Property likely entered probate ${d} following an owner's death.`,
  vacant: (d) => `USPS reports this property vacant - detected ${d}.`,
  tax_delinquent: (d) => `Owner fell behind on property taxes - detected ${d}.`
};

// Baseline events (is_baseline: true) come from a market's initial setup scan, not a real
// detected change - we don't know exactly when the underlying condition started, so these
// avoid any "X days ago" framing that would falsely imply recency.
const BASELINE_REASON_TEMPLATES: Record<string, string> = {
  pre_foreclosure: 'On file with a pre-foreclosure filing.',
  foreclosure: 'On file with an active foreclosure proceeding.',
  auction: 'On file with a scheduled foreclosure auction.',
  reo: 'On file as bank-owned (REO).',
  death: "On file as likely in probate following an owner's death.",
  vacant: 'On file as vacant per USPS.',
  tax_delinquent: 'On file as delinquent on property taxes.'
};

const BASELINE_DETECTED_LABEL = 'in initial scan';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}

export async function GET(_req: NextRequest) {
  try {
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

    const { data: marketRows, error: marketsError } = await admin
      .from('deal_signal_markets')
      .select(
        'id, market_type, city, state, zip, county, units_min, units_max, assessed_value_min, assessed_value_max, estimated_value_min, estimated_value_max, year_built_min, year_built_max'
      )
      .eq('user_id', user.id);

    if (marketsError) {
      return NextResponse.json({ error: `Failed to load markets: ${marketsError.message}` }, { status: 500 });
    }

    const markets: MarketRow[] = marketRows || [];
    if (markets.length === 0) {
      return NextResponse.json({ signals: [] });
    }

    // A location can have more than one market with different unit/value/year criteria.
    const marketsByLocationKey = new Map<string, MarketRow[]>();
    for (const m of markets) {
      const key = getLocationKey(m);
      const list = marketsByLocationKey.get(key) || [];
      list.push(m);
      marketsByLocationKey.set(key, list);
    }
    const locationKeys = Array.from(marketsByLocationKey.keys());

    const { data: weightsRow } = await admin
      .from('deal_signal_weights')
      .select('weights')
      .eq('user_id', user.id)
      .maybeSingle();

    const weights: Record<string, number> = { ...defaultWeights, ...(weightsRow?.weights || {}) };
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0) || 1;

    const { data: snapshotRows, error: snapshotsError } = await admin
      .from('deal_signal_property_snapshots')
      .select('property_id, location_key, flags')
      .in('location_key', locationKeys);

    if (snapshotsError) {
      return NextResponse.json({ error: `Failed to load snapshots: ${snapshotsError.message}` }, { status: 500 });
    }

    const activeSnapshots = (snapshotRows || []).filter((row: any) => TRIGGER_SIGNAL_KEYS.some((key) => row.flags?.[key]));
    if (activeSnapshots.length === 0) {
      return NextResponse.json({ signals: [] });
    }

    const propertyIds = activeSnapshots.map((s: any) => s.property_id);

    // Exclude properties the user has already decided on (favorited OR rejected) via the
    // existing Buy Box favorites mechanism - any row means "already reviewed."
    const { data: favoriteRows } = await admin
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', user.id)
      .in('property_id', propertyIds);
    const decidedPropertyIds = new Set((favoriteRows || []).map((f: any) => f.property_id));

    const remainingSnapshots = activeSnapshots.filter((s: any) => !decidedPropertyIds.has(s.property_id));
    if (remainingSnapshots.length === 0) {
      return NextResponse.json({ signals: [] });
    }

    const remainingIds = remainingSnapshots.map((s: any) => s.property_id);

    // "Not interested right now" - soft, unlike the favorites exclusion above. Only hides a
    // property while its latest event is no newer than the dismissal; a genuinely new signal
    // (real escalation) makes it reappear with no un-dismiss action needed.
    const { data: dismissalRows } = await admin
      .from('deal_signal_dismissals')
      .select('property_id, dismissed_at')
      .eq('user_id', user.id)
      .in('property_id', remainingIds);
    const dismissedAtByProperty = new Map<string, string>(
      (dismissalRows || []).map((d: any) => [d.property_id, d.dismissed_at])
    );

    const { data: eventRows, error: eventsError } = await admin
      .from('deal_signal_events')
      .select('property_id, signal_key, detected_at, property_snapshot, is_baseline')
      .in('property_id', remainingIds)
      .order('detected_at', { ascending: false });

    if (eventsError) {
      return NextResponse.json({ error: `Failed to load events: ${eventsError.message}` }, { status: 500 });
    }

    // Rows are newest-first, so the first one seen per property is its latest event.
    const latestEventByProperty = new Map<string, any>();
    for (const e of eventRows || []) {
      if (!latestEventByProperty.has(e.property_id)) latestEventByProperty.set(e.property_id, e);
    }

    const signals: any[] = [];

    for (const snap of remainingSnapshots) {
      const latestEvent = latestEventByProperty.get(snap.property_id);
      if (!latestEvent) continue; // below-threshold at baseline - flags only, no event yet

      const dismissedAt = dismissedAtByProperty.get(snap.property_id);
      if (dismissedAt && new Date(dismissedAt).getTime() >= new Date(latestEvent.detected_at).getTime()) continue;

      const propSnapshot = latestEvent.property_snapshot || {};
      const marketsForLocation = marketsByLocationKey.get(snap.location_key) || [];
      const matchedMarket = marketsForLocation.find((m) => passesMarketFilters(propSnapshot, m));
      if (!matchedMarket) continue;

      const activeFlags = TRIGGER_SIGNAL_KEYS.filter((key) => snap.flags?.[key]);
      if (activeFlags.length === 0) continue;

      const isAbsenteeOwner = !!propSnapshot.absenteeOwner;
      const isHighEquity = propSnapshot.equityPercent != null && propSnapshot.equityPercent >= HIGH_EQUITY_THRESHOLD_PERCENT;
      const isLongTermOwned = propSnapshot.yearsOwned != null && propSnapshot.yearsOwned >= LONG_TERM_OWNERSHIP_YEARS;

      let rawScore = 0;
      for (const key of activeFlags) rawScore += weights[key] || 0;
      if (isAbsenteeOwner) rawScore += weights.absentee_owner || 0;
      if (isHighEquity) rawScore += weights.high_equity || 0;
      if (isLongTermOwned) rawScore += weights.years_owned || 0;

      const signalStrength = Math.min(100, Math.round((rawScore / totalWeight) * 100));

      let detectedLabel: string;
      let reason: string;
      if (latestEvent.is_baseline) {
        detectedLabel = BASELINE_DETECTED_LABEL;
        reason = BASELINE_REASON_TEMPLATES[latestEvent.signal_key] || 'On file as of when you started watching.';
      } else {
        detectedLabel = formatRelativeTime(latestEvent.detected_at);
        const reasonTemplate = REASON_TEMPLATES[latestEvent.signal_key];
        reason = reasonTemplate ? reasonTemplate(detectedLabel) : `New signal detected ${detectedLabel}.`;
      }

      const supportingTags: string[] = [];
      if (isAbsenteeOwner) supportingTags.push('Absentee owner');
      if (isLongTermOwned) supportingTags.push(`${propSnapshot.yearsOwned} years owned`);
      if (isHighEquity) supportingTags.push('High equity');

      signals.push({
        id: `${snap.property_id}-${latestEvent.detected_at}`,
        propertyId: snap.property_id,
        marketId: matchedMarket.id,
        address: propSnapshot.address || 'Address unavailable',
        city: propSnapshot.city || '',
        state: propSnapshot.state || '',
        units: propSnapshot.units ?? 0,
        yearBuilt: propSnapshot.yearBuilt ?? 0,
        estimatedValue: propSnapshot.estimatedValue ?? 0,
        triggers: activeFlags.map(getSignalLabel),
        reason,
        supportingTags,
        signalStrength,
        detectedLabel,
        detectedAt: latestEvent.detected_at
      });
    }

    signals.sort((a, b) => b.signalStrength - a.signalStrength);

    return NextResponse.json({ signals });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}
