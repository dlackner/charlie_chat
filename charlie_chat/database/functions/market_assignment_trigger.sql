-- Trigger to automatically assign manual properties to markets when markets are created/updated

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_assign_manual_properties()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if latitude or longitude changed (for updates) or on insert
    IF (TG_OP = 'INSERT') OR 
       (TG_OP = 'UPDATE' AND (
           OLD.latitude IS DISTINCT FROM NEW.latitude OR 
           OLD.longitude IS DISTINCT FROM NEW.longitude OR
           OLD.market_key IS DISTINCT FROM NEW.market_key
       )) THEN
        
        RAISE NOTICE 'Market % changed, triggering manual property assignment for user %', 
            NEW.market_key, NEW.user_id;
        
        -- Run the assignment function for this user
        -- We'll run it asynchronously to avoid slowing down the market save
        PERFORM assign_manual_properties_to_markets_for_user(NEW.user_id);
        
        RAISE NOTICE 'Manual property assignment completed for user % after market % change', 
            NEW.user_id, NEW.market_key;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on user_markets table
DROP TRIGGER IF EXISTS assign_manual_properties_trigger ON user_markets;

CREATE TRIGGER assign_manual_properties_trigger
    AFTER INSERT OR UPDATE ON user_markets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_assign_manual_properties();

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_assign_manual_properties() TO service_role;

COMMENT ON FUNCTION trigger_assign_manual_properties() IS 'Trigger function that automatically assigns manual properties to markets when markets are created or updated';

-- Also create a manual utility function for one-time runs
CREATE OR REPLACE FUNCTION run_market_assignment_for_all_users()
RETURNS TABLE(
    user_id UUID,
    total_properties_updated INTEGER,
    processing_time_ms INTEGER
) AS $$
DECLARE
    user_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    properties_updated INTEGER;
BEGIN
    RAISE NOTICE 'Starting market assignment for all users with manual properties';
    
    FOR user_record IN
        SELECT DISTINCT uf.user_id
        FROM user_favorites uf
        WHERE uf.recommendation_type = 'manual'
          AND uf.is_active = true
    LOOP
        start_time := clock_timestamp();
        
        -- Count results from assignment function
        SELECT COUNT(*) INTO properties_updated
        FROM assign_manual_properties_to_markets_for_user(user_record.user_id);
        
        end_time := clock_timestamp();
        
        RETURN QUERY SELECT 
            user_record.user_id,
            properties_updated,
            EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    END LOOP;
    
    RAISE NOTICE 'Completed market assignment for all users';
    RETURN;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION run_market_assignment_for_all_users() TO service_role;

COMMENT ON FUNCTION run_market_assignment_for_all_users() IS 'One-time utility to run market assignment for all users with manual properties';