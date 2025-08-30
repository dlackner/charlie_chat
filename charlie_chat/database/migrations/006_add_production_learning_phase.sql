-- Migration: Add Production learning phase and notification tracking to user_markets table
-- This enables the Mastery → Production transition after 4 weeks of stable mastery

-- Add learned preferences and notification tracking columns to user_markets table
ALTER TABLE user_markets 
ADD COLUMN IF NOT EXISTS learned_preferences JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS production_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS production_notification_sent BOOLEAN DEFAULT FALSE;

-- Add comments explaining the new columns
COMMENT ON COLUMN user_markets.learned_preferences IS 'Stored learned preferences for production mode (geographic center, radius, characteristic ranges, etc.)';
COMMENT ON COLUMN user_markets.production_notified_at IS 'Timestamp when user was notified about Production transition';
COMMENT ON COLUMN user_markets.production_notification_sent IS 'Whether user has been notified about this markets Production transition';

-- Note: learning_phase and mastery_achieved_date columns already exist in the schema
-- Update existing markets to ensure they have the discovery phase set
UPDATE user_markets 
SET learning_phase = 'discovery' 
WHERE learning_phase IS NULL;