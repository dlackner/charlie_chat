/*
 * monthly-activity-reports
 * Supabase Edge Function for generating monthly user activity reports
 * 
 * Purpose: Collects user activity metrics for the current month and sends
 * individual reports to Zapier webhook for integration with Kajabi
 * 
 * Metrics collected:
 * - Properties favorited count
 * - Market activity count  
 * - Analyses created count
 * - LOIs/P&S created count
 * - Marketing letters created count
 * - Emails sent count
 * - Property searches count
 * 
 * Schedule: Run monthly (1st of each month)
 * Deployment: supabase functions deploy monthly-activity-reports
 * URL: https://your-project.supabase.co/functions/v1/monthly-activity-reports
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  console.log('Monthly activity report started at:', new Date().toISOString());

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const monthlyReportWebhookUrl = Deno.env.get('MONTHLY_REPORT_ZAPIER_WEBHOOK_URL');

    if (!monthlyReportWebhookUrl) {
      throw new Error('MONTHLY_REPORT_ZAPIER_WEBHOOK_URL environment variable is not set');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current month info
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
    const daysInMonth = 30; // Use 30 days for current month data

    // Email addresses to exclude from reports (same as daily report)
    const EXCLUDED_EMAILS = [
      'dlackner@hotmail.com',
      'dplackner@gmail.com',
      'dhlackner@gmail.com',
      'dan@folkdot.com',
      'chasdobens@gmail.com',
      'charles@dacc.law',
      'emma@multifamilyos.com',
      'info@multifamilyinvestingacademy.com',
      'esledge@gmail.com',
      'charles@dobenslaw.com'
    ];

    // Get all users
    const { data: users, error } = await supabase
      .from('profiles')
      .select('user_id, email, user_class')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Filter out excluded emails
    const filteredUsers = (users || []).filter(user => 
      !EXCLUDED_EMAILS.includes(user.email.toLowerCase())
    );

    console.log(`Processing ${filteredUsers.length} users for monthly report`);

    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of filteredUsers) {
      try {
        console.log(`Processing user: ${user.email}`);

        // Prepare API base URL (assuming this runs on the same domain)
        const baseUrl = Deno.env.get('FUNCTION_BASE_URL') || 'https://your-app-domain.com';

        // Fetch all metrics for this user - NOW INCLUDING PROPERTY SEARCHES
        const [
          favoritesResponse, 
          marketResponse, 
          analysesResponse, 
          loisResponse, 
          marketingResponse, 
          emailsResponse, 
          searchesResponse  // NEW: Property searches
        ] = await Promise.allSettled([
          fetch(`${baseUrl}/api/metrics/favorites-over-time?days=${daysInMonth}`, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`
            }
          }),
          fetch(`${baseUrl}/api/metrics/market-activity?days=${daysInMonth}`, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`
            }
          }),
          fetch(`${baseUrl}/api/metrics/analysis-over-time?days=${daysInMonth}`, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`
            }
          }),
          fetch(`${baseUrl}/api/metrics/lois-over-time?userId=${user.user_id}&timeRange=${daysInMonth}`, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`
            }
          }),
          fetch(`${baseUrl}/api/metrics/marketing-letters-over-time?userId=${user.user_id}&timeRange=${daysInMonth}`, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`
            }
          }),
          fetch(`${baseUrl}/api/metrics/emails-over-time?userId=${user.user_id}&timeRange=${daysInMonth}`, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`
            }
          }),
          // NEW: Fetch property searches data
          fetch(`${baseUrl}/api/metrics/property-searches-over-time?userId=${user.user_id}&timeRange=${daysInMonth}`, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`
            }
          })
        ]);

        // Parse responses and extract counts
        let propertiesFavoritedCount = 0;
        let marketActivityCount = 0;
        let analysesCreatedCount = 0;
        let loisCreatedCount = 0;
        let marketingLettersCount = 0;
        let emailsSentCount = 0;
        let propertySearchesCount = 0;  // NEW

        // Extract properties favorited count
        if (favoritesResponse.status === 'fulfilled' && favoritesResponse.value.ok) {
          const data = await favoritesResponse.value.json();
          propertiesFavoritedCount = data.chartData?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;
        }

        // Extract market activity count  
        if (marketResponse.status === 'fulfilled' && marketResponse.value.ok) {
          const data = await marketResponse.value.json();
          marketActivityCount = data.chartData?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;
        }

        // Extract analyses count
        if (analysesResponse.status === 'fulfilled' && analysesResponse.value.ok) {
          const data = await analysesResponse.value.json();
          analysesCreatedCount = data.chartData?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;
        }

        // Extract LOIs count
        if (loisResponse.status === 'fulfilled' && loisResponse.value.ok) {
          const data = await loisResponse.value.json();
          loisCreatedCount = Array.isArray(data) ? data.reduce((sum, item) => sum + (item.count || 0), 0) : 0;
        }

        // Extract marketing letters count
        if (marketingResponse.status === 'fulfilled' && marketingResponse.value.ok) {
          const data = await marketingResponse.value.json();
          marketingLettersCount = Array.isArray(data) ? data.reduce((sum, item) => sum + (item.count || 0), 0) : 0;
        }

        // Extract emails count
        if (emailsResponse.status === 'fulfilled' && emailsResponse.value.ok) {
          const data = await emailsResponse.value.json();
          emailsSentCount = Array.isArray(data) ? data.reduce((sum, item) => sum + (item.count || 0), 0) : 0;
        }

        // NEW: Extract property searches count
        if (searchesResponse.status === 'fulfilled' && searchesResponse.value.ok) {
          const data = await searchesResponse.value.json();
          propertySearchesCount = Array.isArray(data) ? data.reduce((sum, item) => sum + (item.count || 0), 0) : 0;
        }

        // Prepare webhook payload - NOW INCLUDING PROPERTY SEARCHES
        const reportData = {
          user_email: user.email,
          user_id: user.user_id,
          report_month: currentMonth,
          properties_favorited_count: propertiesFavoritedCount,
          market_activity_count: marketActivityCount,
          analyses_created_count: analysesCreatedCount,
          lois_created_count: loisCreatedCount,
          marketing_letters_created_count: marketingLettersCount,
          emails_sent_count: emailsSentCount,
          property_searches_count: propertySearchesCount,  // NEW FIELD
          user_class: user.user_class
        };

        // Send to Zapier webhook
        const webhookResponse = await fetch(monthlyReportWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reportData)
        });

        if (webhookResponse.ok) {
          console.log(`Successfully sent report for ${user.email}`);
          successCount++;
        } else {
          console.error(`Webhook failed for ${user.email}:`, await webhookResponse.text());
          errorCount++;
        }

      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError);
        errorCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Monthly activity reports completed',
      processed: filteredUsers.length,
      successful: successCount,
      errors: errorCount,
      reportMonth: currentMonth
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Error generating monthly activity reports:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});