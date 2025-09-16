import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export async function POST(request: NextRequest) {
  try {
    const { email, affiliate_sale } = await request.json();
    
    if (!email || !affiliate_sale) {
      return NextResponse.json(
        { error: "Missing email or affiliate_sale flag" },
        { status: 400 }
      );
    }

    // Create Stripe customer for the affiliate signup
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        affiliate_sale: "true",
        source: "affiliate_landing"
      },
    });

    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Create Stripe Checkout session with Setup mode (just captures card)
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "setup",
      success_url: `${baseUrl}/signup?affiliate_customer=${customer.id}&email=${encodeURIComponent(email)}&auto_signup=true`,
      cancel_url: `${baseUrl}/affiliate-signup?error=cancelled`,
      payment_method_types: ["card"],
      custom_text: {
        submit: {
          message: "Start your Charlie Chat trial with this payment method on file. You won't be charged until you decide to continue after your trial period."
        }
      },
      metadata: {
        affiliate_sale: "true",
        customer_email: email,
      },
    });

    console.log("✅ Affiliate setup session created:", session.id);

    return NextResponse.json({
      url: session.url,
      customer_id: customer.id,
    });

  } catch (error) {
    console.error("❌ Affiliate setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}