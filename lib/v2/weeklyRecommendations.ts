 /*
 * CHARLIE2 V2 - Weekly Recommendations Business Logic
 * Property Selection Methodology using MMR (Maximal Marginal Relevance)
 * Core engine for generating diverse property recommendations based on user buy box criteria
 */

import { Listing } from '@/components/ui/listingTypes';

export interface BuyBoxMarket {
  id: string;
  type: 'city' | 'zip';
  city?: string;
  state?: string;
  zip?: string;
  customName?: string; // User-editable display name (DISPLAY ONLY)
  marketKey: string; // STABLE identifier for recommendation system mapping (NEVER changes even if user renames)
  units_min: number;
  units_max: number;
  assessed_value_min: number;
  assessed_value_max: number;
  estimated_value_min: number;
  estimated_value_max: number;
  year_built_min: number;
  year_built_max: number;
  isExpanded?: boolean;
  propertyCount?: number;
  propertyCountChecked?: boolean;
  marketTier?: {
    tier: number;
    name: string;
    description: string;
    minRank: number;
    maxRank: number;
    recommendedMin: number;
    recommendedMax: number;
    sweetSpotMin: number;
    sweetSpotMax: number;
  };
}

export interface PropertyRecommendationCriteria {
  market: BuyBoxMarket;
  variancePercentage: number; // Default 25% for exploration
  diversityFactors: string[]; // Which characteristics to vary
  propertiesPerMarket: number; // Default 3
}

export interface PropertyScore {
  property: Listing;
  diversityScore: number;
  fitScore: number;
  totalScore: number;
  reasons: string[];
}

/**
 * Core Property Selection Methodology
 * 
 * Strategy: Exploratory Learning Phase
 * 1. Find properties within ±25% of user criteria
 * 2. Ensure variety across key characteristics
 * 3. Score properties for both fit and diversity
 * 4. Select 3 most promising diverse options per market
 */
export class PropertyRecommendationEngine {
  private variancePercentage: number;
  private diversityFactors: string[];

  constructor(variancePercentage = 25, diversityFactors = [
    // Property characteristics  
    'year_built', 'units_count', 'assessed_value', 'property_type', 'square_feet',
    
    // Ownership characteristics
    'owner_occupied', 'corporate_owned', 'years_owned', 'out_of_state_absentee_owner', 'investor_buyer',
    
    // Property status flags
    'for_sale', 'mls_active', 'auction', 'reo', 'pre_foreclosure', 'assumable', 'private_lender',
    
    // Financial characteristics
    'estimated_equity', 'mortgage_balance', 'rent_estimate', 'listing_price',
    
    // Portfolio characteristics  
    'total_properties_owned', 'total_portfolio_equity',
    
    // Property condition/features
    'flood_zone', 'stories'
  ]) {
    this.variancePercentage = variancePercentage;
    this.diversityFactors = diversityFactors;
  }

  /**
   * Main entry point: Get diverse property recommendations for a market
   */
  public selectPropertiesForMarket(
    market: BuyBoxMarket, 
    availableProperties: Listing[], 
    propertiesPerMarket = 3
  ): PropertyScore[] {
    
    // Step 1: Use all available properties (API search already handled filtering with OR logic)
    const candidateProperties = availableProperties;
    
    // Step 2: Score each property for fit and diversity
    const scoredProperties = candidateProperties.map(property => 
      this.scoreProperty(property, market, candidateProperties)
    );
    
    // Step 3: Select diverse set using diversity algorithm
    const selectedProperties = this.selectDiverseSet(scoredProperties, propertiesPerMarket);
    
    return selectedProperties;
  }



  /**
   * Score a property for both fit to criteria and diversity value
   */
  private scoreProperty(property: Listing, market: BuyBoxMarket, allCandidates: Listing[]): PropertyScore {
    const fitScore = this.calculateFitScore(property, market);
    const diversityScore = this.calculateDiversityScore(property, allCandidates);
    
    // Weight: 60% fit, 40% diversity for exploration phase
    const totalScore = (fitScore * 0.6) + (diversityScore * 0.4);
    
    const reasons = this.generateScoreReasons(property, fitScore, diversityScore);

    return {
      property,
      diversityScore,
      fitScore,
      totalScore,
      reasons
    };
  }

  /**
   * Calculate how well property fits user's core criteria (0-100)
   */
  private calculateFitScore(property: Listing, market: BuyBoxMarket): number {
    let score = 100;
    
    // Units fit
    if (property.units_count && (market.units_min > 0 || market.units_max > 0)) {
      const unitsCenter = (market.units_min + market.units_max) / 2;
      if (unitsCenter > 0) {
        const unitsDeviation = Math.abs(property.units_count - unitsCenter) / unitsCenter;
        score -= Math.min(unitsDeviation * 20, 20); // Max 20 point penalty
      }
    }

    // Assessed value fit  
    if (property.assessed_value && (market.assessed_value_min > 0 || market.assessed_value_max > 0)) {
      const valueCenter = (market.assessed_value_min + market.assessed_value_max) / 2;
      if (valueCenter > 0) {
        const valueDeviation = Math.abs(property.assessed_value - valueCenter) / valueCenter;
        score -= Math.min(valueDeviation * 20, 20); // Max 20 point penalty
      }
    }

    // Estimated value fit
    if (property.estimated_value && (market.estimated_value_min > 0 || market.estimated_value_max > 0)) {
      const estimatedCenter = (market.estimated_value_min + market.estimated_value_max) / 2;
      if (estimatedCenter > 0) {
        const estimatedDeviation = Math.abs(property.estimated_value - estimatedCenter) / estimatedCenter;
        score -= Math.min(estimatedDeviation * 15, 15); // Max 15 point penalty
      }
    }

    // Year built fit
    if (property.year_built && (market.year_built_min > 0 || market.year_built_max > 0)) {
      const yearCenter = (market.year_built_min + market.year_built_max) / 2;
      if (yearCenter > 0) {
        const yearDeviation = Math.abs(property.year_built - yearCenter) / yearCenter;
        score -= Math.min(yearDeviation * 15, 15); // Max 15 point penalty
      }
    }

    // Bonus for attractive investment characteristics
    if (property.estimated_equity && property.assessed_value && 
        (property.estimated_equity / property.assessed_value) > 0.15) {
      score += 10; // Good equity position
    }

    if (property.rent_estimate && property.assessed_value &&
        (property.rent_estimate * 12 / property.assessed_value) > 0.08) {
      score += 10; // Good rent-to-value ratio
    }

    // Bonus for interesting ownership situations (learning opportunities)
    if (property.out_of_state_absentee_owner) score += 5; // May be motivated
    if (property.years_owned && property.years_owned > 15) score += 5; // Long-term owner
    if (property.total_properties_owned && property.total_properties_owned > 5) score += 5; // Experienced investor

    // Bonus for potential opportunities
    if (property.mls_active === false && property.for_sale === false) score += 8; // Off-market opportunity
    if (property.assumable) score += 7; // Financing opportunity
    if (property.mortgage_balance && property.assessed_value && 
        (property.mortgage_balance / property.assessed_value) < 0.6) score += 5; // Low LTV

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate diversity value - how different this property is (0-100)
   */
  private calculateDiversityScore(property: Listing, allCandidates: Listing[]): number {
    let diversityPoints = 0;
    const maxPoints = this.diversityFactors.length;

    this.diversityFactors.forEach(factor => {
      const isUnique = this.isPropertyUniqueInFactor(property, allCandidates, factor);
      if (isUnique) diversityPoints++;
    });

    return (diversityPoints / maxPoints) * 100;
  }

  /**
   * Check if property has a unique characteristic compared to others
   */
  private isPropertyUniqueInFactor(property: Listing, others: Listing[], factor: string): boolean {
    const propertyValue = (property as any)[factor];
    
    // For boolean factors
    if (typeof propertyValue === 'boolean') {
      return others.filter(p => (p as any)[factor] === propertyValue).length <= others.length * 0.3;
    }
    
    // For numeric factors (check if in different quartile)
    if (typeof propertyValue === 'number') {
      const values = others.map(p => (p as any)[factor]).filter(v => v !== null && v !== undefined);
      if (values.length === 0) return true;
      
      values.sort((a, b) => a - b);
      const quartile = this.getQuartile(propertyValue, values);
      const quartileCounts = [0, 0, 0, 0];
      
      others.forEach(p => {
        const val = (p as any)[factor];
        if (val) quartileCounts[this.getQuartile(val, values)]++;
      });
      
      return quartileCounts[quartile] <= others.length * 0.4; // Less than 40% in same quartile
    }

    // For string factors
    if (typeof propertyValue === 'string') {
      return others.filter(p => (p as any)[factor] === propertyValue).length <= others.length * 0.3;
    }

    return false;
  }

  /**
   * Get quartile (0-3) for a value within a sorted array
   */
  private getQuartile(value: number, sortedValues: number[]): number {
    const position = sortedValues.findIndex(v => v >= value);
    const percentile = position / sortedValues.length;
    
    if (percentile <= 0.25) return 0;
    if (percentile <= 0.5) return 1; 
    if (percentile <= 0.75) return 2;
    return 3;
  }

  /**
   * Select diverse set using greedy diversity algorithm
   */
  private selectDiverseSet(scoredProperties: PropertyScore[], count: number): PropertyScore[] {
    if (scoredProperties.length <= count) return scoredProperties;

    // Sort by total score descending
    const sorted = [...scoredProperties].sort((a, b) => b.totalScore - a.totalScore);
    
    const selected: PropertyScore[] = [];
    const remaining = [...sorted];

    // Always take the highest scoring property first
    selected.push(remaining.shift()!);

    // For remaining selections, balance score with diversity
    while (selected.length < count && remaining.length > 0) {
      let bestIndex = 0;
      let bestDiversityScore = -1;

      remaining.forEach((candidate, index) => {
        const diversityFromSelected = this.calculateDiversityFromSet(candidate.property, selected.map(s => s.property));
        const combinedScore = candidate.totalScore + (diversityFromSelected * 20); // Boost diverse picks
        
        if (combinedScore > bestDiversityScore) {
          bestDiversityScore = combinedScore;
          bestIndex = index;
        }
      });

      selected.push(remaining.splice(bestIndex, 1)[0]);
    }

    return selected;
  }

  /**
   * Calculate how different a property is from already selected properties
   */
  private calculateDiversityFromSet(property: Listing, selectedProperties: Listing[]): number {
    if (selectedProperties.length === 0) return 100;

    let diversityPoints = 0;
    const maxPoints = this.diversityFactors.length;

    this.diversityFactors.forEach(factor => {
      const isUnique = this.isPropertyUniqueInFactor(property, selectedProperties, factor);
      if (isUnique) diversityPoints++;
    });

    return (diversityPoints / maxPoints) * 100;
  }

  /**
   * Generate human-readable reasons for the score
   */
  private generateScoreReasons(property: Listing, fitScore: number, diversityScore: number): string[] {
    const reasons: string[] = [];

    // Fit reasons
    if (fitScore > 80) reasons.push("Strong match for your criteria");
    else if (fitScore > 60) reasons.push("Good fit within your expanded range");
    else reasons.push("Explores edge of your preferences");

    // Investment opportunity reasons
    if (property.estimated_equity && property.assessed_value && 
        (property.estimated_equity / property.assessed_value) > 0.15) {
      reasons.push("Good equity position");
    }
    
    if (property.rent_estimate && property.assessed_value &&
        (property.rent_estimate * 12 / property.assessed_value) > 0.08) {
      reasons.push("Strong rent-to-value ratio");
    }

    // Ownership situation insights
    if (property.out_of_state_absentee_owner) reasons.push("Out-of-state owner - potentially motivated");
    if (property.years_owned && property.years_owned > 15) reasons.push("Long-term ownership - potential appreciation");
    if (property.corporate_owned) reasons.push("Corporate owned - professional management style");
    if (property.total_properties_owned && property.total_properties_owned > 5) {
      reasons.push("Experienced investor owner - portfolio synergies");
    }

    // Market opportunity indicators  
    if (property.mls_active === false && property.for_sale === false) reasons.push("Off-market opportunity");
    if (property.for_sale && property.mls_active) reasons.push("Active MLS listing - immediate availability");
    if (property.assumable) reasons.push("Assumable financing available");
    
    // Special situations
    if (property.auction || property.reo || property.pre_foreclosure) {
      reasons.push("Distressed situation - potential value opportunity");
    }
    if (property.private_lender) reasons.push("Private lender financing - flexible terms possible");

    // Property characteristics
    if (property.year_built && property.year_built < 1980) reasons.push("Pre-1980s construction - different market dynamics");
    if (property.year_built && property.year_built > 2000) reasons.push("Newer construction - modern amenities");
    if (property.flood_zone) reasons.push("Flood zone property - insurance considerations");
    
    // Diversity learning reasons
    if (diversityScore > 70) reasons.push("Offers unique characteristics for learning");

    return reasons;
  }
}

/**
 * MLS CANCELLED LISTINGS INTEGRATION
 * 
 * High-value data source for motivated seller detection:
 * - Properties that were listed on MLS but cancelled/withdrawn
 * - Time since cancellation (recent = higher motivation)
 * - Original listing details (price, DOM, etc.)
 * 
 * OPPORTUNITY STRATEGY:
 * - Recent cancellations (0-6 months) = prime direct approach candidates
 * - Older cancellations (6-24 months) = owners may be ready to try again
 * - Properties with multiple cancelled attempts = highly motivated situations
 * 
 * New fields to add to Listing interface:
 * - mls_cancelled_date: string (when listing was pulled)
 * - mls_days_on_market: number (how long it was listed)
 * - mls_original_price: number (what they were asking)
 * - mls_price_reductions: number (how many times reduced)
 * - mls_cancellation_reason: string (expired, withdrawn, etc.)
 * - months_since_cancellation: number (calculated field)
 * 
 * Enhanced scoring bonuses:
 * - Recent cancellation (0-3 months): +15 points
 * - Medium cancellation (3-12 months): +10 points  
 * - Multiple cancellations: +12 points
 * - High price reduction attempts: +8 points
 */

/**
 * Helper function to get recommendations for all user's markets
 */
export function generateWeeklyRecommendations(
  userMarkets: BuyBoxMarket[],
  allAvailableProperties: Listing[],
  propertiesPerMarket = 3
) {
  const engine = new PropertyRecommendationEngine();
  
  return userMarkets.map(market => {
    const recommendations = engine.selectPropertiesForMarket(market, allAvailableProperties, propertiesPerMarket);
    
    return {
      market,
      recommendations,
      count: recommendations.length
    };
  });
}

/**
 * FUTURE: Enhanced method that will prioritize MLS cancelled listings
 * 
 * This will be called once MLS cancellation data is integrated
 */
export function generateWeeklyRecommendationsWithMLSData(
  userMarkets: BuyBoxMarket[],
  allAvailableProperties: Listing[],
  propertiesPerMarket = 3
) {
  const engine = new PropertyRecommendationEngine();
  
  return userMarkets.map(market => {
    // Future: Filter for properties with MLS cancellation data
    const mlsCancelledProperties = allAvailableProperties.filter(p => 
      (p as any).mls_cancelled_date && (p as any).months_since_cancellation <= 24
    );
    
    // Future: Prioritize cancelled listings in recommendations
    const recommendations = engine.selectPropertiesForMarket(market, allAvailableProperties, propertiesPerMarket);
    
    // Future: Add MLS cancellation insights to reasons
    const enhancedRecommendations = recommendations.map(rec => ({
      ...rec,
      mlsOpportunity: {
        isCancelled: !!(rec.property as any).mls_cancelled_date,
        monthsSinceCancellation: (rec.property as any).months_since_cancellation || null,
        originalPrice: (rec.property as any).mls_original_price || null,
        approachability: calculateApproachabilityScore(rec.property)
      }
    }));
    
    return {
      market,
      recommendations: enhancedRecommendations,
      count: enhancedRecommendations.length,
      mlsOpportunities: mlsCancelledProperties.length
    };
  });
}

/**
 * FUTURE: Calculate how approachable an owner might be based on MLS history
 */
function calculateApproachabilityScore(property: Listing): 'high' | 'medium' | 'low' | 'none' {
  const monthsSince = (property as any).months_since_cancellation;
  const priceReductions = (property as any).mls_price_reductions || 0;
  
  if (!monthsSince) return 'none';
  
  // Recent cancellation with price reductions = very motivated
  if (monthsSince <= 3 && priceReductions >= 2) return 'high';
  
  // Recent cancellation or multiple price cuts
  if (monthsSince <= 6 || priceReductions >= 3) return 'high';
  
  // Moderately recent
  if (monthsSince <= 12) return 'medium';
  
  // Older but still relevant
  if (monthsSince <= 24) return 'low';
  
  return 'none';
}