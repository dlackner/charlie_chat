// This is part of the new V2 system

//supabase/functions/daily-digest/index.ts
// 
// DAILY SUMMARY AND USER MANAGEMENT FUNCTION
// =========================================
// 
// This function runs daily via cron job and performs the following tasks:
// 
// 1. USER MANAGEMENT:
//    - Finds trial users whose trial period + 0-day grace period has expired
//    - Automatically updates their user_class from 'trial' to 'core' (FREE ACCESS)
//    - Uses MAX_TRIAL_DAYS (7 days) + 0-day grace period for all users
// 
// 2. DAILY REPORTING:
//    - Generates comprehensive daily summary email with user activity
//    - Categorizes users: New Signups, Trial Users, Paid Users, Newly Converted Users
//    - Tracks user metrics: favorites, days on trial
//    - Excludes internal team emails from reporting
//    - Sends consolidated report to dlackner@hotmail.com
// 
// 3. TRIAL USER LIFECYCLE:
//    All users: trial (7 days) → grace period (0 days) → core (free).
//
// 4. USER CLASS MIGRATION:
//    System handles both legacy and new user classes during transition:
//    - charlie_chat → displays as 'core' 
//    - charlie_chat_plus → displays as 'plus'
//    - charlie_chat_pro → displays as 'pro'
//    - cohort → displays as 'cohort'
//    - trial → displays as 'trial'
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
    // Find trial users whose trial period has expired
    // MAX_TRIAL_DAYS (7) + 0-day grace period = 7 days total
    const maxTrialDays = parseInt(Deno.env.get('MAX_TRIAL_DAYS') || '7');
    const gracePeriodDays = 0;
    const totalDaysBeforeConvert = maxTrialDays + gracePeriodDays;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - totalDaysBeforeConvert);
    cutoffDate.setHours(23, 59, 59, 999); // End of day to be inclusive

    const { data: expiredTrialUsers, error: expiredError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, created_at')
      .eq('user_class', 'trial')
      .lt('created_at', cutoffDate.toISOString());

    if (expiredError) {
      console.error('Error fetching expired trial users:', expiredError);
    }

    console.log(`Found ${expiredTrialUsers?.length || 0} trial users past ${totalDaysBeforeConvert}-day conversion period (${maxTrialDays} trial + ${gracePeriodDays} grace)`);

    // Process expired trial users
    let convertedUserCount = 0;
    const convertedUsers = [];

    if (expiredTrialUsers?.length > 0) {
      for (const user of expiredTrialUsers) {
        try {
          await convertTrialToCoreUser(supabaseClient, user);
          convertedUserCount++;
          convertedUsers.push(user);
          console.log(`✅ Converted trial user to core: ${user.email}`);
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
      'dan@folkdot.com',
      'charles@dacc.law'
    ];

    // Get ALL users from the database
    const { data: allUsers, error: allUsersError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, user_class, created_at')
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
      'User Class': user.user_class,
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
      gracePeriodDays: gracePeriodDays,
      totalDaysBeforeConvert: totalDaysBeforeConvert
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
async function convertTrialToCoreUser(supabaseClient, user) {
  const { error: updateError } = await supabaseClient
    .from('profiles')
    .update({
      user_class: 'core',
      trial_end_date: new Date().toISOString()
    })
    .eq('user_id', user.user_id);
    
  if (updateError) {
    throw new Error(`Failed to convert trial user to core: ${updateError.message}`);
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
  const subject = `MultifamilyOS.ai Daily Summary - ${dateStr}`;

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
  // Helper function to normalize user class names for display
  const normalizeUserClass = (userClass) => {
    switch (userClass) {
      case 'charlie_chat': return 'core';
      case 'charlie_chat_plus': return 'plus';
      case 'charlie_chat_pro': return 'pro';
      case 'trial': return 'trial';
      case 'cohort': return 'cohort';
      case 'core': return 'core';
      case 'plus': return 'plus';
      case 'pro': return 'pro';
      default: return userClass || 'unknown';
    }
  };

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
    <h2>MultifamilyOS.ai Daily Summary - ${dateStr}</h2>
    <p><strong>Total users with activity: ${data?.length || 0}</strong></p>
  `;

  // Add converted users summary if any
  if (convertedUsers?.length > 0) {
    html += `<p><strong>🆓 Users automatically converted to Core today: ${convertedUsers.length}</strong></p>`;
  }

  html += '<hr>';

  if (!data || data.length === 0) {
    html += '<p>No activity yesterday.</p>';
  } else {
    const newUsers = data.filter(d => d['New User Signup']);
    const trialUsers = data.filter(d => !d['New User Signup'] && d['User Tier'] === 'trial');
    const coreUsers = data.filter(d => !d['New User Signup'] && (d['User Tier'] === 'core' || d['User Tier'] === 'charlie_chat'));
    const paidUsers = data.filter(d => [
      'pro', 'charlie_chat_pro',
      'plus', 'charlie_chat_plus', 
      'cohort'
    ].includes(d['User Tier']));

    // New Users Section
    if (newUsers.length > 0) {
      html += `<h3>🆕 New Users (${newUsers.length})</h3><ul>`;
      newUsers.forEach(user => {
        const displayTier = normalizeUserClass(user['User Tier']);
        html += `<li><strong>${user['Email Address']}</strong> - ${displayTier}`;
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
        const displayTier = normalizeUserClass(user['User Tier']);
        html += `<li><strong>${user['Email Address']}</strong> - ${displayTier}`;
        html += ` - ⭐ ${user['Properties Favorited']} properties favorited`;
        html += formatDaysSinceSignup(user['created_at']);
        html += `</li>`;
      });
      html += '</ul>';
    }

    // Core Users Section (free tier)
    if (coreUsers.length > 0) {
      html += `<h3>🆓 Core Users (${coreUsers.length})</h3><ul>`;
      coreUsers.forEach(user => {
        const displayTier = normalizeUserClass(user['User Tier']);
        html += `<li><strong>${user['Email Address']}</strong> - ${displayTier}`;
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
        const displayTier = normalizeUserClass(user['User Tier']);
        html += `<li><strong>${user['Email Address']}</strong> - ${displayTier}`;
        html += ` - ⭐ ${user['Properties Favorited']} properties favorited`;
        html += formatDaysSinceSignup(user['created_at'], 'paid');
        html += `</li>`;
      });
      html += '</ul>';
    }
  }

  // Newly Converted Users Section
  if (convertedUsers?.length > 0) {
    html += `<h3>🆓 Newly Converted to Core (${convertedUsers.length})</h3><ul>`;
    convertedUsers.forEach(user => {
      html += `<li><strong>${user.email}</strong> - Trial expired, automatically converted to core (free tier)</li>`;
    });
    html += '</ul>';
  }

  html += `<hr><p><em>Generated automatically by MultifamilyOS.ai daily reporting system</em></p>`;
  html += `<p><em>User Classes: trial → core → plus → pro | cohort (special access)</em></p>`;
  html += `<p><em>Legacy classes (charlie_chat*) display as new names but work during transition</em></p>`;
  
  return html;
}