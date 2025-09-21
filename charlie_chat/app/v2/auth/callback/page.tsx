/*
 * CHARLIE2 V2 - Auth Callback Handler
 * Handles magic link authentication callbacks for V2 signup and login flows
 * Processes PKCE code exchange and redirects to appropriate V2 dashboard pages
 * Part of the new V2 application architecture
 */
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function AuthCallbackContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const finish = async () => {
      try {
        // 1. Handle PKCE/magic link callback via ?code=
        const code = search.get('code');
        if (code) {
          console.log('Exchanging code for session...');
          await supabase.auth.exchangeCodeForSession(code);
        }

        // 2. Handle explicit session tokens from query
        const access_token = search.get('access_token');
        const refresh_token = search.get('refresh_token');
        if (access_token && refresh_token) {
          console.log('Setting session manually...');
          await supabase.auth.setSession({ access_token, refresh_token });
        }

        // 3. Wait for session to be available
        for (let i = 0; i < 10; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('Session active, redirecting to V2 onboarding...');
            
            // Check for affiliate customer ID (optional)
            const affiliateCustomerId = search.get('affiliate_customer');
            if (affiliateCustomerId) {
              try {
                // Calculate trial end date using MAX_TRIAL_DAYS
                const maxTrialDays = parseInt(process.env.NEXT_PUBLIC_MAX_TRIAL_DAYS || '7');
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + maxTrialDays);
                
                // Update user profile with affiliate info and trial end date
                await supabase
                  .from('profiles')
                  .update({
                    stripe_customer_id: affiliateCustomerId,
                    affiliate_sale: true,
                    user_class: 'trial',
                    trial_end_date: trialEndDate.toISOString()
                  })
                  .eq('user_id', session.user.id);
                
                console.log('✅ Affiliate user setup completed with trial end:', trialEndDate.toISOString());
              } catch (error) {
                console.error('❌ Error setting up affiliate user:', error);
              }
            }
            
            // Redirect to V2 onboarding for new users
            router.replace('/v2/dashboard/onboarding');
            return;
          }
          await new Promise(res => setTimeout(res, 200));
        }

        console.warn('Session still not available. Redirecting to V2 login.');
        router.replace('/v2/loginnew');
      } catch (err) {
        console.error('Error completing auth callback:', err);
        router.replace('/v2/loginnew');
      }
    };

    finish();
  }, [supabase, router, search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-700">Setting up your account...</p>
      </div>
    </div>
  );
}

function AuthCallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
        </div>
        <p className="text-sm text-gray-700">Loading authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<AuthCallbackLoading />}>
      <AuthCallbackContent />
    </Suspense>
  );
}