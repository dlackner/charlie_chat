"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { User, ChevronDown, Settings, Heart, LogOut, LogIn, Star, Home } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useMyPropertiesAccess } from "@/app/my-properties/components/useMyPropertiesAccess";

export default function Header() {
  const { user: currentUser, isLoading: isLoadingAuth, supabase, session } = useAuth();
  const { hasAccess, isLoading: isLoadingAccess, userClass, checkTrialUserCredits } = useMyPropertiesAccess();
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!currentUser;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    if (!supabase) { 
        console.error("Supabase client not available for sign out.");
        return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      setShowAccountMenu(false);
      router.push("/");
    }
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    setShowAccountMenu(false);
  };

  const handleMyPropertiesClick = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    
    // Let the useMyPropertiesAccess hook handle all access logic including grace period
    if (!hasAccess) {
      router.push("/pricing");
      return;
    }
    
    router.push("/my-properties");
  };

  // Determine button styling and tooltip
  const getMyPropertiesButtonState = () => {
    if (!isLoggedIn) {
      return {
        className: "text-gray-800 hover:bg-gray-100",
        tooltip: "Sign in to access My Properties",
        showAsterisk: true,
        showProLabel: false
      };
    }

    if (isLoadingAccess) {
      return {
        className: "text-gray-800 opacity-50",
        tooltip: "Loading...",
        showAsterisk: false,
        showProLabel: false
      };
    }

    if (hasAccess) {
      return {
        className: "text-gray-800 hover:bg-gray-100",
        tooltip: "View your saved properties",
        showAsterisk: false,
        showProLabel: false
      };
    }

    // User doesn't have access
    return {
      className: "text-gray-400 cursor-not-allowed",
      tooltip: userClass === "trial" 
        ? "Upgrade to Pro or Cohort to access My Properties" 
        : "Upgrade to Pro or Cohort to access My Properties",
      showAsterisk: false,
      showProLabel: false
    };
  };

  const buttonState = getMyPropertiesButtonState();

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
        
        {/* My Properties */}
        <button
          onClick={handleMyPropertiesClick}
          disabled={isLoggedIn && isLoadingAccess}
          className={`flex items-center space-x-1 transition rounded-md px-3 py-1 font-medium ${buttonState.className} ${isLoadingAccess ? "opacity-50" : ""}`}
          title={buttonState.tooltip}
        >
          <Star size={14} />
          <span>My Properties</span>
          {buttonState.showAsterisk && <span className="text-xs text-gray-500 ml-1">*</span>}
          {buttonState.showProLabel && <span className="text-xs text-orange-500 ml-1">Pro</span>}
        </button>
        
        <Link href="/property-analyzer" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Property Analyzer</Link>
        <Link href="/pricing" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Pricing</Link>
        
        {/* Authentication/Account Section */}
        {isLoadingAuth ? (
          <div className="w-24 h-9 bg-gray-200 animate-pulse rounded-lg" aria-label="Loading authentication status"></div>
        ) : isLoggedIn ? (
          /* Account Menu for Logged In Users */
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center space-x-2 bg-gray-100 text-gray-800 text-sm px-3 py-2 rounded-lg 
                         hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75
                         transform transition-all duration-200 ease-in-out"
            >
              <User size={16} />
              <span>Account</span>
              <ChevronDown size={14} className={`transform transition-transform duration-200 ${showAccountMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Account Dropdown Menu */}
            {showAccountMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-2">
                  {/* Profile */}
                  <button
                    onClick={() => handleMenuItemClick(() => router.push('/profile'))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Settings size={16} />
                    <span>Profile</span>
                  </button>

                  {/* My Buy Box - commented out to disable feature */}
                  {/*<button
                    onClick={() => handleMenuItemClick(() => router.push('/my-buy-box'))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Home size={16} />
                    <span>My Buy Box</span>
                  </button>*/}

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-1"></div>

                  {/* Sign Out */}
                  <button
                    onClick={() => handleMenuItemClick(handleSignOut)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Sign In Button for Non-Logged In Users */
          <Link href="/login">
            <button
              className="bg-black text-white text-sm px-4 py-2 rounded-lg flex items-center space-x-2
                         hover:brightness-110 hover:scale-105 hover:shadow-lg 
                         active:scale-95
                         focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75
                         transform transition-all duration-200 ease-in-out"
            >
              <LogIn size={16} />
              <span>Sign in</span>
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}