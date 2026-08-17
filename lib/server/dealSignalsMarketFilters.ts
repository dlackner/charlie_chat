/*
 * Shared "does this property match this market's saved criteria" check - used by both the
 * Signal Feed and Market Watch aggregation routes so the two can't drift on how units_min=0
 * ("include unknown unit count") or the other min/max fields are interpreted.
 */

export interface MarketCriteria {
  units_min: number | null;
  units_max: number | null;
  assessed_value_min: number | null;
  assessed_value_max: number | null;
  estimated_value_min: number | null;
  estimated_value_max: number | null;
  year_built_min: number | null;
  year_built_max: number | null;
}

export function passesMarketFilters(snapshot: any, market: MarketCriteria): boolean {
  if (market.units_min != null && market.units_min > 0) {
    if (snapshot.units == null || snapshot.units < market.units_min) return false;
  }
  if (market.units_max != null) {
    if (snapshot.units == null || snapshot.units > market.units_max) return false;
  }
  if (market.assessed_value_min != null && (snapshot.assessedValue == null || snapshot.assessedValue < market.assessed_value_min)) return false;
  if (market.assessed_value_max != null && (snapshot.assessedValue == null || snapshot.assessedValue > market.assessed_value_max)) return false;
  if (market.estimated_value_min != null && (snapshot.estimatedValue == null || snapshot.estimatedValue < market.estimated_value_min)) return false;
  if (market.estimated_value_max != null && (snapshot.estimatedValue == null || snapshot.estimatedValue > market.estimated_value_max)) return false;
  if (market.year_built_min != null && (snapshot.yearBuilt == null || snapshot.yearBuilt < market.year_built_min)) return false;
  if (market.year_built_max != null && (snapshot.yearBuilt == null || snapshot.yearBuilt > market.year_built_max)) return false;
  return true;
}
