-- Migration: Enable RLS on user_markets table
-- This ensures users can only access their own market configurations

-- Enable Row Level Security on user_markets
ALTER TABLE user_markets ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can manage their own markets
-- This allows authenticated users to SELECT, INSERT, UPDATE, DELETE their own records
CREATE POLICY "users_can_manage_own_markets" ON user_markets
  FOR ALL 
  USING (auth.uid() = user_id);

-- Policy 2: Service role can access all markets  
-- This allows Edge Functions and server-side operations to access all records
CREATE POLICY "service_role_full_access" ON user_markets
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Add helpful comment
COMMENT ON TABLE user_markets IS 'Table has RLS enabled. Users can only access their own markets, service role has full access.';