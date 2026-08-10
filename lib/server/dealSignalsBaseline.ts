/*
 * Per-market baseline scan for Deal Signals.
 * Runs once per market (tracked via deal_signal_markets.baseline_completed_at), not once
 * per location like the recurring steady-state scan - this is scoped to one user's specific
 * criteria and weights, triggered right after they save a market on the setup page.
 *
 * All 10 signals (7 triggers + 3 stacking) are queried for free via ids_only, with the
 * market's own units/value/year criteria baked directly into each query - so results come
 * back already matching what this user is looking for, at zero cost. That gives a real
 * score per candidate property, computed from this market's owning user's actual weights.
 *
 * Only properties scoring >= the user's min_signal_strength get a paid full-record
 * retrieval (for display data) and a baseline event (is_baseline: true - phrased
 * differently from a real steady-state detection, since we don't know exactly when a
 * pre-existing condition actually started). Everything below threshold still gets a
 * lightweight snapshot (flags only, free) so future steady-state diffing stays correct -
 * see project_offmarket_signal_agent memory on why under-storing breaks the diff.
 *
 * Also silently captures Market Watch starting state (new_listing/price_reduced, from
 * mlsActive/priceReduced) for every matching property, unscored and with no event - so the
 * steady-state Market Watch scan (app/api/cron/deal-signals-scan) has an accurate baseline
 * to diff against and doesn't misfire on properties that were simply already listed/reduced.
 */

import { searchRealEstateApi } from '@/lib/server/realEstateApi';
import { getLocationKey, buildLocationPayload, type DealSignalsLocation } from '@/lib/server/dealSignalsLocation';
import {
  TRIGGER_SIGNALS,
  extractCurrentFlags,
  buildEventPropertySnapshot,
  buildSignalFilterPayload as buildTriggerFilterPayload,
  MARKET_WATCH_SIGNALS,
  buildMarketWatchFilterPayload,
  extractMarketWatchFlags
} from '@/lib/server/dealSignalsExtraction';
import { SIGNALS, defaultWeights as catalogDefaultWeights } from '@/lib/dealSignalsCatalog';

export interface MarketForBaseline extends DealSignalsLocation {
  id: string;
  units_min: number | null;
  units_max: number | null;
  assessed_value_min: number | null;
  assessed_value_max: number | null;
  estimated_value_min: number | null;
  estimated_value_max: number | null;
  year_built_min: number | null;
  year_built_max: number | null;
}

const ALL_SIGNAL_KEYS = SIGNALS.map((s) => s.key);

function buildSignalFilterPayload(signalKey: string): Record<string, any> {
  if ((TRIGGER_SIGNALS as readonly string[]).includes(signalKey)) {
    return buildTriggerFilterPayload(signalKey as (typeof TRIGGER_SIGNALS)[number]);
  }
  if (signalKey === 'years_owned') return { years_owned_min: 15 };
  // absentee_owner, high_equity - plain boolean search filters
  return { [signalKey]: true };
}

export function buildMarketCriteriaPayload(market: MarketForBaseline): Record<string, any> {
  const payload: Record<string, any> = {};
  if (market.units_min != null && market.units_min > 0) payload.units_min = market.units_min;
  if (market.units_max != null) payload.units_max = market.units_max;
  if (market.assessed_value_min != null) payload.assessed_value_min = market.assessed_value_min;
  if (market.assessed_value_max != null) payload.assessed_value_max = market.assessed_value_max;
  if (market.estimated_value_min != null) payload.value_min = market.estimated_value_min;
  if (market.estimated_value_max != null) payload.value_max = market.estimated_value_max;
  if (market.year_built_min != null) payload.year_built_min = market.year_built_min;
  if (market.year_built_max != null) payload.year_built_max = market.year_built_max;
  return payload;
}

export async function runMarketBaseline(
  admin: any,
  market: MarketForBaseline,
  weights: Record<string, number>,
  minSignalStrength: number
) {
  const locationKey = getLocationKey(market);
  const locationPayload = buildLocationPayload(market);
  const criteriaPayload = buildMarketCriteriaPayload(market);

  const flagsByProperty = new Map<string, Record<string, boolean>>();

  for (const signalKey of ALL_SIGNAL_KEYS) {
    const result = await searchRealEstateApi({
      property_type: 'MFR',
      ids_only: true,
      size: 10000,
      ...locationPayload,
      ...criteriaPayload,
      ...buildSignalFilterPayload(signalKey)
    });

    if (!result.ok) {
      console.error(`Deal Signals baseline: ${signalKey} query failed for market ${market.id}: ${result.error}`);
      continue;
    }

    const ids: string[] = Array.isArray(result.data?.data) ? result.data.data : [];
    for (const id of ids) {
      const existing = flagsByProperty.get(String(id)) || {};
      existing[signalKey] = true;
      flagsByProperty.set(String(id), existing);
    }
  }

  // Market Watch (new_listing / price_reduced): captured unbounded (no day cap - baseline
  // needs the true current state of every matching listing, not just recent ones) so future
  // steady-state diffing has an accurate starting point. Never scored, never a baseline event -
  // "already listed" or "already reduced" on day one isn't news, just silent state capture.
  for (const signalKey of MARKET_WATCH_SIGNALS) {
    const result = await searchRealEstateApi({
      property_type: 'MFR',
      ids_only: true,
      size: 10000,
      ...locationPayload,
      ...criteriaPayload,
      ...buildMarketWatchFilterPayload(signalKey)
    });

    if (!result.ok) {
      console.error(`Deal Signals baseline: ${signalKey} query failed for market ${market.id}: ${result.error}`);
      continue;
    }

    const ids: string[] = Array.isArray(result.data?.data) ? result.data.data : [];
    for (const id of ids) {
      const existing = flagsByProperty.get(String(id)) || {};
      existing[signalKey] = true;
      flagsByProperty.set(String(id), existing);
    }
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0) || 1;
  let baselinedCount = 0;
  let retrievedCount = 0;

  for (const [propertyId, flags] of flagsByProperty) {
    const hasTrigger = TRIGGER_SIGNALS.some((key) => flags[key]);
    if (!hasTrigger) {
      const marketWatchOnlyFlags: Record<string, boolean> = {};
      for (const key of MARKET_WATCH_SIGNALS) if (flags[key]) marketWatchOnlyFlags[key] = true;

      if (Object.keys(marketWatchOnlyFlags).length > 0) {
        // No trigger and no score to gate on - just persist the starting state silently.
        const now = new Date().toISOString();
        const { error } = await admin.from('deal_signal_property_snapshots').upsert(
          { property_id: propertyId, location_key: locationKey, flags: marketWatchOnlyFlags, last_checked_at: now, updated_at: now },
          { onConflict: 'property_id' }
        );
        if (!error) baselinedCount++;
      }
      continue; // stacking-only or market-watch-only: never qualifies a property for Signal Feed
    }

    let rawScore = 0;
    for (const key of ALL_SIGNAL_KEYS) {
      if (flags[key]) rawScore += weights[key] ?? catalogDefaultWeights[key] ?? 0;
    }
    const score = Math.min(100, Math.round((rawScore / totalWeight) * 100));
    const now = new Date().toISOString();

    if (score < minSignalStrength) {
      // Below threshold: store flags only (free, needed for correct future diffing), no spend.
      const { error } = await admin.from('deal_signal_property_snapshots').upsert(
        { property_id: propertyId, location_key: locationKey, flags, last_checked_at: now, updated_at: now },
        { onConflict: 'property_id' }
      );
      if (!error) baselinedCount++;
      continue;
    }

    // Above threshold: pay for the full record, create a baseline event.
    const detailResult = await searchRealEstateApi({
      ids: [parseInt(propertyId, 10)],
      size: 1,
      ids_only: false,
      obfuscate: false,
      summary: false
    });

    if (!detailResult.ok) {
      console.error(`Deal Signals baseline: detail retrieval failed for property ${propertyId}: ${detailResult.error}`);
      continue;
    }

    const record = detailResult.data?.data?.[0];
    if (!record) continue;

    const currentFlags = extractCurrentFlags(record);
    // Freshly re-extracted from this paid record rather than trusted from the earlier ids_only
    // pass - avoids the below-threshold-write's flags getting overwritten with stale data here.
    const marketWatchFlags = extractMarketWatchFlags(record);
    const propertySnapshot = buildEventPropertySnapshot(record);
    const activeTriggers = TRIGGER_SIGNALS.filter((key) => currentFlags[key]);

    if (activeTriggers.length > 0) {
      const eventRows = activeTriggers.map((signalKey) => ({
        property_id: propertyId,
        signal_key: signalKey,
        detected_at: now,
        property_snapshot: propertySnapshot,
        is_baseline: true
      }));

      const { error: eventError } = await admin.from('deal_signal_events').insert(eventRows);
      if (eventError) {
        console.error(`Deal Signals baseline: event insert failed for property ${propertyId}: ${eventError.message}`);
      } else {
        retrievedCount++;
      }
    }

    const { error: snapshotError } = await admin.from('deal_signal_property_snapshots').upsert(
      { property_id: propertyId, location_key: locationKey, flags: { ...currentFlags, ...marketWatchFlags }, last_checked_at: now, updated_at: now },
      { onConflict: 'property_id' }
    );
    if (!snapshotError) baselinedCount++;
  }

  return { candidatesFound: flagsByProperty.size, baselined: baselinedCount, retrieved: retrievedCount };
}
