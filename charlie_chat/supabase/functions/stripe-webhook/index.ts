// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';
console.log("Function starting up...");
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16'
});
serve(async (req)=>{
  console.log("🛎️ Request received:", req.method, req.url);
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error("❌ Missing Stripe signature");
      return new Response('Missing signature', {
        status: 400
      });
    }
    const body = await req.text();
    // Use the ASYNC version for Deno
    const event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') ?? '');
    console.log("✅ Webhook verified, event type:", event.type);
    // Process both checkout.session.completed and invoice.payment_succeeded events
    if (![
      'checkout.session.completed',
      'invoice.payment_succeeded'
    ].includes(event.type)) {
      console.log("🚫 Ignoring event:", event.type);
      return new Response(JSON.stringify({
        received: true,
        ignored: true
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Initialize Supabase client
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    if (event.type === 'checkout.session.completed') {
      await processCheckoutSession(event.data.object, supabase, stripe);
    }
    if (event.type === 'invoice.payment_succeeded') {
      await processInvoicePayment(event.data.object, supabase, stripe);
    }
    return new Response(JSON.stringify({
      success: true,
      type: event.type,
      processed: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("🔥 Webhook error:", error.message);
    console.error("🔥 Error stack:", error.stack);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
// Process checkout session completed events
async function processCheckoutSession(session, supabase, stripe) {
  console.log("💳 Checkout completed event received");
  console.log("Session metadata:", session.metadata);
  console.log("Session mode:", session.mode);
  console.log("Session customer:", session.customer);
  // Get userId from metadata
  const userIdFromMetadata = session.metadata?.userId;
  if (!userIdFromMetadata) {
    console.error("❌ Missing userId in metadata:", session.metadata);
    throw new Error('Missing userId in metadata');
  }
  console.log("🔍 Looking up user:", userIdFromMetadata);
  // Look up user profile
  const { data: profile, error: profileError } = await supabase.from("profiles").select("user_id, email, credits, user_class").eq("user_id", userIdFromMetadata).single();
  if (profileError || !profile) {
    console.error("❌ Profile lookup error:", profileError);
    throw new Error(`Profile lookup error: ${profileError?.message}`);
  }
  console.log("✅ Found user profile:", profile.user_id);
  // Process based on session mode
  if (session.mode === "payment") {
    await handleCreditPurchase(session, profile, supabase, stripe);
  } else if (session.mode === "subscription") {
    await handleSubscription(session, profile, supabase, stripe);
  }
}
// Process invoice payment events (for recurring subscriptions)
async function processInvoicePayment(invoice, supabase, stripe) {
  console.log("🧾 Invoice payment succeeded event received");
  console.log("Invoice subscription:", invoice.subscription);
  console.log("Invoice customer:", invoice.customer);
  if (!invoice.subscription) {
    console.log("⚠️ Invoice not associated with subscription, skipping");
    return;
  }
  // Find user by stripe customer ID
  const { data: profile, error: profileError } = await supabase.from("profiles").select("user_id, email, credits, user_class").eq("stripe_customer_id", invoice.customer).single();
  if (profileError || !profile) {
    console.error("❌ Could not find user for customer:", invoice.customer);
    return;
  }
  console.log("✅ Found user profile:", profile.user_id);
  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  console.log("📋 Retrieved subscription:", subscription.id);
  // Update existing subscription record
  await updateSubscriptionRecord(subscription, profile, supabase);
}
// Handle credit pack purchases
async function handleCreditPurchase(session, profile, supabase, stripe) {
  console.log("💳 Processing credit pack purchase");
  // Get line items to find price ID
  const sessionWithItems = await stripe.checkout.sessions.retrieve(session.id, {
    expand: [
      "line_items.data.price"
    ]
  });
  const priceId = sessionWithItems.line_items?.data?.[0]?.price?.id;
  console.log("💰 Price ID:", priceId);
  // Map price IDs to credit amounts
  const priceToCreditMap = {
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_25_PACK_PRICE') ?? '']: {
      credits: 25
    },
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_50_PACK_PRICE') ?? '']: {
      credits: 50
    },
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_100_PACK_PRICE') ?? '']: {
      credits: 100
    },
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_PRO_100_PACK_PRICE') ?? '']: {
      credits: 100,
      userClass: 'charlie_chat_pro'
    },
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_100_PACK_PRICE') ?? '']: {
      credits: 100,
      userClass: 'multifamilyos'
    }
  };
  const creditInfo = priceToCreditMap[priceId || ''];
  if (!creditInfo) {
    console.error("❌ Unknown price ID for credit pack:", priceId);
    console.log("🔍 Available price IDs in mapping:", Object.keys(priceToCreditMap));
    // Fallback: Try to get credit amount from metadata if available
    const fallbackAmount = parseInt(session.metadata?.amount || "0", 10);
    if (fallbackAmount > 0) {
      console.log("🔄 Using fallback credit amount from metadata:", fallbackAmount);
      const amount = fallbackAmount;
      // Continue with fallback processing...
      const { error: purchaseError } = await supabase.from("credit_purchases").insert([
        {
          user_id: profile.user_id,
          credit_amount: amount,
          stripe_price_id: priceId,
          stripe_session_id: session.id,
          status: session.payment_status || 'paid',
          metadata: session.metadata ?? {}
        }
      ]);
      if (purchaseError) {
        console.error("🔥 Credit purchase insert failed:", purchaseError);
        console.error("🔥 Purchase error details:", purchaseError.details);
      } else {
        console.log("✅ Credit purchase record inserted (fallback)");
      }
      // Update user's credit balance
      const newBalance = (profile.credits || 0) + amount;
      console.log(`💎 Updating credits: ${profile.credits || 0} + ${amount} = ${newBalance}`);
      const { error: creditUpdateError } = await supabase.from("profiles").update({
        credits: newBalance
      }).eq("user_id", profile.user_id);
      if (creditUpdateError) {
        console.error("🔥 Profile update failed:", creditUpdateError);
        throw new Error(`Profile update failed: ${creditUpdateError.message}`);
      }
      console.log(`✅ Added ${amount} credits to user ${profile.user_id} (new balance: ${newBalance}) [FALLBACK]`);
      return;
    }
    throw new Error(`Unknown price ID: ${priceId}`);
  }
  const amount = creditInfo.credits;
  console.log("🔍 Credit amount from price mapping:", amount);
  if (amount <= 0) {
    console.warn("⚠️ Invalid credit amount:", amount);
    throw new Error('Invalid credit amount');
  }
  // Insert credit purchase record
  const { error: purchaseError } = await supabase.from("credit_purchases").insert([
    {
      user_id: profile.user_id,
      credit_amount: amount,
      stripe_price_id: priceId,
      stripe_session_id: session.id,
      status: session.payment_status || 'paid',
      metadata: session.metadata ?? {}
    }
  ]);
  if (purchaseError) {
    console.error("🔥 Credit purchase insert failed:", purchaseError);
    console.error("🔥 Purchase error details:", purchaseError.details);
  // Continue anyway to update credits
  } else {
    console.log("✅ Credit purchase record inserted");
  }
  // Update user's credit balance
  const newBalance = (profile.credits || 0) + amount;
  console.log(`💎 Updating credits: ${profile.credits || 0} + ${amount} = ${newBalance}`);
  // Prepare profile updates
  const profileUpdates = {
    credits: newBalance
  };
  // If this credit pack includes a user class upgrade, apply it
  if (creditInfo.userClass) {
    profileUpdates.user_class = creditInfo.userClass;
    console.log(`🔄 Also upgrading user class to: ${creditInfo.userClass}`);
  }
  const { error: creditUpdateError } = await supabase.from("profiles").update(profileUpdates).eq("user_id", profile.user_id);
  if (creditUpdateError) {
    console.error("🔥 Profile update failed:", creditUpdateError);
    throw new Error(`Profile update failed: ${creditUpdateError.message}`);
  }
  console.log(`✅ Added ${amount} credits to user ${profile.user_id} (new balance: ${newBalance})`);
  if (creditInfo.userClass) {
    console.log(`✅ Updated user class to: ${creditInfo.userClass}`);
  }
}
// Handle subscription purchases
async function handleSubscription(session, profile, supabase, stripe) {
  console.log("📋 Processing subscription");
  // Get price ID from line items
  const sessionWithItems = await stripe.checkout.sessions.retrieve(session.id, {
    expand: [
      "line_items.data.price"
    ]
  });
  const priceId = sessionWithItems.line_items?.data?.[0]?.price?.id;
  console.log("📋 Subscription price ID:", priceId);
  // Map price IDs to user classes
  const priceToClassMap = {
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRICE') ?? '']: "charlie_chat",
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRICE') ?? '']: "charlie_chat",
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE') ?? '']: "charlie_chat_pro",
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE') ?? '']: "charlie_chat_pro",
    [Deno.env.get('NEXT_PUBLIC_COHORT_MONTHLY_PRICE') ?? '']: "cohort",
    [Deno.env.get('NEXT_PUBLIC_COHORT_ANNUAL_PRICE') ?? '']: "cohort"
  };
  const assignedUserClass = priceToClassMap[priceId || ''] || "charlie_chat";
  console.log(`📋 Assigning user_class: ${assignedUserClass}`);
  // Get full subscription details from Stripe if subscription exists
  if (session.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      console.log("✅ Retrieved subscription details from Stripe");
      // Insert or update subscription record with all proper fields
      const { error: subscriptionError } = await supabase.from("subscriptions").upsert([
        {
          user_id: profile.user_id,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          status: subscription.status,
          created_at: new Date(subscription.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
          metadata: {
            ...session.metadata,
            stripe_customer_id: session.customer,
            product_id: session.metadata?.productId,
            plan: session.metadata?.plan
          }
        }
      ], {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });
      if (subscriptionError) {
        console.error("🔥 Subscription upsert failed:", subscriptionError);
        console.error("🔥 Subscription error details:", subscriptionError.details);
      // Continue anyway to update profile
      } else {
        console.log("✅ Subscription record inserted/updated with full details!");
      }
    } catch (stripeError) {
      console.error("❌ Failed to retrieve subscription details:", stripeError.message);
      console.log("⚠️ Continuing with profile update...");
    }
  } else {
    console.log("⚠️ No subscription ID in session");
  }
  // Update user profile with new class and customer ID
  const { error: profileUpdateError } = await supabase.from("profiles").update({
    user_class: assignedUserClass,
    stripe_customer_id: session.customer
  }).eq("user_id", profile.user_id);
  if (profileUpdateError) {
    console.error("🔥 Profile update failed:", profileUpdateError);
    throw new Error(`Profile update failed: ${profileUpdateError.message}`);
  }
  console.log("✅ Subscription processed and profile updated successfully!");
}
// Update subscription record with full Stripe details
async function updateSubscriptionRecord(subscription, profile, supabase) {
  console.log("🔄 Updating subscription record");
  const priceId = subscription.items.data[0]?.price?.id;
  // Map price to user class
  const priceToClassMap = {
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRICE') ?? '']: "charlie_chat",
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRICE') ?? '']: "charlie_chat",
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRICE') ?? '']: "charlie_chat_pro",
    [Deno.env.get('NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRICE') ?? '']: "charlie_chat_pro",
    [Deno.env.get('NEXT_PUBLIC_COHORT_MONTHLY_PRICE') ?? '']: "cohort",
    [Deno.env.get('NEXT_PUBLIC_COHORT_ANNUAL_PRICE') ?? '']: "cohort"
  };
  const assignedUserClass = priceToClassMap[priceId || ''] || "charlie_chat";
  // Update subscription record
  const { error: subscriptionError } = await supabase.from("subscriptions").upsert([
    {
      user_id: profile.user_id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status: subscription.status,
      created_at: new Date(subscription.created * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      metadata: {
        stripe_customer_id: subscription.customer,
        updated_via: 'invoice_payment_succeeded'
      }
    }
  ], {
    onConflict: 'user_id',
    ignoreDuplicates: false
  });
  if (subscriptionError) {
    console.error("🔥 Subscription update failed:", subscriptionError);
  } else {
    console.log("✅ Subscription record updated");
  }
  // Update user profile
  const { error: profileUpdateError } = await supabase.from("profiles").update({
    user_class: assignedUserClass,
    stripe_customer_id: subscription.customer
  }).eq("user_id", profile.user_id);
  if (profileUpdateError) {
    console.error("🔥 Profile update failed:", profileUpdateError);
  } else {
    console.log("✅ Profile updated with new user class");
  }
}
