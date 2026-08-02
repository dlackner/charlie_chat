/*
 * Stripe Checkout Session Creation API
 * Handles payment processing for subscription plans only
 * Creates Stripe checkout sessions with proper metadata for webhook processing
 * Routes Plus users to NEW Stripe account, Pro to OLD (existing) Stripe account
 *
 * MIGRATION NOTE (July 2026): Plus products are being migrated to a new Stripe account.
 * - NEW Plus products (with _NEW suffix) → NEW Stripe account (v3 webhook)
 * - OLD Plus products (no _NEW suffix) → OLD Stripe account (v2 webhook) [TEMPORARY]
 * Once all old Plus subscriptions are upgraded/migrated, remove old Plus mappings below.
 */

import Stripe from "stripe";
import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Product type mapping: identify Plus vs Pro
const productToType: Record<string, "plus" | "pro"> = {
  // NEW Plus products → NEW Stripe account
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRODUCT_NEW!]: "plus",
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRODUCT_NEW!]: "plus",
  // OLD Plus products → OLD Stripe account (TEMPORARY - migration in progress)
  // TODO: Remove once all old Plus subscriptions have been migrated to new account
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRODUCT!]: "pro",
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRODUCT!]: "pro",
  // Pro products → OLD Stripe account (existing)
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRODUCT!]: "pro",
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRODUCT!]: "pro",
};

// OLD Stripe Account (Pro products)
const oldStripeProductPricing: Record<
  string,
  { monthly?: string; annual?: string; mode: "subscription" | "payment" }
> = {
  // MultiFamilyOS Plus (OLD - legacy subscribers)
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE!,
    mode: "subscription",
  },
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // MultiFamilyOS Pro
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRICE!,
    mode: "subscription",
  },
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRICE!,
    mode: "subscription",
  },
};

// NEW Stripe Account (Plus products only)
const newStripeProductPricing: Record<
  string,
  { monthly?: string; annual?: string; mode: "subscription" | "payment" }
> = {
  // MultiFamilyOS Plus
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRODUCT_NEW!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE_NEW!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE_NEW!,
    mode: "subscription",
  },
  [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRODUCT_NEW!]: {
    monthly: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE_NEW!,
    annual: process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE_NEW!,
    mode: "subscription",
  },
};

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
    console.log("🔍 User ID for checkout:", userId);

    // Handle subscription purchases only
    const body = await req.json();
    const { productId, plan }: { productId: string; plan: "monthly" | "annual" } = body;

    // Determine product type and select appropriate Stripe instance
    const productType = productToType[productId];
    if (!productType) {
      console.error("❌ Invalid product ID:", productId);
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📦 Product type: ${productType} → ${productType === "plus" ? "NEW Stripe account" : "OLD Stripe account"}`);

    // Initialize Stripe instance based on product type
    const stripeKey = productType === "plus" ? process.env.STRIPE_NEW_SECRET_KEY : process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("❌ Missing Stripe API key for:", productType);
      return new Response(
        JSON.stringify({ error: "Stripe configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const Stripe = await import("stripe");
    const stripe = new Stripe.default(stripeKey);

    // Select correct pricing based on product type
    const pricingMap = productType === "plus" ? newStripeProductPricing : oldStripeProductPricing;

    const product = pricingMap[productId];
    if (!product) {
      console.error("❌ Product not found in pricing map:", productId);
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

    console.log(`💳 Creating checkout with ${productType} price: ${priceId}`);

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

    console.log(`✅ Checkout session created: ${session.id}`);

    return new Response(JSON.stringify({ url: session.url, productType }), {
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