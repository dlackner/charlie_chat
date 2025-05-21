"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// Step 1: Import createBrowserClient (or your utility function)
// If using the utility file:
// import { createSupabaseBrowserClient } from '@/lib/supabase/client';
// For direct use in this example:
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  const [email, setEmail] = useState(""); // Default for testing, remove for production
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); // Use string | null for error
  const router = useRouter();

  // Step 2: Initialize the Supabase client
  // If using the utility file:
  // const supabase = createSupabaseBrowserClient();
  // For direct use:
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Reset error before new attempt

    // Step 3: Use Supabase's signInWithPassword
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message); // Display Supabase error message
    } else {
      // Successful login
      // Supabase handles session cookies automatically via @supabase/ssr middleware (see Step 7)
      // You might want to refresh the page or navigate to ensure the session is recognized server-side if needed
      // or rely on Supabase's onAuthStateChange for real-time updates.
      router.push("/"); // Redirect to home after login
      router.refresh(); // Good practice to refresh server components after auth change
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Login to Charlie Chat</h1>
        <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out transform hover:scale-105 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 hover:shadow-lg active:scale-95"
          >
            Sign In
          </button>
        </form>
        {/* Optional: Add a link to a sign-up page */}
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}