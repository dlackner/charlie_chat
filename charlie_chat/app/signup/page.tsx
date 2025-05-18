"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// Assuming you have this utility file from the login page example:
import { createSupabaseBrowserClient } from '@/lib/supabase/client'; // Adjust path if needed

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createSupabaseBrowserClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Optional: Add password confirmation and other validation here

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      // You can add options here, for example, to redirect the user
      // to a specific page after they confirm their email.
      // options: {
      //   emailRedirectTo: `${window.location.origin}/`, // Redirect to home after confirmation
      // }
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      // Check if user object exists and if email confirmation is required.
      // Supabase returns a user object here, but the session is typically null
      // until the email is confirmed if email confirmations are enabled.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        // This condition might indicate an issue like the user already exists but is unconfirmed.
        // Supabase's error handling has improved, so signUpError should usually catch this.
        // For specific "User already registered" errors, Supabase often returns a specific error message.
        setError("An issue occurred during sign up. The user might already exist or there's a configuration problem.");
      } else if (data.user) {
        // By default, Supabase sends a confirmation email.
        // Inform the user to check their email.
        setSuccessMessage(
          "Success! Please check your email for a confirmation link to complete your registration."
        );
        // You might want to clear the form or redirect to a page
        // that tells them to check their email.
        // router.push('/check-email-notice');
        setEmail(""); // Clear form
        setPassword("");
      } else {
        // Fallback, though data.user should exist on successful sign-up intent
         setError("An unexpected issue occurred during sign up. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Create your Charlie Chat Account</h1>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}
          <button
            type="submit"
            className="w-full bg-black hover:bg-gray-900 text-white py-2 rounded transition duration-150 ease-in-out"
          >
            Sign Up
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}