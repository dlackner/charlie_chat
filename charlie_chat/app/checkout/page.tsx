"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function CheckoutContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const startCheckout = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setError("You're not logged in. Please sign up or log in again.");
        setLoading(false);
        return;
      }

      // --- Get the actual user ID (UUID) from the session ---
      const userId = sessionData.session.user.id;
      if (!userId) {
        setError("User ID not found in session. Please log in again.");
        setLoading(false);
        return;
      }
      //console.log("Supabase User ID:", userId); // Log to confirm it's a UUID

      const plan = searchParams.get('plan') || sessionStorage.getItem('selectedPlan');
      if (!plan) {
        setError('Missing plan information.');
        setLoading(false);
        return;
      }

      const [productId, billing] = mapPlanToStripe(plan);
      if (!productId || !billing) {
        setError('Invalid plan format.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          plan: billing,
          userId: userId, // <-- ADD THIS LINE
        }),
      });

      const data = await response.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Checkout session creation failed.');
        setLoading(false);
      }
    };

    startCheckout();
  }, [searchParams]); // Add searchParams to dependencies if you use it inside

  const mapPlanToStripe = (planString: string): [string, 'monthly' | 'annual'] => {
    switch (planString) {
      case 'charlie_chat_monthly':
        return [process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT!, 'monthly'];
      case 'charlie_chat_annual':
        return [process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRODUCT!, 'annual'];
      case 'charlie_chat_pro_monthly':
        return [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRODUCT!, 'monthly'];
      case 'charlie_chat_pro_annual':
        return [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRODUCT!, 'annual'];
      case 'cohort_monthly':
        return [process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRODUCT!, 'monthly'];
      case 'cohort_annual':
        return [process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRODUCT!, 'annual'];
      case 'charlie_chat_100_searches':
        return [process.env.NEXT_PUBLIC_CHARLIE_CHAT_100_SEARCHES_PRODUCT!, 'monthly']; // Assuming this is correct
      default:
        return ['', 'monthly'];
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      {loading && (
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800">Redirecting to secure checkout...</h1>
          <p className="text-gray-500 mt-2">Please wait while we set up your Stripe session.</p>
        </div>
      )}
      {error && (
        <div className="bg-white p-6 rounded shadow-md text-center">
          <h2 className="text-red-600 text-lg font-bold">Checkout Failed</h2>
          <p className="text-gray-700 mt-2">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            onClick={() => router.push('/pricing')}
          >
            Go Back to Pricing
          </button>
        </div>
      )}
    </div>
  );
}

function CheckoutLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-800">Loading checkout...</h1>
        <p className="text-gray-500 mt-2">Please wait...</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}