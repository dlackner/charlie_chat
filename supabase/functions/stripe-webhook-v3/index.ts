// supabase/functions/stripe-webhook-v3/index.ts
// NEW Stripe Account webhook - handles Plus users
// This is a clone of webhook-v2 adapted for the new Stripe account
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

console.log("Stripe Webhook V3 (NEW Stripe Account) starting up...");

const stripe = new Stripe(Deno.env.get('STRIPE_NEW_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16'
});

serve(async (req) => {
  console.log("🛎️ Request received:", req.method, req.url);

  console.log("📋 All request headers:");
  for (const [key, value] of req.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error("❌ Missing Stripe signature");
      console.error("❌ Available headers:", Array.from(req.headers.keys()));
      return new Response('Missing signature', { status: 400 });
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_NEW_WEBHOOK_SIGNING_SECRET') ?? ''
    );

    console.log("✅ Webhook verified, event type:", event.type);

    // Process multiple event types including subscription updates
    if (!['checkout.session.completed', 'invoice.payment_succeeded', 'customer.subscription.created', 'customer.subscription.updated'].includes(event.type)) {
      console.log("🚫 Ignoring event:", event.type);
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await processCheckoutSession(event.data.object, supabase, stripe);
        break;
      case 'invoice.payment_succeeded':
        await processInvoicePayment(event.data.object, supabase, stripe);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await processSubscriptionEvent(event.data.object, supabase, stripe);
        break;
    }

    return new Response(JSON.stringify({
      success: true,
      type: event.type,
      processed: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("🔥 Webhook error:", error.message);
    console.error("🔥 Error stack:", error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// Sync customer data to profile
async function syncCustomerToProfile(customer, supabase) {
  console.log("👤 Syncing customer data to profile:", customer.id);
  const profileUpdates = {};

  if (customer.name) profileUpdates.full_name = customer.name;
  if (customer.email) profileUpdates.email = customer.email;
  if (customer.phone) profileUpdates.phone_number = customer.phone;

  if (customer.address) {
    if (customer.address.line1) profileUpdates.street_address = customer.address.line1;
    if (customer.address.city) profileUpdates.city = customer.address.city;
    if (customer.address.state) profileUpdates.state = customer.address.state;
    if (customer.address.postal_code) profileUpdates.zipcode = customer.address.postal_code;
  }

  if (Object.keys(profileUpdates).length > 0) {
    profileUpdates.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('stripe_customer_id', customer.id);

    if (error) {
      console.error('❌ Error syncing customer to profile:', error);
    } else {
      console.log('✅ Customer data synced to profile:', Object.keys(profileUpdates));
    }
  } else {
    console.log('ℹ️ No customer data to sync');
  }
}

// Process checkout session completion
async function processCheckoutSession(session, supabase, stripe) {
  console.log("💳 Checkout completed event received");
  console.log("Session metadata:", session.metadata);
  console.log("Session mode:", session.mode);
  console.log("Session customer:", session.customer);

  const userIdFromMetadata = session.metadata?.userId;
  if (!userIdFromMetadata) {
    console.error("❌ Missing userId in metadata:", session.metadata);
    throw new Error('Missing userId in metadata');
  }

  console.log("🔍 Looking up user:", userIdFromMetadata);

  // Look up user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, email, user_class")
    .eq("user_id", userIdFromMetadata)
    .single();

  if (profileError || !profile) {
    console.error("❌ Profile lookup error:", profileError);
    throw new Error(`Profile lookup error: ${profileError?.message}`);
  }

  console.log("✅ Found user profile:", profile.user_id);

  // Sync customer data if customer ID exists
  if (session.customer) {
    try {
      console.log("👤 Fetching customer data from Stripe:", session.customer);
      const customer = await stripe.customers.retrieve(session.customer);
      await syncCustomerToProfile(customer, supabase);
    } catch (customerError) {
      console.error("⚠️ Failed to fetch/sync customer data:", customerError.message);
    }
  }

  // Only process subscription mode
  if (session.mode === "subscription") {
    await handleSubscription(session, profile, supabase, stripe);
  } else {
    console.log("ℹ️ Ignoring non-subscription checkout:", session.mode);
  }
}

// Handle subscription with Plus-specific user class mapping
async function handleSubscription(session, profile, supabase, stripe) {
  console.log("📋 Processing subscription from NEW Stripe Account (Plus)");

  const sessionWithItems = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price"]
  });
  const priceId = sessionWithItems.line_items?.data?.[0]?.price?.id;
  console.log("📋 Subscription price ID:", priceId);

  // NEW Stripe Account - Plus pricing only
  const priceToClassMap = {
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE_NEW') ?? '']: "plus",
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE_NEW') ?? '']: "plus"
  };

  const assignedUserClass = priceToClassMap[priceId || ''] || "plus";
  console.log(`📋 Assigning user_class: ${assignedUserClass}`);

  if (session.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      console.log("✅ Retrieved subscription details from Stripe");

      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .upsert([{
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
            plan: session.metadata?.plan,
            webhook_version: 'v3',
            stripe_account: 'new'
          }
        }], {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (subscriptionError) {
        console.error("🔥 Subscription upsert failed:", subscriptionError);
      } else {
        console.log("✅ Subscription record inserted/updated!");
      }
    } catch (stripeError) {
      console.error("❌ Failed to retrieve subscription details:", stripeError.message);
    }
  }

  // Update user profile with user class
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      user_class: assignedUserClass,
      stripe_customer_id: session.customer,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", profile.user_id);

  if (profileUpdateError) {
    console.error("🔥 Profile update failed:", profileUpdateError);
    throw new Error(`Profile update failed: ${profileUpdateError.message}`);
  }

  console.log(`✅ Subscription processed! User class updated to: ${assignedUserClass}`);
}

// Process subscription events (created/updated)
async function processSubscriptionEvent(subscription, supabase, stripe) {
  console.log("📋 Subscription event received:", subscription.id);
  console.log("📋 Subscription status:", subscription.status);

  // Find user by customer ID
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, email, user_class")
    .eq("stripe_customer_id", subscription.customer)
    .single();

  if (profileError || !profile) {
    console.error("❌ Could not find user for customer:", subscription.customer);
    return;
  }

  console.log("✅ Found user profile:", profile.user_id);
  await updateSubscriptionRecord(subscription, profile, supabase);
}

// Process invoice payment for subscription renewals
async function processInvoicePayment(invoice, supabase, stripe) {
  console.log("🧾 Invoice payment succeeded event received");
  console.log("Invoice subscription:", invoice.subscription);
  console.log("Invoice customer:", invoice.customer);

  if (invoice.customer) {
    try {
      console.log("👤 Syncing customer data from invoice payment");
      const customer = await stripe.customers.retrieve(invoice.customer);
      await syncCustomerToProfile(customer, supabase);
    } catch (customerError) {
      console.error("⚠️ Failed to sync customer data from invoice:", customerError.message);
    }
  }

  if (!invoice.subscription) {
    console.log("⚠️ Invoice not associated with subscription, but customer data synced");
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, email, user_class")
    .eq("stripe_customer_id", invoice.customer)
    .single();

  if (profileError || !profile) {
    console.error("❌ Could not find user for customer:", invoice.customer);
    return;
  }

  console.log("✅ Found user profile:", profile.user_id);

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  console.log("📋 Retrieved subscription:", subscription.id);

  await updateSubscriptionRecord(subscription, profile, supabase);
}

// Update subscription record with Plus user class mapping
async function updateSubscriptionRecord(subscription, profile, supabase) {
  console.log("🔄 Updating subscription record from NEW Stripe Account (Plus)");

  const priceId = subscription.items.data[0]?.price?.id;

  // NEW Stripe Account - Plus pricing only
  const priceToClassMap = {
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE_NEW') ?? '']: "plus",
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE_NEW') ?? '']: "plus"
  };

  const assignedUserClass = priceToClassMap[priceId || ''] || "plus";

  const { error: subscriptionError } = await supabase
    .from("subscriptions")
    .upsert([{
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
        updated_via: 'invoice_payment_succeeded',
        webhook_version: 'v3',
        stripe_account: 'new'
      }
    }], {
      onConflict: 'user_id',
      ignoreDuplicates: false
    });

  if (subscriptionError) {
    console.error("🔥 Subscription update failed:", subscriptionError);
  } else {
    console.log("✅ Subscription record updated");
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      user_class: assignedUserClass,
      stripe_customer_id: subscription.customer,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", profile.user_id);

  if (profileUpdateError) {
    console.error("🔥 Profile update failed:", profileUpdateError);
  } else {
    console.log(`✅ Profile updated with user class: ${assignedUserClass}`);
  }
}
