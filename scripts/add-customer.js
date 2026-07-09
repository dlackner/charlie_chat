#!/usr/bin/env node

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_NEW_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

async function addCustomer() {
  try {
    console.log('🔗 Creating customer and payment link\n');

    // Create customer
    const customer = await stripe.customers.create({
      email: 'dlackner@hotmail.com',
      name: 'Daniel Lackner',
      metadata: {
        user_role: 'admin',
        migration_date: new Date().toISOString()
      }
    });

    console.log(`✅ Created customer: ${customer.id}`);
    console.log(`   Email: ${customer.email}`);
    console.log(`   Name: ${customer.name}\n`);

    // Create checkout session for Plus Monthly
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1TU8vKHzDc7fjZgKKiueaD78', // Plus Monthly (NEW)
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      metadata: {
        user_email: 'dlackner@hotmail.com',
        migration: 'true'
      }
    });

    console.log('📊 Payment Link Details\n');
    console.log(`Customer ID: ${customer.id}`);
    console.log(`Plan: Plus Monthly`);
    console.log(`Email: dlackner@hotmail.com`);
    console.log(`Name: Daniel Lackner`);
    console.log(`Session ID: ${session.id}`);
    console.log(`\n🔗 Payment Link:`);
    console.log(session.url);
    console.log('\n✨ Ready to go!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addCustomer();
