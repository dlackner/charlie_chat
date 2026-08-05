'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import DirectCheckoutModal from '@/components/pricing/DirectCheckoutModal';

const PRO_MONTHLY = process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_MONTHLY_PRODUCT!;
const PRO_ANNUAL = process.env.NEXT_PUBLIC_MULTIFAMILYOS_PRO_ANNUAL_PRODUCT!;

function ProSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const isAnnual = searchParams.get('plan') === 'annual';

  const handleClose = () => {
    router.push('/');
  };

  const handleDirectSignup = async (email: string, planType: 'monthly' | 'annual') => {
    setIsLoading(true);

    try {
      const finalProductId = planType === 'monthly' ? PRO_MONTHLY : PRO_ANNUAL;

      const response = await fetch('/api/auth/direct-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          userClass: 'pro'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store checkout params in sessionStorage
        sessionStorage.setItem('pendingCheckout', JSON.stringify({
          productId: finalProductId,
          planType: planType
        }));

        // Close modal but keep loading state
        setIsOpen(false);

        // If we have a hashed token, use it to authenticate
        if (result.hashedToken) {
          const { error: signInError } = await supabase.auth.verifyOtp({
            token_hash: result.hashedToken,
            type: 'magiclink',
          });

          if (!signInError) {
            // Proceed to checkout
            const res = await fetch("/api/stripe/checkout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ productId: finalProductId, plan: planType, mode: "subscription" }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data.url) {
                // Store product type in sessionStorage for success page
                if (data.productType) {
                  sessionStorage.setItem('checkoutProduct', data.productType);
                }
                window.location.replace(data.url);
              }
            }
          }
        }
      } else {
        alert(result.error || 'Account creation failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DirectCheckoutModal
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={handleDirectSignup}
        selectedPlan="pro"
        initialPlanType={isAnnual ? 'annual' : 'monthly'}
        isLoading={isLoading}
      />
    </div>
  );
}

export default function ProSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ProSignupContent />
    </Suspense>
  );
}
