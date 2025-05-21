"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const { user: currentUser, isLoading: isLoadingAuth, supabase, session } = useAuth();
  const router = useRouter();

  const isLoggedIn = !!currentUser;

  const handleSignOut = async () => {
    if (!supabase) { 
        console.error("Supabase client not available for sign out.");
        return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      router.push("/");
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
            priority
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