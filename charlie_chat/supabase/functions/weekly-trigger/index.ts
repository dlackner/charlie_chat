// Supabase Edge Function for Weekly Recommendations Trigger
// This function processes all eligible users for weekly recommendations

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to get current week start date
function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

interface ProcessingResult {
  success: boolean;
  userId: string;
  userEmail: string;
  message: string;
  skipped: boolean;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🚀 Weekly trigger started at:', new Date().toISOString());
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('🚀 Weekly trigger started');
    
    const currentWeekStart = getWeekStart(new Date());
    
    // Step 1: Create a weekly run log entry
    const runId = crypto.randomUUID();
    const { error: runStartError } = await supabase
      .from('weekly_recommendation_runs')
      .insert({
        id: runId,
        week_start: currentWeekStart,
        triggered_at: new Date().toISOString(),
        users_processed: 0,
        total_recommendations: 0,
        completion_status: 'running'
      });

    if (runStartError) {
      console.error('Error creating run log:', runStartError);
    }

    // Step 2: Get all users with weekly recommendations enabled
    const { data: profiles, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('weekly_recommendations_enabled', true);

    if (usersError) {
      throw new Error(`Failed to fetch eligible users: ${usersError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      // Update run log and return early
      await supabase
        .from('weekly_recommendation_runs')
        .update({
          users_processed: 0,
          total_recommendations: 0,
          completion_status: 'completed',
          processing_time_ms: Date.now() - startTime
        })
        .eq('id', runId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No eligible users found for weekly recommendations',
          usersProcessed: 0,
          totalRecommendations: 0,
          runId,
          processingTimeMs: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get users who have markets configured
    const userIds = profiles.map(p => p.user_id);
    const { data: userMarkets, error: marketsError } = await supabase
      .from('user_markets')
      .select('user_id')
      .in('user_id', userIds);

    if (marketsError) {
      throw new Error(`Failed to fetch user markets: ${marketsError.message}`);
    }

    // Only include users who have markets configured
    const usersWithMarkets = new Set(userMarkets?.map(m => m.user_id) || []);
    const eligibleUsers = profiles.filter(profile => usersWithMarkets.has(profile.user_id));

    console.log(`📋 Found ${eligibleUsers?.length || 0} users with weekly recommendations enabled`);

    if (!eligibleUsers || eligibleUsers.length === 0) {
      // Update run log
      await supabase
        .from('weekly_recommendation_runs')
        .update({
          users_processed: 0,
          total_recommendations: 0,
          completion_status: 'completed',
          processing_time_ms: Date.now() - startTime
        })
        .eq('id', runId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No eligible users found for weekly recommendations',
          usersProcessed: 0,
          totalRecommendations: 0,
          runId,
          processingTimeMs: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Process each eligible user
    const results: ProcessingResult[] = [];
    let totalRecommendations = 0;

    for (const profile of eligibleUsers) {
      const userId = profile.user_id;
      const userEmail = profile.email || 'unknown@email.com';
      
      console.log(`👤 Processing user: ${userEmail} (${userId})`);

      try {
        // Check for unprocessed recommendations from previous week
        const { data: unprocessedRecs } = await supabase
          .from('user_favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('recommendation_type', 'algorithm')
          .eq('status', 'pending')
          .lt('generated_at', currentWeekStart)
          .limit(1);

        if (unprocessedRecs && unprocessedRecs.length > 0) {
          results.push({
            success: false,
            userId,
            userEmail,
            message: 'Previous week recommendations need to be processed first',
            skipped: true
          });
          continue;
        }

        // Check if current week's pending recommendations already exist
        const { data: currentWeekRecs } = await supabase
          .from('user_favorites')
          .select('id, recommendation_batch_id')
          .eq('user_id', userId)
          .eq('recommendation_type', 'algorithm')
          .eq('status', 'pending')
          .gte('generated_at', currentWeekStart)
          .limit(1);

        if (currentWeekRecs && currentWeekRecs.length > 0) {
          results.push({
            success: true,
            userId,
            userEmail,
            message: 'Current week pending recommendations already exist',
            skipped: true
          });
          continue;
        }

        console.log(`🎯 Generating recommendations for ${userEmail}`);

        // Call the weekly recommendations API
        const appUrl = Deno.env.get('APP_URL') || 'https://multifamilyos.ai';
        
        const response = await fetch(`${appUrl}/api/weekly-recommendations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ forceRefresh: false }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const recommendationCount = result.metadata?.totalProperties || 0;
          totalRecommendations += recommendationCount;
          
          results.push({
            success: true,
            userId,
            userEmail,
            message: `Generated ${recommendationCount} recommendations successfully`,
            skipped: false
          });

          console.log(`✅ Generated ${recommendationCount} recommendations for ${userEmail}`);
        } else {
          results.push({
            success: false,
            userId,
            userEmail,
            message: result.error || 'Failed to generate recommendations',
            skipped: false,
            error: result.error
          });

          console.error(`❌ Failed to generate recommendations for ${userEmail}:`, result.error);
        }

      } catch (userError) {
        results.push({
          success: false,
          userId,
          userEmail,
          message: 'Error processing user',
          skipped: false,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });

        console.error(`❌ Error processing user ${userEmail}:`, userError);
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 4: Update the run log with final results
    const successfulUsers = results.filter(r => r.success && !r.skipped).length;
    const skippedUsers = results.filter(r => r.skipped).length;
    const failedUsers = results.filter(r => !r.success && !r.skipped).length;

    await supabase
      .from('weekly_recommendation_runs')
      .update({
        users_processed: successfulUsers,
        total_recommendations: totalRecommendations,
        completion_status: failedUsers > 0 ? 'completed_with_errors' : 'completed',
        processing_time_ms: Date.now() - startTime,
        error_details: failedUsers > 0 ? 
          `${failedUsers} users failed, ${skippedUsers} users skipped` : null
      })
      .eq('id', runId);

    console.log(`🏁 Weekly trigger completed: ${successfulUsers} processed, ${totalRecommendations} recommendations generated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Weekly recommendations completed successfully`,
        runId,
        usersProcessed: successfulUsers,
        usersSkipped: skippedUsers,
        usersFailed: failedUsers,
        totalRecommendations,
        processingTimeMs: Date.now() - startTime,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🔥 Weekly trigger error:', error);
    
    // Try to log the error
    try {
      const currentWeekStart = getWeekStart(new Date());
      await supabase
        .from('weekly_recommendation_runs')
        .insert({
          week_start: currentWeekStart,
          triggered_at: new Date().toISOString(),
          users_processed: 0,
          total_recommendations: 0,
          completion_status: 'failed',
          error_details: error instanceof Error ? error.message : 'Unknown error',
          processing_time_ms: Date.now() - startTime
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Weekly trigger failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});