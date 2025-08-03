// Supabase Edge Function for Weekly Recommendations Trigger
// This replaces the problematic database HTTP extension approach

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Weekly recommendations Edge Function triggered')

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all users with weekly recommendations enabled
    const { data: users, error: usersError } = await supabase
      .from('user_buy_box_preferences')
      .select(`
        user_id,
        weekly_recommendations_enabled,
        auth.users!inner(id, email)
      `)
      .eq('weekly_recommendations_enabled', true)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: usersError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${users?.length || 0} users with weekly recommendations enabled`)

    const results = []
    let successCount = 0
    let errorCount = 0

    // Process each user
    for (const userRecord of users || []) {
      const user = userRecord.users
      if (!user?.email) continue

      try {
        console.log(`👤 Processing user: ${user.email} (${user.id})`)

        // Call the weekly recommendations API
        const apiResponse = await fetch(`${appUrl}/api/weekly-recommendations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'x-user-id': user.id,
          },
          body: JSON.stringify({}),
        })

        const responseData = await apiResponse.json()

        if (apiResponse.ok) {
          successCount++
          results.push({
            email: user.email,
            status: 'SUCCESS',
            message: 'Recommendations generated successfully'
          })
          console.log(`✅ SUCCESS: ${user.email}`)
        } else {
          errorCount++
          results.push({
            email: user.email,
            status: 'ERROR',
            message: `API returned ${apiResponse.status}: ${JSON.stringify(responseData)}`
          })
          console.log(`❌ ERROR: ${user.email} - ${apiResponse.status}`)
        }

      } catch (error) {
        errorCount++
        results.push({
          email: user.email,
          status: 'ERROR',
          message: `Exception: ${error.message}`
        })
        console.log(`💥 EXCEPTION: ${user.email} - ${error.message}`)
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Log summary to database
    try {
      await supabase
        .from('weekly_recommendations_log')
        .insert({
          triggered_at: new Date().toISOString(),
          success_count: successCount,
          error_count: errorCount,
          total_users: successCount + errorCount,
          notes: 'Triggered via Edge Function'
        })
    } catch (logError) {
      console.error('Failed to log results:', logError)
    }

    console.log(`🎯 Weekly recommendations completed. Success: ${successCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Weekly recommendations processing completed',
        summary: {
          totalUsers: successCount + errorCount,
          successCount,
          errorCount,
          results
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('🔥 Edge Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Edge Function failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})