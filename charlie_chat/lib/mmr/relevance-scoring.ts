// MMR Relevance Scoring - Optimized for multifamily properties using existing schema

import type { 
  SavedProperty, 
  BuyBox, 
  MarketStatistics, 
  RelevanceScore, 
  MMRCandidate 
} from './types';

// Utility functions
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

const robust = (x: number, median: number, iqr: number): number => 
  clamp01(1 - Math.abs(x - median) / Math.max(1, iqr || median || 1));

// Price anchor selection (prioritize listing > estimated > assessed)
function priceAnchor(property: SavedProperty): number | null {
  return property.listing_price ?? property.estimated_value ?? property.assessed_value ?? null;
}

// Estimate units with multifamily-specific logic
function estimateUnits(property: SavedProperty): { 
  units: number | null; 
  penalty: number; 
  reasoning: string[] 
} {
  const reasons: string[] = [];
  
  if (property.units_count && property.units_count > 0) {
    return { units: property.units_count, penalty: 0, reasoning: [] };
  }
  
  // Multifamily-specific estimation with larger unit sizes (900 sq ft avg)
  if (property.property_type?.toLowerCase().includes("multi") && (property.square_feet ?? 0) > 0) {
    const estimatedUnits = Math.max(Math.round((property.square_feet as number) / 900), 2);
    reasons.push(`Estimated ${estimatedUnits} units from ${property.square_feet?.toLocaleString()} sq ft`);
    return { 
      units: estimatedUnits, 
      penalty: 0.02, // smaller penalty - estimation more reliable for multifamily
      reasoning: reasons 
    };
  }
  
  return { 
    units: null, 
    penalty: 0.08, // larger penalty - units critical for multifamily analysis
    reasoning: ["Unit count unavailable"] 
  };
}

// Calculate price per unit
function calculatePricePerUnit(property: SavedProperty, units: number | null): number | null {
  const price = priceAnchor(property);
  if (!price || !units || units <= 0) return null;
  return price / units;
}

// Main relevance scoring function
export function calculateRelevanceScore(
  property: SavedProperty, 
  buyBox: BuyBox, 
  marketStats: MarketStatistics
): RelevanceScore {
  const reasons: string[] = [];
  const price = priceAnchor(property);
  const { units, penalty: unitsPenalty, reasoning: unitsReasons } = estimateUnits(property);
  const pricePerUnit = calculatePricePerUnit(property, units);
  
  reasons.push(...unitsReasons);

  // 1. Price fit (35% weight) - prioritize price per unit for multifamily
  let priceFit = 0.5; // neutral default
  
  if (price != null && buyBox.priceMin != null && buyBox.priceMax != null) {
    if (price >= buyBox.priceMin && price <= buyBox.priceMax) {
      const mid = (buyBox.priceMin + buyBox.priceMax) / 2;
      priceFit = robust(price, mid, (buyBox.priceMax - buyBox.priceMin) / 2);
      
      // Blend with price-per-unit fit if available
      if (pricePerUnit && marketStats.price_per_unit_median) {
        const ppuFit = robust(
          pricePerUnit, 
          marketStats.price_per_unit_median, 
          marketStats.price_per_unit_iqr || marketStats.price_per_unit_median * 0.5
        );
        priceFit = 0.6 * priceFit + 0.4 * ppuFit; // blend total price + per-unit
        
        const marketMedian = Math.round(marketStats.price_per_unit_median);
        reasons.push(`$${Math.round(pricePerUnit).toLocaleString()}/unit vs $${marketMedian.toLocaleString()} market median`);
      }
    } else {
      // Softer penalty for out-of-range properties
      const mid = (buyBox.priceMin + buyBox.priceMax) / 2;
      priceFit = 0.3 * robust(price, mid, (buyBox.priceMax - buyBox.priceMin));
      
      if (price < buyBox.priceMin) {
        reasons.push(`Below target price range - potential value play`);
      } else {
        reasons.push(`Above target price range - premium property`);
      }
    }
  }

  // 2. Units fit (20% weight) - with multifamily-specific bands
  let unitsFit = 0.6; // neutral default
  
  if (units != null && buyBox.unitsMin != null && buyBox.unitsMax != null) {
    if (units >= buyBox.unitsMin && units <= buyBox.unitsMax) {
      const mid = (buyBox.unitsMin + buyBox.unitsMax) / 2;
      unitsFit = robust(units, mid, (buyBox.unitsMax - buyBox.unitsMin) / 2);
      reasons.push(`${units} units in ${buyBox.unitsMin}-${buyBox.unitsMax} target range`);
    } else {
      // Partial credit for out-of-range but still multifamily
      if (units >= 2) {
        unitsFit = 0.4; // Still multifamily, just not in preferred range
        if (units < buyBox.unitsMin) {
          reasons.push(`${units} units - smaller than target but manageable`);
        } else {
          reasons.push(`${units} units - larger scale opportunity`);
        }
      } else {
        unitsFit = 0.1; // Single family - poor fit for multifamily investors
        reasons.push(`Single-family property - outside multifamily focus`);
      }
    }
  } else if (units && units >= 2) {
    unitsFit = 0.7; // Good default for any multifamily
    reasons.push(`${units}-unit multifamily property`);
  }

  // 3. Vintage fit (10% weight) - with sweet spot preferences
  let vintageFit = 0.6; // neutral default
  
  if (property.year_built != null) {
    if (buyBox.yearMin != null && buyBox.yearMax != null) {
      if (property.year_built >= buyBox.yearMin && property.year_built <= buyBox.yearMax) {
        const mid = (buyBox.yearMin + buyBox.yearMax) / 2;
        vintageFit = robust(property.year_built, mid, (buyBox.yearMax - buyBox.yearMin) / 2);
      } else {
        // Partial credit for out-of-range vintage
        const currentYear = new Date().getFullYear();
        const age = currentYear - property.year_built;
        vintageFit = age > 100 ? 0.2 : age < 5 ? 0.8 : 0.5;
      }
    }
    
    // Bonus for 1980s-2000s sweet spot (rehab opportunity vs maintenance balance)
    if (property.year_built >= 1980 && property.year_built <= 2000) {
      vintageFit = Math.min(1, vintageFit * 1.1);
      reasons.push(`${property.year_built} built - good rehab/maintenance balance`);
    } else if (property.year_built >= 2001) {
      reasons.push(`${property.year_built} built - modern construction`);
    } else if (property.year_built < 1980) {
      reasons.push(`${property.year_built} built - character property`);
    }
  }

  // 4. Deal signals (25% weight) - critical for multifamily investors
  const distressSignals = [
    property.pre_foreclosure,
    property.auction,
    property.reo,
    property.tax_lien
  ].filter(Boolean).length;
  
  const distressFit = clamp01(distressSignals / 2); // cap at 1 with >=2 signals
  
  const tenureFit = clamp01((property.years_owned ?? 0) / 10); // 10+ years = max score
  
  const equityFit = price ? clamp01((property.estimated_equity ?? 0) / price) : 0;
  
  const dealSignals = clamp01(0.5 * distressFit + 0.3 * tenureFit + 0.2 * equityFit);
  
  // Add reasons for deal signals
  if (distressSignals > 0) {
    const distressTypes = [
      property.pre_foreclosure && "pre-foreclosure",
      property.auction && "auction",
      property.reo && "REO",
      property.tax_lien && "tax lien"
    ].filter(Boolean);
    reasons.push(`Distressed: ${distressTypes.join(", ")}`);
  }
  
  if ((property.years_owned ?? 0) >= 7) {
    reasons.push(`${property.years_owned} years owned - potential seller motivation`);
  }

  if (property.estimated_equity && price && (property.estimated_equity / price) > 0.4) {
    const equityPct = Math.round((property.estimated_equity / price) * 100);
    reasons.push(`${equityPct}% equity - refinancing opportunity`);
  }

  // 5. On-market intent (5% weight)
  const marketFit = (property.mls_active || property.for_sale) ? 1 : 0.5;
  if (property.mls_active || property.for_sale) {
    reasons.push("Currently for sale - immediate opportunity");
  }

  // 6. Owner profile (5% weight)
  const absentee = (property.out_of_state_absentee_owner || property.in_state_absentee_owner) ? 1 : 0.6;
  const corp = property.corporate_owned ? 0.8 : 1; // slight penalty for corporate
  const ownerFit = clamp01(0.7 * absentee + 0.3 * corp);
  
  if (property.out_of_state_absentee_owner) {
    reasons.push("Out-of-state owner - motivated seller");
  } else if (property.in_state_absentee_owner) {
    reasons.push("Absentee owner - investor property");
  }

  // Calculate weighted score components
  const components = {
    priceFit,
    unitsFit,
    vintageFit,
    dealSignals,
    marketFit,
    ownerFit
  };

  // Final weighted score calculation
  let score = 
    0.35 * priceFit +
    0.20 * unitsFit +
    0.10 * vintageFit +
    0.25 * dealSignals +
    0.05 * marketFit +
    0.05 * ownerFit;

  // Apply penalties
  const totalPenalties = unitsPenalty;
  score -= totalPenalties;

  return { 
    score: clamp01(score), 
    reasoning: reasons.slice(0, 3), // limit to top 3 reasons for UI
    components,
    penalties: totalPenalties
  };
}

// Convert SavedProperty to MMRCandidate with scoring
export function propertyToCandidate(
  property: SavedProperty,
  buyBox: BuyBox,
  marketStats: MarketStatistics
): MMRCandidate {
  const relevanceResult = calculateRelevanceScore(property, buyBox, marketStats);
  const { units } = estimateUnits(property);
  const price = priceAnchor(property);
  const pricePerUnit = calculatePricePerUnit(property, units);

  return {
    property_id: property.property_id,
    relevance: relevanceResult.score,
    latitude: property.latitude ?? undefined,
    longitude: property.longitude ?? undefined,
    address_zip: property.address_zip ?? undefined,
    address_city: property.address_city ?? undefined,
    address_state: property.address_state ?? undefined,
    price: price ?? undefined,
    pricePerUnit: pricePerUnit ?? undefined,
    units: units ?? undefined,
    vintage: property.year_built ?? undefined,
    propertyType: property.property_type ?? undefined,
    whyRecommended: relevanceResult.reasoning,
    // Include component scores for analysis
    priceFit: relevanceResult.components.priceFit,
    unitsFit: relevanceResult.components.unitsFit,
    vintageFit: relevanceResult.components.vintageFit,
    dealSignals: relevanceResult.components.dealSignals,
    marketFit: relevanceResult.components.marketFit,
    ownerFit: relevanceResult.components.ownerFit
  };
}