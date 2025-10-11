// MMR Types - Integrated with existing Charlie Chat schema

// Extends your existing saved_properties table structure
export interface SavedProperty {
  id: string;
  property_id: string;
  address_street?: string;
  address_full?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  latitude?: number;
  longitude?: number;
  mail_address_full?: string;
  mail_address_street?: string;
  mail_address_city?: string;
  mail_address_county?: string;
  mail_address_state?: string;
  mail_address_zip?: string;
  property_type?: string;
  units_count?: number;
  stories?: number;
  year_built?: number;
  square_feet?: number;
  lot_square_feet?: number;
  flood_zone?: boolean;
  flood_zone_description?: string;
  assessed_value?: number;
  assessed_land_value?: number;
  estimated_value?: number;
  estimated_equity?: number;
  rent_estimate?: number;
  listing_price?: number;
  mortgage_balance?: number;
  mortgage_maturing_date?: string;
  last_sale_date?: string;
  last_sale_amount?: number;
  last_sale_arms_length?: boolean;
  years_owned?: number;
  mls_active?: boolean;
  for_sale?: boolean;
  assumable?: boolean;
  auction?: boolean;
  reo?: boolean;
  pre_foreclosure?: boolean;
  foreclosure?: boolean;
  private_lender?: boolean;
  owner_first_name?: string;
  owner_last_name?: string;
  out_of_state_absentee_owner?: boolean;
  in_state_absentee_owner?: boolean;
  owner_occupied?: boolean;
  corporate_owned?: boolean;
  investor_buyer?: boolean;
  lender_name?: string;
  total_portfolio_equity?: number;
  total_portfolio_mortgage_balance?: number;
  total_properties_owned?: number;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  saved_at?: string;
  skip_trace_data?: any;
  last_skip_trace?: string;
  last_shown_to_users?: Record<string, string>; // user_id -> ISO date
}

// DEPRECATED: This interface referenced the old user_buy_box_preferences table
// The system now uses the user_markets table structure instead
// Keeping this interface for backwards compatibility with old MMR code
export interface UserBuyBoxPreferences {
  id: string;
  user_id?: string;
  target_markets?: string[]; // JSONB array - DEPRECATED
  weekly_recommendations_enabled?: boolean; // DEPRECATED - now in profiles table
  created_at?: string;
  updated_at?: string;
  cached_property_ids?: string[]; // JSONB array - DEPRECATED
  cache_updated_at?: string; // DEPRECATED
  cache_criteria_hash?: string; // DEPRECATED
  // New MMR fields - DEPRECATED
  lambda_value?: number; // DEPRECATED - now in user_markets table
  exploration_score?: number; // DEPRECATED
  total_saves?: number; // DEPRECATED
  price_min?: number; // DEPRECATED
  price_max?: number;
  units_min?: number;
  units_max?: number;
  year_min?: number;
  year_max?: number;
}

// Extends your existing user_favorites table
export interface UserFavorite {
  id: string;
  user_id: string;
  property_id: string;
  saved_at?: string;
  notes?: string;
  is_active?: boolean;
  recommendation_type?: 'manual' | 'algorithm';
  recommendation_batch_id?: string;
  fit_score?: number;
  diversity_score?: number;
  total_score?: number;
  selection_reasons?: string[]; // JSONB array
  generated_at?: string;
  favorite_status?: string;
}

// New market statistics interface
export interface MarketStatistics {
  market_key: string; // 'city_state'
  price_per_unit_median?: number;
  price_per_unit_iqr?: number;
  units_median?: number;
  units_iqr?: number;
  vintage_median?: number;
  vintage_iqr?: number;
  geo_diversity_scale_km?: number;
  property_count?: number;
  updated_at?: string;
}

// Buy Box interface (extracted from user preferences)
export interface BuyBox {
  markets: string[]; // from target_markets
  priceMin?: number;
  priceMax?: number;
  unitsMin?: number;
  unitsMax?: number;
  yearMin?: number;
  yearMax?: number;
}

// MMR Candidate interface for algorithm processing
export interface MMRCandidate {
  property_id: string;
  relevance: number;
  latitude?: number;
  longitude?: number;
  address_zip?: string;
  address_city?: string;
  address_state?: string;
  price?: number;
  pricePerUnit?: number;
  units?: number;
  vintage?: number;
  propertyType?: string;
  whyRecommended: string[];
  // Derived scores for MMR
  priceFit?: number;
  unitsFit?: number;
  vintageFit?: number;
  dealSignals?: number;
  marketFit?: number;
  ownerFit?: number;
}

// Recommendation batch result (maps to your user_favorites structure)
export interface RecommendationBatch {
  batch_id: string;
  user_id: string;
  week_start: string;
  lambda: number;
  total_candidates: number;
  recommendations: Array<{
    property_id: string;
    fit_score: number;
    diversity_score: number;
    total_score: number;
    selection_reasons: string[];
    position: number;
  }>;
}

// Weekly recommendation run tracking
export interface WeeklyRecommendationRun {
  id: string;
  week_start: string;
  triggered_at: string;
  users_processed: number;
  total_recommendations: number;
  avg_relevance_score?: number;
  avg_diversity_penalty?: number;
  completion_status: 'running' | 'completed' | 'failed';
  error_details?: string;
  processing_time_ms?: number;
}

// Interaction types for learning (extends your existing interaction patterns)
export type InteractionType = 
  | 'impression' 
  | 'view' 
  | 'save' 
  | 'analytics' 
  | 'skip_trace' 
  | 'loi_start'
  | 'remove'
  | 'status_change';

export interface UserInteraction {
  user_id: string;
  property_id: string;
  batch_id: string;
  interaction_type: InteractionType;
  position?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Relevance scoring result
export interface RelevanceScore {
  score: number;
  reasoning: string[];
  components: {
    priceFit: number;
    unitsFit: number;
    vintageFit: number;
    dealSignals: number;
    marketFit: number;
    ownerFit: number;
  };
  penalties: number;
}

// MMR algorithm configuration
export interface MMRConfig {
  k: number; // number of recommendations to select
  lambda: number; // relevance vs diversity balance (0-1)
  maxPerZip: number; // max properties per ZIP code
  geoDiversityScaleKm: number; // geographic similarity scale
  resurfaceWindowWeeks: number; // weeks before reshowing properties
  candidatePoolSize: number; // max candidates to consider
}

// Similarity calculation weights
export interface SimilarityWeights {
  geographic: number;
  pricePerUnit: number;
  units: number;
  vintage: number;
  propertyType: number;
}

// Default MMR configuration values
export const DEFAULT_MMR_CONFIG: MMRConfig = {
  k: 9,
  lambda: 0.7,
  maxPerZip: 2,
  geoDiversityScaleKm: 5.0,
  resurfaceWindowWeeks: 8,
  candidatePoolSize: 200
};

export const DEFAULT_SIMILARITY_WEIGHTS: SimilarityWeights = {
  geographic: 0.35,
  pricePerUnit: 0.25,
  units: 0.20,
  vintage: 0.15,
  propertyType: 0.05
};