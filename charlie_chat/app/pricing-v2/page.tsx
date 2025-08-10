"use client";

import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext"; // Add this import
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


export default function PricingPageV2() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [showTrialAlert, setShowTrialAlert] = useState(false);
  
  // ✅ Add auth context and router
  const { user: currentUser, supabase, session } = useAuth();
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
      console.error("🚫 No valid session or access token");
      alert("You must be logged in to complete this purchase.");
      router.push("/signup");
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
        console.error("Affiliate checkout failed:", data.error);
        alert("Checkout failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Network error during affiliate checkout:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // Function to proceed with regular checkout
  const proceedWithCheckout = async (productId: string, plan: "monthly" | "annual") => {
    // Get fresh session with access token
    const { data: { session: freshSession }, error } = await supabase.auth.getSession();
    const sessionToUse = freshSession || session;

    if (!sessionToUse || !sessionToUse.access_token) {
      console.error("🚫 No valid session or access token");
      alert("You must be logged in to complete this purchase.");
      router.push("/signup");
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
        console.error("Checkout failed:", data.error);
        alert("Checkout failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Network error during checkout:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // Unified checkout handler - checks for affiliate users first
  const handleCheckout = async (productId: string, plan: "monthly" | "annual") => {
    // Check if user is logged in
    if (!currentUser) {
      router.push("/signup");
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
      <h1 className="text-3xl sm:text-5xl font-semibold mb-6 text-orange-600 text-center">Pricing V2 - Development</h1>

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
        {/* Charlie Chat FREE */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out flex flex-col relative">
          {/* Free Badge */}
          <div className="absolute -top-6 left-6 z-10">
            <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-extrabold px-4 py-2 rounded-full shadow-lg border-2 border-white whitespace-nowrap">FREE</span>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Charlie Chat</h2>
          <div className="mb-4">
            <p className="text-xl font-bold mb-1">$0</p>
            <p className="text-sm text-gray-500">Forever free</p>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            It's me, Charles Dobens—my multifamily lessons and stories, my multifamily legal and operational know-how—delivered to you through my Charlie Chat AI assistant.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li>✔️ Unlimited Charlie Chat searches</li>
            <li>✔️ Full Access to my entire knowledge base</li>
            <li>✔️ Deal tactics</li>
            <li>✔️ Closing strategies</li>
            <li>✔️ 250 free property matches to get started</li>
          </ul>
          <button
            onClick={() => router.push("/signup")}
            className="mt-auto w-full bg-gray-800 text-white py-2 rounded font-semibold transition duration-200 transform hover:scale-105 hover:bg-gray-900 hover:shadow-xl"
          >
            Get Started Free
          </button>
        </div>

        {/* Charlie Chat Plus */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out flex flex-col relative">
          {/* Most Popular Badge */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
            <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-extrabold px-4 py-2 rounded-full shadow-lg border-2 border-white whitespace-nowrap">MOST POPULAR</span>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Charlie Chat Plus</h2>
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
            All the power of Charlie Chat with advanced analytics, mapping, financial statements and property analysis tools.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li className="flex items-baseline">
              <span className="text-lg font-semibold text-orange-500">Everything in Charlie Chat, Plus</span>
            </li>
            <li>✔️ AI analysis of broker documents and offer memorandums</li>
            <li>✔️ Best practice marketing tools & LOI's</li>
            <li>✔️ Advanced property analytics and mapping</li>
            <li>✔️ Includes 250 national property matches every month</li>
          </ul>
          <button
            onClick={() => handleCheckout(isAnnual ? CHARLIE_CHAT_PLUS_ANNUAL : CHARLIE_CHAT_PLUS_MONTHLY, isAnnual ? "annual" : "monthly")}
            className="mt-auto w-full bg-black text-white py-2 rounded font-semibold transition duration-200 transform hover:scale-105 hover:bg-orange-600 hover:shadow-xl"
          >
            Get Access
          </button>
        </div>

        {/* Charlie Chat Pro */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out flex flex-col">
          <h2 className="text-2xl font-semibold mb-2">Charlie Chat Pro</h2>
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
            Hundreds of hours of training on multifamily investing, plus advanced analytics, mapping, financial statements and more.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li className="flex items-baseline">
              <span className="text-lg font-semibold text-orange-500">Everything in Charlie Chat Plus, PLUS:</span>
            </li>
            <li>✔️ Access to my Master Class Training Program</li>
            <li>✔️ Weekly group coaching call with Charles Dobens</li>
            <li>✔️ Community Access</li>
            <li>✔️ Includes 250 national property matches every month</li>
          </ul>
          <button
            onClick={() => handleCheckout(isAnnual ? CHARLIE_CHAT_PRO_ANNUAL : CHARLIE_CHAT_PRO_MONTHLY, isAnnual ? "annual" : "monthly")}
            className="mt-auto w-full bg-black text-white py-2 rounded font-semibold transition duration-200 transform hover:scale-105 hover:bg-orange-600 hover:shadow-xl"
          >
            Get Access
          </button>
        </div>

        {/* Cohort Program */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out flex flex-col">
          <h2 className="text-2xl font-semibold mb-4">MultifamilyOS Cohort Program</h2>
          <p className="text-sm text-gray-700 mb-4">
            Connect with me and a community of like-minded investors and experienced professionals who provide the guidance and support needed to achieve your goals.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li className="flex items-baseline">
              <span className="text-lg font-semibold text-orange-500">Everything in Charlie Chat Pro, PLUS:</span>
            </li>
            <li>✔️ Weekly expert sessions led by me</li>
            <li>✔️ A supportive community of peers & investors</li>
            <li>✔️ Step-by-step roadmap for your multifamily investing journey</li>
            <li>✔️ One-on-one access to attorney Charles Dobens</li>
            <li>✔️ Includes 250 national property matches every month for your first 6 months</li>
          </ul>
          <button
            onClick={() => window.location.href = "https://multifamilyos.com/multifamilyos-cohort-program/"}
            className="mt-auto w-full bg-black text-white py-2 rounded font-semibold transition duration-200 transform hover:scale-105 hover:bg-orange-600 hover:shadow-xl"
          >
            Apply Now
          </button>
        </div>
      </div>

      {/* Feature Comparison Section */}
      <div className="max-w-6xl mx-auto mt-16">
        <div className="flex items-start gap-4 mb-8">
          <img 
            src="/charlie.png" 
            alt="Charlie Dobens" 
            className="w-16 h-16 rounded-full flex-shrink-0"
          />
          <div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Look, I've been in this business for over 25 years, and I know that every investor is different. 
              We have solutions for every type of investor—from beginners just starting out to seasoned professionals 
              looking to build their business faster and smarter. Here's exactly what you get with each plan:
            </p>
          </div>
        </div>

        {/* Modern Comparison Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-16">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-0">
              <div className="px-6 py-4">
                <div className="text-base font-semibold text-gray-900">Compare Features</div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-200">
                <div className="text-sm font-semibold text-gray-900">Charlie Chat</div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-200">
                <div className="text-sm font-semibold text-gray-900">Charlie Chat Plus</div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-200">
                <div className="text-sm font-semibold text-gray-900">Charlie Chat Pro</div>
              </div>
            </div>
          </div>
          
          {/* Feature Rows */}
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">AI Chat</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Property Search</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">à la carte</span>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">250/month</span>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">250/month</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Basic Analysis</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">My Favorite Properties</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Mapping & Market Rents</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Advanced Analytics</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Marketing Tools</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">LOI Templates</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-4 text-sm font-medium text-gray-900">Skip Tracing</div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-gray-400"></div>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="px-6 py-4 text-center border-l border-gray-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
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
                <div className="w-5 h-5 rounded-full bg-orange-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
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
                <div className="w-5 h-5 rounded-full bg-orange-500 mx-auto flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
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
                <div className="w-5 h-5 rounded-full bg-orange-500 mx-auto flex items-center justify-center">
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
        <h2 className="text-3xl font-semibold mb-8 text-orange-600 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {/* FAQ Item 1 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">What can Charlie Chat do for me?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">Charlie Chat is your AI co‑pilot in multifamily investing. It lets you:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Discover, organize, and view properties in card, matrix, and interactive map formats</li>
                <li>Quickly run skip traces to uncover owner contact info</li>
                <li>Generate personalized marketing letters and LOIs in seconds</li>
                <li>Export property data for spreadsheets or CRMs</li>
                <li>Run deep investment analyses—IRR, Cash-on-Cash, Cap Rate, DSCR, NOI projections, cash‑flow modeling, and break-even checks</li>
                <li>Deliver AI-powered recommendations to help you decide faster</li>
              </ul>
              <p className="mt-3">From property search to signed LOI, do it all in one place—fast, smart, seamless.</p>
            </div>
          </div>

          {/* FAQ Item 2 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">How do credits work?</h3>
            <div className="text-sm text-gray-700">
              <ul className="list-disc pl-6 space-y-1">
                <li>Every property you view costs 1 credit</li>
                <li>Credits are only used when you retrieve detailed property info</li>
                <li>Unused credits roll over month to month, as long as your subscription is active</li>
                <li>Flexibility to buy extra packs anytime or upgrade for better pricing</li>
              </ul>
              <p className="mt-3">No expiration. No waste. Only pay for what you use.</p>
            </div>
          </div>

          {/* FAQ Item 3 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">What's included in a property analysis?</h3>
            <div className="text-sm text-gray-700">
              <ul className="list-disc pl-6 space-y-1">
                <li>Full financial performance breakdown: Cap Rate, NOI, Cash-on‑Cash, DSCR</li>
                <li>Detailed cash‑flow modeling and break-even analysis</li>
                <li>Multifamily grading system to instantly compare deals</li>
                <li>AI-driven investment recommendations via Charlie Chat</li>
                <li>10-year cash flow statement</li>
              </ul>
              <p className="mt-3">Whether you're underwriting your first small deal or your hundredth large one—you'll do it faster and smarter.</p>
            </div>
          </div>

          {/* FAQ Item 4 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">Where does your property data come from?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">Charlie Chat compiles insights from public records, MLS feeds, market analytics, and proprietary algorithms. We combine this data with the built-in multifamily expertise of Charles Dobens, giving you:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access to every U.S. multifamily property—whether on or off market</li>
                <li>Skip trace data for direct outreach</li>
                <li>Market intelligence to help you spot high-potential deals</li>
              </ul>
              <p className="mt-3">Plus built-in tools to immediately generate outreach letters and LOIs so you can act as soon as you see opportunity.</p>
            </div>
          </div>

          {/* FAQ Item 5 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">Who is Charles Dobens?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">Charles Dobens—known industry-wide as the Multifamily Attorney—is the founder and visionary behind MultifamilyOS™. With 25+ years of experience, he has:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Personally invested in and operated $50M+ in multifamily property</li>
                <li>Mentored clients through $3B+ in investments</li>
                <li>Charles leads with honesty and integrity, and treats his students like clients—providing access, support, and mentorship that's rare in this industry.</li>
              </ul>
            </div>
          </div>

          {/* FAQ Item 6 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">Can I upgrade or downgrade my plan anytime?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">Absolutely.</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Upgrades take effect immediately, so your workflow never skips a beat</li>
                <li>Downgrades apply at your next billing cycle with no penalty</li>
              </ul>
              <p className="mt-3">Your plan flexes with your needs—no surprises.</p>
            </div>
          </div>

          {/* FAQ Item 7 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">What happens if I go over my monthly credit limit?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">You have options:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Purchase additional credit packs on demand</li>
                <li>Upgrade your plan to receive more credits per month at a better rate</li>
              </ul>
              <p className="mt-3">We make sure you never hit a stop sign in your property search.</p>
            </div>
          </div>

          {/* FAQ Item 8 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">Is there a free trial?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">Yes—get started without paying a dime:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>250 free credits to explore properties, run analyses, and send outreach</li>
                <li>No credit card required</li>
              </ul>
              <p className="mt-3">Try it real, risk‑free—and then decide.</p>
            </div>
          </div>

          {/* FAQ Item 9 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">Can I cancel anytime?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">You can. Totally.</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>No cancellation fees.</li>
                <li>Access continues through the end of your current billing period.</li>
                <li>Most subscribers come back quickly—because once you try Charlie Chat, it gets hard to compete without it.</li>
              </ul>
            </div>
          </div>

          {/* FAQ Item 10 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-lg transition duration-200">
            <h3 className="text-xl font-bold text-orange-600 mb-3">Do you offer discounts for annual billing?</h3>
            <div className="text-sm text-gray-700">
              <p className="mb-3">Yes—save big when you commit:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Pay annually and save 19% or more</li>
                <li>Secure a full year of resources at a lower rate</li>
              </ul>
              <p className="mt-3">Accelerate your business—and keep more equity in your pocket.</p>
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
                  <span className="font-semibold text-orange-600">
                    Keep exploring all the features - you're all set!
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>

    </div>
  );
}