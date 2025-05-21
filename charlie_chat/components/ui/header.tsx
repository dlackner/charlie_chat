"use client";

import Link from "next/link";
import Image from "next/image";
// Remove useState and useEffect if no longer needed for other purposes after this refactor.
// For now, we'll keep them in case, but the auth-specific ones are gone.
// import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Step 1: Import useAuth hook instead of creating a client here
import { useAuth } from "@/contexts/AuthContext"; // Make sure this path is correct!

export default function Header() {
  // Step 2: Get auth state and Supabase client from the useAuth hook
  const { user: currentUser, isLoading: isLoadingAuth, supabase, session } = useAuth();
  const router = useRouter();

  // Step 3: Derive isLoggedIn from the user object from context
  const isLoggedIn = !!currentUser;

  // Step 4: useEffect for auth management is GONE from this component.
  // It's now handled in AuthContext.tsx.

  // Step 5: Implement handleSignOut function using supabase instance from context
  const handleSignOut = async () => {
    if (!supabase) { // Should always exist if context is set up
        console.error("Supabase client not available for sign out.");
        return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      // User state will update via onAuthStateChange in AuthContext.
      // Redirect the user after sign out.
      router.push("/"); // Or router.push("/login");
      // router.refresh(); // Optionally call if you need to ensure server components re-fetch
                           // but be mindful if this was causing loops elsewhere.
                           // Often, onAuthStateChange updating context is enough for client components.
    }
  };

  return (
    <header className="w-full px-6 py-4 flex justify-between items-center bg-white border-b border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Logo"
            width={192}
            height={48}
            className="mr-2 cursor-pointer"
            style={{ width: '192px', height: 'auto' }}
            priority // Added priority as suggested by Next.js for LCP images
          />
        </Link>
      </div>

      {/* Right nav */}
      <div className="flex items-center space-x-6 text-sm">
        <Link href="/" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Home</Link>
        <Link href="/templates" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Templates</Link>
        <Link href="/pricing" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Pricing</Link>

        {/* Step 6: JSX uses isLoadingAuth and isLoggedIn from context */}
        {isLoadingAuth ? (
          <div className="w-24 h-9 bg-gray-200 animate-pulse rounded-lg" aria-label="Loading authentication status"></div>
        ) : isLoggedIn ? (
          <button
            onClick={handleSignOut}
            className="bg-black text-white text-sm px-4 py-2 rounded-lg 
                         hover:brightness-110 hover:scale-105 hover:shadow-lg 
                         active:scale-95 {/* Kept this for good measure, remove if you dislike the click effect */}
                         focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 {/* Subtle focus for black button */}
                         transform transition-all duration-200 ease-in-out"
          >
            Sign out
          </button>
        ) : (
          <Link href="/login">
            <button
              className="bg-black text-white text-sm px-4 py-2 rounded-lg 
                         hover:brightness-110 hover:scale-105 hover:shadow-lg 
                         active:scale-95 {/* Kept this for good measure, remove if you dislike the click effect */}
                         focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 {/* Subtle focus for black button */}
                         transform transition-all duration-200 ease-in-out"
            >
              Sign in
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}