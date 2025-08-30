-- Add is_locked field to user_markets table
-- Markets are locked by default after saving to prevent unexpected changes

ALTER TABLE user_markets ADD COLUMN is_locked BOOLEAN DEFAULT TRUE;

-- Create index for performance
CREATE INDEX idx_user_markets_locked ON user_markets(is_locked);

-- Set existing saved markets to locked (they've already been configured)
UPDATE user_markets SET is_locked = TRUE;