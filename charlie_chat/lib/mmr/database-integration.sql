-- MMR Integration with Existing Charlie Chat Schema
-- This enhances your current system rather than replacing it

-- 1. DEPRECATED: Originally added MMR columns to user_buy_box_preferences table
-- The system now uses user_markets table structure instead
-- Keeping this for historical reference only

-- ALTER TABLE user_buy_box_preferences 
-- ADD COLUMN IF NOT EXISTS lambda_value DECIMAL(3,2) DEFAULT 0.7,
-- ADD COLUMN IF NOT EXISTS exploration_score DECIMAL(3,2) DEFAULT 0.5,
-- ADD COLUMN IF NOT EXISTS price_min NUMERIC,
-- ADD COLUMN IF NOT EXISTS price_max NUMERIC,
-- ADD COLUMN IF NOT EXISTS units_min INTEGER,
-- ADD COLUMN IF NOT EXISTS units_max INTEGER,
-- ADD COLUMN IF NOT EXISTS year_min INTEGER,
-- ADD COLUMN IF NOT EXISTS year_max INTEGER;

-- 2. Add last_shown tracking to saved_properties (for re-surface policies)
ALTER TABLE saved_properties 
ADD COLUMN IF NOT EXISTS last_shown_to_users JSONB DEFAULT '{}';

-- 3. Create market_statistics table for relevance scoring context
CREATE TABLE IF NOT EXISTS market_statistics (
  market_key VARCHAR(100) PRIMARY KEY, -- 'city_state' or 'zip'
  price_per_unit_median NUMERIC,
  price_per_unit_iqr NUMERIC,
  units_median INTEGER,
  units_iqr INTEGER,
  vintage_median INTEGER,
  vintage_iqr INTEGER,
  geo_diversity_scale_km DECIMAL(4,1) DEFAULT 5.0,
  property_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create weekly_recommendation_runs table (enhance existing weekly_recommendations_log)
CREATE TABLE IF NOT EXISTS weekly_recommendation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  users_processed INTEGER DEFAULT 0,
  total_recommendations INTEGER DEFAULT 0,
  avg_relevance_score DECIMAL(4,3),
  avg_diversity_penalty DECIMAL(4,3),
  completion_status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
  error_details TEXT,
  processing_time_ms INTEGER
);

-- 5. Create view that combines user_favorites with recommendation metadata
CREATE OR REPLACE VIEW recommendation_analytics AS
SELECT 
  uf.id,
  uf.user_id,
  uf.property_id,
  uf.saved_at,
  uf.recommendation_type,
  uf.recommendation_batch_id,
  uf.fit_score,
  uf.diversity_score,
  uf.total_score,
  uf.selection_reasons,
  uf.generated_at,
  uf.favorite_status,
  sp.address_city,
  sp.address_state,
  sp.units_count,
  sp.estimated_value,
  sp.year_built,
  sp.assessed_value,
  sp.estimated_equity,
  sp.auction,
  sp.reo,
  sp.tax_lien,
  sp.pre_foreclosure,
  sp.out_of_state_absentee_owner,
  -- Calculate derived metrics
  CASE WHEN sp.units_count > 0 THEN sp.estimated_value / sp.units_count END as price_per_unit,
  EXTRACT(YEAR FROM NOW()) - sp.year_built as property_age,
  CASE WHEN sp.estimated_value > 0 THEN sp.estimated_equity / sp.estimated_value END as equity_ratio
FROM user_favorites uf
LEFT JOIN saved_properties sp ON uf.property_id = sp.property_id
WHERE uf.is_active = true;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_properties_city_state ON saved_properties(address_city, address_state);
CREATE INDEX IF NOT EXISTS idx_saved_properties_units_price ON saved_properties(units_count, estimated_value);
CREATE INDEX IF NOT EXISTS idx_saved_properties_year_built ON saved_properties(year_built);
CREATE INDEX IF NOT EXISTS idx_saved_properties_deal_signals ON saved_properties(auction, reo, tax_lien, pre_foreclosure);
CREATE INDEX IF NOT EXISTS idx_saved_properties_location ON saved_properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_favorites_batch ON user_favorites(recommendation_batch_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_type_generated ON user_favorites(recommendation_type, generated_at);

-- 7. Sample market statistics calculation function
CREATE OR REPLACE FUNCTION calculate_market_stats(market_key_input TEXT)
RETURNS VOID AS $$
DECLARE
  city_name TEXT;
  state_name TEXT;
BEGIN
  -- Extract city and state from market_key format 'City_State'
  SELECT split_part(market_key_input, '_', 1), split_part(market_key_input, '_', 2) 
  INTO city_name, state_name;
  
  -- Calculate and insert/update market statistics
  INSERT INTO market_statistics (
    market_key,
    price_per_unit_median,
    price_per_unit_iqr,
    units_median,
    units_iqr,
    vintage_median,
    vintage_iqr,
    property_count,
    updated_at
  )
  SELECT 
    market_key_input,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY estimated_value/GREATEST(units_count,1)) as price_per_unit_median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY estimated_value/GREATEST(units_count,1)) - 
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY estimated_value/GREATEST(units_count,1)) as price_per_unit_iqr,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY units_count) as units_median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY units_count) - 
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY units_count) as units_iqr,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built) as vintage_median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY year_built) - 
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY year_built) as vintage_iqr,
    COUNT(*) as property_count,
    NOW()
  FROM saved_properties 
  WHERE address_city ILIKE city_name 
    AND address_state ILIKE state_name
    AND estimated_value > 0 
    AND units_count > 0
    AND year_built > 1900
  HAVING COUNT(*) >= 10 -- Need minimum sample size
  ON CONFLICT (market_key) DO UPDATE SET
    price_per_unit_median = EXCLUDED.price_per_unit_median,
    price_per_unit_iqr = EXCLUDED.price_per_unit_iqr,
    units_median = EXCLUDED.units_median,
    units_iqr = EXCLUDED.units_iqr,
    vintage_median = EXCLUDED.vintage_median,
    vintage_iqr = EXCLUDED.vintage_iqr,
    property_count = EXCLUDED.property_count,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- 8. Sample trigger to update market stats when properties are added/updated
CREATE OR REPLACE FUNCTION trigger_update_market_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue market stats update for this city/state
  IF NEW.address_city IS NOT NULL AND NEW.address_state IS NOT NULL THEN
    PERFORM calculate_market_stats(NEW.address_city || '_' || NEW.address_state);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (optional - can be resource intensive)
-- DROP TRIGGER IF EXISTS tr_update_market_stats ON saved_properties;
-- CREATE TRIGGER tr_update_market_stats
--   AFTER INSERT OR UPDATE ON saved_properties
--   FOR EACH ROW EXECUTE FUNCTION trigger_update_market_stats();