#!/usr/bin/env node

/**
 * Stripe Customer Creation Script (New Account)
 * Creates customers in the NEW Stripe account for all users requiring migration
 * Outputs a CSV mapping file for use in subscription migration next week
 *
 * Usage: node scripts/create-stripe-customers.js
 * Requires: .env.local with STRIPE_NEW_SECRET_KEY
 */

// Load .env first, then .env.local (local overrides)
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Stripe with NEW account secret key
const stripe = new Stripe(process.env.STRIPE_NEW_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Price ID mappings (old → new)
const priceMapping = {
  'price_1SBxQEKMh85Xduh8pjkVq8ll': 'price_1TU910HzDc7fjZgK28KaxYkf', // Cohort Monthly → Pro Monthly
  'price_1RvlmpKMh85Xduh8TJNmqqg0': 'price_1TU8wbHzDc7fjZgK0dfrDcZS', // Plus Annual
  'price_1RuEkmKMh85Xduh8zAsc2wkx': 'price_1TU8vKHzDc7fjZgKKiueaD78', // Plus Monthly
  'price_1RvleOKMh85Xduh8vjZPO0XA': 'price_1TU8vKHzDc7fjZgKKiueaD78', // Plus Monthly
  'subscription_plan_2147888985': 'price_1TU8vKHzDc7fjZgKKiueaD78', // Plus Monthly (Nhan Nguyen)
  'price_1RX1DqKMh85Xduh8mk6ERHfA': 'price_1TU910HzDc7fjZgK28KaxYkf', // Pro Monthly
  'price_1RaajiKMh85Xduh8apEhflNY': 'price_1TU929HzDc7fjZgKDSFDGi3H'  // Pro Annual
};

// User class to plan name mapping
const planNames = {
  'cohort': 'Cohort → Pro',
  'plus': 'Plus',
  'pro': 'Pro'
};

async function main() {
  console.log('🚀 Starting Stripe Customer Creation for NEW Account\n');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔑 Using Stripe Secret Key: ${process.env.STRIPE_NEW_SECRET_KEY?.substring(0, 10)}...`);
  console.log(`\n${'='.repeat(80)}\n`);

  try {
    // Fetch all users who need to be migrated
    console.log('📊 Fetching users to migrate...\n');
    const { data: users, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        email,
        full_name,
        user_class,
        stripe_customer_id
      `)
      .in('user_class', ['plus', 'pro', 'cohort'])
      .order('user_class', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!users || users.length === 0) {
      throw new Error('No users found to migrate');
    }

    console.log(`✅ Found ${users.length} users to migrate\n`);

    // Get subscription details for price mapping
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, stripe_price_id, current_period_end')
      .in('user_id', users.map(u => u.user_id));

    const subMap = {};
    if (subscriptions) {
      subscriptions.forEach(sub => {
        subMap[sub.user_id] = sub;
      });
    }

    // Array to hold results
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Create customers in new Stripe account
    console.log('👥 Creating customers in new Stripe account...\n');

    for (const user of users) {
      try {
        const sub = subMap[user.user_id];
        const oldPriceId = sub?.stripe_price_id;
        const newPriceId = oldPriceId ? priceMapping[oldPriceId] : null;

        // Determine billing frequency
        let billingFrequency = 'No Subscription';
        if (sub?.current_period_end) {
          const periodStart = new Date(sub.current_period_end);
          const daysDiff = (periodStart - new Date()) / (1000 * 60 * 60 * 24);
          billingFrequency = daysDiff > 300 ? 'Annual' : 'Monthly';
        }

        // Create customer in new Stripe account
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: user.full_name || 'Unknown',
          metadata: {
            user_id: user.user_id,
            old_stripe_customer_id: user.stripe_customer_id || 'none',
            user_class: user.user_class,
            migration_date: new Date().toISOString()
          }
        });

        successCount++;

        // Log progress
        console.log(`✅ ${user.email}`);
        console.log(`   → New Customer ID: ${newCustomer.id}`);
        console.log(`   → Plan: ${planNames[user.user_class]}`);
        console.log(`   → Billing: ${billingFrequency}`);
        console.log('');

        // Store result
        results.push({
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name || '',
          user_class: user.user_class,
          old_stripe_customer_id: user.stripe_customer_id || '',
          new_stripe_customer_id: newCustomer.id,
          old_price_id: oldPriceId || '',
          new_price_id: newPriceId || '',
          billing_frequency: billingFrequency,
          created_at: new Date().toISOString()
        });

      } catch (error) {
        errorCount++;
        console.log(`❌ ${user.email}`);
        console.log(`   → Error: ${error.message}\n`);

        results.push({
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name || '',
          user_class: user.user_class,
          old_stripe_customer_id: user.stripe_customer_id || '',
          new_stripe_customer_id: 'ERROR',
          error: error.message,
          created_at: new Date().toISOString()
        });
      }
    }

    // Generate output filename
    const timestamp = new Date().toISOString().split('T')[0];
    const outputPath = path.join(process.cwd(), `stripe-customer-migration-${timestamp}.csv`);

    // Write CSV file
    console.log(`\n${'='.repeat(80)}\n`);
    console.log('📝 Writing CSV mapping file...\n');

    const csvHeader = 'user_id,email,full_name,user_class,old_stripe_customer_id,new_stripe_customer_id,old_price_id,new_price_id,billing_frequency,created_at,error\n';
    const csvRows = results.map(r =>
      `"${r.user_id}","${r.email}","${r.full_name}","${r.user_class}","${r.old_stripe_customer_id}","${r.new_stripe_customer_id}","${r.old_price_id}","${r.new_price_id}","${r.billing_frequency}","${r.created_at}","${r.error || ''}"`
    ).join('\n');

    fs.writeFileSync(outputPath, csvHeader + csvRows);

    // Summary
    console.log(`${'='.repeat(80)}\n`);
    console.log('📊 MIGRATION SUMMARY\n');
    console.log(`✅ Successfully created: ${successCount} customers`);
    console.log(`❌ Failed: ${errorCount} customers`);
    console.log(`📁 Output file: ${outputPath}`);
    console.log(`\n✨ Ready for next week! Use the CSV file to send payment update links.\n`);

  } catch (error) {
    console.error('\n🔥 Fatal Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
