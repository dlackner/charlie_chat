/*
 * Deal Signals recurring scan job (steady state only).
 * Triggered on a schedule via a Supabase pg_cron function + the `http` extension (same
 * mechanism as trigger_weekly_recommendations() in database/functions/), which POSTs here
 * with a shared secret header - this route isn't user-scoped like weekly-recommendations,
 * so an open trigger would let anyone burn RealEstateAPI spend.
 *
 * Baselining a brand-new location is NOT done here anymore - that's now a per-market
 * operation (runMarketBaseline, lib/server/dealSignalsBaseline.ts) triggered when a user
 * saves a market on the setup page, scored against THAT user's own weights/threshold. This
 * job only does ongoing steady-state diffing.
 *
 * Two scan passes, at two different granularities:
 *
 * 1. Trigger signals (7, motivation-to-sell) - scanned per distinct LOCATION (deduped, so N
 *    users watching the same city only get scanned once), using last_update_date_min to
 *    narrow candidates. These are rare enough city-wide that no further narrowing is needed.
 *
 * 2. Market Watch signals (new_listing/price_reduced) - scanned per MARKET instead, using
 *    that market's own saved units/value/year criteria to narrow the candidate pool.
 *    mls_active alone would match every active listing city-wide, which is both far too
 *    broad to cheaply diff and not something last_update_date_min reliably narrows - so this
 *    pass queries mls_active/price_reduced directly, scoped to what each market actually
 *    cares about, same as the per-market baseline does.
 *
 * The first time this job ever sees a location with no scan_state row, it just seeds the
 * anchor timestamp and skips diffing that run (nothing to diff against yet, and per-market
 * baselining is responsible for populating the initial snapshot). Market Watch scanning is
 * similarly gated on a market's baseline_completed_at being set.
 *
 * Both passes read-then-merge the stored `flags` JSONB rather than overwriting it wholesale,
 * since a property can legitimately be touched by both passes independently - a blind
 * overwrite from one would silently erase the other's flags.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { searchRealEstateApi } from '@/lib/server/realEstateApi';
import {
  getLocationKey,
  buildLocationPayload,
  type DealSignalsLocation as DistinctLocation
} from '@/lib/server/dealSignalsLocation';
import {
  TRIGGER_SIGNALS,
  type TriggerSignal,
  extractCurrentFlags,
  buildEventPropertySnapshot,
  MARKET_WATCH_SIGNALS,
  MARKET_WATCH_NEW_LISTING_WINDOW_DAYS,
  extractMarketWatchFlags
} from '@/lib/server/dealSignalsExtraction';
import { buildMarketCriteriaPayload, type MarketForBaseline } from '@/lib/server/dealSignalsBaseline';

async function scanSteadyState(supabase: any, location: DistinctLocation, locationKey: string, lastScannedAt: string) {
  const locationPayload = buildLocationPayload(location);

  const candidatesResult = await searchRealEstateApi({
    property_type: 'MFR',
    ids_only: true,
    size: 10000,
    ...locationPayload,
    last_update_date_min: lastScannedAt
  });

  if (!candidatesResult.ok) {
    console.error(`Deal Signals steady state: candidate query failed for ${locationKey}: ${candidatesResult.error}`);
    return { candidatesChecked: 0, eventsCreated: 0 };
  }

  const candidateIds: string[] = Array.isArray(candidatesResult.data?.data) ? candidatesResult.data.data : [];
  let eventsCreated = 0;

  for (const id of candidateIds) {
    const detailResult = await searchRealEstateApi({
      ids: [parseInt(id, 10)],
      size: 1,
      ids_only: false,
      obfuscate: false,
      summary: false
    });

    if (!detailResult.ok) {
      console.error(`Deal Signals steady state: detail retrieval failed for property ${id}: ${detailResult.error}`);
      continue;
    }

    const record = detailResult.data?.data?.[0];
    if (!record) continue;

    const currentFlags = extractCurrentFlags(record);

    const { data: existingSnapshot } = await supabase
      .from('deal_signal_property_snapshots')
      .select('flags')
      .eq('property_id', id)
      .maybeSingle();

    const priorFlags: Record<string, boolean> = existingSnapshot?.flags || {};
    const newlyTriggered = TRIGGER_SIGNALS.filter((key) => currentFlags[key] && !priorFlags[key]);

    // Snapshot must be written before the event - deal_signal_events.property_id has a
    // foreign key on deal_signal_property_snapshots.property_id, so inserting the event
    // first fails for any property with no existing snapshot row yet.
    const now = new Date().toISOString();
    const { error: snapshotError } = await supabase
      .from('deal_signal_property_snapshots')
      .upsert(
        { property_id: id, location_key: locationKey, flags: { ...priorFlags, ...currentFlags }, last_checked_at: now, updated_at: now },
        { onConflict: 'property_id' }
      );
    if (snapshotError) {
      console.error(`Deal Signals steady state: snapshot upsert failed for property ${id}: ${snapshotError.message}`);
    }

    if (newlyTriggered.length > 0) {
      const propertySnapshot = buildEventPropertySnapshot(record);
      const eventRows = newlyTriggered.map((signalKey) => ({
        property_id: id,
        signal_key: signalKey,
        detected_at: now,
        property_snapshot: propertySnapshot
      }));

      const { error: eventError } = await supabase.from('deal_signal_events').insert(eventRows);
      if (eventError) {
        console.error(`Deal Signals steady state: event insert failed for property ${id}: ${eventError.message}`);
      } else {
        eventsCreated += eventRows.length;
      }
    }
  }

  return { candidatesChecked: candidateIds.length, eventsCreated };
}

async function scanMarketWatchForMarket(supabase: any, market: MarketForBaseline) {
  const locationKey = getLocationKey(market);
  const locationPayload = buildLocationPayload(market);
  const criteriaPayload = buildMarketCriteriaPayload(market);

  const [activeResult, reducedResult] = await Promise.all([
    searchRealEstateApi({
      property_type: 'MFR',
      ids_only: true,
      size: 10000,
      ...locationPayload,
      ...criteriaPayload,
      mls_active: true,
      mls_days_on_market_max: MARKET_WATCH_NEW_LISTING_WINDOW_DAYS
    }),
    searchRealEstateApi({
      property_type: 'MFR',
      ids_only: true,
      size: 10000,
      ...locationPayload,
      ...criteriaPayload,
      price_reduced: true
    })
  ]);

  if (!activeResult.ok) {
    console.error(`Deal Signals market watch: new_listing query failed for market ${market.id}: ${activeResult.error}`);
  }
  if (!reducedResult.ok) {
    console.error(`Deal Signals market watch: price_reduced query failed for market ${market.id}: ${reducedResult.error}`);
  }

  const newListingCandidateIds = new Set<string>(
    activeResult.ok && Array.isArray(activeResult.data?.data) ? activeResult.data.data.map(String) : []
  );
  const priceDropCandidateIds = new Set<string>(
    reducedResult.ok && Array.isArray(reducedResult.data?.data) ? reducedResult.data.data.map(String) : []
  );

  const candidateIds = Array.from(new Set<string>([...newListingCandidateIds, ...priceDropCandidateIds]));
  if (candidateIds.length === 0) return { candidatesChecked: 0, eventsCreated: 0 };

  // Free ids_only queries return every currently-matching listing, most of which we already
  // know about - skip the paid detail lookup for anything already flagged true, since these
  // flags only ever go false->true once per listing.
  const { data: existingRows } = await supabase
    .from('deal_signal_property_snapshots')
    .select('property_id, flags')
    .in('property_id', candidateIds);

  const priorFlagsByProperty = new Map<string, Record<string, boolean>>(
    (existingRows || []).map((r: any) => [r.property_id, r.flags || {}])
  );

  let eventsCreated = 0;
  let candidatesChecked = 0;

  for (const id of candidateIds) {
    const priorFlags = priorFlagsByProperty.get(id) || {};
    const needsCheck =
      (newListingCandidateIds.has(id) && !priorFlags.new_listing) ||
      (priceDropCandidateIds.has(id) && !priorFlags.price_reduced);
    if (!needsCheck) continue;

    candidatesChecked++;

    const detailResult = await searchRealEstateApi({
      ids: [parseInt(id, 10)],
      size: 1,
      ids_only: false,
      obfuscate: false,
      summary: false
    });

    if (!detailResult.ok) {
      console.error(`Deal Signals market watch: detail retrieval failed for property ${id}: ${detailResult.error}`);
      continue;
    }

    const record = detailResult.data?.data?.[0];
    if (!record) continue;

    const marketWatchFlags = extractMarketWatchFlags(record);
    const newlyTriggered = MARKET_WATCH_SIGNALS.filter((key) => marketWatchFlags[key] && !priorFlags[key]);

    // Snapshot must be written before the event - deal_signal_events.property_id has a
    // foreign key on deal_signal_property_snapshots.property_id, so inserting the event
    // first fails for any property with no existing snapshot row yet.
    const now = new Date().toISOString();
    const { error: snapshotError } = await supabase
      .from('deal_signal_property_snapshots')
      .upsert(
        { property_id: id, location_key: locationKey, flags: { ...priorFlags, ...marketWatchFlags }, last_checked_at: now, updated_at: now },
        { onConflict: 'property_id' }
      );
    if (snapshotError) {
      console.error(`Deal Signals market watch: snapshot upsert failed for property ${id}: ${snapshotError.message}`);
    }

    if (newlyTriggered.length > 0) {
      const propertySnapshot = buildEventPropertySnapshot(record);
      const eventRows = newlyTriggered.map((signalKey) => ({
        property_id: id,
        signal_key: signalKey,
        detected_at: now,
        property_snapshot: propertySnapshot
      }));

      const { error: eventError } = await supabase.from('deal_signal_events').insert(eventRows);
      if (eventError) {
        console.error(`Deal Signals market watch: event insert failed for property ${id}: ${eventError.message}`);
      } else {
        eventsCreated += eventRows.length;
      }
    }
  }

  return { candidatesChecked, eventsCreated };
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (!process.env.DEAL_SIGNALS_CRON_SECRET || cronSecret !== process.env.DEAL_SIGNALS_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const scanStartedAt = new Date().toISOString();

  const { data: marketRows, error: marketsError } = await supabase
    .from('deal_signal_markets')
    .select(
      'id, market_type, city, state, zip, county, units_min, units_max, assessed_value_min, assessed_value_max, estimated_value_min, estimated_value_max, year_built_min, year_built_max, baseline_completed_at'
    );

  if (marketsError) {
    return NextResponse.json({ error: `Failed to load watched markets: ${marketsError.message}` }, { status: 500 });
  }

  const distinctLocations = new Map<string, DistinctLocation>();
  for (const row of marketRows || []) {
    const key = getLocationKey(row);
    if (!distinctLocations.has(key)) distinctLocations.set(key, row);
  }

  const locationResults: any[] = [];

  for (const [locationKey, location] of distinctLocations) {
    const { data: scanState } = await supabase
      .from('deal_signal_scan_state')
      .select('last_scanned_at')
      .eq('location_key', locationKey)
      .maybeSingle();

    let outcome;
    if (!scanState?.last_scanned_at) {
      // New location, no baseline to diff against yet - seed the anchor and skip this run.
      // Per-market baselining (triggered on save) is what populates the initial snapshot.
      outcome = { mode: 'seeded' };
    } else {
      outcome = { mode: 'steady_state', ...(await scanSteadyState(supabase, location, locationKey, scanState.last_scanned_at)) };
    }

    await supabase
      .from('deal_signal_scan_state')
      .upsert({ location_key: locationKey, last_scanned_at: scanStartedAt }, { onConflict: 'location_key' });

    locationResults.push({ locationKey, ...outcome });
  }

  // Market Watch: per-market, not per-location - see file header. Only runs once a market
  // has a completed baseline (which is what populates the starting new_listing/price_reduced
  // state this pass diffs against).
  const marketWatchResults: any[] = [];
  for (const market of (marketRows || []) as MarketForBaseline[]) {
    if (!(market as any).baseline_completed_at) continue;
    const outcome = await scanMarketWatchForMarket(supabase, market);
    marketWatchResults.push({ marketId: market.id, ...outcome });
  }

  return NextResponse.json({
    scannedAt: scanStartedAt,
    locationsScanned: distinctLocations.size,
    locationResults,
    marketsScannedForWatch: marketWatchResults.length,
    marketWatchResults
  });
}
