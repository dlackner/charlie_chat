-- Fixed Weekly Recommendations Automated Trigger
-- This fixes the data type mismatch error

-- Drop and recreate the function with proper type casting
DROP FUNCTION IF EXISTS trigger_weekly_recommendations();

CREATE OR REPLACE FUNCTION trigger_weekly_recommendations()
RETURNS TABLE(user_email TEXT, status TEXT, message TEXT) AS $$
DECLARE
    user_record RECORD;
    api_response http_response;
    auth_token TEXT;
    api_url TEXT;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Set the API URL (adjust based on your environment)
    api_url := coalesce(
        current_setting('app.base_url', true), 
        'http://localhost:3000'
    ) || '/api/weekly-recommendations';
    
    RAISE NOTICE 'Starting weekly recommendations trigger at %', NOW();
    RAISE NOTICE 'API URL: %', api_url;
    
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
            RAISE NOTICE 'Processing user: % (%)', user_record.email, user_record.id;
            
            -- Generate a service role JWT token for API authentication
            auth_token := 'Bearer ' || coalesce(
                current_setting('app.service_role_key', true),
                'your-service-role-key-here'
            );
            
            -- Make HTTP request to the weekly recommendations API
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
                RETURN QUERY SELECT user_record.email::TEXT, 'SUCCESS'::TEXT, 'Recommendations generated successfully'::TEXT;
                RAISE NOTICE 'SUCCESS: User % - Status: %', user_record.email, api_response.status;
            ELSE
                error_count := error_count + 1;
                RETURN QUERY SELECT user_record.email::TEXT, 'ERROR'::TEXT, 
                    format('API returned status %: %', api_response.status, api_response.content)::TEXT;
                RAISE WARNING 'ERROR: User % - Status: %, Response: %', 
                    user_record.email, api_response.status, api_response.content;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RETURN QUERY SELECT user_record.email::TEXT, 'ERROR'::TEXT, 
                format('Exception: %', SQLERRM)::TEXT;
            RAISE WARNING 'EXCEPTION: User % - Error: %', user_record.email, SQLERRM;
        END;
        
        -- Small delay between requests to avoid overwhelming the API
        PERFORM pg_sleep(0.5);
    END LOOP;
    
    RAISE NOTICE 'Weekly recommendations trigger completed. Success: %, Errors: %', success_count, error_count;
    
    -- Log summary to a table (optional)
    INSERT INTO weekly_recommendations_log (
        triggered_at, 
        success_count, 
        error_count, 
        total_users
    ) VALUES (
        NOW(), 
        success_count, 
        error_count, 
        success_count + error_count
    );
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_weekly_recommendations() TO service_role;

COMMENT ON FUNCTION trigger_weekly_recommendations() IS 'Automated function that triggers weekly property recommendations for all eligible users';