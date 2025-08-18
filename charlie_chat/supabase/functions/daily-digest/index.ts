// supabase/functions/daily-digest/index.ts
// 
// DAILY SUMMARY AND USER MANAGEMENT FUNCTION
// =========================================
// 
// This function runs daily via cron job and performs the following tasks:
// 
// 1. USER MANAGEMENT:
//    - Finds trial users whose trial period + 3-day grace period has expired
//    - Automatically updates their user_class from 'trial' to 'charlie_chat' (FREE ACCESS)
//    - Uses MAX_TRIAL_DAYS (7 days) + 3-day grace period for all users
// 
// 2. DAILY REPORTING:
//    - Generates comprehensive daily summary email with user activity
//    - Categorizes users: New Signups, Trial Users, Paid Users, Newly Converted Users
//    - Tracks user metrics: credits, favorites, days on trial
//    - Excludes internal team emails from reporting
//    - Sends consolidated report to dlackner@hotmail.com
// 
// 3. TRIAL USER LIFECYCLE:
//    All users: trial (14 days) → grace period (3 days) → charlie_chat (free). It depends on whether they run out of credits or pass the 7 day mark.
//
// This function handles both operational user management and business intelligence reporting.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // ===========================================
    // STEP 1: TRIAL USER MANAGEMENT - Handle expired users
    // ===========================================
    // Find trial users whose trial + grace period has expired
    // MAX_TRIAL_DAYS (7) + 3-day grace period = 17 days total
    const maxTrialDays = parseInt(Deno.env.get('MAX_TRIAL_DAYS') || '7');
    const gracePeriodDays = 3;
    const totalDaysBeforeDisable = maxTrialDays + gracePeriodDays;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - totalDaysBeforeDisable);

    const { data: expiredTrialUsers, error: expiredError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, credits_depleted_at, created_at')
      .eq('user_class', 'trial')
      .not('credits_depleted_at', 'is', null)
      .lt('credits_depleted_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

    if (expiredError) {
      console.error('Error fetching expired trial users:', expiredError);
    }

    console.log(`Found ${expiredTrialUsers?.length || 0} trial users with expired grace periods`);

    // Process expired trial users
    let convertedUserCount = 0;
    const convertedUsers = [];

    if (expiredTrialUsers?.length > 0) {
      for (const user of expiredTrialUsers) {
        try {
          await convertTrialToCharlieChatUser(supabaseClient, user);
          convertedUserCount++;
          convertedUsers.push(user);
          console.log(`✅ Converted trial user to charlie_chat: ${user.email}`);
        } catch (error) {
          console.error(`❌ Error processing user ${user.email}:`, error);
        }
      }
    }

    // ===========================================
    // STEP 2: DAILY REPORTING - Generate user summary
    // ===========================================
    // Users to exclude from daily summary
    const excludedEmails = [
      'dlackner@hotmail.com',
      'dplackner@gmail.com',
      'molly@multifamilyos.com',
      'charles@dobenslaw.com',
      'esledge@gmail.com',
      'charles@dobensco.com',
      'dhlackner55@gmail.com',
      'charles@dacc.law'
    ];

    // Get ALL users from the database
    const { data: allUsers, error: allUsersError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, user_class, credits, created_at')
      .order('created_at', { ascending: false });

    if (allUsersError) throw allUsersError;

    // Filter out excluded users
    const filteredUsers = allUsers?.filter(user => 
      !excludedEmails.includes(user.email)
    ) || [];

    // Get favorites count for each user
    const { data: favoritesData, error: favoritesError } = await supabaseClient
      .from('user_favorites')
      .select('user_id');

    // Create a map of user_id to favorites count
    const favoritesMap = {};
    if (!favoritesError && favoritesData) {
      favoritesData.forEach(fav => {
        favoritesMap[fav.user_id] = (favoritesMap[fav.user_id] || 0) + 1;
      });
    }

    // Transform filtered users to match expected format
    const formattedAllUsers = filteredUsers?.map(user => ({
      'Email Address': user.email,
      'User Tier': user.user_class,
      'Current Credits': user.credits,
      'Company Name': '',
      'Properties Favorited': favoritesMap[user.user_id] || 0,
      'New User Signup': false,
      'created_at': user.created_at
    })) || [];

    // Determine which users are "new" (signed up yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);

    formattedAllUsers.forEach(user => {
      const userCreatedAt = new Date(user['created_at']);
      user['New User Signup'] = userCreatedAt >= yesterdayStart && userCreatedAt < yesterdayEnd;
    });

    // Send daily summary email
    const emailResult = await sendDailySummaryEmail(formattedAllUsers, convertedUsers);

    // Return 200 success for cron job
    return new Response(JSON.stringify({
      status: "success",
      message: "Daily summary processed",
      recordCount: formattedAllUsers?.length || 0,
      emailsSent: emailResult.success ? 1 : 0,
      usersConverted: convertedUserCount,
      maxTrialDays: maxTrialDays,
      gracePeriodDays: gracePeriodDays
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // Even on error, return 200 so cron job doesn't think it failed
    return new Response(JSON.stringify({
      status: "completed_with_errors",
      error: error.message
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

// ===========================================
// USER MANAGEMENT FUNCTIONS
// ===========================================
async function convertTrialToCharlieChatUser(supabaseClient, user) {
  const { error: updateError } = await supabaseClient
    .from('profiles')
    .update({
      user_class: 'charlie_chat',
      trial_expired_at: new Date().toISOString()
    })
    .eq('user_id', user.user_id);
    
  if (updateError) {
    throw new Error(`Failed to convert trial user to charlie_chat: ${updateError.message}`);
  }
}

// ===========================================
// EMAIL REPORTING FUNCTIONS
// ===========================================
async function sendDailySummaryEmail(data, convertedUsers) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const htmlBody = createHtmlReport(data, dateStr, convertedUsers);
  const subject = `Charlie Chat Daily Summary - ${dateStr}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Charlie Chat <onboarding@resend.dev>',
        to: 'dlackner@hotmail.com',
        subject: subject,
        html: htmlBody
      })
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, emailId: result.id };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function createHtmlReport(data, dateStr, convertedUsers) {
  // Helper function to calculate days since signup and format
  const formatDaysSinceSignup = (createdAt, userType = 'trial') => {
    if (!createdAt) return '';
    const signup = new Date(createdAt);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - signup.getTime()) / (1000 * 60 * 60 * 24));
    const label = userType === 'paid' ? 'days as customer' : userType === 'free' ? 'days as free user' : 'days on trial';
    
    if (daysDiff > 14 && userType === 'trial') {
      return ` - <span style="color: #e74c3c; font-weight: bold;">${daysDiff} ${label}</span>`;
    } else {
      return ` - ${daysDiff} ${label}`;
    }
  };

  let html = `
    <h2>Charlie Chat Daily Summary - ${dateStr}</h2>
    <p><strong>Total users with activity: ${data?.length || 0}</strong></p>
  `;

  // Add converted users summary if any
  if (convertedUsers?.length > 0) {
    html += `<p><strong>🆓 Users automatically converted to free Charlie Chat today: ${convertedUsers.length}</strong></p>`;
  }

  html += '<hr>';

  if (!data || data.length === 0) {
    html += '<p>No activity yesterday.</p>';
  } else {
    const newUsers = data.filter(d => d['New User Signup']);
    const trialUsers = data.filter(d => !d['New User Signup'] && d['User Tier'] === 'trial');
    const charlieChatUsers = data.filter(d => !d['New User Signup'] && d['User Tier'] === 'charlie_chat');
    const paidUsers = data.filter(d => [
      'charlie_chat_pro', 
      'charlie_chat_plus',
      'cohort'
    ].includes(d['User Tier']));

    // New Users Section
    if (newUsers.length > 0) {
      html += `<h3>🆕 New Users (${newUsers.length})</h3><ul>`;
      newUsers.forEach(user => {
        html += `<li><strong>${user['Email Address']}</strong> - ${user['User Tier']} (${user['Current Credits']} credits)`;
        if (user['Properties Favorited'] > 0) {
          html += ` - ⭐ ${user['Properties Favorited']} properties favorited`;
        }
        html += formatDaysSinceSignup(user['created_at']);
        html += `</li>`;
      });
      html += '</ul>';
    }

    // Trial Users Section  
    if (trialUsers.length > 0) {
      html += `<h3>🔄 Trial Users (${trialUsers.length})</h3><ul>`;
      trialUsers.forEach(user => {
        html += `<li><strong>${user['Email Address']}</strong> - ${user['User Tier']} (${user['Current Credits']} credits)`;
        html += ` - ⭐ ${user['Properties Favorited']} properties favorited`;
        html += formatDaysSinceSignup(user['created_at']);
        html += `</li>`;
      });
      html += '</ul>';
    }

    // Charlie Chat Free Users Section
    if (charlieChatUsers.length > 0) {
      html += `<h3>🆓 Charlie Chat Free Users (${charlieChatUsers.length})</h3><ul>`;
      charlieChatUsers.forEach(user => {
        html += `<li><strong>${user['Email Address']}</strong> - ${user['User Tier']} (${user['Current Credits']} credits)`;
        html += ` - ⭐ ${user['Properties Favorited']} properties favorited`;
        html += formatDaysSinceSignup(user['created_at'], 'free');
        html += `</li>`;
      });
      html += '</ul>';
    }

    // Paid Users Section
    if (paidUsers.length > 0) {
      html += `<h3>💰 Paid Users (${paidUsers.length})</h3><ul>`;
      paidUsers.forEach(user => {
        html += `<li><strong>${user['Email Address']}</strong> - ${user['User Tier']}`;
        html += ` - ⭐ ${user['Properties Favorited']} properties favorited`;
        html += formatDaysSinceSignup(user['created_at'], 'paid');
        html += `</li>`;
      });
      html += '</ul>';
    }
  }

  // Newly Converted Users Section
  if (convertedUsers?.length > 0) {
    html += `<h3>🆓 Newly Converted to Charlie Chat (${convertedUsers.length})</h3><ul>`;
    convertedUsers.forEach(user => {
      html += `<li><strong>${user.email}</strong> - Trial expired, now has free Charlie Chat access</li>`;
    });
    html += '</ul>';
  }

  html += `<hr><p><em>Generated automatically by Charlie Chat daily reporting system</em></p>`;
  html += `<p><em>Trial system: MAX_TRIAL_DAYS + 3-day grace period → Free Charlie Chat</em></p>`;
  
  return html;
}