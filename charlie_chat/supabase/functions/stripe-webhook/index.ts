import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
export default async function handler(req) {
  console.log("🛎️ Stripe webhook received");
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("❌ Missing Stripe signature");
    return new Response("Missing signature", {
      status: 400
    });
  }
  let event;
  const body = await req.text();
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') ?? '');
    console.log("✅ Stripe signature verified");
  } catch (err) {
    console.error("❌ Invalid signature:", err?.message || err);
    return new Response("Bad signature", {
      status: 400
    });
  }
  // Handle both checkout completion and subscription creation
  if (![
    "checkout.session.completed",
    "customer.subscription.created"
  ].includes(event.type)) {
    console.log("🚫 Ignoring event:", event.type);
    return new Response("Ignored", {
      status: 200
    });
  }
  // Handle checkout.session.completed events
  if (event.type === "checkout.session.completed") {
    console.log("🔄 Processing checkout session completed...");
    const raw = event.data.object;
    const session = await stripe.checkout.sessions.retrieve(raw.id, {
      expand: [
        "line_items.data.price",
        "line_items"
      ]
    });
    const customerId = session.customer;
    const sessionMode = session.mode;
    const priceId = session.line_items?.data?.[0]?.price?.id || session.metadata?.priceId;
    console.log("🔍 Session details:", {
      customerId,
      sessionMode,
      priceId
    });
    console.log("🔍 Session metadata:", session.metadata);
    if (!customerId || !priceId) {
      console.error("❌ Missing customer ID or price ID");
      return new Response("Missing data", {
        status: 400
      });
    }
    const userIdFromMetadata = session.metadata?.userId;
    if (!userIdFromMetadata) {
      console.error("❌ Missing userId in metadata");
      return new Response("Missing userId", {
        status: 400
      });
    }
    console.log("🔍 Looking up user:", userIdFromMetadata);
    // Look up user profile directly by userId from metadata
    const { data: finalProfile, error: profileError } = await supabase.from("profiles").select("user_id, email, credits, user_class").eq("user_id", userIdFromMetadata).maybeSingle();
    if (profileError) {
      console.error("❌ Profile lookup error:", profileError);
      return new Response("Profile lookup error", {
        status: 500
      });
    }
    if (!finalProfile) {
      console.error("❌ Could not find user profile by userId:", userIdFromMetadata);
      return new Response("User profile not found", {
        status: 404
      });
    }
    console.log("✅ Processing payment for user_id:", finalProfile.user_id);
    // Handle Subscription
    if (sessionMode === "subscription") {
      console.log("🔄 Processing subscription...");
      const priceMap = {
        [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRICE') ?? '']: "charlie_chat",
        [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRICE') ?? '']: "charlie_chat",
        [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE') ?? '']: "charlie_chat_pro",
        [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE') ?? '']: "charlie_chat_pro",
        [Deno.env.get('NEXT_PUBLIC_COHORT_MONTHLY_PRICE') ?? '']: "cohort",
        [Deno.env.get('NEXT_PUBLIC_COHORT_ANNUAL_PRICE') ?? '']: "cohort"
      };
      const newClass = priceMap[priceId] || "charlie_chat";
      console.log(`📋 Assigning user_class: ${newClass} for price: ${priceId}`);
      // Handle existing subscription upgrades/downgrades
      const { data: existingSubscription, error: existingSubError } = await supabase.from("subscriptions").select("id, stripe_subscription_id").eq("user_id", finalProfile.user_id).eq("status", "active").maybeSingle();
      if (existingSubError) {
        console.error("❌ Error checking existing subscription:", existingSubError);
        return new Response("Subscription check error", {
          status: 500
        });
      }
      if (existingSubscription) {
        console.log("🔄 User has existing subscription, updating...");
        const { error: updateError } = await supabase.from("subscriptions").update({
          stripe_subscription_id: session.subscription,
          stripe_price_id: priceId,
          status: "active"
        }).eq("id", existingSubscription.id);
        if (updateError) {
          console.error("🔥 Subscription update failed:", updateError);
          return new Response("Subscription update failed", {
            status: 500
          });
        }
      } else {
        console.log("➕ Creating new subscription...");
        const { error: insertError } = await supabase.from("subscriptions").insert([
          {
            user_id: finalProfile.user_id,
            stripe_subscription_id: session.subscription,
            stripe_price_id: priceId,
            status: "active"
          }
        ]);
        if (insertError) {
          console.error("🔥 Subscription insert failed:", insertError);
          return new Response("Subscription insert failed", {
            status: 500
          });
        }
      }
      // Update user profile
      const updates = {
        user_class: newClass,
        stripe_customer_id: customerId
      };
      if (session.customer_details?.name) {
        updates.full_name = session.customer_details.name;
      }
      const { error: profileUpdateErr } = await supabase.from("profiles").update(updates).eq("user_id", finalProfile.user_id);
      if (profileUpdateErr) {
        console.error("🔥 Profile update failed:", profileUpdateErr);
        return new Response("Profile update failed", {
          status: 500
        });
      }
      console.log("✅ Subscription and profile updated for", finalProfile.user_id);
    }
    // Handle One-Time Credit Pack
    if (sessionMode === "payment") {
      console.log("💳 Processing credit pack purchase...");
      const amount = parseInt(session.metadata?.amount || "0", 10);
      if (amount <= 0) {
        console.warn("⚠️ Invalid credit amount:", amount);
        return new Response("Invalid credit amount", {
          status: 400
        });
      }
      // Insert credit purchase record
      const { error: purchaseInsertError } = await supabase.from("credit_purchases").insert([
        {
          user_id: finalProfile.user_id,
          credit_amount: amount,
          stripe_price_id: priceId,
          stripe_session_id: session.id,
          status: session.payment_status,
          metadata: session.metadata ?? {}
        }
      ]);
      if (purchaseInsertError) {
        console.error("🔥 Credit purchase insert failed:", purchaseInsertError);
        return new Response("Purchase insert failed", {
          status: 500
        });
      }
      // Update user's credit balance
      const newBalance = (finalProfile.credits || 0) + amount;
      const { error: creditUpdateErr } = await supabase.from("profiles").update({
        credits: newBalance
      }).eq("user_id", finalProfile.user_id);
      if (creditUpdateErr) {
        console.error("🔥 Credit balance update failed:", creditUpdateErr);
        return new Response("Credits update failed", {
          status: 500
        });
      }
      console.log(`✅ Added ${amount} credits to user ${finalProfile.user_id} (new balance: ${newBalance})`);
    }
    return new Response("Webhook processed successfully", {
      status: 200
    });
  }
  // Handle customer.subscription.created events
  if (event.type === "customer.subscription.created") {
    const subscription = event.data.object;
    console.log("🔄 Processing subscription creation:", subscription.id);
    console.log("✅ Subscription creation event logged");
    return new Response("Subscription creation logged", {
      status: 200
    });
  }
  return new Response("Event processed", {
    status: 200
  });
}
