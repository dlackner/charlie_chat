import Stripe from "stripe";
import { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ---------- 1. Subscription or membership products ----------
const productPricing: Record<
  string,
  { monthly?: string; annual?: string; mode: "subscription" | "payment" }
> = {
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRICE!,
    mode: "subscription",
  },
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE!,
    mode: "subscription",
  },
  [process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRICE!,
    mode: "subscription",
  },
};

// ---------- 2. One-time credit pack products ----------
const creditPackPriceIds: Record<string, string> = {
  "charlie_chat_25": process.env.NEXT_PUBLIC_CHARLIE_CHAT_25_PACK_PRICE!,
  "charlie_chat_50": process.env.NEXT_PUBLIC_CHARLIE_CHAT_50_PACK_PRICE!,
  "charlie_chat_100": process.env.NEXT_PUBLIC_CHARLIE_CHAT_100_PACK_PRICE!,
  "charlie_chat_pro_100": process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_100_PACK_PRICE!,
  "cohort_100": process.env.NEXT_PUBLIC_MULTIFAMILYOS_100_PACK_PRICE!,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("💬 Checkout payload:", body);

    // Case A: Subscription plan (Charlie Chat, Pro, Cohort)
    if (body.productId && body.plan) {
      const { productId, plan }: { productId: string; plan: "monthly" | "annual" } = body;

      const product = productPricing[productId];
      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const priceId = product[plan];
      if (!priceId) {
        return new Response(JSON.stringify({ error: "Invalid plan" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: product.mode,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&mode=subscription`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
        metadata: {
          productId,
          plan,
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Case B: Credit pack purchase (from ClosingChat modal)
    if (body.userClass && body.amount && body.stripeCustomerId) {
      const key = `${body.userClass}_${body.amount}`;
      const priceId = creditPackPriceIds[key];

      if (!priceId) {
        return new Response(JSON.stringify({ error: "Invalid credit pack" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer: body.stripeCustomerId, // ✅ Important: links session to a known Stripe customer
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&mode=credit`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
        metadata: {
          userClass: body.userClass,
          amount: body.amount.toString(),
        },
        payment_intent_data: {
          metadata: {
            userClass: body.userClass,
            amount: body.amount.toString(),
          },
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request payload" }), {
      status: 400,
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
