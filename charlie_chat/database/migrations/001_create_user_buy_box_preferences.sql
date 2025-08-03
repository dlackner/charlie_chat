-- Create user_buy_box_preferences table
-- This stores user preferences for weekly property recommendations

CREATE TABLE user_buy_box_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Market Selection with embedded filters (up to 5 target markets)
  -- JSON structure: [{"type": "city", "city": "Newport", "state": "RI", "units_min": 2, "units_max": 4, "assessed_value_min": 600000, "assessed_value_max": 2000000}, ...]
  target_markets jsonb DEFAULT '[]'::jsonb,
  
  -- Global preferences
  weekly_recommendations_enabled boolean DEFAULT true,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX idx_user_buy_box_preferences_user_id ON user_buy_box_preferences(user_id);
CREATE INDEX idx_user_buy_box_preferences_enabled ON user_buy_box_preferences(weekly_recommendations_enabled) WHERE weekly_recommendations_enabled = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_buy_box_preferences_updated_at BEFORE UPDATE
    ON user_buy_box_preferences FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();