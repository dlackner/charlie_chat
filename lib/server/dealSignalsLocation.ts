/*
 * Shared location-key logic for Deal Signals.
 * Used by both the scan job (to dedupe locations across users) and the feed aggregation
 * route (to match a property's snapshot back to a user's market) - must stay identical
 * between the two, so it lives in one place rather than being duplicated.
 */

export interface DealSignalsLocation {
  market_type: 'city' | 'zip' | 'county';
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
}

export function getLocationKey(loc: DealSignalsLocation): string {
  if (loc.market_type === 'zip' && loc.zip) return `zip:${loc.zip}`;
  if (loc.market_type === 'county' && loc.county && loc.state) return `county:${loc.county}|state:${loc.state}`;
  return `city:${loc.city}|state:${loc.state}`;
}

export function buildLocationPayload(loc: DealSignalsLocation): Record<string, any> {
  if (loc.market_type === 'zip' && loc.zip) return { zip: loc.zip };
  if (loc.market_type === 'county' && loc.county && loc.state) return { county: loc.county, state: loc.state };
  return { city: loc.city, state: loc.state };
}
