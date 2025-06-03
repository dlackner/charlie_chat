import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const priceId = session.items?.[0]?.price?.id || null;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profileError || !profile) {
          console.error('🚫 User not found for Stripe customer:', customerId);
          break;
        }

        await supabase.from('subscriptions').insert({
          user_id: profile.user_id,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          status: session.payment_status || 'unknown',
          created_at: new Date().toISOString(),
        });

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profileError || !profile) {
          console.error('🚫 User not found for customer.subscription event:', customerId);
          break;
        }

        const subData = {
          stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
          status: subscription.status,
          current_period_start: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : null,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          ended_at: subscription.ended_at
            ? new Date(subscription.ended_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
          metadata: subscription.metadata,
        };

        await supabase.from('subscriptions').upsert(
          {
            user_id: profile.user_id,
            stripe_subscription_id: subscription.id,
            ...subData,
          },
          {
            onConflict: 'stripe_subscription_id',
          }
        );

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('🔥 Webhook handler error:', error.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}