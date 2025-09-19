/*
 * CHARLIE2 V2 - Contact Form Edge Function
 * Handles customer support and help requests from V2 application
 * Routes messages to administrative email for customer service
 * Part of the new V2 application architecture
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { message, userEmail } = await req.json();
    
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Send email using Resend (same setup as your daily summary)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MultifamilyOS Support <onboarding@resend.dev>',
        to: 'dlackner@hotmail.com', // Your email
        subject: 'New Contact Form Message - MultifamilyOS',
        html: `
          <h3>New message from MultifamilyOS chat widget</h3>
          <p><strong>From:</strong> ${userEmail || 'Anonymous user'}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <hr>
          <p><em>Sent from MultifamilyOS chat widget</em></p>
        `
      })
    });

    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } else {
      throw new Error('Failed to send email');
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});