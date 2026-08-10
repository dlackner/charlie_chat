/*
 * Shared record-parsing helpers for Deal Signals - turning a RealEstateAPI full property
 * record into the flags/snapshot shapes stored in deal_signal_property_snapshots and
 * deal_signal_events. Used by both the recurring scan job (steady state) and the
 * per-market baseline function, so extraction logic can't drift between the two.
 */

export const TRIGGER_SIGNALS = ['pre_foreclosure', 'foreclosure', 'auction', 'reo', 'death', 'vacant', 'tax_delinquent'] as const;
export type TriggerSignal = typeof TRIGGER_SIGNALS[number];

// Broad enough to capture essentially all currently-delinquent properties - tax_delinquent
// has no boolean search filter, only a year-based one.
export const TAX_DELINQUENT_SEARCH_YEAR_MIN = 2000;

export function buildSignalFilterPayload(signalKey: TriggerSignal): Record<string, any> {
  if (signalKey === 'tax_delinquent') return { tax_delinquent_year_min: TAX_DELINQUENT_SEARCH_YEAR_MIN };
  return { [signalKey]: true };
}

export function extractCurrentFlags(record: any): Record<TriggerSignal, boolean> {
  return {
    pre_foreclosure: !!record.preForeclosure,
    foreclosure: !!record.foreclosure,
    auction: !!record.auction,
    reo: !!record.reo,
    death: !!record.death,
    vacant: !!record.vacant,
    tax_delinquent: !!record.taxDelinquent
  };
}

export function buildEventPropertySnapshot(record: any) {
  return {
    address: record.address?.address || record.address?.street || null,
    city: record.address?.city || null,
    state: record.address?.state || null,
    units: record.unitsCount ?? null,
    yearBuilt: record.yearBuilt ?? null,
    estimatedValue: record.estimatedValue ?? null,
    assessedValue: record.assessedValue ?? null,
    absenteeOwner: !!(record.outOfStateAbsenteeOwner || record.inStateAbsenteeOwner),
    yearsOwned: record.yearsOwned ?? null,
    equityPercent: record.equityPercent ?? null,
    mlsListingPrice: record.mlsListingPrice ?? null,
    mlsDaysOnMarket: record.mlsDaysOnMarket ?? null
  };
}

// Market Watch: on-market listing activity (new listings, price drops) - not a motivation
// signal, never scored or weighted, kept fully separate from TRIGGER_SIGNALS so it can never
// affect Signal Feed's signalStrength or threshold gating. Same false->true diff model as the
// triggers: a card fires once when a listing goes active / gets a price cut, never again for
// the same transition.
export const MARKET_WATCH_SIGNALS = ['new_listing', 'price_reduced'] as const;
export type MarketWatchSignal = typeof MARKET_WATCH_SIGNALS[number];

// Cost-bounding window for steady-state new-listing discovery - see project notes on why
// mls_active alone is too broad to scan cheaply. Matches a daily cron cadence with buffer
// for a missed run or two; does not affect baseline (which captures state unbounded).
export const MARKET_WATCH_NEW_LISTING_WINDOW_DAYS = 3;

export function buildMarketWatchFilterPayload(signalKey: MarketWatchSignal): Record<string, any> {
  if (signalKey === 'new_listing') return { mls_active: true };
  return { price_reduced: true };
}

export function extractMarketWatchFlags(record: any): Record<MarketWatchSignal, boolean> {
  return {
    new_listing: !!record.mlsActive,
    price_reduced: !!record.priceReduced
  };
}
