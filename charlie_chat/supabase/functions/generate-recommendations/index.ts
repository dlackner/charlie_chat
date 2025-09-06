// Supabase Edge Function for MMR Recommendation Generation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import types that match the current buy box structure
interface BuyBoxMarket {
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
  learningPhase?: 'discovery' | 'learning' | 'mastery' | 'production';
  learnedPreferences?: any; // JSONB stored learned preferences for production mode
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

interface GenerateRecommendationsRequest {
  userId: string;
  forceRefresh?: boolean;
  buyBoxOverride?: BuyBoxMarket[];
}

interface GenerateRecommendationsResponse {
  success: boolean;
  batchId?: string;
  recommendationCount: number;
  totalCandidates: number;
  lambda: number;
  weekStart: string;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody: GenerateRecommendationsRequest = await req.json();
    const { userId, forceRefresh = false, buyBoxOverride } = requestBody;

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing userId',
          recommendationCount: 0,
          totalCandidates: 0,
          lambda: 0.7,
          weekStart: ''
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if user has weekly recommendations enabled from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('weekly_recommendations_enabled')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User profile not found.',
          recommendationCount: 0,
          totalCandidates: 0,
          lambda: 0.7,
          weekStart: ''
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if weekly recommendations are enabled
    if (!profileData.weekly_recommendations_enabled) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Weekly recommendations are disabled for this user',
          recommendationCount: 0,
          totalCandidates: 0,
          lambda: 0.7,
          weekStart: ''
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user markets from user_markets table including learning phase and preferences
    const { data: userMarkets, error: marketsError } = await supabase
      .from('user_markets')
      .select('*, learning_phase, mastery_achieved_date, learned_preferences')
      .eq('user_id', userId);

    if (marketsError || !userMarkets || userMarkets.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No target markets configured. Please set up your buy box first.',
          recommendationCount: 0,
          totalCandidates: 0,
          lambda: 0.7,
          weekStart: ''
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const weekStart = getWeekStart(new Date());
    const lambda = userMarkets[0]?.lambda_value || 0.7;

    // Check if recommendations already exist for this week (unless forcing refresh)
    if (!forceRefresh) {
      const { data: existingRecs } = await supabase
        .from('user_favorites')
        .select('recommendation_batch_id, property_id')
        .eq('user_id', userId)
        .eq('recommendation_type', 'algorithm')
        .gte('generated_at', weekStart)
        .limit(1);

      if (existingRecs && existingRecs.length > 0) {
        const batchId = existingRecs[0].recommendation_batch_id;
        const count = await getRecommendationCount(supabase, batchId);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            batchId,
            recommendationCount: count,
            totalCandidates: count, // Approximation
            lambda,
            weekStart
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Convert user_markets data to BuyBoxMarket format with learning phase info
    const buyBoxMarkets: BuyBoxMarket[] = buyBoxOverride || userMarkets.map(market => ({
      id: market.id,
      type: market.market_type as 'city' | 'zip',
      city: market.city,
      state: market.state,
      zip: market.zip,
      customName: market.market_name,
      marketKey: market.market_key,
      units_min: market.units_min || 0,
      units_max: market.units_max || 0,
      assessed_value_min: market.assessed_value_min || 0,
      assessed_value_max: market.assessed_value_max || 0,
      estimated_value_min: market.estimated_value_min || 0,
      estimated_value_max: market.estimated_value_max || 0,
      year_built_min: market.year_built_min || 0,
      year_built_max: market.year_built_max || 0,
      learningPhase: market.learning_phase || 'discovery',
      learnedPreferences: market.learned_preferences,
      marketTier: market.market_tier ? {
        tier: market.market_tier.tier,
        name: market.market_tier.name,
        description: market.market_tier.description,
        minRank: market.market_tier.minRank,
        maxRank: market.market_tier.maxRank,
        recommendedMin: market.market_tier.recommendedMin,
        recommendedMax: market.market_tier.recommendedMax,
        sweetSpotMin: market.market_tier.sweetSpotMin,
        sweetSpotMax: market.market_tier.sweetSpotMax
      } : undefined
    }));

    console.log('User markets loaded:', JSON.stringify(buyBoxMarkets, null, 2));

    // Get user's existing favorites for deduplication
    const { data: existingFavorites } = await supabase
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    const existingPropertyIds = new Set(existingFavorites?.map(fav => fav.property_id) || []);

    // For now, skip cached property IDs and use direct search
    const canUseCachedIds = false;

    console.log('Using direct property search (cached IDs disabled)');

    // Test API connectivity
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
    console.log('APP_URL environment variable:', appUrl);

    // Fetch properties from external API for each market
    const allProperties = [];
    let totalCandidates = 0;

    for (const market of buyBoxMarkets) {
      let properties = [];

      console.log(`\n🔍 Processing ${market.customName} (${market.learningPhase} mode)...`);

      if (market.learningPhase === 'production' && market.learnedPreferences) {
        // PRODUCTION MODE: Cost-optimized two-part query using learned preferences
        properties = await fetchProductionModeProperties(market, existingPropertyIds);
      } else {
        // LEARNING MODE: Broad exploration using buy box criteria  
        properties = await fetchLearningModeProperties(market, existingPropertyIds);
      }

      if (properties.length > 0) {
        allProperties.push(...properties);
        console.log(`✅ ${market.customName}: Found ${properties.length} properties`);
      } else {
        console.log(`❌ ${market.customName}: No properties found`);
      }
      
      totalCandidates += properties.length;
    }

    if (allProperties.length === 0) {
      console.log(`No properties found. Markets processed: ${userMarkets.length}, Total candidates: ${totalCandidates}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          batchId: null,
          recommendationCount: 0,
          totalCandidates,
          lambda,
          weekStart,
          error: `No properties found matching your criteria. Processed ${userMarkets.length} markets. Consider expanding your buy box.`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use improved scoring algorithm
    const scoredCandidates = allProperties.map(property => {
      const fitScore = calculateFitScore(property, buyBoxMarkets);
      const diversityScore = calculateDiversityScore(property, allProperties);
      const totalScore = (fitScore * 0.6) + (diversityScore * 0.4);
      
      return {
        ...property,
        fit_score: fitScore,
        diversity_score: diversityScore,
        total_score: totalScore,
        selection_reasons: generateReasons(property, fitScore, diversityScore)
      };
    });

    // Sort by total score and select top candidates with diversity
    const k = Math.min(9, scoredCandidates.length);
    const sortedCandidates = scoredCandidates.sort((a, b) => b.total_score - a.total_score);
    const diverseCandidates = applyDiversitySelection(sortedCandidates, k);

    if (diverseCandidates.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          batchId: null,
          recommendationCount: 0,
          totalCandidates: candidates.length,
          lambda,
          weekStart,
          error: 'No diverse recommendations found'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create recommendation batch
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Save all recommended properties to database first
    const savedProperties = await Promise.all(diverseCandidates.map(async (candidate) => {
      // First, upsert to saved_properties table
      const { data: savedProperty, error: propertyError } = await supabase
        .from('saved_properties')
        .upsert({
          property_id: candidate.id,
          address_full: candidate.address_street || candidate.address_full || '',
          address_city: candidate.address_city || '',
          address_state: candidate.address_state || '',
          address_zip: candidate.address_zip || null,
          units_count: candidate.units_count || 0,
          year_built: candidate.year_built || null,
          last_sale_date: candidate.last_sale_date || null,
          assessed_value: candidate.assessed_value || 0,
          assessed_land_value: candidate.assessed_land_value ?? null,
          estimated_value: candidate.estimated_value || 0,
          estimated_equity: candidate.estimated_equity || 0,
          years_owned: candidate.years_owned || 0,
          out_of_state_absentee_owner: candidate.out_of_state_absentee_owner || false,
          auction: candidate.auction || false,
          reo: candidate.reo || false,
          tax_lien: candidate.tax_lien || false,
          pre_foreclosure: candidate.pre_foreclosure || false,
          private_lender: candidate.private_lender || false,
          owner_first_name: candidate.owner_first_name || null,
          owner_last_name: candidate.owner_last_name || null,
          mail_address_full: candidate.mail_address_full || null,
          mail_address_street: candidate.mail_address_street || null,
          mail_address_city: candidate.mail_address_city || null,
          mail_address_state: candidate.mail_address_state || null,
          mail_address_zip: candidate.mail_address_zip || null,
          mail_address_county: candidate.mail_address_county || null,
          latitude: candidate.latitude ?? null,
          longitude: candidate.longitude ?? null,
          property_type: candidate.property_type || null,
          square_feet: candidate.square_feet ?? null,
          lot_square_feet: candidate.lot_square_feet ?? null,
          stories: candidate.stories ?? null,
          flood_zone: candidate.flood_zone ?? null,
          flood_zone_description: candidate.flood_zone_description || null,
          rent_estimate: candidate.rent_estimate ?? null,
          listing_price: candidate.listing_price ?? null,
          mortgage_balance: candidate.mortgage_balance ?? null,
          mortgage_maturing_date: null,
          last_sale_arms_length: candidate.last_sale_arms_length ?? null,
          mls_active: candidate.mls_active ?? null,
          for_sale: candidate.for_sale ?? null,
          assumable: candidate.assumable ?? null,
          foreclosure: candidate.foreclosure ?? null,
          in_state_absentee_owner: candidate.in_state_absentee_owner ?? null,
          owner_occupied: candidate.owner_occupied ?? null,
          corporate_owned: candidate.corporate_owned ?? null,
          investor_buyer: candidate.investor_buyer ?? null,
          lender_name: candidate.lender_name || null,
          total_portfolio_equity: candidate.total_portfolio_equity ?? null,
          total_portfolio_mortgage_balance: candidate.total_portfolio_mortgage_balance ?? null,
          total_properties_owned: candidate.total_properties_owned ?? null,
          saved_at: now
        }, {
          onConflict: 'property_id'
        })
        .select();

      if (propertyError) {
        console.error('Error saving property to saved_properties:', candidate.id, propertyError);
        return null;
      }

      return savedProperty?.[0];
    }));

    // Filter out any failed saves
    const validSavedProperties = savedProperties.filter(Boolean);

    // Create user_favorites entries
    const favorites = diverseCandidates.map((candidate, index) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      property_id: candidate.id,
      saved_at: now,
      is_active: true,
      recommendation_type: 'algorithm',
      recommendation_batch_id: batchId,
      fit_score: candidate.fit_score / 100, // Normalize to 0-1
      diversity_score: candidate.diversity_score / 100, // Normalize to 0-1
      total_score: candidate.total_score / 100, // Normalize to 0-1
      selection_reasons: candidate.selection_reasons,
      generated_at: now
    }));

    const { error: insertError } = await supabase
      .from('user_favorites')
      .insert(favorites);

    if (insertError) {
      throw new Error(`Failed to create recommendations: ${insertError.message}`);
    }

    // Log the recommendation run
    await supabase
      .from('weekly_recommendation_runs')
      .insert({
        week_start: weekStart.split('T')[0],
        users_processed: 1,
        total_recommendations: diverseCandidates.length,
        avg_relevance_score: diverseCandidates.reduce((sum, c) => sum + c.total_score, 0) / diverseCandidates.length,
        completion_status: 'completed'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        batchId,
        recommendationCount: diverseCandidates.length,
        totalCandidates,
        lambda,
        weekStart
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        recommendationCount: 0,
        totalCandidates: 0,
        lambda: 0.7,
        weekStart: ''
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions
function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getRecommendationCount(supabase: any, batchId: string): Promise<number> {
  const { data } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('recommendation_batch_id', batchId)
    .eq('is_active', true);
  
  return data?.length || 0;
}

function calculateFitScore(property: any, markets: BuyBoxMarket[]): number {
  let maxScore = 0;
  
  // Find the best fit among all markets
  for (const market of markets) {
    let score = 100;
    
    // Units fit
    if (property.units_count && (market.units_min > 0 || market.units_max > 0)) {
      const unitsCenter = (market.units_min + market.units_max) / 2;
      if (unitsCenter > 0) {
        const unitsDeviation = Math.abs(property.units_count - unitsCenter) / unitsCenter;
        score -= Math.min(unitsDeviation * 20, 20);
      }
    }

    // Assessed value fit  
    if (property.assessed_value && (market.assessed_value_min > 0 || market.assessed_value_max > 0)) {
      const valueCenter = (market.assessed_value_min + market.assessed_value_max) / 2;
      if (valueCenter > 0) {
        const valueDeviation = Math.abs(property.assessed_value - valueCenter) / valueCenter;
        score -= Math.min(valueDeviation * 20, 20);
      }
    }

    // Estimated value fit
    if (property.estimated_value && (market.estimated_value_min > 0 || market.estimated_value_max > 0)) {
      const estimatedCenter = (market.estimated_value_min + market.estimated_value_max) / 2;
      if (estimatedCenter > 0) {
        const estimatedDeviation = Math.abs(property.estimated_value - estimatedCenter) / estimatedCenter;
        score -= Math.min(estimatedDeviation * 15, 15);
      }
    }

    // Year built fit
    if (property.year_built && (market.year_built_min > 0 || market.year_built_max > 0)) {
      const yearCenter = (market.year_built_min + market.year_built_max) / 2;
      if (yearCenter > 0) {
        const yearDeviation = Math.abs(property.year_built - yearCenter) / yearCenter;
        score -= Math.min(yearDeviation * 15, 15);
      }
    }

    // Bonus for attractive investment characteristics
    if (property.estimated_equity && property.assessed_value && 
        (property.estimated_equity / property.assessed_value) > 0.15) {
      score += 10;
    }

    if (property.rent_estimate && property.assessed_value &&
        (property.rent_estimate * 12 / property.assessed_value) > 0.08) {
      score += 10;
    }

    // Bonus for interesting ownership situations
    if (property.out_of_state_absentee_owner) score += 5;
    if (property.years_owned && property.years_owned > 15) score += 5;
    if (property.total_properties_owned && property.total_properties_owned > 5) score += 5;

    // Bonus for potential opportunities
    if (property.mls_active === false && property.for_sale === false) score += 8;
    if (property.assumable) score += 7;
    if (property.mortgage_balance && property.assessed_value && 
        (property.mortgage_balance / property.assessed_value) < 0.6) score += 5;

    maxScore = Math.max(maxScore, Math.max(0, Math.min(100, score)));
  }
  
  return maxScore;
}

function calculateDiversityScore(property: any, allProperties: any[]): number {
  const diversityFactors = [
    'year_built', 'units_count', 'assessed_value', 'property_type', 'square_feet',
    'owner_occupied', 'corporate_owned', 'years_owned', 'out_of_state_absentee_owner', 'investor_buyer',
    'for_sale', 'mls_active', 'auction', 'reo', 'tax_lien', 'pre_foreclosure', 'assumable', 'private_lender',
    'estimated_equity', 'mortgage_balance', 'rent_estimate', 'listing_price',
    'total_properties_owned', 'total_portfolio_equity',
    'flood_zone', 'stories'
  ];
  
  let diversityPoints = 0;
  
  diversityFactors.forEach(factor => {
    const propertyValue = property[factor];
    
    if (typeof propertyValue === 'boolean') {
      const sameValues = allProperties.filter(p => p[factor] === propertyValue).length;
      if (sameValues <= allProperties.length * 0.3) diversityPoints++;
    } else if (typeof propertyValue === 'number' && propertyValue !== null) {
      const values = allProperties.map(p => p[factor]).filter(v => v !== null && v !== undefined);
      if (values.length > 0) {
        values.sort((a, b) => a - b);
        const quartile = getQuartile(propertyValue, values);
        const quartileCounts = [0, 0, 0, 0];
        
        allProperties.forEach(p => {
          const val = p[factor];
          if (val) quartileCounts[getQuartile(val, values)]++;
        });
        
        if (quartileCounts[quartile] <= allProperties.length * 0.4) diversityPoints++;
      }
    } else if (typeof propertyValue === 'string') {
      const sameValues = allProperties.filter(p => p[factor] === propertyValue).length;
      if (sameValues <= allProperties.length * 0.3) diversityPoints++;
    }
  });

  return (diversityPoints / diversityFactors.length) * 100;
}

function getQuartile(value: number, sortedValues: number[]): number {
  const position = sortedValues.findIndex(v => v >= value);
  const percentile = position / sortedValues.length;
  
  if (percentile <= 0.25) return 0;
  if (percentile <= 0.5) return 1; 
  if (percentile <= 0.75) return 2;
  return 3;
}

function generateReasons(property: any, fitScore: number, diversityScore: number): string[] {
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
  if (property.tax_lien) reasons.push("Tax lien - investigate opportunity");
  if (property.private_lender) reasons.push("Private lender financing - flexible terms possible");

  // Property characteristics
  if (property.year_built && property.year_built < 1980) reasons.push("Pre-1980s construction - different market dynamics");
  if (property.year_built && property.year_built > 2000) reasons.push("Newer construction - modern amenities");
  if (property.flood_zone) reasons.push("Flood zone property - insurance considerations");
  
  // Diversity learning reasons
  if (diversityScore > 70) reasons.push("Offers unique characteristics for learning");

  return reasons.slice(0, 3);
}

function applyDiversitySelection(sortedCandidates: any[], count: number): any[] {
  if (sortedCandidates.length <= count) return sortedCandidates;

  const selected: any[] = [];
  const remaining = [...sortedCandidates];

  // Always take the highest scoring property first
  selected.push(remaining.shift()!);

  // For remaining selections, balance score with diversity
  while (selected.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestDiversityScore = -1;

    remaining.forEach((candidate, index) => {
      const diversityFromSelected = calculateDiversityFromSet(candidate, selected);
      const combinedScore = candidate.total_score + (diversityFromSelected * 20); // Boost diverse picks
      
      if (combinedScore > bestDiversityScore) {
        bestDiversityScore = combinedScore;
        bestIndex = index;
      }
    });

    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected;
}

function calculateDiversityFromSet(property: any, selectedProperties: any[]): number {
  const diversityFactors = ['address_zip', 'year_built', 'units_count', 'assessed_value', 'years_owned'];
  
  if (selectedProperties.length === 0) return 100;

  let diversityPoints = 0;

  diversityFactors.forEach(factor => {
    const propertyValue = property[factor];
    const isUnique = selectedProperties.every(selected => selected[factor] !== propertyValue);
    if (isUnique) diversityPoints++;
  });

  return (diversityPoints / diversityFactors.length) * 100;
}

// PRODUCTION MODE: Cost-optimized two-part query using learned preferences
async function fetchProductionModeProperties(market: BuyBoxMarket, existingPropertyIds: Set<string>): Promise<any[]> {
  const prefs = market.learnedPreferences;
  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
  
  console.log(`🎯 Production mode for ${market.customName}: Using learned preferences`);
  
  // PART 1: Get property IDs using learned preferences (FREE/CHEAP)
  let candidateIds: string[] = [];
  let searchRadius = prefs.geographic?.radiusMiles || 1.0;
  
  // Try up to 3 radius expansions to get enough candidates
  for (let attempt = 1; attempt <= 3 && candidateIds.length < 20; attempt++) {
    console.log(`  📍 Attempt ${attempt}: Searching ${searchRadius.toFixed(1)} mile radius...`);
    
    const idSearchPayload: any = {
      ids_only: true,
      size: 200, // Get many IDs since they're free
      property_type: "MFR"
    };
    
    // Geographic filter using learned preferences
    if (prefs.geographic) {
      idSearchPayload.center_lat = prefs.geographic.centerLat;
      idSearchPayload.center_lng = prefs.geographic.centerLng;
      idSearchPayload.radius_miles = searchRadius;
    } else {
      // Fallback to city/state if no geographic preferences learned
      idSearchPayload.city = market.city;
      idSearchPayload.state = market.state;
    }
    
    // Apply learned characteristic preferences
    if (prefs.characteristics?.units_count) {
      idSearchPayload.units_min = Math.floor(prefs.characteristics.units_count.min);
      idSearchPayload.units_max = Math.ceil(prefs.characteristics.units_count.max);
    }
    
    if (prefs.characteristics?.year_built) {
      idSearchPayload.year_built_min = Math.floor(prefs.characteristics.year_built.min);
      idSearchPayload.year_built_max = Math.ceil(prefs.characteristics.year_built.max);
    }
    
    if (prefs.characteristics?.assessed_value) {
      idSearchPayload.assessed_value_min = Math.floor(prefs.characteristics.assessed_value.min);
      idSearchPayload.assessed_value_max = Math.ceil(prefs.characteristics.assessed_value.max);
    }
    
    try {
      const response = await fetch(`${appUrl}/api/realestateapi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idSearchPayload)
      });
      
      if (response.ok) {
        const data = await response.json();
        const newIds = (data.data || []).map((item: any) => item.id || item);
        candidateIds = [...candidateIds, ...newIds];
        console.log(`  ✅ Found ${newIds.length} candidate IDs (total: ${candidateIds.length})`);
      }
    } catch (error) {
      console.error(`  ❌ Error fetching IDs for ${market.customName}:`, error);
    }
    
    // Expand search radius for next attempt
    searchRadius = Math.min(searchRadius + 0.5, 10); // Max 10 mile radius
  }
  
  // PART 2: Deduplicate and select best IDs for detailed fetch (PAID)
  const freshIds = candidateIds.filter((id, index, arr) => 
    arr.indexOf(id) === index && // Remove duplicates
    !existingPropertyIds.has(id) // Remove already seen
  );
  
  console.log(`  🔍 After deduplication: ${freshIds.length} fresh candidates`);
  
  if (freshIds.length === 0) {
    return [];
  }
  
  // Select best candidates (could implement more sophisticated selection logic)
  const selectedIds = freshIds.slice(0, Math.min(9, freshIds.length));
  
  console.log(`  💰 Fetching details for ${selectedIds.length} selected properties...`);
  
  // Fetch detailed property data (THIS IS WHAT WE PAY FOR)
  const detailPayload = {
    ids: selectedIds,
    obfuscate: false,
    summary: false
  };
  
  try {
    const response = await fetch(`${appUrl}/api/realestateapi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detailPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Retrieved ${data.data?.length || 0} detailed properties`);
      return data.data || [];
    }
  } catch (error) {
    console.error(`  ❌ Error fetching details for ${market.customName}:`, error);
  }
  
  return [];
}

// LEARNING MODE: Broad exploration using buy box criteria
async function fetchLearningModeProperties(market: BuyBoxMarket, existingPropertyIds: Set<string>): Promise<any[]> {
  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
  
  console.log(`📚 Learning mode for ${market.customName}: Using broad buy box criteria`);
  
  const searchPayload: any = {
    size: 50,
    resultIndex: 0,
    obfuscate: false,
    summary: false,
    ids_only: false,
    property_type: "MFR"
  };
  
  // Add market location filters
  if (market.type === 'city' && market.city && market.state) {
    searchPayload.city = market.city;
    searchPayload.state = market.state;
  } else if (market.type === 'zip' && market.zip) {
    searchPayload.zip = market.zip;
  }
  
  // Build OR conditions for the criteria like in the buy box page
  const orCriteria: any[] = [];
  
  if (market.units_min > 0 || market.units_max > 0) {
    const unitsCondition: any = {};
    if (market.units_min > 0) unitsCondition.units_min = market.units_min;
    if (market.units_max > 0) unitsCondition.units_max = market.units_max;
    orCriteria.push(unitsCondition);
  }
  
  if (market.assessed_value_min > 0 || market.assessed_value_max > 0) {
    const assessedValueCondition: any = {};
    if (market.assessed_value_min > 0) assessedValueCondition.assessed_value_min = market.assessed_value_min;
    if (market.assessed_value_max > 0) assessedValueCondition.assessed_value_max = market.assessed_value_max;
    orCriteria.push(assessedValueCondition);
  }
  
  if (market.estimated_value_min > 0 || market.estimated_value_max > 0) {
    const estimatedValueCondition: any = {};
    if (market.estimated_value_min > 0) estimatedValueCondition.value_min = market.estimated_value_min;
    if (market.estimated_value_max > 0) estimatedValueCondition.value_max = market.estimated_value_max;
    orCriteria.push(estimatedValueCondition);
  }
  
  if (market.year_built_min > 0 || market.year_built_max > 0) {
    const yearBuiltCondition: any = {};
    if (market.year_built_min > 0) yearBuiltCondition.year_built_min = market.year_built_min;
    if (market.year_built_max > 0) yearBuiltCondition.year_built_max = market.year_built_max;
    orCriteria.push(yearBuiltCondition);
  }
  
  // Structure the compound query
  if (orCriteria.length > 0) {
    const locationCondition = market.type === 'city' ? 
      { city: market.city, state: market.state } : 
      { zip: market.zip };
    
    searchPayload.and = [
      locationCondition,
      { or: orCriteria }
    ];
  }
  
  try {
    const response = await fetch(`${appUrl}/api/realestateapi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      const properties = (data.data || []).filter((property: any) => !existingPropertyIds.has(property.id));
      console.log(`  ✅ Found ${properties.length} learning properties (${data.data?.length || 0} before deduplication)`);
      return properties;
    }
  } catch (error) {
    console.error(`  ❌ Error fetching learning properties for ${market.customName}:`, error);
    console.error('  Search payload was:', JSON.stringify(searchPayload, null, 2));
  }
  
  return [];
}