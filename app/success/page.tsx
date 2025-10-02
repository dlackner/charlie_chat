/*
 * MFOS - Payment Success Page
 * Handles successful Stripe checkout completions
 * Verifies payment and updates user subscription status
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

interface PaymentVerificationResult {
  success: boolean;
  userClass?: string;
  planName?: string;
  error?: string;
}

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, supabase } = useAuth();
  const [verificationResult, setVerificationResult] = useState<PaymentVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setVerificationResult({
          success: false,
          error: 'No session ID provided'
        });
        setIsLoading(false);
        return;
      }

      if (!user) {
        setVerificationResult({
          success: false,
          error: 'User not authenticated'
        });
        setIsLoading(false);
        return;
      }

      try {
        // Verify the Stripe session exists and get session details
        const response = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Wait a moment for webhooks to process, then check user profile
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Get updated user profile to see new subscription status
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_class')
            .eq('user_id', user.id)
            .single();

          setVerificationResult({
            success: true,
            userClass: profile?.user_class,
            planName: result.planName || 'Plan'
          });
          
          // Small delay to show success message, then redirect
          setTimeout(() => {
            router.push('/dashboard/onboarding');
          }, 3000);
        } else {
          setVerificationResult({
            success: false,
            error: result.error || 'Payment verification failed'
          });
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setVerificationResult({
          success: false,
          error: 'Network error during verification'
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Verifying Payment
          </h1>
          <p className="text-gray-600">
            Please wait while we confirm your payment...
          </p>
        </div>
      </div>
    );
  }

  if (verificationResult?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-4">
            Welcome to MultifamilyOS {verificationResult.planName}! Your subscription is now active.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Redirecting you to your dashboard...
          </p>
          <button
            onClick={() => router.push('/dashboard/onboarding')}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Payment Verification Failed
        </h1>
        <p className="text-gray-600 mb-6">
          {verificationResult?.error || 'There was an issue verifying your payment. Please contact support.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/pricing')}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Return to Pricing
          </button>
          <button
            onClick={() => router.push('/account')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Go to Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Loading...
          </h1>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}