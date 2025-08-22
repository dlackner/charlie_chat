// Supabase Edge Function for MMR Recommendation Generation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import types and functions (you'll need to make these available in your Edge Function deployment)
interface BuyBox {
  markets: string[];
  priceMin?: number;
  priceMax?: number;
  unitsMin?: number;
  unitsMax?: number;
  yearMin?: number;
  yearMax?: number;
}

interface GenerateRecommendationsRequest {
  userId: string;
  forceRefresh?: boolean;
  buyBoxOverride?: BuyBox;
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

    // Get user preferences and buy box
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_buy_box_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prefsError || !userPrefs) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User preferences not found. Please set up your buy box first.',
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
    if (!userPrefs.weekly_recommendations_enabled) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Weekly recommendations are disabled for this user',
          recommendationCount: 0,
          totalCandidates: 0,
          lambda: userPrefs.lambda_value || 0.7,
          weekStart: ''
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const weekStart = getWeekStart(new Date());
    const lambda = userPrefs.lambda_value || 0.7;

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

    // Build buy box from user preferences (or override)
    const buyBox: BuyBox = buyBoxOverride || {
      markets: userPrefs.target_markets || [],
      priceMin: userPrefs.price_min,
      priceMax: userPrefs.price_max,
      unitsMin: userPrefs.units_min,
      unitsMax: userPrefs.units_max,
      yearMin: userPrefs.year_min,
      yearMax: userPrefs.year_max
    };

    // Get properties already saved by user to exclude them
    const { data: existingSaves } = await supabase
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    const excludePropertyIds = existingSaves?.map(s => s.property_id) || [];

    // Build candidate query with buy box filters
    let candidateQuery = supabase
      .from('saved_properties')
      .select('*')
      .gt('estimated_value', 0)
      .gt('units_count', 0)
      .limit(200); // Max candidates

    // Exclude already saved properties
    if (excludePropertyIds.length > 0) {
      candidateQuery = candidateQuery.not('property_id', 'in', `(${excludePropertyIds.join(',')})`);
    }

    // Apply buy box filters
    if (buyBox.markets && buyBox.markets.length > 0) {
      candidateQuery = candidateQuery.in('address_city', buyBox.markets);
    }
    if (buyBox.priceMin) {
      candidateQuery = candidateQuery.gte('estimated_value', buyBox.priceMin);
    }
    if (buyBox.priceMax) {
      candidateQuery = candidateQuery.lte('estimated_value', buyBox.priceMax);
    }
    if (buyBox.unitsMin) {
      candidateQuery = candidateQuery.gte('units_count', buyBox.unitsMin);
    }
    if (buyBox.unitsMax) {
      candidateQuery = candidateQuery.lte('units_count', buyBox.unitsMax);
    }
    if (buyBox.yearMin) {
      candidateQuery = candidateQuery.gte('year_built', buyBox.yearMin);
    }
    if (buyBox.yearMax) {
      candidateQuery = candidateQuery.lte('year_built', buyBox.yearMax);
    }

    const { data: candidates, error: candidateError } = await candidateQuery;

    if (candidateError) {
      throw new Error(`Failed to fetch candidates: ${candidateError.message}`);
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          batchId: null,
          recommendationCount: 0,
          totalCandidates: 0,
          lambda,
          weekStart,
          error: 'No properties found matching your criteria. Consider expanding your buy box.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Simplified relevance scoring (in production, use the full MMR algorithm)
    const scoredCandidates = candidates.map(property => ({
      ...property,
      relevance_score: calculateSimpleRelevanceScore(property, buyBox),
      selection_reasons: generateSimpleReasons(property, buyBox)
    }));

    // Sort by relevance and take top K
    const k = 9;
    const topCandidates = scoredCandidates
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, k);

    // Apply basic diversity (no same ZIP more than 2 times)
    const diverseCandidates = applyBasicDiversity(topCandidates, 2);

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

    const favorites = diverseCandidates.map((candidate, index) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      property_id: candidate.property_id,
      saved_at: now,
      is_active: true,
      recommendation_type: 'algorithm',
      recommendation_batch_id: batchId,
      fit_score: candidate.relevance_score,
      diversity_score: 1 - (index / diverseCandidates.length), // Simple diversity score
      total_score: candidate.relevance_score,
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
        avg_relevance_score: diverseCandidates.reduce((sum, c) => sum + c.relevance_score, 0) / diverseCandidates.length,
        completion_status: 'completed'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        batchId,
        recommendationCount: diverseCandidates.length,
        totalCandidates: candidates.length,
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

function calculateSimpleRelevanceScore(property: any, buyBox: BuyBox): number {
  let score = 0.5; // base score
  
  // Price fit
  if (property.estimated_value && buyBox.priceMin && buyBox.priceMax) {
    if (property.estimated_value >= buyBox.priceMin && property.estimated_value <= buyBox.priceMax) {
      score += 0.2;
    }
  }
  
  // Units fit
  if (property.units_count && buyBox.unitsMin && buyBox.unitsMax) {
    if (property.units_count >= buyBox.unitsMin && property.units_count <= buyBox.unitsMax) {
      score += 0.2;
    }
  }
  
  // Deal signals
  if (property.auction || property.reo || property.tax_lien || property.pre_foreclosure) {
    score += 0.1;
  }
  
  // Long ownership
  if (property.years_owned && property.years_owned >= 7) {
    score += 0.1;
  }
  
  // Absentee owner
  if (property.out_of_state_absentee_owner || property.in_state_absentee_owner) {
    score += 0.1;
  }
  
  return Math.min(1, score);
}

function generateSimpleReasons(property: any, buyBox: BuyBox): string[] {
  const reasons: string[] = [];
  
  if (property.units_count) {
    reasons.push(`${property.units_count}-unit multifamily property`);
  }
  
  if (property.estimated_value && property.units_count) {
    const pricePerUnit = Math.round(property.estimated_value / property.units_count);
    reasons.push(`$${pricePerUnit.toLocaleString()}/unit pricing`);
  }
  
  if (property.years_owned && property.years_owned >= 7) {
    reasons.push(`${property.years_owned} years owned - potential motivation`);
  }
  
  if (property.out_of_state_absentee_owner) {
    reasons.push('Out-of-state owner - possible motivated seller');
  }
  
  const distressFlags = [property.auction, property.reo, property.tax_lien, property.pre_foreclosure].filter(Boolean);
  if (distressFlags.length > 0) {
    reasons.push('Distressed property opportunity');
  }
  
  return reasons.slice(0, 3);
}

function applyBasicDiversity(candidates: any[], maxPerZip: number): any[] {
  const result: any[] = [];
  const zipCounts: Record<string, number> = {};
  
  for (const candidate of candidates) {
    const zip = candidate.address_zip;
    const zipCount = zip ? (zipCounts[zip] || 0) : 0;
    
    if (!zip || zipCount < maxPerZip) {
      result.push(candidate);
      if (zip) {
        zipCounts[zip] = zipCount + 1;
      }
    }
  }
  
  return result;
}