#!/usr/bin/env node

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');

// Use TEST key
const stripe = new Stripe(process.env.STRIPE_NEW_SECRET_KEY_TEST, {
  apiVersion: '2023-10-16'
});

async function createTestLink() {
  try {
    console.log('🧪 Creating TEST payment link\n');
    console.log(`Using test key: ${process.env.STRIPE_NEW_SECRET_KEY_TEST?.substring(0, 20)}...\n`);

    // Create test checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1TU8vKHzDc7fjZgKKiueaD78', // Plus Monthly (NEW)
          quantity: 1
        }
      ],
      customer_email: 'dlackner@hotmail.com',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      metadata: {
        user_email: 'dlackner@hotmail.com',
        test: 'true'
      }
    });

    console.log('📊 TEST Payment Link\n');
    console.log(`Mode: TEST (use test cards, no real charges)`);
    console.log(`Plan: Plus Monthly`);
    console.log(`Email: dlackner@hotmail.com`);
    console.log(`Session ID: ${session.id}`);
    console.log(`\n🔗 Test Payment Link:`);
    console.log(session.url);
    console.log(`\n💳 Use this test card: 4242 4242 4242 4242`);
    console.log(`Any future exp date, any CVC\n`);
    console.log('✨ Ready to test!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestLink();
