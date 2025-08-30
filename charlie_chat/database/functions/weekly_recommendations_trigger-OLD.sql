-- Weekly Recommendations Automated Trigger
-- This function runs weekly to generate recommendations for all eligible users

-- First, enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create function to trigger weekly recommendations for all users
CREATE OR REPLACE FUNCTION trigger_weekly_recommendations()
RETURNS TABLE(user_email TEXT, status TEXT, message TEXT) AS $$
DECLARE
    user_record RECORD;
    api_response http_response;
    auth_token TEXT;
    api_url TEXT;
    request_body TEXT;
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
        SELECT DISTINCT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        INNER JOIN user_buy_box_preferences bp ON u.id = bp.user_id
        WHERE bp.weekly_recommendations_enabled = true
        AND u.email IS NOT NULL
        AND u.deleted_at IS NULL
        ORDER BY u.email
    LOOP
        BEGIN
            RAISE NOTICE 'Processing user: % (%)', user_record.email, user_record.id;
            
            -- Generate a service role JWT token for API authentication
            -- Note: In production, you'd want to use a proper service account token
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
                RETURN QUERY SELECT user_record.email, 'SUCCESS'::TEXT, 'Recommendations generated successfully'::TEXT;
                RAISE NOTICE 'SUCCESS: User % - Status: %', user_record.email, api_response.status;
            ELSE
                error_count := error_count + 1;
                RETURN QUERY SELECT user_record.email, 'ERROR'::TEXT, 
                    format('API returned status %: %', api_response.status, api_response.content)::TEXT;
                RAISE WARNING 'ERROR: User % - Status: %, Response: %', 
                    user_record.email, api_response.status, api_response.content;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RETURN QUERY SELECT user_record.email, 'ERROR'::TEXT, 
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

-- Create log table for tracking trigger execution
CREATE TABLE IF NOT EXISTS weekly_recommendations_log (
    id SERIAL PRIMARY KEY,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    total_users INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

-- Add RLS policy for the log table
ALTER TABLE weekly_recommendations_log ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage the log
CREATE POLICY "Service role can manage weekly_recommendations_log" ON weekly_recommendations_log
    FOR ALL USING (auth.role() = 'service_role');

-- Schedule the function to run every Monday at 6 AM UTC
-- Note: Requires pg_cron extension to be enabled
SELECT cron.schedule(
    'weekly-recommendations-trigger',
    '0 6 * * 1',  -- Every Monday at 6 AM UTC
    'SELECT trigger_weekly_recommendations();'
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_weekly_recommendations() TO service_role;

COMMENT ON FUNCTION trigger_weekly_recommendations() IS 'Automated function that triggers weekly property recommendations for all eligible users';
COMMENT ON TABLE weekly_recommendations_log IS 'Log table tracking weekly recommendations trigger execution';