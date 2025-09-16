//NEED TO REFACTOR FOR V2 RELEASE
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get the customer's default payment method
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer || customer.deleted) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get the customer's payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1, // Get the most recent/default one
    });

    if (paymentMethods.data.length === 0) {
      return NextResponse.json({
        success: true,
        hasPaymentMethod: false,
        message: 'No payment method on file'
      });
    }

    const paymentMethod = paymentMethods.data[0];
    const card = paymentMethod.card;

    if (!card) {
      return NextResponse.json({
        success: true,
        hasPaymentMethod: false,
        message: 'No card details available'
      });
    }

    return NextResponse.json({
      success: true,
      hasPaymentMethod: true,
      paymentMethod: {
        id: paymentMethod.id,
        last4: card.last4,
        brand: card.brand,
        expMonth: card.exp_month,
        expYear: card.exp_year,
        funding: card.funding, // debit, credit, etc.
      }
    });

  } catch (error: any) {
    console.error('Error fetching payment method:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch payment method information' 
      },
      { status: 500 }
    );
  }
}