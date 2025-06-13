import Stripe from "stripe";
import { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 🧭 Full map of each product ID → its monthly/annual price and mode
const productPricing: Record<
  string,
  { monthly?: string; annual?: string; mode: "subscription" | "payment" }
> = {
  // Charlie Chat
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRICE!,
    mode: "subscription",
  },
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRICE!,
    mode: "subscription",
  },

  // Charlie Chat Pro
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE!,
    mode: "subscription",
  },
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE!,
    mode: "subscription",
  },

  // Cohort Program
  [process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRICE!,
    mode: "subscription",
  },
  [process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRICE!,
    annual: process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRICE!,
    mode: "subscription",
  },

  // 100 Searches (one-time purchase)
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_100_SEARCHES_PRODUCT!]: {
    monthly: process.env.NEXT_PUBLIC_CHARLIE_CHAT_100_SEARCHES_PRICE!,
    annual: process.env.NEXT_PUBLIC_CHARLIE_CHAT_100_SEARCHES_PRICE!, // optional fallback
    mode: "payment",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { productId, plan }: { productId: string; plan: "monthly" | "annual" } = await req.json();

    console.log("📦 Incoming checkout request:", { productId, plan });
    console.log("🧩 Keys in productPricing:", Object.keys(productPricing));

    const product = productPricing[productId];
    if (!product) {
      console.error("❌ Invalid product ID:", productId);
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const priceId = product[plan];
    if (!priceId) {
      console.error("❌ No price ID found for plan:", plan);
      return new Response(JSON.stringify({ error: "No price found for selected plan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: product.mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      metadata: {
        userId: "placeholder_user_id", // Replace this with the actual user if needed
        productId,
        plan,
      },
    });

    console.log("✅ Stripe session created:", session.url);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("🔥 Stripe Checkout Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unexpected error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
