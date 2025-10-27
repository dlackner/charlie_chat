import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { first_name, last_name, email, phone, source, lead_type, page_url, timestamp } = body;

    // Validate required fields
    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json(
        { error: 'All fields are required: first_name, last_name, email, phone' },
        { status: 400 }
      );
    }

    // Prepare webhook payload for Kajabi
    const webhookPayload = {
      first_name,
      last_name,
      email,
      phone,
      source: source || 'Capital Club',
      lead_type: lead_type || 'capital_club_investor',
      page_url: page_url || '/capital-club',
      timestamp: timestamp || new Date().toISOString()
    };

    // TODO: Replace with your actual Zapier webhook URL
    const ZAPIER_WEBHOOK_URL = process.env.CAPITAL_CLUB_ZAPIER_WEBHOOK_URL || 'YOUR_ZAPIER_WEBHOOK_URL_HERE';

    // Send data to Zapier webhook (which will forward to Kajabi)
    if (ZAPIER_WEBHOOK_URL && ZAPIER_WEBHOOK_URL !== 'YOUR_ZAPIER_WEBHOOK_URL_HERE') {
      const webhookResponse = await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        console.error('Webhook failed:', await webhookResponse.text());
        return NextResponse.json(
          { error: 'Failed to send data to webhook' },
          { status: 500 }
        );
      }
    } else {
      console.log('Webhook URL not configured, would send:', webhookPayload);
    }

    // Return success with redirect URL
    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully',
      redirectUrl: 'https://www.fractional.app/p/MultifamilyOSclub'
    });

  } catch (error) {
    console.error('Error in capital-club-signup API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}