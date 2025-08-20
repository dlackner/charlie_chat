// supabase/functions/daily-pro-welcome/index.ts
// 
// DAILY CHARLIE CHAT PRO WELCOME EMAIL FUNCTION
// ============================================
// 
// This function runs twice daily (8:00 AM and 5:00 PM) via cron job and:
// 1. Finds users who became Charlie Chat Pro in the last 12 hours
// 2. Sends welcome emails with Master Class Training access
// 3. Sends copy to dlackner@hotmail.com for monitoring
// 
// Uses charlie_chat_pro_start_date field to identify new Pro subscribers
// No need to track email sending - based purely on start date timing

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
    // FIND NEW PRO SUBSCRIBERS
    // ===========================================
    // Look for users who became Pro in the last 12 hours
    // (since we run twice daily, 12 hours ensures we don't miss anyone)
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const { data: newProUsers, error: proUsersError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, charlie_chat_pro_start_date')
      .eq('user_class', 'charlie_chat_pro')
      .not('charlie_chat_pro_start_date', 'is', null)
      .gte('charlie_chat_pro_start_date', twelveHoursAgo.toISOString());

    if (proUsersError) {
      console.error('Error fetching new Pro users:', proUsersError);
      throw proUsersError;
    }

    console.log(`Found ${newProUsers?.length || 0} new Charlie Chat Pro users in the last 12 hours`);

    // ===========================================
    // SEND WELCOME EMAILS
    // ===========================================
    let emailsSent = 0;
    const processedUsers = [];

    if (newProUsers?.length > 0) {
      for (const user of newProUsers) {
        try {
          const emailResult = await sendProWelcomeEmail(user.email);
          
          if (emailResult.success) {
            emailsSent++;
            processedUsers.push({
              email: user.email,
              startDate: user.charlie_chat_pro_start_date,
              emailSent: true
            });
            console.log(`✅ Welcome email sent to: ${user.email}`);
          } else {
            processedUsers.push({
              email: user.email,
              startDate: user.charlie_chat_pro_start_date,
              emailSent: false,
              error: emailResult.error
            });
            console.error(`❌ Failed to send welcome email to ${user.email}:`, emailResult.error);
          }
        } catch (error) {
          console.error(`❌ Error processing user ${user.email}:`, error);
          processedUsers.push({
            email: user.email,
            startDate: user.charlie_chat_pro_start_date,
            emailSent: false,
            error: error.message
          });
        }
      }

      // Send summary email to dlackner@hotmail.com
      await sendSummaryEmail(processedUsers, emailsSent);
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "Pro welcome emails processed",
      newProUsers: newProUsers?.length || 0,
      emailsSent: emailsSent,
      processedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in daily-pro-welcome function:', error);
    
    // Even on error, return 200 so cron job doesn't think it failed
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      processedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// ===========================================
// EMAIL FUNCTIONS
// ===========================================

async function sendProWelcomeEmail(email: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    return {
      success: false,
      error: 'RESEND_API_KEY not configured'
    };
  }

  const htmlBody = createWelcomeEmailHtml();
  const subject = 'Access Your Master Class Training Program';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Charles Dobens <onboarding@resend.dev>',
        to: email,
        cc: 'dlackner@hotmail.com', // Copy to you
        subject: subject,
        html: htmlBody
      })
    });

    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        emailId: result.id
      };
    } else {
      const error = await response.text();
      return {
        success: false,
        error
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function sendSummaryEmail(processedUsers: any[], emailsSent: number) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured for summary email');
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const dateStr = now.toISOString().split('T')[0];

  const htmlBody = createSummaryEmailHtml(processedUsers, emailsSent, dateStr, timeStr);
  const subject = `Pro Welcome Emails Summary - ${dateStr} ${timeStr}`;

  try {
    await fetch('https://api.resend.com/emails', {
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
  } catch (error) {
    console.error('Error sending summary email:', error);
  }
}

function createWelcomeEmailHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Charlie Chat Pro</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background-color: #f97316; 
          color: white; 
          padding: 20px; 
          border-radius: 8px 8px 0 0; 
          text-align: center; 
        }
        .content { 
          background-color: #ffffff; 
          padding: 30px; 
          border: 1px solid #e5e5e5; 
          border-radius: 0 0 8px 8px; 
        }
        .cta-button {
          display: inline-block;
          background-color: #f97316;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
        .signature {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          font-style: italic;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to Charlie Chat Pro!</h1>
      </div>
      
      <div class="content">
        <p><strong>Hi there,</strong></p>
        
        <p>Welcome to the Charlie Chat Pro family! I'm thrilled to have you on board and excited for your multifamily investing journey ahead.</p>
        
        <p><strong>Here's what you now have access to:</strong></p>
        
        <p><strong>Master Class Training Program</strong><br>
        Your complete roadmap for finding, funding, and closing profitable multifamily deals. Across 90+ lessons, you'll master everything from choosing the right markets to structuring irresistible offers, analyzing deals with precision, and navigating due diligence—all the way to closing. Whether you're new to multifamily or looking to scale your portfolio, this program gives you the tools, strategies, and confidence to build long-term wealth.</p>
        
        <p><strong>🎯 Ready to get started?</strong></p>
        
        <p><strong>Click the button below to register with UpCoach and access your training:</strong></p>
        
        <div style="text-align: center;">
          <a href="https://multifamilyos.upcoach.com/organizations/i/uVRsCSgq1fWVhQkCZGxMzupDAno7CkUTeEawZpxCxq8GRibMRf" class="cta-button">
            Access Your Master Class Training →
          </a>
        </div>
        
        <p><em>You'll receive a separate email shortly with details about our weekly Group Coaching calls where you can get direct guidance and connect with our community of investors.</em></p>
        
        <p>I'm here to support you every step of the way. Let's build something great together!</p>
        
        <div class="signature">
          <p>Charles Dobens<br>
          <em>The Multifamily Attorney</em><br>
          Founder, MultifamilyOS™</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Charlie Chat Pro | MultifamilyOS™</p>
      </div>
    </body>
    </html>
  `;
}

function createSummaryEmailHtml(processedUsers: any[], emailsSent: number, dateStr: string, timeStr: string): string {
  let html = `
    <h2>Pro Welcome Emails Summary - ${dateStr} ${timeStr}</h2>
    <p><strong>Total new Pro users found: ${processedUsers.length}</strong></p>
    <p><strong>Welcome emails sent successfully: ${emailsSent}</strong></p>
    <hr>
  `;

  if (processedUsers.length === 0) {
    html += '<p>No new Charlie Chat Pro subscribers found in the last 12 hours.</p>';
  } else {
    html += '<h3>📧 Pro Welcome Emails Processed</h3><ul>';
    
    processedUsers.forEach(user => {
      const startDate = new Date(user.startDate).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      if (user.emailSent) {
        html += `<li>✅ <strong>${user.email}</strong> - Pro since ${startDate} - Welcome email sent</li>`;
      } else {
        html += `<li>❌ <strong>${user.email}</strong> - Pro since ${startDate} - Failed: ${user.error}</li>`;
      }
    });
    
    html += '</ul>';
  }

  html += `<hr><p><em>Generated automatically by Charlie Chat Pro welcome system</em></p>`;
  html += `<p><em>Runs twice daily at 8:00 AM and 5:00 PM ET</em></p>`;
  
  return html;
}