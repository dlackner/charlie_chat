/*
 * CHARLIE2 - Auth Callback Handler
 * Handles magic link authentication callbacks for signup and login flows
 * Processes PKCE code exchange and redirects to appropriate dashboard pages
 * Part of the new application architecture
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
          await supabase.auth.exchangeCodeForSession(code);
        }

        // 2. Handle explicit session tokens from query
        const access_token = search.get('access_token');
        const refresh_token = search.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }

        // 3. Wait for session to be available
        for (let i = 0; i < 10; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            
            // Get user profile (with retry for race condition with handle_new_user function)
            let profile = null;
            let profileError = null;
            let retryCount = 0;
            
            // Retry up to 3 times with delays to handle race condition
            while (!profile && retryCount < 3) {
              const result = await supabase
                .from('profiles')
                .select('user_id, user_class, created_at, stripe_customer_id')
                .eq('user_id', session.user.id)
                .single();
                
              profile = result.data;
              profileError = result.error;
              
              if (!profile && retryCount < 2) {
                await new Promise(res => setTimeout(res, 500));
              }
              retryCount++;
            }
            
            // If profile doesn't exist, create it (new user)
            if (!profile) {
              
              // Calculate trial end date using MAX_TRIAL_DAYS
              const maxTrialDays = parseInt(process.env.NEXT_PUBLIC_MAX_TRIAL_DAYS || '7');
              const trialEndDate = new Date();
              trialEndDate.setDate(trialEndDate.getDate() + maxTrialDays);
              
              const newProfile: {
                user_id: string;
                user_class: string;
                trial_end_date: string;
                created_at: string;
                stripe_customer_id?: string;
                affiliate_sale?: boolean;
              } = {
                user_id: session.user.id,
                user_class: 'trial',
                trial_end_date: trialEndDate.toISOString(),
                created_at: new Date().toISOString()
              };
              
              // Check for affiliate customer ID (optional)
              const affiliateCustomerId = search.get('affiliate_customer');
              if (affiliateCustomerId) {
                newProfile.stripe_customer_id = affiliateCustomerId;
                newProfile.affiliate_sale = true;
              }
              
              const { error: insertError } = await supabase
                .from('profiles')
                .insert([newProfile]);
              
              if (insertError) {
                console.error('Error creating user profile:', insertError);
              }
              
              // New users always go to onboarding
              router.replace('/dashboard/onboarding');
              return;
            }
            
            // Existing user - check for affiliate customer ID in case they're upgrading
            const affiliateCustomerId = search.get('affiliate_customer');
            if (affiliateCustomerId && !profile.stripe_customer_id) {
              try {
                await supabase
                  .from('profiles')
                  .update({
                    stripe_customer_id: affiliateCustomerId,
                    affiliate_sale: true
                  })
                  .eq('user_id', session.user.id);
                
              } catch (error) {
                console.error('Error updating user with affiliate info:', error);
              }
            }
            
            // ALL trial users go to onboarding (no time restriction)
            if (profile.user_class === 'trial') {
              router.replace('/dashboard/onboarding');
              return;
            }
            
            // Core users go to community page
            if (profile.user_class === 'core') {
              router.replace('/dashboard/community');
              return;
            }
            
            // All other existing users (plus, pro) go to headlines
            router.replace('/dashboard/headlines');
            return;
          }
          await new Promise(res => setTimeout(res, 200));
        }

        router.replace('/');
      } catch (err) {
        console.error('Error completing auth callback:', err);
        router.replace('/');
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