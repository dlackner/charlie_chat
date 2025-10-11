/*
 * MFOS - Stripe Session Verification API
 * Verifies that a Stripe checkout session is valid and completed
 * Does not update subscriptions - that's handled by webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product']
    });

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: 'Payment not completed'
      }, { status: 400 });
    }

    // Get plan name from the product
    let planName = 'Plan';
    if (session.line_items?.data?.[0]?.price?.product) {
      const product = session.line_items.data[0].price.product as Stripe.Product;
      planName = product.name;
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      paymentStatus: session.payment_status,
      planName,
      mode: session.mode
    });

  } catch (error) {
    console.error('Error verifying Stripe session:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        success: false,
        error: `Stripe error: ${error.message}`
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}