-- Migration: Add property ID caching to user_buy_box_preferences table
-- This allows us to cache property IDs when users save markets,
-- enabling faster deduplication during weekly recommendations

ALTER TABLE user_buy_box_preferences 
ADD COLUMN cached_property_ids JSONB DEFAULT NULL,
ADD COLUMN cache_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN cache_criteria_hash TEXT DEFAULT NULL;

-- Add comment explaining the new fields
COMMENT ON COLUMN user_buy_box_preferences.cached_property_ids IS 'Cached property IDs from last market search, used for efficient deduplication';
COMMENT ON COLUMN user_buy_box_preferences.cache_updated_at IS 'Timestamp when property cache was last updated';
COMMENT ON COLUMN user_buy_box_preferences.cache_criteria_hash IS 'Hash of market criteria to detect when cache needs refresh';