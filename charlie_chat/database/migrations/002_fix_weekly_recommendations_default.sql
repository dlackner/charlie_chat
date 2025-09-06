-- Fix weekly_recommendations_enabled default value in profiles table
-- Since there's only one user, this is a simple fix

-- Change the default value for future records
ALTER TABLE profiles ALTER COLUMN weekly_recommendations_enabled SET DEFAULT false;

-- Update existing record to false (user will need to explicitly check the box to enable)
UPDATE profiles SET weekly_recommendations_enabled = false;