"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function SignUpContent() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false); // Renamed for clarity
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createSupabaseBrowserClient();
  
  // Check for affiliate customer parameter
  const affiliateCustomerId = searchParams.get('affiliate_customer');
  const autoSignup = searchParams.get('auto_signup');
  const emailParam = searchParams.get('email');

  // Auto-trigger signup for affiliate users
  useEffect(() => {
    if (autoSignup && affiliateCustomerId && emailParam) {
      setEmail(emailParam);
      // Automatically send magic link
      const autoSubmit = async () => {
        setError(null);
        
        const redirectUrl = `${window.location.origin}/auth/callback?affiliate_customer=${affiliateCustomerId}`;

        const { error: signUpError } = await supabase.auth.signInWithOtp({
          email: emailParam,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectUrl
          }
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setLinkSent(true);
          
          // Add affiliate tracking
          if (typeof window !== 'undefined' && (window as any).gr) {
            (window as any).gr('track', 'conversion', { email: emailParam });
          }
        }
      };
      
      autoSubmit();
    }
  }, [autoSignup, affiliateCustomerId, emailParam, supabase]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Prepare redirect URL with affiliate info if present
    const redirectUrl = affiliateCustomerId 
      ? `${window.location.origin}/auth/callback?affiliate_customer=${affiliateCustomerId}`
      : `${window.location.origin}/auth/callback`;

    // Send magic link (OTP via email) for passwordless signup
    const { error: signUpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Creates user if they don't exist
        emailRedirectTo: redirectUrl
      }
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setLinkSent(true); // Show success message
      
      // Add affiliate tracking
      if (typeof window !== 'undefined' && (window as any).gr) {
        (window as any).gr('track', 'conversion', { email: email });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Sign Up with Charlie Chat</h1>
        
        {!linkSent ? (
          // Show sign up form
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-600">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            
            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out transform hover:scale-105 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 hover:shadow-lg active:scale-95"
            >
              Send Confirmation Link
            </button>
          </form>
        ) : (
          // Show success message only
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-700">
              A confirmation link has been sent to <strong>{email}</strong>. Click the link to complete your registration.
            </p>
            <div className="text-xs text-gray-500">
              <p>Didn't receive the email? Check your spam folder.</p>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-orange-600 hover:underline">
            Log In
          </a>
        </p>
      </div>
    </div>
  );
}

function SignUpLoading() {
  return (
    <div className="min-h-screen flex items-start justify-center pt-24 bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
        <p className="text-center text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpLoading />}>
      <SignUpContent />
    </Suspense>
  );
}