-- RLS Setup for saved_properties table
-- First let's check the column types to fix the casting issue

-- Step 1: Check column types (run this first to see the data types)
SELECT 
    column_name, 
    data_type, 
    udt_name 
FROM information_schema.columns 
WHERE table_name = 'user_favorites' 
AND column_name IN ('user_id', 'property_id');

SELECT 
    column_name, 
    data_type, 
    udt_name 
FROM information_schema.columns 
WHERE table_name = 'saved_properties' 
AND column_name = 'id';

-- Step 2: Re-enable RLS on saved_properties table
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if any
DROP POLICY IF EXISTS "Users can view saved properties through user_favorites" ON saved_properties;
DROP POLICY IF EXISTS "Users can update saved properties through user_favorites" ON saved_properties;
DROP POLICY IF EXISTS "System can insert saved properties" ON saved_properties;

-- Step 4: Create policies with proper type casting
-- Try different casting approaches based on your column types

-- Option A: If user_id is UUID
CREATE POLICY "Users can view saved properties through user_favorites" 
ON saved_properties FOR SELECT 
USING (
    id IN (
        SELECT property_id 
        FROM user_favorites 
        WHERE user_id = auth.uid()
        AND is_active = true
    )
);

-- If the above fails, comment it out and try Option B below:

-- Option B: If user_id is text
-- CREATE POLICY "Users can view saved properties through user_favorites" 
-- ON saved_properties FOR SELECT 
-- USING (
--     id IN (
--         SELECT property_id 
--         FROM user_favorites 
--         WHERE user_id = auth.uid()::text
--         AND is_active = true
--     )
-- );

-- Option C: If saved_properties.id is text but property_id is UUID
-- CREATE POLICY "Users can view saved properties through user_favorites" 
-- ON saved_properties FOR SELECT 
-- USING (
--     id::uuid IN (
--         SELECT property_id 
--         FROM user_favorites 
--         WHERE user_id = auth.uid()
--         AND is_active = true
--     )
-- );

-- UPDATE policy (use same casting as SELECT policy above)
CREATE POLICY "Users can update saved properties through user_favorites" 
ON saved_properties FOR UPDATE 
USING (
    id IN (
        SELECT property_id 
        FROM user_favorites 
        WHERE user_id = auth.uid()
        AND is_active = true
    )
);

-- INSERT policy
CREATE POLICY "System can insert saved properties" 
ON saved_properties FOR INSERT 
WITH CHECK (true);

-- Instructions:
-- 1. First run the SELECT statements at the top to see column types
-- 2. Based on the results, uncomment the appropriate policy option
-- 3. Comment out the option that doesn't work