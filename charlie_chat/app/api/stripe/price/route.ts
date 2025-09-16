//LIKELY NEED TO REFACTOR FOR V2 RELEASE
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const priceId = searchParams.get('priceId');

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Fetch the price from Stripe
    const price = await stripe.prices.retrieve(priceId);

    return NextResponse.json({
      success: true,
      amount: price.unit_amount ? price.unit_amount / 100 : 0, // Convert cents to dollars
      currency: price.currency,
      interval: price.recurring?.interval || null,
      interval_count: price.recurring?.interval_count || null,
    });

  } catch (error: any) {
    console.error('Error fetching Stripe price:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch price information' 
      },
      { status: 500 }
    );
  }
}