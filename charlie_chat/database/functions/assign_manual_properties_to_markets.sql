-- Function to assign manual properties to markets based on geographic proximity
-- Calculates distance using haversine formula and updates market_key for properties within 10 miles

CREATE OR REPLACE FUNCTION assign_manual_properties_to_markets(target_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    updated_property_id TEXT,
    old_market_key TEXT,
    new_market_key TEXT,
    distance_miles NUMERIC,
    property_address TEXT
) AS $$
DECLARE
    property_record RECORD;
    market_record RECORD;
    min_distance NUMERIC;
    closest_market_key TEXT;
    distance_miles NUMERIC;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting manual property market assignment for user: %', COALESCE(target_user_id::TEXT, 'ALL USERS');
    
    -- Loop through all manual properties (or for specific user if provided)
    FOR property_record IN
        SELECT DISTINCT
            uf.user_id,
            uf.property_id,
            uf.market_key as current_market_key,
            sp.latitude,
            sp.longitude,
            sp.address_full
        FROM user_favorites uf
        INNER JOIN saved_properties sp ON uf.property_id = sp.property_id
        WHERE uf.recommendation_type = 'manual'
          AND uf.is_active = true
          AND sp.latitude IS NOT NULL 
          AND sp.longitude IS NOT NULL
          AND (target_user_id IS NULL OR uf.user_id = target_user_id)
    LOOP
        -- Reset for each property
        min_distance := 999999;  -- Start with very large number
        closest_market_key := NULL;
        
        -- Check distance to each market for this user
        FOR market_record IN
            SELECT 
                market_key,
                market_name,
                latitude,
                longitude
            FROM user_markets 
            WHERE user_id = property_record.user_id
              AND latitude IS NOT NULL 
              AND longitude IS NOT NULL
        LOOP
            -- Calculate haversine distance in miles
            distance_miles := (
                3959 * acos(
                    cos(radians(property_record.latitude)) * 
                    cos(radians(market_record.latitude)) * 
                    cos(radians(market_record.longitude) - radians(property_record.longitude)) + 
                    sin(radians(property_record.latitude)) * 
                    sin(radians(market_record.latitude))
                )
            );
            
            -- Track closest market
            IF distance_miles < min_distance THEN
                min_distance := distance_miles;
                closest_market_key := market_record.market_key;
            END IF;
            
            RAISE DEBUG 'Property % to Market %: %.2f miles', 
                property_record.property_id, market_record.market_key, distance_miles;
        END LOOP;
        
        -- If closest market is within 10 miles and different from current, update it
        IF min_distance <= 10.0 AND (closest_market_key != property_record.current_market_key OR property_record.current_market_key IS NULL) THEN
            
            -- Update the market_key in user_favorites
            UPDATE user_favorites 
            SET 
                market_key = closest_market_key,
                updated_at = NOW()
            WHERE user_id = property_record.user_id 
              AND property_id = property_record.property_id 
              AND recommendation_type = 'manual';
            
            updated_count := updated_count + 1;
            
            -- Return this update in results
            RETURN QUERY SELECT 
                property_record.property_id,
                property_record.current_market_key,
                closest_market_key,
                min_distance,
                property_record.address_full;
                
            RAISE NOTICE 'Updated property % from market % to % (%.2f miles): %', 
                property_record.property_id, 
                COALESCE(property_record.current_market_key, 'NULL'), 
                closest_market_key, 
                min_distance,
                property_record.address_full;
        ELSE
            RAISE DEBUG 'Property % - closest market % is %.2f miles away (no update needed)', 
                property_record.property_id, closest_market_key, min_distance;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Manual property market assignment completed. Updated % properties.', updated_count;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create a simpler wrapper function for single user
CREATE OR REPLACE FUNCTION assign_manual_properties_to_markets_for_user(target_user_id UUID)
RETURNS TABLE(
    updated_property_id TEXT,
    old_market_key TEXT,
    new_market_key TEXT,
    distance_miles NUMERIC,
    property_address TEXT
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM assign_manual_properties_to_markets(target_user_id);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION assign_manual_properties_to_markets(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION assign_manual_properties_to_markets_for_user(UUID) TO service_role;

COMMENT ON FUNCTION assign_manual_properties_to_markets(UUID) IS 'Assigns manual properties to markets based on 10-mile radius from market center coordinates';
COMMENT ON FUNCTION assign_manual_properties_to_markets_for_user(UUID) IS 'Assigns manual properties to markets for a specific user';

-- Example usage:
-- SELECT * FROM assign_manual_properties_to_markets_for_user('your-user-id');
-- SELECT * FROM assign_manual_properties_to_markets(); -- For all users