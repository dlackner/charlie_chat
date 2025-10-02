// supabase/functions/stripe-webhook-v2/index.ts
/*
 * MFOS V2 - Stripe Webhook Handler
 * Clean subscription-only webhook for new user class system
 * Handles: checkout.session.completed, invoice.payment_succeeded, customer events
 * Maps to new user classes: trial, core, plus, pro, cohort
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

console.log("🚀 MFOS V2 Stripe Webhook starting up...");

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16'
});

serve(async (req) => {
  console.log("🛎️ Request received:", req.method, req.url);
  
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error("❌ Missing Stripe signature");
      return new Response('Missing signature', { status: 400 });
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body, 
      signature, 
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') ?? ''
    );

    console.log("✅ Webhook verified, event type:", event.type);

    // Only process subscription-related events
    if (![
      'checkout.session.completed',
      'invoice.payment_succeeded', 
      'customer.created',
      'customer.updated'
    ].includes(event.type)) {
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
      case 'customer.created':
      case 'customer.updated':
        await syncCustomerToProfile(event.data.object, supabase);
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
async function syncCustomerToProfile(customer: any, supabase: any) {
  console.log("👤 Syncing customer data to profile:", customer.id);
  
  const profileUpdates: any = {};
  
  // Map Stripe customer fields to profile fields
  if (customer.name) profileUpdates.full_name = customer.name;
  if (customer.email) profileUpdates.email = customer.email;
  if (customer.phone) profileUpdates.phone_number = customer.phone;
  
  // Handle address if present
  if (customer.address) {
    if (customer.address.line1) profileUpdates.street_address = customer.address.line1;
    if (customer.address.city) profileUpdates.city = customer.address.city;
    if (customer.address.state) profileUpdates.state = customer.address.state;
    if (customer.address.postal_code) profileUpdates.zipcode = customer.address.postal_code;
  }
  
  // Only update if we have data to update
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
async function processCheckoutSession(session: any, supabase: any, stripe: Stripe) {
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
      // Don't fail the whole process if customer sync fails
    }
  }

  // Only process subscription mode (no more credit purchases)
  if (session.mode === "subscription") {
    await handleSubscription(session, profile, supabase, stripe);
  } else {
    console.log("ℹ️ Ignoring non-subscription checkout:", session.mode);
  }
}

// Handle subscription creation/update with new user class system
async function handleSubscription(session: any, profile: any, supabase: any, stripe: Stripe) {
  console.log("📋 Processing subscription with new user class system");

  // Get price ID from line items
  const sessionWithItems = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price"]
  });

  const priceId = sessionWithItems.line_items?.data?.[0]?.price?.id;
  console.log("📋 Subscription price ID:", priceId);

  // Map price IDs to NEW user classes (plus, pro, cohort only - core is free)
  const priceToClassMap: Record<string, string> = {
    // MultifamilyOS V2 Plus Plan  
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE') ?? '']: "plus",
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE') ?? '']: "plus",
    
    // MultifamilyOS V2 Pro Plan
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRICE') ?? '']: "pro", 
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRICE') ?? '']: "pro",
    
    // Cohort Plan
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILY_COHORT_MONTHLY_PRICE') ?? '']: "cohort",
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILY_COHORT_ANNUAL_PRICE') ?? '']: "cohort"
  };

  const assignedUserClass = priceToClassMap[priceId || ''] || "plus";
  console.log(`📋 Assigning NEW user_class: ${assignedUserClass}`);

  // Get full subscription details from Stripe if subscription exists
  if (session.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      console.log("✅ Retrieved subscription details from Stripe");

      // Insert or update subscription record
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
            webhook_version: 'v2'
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
      console.log("⚠️ Continuing with profile update...");
    }
  } else {
    console.log("⚠️ No subscription ID in session");
  }

  // Update user profile with NEW user class (no more credits field)
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

// Process invoice payment for subscription renewals
async function processInvoicePayment(invoice: any, supabase: any, stripe: Stripe) {
  console.log("🧾 Invoice payment succeeded event received");
  console.log("Invoice subscription:", invoice.subscription);
  console.log("Invoice customer:", invoice.customer);

  // Always sync customer data regardless of subscription status
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

  // Find user by stripe customer ID
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

  // Get subscription details and update record
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  console.log("📋 Retrieved subscription:", subscription.id);

  await updateSubscriptionRecord(subscription, profile, supabase);
}

// Update subscription record with new user class mapping
async function updateSubscriptionRecord(subscription: any, profile: any, supabase: any) {
  console.log("🔄 Updating subscription record with new user class system");
  
  const priceId = subscription.items.data[0]?.price?.id;

  // Map price to NEW user class (plus, pro, cohort only - core is free)
  const priceToClassMap: Record<string, string> = {
    // MultifamilyOS V2 Plus Plan
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PLUS_MONTHLY_PRICE') ?? '']: "plus",
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PLUS_ANNUAL_PRICE') ?? '']: "plus",
    
    // MultifamilyOS V2 Pro Plan
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRICE') ?? '']: "pro",
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRICE') ?? '']: "pro",
    
    // Cohort Plan
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILY_COHORT_MONTHLY_PRICE') ?? '']: "cohort",
    [Deno.env.get('NEXT_PUBLIC_MULTIFAMILY_COHORT_ANNUAL_PRICE') ?? '']: "cohort"
  };

  const assignedUserClass = priceToClassMap[priceId || ''] || "plus";

  // Update subscription record
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
        webhook_version: 'v2'
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

  // Update user profile with NEW user class (no credits field)
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
    console.log(`✅ Profile updated with NEW user class: ${assignedUserClass}`);
  }
}