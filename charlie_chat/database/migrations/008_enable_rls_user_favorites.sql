-- Migration: Enable RLS on user_favorites table
-- This ensures users can only access their own favorite properties and recommendations

-- Enable Row Level Security on user_favorites
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can manage their own favorites
-- This allows authenticated users to SELECT, INSERT, UPDATE, DELETE their own records
CREATE POLICY "users_can_manage_own_favorites" ON user_favorites
  FOR ALL 
  USING (auth.uid() = user_id);

-- Policy 2: Service role can access all favorites
-- This allows Edge Functions and server-side operations to access all records
CREATE POLICY "service_role_full_access_favorites" ON user_favorites
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Add helpful comment
COMMENT ON TABLE user_favorites IS 'Table has RLS enabled. Users can only access their own favorites, service role has full access.';