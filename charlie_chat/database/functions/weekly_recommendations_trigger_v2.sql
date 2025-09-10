/*
 * CHARLIE2 V2 - Weekly Recommendations Automated Trigger
 * Updated SQL function that calls the V2 weekly recommendations API endpoint
 * This replaces the legacy trigger to use the new V2 architecture
 */

-- Drop and recreate the function to point to V2 endpoint
DROP FUNCTION IF EXISTS trigger_weekly_recommendations_v2();

CREATE OR REPLACE FUNCTION trigger_weekly_recommendations_v2()
RETURNS TABLE(user_email TEXT, status TEXT, message TEXT) AS $$
DECLARE
    user_record RECORD;
    api_response http_response;
    auth_token TEXT;
    api_url TEXT;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Set the V2 API URL (updated to use V2 endpoint)
    api_url := coalesce(
        current_setting('app.base_url', true), 
        'http://localhost:3000'
    ) || '/api/v2/weekly-recommendations';
    
    RAISE NOTICE 'Starting V2 weekly recommendations trigger at %', NOW();
    RAISE NOTICE 'V2 API URL: %', api_url;
    
    -- Loop through all users who have weekly recommendations enabled
    FOR user_record IN 
        SELECT DISTINCT u.id, u.email::TEXT as email, u.raw_user_meta_data
        FROM auth.users u
        INNER JOIN profiles p ON u.id = p.user_id
        WHERE p.weekly_recommendations_enabled = true
        AND u.email IS NOT NULL
        AND u.deleted_at IS NULL
        ORDER BY u.email
    LOOP
        BEGIN
            RAISE NOTICE 'Processing user: % (%) with V2 API', user_record.email, user_record.id;
            
            -- Generate a service role JWT token for API authentication
            auth_token := 'Bearer ' || coalesce(
                current_setting('app.service_role_key', true),
                'your-service-role-key-here'
            );
            
            -- Make HTTP request to the V2 weekly recommendations API
            SELECT * INTO api_response FROM http((
                'POST',
                api_url,
                ARRAY[
                    http_header('Content-Type', 'application/json'),
                    http_header('Authorization', auth_token),
                    http_header('x-user-id', user_record.id::TEXT)
                ],
                '{}',  -- Empty JSON body since API uses user from auth
                NULL
            )::http_request);
            
            -- Check response status
            IF api_response.status BETWEEN 200 AND 299 THEN
                success_count := success_count + 1;
                RETURN QUERY SELECT user_record.email::TEXT, 'SUCCESS'::TEXT, 'V2 Recommendations generated successfully'::TEXT;
                RAISE NOTICE 'SUCCESS: User % - V2 Status: %', user_record.email, api_response.status;
            ELSE
                error_count := error_count + 1;
                RETURN QUERY SELECT user_record.email::TEXT, 'ERROR'::TEXT, 
                    format('V2 API returned status %: %', api_response.status, api_response.content)::TEXT;
                RAISE WARNING 'ERROR: User % - V2 Status: %, Response: %', 
                    user_record.email, api_response.status, api_response.content;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RETURN QUERY SELECT user_record.email::TEXT, 'ERROR'::TEXT, 
                format('V2 Exception: %', SQLERRM)::TEXT;
            RAISE WARNING 'EXCEPTION: User % - V2 Error: %', user_record.email, SQLERRM;
        END;
        
        -- Small delay between requests to avoid overwhelming the API
        PERFORM pg_sleep(0.5);
    END LOOP;
    
    RAISE NOTICE 'V2 Weekly recommendations trigger completed. Success: %, Errors: %', success_count, error_count;
    
    -- Log summary to a table (optional) - add version info
    INSERT INTO weekly_recommendations_log (
        triggered_at, 
        success_count, 
        error_count, 
        total_users,
        version
    ) VALUES (
        NOW(), 
        success_count, 
        error_count, 
        success_count + error_count,
        '2.0'
    ) 
    ON CONFLICT DO NOTHING; -- In case version column doesn't exist yet
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_weekly_recommendations_v2() TO service_role;

COMMENT ON FUNCTION trigger_weekly_recommendations_v2() IS 'V2 Automated function that triggers weekly property recommendations for all eligible users using the new V2 API architecture';

-- Optional: Update the original function to call V2 (for backward compatibility)
-- This allows existing cron jobs to automatically use V2 without changing the function name

CREATE OR REPLACE FUNCTION trigger_weekly_recommendations()
RETURNS TABLE(user_email TEXT, status TEXT, message TEXT) AS $$
BEGIN
    -- Simply delegate to the V2 function for backward compatibility
    RETURN QUERY SELECT * FROM trigger_weekly_recommendations_v2();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_weekly_recommendations() IS 'Backward compatibility wrapper that calls the V2 weekly recommendations function';