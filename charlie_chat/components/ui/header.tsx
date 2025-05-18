"use client";

// Step 1: Remove next-auth imports
// import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // For navigation after sign out, if needed

// Step 2: Import Supabase client and User type
import { createSupabaseBrowserClient } from '@/lib/supabase/client'; // Adjust path if needed
import type { User } from '@supabase/supabase-js';

export default function Header() {
  // Step 1: Remove useSession hook
  // const { data: session } = useSession();

  // Step 3: Initialize Supabase client and state for Supabase user
  const supabase = createSupabaseBrowserClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();

  // Step 4: Derive isLoggedIn from currentUser
  const isLoggedIn = !!currentUser;

  // Step 5: useEffect to manage Supabase auth state
  useEffect(() => {
    setIsLoadingAuth(true);
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null);
      setIsLoadingAuth(false);
      // Optional: You might want to refresh parts of your app or redirect on auth changes
      // if (event === 'SIGNED_OUT') router.push('/');
      // if (event === 'SIGNED_IN') router.refresh(); // if you have server components depending on auth
    });

    // Fetch initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
      setIsLoadingAuth(false);
    };
    getInitialSession();

    return () => {
      authListener?.unsubscribe();
    };
  }, [supabase]); // supabase can be a dependency if its creation is memoized or stable

  // Step 6: Implement handleSignOut function
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      // setCurrentUser(null) will be handled by onAuthStateChange
      // Optionally redirect the user after sign out
      router.push("/"); // Or router.push("/login");
    }
  };

  return (
    <header className="w-full px-6 py-4 flex justify-between items-center bg-white border-b border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center">
        <Link href="/"> {/* Make logo clickable, linking to home */}
            <Image src="/logo.png" alt="Logo" width={192} height={48} // Adjusted height for typical logo aspect
                   className="mr-2 cursor-pointer" style={{width: '192px', height: 'auto'}}/>
        </Link>
      </div>

      {/* Right nav */}
      <div className="flex items-center space-x-6 text-sm">
        <Link href="/" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Home</Link>
        <Link href="/templates" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Templates</Link>
        <Link href="/pricing" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Pricing</Link>

        {/* Step 7: Update JSX based on isLoggedIn (from Supabase) */}
        {isLoadingAuth ? (
          // Optional: Show a loading state or a placeholder to prevent flicker
          <div className="w-24 h-9 bg-gray-200 animate-pulse rounded-lg"></div>
        ) : isLoggedIn ? (
          <button
            onClick={handleSignOut} // Use the new sign out handler
            className="bg-gray-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Sign out
          </button>
        ) : (
          <Link href="/login">
            <button className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:brightness-110 transition">
              Sign in
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}