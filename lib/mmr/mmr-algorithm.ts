// MMR (Maximal Marginal Relevance) Diversity Algorithm
// Selects diverse, relevant properties for recommendations

import type { MMRCandidate, MMRConfig, SimilarityWeights } from './types';
import { DEFAULT_SIMILARITY_WEIGHTS } from './types';

// Haversine distance calculation in kilometers
function haversineDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const latRad1 = lat1 * Math.PI / 180;
  const latRad2 = lat2 * Math.PI / 180;
  
  const a = Math.sin(dLat/2) ** 2 + 
    Math.cos(latRad1) * Math.cos(latRad2) * Math.sin(dLon/2) ** 2;
  
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Exponential similarity function - returns value between 0 and 1
function exponentialSimilarity(delta: number, scale: number): number {
  return Math.exp(-Math.abs(delta) / scale);
}

// Calculate multifamily-specific similarity between two candidates
export function calculateSimilarity(
  a: MMRCandidate, 
  b: MMRCandidate, 
  geoDiversityScaleKm: number = 5,
  weights: SimilarityWeights = DEFAULT_SIMILARITY_WEIGHTS
): number {
  
  // 1. Geographic similarity
  let geoSim = 0.2; // default low similarity if no coordinates
  
  // ZIP code exact match gets high similarity
  if (a.address_zip && b.address_zip && a.address_zip === b.address_zip) {
    geoSim = 1;
  } 
  // If we have coordinates, use distance-based similarity
  else if (a.latitude && a.longitude && b.latitude && b.longitude) {
    const distanceKm = haversineDistance(a.latitude, a.longitude, b.latitude, b.longitude);
    geoSim = exponentialSimilarity(distanceKm, geoDiversityScaleKm);
  }
  // City/state match gets moderate similarity
  else if (a.address_city && b.address_city && 
           a.address_state && b.address_state &&
           a.address_city.toLowerCase() === b.address_city.toLowerCase() &&
           a.address_state.toLowerCase() === b.address_state.toLowerCase()) {
    geoSim = 0.7;
  }

  // 2. Price per unit similarity (key metric for multifamily)
  let pricePerUnitSim = 0.5; // neutral default
  if (a.pricePerUnit && b.pricePerUnit) {
    const priceRatio = Math.abs(a.pricePerUnit - b.pricePerUnit) / 
                       Math.max(a.pricePerUnit, b.pricePerUnit);
    pricePerUnitSim = exponentialSimilarity(priceRatio, 0.3); // 30% band
  }

  // 3. Units similarity with multifamily bands
  let unitsSim = 0.6; // neutral default
  if (a.units && b.units) {
    // Different financing/management profiles matter more for larger differences
    const unitsRatio = Math.abs(a.units - b.units) / Math.max(a.units, b.units);
    unitsSim = exponentialSimilarity(unitsRatio, 0.4); // 40% band
    
    // Bonus similarity for same multifamily category
    const categoryA = categorizeByUnits(a.units);
    const categoryB = categorizeByUnits(b.units);
    if (categoryA === categoryB) {
      unitsSim = Math.min(1, unitsSim * 1.2);
    }
  }

  // 4. Vintage similarity
  let vintageSim = 0.6; // neutral default
  if (a.vintage && b.vintage) {
    const yearDiff = Math.abs(a.vintage - b.vintage);
    vintageSim = exponentialSimilarity(yearDiff, 20); // 20-year similarity scale
  }

  // 5. Property type similarity
  let typeSim = 0.7; // neutral default for multifamily
  if (a.propertyType && b.propertyType) {
    if (a.propertyType.toLowerCase() === b.propertyType.toLowerCase()) {
      typeSim = 1;
    } else {
      // Partial similarity for related multifamily types
      const typeA = normalizePropertyType(a.propertyType);
      const typeB = normalizePropertyType(b.propertyType);
      typeSim = typeA === typeB ? 0.8 : 0.4;
    }
  }

  // Calculate weighted similarity score
  const totalSimilarity = 
    weights.geographic * geoSim +
    weights.pricePerUnit * pricePerUnitSim +
    weights.units * unitsSim +
    weights.vintage * vintageSim +
    weights.propertyType * typeSim;

  return Math.max(0, Math.min(1, totalSimilarity));
}

// Helper function to categorize properties by unit count
function categorizeByUnits(units: number): string {
  if (units <= 4) return 'small_multifamily';
  if (units <= 19) return 'medium_multifamily';
  if (units <= 49) return 'large_multifamily';
  return 'apartment_complex';
}

// Helper function to normalize property types
function normalizePropertyType(propertyType: string): string {
  const type = propertyType.toLowerCase();
  if (type.includes('duplex') || type.includes('triplex') || type.includes('fourplex')) {
    return 'small_multifamily';
  }
  if (type.includes('apartment') || type.includes('complex')) {
    return 'apartment';
  }
  if (type.includes('condo') || type.includes('townhouse')) {
    return 'condo_townhouse';
  }
  return 'multifamily'; // default
}

// Main MMR selection algorithm
export function selectMMRRecommendations(
  candidates: MMRCandidate[], 
  config: MMRConfig,
  weights: SimilarityWeights = DEFAULT_SIMILARITY_WEIGHTS
): MMRCandidate[] {
  
  if (candidates.length === 0) return [];
  if (candidates.length <= config.k) return candidates;
  
  const selected: MMRCandidate[] = [];
  const remaining = [...candidates].sort((a, b) => b.relevance - a.relevance);
  
  // Track ZIP code counts for diversity
  const zipCounts: Record<string, number> = {};

  while (selected.length < config.k && remaining.length > 0) {
    let bestIdx = -1;
    let bestMMRScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      
      // Apply ZIP diversity constraint
      const zipCount = candidate.address_zip ? (zipCounts[candidate.address_zip] || 0) : 0;
      if (candidate.address_zip && zipCount >= config.maxPerZip) {
        continue; // Skip this candidate
      }

      // Calculate MMR score
      let maxSimilarity = 0;
      if (selected.length > 0) {
        maxSimilarity = Math.max(
          ...selected.map(selectedCandidate => 
            calculateSimilarity(
              candidate, 
              selectedCandidate, 
              config.geoDiversityScaleKm, 
              weights
            )
          )
        );
      }

      // MMR formula: λ * relevance - (1 - λ) * max_similarity
      const mmrScore = config.lambda * candidate.relevance - 
                       (1 - config.lambda) * maxSimilarity;

      if (mmrScore > bestMMRScore) {
        bestMMRScore = mmrScore;
        bestIdx = i;
      }
    }

    // If no valid candidate found, break
    if (bestIdx === -1) {
      break;
    }

    // Select the best candidate
    const selectedCandidate = remaining[bestIdx];
    selected.push(selectedCandidate);
    
    // Update ZIP count
    if (selectedCandidate.address_zip) {
      zipCounts[selectedCandidate.address_zip] = 
        (zipCounts[selectedCandidate.address_zip] || 0) + 1;
    }
    
    // Remove from remaining candidates
    remaining.splice(bestIdx, 1);
  }

  return selected;
}