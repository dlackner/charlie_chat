-- Create recommendation_history table
-- This tracks weekly recommendations shown to users and their responses for learning

CREATE TABLE recommendation_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recommendation batch info
  recommendation_batch_id uuid DEFAULT gen_random_uuid(), -- Groups properties shown together
  generated_at timestamptz DEFAULT now(),
  
  -- Property information
  property_id text NOT NULL, -- External property ID from real estate API
  property_address text NOT NULL,
  market_name text NOT NULL, -- e.g. "Atlanta Metro", "ZIP 30309"
  
  -- Property details (snapshot at time of recommendation)
  assessed_value bigint,
  units_count integer,
  year_built integer,
  property_type text,
  
  -- User response tracking
  user_action text CHECK (user_action IN ('shown', 'favorited', 'dismissed', 'clicked')) DEFAULT 'shown',
  action_timestamp timestamptz,
  
  -- Recommendation engine data
  fit_score numeric(5,2), -- 0-100 score from recommendation engine
  diversity_score numeric(5,2), -- 0-100 score from recommendation engine
  total_score numeric(5,2), -- Combined score
  selection_reasons jsonb, -- Array of reason strings from engine
  
  -- Learning data
  user_feedback text, -- Optional feedback text if user provides it
  dismissal_reason text CHECK (dismissal_reason IN ('too_expensive', 'wrong_location', 'wrong_size', 'poor_condition', 'other')),
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_recommendation_history_user_id ON recommendation_history(user_id);
CREATE INDEX idx_recommendation_history_batch_id ON recommendation_history(recommendation_batch_id);
CREATE INDEX idx_recommendation_history_property_id ON recommendation_history(property_id);
CREATE INDEX idx_recommendation_history_user_action ON recommendation_history(user_action);
CREATE INDEX idx_recommendation_history_generated_at ON recommendation_history(generated_at);

-- Index for learning queries (user preferences analysis)
CREATE INDEX idx_recommendation_history_learning ON recommendation_history(user_id, user_action, generated_at) 
  WHERE user_action IN ('favorited', 'dismissed');

-- Create updated_at trigger
CREATE TRIGGER update_recommendation_history_updated_at BEFORE UPDATE
    ON recommendation_history FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create a separate table for weekly recommendation batches metadata
CREATE TABLE weekly_recommendation_batches (
  batch_id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  
  -- Criteria used for this batch
  criteria_snapshot jsonb, -- Snapshot of user's Buy Box preferences at time of generation
  
  -- Engine settings used
  engine_version text DEFAULT '1.0',
  variance_percentage integer DEFAULT 25,
  properties_per_market integer DEFAULT 3,
  
  -- Results summary
  total_markets integer,
  total_properties_shown integer,
  properties_favorited integer DEFAULT 0,
  properties_dismissed integer DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_weekly_recommendation_batches_user_id ON weekly_recommendation_batches(user_id);
CREATE INDEX idx_weekly_recommendation_batches_generated_at ON weekly_recommendation_batches(generated_at);

CREATE TRIGGER update_weekly_recommendation_batches_updated_at BEFORE UPDATE
    ON weekly_recommendation_batches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create view for easy learning analytics
CREATE VIEW user_recommendation_preferences AS
SELECT 
  r.user_id,
  r.user_action,
  COUNT(*) as action_count,
  AVG(r.assessed_value) as avg_preferred_value,
  AVG(r.units_count) as avg_preferred_units,
  AVG(r.year_built) as avg_preferred_year_built,
  AVG(r.fit_score) as avg_fit_score,
  AVG(r.diversity_score) as avg_diversity_score,
  array_agg(DISTINCT r.property_type) as preferred_property_types,
  array_agg(DISTINCT r.dismissal_reason) FILTER (WHERE r.dismissal_reason IS NOT NULL) as dismissal_reasons
FROM recommendation_history r
WHERE r.user_action IN ('favorited', 'dismissed')
  AND r.generated_at > now() - interval '6 months' -- Only recent preferences
GROUP BY r.user_id, r.user_action;