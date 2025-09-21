/*
 * CHARLIE2 V2 - Pricing Page
 * Subscription plans and billing management with Stripe integration
 * Supports both legacy and new user class systems during transition
 * Features: Core/Plus/Pro plans, annual/monthly billing, upgrade/downgrade flows
 * Part of the new V2 application architecture
 */
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext"; // Add this import
import { useModal } from "@/contexts/ModalContext"; // Add this import
import { useRouter } from "next/navigation"; // Add this import
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// ✅ Import product IDs from env
const CHARLIE_CHAT_MONTHLY = process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT!;
const CHARLIE_CHAT_ANNUAL = process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRODUCT!;
const CHARLIE_CHAT_PLUS_MONTHLY = process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_MONTHLY_PRODUCT!;
const CHARLIE_CHAT_PLUS_ANNUAL = process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_ANNUAL_PRODUCT!;
const CHARLIE_CHAT_PRO_MONTHLY = process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRODUCT!;
const CHARLIE_CHAT_PRO_ANNUAL = process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRODUCT!;
const COHORT_MONTHLY = process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRODUCT!;
const COHORT_ANNUAL = process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRODUCT!;

// User class normalization for legacy compatibility
function normalizeUserClass(userClass: string | null): string | null {
  if (!userClass) return null;
  
  // Map legacy classes to new ones for consistent behavior
  switch (userClass) {
    case 'charlie_chat':
      return 'core';
    case 'charlie_chat_plus':
      return 'plus';
    case 'charlie_chat_pro':
      return 'pro';
    // Pass through new classes and cohort unchanged
    case 'trial':
    case 'core':
    case 'plus':
    case 'pro':
    case 'cohort':
      return userClass;
    default:
      return userClass; // Keep unknown classes as-is for safety
  }
}

// Check if user has premium access (plus/pro/cohort level)
function hasPremiumAccess(userClass: string | null): boolean {
  const normalized = normalizeUserClass(userClass);
  return normalized === 'plus' || normalized === 'pro' || normalized === 'cohort';
}

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [showTrialAlert, setShowTrialAlert] = useState(false);
  const [showPremiumUserModal, setShowPremiumUserModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showDowngradeInstructions, setShowDowngradeInstructions] = useState(false);
  
  // ✅ Add auth context, modal context, and router
  const { user: currentUser, supabase, session } = useAuth();
  const { setShowSignUpModal } = useModal();
  const router = useRouter();

  // Fetch user class
  useEffect(() => {
    const fetchUserClass = async () => {
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_class')
          .eq('user_id', currentUser.id)
          .single();
        
        setUserClass(profile?.user_class || null);
      }
    };

    fetchUserClass();
  }, [currentUser, supabase]);

  // Function to handle affiliate checkout with stored payment method
  const proceedWithAffiliateCheckout = async (productId: string, plan: "monthly" | "annual") => {
    // Get fresh session with access token
    const { data: { session: freshSession }, error } = await supabase.auth.getSession();
    const sessionToUse = freshSession || session;

    if (!sessionToUse || !sessionToUse.access_token) {
      // No valid session or access token
      // Must be logged in to complete purchase
      setShowSignUpModal(true);
      return;
    }

    try {
      const res = await fetch("/api/stripe/affiliate-checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToUse.access_token}`,
        },
        body: JSON.stringify({ productId, plan }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Success! Redirect to success page
        router.push("/success");
      } else {
        // Affiliate checkout failed
        // Checkout failed - could show proper error notification
      }
    } catch (error) {
      // Network error during affiliate checkout
      // Something went wrong - could show proper error notification
    }
  };

  // Function to proceed with regular checkout
  const proceedWithCheckout = async (productId: string, plan: "monthly" | "annual") => {
    // Get fresh session with access token
    const { data: { session: freshSession }, error } = await supabase.auth.getSession();
    const sessionToUse = freshSession || session;

    if (!sessionToUse || !sessionToUse.access_token) {
      // No valid session or access token
      // Must be logged in to complete purchase
      setShowSignUpModal(true);
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToUse.access_token}`,
        },
        body: JSON.stringify({ productId, plan, mode: "subscription" }),
      });
      
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Checkout failed
        // Checkout failed - could show proper error notification
      }
    } catch (error) {
      // Network error during checkout
      // Something went wrong - could show proper error notification
    }
  };

  // Handle Charlie Chat conversion for existing trial users
  const handleCharlieChatConversion = async () => {
    // Check if user is logged in
    if (!currentUser) {
      setShowSignUpModal(true);
      return;
    }

    // If user is trial, convert them to core (charlie_chat legacy support)
    const normalized = normalizeUserClass(userClass);
    if (normalized === 'trial') {
      try {
        // Get fresh session with access token
        const { data: { session: freshSession }, error } = await supabase.auth.getSession();
        const sessionToUse = freshSession || session;

        if (!sessionToUse || !sessionToUse.access_token) {
          // No valid session or access token
          // Must be logged in to complete conversion
          setShowSignUpModal(true);
          return;
        }

        const res = await fetch('/api/convert-to-charlie-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToUse.access_token}`,
          },
        });

        const data = await res.json();

        if (data.success) {
          // Update local state
          setUserClass('core'); // Use new user class system
          // Redirect to home page
          router.push('/');
        } else {
          // Conversion failed
          // Conversion failed - could show proper error notification
        }
      } catch (error) {
        // Network error during conversion
        // Something went wrong - could show proper error notification
      }
    } else {
      // For premium users (Plus, Pro, Cohort), show Charlie's modal
      if (hasPremiumAccess(userClass) || userClass === 'cohort') {
        setShowPremiumUserModal(true);
      } else {
        // For non-logged-in users, redirect to signup
        setShowSignUpModal(true);
      }
    }
  };

  // Handle downgrade request
  const handleDowngradeRequest = () => {
    setShowDowngradeModal(false);
    setShowDowngradeInstructions(true);
  };

  // Unified checkout handler - checks for affiliate users first
  const handleCheckout = async (productId: string, plan: "monthly" | "annual") => {
    // Check if user is logged in
    if (!currentUser) {
      setShowSignUpModal(true);
      return;
    }

    // Check for Pro → Plus downgrade
    // Check if Pro user is trying to downgrade to Plus
    const normalized = normalizeUserClass(userClass);
    if (normalized === 'pro' && (productId === CHARLIE_CHAT_PLUS_MONTHLY || productId === CHARLIE_CHAT_PLUS_ANNUAL)) {
      setShowDowngradeModal(true);
      return;
    }

    // Check for Cohort downgrades (to any lower tier)
    if (userClass === 'cohort' && (
      productId === CHARLIE_CHAT_PLUS_MONTHLY || 
      productId === CHARLIE_CHAT_PLUS_ANNUAL ||
      productId === CHARLIE_CHAT_PRO_MONTHLY ||
      productId === CHARLIE_CHAT_PRO_ANNUAL
    )) {
      setShowDowngradeModal(true);
      return;
    }

    // Check if user is affiliate user with stored payment method
    const { data: profile } = await supabase
      .from('profiles')
      .select('affiliate_sale, stripe_customer_id')
      .eq('user_id', currentUser.id)
      .single();

    if (profile?.affiliate_sale && profile?.stripe_customer_id) {
      // Affiliate user with stored card - process instant checkout
      await proceedWithAffiliateCheckout(productId, plan);
      return;
    }

    // For all users (affiliate and regular), proceed with traditional checkout
    await proceedWithCheckout(productId, plan);
  };

  return (
    <div className="min-h-screen bg-white text-black px-6 py-12">
      <h1 className="text-3xl sm:text-5xl font-semibold mb-6 text-blue-600 text-center">Pricing</h1>

      {/* Toggle for Monthly/Annual */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setIsAnnual(false)}
          className={`px-6 py-2 rounded-l-full text-sm font-semibold transition duration-200 ${
            !isAnnual ? 'bg-black text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          className={`px-6 py-2 rounded-r-full text-sm font-semibold transition duration-200 ${
            isAnnual ? 'bg-black text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Annually
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
        {/* Core FREE */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out flex flex-col relative">
          {/* Free Badge */}
          <div className="absolute -top-6 left-6 z-10">
            <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-extrabold px-4 py-2 rounded-full shadow-lg border-2 border-white whitespace-nowrap">FREE</span>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Core</h2>
          <div className="mb-4">
            <p className="text-xl font-bold mb-1">$0</p>
            <p className="text-sm text-gray-500">Forever free</p>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Essential AI-powered multifamily investing platform. Access nationwide property search, market intelligence, and AI-driven analysis tools.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li className="flex items-start"><span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>Unlimited Property Search</li>
            <li className="flex items-start"><span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>Community Dashboard</li>
            <li className="flex items-start"><span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>AI-powered Investment Advisor</li>
          </ul>
          <button
            onClick={handleCharlieChatConversion}
            className="mt-auto w-full bg-gray-800 text-white py-2 rounded font-semibold transition duration-200 transform hover:scale-105 hover:bg-gray-900 hover:shadow-xl"
          >
            Get Started For Free
          </button>
        </div>

        {/* Plus */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out flex flex-col relative">
          {/* Most Popular Badge */}
          <div className="absolute -top-6 left-6 z-10">
            <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-extrabold px-4 py-2 rounded-full shadow-lg border-2 border-white whitespace-nowrap">MOST POPULAR</span>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Plus</h2>
          {isAnnual ? (
            <>
              <p className="text-xl font-bold mb-1">$75</p>
              <p className="text-sm text-gray-500 mb-4">(Per month, billed annually)</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold mb-1">$90</p>
              <p className="text-sm text-gray-500 mb-4">(Billed monthly)</p>
            </>
          )}
          <p className="text-sm text-gray-700 mb-4">
            Everything in Core plus a complete AI-powered real estate team — all in one integrated platform.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li className="flex items-start"><span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>Broker — Scout off-market opportunities</li>
            <li className="flex items-start"><span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>Marketing Assistant — Create letters and emails</li>
            <li className="flex items-start"><span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>MBA Analyst — Model offers and generate financial statements</li>
            <li className="flex items-start"><span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>Attorney — Generate LOIs and Purchase & Sale Agreements</li>
            <li className="flex items-start"><span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>Financing Advisor — Identify banks and S&L's</li>
          </ul>
          <button
            onClick={() => handleCheckout(isAnnual ? CHARLIE_CHAT_PLUS_ANNUAL : CHARLIE_CHAT_PLUS_MONTHLY, isAnnual ? "annual" : "monthly")}
            className="mt-auto w-full bg-black text-white py-2 rounded font-semibold transition duration-200 transform hover:scale-105 hover:bg-blue-600 hover:shadow-xl"
          >
            Get Access
          </button>
        </div>

        {/* Pro */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out flex flex-col relative">
          {/* Best Value Badge */}
          <div className="absolute -top-6 left-6 z-10">
            <span className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-extrabold px-4 py-2 rounded-full shadow-lg border-2 border-white whitespace-nowrap">BEST VALUE</span>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Professional</h2>
          {isAnnual ? (
            <>
              <p className="text-xl font-bold mb-1">$250</p>
              <p className="text-sm text-gray-500 mb-4">(Per month, billed annually)</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold mb-1">$297</p>
              <p className="text-sm text-gray-500 mb-4">(Billed monthly)</p>
            </>
          )}
          <p className="text-sm text-gray-700 mb-4">
            Everything in Plus and more. Access to Charles Dobens Master Class Training and participation in weekly group coaching sessions.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li className="flex items-start"><span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>Membership in the MultifamilyOS Capital & Equity Clubs</li>
            <li className="flex items-start"><span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>Weekly Coaching Calls with Charles Dobens</li>
            <li className="flex items-start"><span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>Master Class Training Program</li>
            <li className="flex items-start"><span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>Community Access</li>
          </ul>
          <button
            onClick={() => handleCheckout(isAnnual ? CHARLIE_CHAT_PRO_ANNUAL : CHARLIE_CHAT_PRO_MONTHLY, isAnnual ? "annual" : "monthly")}
            className="mt-auto w-full bg-black text-white py-2 rounded font-semibold transition duration-200 transform hover:scale-105 hover:bg-indigo-600 hover:shadow-xl"
          >
            Get Access
          </button>
        </div>

        {/* Cohort Program */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out flex flex-col relative">
          {/* Serious Investors Badge */}
          <div className="absolute -top-6 left-6 z-10">
            <span className="text-white text-xs font-extrabold px-4 py-2 rounded-full shadow-lg border-2 border-white whitespace-nowrap" style={{ backgroundColor: '#1C599F' }}>SERIOUS INVESTORS</span>
          </div>
          <h2 className="text-2xl font-semibold mb-4">MultifamilyOS Cohort Program</h2>
          <p className="text-sm text-gray-700 mb-4">
            Connect with Charles Dobens and a community of like-minded investors and experienced professionals who provide the guidance and support needed to achieve your goals.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li className="flex items-start"><span className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: '#1C599F' }}></span>Weekly expert sessions</li>
            <li className="flex items-start"><span className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: '#1C599F' }}></span>A supportive community of peers & investors</li>
            <li className="flex items-start"><span className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: '#1C599F' }}></span>Step-by-step roadmap for your multifamily investing journey</li>
            <li className="flex items-start"><span className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: '#1C599F' }}></span>One-on-one access to attorney Charles Dobens</li>
          </ul>
          <button
            onClick={() => window.open("https://multifamilyos.com/multifamilyos-cohort-program/", "_blank")}
            className="mt-auto w-full bg-black text-white py-2 rounded font-semibold transition duration-200 transform hover:scale-105 hover:bg-blue-600 hover:shadow-xl"
          >
            Apply Now
          </button>
        </div>
      </div>

      {/* Feature Comparison Section */}
      <div className="max-w-6xl mx-auto mt-16">
        <div className="mb-8">
          <p className="text-lg text-gray-700 leading-relaxed">
            We have solutions for every type of investor — from beginners just starting out to seasoned professionals 
            looking to build their business faster and smarter. Here's exactly what you get with each plan:
          </p>
        </div>

        {/* Modern Comparison Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-16">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="grid grid-cols-5 gap-0">
              <div className="px-6 py-4">
                <div className="text-lg font-bold text-gray-900">Compare Features</div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-200">
                <div className="text-lg font-bold text-gray-900">Core</div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-200">
                <div className="text-lg font-bold text-gray-900">Plus</div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-200">
                <div className="text-lg font-bold text-gray-900">Professional</div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-200">
                <div className="text-lg font-bold text-gray-900">Cohort</div>
              </div>
            </div>
          </div>
          
          {/* Platform Capabilities Section */}
          <div className="bg-blue-50 px-6 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-blue-800">Platform Capabilities</h4>
          </div>
          
          {/* Feature Rows */}
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Unlimited Property Search</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Community Dashboard</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">AI-powered Investment Advisor</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Your AI Team Section */}
          <div className="bg-blue-50 px-6 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-blue-800">Your AI Team</h4>
          </div>
          
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Broker — Scout off-market opportunities</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Marketing Assistant — Create letters and emails</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">MBA Analyst — Model offers and generate financial statements</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Attorney — Generate LOIs and Purchase & Sale Agreements</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Financing Advisor — Identify banks and S&L's</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Tools Section */}
          <div className="bg-blue-50 px-6 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-blue-800">Advanced Tools</h4>
          </div>
          
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">AI-Powered Property Analysis</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Favorite Properties</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Custom Buy Boxes</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Personalized AI Recommendations</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Saved Searches</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Reminders and Notes</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">LOI Templates</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Marketing Letter Generator</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Email Outreach Tool</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Skip Tracing Tool</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Advanced Analytics</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Coaching & Community Section */}
          <div className="bg-blue-50 px-6 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-blue-800">Coaching & Community</h4>
          </div>
          
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Membership in the MultifamilyOS Capital & Equity Clubs</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center mb-1">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-xs text-gray-500">After 6 months</div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Weekly Coaching Calls with Charles Dobens</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Master Class Training</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Community Access</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center" style={{backgroundColor: '#1C599F'}}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mt-16">
        <h2 className="text-3xl font-semibold mb-8 text-blue-600 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {/* FAQ Item 1 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-blue-600 mb-3">What can MultifamilyOS do for investors?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">MultifamilyOS is the AI-powered operating system for multifamily investing. It gives solo investors and small firms the capabilities of a full-scale team:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Scout properties with broker-level insights — including off-market opportunities.</li>
                <li>Analyze deals with MBA-level precision — IRR, Cap Rate, DSCR, NOI, and more.</li>
                <li>Generate documents instantly — personalized letters, LOIs, and contracts.</li>
                <li>Engage owners and investors with professional outreach at scale.</li>
                <li>Secure financing with AI-guided lender recommendations.</li>
              </ul>
              <p className="mt-3">From property search to closing, MultifamilyOS enables investors to handle 10x more deal flow with institutional-level efficiency.</p>
            </div>
          </div>

          {/* FAQ Item 2 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-blue-600 mb-3">Who is MultifamilyOS designed for?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">MultifamilyOS was built for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Solo investors who want to scale without hiring expensive staff.</li>
                <li>Small firms seeking institutional-grade tools without institutional overhead.</li>
                <li>Experienced operators looking to streamline sourcing, analysis, and outreach.</li>
              </ul>
              <p className="mt-3">If you've ever felt stuck between "doing it all yourself" and "hiring a team," MultifamilyOS is the solution.</p>
            </div>
          </div>

          {/* FAQ Item 3 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-blue-600 mb-3">Where does the property data come from?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">MultifamilyOS unifies multiple sources into a single platform:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Public records, MLS feeds, and market analytics</li>
                <li>Proprietary algorithms that surface high-potential deals</li>
                <li>Integrated skip-tracing for direct-to-owner outreach</li>
              </ul>
              <p className="mt-3">The result is comprehensive visibility across every U.S. multifamily property — both on and off market.</p>
            </div>
          </div>

          {/* FAQ Item 4 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-blue-600 mb-3">How does MultifamilyOS compare to hiring a team?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">Most investors rely on brokers, analysts, attorneys, marketers, and lenders to move deals forward. MultifamilyOS brings those same roles into one intelligent system:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Broker → Off-market property scouting</li>
                <li>Analyst → Financial modeling and scenario testing</li>
                <li>Attorney → Drafting LOIs and contracts</li>
                <li>Marketing assistant → Outreach campaigns and letters</li>
                <li>Financing advisor → Lender and capital source recommendations</li>
              </ul>
              <p className="mt-3">It's like having a $10M+ investment team on call, 24/7 — without the payroll.</p>
            </div>
          </div>

          {/* FAQ Item 5 */}
          <div id="charlie-chat-pro-details" className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-blue-600 mb-3">What's included in MultifamilyOS Professional?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">The Professional plan adds depth through:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Debt Syndication Club</strong> – Connect with lending partners and investors focused on debt placements. Structure financing packages, access competitive loan terms, and bring certainty to closings.</li>
                <li><strong>Equity Syndication Club</strong> – Engage with a network of qualified equity investors who can help underwrite deals and participate in funding. Accelerate capital raising and enjoy the confidence of having a network of backers behind your offers.</li>
                <li><strong>Master Class Training</strong> – 90+ lessons led by Charles Dobens, the Multifamily Attorney, covering markets, deal structuring, capital raising, due diligence, and scaling. With $50M+ in personal investing experience and $3B+ in client transactions, Charles brings practical, field-tested strategies to every lesson.</li>
                <li><strong>Weekly Coaching</strong> – Live calls with Charles Dobens that combine deal analysis, market updates, and expert Q&A. These sessions provide direct access to one of the most respected educators in multifamily investing.</li>
                <li><strong>Community Access</strong> – Direct connection to experienced peers and mentors for accountability, support, and networking opportunities.</li>
              </ul>
            </div>
          </div>

          {/* FAQ Item 6 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-blue-600 mb-3">Can users upgrade, downgrade, or cancel anytime?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">Yes. MultifamilyOS adapts to your investing journey:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Upgrades take effect immediately, unlocking new features on demand.</li>
                <li>Downgrades apply at the next billing cycle — no penalties.</li>
                <li>Cancellations are simple — no fees, and access continues until the end of your billing period.</li>
              </ul>
              <p className="mt-3">Your subscription is as flexible as your business needs.</p>
            </div>
          </div>

        </div>
      </div>

      {/* Charlie Trial Alert Dialog */}
      <Dialog open={showTrialAlert} onOpenChange={setShowTrialAlert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <Avatar className="size-12 flex-shrink-0">
                <AvatarImage src="/charlie.png" alt="Charlie" />
                <AvatarFallback>CC</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Hi there!
                </DialogTitle>
                <DialogDescription className="text-base mt-2 text-gray-700">
                  You're already on a trial! Your trial will automatically convert to a subscription when it ends.
                  <br/><br/>
                  <span className="font-semibold text-blue-600">
                    Keep exploring all the features - you're all set!
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Premium User Charlie Modal */}
      <Dialog open={showPremiumUserModal} onOpenChange={setShowPremiumUserModal}>
        <DialogContent className="sm:max-w-md border-2 border-blue-500">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <Avatar className="size-12 flex-shrink-0">
                <AvatarImage src="/charlie.png" alt="Charlie" />
                <AvatarFallback>CC</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Hi there!
                </DialogTitle>
                <DialogDescription className="text-base mt-2 text-gray-700">
                  {(() => {
                    const normalized = normalizeUserClass(userClass);
                    if (userClass === 'cohort') {
                      return <>You're already in my exclusive Cohort program! That means you get everything in Core <em>plus</em> all the premium features, unlimited property searches, my personal coaching calls, and direct access to me. <br/><br/>You're all set with the best we've got – no need to go backwards!</>;
                    } else if (normalized === 'pro') {
                      return <>You're already a Professional member! That gives you everything in basic Core <em>plus</em> unlimited property searches, advanced analytics, my master class training, and weekly group coaching. <br/><br/>You've got the premium experience already – no need to downgrade!</>;
                    } else {
                      return <>You're already a Plus member! That gets you everything in basic Core <em>plus</em> unlimited property searches, advanced analytics, and all the premium tools. <br/><br/>You've got more than the basic plan already – you're all set!</>;
                    }
                  })()}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Pro to Plus Downgrade Modal */}
      <Dialog open={showDowngradeModal} onOpenChange={setShowDowngradeModal}>
        <DialogContent className="sm:max-w-2xl border-2 border-blue-500">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <Avatar className="size-12 flex-shrink-0">
                <AvatarImage src="/charlie.png" alt="Charlie" />
                <AvatarFallback>CC</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Hold on there!
                </DialogTitle>
                <div className="text-base mt-2 text-gray-700">
                  {userClass === 'cohort' ? (
                    <>
                      <p className="mb-4">You're thinking about downgrading from the Cohort program? Look, I get it - sometimes budgets change. But here's what you'd be giving up if you make that move:</p>
                      
                      <div className="mb-4">
                        <p className="font-semibold mb-2">You'd lose access to:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>Weekly expert sessions led by me</li>
                          <li>One-on-one access to attorney Charles Dobens</li>
                          <li>Supportive community of peers & investors</li>
                          <li>Step-by-step roadmap for your multifamily investing journey</li>
                        </ul>
                      </div>
                      
                      <div className="mb-4">
                        <p className="font-semibold mb-2">You'd keep:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>All the features of whichever plan you choose</li>
                          <li>Unlimited property searches and analytics</li>
                          <li>Everything in basic Core</li>
                        </ul>
                      </div>
                      
                      <p>That's exclusive access and personal mentorship you'd be walking away from. Are you sure you want to make this change?</p>
                    </>
                  ) : (
                    <>
                      <p className="mb-4">You're thinking about downgrading from Professional to Plus? Look, I get it - sometimes budgets change. But here's what you'd be giving up if you make that move:</p>
                      
                      <div className="mb-4">
                        <p className="font-semibold mb-2">You'd lose access to:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>My Master Class Training Program (hundreds of hours of content)</li>
                          <li>Weekly group coaching calls with me personally</li>
                          <li>Direct access to the community</li>
                        </ul>
                      </div>
                      
                      <div className="mb-4">
                        <p className="font-semibold mb-2">You'd keep:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>All the Plus features (unlimited property searches, analytics, marketing tools)</li>
                          <li>Everything in basic Core</li>
                        </ul>
                      </div>
                      
                      <p>That's a lot of valuable training and personal mentorship you'd be walking away from. Are you sure you want to make this change?</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowDowngradeModal(false)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {userClass === 'cohort' ? 'Stay in Cohort' : 'Keep Professional'}
            </button>
            <button
              onClick={handleDowngradeRequest}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Yes, Request Downgrade
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Downgrade Instructions Modal */}
      <Dialog open={showDowngradeInstructions} onOpenChange={setShowDowngradeInstructions}>
        <DialogContent className="sm:max-w-lg border-2 border-blue-500">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <Avatar className="size-12 flex-shrink-0">
                <AvatarImage src="/charlie.png" alt="Charlie" />
                <AvatarFallback>CC</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Got it!
                </DialogTitle>
                <div className="text-base mt-2 text-gray-700">
                  <p className="mb-4">No problem - I understand you'd like to make that change. Here's what to do next:</p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="font-semibold text-blue-800 mb-2">📧 Contact Our Team:</p>
                    <p className="text-gray-700">Open up the chat help and send us a message requesting your subscription change. Our team will contact you right away to process the change.</p>
                  </div>
                  
                  <p className="text-sm text-gray-600">We'll take care of everything else from there!</p>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowDowngradeInstructions(false)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Got It
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}