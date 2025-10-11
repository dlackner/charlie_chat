-- Add Capital Club fields to profiles table
-- This tracks whether a user has enrolled in the Capital Club and when

ALTER TABLE profiles 
ADD COLUMN capital_club_enrolled BOOLEAN DEFAULT FALSE,
ADD COLUMN capital_club_enrolled_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of enrolled members
CREATE INDEX idx_profiles_capital_club_enrolled ON profiles(capital_club_enrolled);
CREATE INDEX idx_profiles_capital_club_enrolled_at ON profiles(capital_club_enrolled_at);

-- Add comments for documentation
COMMENT ON COLUMN profiles.capital_club_enrolled IS 'Whether the user has enrolled in the Capital Club program';
COMMENT ON COLUMN profiles.capital_club_enrolled_at IS 'Timestamp when the user enrolled in the Capital Club';