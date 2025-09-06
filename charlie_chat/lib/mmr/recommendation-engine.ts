// Main MMR Recommendation Engine - Integrates with existing Charlie Chat schema

import { createClient } from '@supabase/supabase-js';
import type { 
  SavedProperty, 
  UserBuyBoxPreferences, 
  BuyBox, 
  MarketStatistics,
  MMRCandidate,
  RecommendationBatch,
  MMRConfig,
  UserFavorite
} from './types';
import { DEFAULT_MMR_CONFIG } from './types';
import { propertyToCandidate } from './relevance-scoring';
import { selectMMRRecommendations } from './mmr-algorithm';

export class RecommendationEngine {
  private supabase;
  private config: MMRConfig;

  constructor(
    supabaseUrl: string, 
    supabaseKey: string, 
    config: Partial<MMRConfig> = {}
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = { ...DEFAULT_MMR_CONFIG, ...config };
  }

  // Get user's current lambda value and exploration preferences
  async getUserPreferences(userId: string): Promise<{
    lambda: number;
    buyBox: BuyBox;
    weeklyEnabled: boolean;
  }> {
    // Get user preferences from profiles table and markets from user_markets table
    const { data: profileData, error: profileError } = await this.supabase
      .from('profiles')
      .select('weekly_recommendations_enabled')
      .eq('id', userId)
      .single();

    const { data: marketsData, error: marketsError } = await this.supabase
      .from('user_markets')
      .select('*')
      .eq('user_id', userId);

    if (profileError || marketsError || !marketsData) {
      // Return sensible defaults
      return {
        lambda: this.config.lambda,
        buyBox: { markets: [] },
        weeklyEnabled: false
      };
    }

    // Convert user_markets data to market strings for BuyBox
    // BuyBox expects markets as string[] representing market identifiers
    const marketStrings = marketsData.map(market => {
      if (market.market_type === 'city' && market.city && market.state) {
        return `${market.city}, ${market.state}`;
      } else if (market.market_type === 'zip' && market.zip) {
        return market.zip;
      } else {
        return market.market_key || market.id; // fallback to key or id
      }
    }).filter(Boolean); // Remove any empty/null values

    return {
      lambda: marketsData[0]?.lambda_value || this.config.lambda,
      buyBox: { markets: marketStrings },
      weeklyEnabled: profileData?.weekly_recommendations_enabled !== false
    };
  }

  // Update user lambda based on recent behavior patterns
  async updateUserLambda(userId: string): Promise<void> {
    // Get recent saves from user_favorites (algorithm recommendations vs manual)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentSaves } = await this.supabase
      .from('user_favorites')
      .select('recommendation_type, total_score, diversity_score')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('saved_at', thirtyDaysAgo.toISOString())
      .limit(20);

    if (!recentSaves || recentSaves.length < 3) return;

    // Calculate exploration score based on save patterns
    const algorithmSaves = recentSaves.filter(s => s.recommendation_type === 'algorithm');
    const totalSaves = recentSaves.length;
    
    // Users who save many algorithm recommendations show trust in the system
    const algorithmRatio = algorithmSaves.length / totalSaves;
    
    // Users who save high-diversity recommendations are more exploratory
    const avgDiversityScore = algorithmSaves
      .filter(s => s.diversity_score != null)
      .reduce((sum, s) => sum + (s.diversity_score || 0), 0) / 
      Math.max(1, algorithmSaves.filter(s => s.diversity_score != null).length);

    // Calculate new lambda (higher = more relevance-focused, lower = more diverse)
    let newLambda = this.config.lambda;
    
    if (algorithmRatio > 0.7 && avgDiversityScore > 0.6) {
      // User likes diverse algorithm picks - lower lambda for more exploration
      newLambda = Math.max(0.5, this.config.lambda - 0.1);
    } else if (algorithmRatio < 0.3) {
      // User prefers manual saves - higher lambda for more relevance focus
      newLambda = Math.min(0.9, this.config.lambda + 0.1);
    }

    const explorationScore = 1 - newLambda; // inverse relationship

    // Update lambda value in the user_markets table for all user markets
    await this.supabase
      .from('user_markets')
      .update({
        lambda_value: newLambda,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  }

  // Get market statistics for relevance scoring
  async getMarketStats(markets: string[]): Promise<MarketStatistics> {
    if (markets.length === 0) {
      return this.getDefaultMarketStats();
    }

    // Try to find existing market stats for the target markets
    const marketKeys = markets.map(market => 
      market.includes('_') ? market : market.replace(/,\s*/g, '_')
    );

    const { data } = await this.supabase
      .from('market_statistics')
      .select('*')
      .in('market_key', marketKeys)
      .limit(1)
      .single();

    if (data) {
      return {
        market_key: data.market_key,
        price_per_unit_median: data.price_per_unit_median,
        price_per_unit_iqr: data.price_per_unit_iqr,
        units_median: data.units_median,
        units_iqr: data.units_iqr,
        vintage_median: data.vintage_median,
        vintage_iqr: data.vintage_iqr,
        geo_diversity_scale_km: data.geo_diversity_scale_km,
        property_count: data.property_count,
        updated_at: data.updated_at
      };
    }

    // If no market stats found, calculate on-the-fly from saved_properties
    return this.calculateMarketStatsOnTheFly(markets);
  }

  private getDefaultMarketStats(): MarketStatistics {
    return {
      market_key: 'default',
      price_per_unit_median: 100000,
      price_per_unit_iqr: 50000,
      units_median: 20,
      units_iqr: 15,
      vintage_median: 1990,
      vintage_iqr: 25,
      geo_diversity_scale_km: 5.0,
      property_count: 0
    };
  }

  private async calculateMarketStatsOnTheFly(markets: string[]): Promise<MarketStatistics> {
    // Build query to get properties in target markets
    let query = this.supabase
      .from('saved_properties')
      .select('estimated_value, units_count, year_built')
      .gt('estimated_value', 0)
      .gt('units_count', 0)
      .gt('year_built', 1900);

    // Add market filters
    if (markets.length > 0) {
      // Simple approach: filter by cities (you may want to make this smarter)
      query = query.in('address_city', markets);
    }

    const { data: properties } = await query.limit(500);

    if (!properties || properties.length < 10) {
      return this.getDefaultMarketStats();
    }

    // Calculate price per unit for each property
    const pricePerUnits = properties
      .map(p => p.estimated_value / p.units_count)
      .filter(ppu => ppu > 0)
      .sort((a, b) => a - b);

    const units = properties.map(p => p.units_count).sort((a, b) => a - b);
    const vintages = properties.map(p => p.year_built).sort((a, b) => a - b);

    const median = (arr: number[]) => arr[Math.floor(arr.length / 2)];
    const iqr = (arr: number[]) => {
      const q1 = arr[Math.floor(arr.length / 4)];
      const q3 = arr[Math.floor(arr.length * 3 / 4)];
      return q3 - q1;
    };

    return {
      market_key: markets.join('_'),
      price_per_unit_median: median(pricePerUnits),
      price_per_unit_iqr: iqr(pricePerUnits),
      units_median: median(units),
      units_iqr: iqr(units),
      vintage_median: median(vintages),
      vintage_iqr: iqr(vintages),
      geo_diversity_scale_km: 5.0,
      property_count: properties.length
    };
  }

  // Get candidate pool of properties for recommendation
  async getCandidatePool(userId: string, buyBox: BuyBox): Promise<SavedProperty[]> {
    const resurfaceCutoff = new Date();
    resurfaceCutoff.setDate(resurfaceCutoff.getDate() - (this.config.resurfaceWindowWeeks * 7));

    // Get properties already saved by user to exclude them
    const { data: existingSaves } = await this.supabase
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    const excludePropertyIds = existingSaves?.map(s => s.property_id) || [];

    // Build candidate query
    let query = this.supabase
      .from('saved_properties')
      .select('*')
      .limit(this.config.candidatePoolSize);

    // Exclude already saved properties
    if (excludePropertyIds.length > 0) {
      query = query.not('property_id', 'in', `(${excludePropertyIds.join(',')})`);
    }

    // Geographic filters
    if (buyBox.markets && buyBox.markets.length > 0) {
      query = query.in('address_city', buyBox.markets);
    }

    // Buy Box range filters
    if (buyBox.priceMin !== undefined) {
      query = query.gte('estimated_value', buyBox.priceMin);
    }
    if (buyBox.priceMax !== undefined) {
      query = query.lte('estimated_value', buyBox.priceMax);
    }
    if (buyBox.unitsMin !== undefined) {
      query = query.gte('units_count', buyBox.unitsMin);
    }
    if (buyBox.unitsMax !== undefined) {
      query = query.lte('units_count', buyBox.unitsMax);
    }
    if (buyBox.yearMin !== undefined) {
      query = query.gte('year_built', buyBox.yearMin);
    }
    if (buyBox.yearMax !== undefined) {
      query = query.lte('year_built', buyBox.yearMax);
    }

    // Exclude recently shown properties (basic check)
    // Note: This is simplified - full implementation would use the JSONB last_shown_to_users field

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching candidate pool:', error);
      return [];
    }

    return data || [];
  }

  // Generate recommendations for a user
  async generateRecommendations(userId: string): Promise<RecommendationBatch | null> {
    const weekStart = this.getWeekStart(new Date());
    
    // Check if user has recommendations enabled and get preferences
    const { lambda, buyBox, weeklyEnabled } = await this.getUserPreferences(userId);
    
    if (!weeklyEnabled) {
      return null;
    }

    // Check if recommendations already exist for this week
    const { data: existingBatch } = await this.supabase
      .from('user_favorites')
      .select('recommendation_batch_id')
      .eq('user_id', userId)
      .eq('recommendation_type', 'algorithm')
      .gte('generated_at', weekStart)
      .limit(1)
      .single();

    if (existingBatch?.recommendation_batch_id) {
      return this.getExistingBatch(existingBatch.recommendation_batch_id);
    }

    // Get market stats and candidate pool
    const [marketStats, candidatePool] = await Promise.all([
      this.getMarketStats(buyBox.markets || []),
      this.getCandidatePool(userId, buyBox)
    ]);

    if (candidatePool.length === 0) {
      return this.createEmptyBatch(userId, weekStart, lambda, buyBox);
    }

    // Score all candidates
    const candidates: MMRCandidate[] = candidatePool.map(property => 
      propertyToCandidate(property, buyBox, marketStats)
    );

    // Apply MMR selection
    const selectedCandidates = selectMMRRecommendations(
      candidates, 
      { ...this.config, lambda }
    );

    if (selectedCandidates.length === 0) {
      return this.createEmptyBatch(userId, weekStart, lambda, buyBox);
    }

    // Create recommendation batch in user_favorites
    const batch = await this.createRecommendationBatch(
      userId, 
      weekStart, 
      lambda, 
      buyBox, 
      selectedCandidates,
      candidatePool.length
    );

    // Update user lambda based on behavior
    await this.updateUserLambda(userId);

    return batch;
  }

  private getWeekStart(date: Date): string {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  private async createRecommendationBatch(
    userId: string,
    weekStart: string,
    lambda: number,
    buyBox: BuyBox,
    candidates: MMRCandidate[],
    totalCandidates: number
  ): Promise<RecommendationBatch> {
    
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create user_favorites entries for each recommendation
    const favorites = candidates.map((candidate, index) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      property_id: candidate.property_id,
      saved_at: now,
      is_active: true,
      recommendation_type: 'algorithm' as const,
      recommendation_batch_id: batchId,
      fit_score: candidate.relevance,
      diversity_score: index === 0 ? 1 : 0.5, // Simplified - would calculate actual diversity
      total_score: candidate.relevance,
      selection_reasons: candidate.whyRecommended,
      generated_at: now
    }));

    const { error } = await this.supabase
      .from('user_favorites')
      .insert(favorites);

    if (error) {
      throw new Error(`Failed to create recommendation batch: ${error.message}`);
    }

    return {
      batch_id: batchId,
      user_id: userId,
      week_start: weekStart,
      lambda,
      total_candidates: totalCandidates,
      recommendations: candidates.map((candidate, index) => ({
        property_id: candidate.property_id,
        fit_score: candidate.relevance,
        diversity_score: index === 0 ? 1 : 0.5,
        total_score: candidate.relevance,
        selection_reasons: candidate.whyRecommended,
        position: index
      }))
    };
  }

  private async createEmptyBatch(
    userId: string,
    weekStart: string,
    lambda: number,
    buyBox: BuyBox
  ): Promise<RecommendationBatch> {
    return {
      batch_id: crypto.randomUUID(),
      user_id: userId,
      week_start: weekStart,
      lambda,
      total_candidates: 0,
      recommendations: []
    };
  }

  private async getExistingBatch(batchId: string): Promise<RecommendationBatch | null> {
    const { data } = await this.supabase
      .from('user_favorites')
      .select('*')
      .eq('recommendation_batch_id', batchId)
      .eq('is_active', true)
      .order('saved_at');

    if (!data || data.length === 0) return null;

    const firstRec = data[0];

    return {
      batch_id: batchId,
      user_id: firstRec.user_id,
      week_start: firstRec.generated_at?.split('T')[0] || '',
      lambda: 0.7, // Would store this in batch metadata
      total_candidates: data.length,
      recommendations: data.map((rec, index) => ({
        property_id: rec.property_id,
        fit_score: rec.fit_score || 0,
        diversity_score: rec.diversity_score || 0,
        total_score: rec.total_score || 0,
        selection_reasons: rec.selection_reasons || [],
        position: index
      }))
    };
  }

  // Log user interactions for learning
  async logInteraction(
    userId: string,
    propertyId: string,
    batchId: string,
    interactionType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    
    // Update user_favorites if it's a status change
    if (interactionType === 'status_change' && metadata?.status) {
      await this.supabase
        .from('user_favorites')
        .update({ favorite_status: metadata.status })
        .eq('user_id', userId)
        .eq('property_id', propertyId);
    }

    // Remove from favorites if requested
    if (interactionType === 'remove') {
      await this.supabase
        .from('user_favorites')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('property_id', propertyId);
    }

    // Update user lambda if it's a save action
    if (interactionType === 'save') {
      await this.updateUserLambda(userId);
    }
  }
}