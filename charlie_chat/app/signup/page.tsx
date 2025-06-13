"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Only for final success
  const [otpSent, setOtpSent] = useState(false); // New state to control flow
  const router = useRouter();

  const supabase = createSupabaseBrowserClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null); // Clear messages on new submission

    if (!otpSent) {
      // Step 1: Send OTP to email for sign-up (pure OTP - no emailRedirectTo)
      const { error: signInError } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,
    emailRedirectTo: 'http://localhost:3000/dashboard' // or wherever you want to redirect after login
        },
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        // No successMessage here. The conditional <p> tag will show "OTP sent"
        setOtpSent(true); // Move to OTP verification step
      }
    } else {
      // Step 2: Verify OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup', // Specify 'signup' type for explicit sign-up verification
      });

      if (verifyError) {
        setError(verifyError.message);
      } else {
        setSuccessMessage("Registration complete! You are now signed in."); // Only set on final successful sign-up
        // Optionally redirect the user after successful sign-up/sign-in
        router.push('/dashboard'); 
        // Clear fields after successful sign-up
        setEmail("");
        setOtp("");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Sign Up with Charlie Chat</h1>
        <form onSubmit={handleSignUp} className="space-y-4">
          {!otpSent ? (
            // Show email input when OTP has not been sent yet
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
          ) : (
            // Show OTP input after OTP has been sent
            <div>
              <p className="text-sm text-gray-700 mb-2">
                A confirmation email has been sent to {email}. Check your junk folder if you don't see it.
              </p>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-600">
                Login Code
              </label>
              <input
                id="otp"
                type="text" // OTPs are typically text or number
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter Code"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {/* successMessage is now only shown after final successful sign-up */}
          {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}
          
          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out transform hover:scale-105 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 hover:shadow-lg active:scale-95"
          >
            {!otpSent ? "Send Code" : "Verify Code"}
          </button>
        </form>
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