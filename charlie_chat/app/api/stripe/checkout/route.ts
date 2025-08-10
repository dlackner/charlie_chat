import Stripe from "stripe";
import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const productPricing: Record<
  string,
  { monthly?: string; annual?: string; mode: "subscription" | "payment" }
> = {
  // Charlie Chat Monthly Product
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // Charlie Chat Annual Product
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // Charlie Chat Pro Monthly Product
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // Charlie Chat Pro Annual Product
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // Charlie Chat Plus Monthly Product
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // Charlie Chat Plus Annual Product
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // Cohort Monthly Product
  [process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRICE!,
    mode: "subscription",
  },
  // Cohort Annual Product
  [process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRICE!,
    mode: "subscription",
  },
};

// Credit pack pricing map
const creditPackPricing: Record<number, string> = {
  25: process.env.NEXT_PUBLIC_CHARLIE_CHAT_25_PACK_PRICE!,
  50: process.env.NEXT_PUBLIC_CHARLIE_CHAT_50_PACK_PRICE!,
  100: process.env.NEXT_PUBLIC_CHARLIE_CHAT_100_PACK_PRICE!,
};

// Special credit packs with user class upgrades
const specialCreditPacks: Record<string, { credits: number; priceId: string }> = {
  "charlie_chat_plus": {
    credits: 100,
    priceId: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_100_PACK_PRICE!
  },
  "charlie_chat_pro": {
    credits: 100,
    priceId: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_100_PACK_PRICE!
  },
  "cohort": {
    credits: 250,
    priceId: process.env.NEXT_PUBLIC_MULTIFAMILYOS_COHORT_250_PACK_PRICE!
  }
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

    // Handle different request types
    const body = await req.json();
    
    // Check if this is a credit pack purchase or subscription
    if ('amount' in body && 'userClass' in body) {
      // Credit pack purchase
      const { userClass, amount, stripeCustomerId } = body;
      
      //console.log("💳 Creating credit pack checkout:", { userId, userClass, amount });

      let priceId: string;

      // Check if this is a special credit pack with user class upgrade
      if (specialCreditPacks[userClass] && amount === specialCreditPacks[userClass].credits) {
        priceId = specialCreditPacks[userClass].priceId;
        //console.log("🎯 Using special credit pack price:", priceId);
      } else {
        // Use regular credit pack pricing
        priceId = creditPackPricing[amount];
        if (!priceId) {
          return new Response(
            JSON.stringify({ error: `No price configured for ${amount} credits` }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        //console.log("💰 Using regular credit pack price:", priceId);
      }

      // Create a one-time payment session using predefined price ID
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price: priceId,  // Using predefined price ID instead of price_data
          quantity: 1,
        }],
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}`, //removed /cancel
        metadata: {
          userId,
          userClass,
          amount: amount.toString(),
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Subscription purchase
      const { productId, plan }: { productId: string; plan: "monthly" | "annual" } = body;

      //console.log("📦 Incoming subscription checkout request:", { productId, plan });
      //console.log("🧩 Keys in productPricing:", Object.keys(productPricing));
      //console.log("🔍 Available products:", Object.keys(productPricing));
      //console.log("🔍 Looking for product:", productId);

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

      //console.log("💵 Selected price ID:", priceId);
      //console.log("🧾 Stripe mode:", product.mode);
      //console.log("🔍 METADATA DEBUG:", { userId, productId, plan });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: product.mode,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}`, // removed /cancel
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
    }
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