-- Weekly Recommendations Trigger Function
-- Executes via Supabase pg_cron every Friday at 6:00 AM UTC
-- Calls the Next.js API endpoint for each user with weekly recommendations enabled

CREATE OR REPLACE FUNCTION trigger_weekly_recommendations()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    api_response TEXT;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    start_time TIMESTAMP := NOW();
    log_id UUID;
BEGIN
    -- Insert initial log record
    INSERT INTO weekly_recommendations_log (
        triggered_at,
        status,
        total_users,
        success_count,
        error_count,
        start_time
    ) VALUES (
        NOW(),
        'running',
        0,
        0,
        0,
        start_time
    ) RETURNING id INTO log_id;

    -- Get count of eligible users for logging
    UPDATE weekly_recommendations_log 
    SET total_users = (
        SELECT COUNT(*) 
        FROM profiles 
        WHERE weekly_recommendations_enabled = true
    )
    WHERE id = log_id;

    -- Process each user with weekly recommendations enabled
    FOR user_record IN 
        SELECT user_id 
        FROM profiles 
        WHERE weekly_recommendations_enabled = true
    LOOP
        BEGIN
            -- Add 0.5 second delay between users to avoid overwhelming the API
            PERFORM pg_sleep(0.5);

            -- Make HTTP POST request to the API endpoint
            SELECT content INTO api_response
            FROM http((
                'POST',
                'https://multifamilyos.ai/api/weekly-recommendations',
                ARRAY[
                    http_header('Content-Type', 'application/json'),
                    http_header('x-user-id', user_record.user_id::TEXT)
                ],
                'application/json',
                '{}'
            )::http_request);

            -- If we get here without exception, consider it a success
            success_count := success_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log the error but continue processing other users
            error_count := error_count + 1;
            
            -- Optionally log specific error details
            RAISE NOTICE 'Error processing user %: %', user_record.user_id, SQLERRM;
        END;
    END LOOP;

    -- Update the log record with final results
    UPDATE weekly_recommendations_log 
    SET 
        status = CASE 
            WHEN error_count = 0 THEN 'completed'
            WHEN success_count = 0 THEN 'failed'
            ELSE 'partial_success'
        END,
        success_count = trigger_weekly_recommendations.success_count,
        error_count = trigger_weekly_recommendations.error_count,
        completed_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER
    WHERE id = log_id;

    -- Log summary
    RAISE NOTICE 'Weekly recommendations completed. Success: %, Errors: %', success_count, error_count;
    
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_weekly_recommendations() TO postgres;
GRANT EXECUTE ON FUNCTION trigger_weekly_recommendations() TO service_role;

-- Create the pg_cron job (run this separately in Supabase SQL editor)
-- SELECT cron.schedule('weekly-recommendations', '0 6 * * 5', 'SELECT trigger_weekly_recommendations();');

-- To check if the cron job exists:
-- SELECT * FROM cron.job WHERE jobname = 'weekly-recommendations';

-- To manually test the function:
-- SELECT trigger_weekly_recommendations();