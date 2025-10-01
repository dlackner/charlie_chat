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
  customer_days: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Simple test to see if function is running
  console.log('Function started at:', new Date().toISOString())

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_EMAIL_API_KEY')!
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasResendKey: !!resendApiKey,
      resendKeyPrefix: resendApiKey?.substring(0, 10) + '...',
      resendKeyLength: resendApiKey?.length
    })
    
    if (!resendApiKey) {
      throw new Error('RESEND_EMAIL_API_KEY environment variable is not set')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current date for report
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Query for all users with auth data
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

    // Get auth data for last sign in times using auth admin with pagination
    let authMap = new Map()
    try {
      let page = 1
      let allAuthUsers = []
      let hasMore = true
      
      while (hasMore) {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
          page,
          perPage: 1000
        })
        
        if (authError) {
          console.log('Auth query error:', authError)
          break
        }
        
        if (authUsers?.users && authUsers.users.length > 0) {
          allAuthUsers.push(...authUsers.users)
          page++
          hasMore = authUsers.users.length === 1000 // Continue if we got full page
        } else {
          hasMore = false
        }
      }
      
      console.log('Auth users query result:', { totalUsers: allAuthUsers.length })
      
      allAuthUsers.forEach(authUser => {
        authMap.set(authUser.id, authUser.last_sign_in_at)
      })
      console.log('Auth map size:', authMap.size)
      
    } catch (authErr) {
      console.log('Auth query error:', authErr)
      // Continue without auth data if it fails
    }

    // Get property counts for each user
    const usersWithCounts = await Promise.all(
      (users || []).map(async (user) => {
        const { count } = await supabase
          .from('user_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)

        const lastSignIn = authMap.get(user.user_id)
        console.log('User mapping:', { email: user.email, user_id: user.user_id, lastSignIn, hasInMap: authMap.has(user.user_id) })
        return {
          ...user,
          property_count: count || 0,
          last_sign_in_at: lastSignIn
        }
      })
    )

    // Calculate customer days and trial days for all users
    const processedUsers = usersWithCounts.map(user => {
      let trialDays = 0
      let customerDays = 0
      
      if (user.created_at) {
        const createdDate = new Date(user.created_at)
        const diffTime = today.getTime() - createdDate.getTime()
        customerDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        // For trial users, trial days = customer days
        if (user.user_class === 'trial') {
          trialDays = customerDays
        }
      }
      
      return { ...user, trialDays, customer_days: customerDays }
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

    const totalUsers = newTrialUsers.length + existingCoreUsers.length + proUsers.length + plusUsers.length
    
    let reportContent = `
    <h2>MultifamilyOS Daily Summary - ${reportDate}</h2>
    
    <div style="background-color: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
      <h3>📊 DAILY TOTALS</h3>
      <p><strong>Total Users: ${totalUsers}</strong></p>
      <ul>
        <li>${newTrialUsers.length} New Trial Users (Last 24 Hours)</li>
        <li>${existingCoreUsers.length} Core Users</li>
        <li>${proUsers.length} Pro Users</li>
        <li>${plusUsers.length} Plus Users</li>
      </ul>
    </div>
    
    <h3>=== NEW TRIAL USERS (Last 24 Hours) ===</h3>
    `

    if (newTrialUsers.length === 0) {
      reportContent += `<p>No new trial users in the last 24 hours.</p>`
    } else {
      newTrialUsers.forEach(user => {
        const createdDate = new Date(user.created_at).toLocaleString('en-US')
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-US') : 'Never'
        reportContent += `<p>${user.email} - Day ${user.trialDays} (Registered: ${createdDate}, Last Sign In: ${lastSignIn})</p>`
      })
    }

    reportContent += `<h3>=== EXISTING CORE USERS ===</h3>`
    if (existingCoreUsers.length === 0) {
      reportContent += `<p>No core users.</p>`
    } else {
      existingCoreUsers.forEach(user => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-US') : 'Never'
        reportContent += `<p>${user.email} - ${user.property_count} properties favorited (${user.customer_days} days as customer, Last Sign In: ${lastSignIn})</p>`
      })
    }

    reportContent += `<h3>=== PRO USERS ===</h3>`
    if (proUsers.length === 0) {
      reportContent += `<p>No pro users.</p>`
    } else {
      proUsers.forEach(user => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-US') : 'Never'
        reportContent += `<p>${user.email} - ${user.property_count} properties favorited (${user.customer_days} days as customer, Last Sign In: ${lastSignIn})</p>`
      })
    }

    reportContent += `<h3>=== PLUS USERS ===</h3>`
    if (plusUsers.length === 0) {
      reportContent += `<p>No plus users.</p>`
    } else {
      plusUsers.forEach(user => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-US') : 'Never'
        reportContent += `<p>${user.email} - ${user.property_count} properties favorited (${user.customer_days} days as customer, Last Sign In: ${lastSignIn})</p>`
      })
    }

    // Send email using Resend
    const emailPayload = {
      from: 'MultifamilyOS <onboarding@resend.dev>',
      to: ['help.charliechat@gmail.com'],
      subject: `MultifamilyOS Daily Summary - ${reportDate}`,
      html: reportContent,
    }
    
    console.log('Email payload:', emailPayload)
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    console.log('Email response status:', emailResponse.status)
    console.log('Email response headers:', Object.fromEntries(emailResponse.headers.entries()))
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.log('Email error response:', errorText)
      console.log('Resend API key being used:', resendApiKey?.substring(0, 20) + '...')
      throw new Error(`Failed to send email (${emailResponse.status}): ${errorText}`)
    }

    const emailResult = await emailResponse.json()
    console.log('Email result:', emailResult)

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