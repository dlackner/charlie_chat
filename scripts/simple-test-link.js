#!/usr/bin/env node

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_NEW_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

async function createSimpleLink() {
  try {
    console.log('🧪 Creating SIMPLE test link\n');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1TU8vKHzDc7fjZgKKiueaD78', // Plus Monthly
          quantity: 1
        }
      ],
      success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/pricing'
    });

    console.log('🔗 Test Link:');
    console.log(session.url);
    console.log('\n✨ Copy and paste this into your browser\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSimpleLink();
