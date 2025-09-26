//REFACTOR FOR V2 RELEASE
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  //console.log("🛎️ Stripe webhook received");
  const supabase = createSupabaseAdminClient();

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("❌ Missing Stripe signature");
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SIGNING_SECRET!);
    //console.log("✅ Stripe signature verified");
  } catch (err: any) {
    console.error("❌ Invalid signature:", err.message);
    return new NextResponse("Bad signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    //console.log("🚫 Ignoring non-checkout event:", event.type);
    return new NextResponse("Ignored", { status: 200 });
  }

  const raw = event.data.object as Stripe.Checkout.Session;
  const session = await stripe.checkout.sessions.retrieve(raw.id, {
    expand: ["line_items.data.price", "line_items"],
  });

  const customerId = session.customer as string;
  const sessionMode = session.mode;
  const priceId = session.line_items?.data?.[0]?.price?.id || session.metadata?.priceId;

  if (!customerId || !priceId) {
    console.error("❌ Missing customer ID or price ID");
    return new NextResponse("Missing data", { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, user_class")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profileError) {
    console.error("❌ Profile lookup error:", profileError);
    return new NextResponse("Lookup error", { status: 500 });
  }

  if (!profile) {
    console.warn("⚠️ No profile found for customer ID:", customerId);
    return new NextResponse("No profile", { status: 200 });
  }

  // ─── Handle Subscription ─────────────────────────────────────────────
  if (sessionMode === "subscription") {
    //console.log("📦 Handling subscription purchase");

    const priceMap: Record<string, string> = {
      // Legacy Plus Plans (keep for existing subscribers)
      [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_MONTHLY_PRICE!]: "charlie_chat_plus",
      [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_ANNUAL_PRICE!]: "charlie_chat_plus",
      
      // Legacy Pro Plans (keep for existing subscribers)
      [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE!]: "charlie_chat_pro",
      [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE!]: "charlie_chat_pro",
      
      // New Plus Plans
      [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE!]: "charlie_chat_plus",
      [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE!]: "charlie_chat_plus",
      
      // New Pro Plans
      [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRICE!]: "charlie_chat_pro",
      [process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRICE!]: "charlie_chat_pro",
      
      // Legacy Cohort (keep for existing subscribers)
      [process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRICE!]: "cohort",
      [process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRICE!]: "cohort",
      
      // New Cohort Plans
      [process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_MONTHLY_PRICE!]: "cohort",
      [process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_ANNUAL_PRICE!]: "cohort",
    };

    const newClass = priceMap[priceId] || "charlie_chat";

    const { error: insertError } = await supabase
      .from("subscriptions")
      .insert([{
        user_id: profile.user_id,
        stripe_subscription_id: session.subscription as string,
        stripe_price_id: priceId,
        status: session.payment_status,
      }]);

    if (insertError) {
      console.error("🔥 Subscription insert failed:", insertError);
      return new NextResponse("Subscription insert failed", { status: 500 });
    }

    const { error: classUpdateErr } = await supabase
      .from("profiles")
      .update({ user_class: newClass })
      .eq("user_id", profile.user_id);

    if (classUpdateErr) {
      console.error("🔥 User class update failed:", classUpdateErr);
      return new NextResponse("User class update failed", { status: 500 });
    }

    //console.log("✅ Subscription + user_class updated for", profile.user_id);
  }


  return new NextResponse("Webhook handled", { status: 200 });
}
