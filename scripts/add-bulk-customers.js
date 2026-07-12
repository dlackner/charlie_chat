#!/usr/bin/env node

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_NEW_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

const customers = [
  { name: 'Kenneth Lynch', email: 'cougtach11@aol.com', plan: 'pro' },
  { name: 'Spencer Leech', email: 'captn-apts@usa.net', plan: 'pro' }
];

async function addCustomers() {
  try {
    console.log('🔗 Creating customers and payment links\n');
    console.log(`${'='.repeat(80)}\n`);

    const results = [];

    for (const cust of customers) {
      try {
        // Create customer
        const customer = await stripe.customers.create({
          email: cust.email,
          name: cust.name,
          metadata: {
            migration_date: new Date().toISOString()
          }
        });

        console.log(`✅ ${cust.name}`);
        console.log(`   Customer ID: ${customer.id}`);

        // Create checkout session for Pro Monthly
        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          mode: 'subscription',
          line_items: [
            {
              price: 'price_1TU910HzDc7fjZgK28KaxYkf', // Pro Monthly (NEW)
              quantity: 1
            }
          ],
          success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
          metadata: {
            user_email: cust.email,
            migration: 'true'
          }
        });

        console.log(`   Plan: Pro Monthly`);
        console.log(`   Link: ${session.url}\n`);

        results.push({
          name: cust.name,
          email: cust.email,
          customer_id: customer.id,
          plan: 'Pro Monthly',
          session_id: session.id,
          payment_link: session.url,
          status: 'ready'
        });

      } catch (error) {
        console.log(`❌ ${cust.name}`);
        console.log(`   Error: ${error.message}\n`);

        results.push({
          name: cust.name,
          email: cust.email,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`${'='.repeat(80)}\n`);
    console.log('✨ Done! 2 customers created with Pro Monthly links.\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    process.exit(1);
  }
}

addCustomers();
