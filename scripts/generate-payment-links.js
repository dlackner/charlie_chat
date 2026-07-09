#!/usr/bin/env node

/**
 * Stripe Payment Link Generation Script
 * Creates unique Stripe Checkout Session links for each user
 * Based on the customer migration CSV file
 *
 * Usage: node scripts/generate-payment-links.js
 * Requires: stripe-customer-migration-YYYY-MM-DD.csv (output from create-stripe-customers.js)
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// Initialize Stripe with NEW account secret key
const stripe = new Stripe(process.env.STRIPE_NEW_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Price ID to plan name mapping
const priceIdToPlan = {
  'price_1TU8vKHzDc7fjZgKKiueaD78': { name: 'Plus Monthly', billing: 'Monthly' },
  'price_1TU8wbHzDc7fjZgK0dfrDcZS': { name: 'Plus Annual', billing: 'Annual' },
  'price_1TU910HzDc7fjZgK28KaxYkf': { name: 'Pro Monthly', billing: 'Monthly' },
  'price_1TU929HzDc7fjZgKDSFDGi3H': { name: 'Pro Annual', billing: 'Annual' }
};

function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push(record);
  }

  return records;
}

async function main() {
  console.log('🔗 Starting Payment Link Generation\n');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`\n${'='.repeat(80)}\n`);

  try {
    // Find the CSV file (most recent)
    const files = fs.readdirSync('.')
      .filter(f => f.startsWith('stripe-customer-migration-'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error('No migration CSV file found. Run create-stripe-customers.js first.');
    }

    const csvFile = files[0];
    console.log(`📂 Reading CSV: ${csvFile}\n`);

    // Read CSV
    const customers = readCSV(csvFile);
    console.log(`✅ Loaded ${customers.length} customers\n`);

    // Base URL for success/cancel redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://multifamilyos.ai';
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing`;

    // Generate payment links
    console.log('🔗 Creating checkout sessions...\n');
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const customer of customers) {
      try {
        // Skip if no new price ID
        if (!customer.new_price_id) {
          console.log(`⚠️ ${customer.email} - No price ID (no subscription)`);
          results.push({
            user_id: customer.user_id,
            email: customer.email,
            full_name: customer.full_name,
            new_stripe_customer_id: customer.new_stripe_customer_id,
            new_price_id: customer.new_price_id || '',
            plan: 'N/A',
            payment_link: 'N/A',
            status: 'No subscription'
          });
          continue;
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          customer: customer.new_stripe_customer_id,
          mode: 'subscription',
          line_items: [
            {
              price: customer.new_price_id,
              quantity: 1
            }
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            user_id: customer.user_id,
            migration: 'true'
          }
        });

        successCount++;
        const planInfo = priceIdToPlan[customer.new_price_id] || { name: 'Unknown', billing: 'Unknown' };

        console.log(`✅ ${customer.email}`);
        console.log(`   → Plan: ${planInfo.name}`);
        console.log(`   → Link: ${session.url}\n`);

        results.push({
          user_id: customer.user_id,
          email: customer.email,
          full_name: customer.full_name,
          new_stripe_customer_id: customer.new_stripe_customer_id,
          new_price_id: customer.new_price_id,
          plan: planInfo.name,
          billing_frequency: planInfo.billing,
          payment_link: session.url,
          session_id: session.id,
          status: 'ready'
        });

      } catch (error) {
        errorCount++;
        console.log(`❌ ${customer.email}`);
        console.log(`   → Error: ${error.message}\n`);

        results.push({
          user_id: customer.user_id,
          email: customer.email,
          full_name: customer.full_name,
          new_stripe_customer_id: customer.new_stripe_customer_id,
          new_price_id: customer.new_price_id,
          payment_link: 'ERROR',
          status: error.message
        });
      }
    }

    // Write results CSV
    console.log(`\n${'='.repeat(80)}\n`);
    console.log('📝 Writing payment links CSV...\n');

    const timestamp = new Date().toISOString().split('T')[0];
    const outputPath = path.join(process.cwd(), `stripe-payment-links-${timestamp}.csv`);

    const csvHeader = 'user_id,email,full_name,plan,billing_frequency,payment_link,session_id,status\n';
    const csvRows = results.map(r =>
      `"${r.user_id}","${r.email}","${r.full_name}","${r.plan}","${r.billing_frequency}","${r.payment_link}","${r.session_id || ''}","${r.status}"`
    ).join('\n');

    fs.writeFileSync(outputPath, csvHeader + csvRows);

    // Summary
    console.log(`${'='.repeat(80)}\n`);
    console.log('📊 PAYMENT LINK GENERATION SUMMARY\n');
    console.log(`✅ Successfully created: ${successCount} payment links`);
    console.log(`❌ Failed: ${errorCount} payment links`);
    console.log(`📁 Output file: ${outputPath}`);
    console.log(`\n✨ Ready to send payment update emails next week!\n`);

  } catch (error) {
    console.error('\n🔥 Fatal Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
