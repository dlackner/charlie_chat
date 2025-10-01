import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  email: string;
  user_class: string;
  created_at: string;
  trial_end_date?: string;
  property_count: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasResendKey: !!resendApiKey
    })
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current date for report
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Query for all users
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        user_id,
        email,
        user_class,
        created_at,
        trial_end_date
      `)
      .order('user_class', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Get property counts for each user
    const usersWithCounts = await Promise.all(
      (users || []).map(async (user) => {
        const { count } = await supabase
          .from('user_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)

        return {
          ...user,
          property_count: count || 0
        }
      })
    )

    // Calculate trial days for trial users (using created_at as trial start)
    const processedUsers = usersWithCounts.map(user => {
      let trialDays = 0
      if (user.user_class === 'trial' && user.created_at) {
        const trialStart = new Date(user.created_at)
        const diffTime = today.getTime() - trialStart.getTime()
        trialDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }
      return { ...user, trialDays }
    })

    // Categorize users
    const newTrialUsers = processedUsers.filter(user => 
      user.user_class === 'trial' && 
      user.created_at >= yesterdayStr + 'T00:00:00'
    )
    
    const existingCoreUsers = processedUsers.filter(user => user.user_class === 'core')
    const proUsers = processedUsers.filter(user => user.user_class === 'pro')
    const plusUsers = processedUsers.filter(user => user.user_class === 'plus')

    // Generate report content
    const reportDate = today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    let reportContent = `
    <h2>MultifamilyOS Daily Summary - ${reportDate}</h2>
    
    <h3>=== NEW TRIAL USERS (Last 24 Hours) ===</h3>
    `

    if (newTrialUsers.length === 0) {
      reportContent += `<p>No new trial users in the last 24 hours.</p>`
    } else {
      newTrialUsers.forEach(user => {
        const createdDate = new Date(user.created_at).toLocaleString('en-US')
        reportContent += `<p>${user.email} - Day ${user.trialDays} (Registered: ${createdDate})</p>`
      })
    }

    reportContent += `<h3>=== EXISTING CORE USERS ===</h3>`
    if (existingCoreUsers.length === 0) {
      reportContent += `<p>No core users.</p>`
    } else {
      existingCoreUsers.forEach(user => {
        reportContent += `<p>${user.email} - ${user.property_count} properties favorited</p>`
      })
    }

    reportContent += `<h3>=== PRO USERS ===</h3>`
    if (proUsers.length === 0) {
      reportContent += `<p>No pro users.</p>`
    } else {
      proUsers.forEach(user => {
        reportContent += `<p>${user.email} - ${user.property_count} properties favorited</p>`
      })
    }

    reportContent += `<h3>=== PLUS USERS ===</h3>`
    if (plusUsers.length === 0) {
      reportContent += `<p>No plus users.</p>`
    } else {
      plusUsers.forEach(user => {
        reportContent += `<p>${user.email} - ${user.property_count} properties favorited</p>`
      })
    }

    const totalUsers = newTrialUsers.length + existingCoreUsers.length + proUsers.length + plusUsers.length
    reportContent += `
    <hr>
    <p><strong>Total Users: ${totalUsers} (${newTrialUsers.length} new trial, ${existingCoreUsers.length} core, ${proUsers.length} pro, ${plusUsers.length} plus)</strong></p>
    `

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MultifamilyOS <onboarding@resend.dev>',
        to: ['dlackner@hotmail.com'],
        subject: `MultifamilyOS Daily Summary - ${reportDate}`,
        html: reportContent,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const emailResult = await emailResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily report sent successfully',
        emailId: emailResult.id,
        totalUsers,
        breakdown: {
          newTrial: newTrialUsers.length,
          core: existingCoreUsers.length, 
          pro: proUsers.length,
          plus: plusUsers.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error generating daily report:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})