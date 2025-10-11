/*
 * CHARLIE2 V2 - Stripe Checkout Session Creation API
 * Handles payment processing for subscription plans only
 * Creates Stripe checkout sessions with proper metadata for webhook processing
 * Part of the new V2 application architecture
 */

import Stripe from "stripe";
import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const productPricing: Record<
  string,
  { monthly?: string; annual?: string; mode: "subscription" | "payment" }
> = {
  // MULTIFAMILYOS PRODUCTS
  // MultiFamilyOS Plus Monthly Product
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // MultiFamilyOS Plus Annual Product
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // MultiFamilyOS Pro Monthly Product
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // MultiFamilyOS Pro Annual Product
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // MultiFamilyOS Cohort Monthly Product
  [process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // MultiFamilyOS Cohort Annual Product
  [process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_ANNUAL_PRICE!,
    mode: "subscription",
  },
};

// V2: Subscription-only model

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), { status: 401 });
    }

    // Verify the user with the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const userId = user.id;
    console.log("🔍 DEBUG: User ID for checkout:", userId);

    // Handle subscription purchases only
    const body = await req.json();
    const { productId, plan }: { productId: string; plan: "monthly" | "annual" } = body;

    const product = productPricing[productId];
    if (!product) {
      console.error("❌ Invalid product ID:", productId);
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const priceId = product[plan];
    if (!priceId) {
      console.error("❌ No price ID found for plan:", plan);
      return new Response(
        JSON.stringify({ error: "No price found for selected plan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: product.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}`,
      metadata: {
        userId,
        productId,
        plan,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("🔥 Stripe Checkout Error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Unexpected error",
        details: error,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}