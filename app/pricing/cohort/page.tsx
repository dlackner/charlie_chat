/*
 * MFOS Cohort Pricing Page
 * Private pricing page for approved cohort members
 * Accessed via direct link after external application approval
 */
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Users, Star, Crown } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function CohortPricingPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const supabaseClient = createSupabaseBrowserClient();

  const handleCheckout = async () => {
    if (!user) {
      // Redirect to sign up if not authenticated
      window.location.href = '/';
      return;
    }

    setIsLoading(true);

    try {
      const priceId = billingCycle === 'annual' 
        ? process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_ANNUAL_PRICE
        : process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_MONTHLY_PRICE;

      const productId = billingCycle === 'annual'
        ? process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_ANNUAL_PRODUCT
        : process.env.NEXT_PUBLIC_MULTIFAMILY_COHORT_MONTHLY_PRODUCT;

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          productId,
          userId: user.id,
          successUrl: `${window.location.origin}/dashboard/headlines`,
          cancelUrl: `${window.location.origin}/pricing/cohort`,
          plan: billingCycle,
          customerEmail: user.email
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        console.error('Checkout error:', error);
        return;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cohortFeatures = [
    'Everything in Pro Plan',
    'Exclusive cohort program access',
    'Weekly group coaching sessions',
    'Private community forum',
    'Direct Access to Charles Dobens (including cell phone)',
    'Legal Document Reviews',
    'Debt Lender Assistance',
    'Access to Key Principals'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg">
              <Crown className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            MultifamilyOS <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Cohort</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Exclusive membership for serious multifamily investors. Join an elite community of high-performing real estate professionals.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                billingCycle === 'monthly' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                billingCycle === 'annual' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        {/* Cohort Pricing Card */}
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 overflow-hidden relative">
            {/* Premium Badge */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-3">
              <div className="flex items-center justify-center gap-2">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-semibold">EXCLUSIVE COHORT ACCESS</span>
                <Star className="w-5 h-5 fill-current" />
              </div>
            </div>

            <div className="p-8">
              {/* Pricing */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-gray-900">
                    ${billingCycle === 'annual' ? '250' : '297'}
                  </span>
                  <span className="text-xl text-gray-600">
                    /{billingCycle === 'annual' ? 'month' : 'month'}
                  </span>
                </div>
                {billingCycle === 'annual' && (
                  <div className="text-sm text-green-600 font-medium">
                    Billed annually ($3,000/year) • Save $564
                  </div>
                )}
                {billingCycle === 'monthly' && (
                  <div className="text-sm text-gray-500">
                    Billed monthly
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {cohortFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg"
              >
                {isLoading ? 'Processing...' : 'Get Access'}
              </button>

            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="max-w-3xl mx-auto mt-16">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-4 mb-6">
              <Users className="w-8 h-8 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">What Makes Cohort Special?</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Exclusive Community</h3>
                <p>Connect with vetted, serious investors who are actively building multifamily portfolios.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Expert Guidance</h3>
                <p>Direct access to experienced instructors and industry professionals for personalized advice.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Accelerated Learning</h3>
                <p>Structured curriculum and workshops designed to fast-track your multifamily investment success.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Network Effects</h3>
                <p>Build relationships that lead to deals, partnerships, and long-term business opportunities.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}