"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { User, ChevronDown, Settings, Heart, LogOut, Star, CreditCard, Target } from "lucide-react";
import { RecommendationsIconModal, RecommendationsIconModalRef } from '@/components/ui/RecommendationsIconModal';
import { WeeklyRecommendationsModalMMR } from "@/components/WeeklyRecommendationsModalMMR";
import { ProfileModal } from "@/components/ProfileModal";
import { BuyBoxModal } from "@/components/BuyBoxModal";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import SubscriptionSupportModal from "@/components/ui/SubscriptionSupportModal";

import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useMyPropertiesAccess } from "@/app/my-properties/components/useMyPropertiesAccess";
import { Dialog } from "@headlessui/react";
import MultiFamilyChatWidget from "./MultiFamilyChatWidget";

export default function Header() {
  const { user: currentUser, isLoading: isLoadingAuth, supabase, session } = useAuth();
  const { hasAccess, isLoading: isLoadingAccess, userClass, checkTrialUserCredits } = useMyPropertiesAccess();
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { showSignUpModal, setShowSignUpModal, showLoginModal, setShowLoginModal } = useModal();
  const recommendationsIconRef = useRef<RecommendationsIconModalRef>(null);
  
  // Sign up modal states
  const [signupEmail, setSignupEmail] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLinkSent, setSignupLinkSent] = useState(false);
  
  // Login modal states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Weekly recommendations modal state
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  
  // Profile, Buy Box, and Subscription modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBuyBoxModal, setShowBuyBoxModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const isLoggedIn = !!currentUser;
  const supabaseClient = createSupabaseBrowserClient();

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);

    if (!loginOtpSent) {
      // Step 1: Send OTP to email
      const { error: signInError } = await supabaseClient.auth.signInWithOtp({
        email: loginEmail,
      });

      if (signInError) {
        setLoginError(signInError.message);
      } else {
        setLoginOtpSent(true);
      }
    } else {
      // Step 2: Verify OTP
      const { error: verifyError } = await supabaseClient.auth.verifyOtp({
        email: loginEmail,
        token: loginOtp,
        type: 'email',
      });

      if (verifyError) {
        setLoginError(verifyError.message);
      } else {
        setLoginSuccess("Logged in successfully!");
        // Close modal and reset state
        setTimeout(() => {
          setShowLoginModal(false);
          setLoginEmail("");
          setLoginOtp("");
          setLoginOtpSent(false);
          setLoginError(null);
          setLoginSuccess(null);
          router.push("/");
          router.refresh();
        }, 1000);
      }
    }
  };

  // Reset login modal state when closing
  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginEmail("");
    setLoginOtp("");
    setLoginOtpSent(false);
    setLoginError(null);
    setLoginSuccess(null);
  };

  // Sign up handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    // Send magic link (OTP via email) for passwordless signup
    const { error: signUpError } = await supabaseClient.auth.signInWithOtp({
      email: signupEmail,
      options: {
        shouldCreateUser: true, // Creates user if they don't exist
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (signUpError) {
      setSignupError(signUpError.message);
    } else {
      setSignupLinkSent(true); // Show success message
      
      // Add affiliate tracking
      if (typeof window !== 'undefined' && (window as any).gr) {
        (window as any).gr('track', 'conversion', { email: signupEmail });
      }
    }
  };

  // Reset signup modal state when closing
  const closeSignUpModal = () => {
    setShowSignUpModal(false);
    setSignupEmail("");
    setSignupError(null);
    setSignupLinkSent(false);
  };

  // Sign out handler
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      setShowAccountMenu(false);
      router.push("/login");
    }
  };

  // My Properties click handler
  const handleMyPropertiesClick = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    if (!hasAccess) {
      // User doesn't have access - show upgrade modal or handle accordingly
      setShowUpgradeModal(true);
      return;
    }

    // User has access - navigate to My Properties
    router.push("/my-properties");
  };

  // Menu item click handler for dropdown
  const handleMenuItemClick = (action: () => void) => {
    action();
    setShowAccountMenu(false);
  };

  // Get My Properties button state
  const getMyPropertiesButtonState = () => {
    if (!isLoggedIn) {
      return {
        className: "text-gray-800 hover:bg-gray-100",
        tooltip: "Sign in to access your properties",
        showAsterisk: false,
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

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center bg-white border-b border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Logo"
            width={192}
            height={48}
            className="mr-4 cursor-pointer"
            style={{ width: '192px', height: 'auto' }}
            priority
          />
        </Link>
        
        {/* Recommendations Bell Icon - only show for logged in users */}
        {isLoggedIn && (
          <div className="mr-4">
            <RecommendationsIconModal 
              ref={recommendationsIconRef}
              onOpenRecommendations={() => setShowRecommendationsModal(true)}
            />
          </div>
        )}
      </div>

      {/* Centered Navigation */}
      <div className="flex-1 flex items-center justify-center space-x-6 text-sm">
        {isLoggedIn ? (
          // Logged in users - active navigation
          <>
            <Link href="/" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Home</Link>
            
            {/* My Properties with access logic */}
            <button
              onClick={handleMyPropertiesClick}
              onMouseEnter={() => {
                // Clear any existing timeout
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                }
                // Show modal on hover only if user doesn't have access (with delay)
                if (isLoggedIn && !hasAccess) {
                  hoverTimeoutRef.current = setTimeout(() => {
                    setShowUpgradeModal(true);
                  }, 800); // 800ms delay
                }
              }}
              onMouseLeave={() => {
                // Clear timeout if user moves mouse away quickly
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
              }}
              disabled={isLoggedIn && isLoadingAccess}
              className={`flex items-center space-x-1 transition rounded-md px-3 py-1 font-medium ${buttonState.className} ${isLoadingAccess ? "opacity-50" : ""}`}
            >
              <Star size={14} />
              <span>My Properties</span>
              {buttonState.showAsterisk && <span className="text-xs text-gray-500 ml-1">*</span>}
              {buttonState.showProLabel && <span className="text-xs text-orange-500 ml-1">Pro</span>}
            </button>
            
            <Link href="/property-analyzer" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Property Analyzer</Link>
            <Link href="/pricing" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Pricing</Link>
            
            {/* Help Button */}
            <MultiFamilyChatWidget />
          </>
        ) : (
          // Not logged in - disabled navigation except Pricing
          <>
            <span className="text-gray-400 cursor-not-allowed rounded-md px-3 py-1 font-medium">Home</span>
            <span className="text-gray-400 cursor-not-allowed rounded-md px-3 py-1 font-medium">My Properties</span>
            <span className="text-gray-400 cursor-not-allowed rounded-md px-3 py-1 font-medium">Property Analyzer</span>
            <Link href="/pricing" className="text-gray-800 hover:bg-gray-100 transition rounded-md px-3 py-1 font-medium">Pricing</Link>
            <span className="text-gray-400 cursor-not-allowed rounded-md px-3 py-1 font-medium">Help</span>
          </>
        )}
      </div>

      {/* Right side - Auth buttons */}
      <div className="flex items-center space-x-4 text-sm">
        
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
                    onClick={() => handleMenuItemClick(() => setShowProfileModal(true))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Settings size={16} />
                    <span>Profile</span>
                  </button>

                  {/* Buy Box */}
                  <button
                    onClick={() => handleMenuItemClick(() => setShowBuyBoxModal(true))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Target size={16} />
                    <span>Buy Box</span>
                  </button>

                  {/* Subscription */}
                  <button
                    onClick={() => handleMenuItemClick(() => setShowSubscriptionModal(true))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <CreditCard size={16} />
                    <span>Subscription</span>
                  </button>


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
          /* Sign Up and Log In buttons for Non-Logged In Users */
          <>
            <button 
              onClick={() => setShowSignUpModal(true)}
              className="border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-800 text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-150 hover:bg-gray-50"
            >
              Sign up
            </button>
            <button 
              onClick={() => setShowLoginModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-150"
            >
              Log in
            </button>
          </>
        )}
      </div>

      {/* Simple Charlie Upgrade Modal */}
      <Dialog open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <img
                src="/charlie.png"
                alt="Charlie"
                className="w-12 h-12 rounded-full shadow-md border flex-shrink-0"
              />
              <Dialog.Title className="text-xl font-semibold text-gray-900 mt-1">
                Hi There!
              </Dialog.Title>
            </div>
            
            <p className="text-base text-gray-700 leading-relaxed">
              You wouldn't believe all the good things we have in store for you if you upgrade to Plus or Pro!
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  router.push("/pricing");
                }}
                className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                Check It Out
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 text-gray-500 hover:text-gray-700 py-3 px-4 rounded-lg transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Sign Up Modal */}
      <Dialog open={showSignUpModal} onClose={closeSignUpModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Create your account</h2>
              <button
                onClick={closeSignUpModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            {!signupLinkSent ? (
              // Show sign up form
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-600 mb-2">
                    Email Address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    style={{
                      colorScheme: 'light',
                      WebkitAppearance: 'none',
                      backgroundColor: 'white'
                    }}
                    autoComplete="email"
                    required
                  />
                </div>

                {signupError && <p className="text-red-600 text-sm">{signupError}</p>}
                
                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-150"
                >
                  Send Confirmation Link
                </button>
              </form>
            ) : (
              // Show success message only
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-700">
                  A confirmation link has been sent to <strong>{signupEmail}</strong>. Click the link to complete your registration.
                </p>
                <div className="text-xs text-gray-500">
                  <p>Didn't receive the email? Check your spam folder.</p>
                </div>
              </div>
            )}

          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Log In Modal */}
      <Dialog open={showLoginModal} onClose={closeLoginModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Sign in to your account</h2>
              <button
                onClick={closeLoginModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              {!loginOtpSent ? (
                // Email input step
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-600 mb-2">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{
                      colorScheme: 'light',
                      WebkitAppearance: 'none',
                      backgroundColor: 'white'
                    }}
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>
              ) : (
                // OTP input step
                <div>
                  <p className="text-sm text-gray-700 mb-4">
                    A login code has been sent to <strong>{loginEmail}</strong>.
                  </p>
                  <label htmlFor="login-otp" className="block text-sm font-medium text-gray-600 mb-2">
                    One-Time Code
                  </label>
                  <input
                    id="login-otp"
                    type="text"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value)}
                    placeholder="Enter Code"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    autoFocus
                  />
                </div>
              )}

              {loginError && <p className="text-red-600 text-sm text-center">{loginError}</p>}
              {loginSuccess && <p className="text-green-600 text-sm text-center">{loginSuccess}</p>}
              
              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-150"
              >
                {!loginOtpSent ? "Send Login Code" : "Verify Code"}
              </button>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Weekly Recommendations Modal */}
      <WeeklyRecommendationsModalMMR
        isOpen={showRecommendationsModal}
        onClose={async () => {
          setShowRecommendationsModal(false);
          // Re-check recommendations status to hide bell if all are completed
          if (recommendationsIconRef.current) {
            await recommendationsIconRef.current.recheckRecommendations();
          }
        }}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Buy Box Modal */}
      <BuyBoxModal
        isOpen={showBuyBoxModal}
        onClose={() => setShowBuyBoxModal(false)}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />

      {/* Subscription Support Modal - Global */}
      <SubscriptionSupportModal />
    </header>
  );
}