import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// Helper function to get price ID from product and plan
function getPriceIdFromProduct(productId: string, plan: string): string {
  const priceMap: Record<string, Record<string, string>> = {
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT!]: {
      monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRICE!,
      annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRICE!,
    },
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRODUCT!]: {
      monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE!,
      annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE!,
    },
  };

  return priceMap[productId]?.[plan] || "";
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const supabase = createSupabaseAdminClient();

    // Verify the session and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("❌ Auth error:", userError);
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    // Get request body
    const { productId, plan } = await request.json();
    
    if (!productId || !plan) {
      return NextResponse.json(
        { error: "Missing productId or plan" },
        { status: 400 }
      );
    }

    // Get user profile and verify they're an affiliate user with stored payment method
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile error:", profileError);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Verify this is an affiliate user with stored payment method
    if (!profile.affiliate_sale || !profile.stripe_customer_id) {
      return NextResponse.json(
        { error: "Not authorized for affiliate checkout" },
        { status: 403 }
      );
    }

    // Get the price ID
    const priceId = getPriceIdFromProduct(productId, plan);
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid product or plan" },
        { status: 400 }
      );
    }

    // Get the stored payment method for this customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return NextResponse.json(
        { error: "No stored payment method found" },
        { status: 400 }
      );
    }

    // Create the subscription using stored payment method
    const subscription = await stripe.subscriptions.create({
      customer: profile.stripe_customer_id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethods.data[0].id,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        user_id: user.id,
        affiliate_sale: "true",
      },
    });

    console.log("✅ Affiliate subscription created:", subscription.id);

    // Update user profile to reflect active subscription
    await supabase
      .from("profiles")
      .update({
        user_class: "paid",
        credits: 250, // Reset credits for paid plan
      })
      .eq("user_id", user.id);

    // Create subscription record in database
    const now = new Date().toISOString();
    const periodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();

    await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        current_period_start: now,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        created_at: now,
        updated_at: now,
        metadata: {
          affiliate_sale: true,
          product_id: productId,
          plan: plan,
        }
      });

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      status: subscription.status,
    });

  } catch (error) {
    console.error("❌ Affiliate checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}