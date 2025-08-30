-- Add market_key field to user_favorites table for better analytics
-- This will store the market context (Market1, Market2, etc.) for each recommendation

-- Add the market_key column
ALTER TABLE user_favorites ADD COLUMN market_key VARCHAR(100);

-- Create index for better query performance
CREATE INDEX idx_user_favorites_market_key ON user_favorites(market_key);

-- Update the recommendation_analytics view to include market_key
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
  uf.market_key,  -- Added market_key field
  sp.address_city,
  sp.address_state,
  sp.units_count,
  sp.estimated_value,
  sp.year_built,
  sp.assessed_value,
  sp.estimated_equity,
  sp.last_sale_amount,  -- Added last_sale_amount field
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