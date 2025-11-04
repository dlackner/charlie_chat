-- Monthly Activity Reports Trigger Function
-- Executes via Supabase pg_cron on the 1st of each month at 9:00 AM UTC
-- Calls the monthly-activity-reports Edge Function for each user to send metrics to Kajabi

CREATE OR REPLACE FUNCTION trigger_monthly_activity_reports()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    api_response TEXT;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    start_time TIMESTAMP := NOW();
    log_id UUID;
    current_month_start DATE;
    previous_month_start DATE;
    previous_month_end DATE;
BEGIN
    -- Calculate date ranges for the previous month
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    previous_month_start := current_month_start - INTERVAL '1 month';
    previous_month_end := current_month_start - INTERVAL '1 day';

    -- Insert initial log record
    INSERT INTO monthly_activity_reports_log (
        triggered_at,
        status,
        total_users,
        success_count,
        error_count,
        start_time,
        report_month
    ) VALUES (
        NOW(),
        'running',
        0,
        0,
        0,
        start_time,
        previous_month_start
    ) RETURNING id INTO log_id;

    -- Get count of eligible users for logging (all users regardless of class)
    UPDATE monthly_activity_reports_log 
    SET total_users = (
        SELECT COUNT(*) 
        FROM profiles 
        WHERE user_id IS NOT NULL
    )
    WHERE id = log_id;

    -- Process each user to send their monthly activity report
    FOR user_record IN 
        SELECT user_id, email, user_class 
        FROM profiles 
        WHERE user_id IS NOT NULL
        ORDER BY user_id
    LOOP
        BEGIN
            -- Add 1 second delay between users to avoid overwhelming the Edge Function
            PERFORM pg_sleep(1.0);

            -- Make HTTP POST request to the monthly-activity-reports Edge Function
            SELECT content INTO api_response
            FROM http((
                'POST',
                'https://your-project-ref.supabase.co/functions/v1/monthly-activity-reports',
                ARRAY[
                    http_header('Content-Type', 'application/json'),
                    http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
                ],
                'application/json',
                json_build_object(
                    'user_id', user_record.user_id,
                    'email', user_record.email,
                    'user_class', user_record.user_class,
                    'report_month_start', previous_month_start::text,
                    'report_month_end', previous_month_end::text,
                    'trigger_source', 'monthly_cron'
                )::text
            ));
            
            success_count := success_count + 1;
            
            -- Log successful processing
            INSERT INTO monthly_activity_reports_user_log (
                log_id,
                user_id,
                status,
                response,
                processed_at
            ) VALUES (
                log_id,
                user_record.user_id,
                'success',
                api_response,
                NOW()
            );
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            
            -- Log error
            INSERT INTO monthly_activity_reports_user_log (
                log_id,
                user_id,
                status,
                error_message,
                processed_at
            ) VALUES (
                log_id,
                user_record.user_id,
                'error',
                SQLERRM,
                NOW()
            );
            
            -- Continue processing other users
            CONTINUE;
        END;
    END LOOP;

    -- Update final log with results
    UPDATE monthly_activity_reports_log 
    SET 
        status = 'completed',
        success_count = trigger_monthly_activity_reports.success_count,
        error_count = trigger_monthly_activity_reports.error_count,
        end_time = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))
    WHERE id = log_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create logging tables for monthly activity reports
CREATE TABLE IF NOT EXISTS monthly_activity_reports_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    total_users INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds NUMERIC,
    report_month DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_activity_reports_user_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES monthly_activity_reports_log(id),
    user_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    response TEXT,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_monthly_activity_reports() TO postgres;
GRANT EXECUTE ON FUNCTION trigger_monthly_activity_reports() TO service_role;

-- Create the pg_cron job (run this separately in Supabase SQL editor)
-- Runs on the 1st of each month at 9:00 AM UTC
-- SELECT cron.schedule('monthly-activity-reports', '0 9 1 * *', 'SELECT trigger_monthly_activity_reports();');

-- To check if the cron job exists:
-- SELECT * FROM cron.job WHERE jobname = 'monthly-activity-reports';

-- To remove the cron job if needed:
-- SELECT cron.unschedule('monthly-activity-reports');