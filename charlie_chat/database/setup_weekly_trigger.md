# Weekly Recommendations Automated Trigger Setup

## Prerequisites

1. **Enable required extensions in Supabase:**
   ```sql
   -- Enable HTTP extension (for making API calls)
   CREATE EXTENSION IF NOT EXISTS http;
   
   -- Enable pg_cron extension (for scheduling)
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Set configuration variables:**
   ```sql
   -- Set your app's base URL
   ALTER DATABASE postgres SET app.base_url = 'https://your-domain.com';
   
   -- Set service role key for API authentication
   ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
   ```

## Installation Steps

1. **Run the trigger function script:**
   - Copy contents of `database/functions/weekly_recommendations_trigger.sql`
   - Execute in Supabase SQL Editor

2. **Verify the scheduled job:**
   ```sql
   -- Check if the cron job was created
   SELECT * FROM cron.job WHERE jobname = 'weekly-recommendations-trigger';
   ```

3. **Test the function manually:**
   ```sql
   -- Test with a specific user (replace with actual user ID)
   SELECT * FROM trigger_weekly_recommendations();
   ```

## Configuration Options

### Change Schedule
To modify when recommendations are sent:
```sql
-- Update cron schedule (current: Monday 6 AM UTC)
SELECT cron.alter_job('weekly-recommendations-trigger', schedule => '0 8 * * 1');
```

### Disable/Enable
```sql
-- Disable the trigger
SELECT cron.unschedule('weekly-recommendations-trigger');

-- Re-enable the trigger
SELECT cron.schedule('weekly-recommendations-trigger', '0 6 * * 1', 'SELECT trigger_weekly_recommendations();');
```

### Monitor Execution
```sql
-- Check execution logs
SELECT * FROM weekly_recommendations_log ORDER BY triggered_at DESC LIMIT 10;

-- Check cron job history
SELECT * FROM cron.job_run_details WHERE jobname = 'weekly-recommendations-trigger' ORDER BY start_time DESC LIMIT 10;
```

## Environment Variables

Make sure these are set in your Next.js environment:

- `NEXT_PUBLIC_APP_URL` - Your app's base URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for API authentication

## Troubleshooting

### Common Issues:

1. **HTTP extension not enabled:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS http;
   ```

2. **pg_cron not available:**
   - Enable in Supabase dashboard under Database → Extensions

3. **Authentication failures:**
   - Verify service role key in configuration
   - Check API endpoint accepts x-user-id header

4. **API rate limiting:**
   - Function includes 0.5s delay between users
   - Adjust `pg_sleep(0.5)` if needed

### Debug Mode:
```sql
-- Enable detailed logging
SET log_min_messages = 'notice';
SELECT trigger_weekly_recommendations();
```

## Security Notes

- Function runs with SECURITY DEFINER privileges
- Service role key should be stored securely
- Consider IP whitelisting for API calls
- Monitor execution logs for anomalies