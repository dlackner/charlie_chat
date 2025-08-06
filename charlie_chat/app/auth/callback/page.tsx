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
          //console.log('Exchanging code for session...');
          await supabase.auth.exchangeCodeForSession(code);
        }

        // 2. Handle explicit session tokens from query
        const access_token = search.get('access_token');
        const refresh_token = search.get('refresh_token');
        if (access_token && refresh_token) {
          //console.log('Setting session manually...');
          await supabase.auth.setSession({ access_token, refresh_token });
        }

        // 3. Wait for session to be available
        for (let i = 0; i < 10; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            //console.log('Session active, processing affiliate info...');
            
            // Check for affiliate customer ID
            const affiliateCustomerId = search.get('affiliate_customer');
            if (affiliateCustomerId) {
              try {
                // Calculate trial end date using MAX_TRIAL_DAYS
                const maxTrialDays = parseInt(process.env.NEXT_PUBLIC_MAX_TRIAL_DAYS || '14');
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + maxTrialDays);
                
                // Update user profile with affiliate info and trial end date
                await supabase
                  .from('profiles')
                  .update({
                    stripe_customer_id: affiliateCustomerId,
                    affiliate_sale: true,
                    credits: 250, // Give them trial credits
                    user_class: 'trial',
                    trial_end_date: trialEndDate.toISOString()
                  })
                  .eq('user_id', session.user.id);
                
                console.log('✅ Affiliate user setup completed with trial end:', trialEndDate.toISOString());
              } catch (error) {
                console.error('❌ Error setting up affiliate user:', error);
              }
            }
            
            router.replace('/');
            return;
          }
          await new Promise(res => setTimeout(res, 200));
        }

        console.warn('Session still not available. Redirecting to login.');
        router.replace('/login');
      } catch (err) {
        console.error('Error completing auth callback:', err);
        router.replace('/login');
      }
    };

    finish();
  }, [supabase, router, search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-sm text-gray-700">Setting up your account…</p>
    </div>
  );
}

function AuthCallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-sm text-gray-700">Loading authentication...</p>
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