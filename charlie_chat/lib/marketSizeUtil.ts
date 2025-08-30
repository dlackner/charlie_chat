export interface MarketTier {
  tier: number;
  name: string;
  description: string;
  minRank: number;
  maxRank: number;
  recommendedMin: number;
  recommendedMax: number;
  sweetSpotMin: number;
  sweetSpotMax: number;
}

// ALGORITHM-OPTIMIZED MARKET TIERS
// Updated ranges optimized for improved recommendation algorithm featuring:
// - Statistical convergence analysis instead of volume-based learning
// - Geographic clustering for precision targeting
// - Production mode with learned preferences  
// - Cost-optimized two-part queries for selective property fetching
export const MARKET_TIERS: MarketTier[] = [
  {
    tier: 1,
    name: "Tier 1",
    description: "Major Metro",
    minRank: 1,
    maxRank: 25,
    recommendedMin: 200,     // Reduced 80%: Optimized for improved algorithm
    recommendedMax: 1600,    // Reduced 80%: Statistical convergence needs fewer properties
    sweetSpotMin: 400,       // Reduced 80%: Geographic clustering improves precision
    sweetSpotMax: 1000       // Reduced 80%: Production mode enables targeted queries
  },
  {
    tier: 2,
    name: "Tier 2", 
    description: "Large Metro",
    minRank: 26,
    maxRank: 100,
    recommendedMin: 90,      // Reduced 70%: Optimized for improved algorithm
    recommendedMax: 900,     // Reduced 70%: Statistical convergence needs fewer properties
    sweetSpotMin: 180,       // Reduced 70%: Geographic clustering improves precision
    sweetSpotMax: 450        // Reduced 70%: Production mode enables targeted queries
  },
  {
    tier: 3,
    name: "Tier 3",
    description: "Mid-Size City",
    minRank: 101,
    maxRank: 300,
    recommendedMin: 50,      // Reduced 50%: Optimized for improved algorithm
    recommendedMax: 400,     // Reduced 50%: Statistical convergence needs fewer properties
    sweetSpotMin: 100,       // Reduced 50%: Geographic clustering improves precision
    sweetSpotMax: 250        // Reduced 50%: Production mode enables targeted queries
  },
  {
    tier: 4,
    name: "Tier 4",
    description: "Small City",
    minRank: 301,
    maxRank: 915,
    recommendedMin: 25,      // Reduced 50%: Optimized for improved algorithm
    recommendedMax: 150,     // Reduced 50%: Statistical convergence needs fewer properties
    sweetSpotMin: 50,        // Reduced 50%: Geographic clustering improves precision
    sweetSpotMax: 100        // Reduced 50%: Production mode enables targeted queries
  }
];

// RECOMMENDATION-FOCUSED PROPERTY COUNT STATUS
// Messages emphasize recommendation quality and MMR algorithm effectiveness
export function getPropertyCountStatus(propertyCount: number, tier: MarketTier): {
  status: 'too-low' | 'good' | 'sweet-spot' | 'high' | 'too-high';
  color: string;
  message: string;
} {
  // Calculate systematic ranges matching PropertyCountRangeIndicator
  const getMidpoint = (tierNum: number) => {
    switch(tierNum) {
      case 1: return 700;   // Reduced from 3500 (80% reduction)
      case 2: return 300;   // Reduced from 1000 (70% reduction)  
      case 3: return 175;   // Reduced from 350 (50% reduction)
      case 4: return 75;    // Reduced from 150 (50% reduction)
      default: return 300;
    }
  };
  
  const midpoint = getMidpoint(tier.tier);
  const greenLower = Math.round(midpoint * 0.6);
  const greenUpper = Math.round(midpoint * 1.4);
  const blueLower = Math.round(greenLower * 0.8);
  const blueLeftRange = greenLower - blueLower;
  const blueRightMax = greenUpper + blueLeftRange;
  
  if (propertyCount < blueLower) {
    return {
      status: 'too-low',
      color: 'bg-red-100 text-red-800',
      message: 'Insufficient for quality recommendations - expand criteria'
    };
  }
  
  if (propertyCount >= greenLower && propertyCount <= greenUpper) {
    return {
      status: 'sweet-spot',
      color: 'bg-green-100 text-green-800',
      message: 'Excellent pool for diverse, high-quality recommendations!'
    };
  }
  
  if ((propertyCount >= blueLower && propertyCount < greenLower) || 
      (propertyCount > greenUpper && propertyCount <= blueRightMax)) {
    return {
      status: 'good',
      color: 'bg-blue-100 text-blue-800',
      message: 'Good pool for quality recommendations'
    };
  }
  
  return {
    status: 'too-high',
    color: 'bg-red-100 text-red-800',
    message: 'Too broad - recommendations may lack focus'
  };
}