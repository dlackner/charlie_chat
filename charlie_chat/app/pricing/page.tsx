"use client";

import { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext"; // Add this import
import { useRouter } from "next/navigation"; // Add this import

// ✅ Import product IDs from env
const CHARLIE_CHAT_MONTHLY = process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT!;
const CHARLIE_CHAT_ANNUAL = process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRODUCT!;
const CHARLIE_CHAT_PRO_MONTHLY = process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRODUCT!;
const CHARLIE_CHAT_PRO_ANNUAL = process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRODUCT!;
const COHORT_MONTHLY = process.env.NEXT_PUBLIC_COHORT_MONTHLY_PRODUCT!;
const COHORT_ANNUAL = process.env.NEXT_PUBLIC_COHORT_ANNUAL_PRODUCT!;

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  
  // ✅ Add auth context and router
  const { user: currentUser, supabase, session } = useAuth();
  const router = useRouter();

  // ✅ Fixed handleCheckout function with proper auth
  const handleCheckout = async (productId: string, plan: "monthly" | "annual") => {
    // Check if user is logged in
    if (!currentUser) {
      // Redirect to signup if not logged in
      router.push("/signup");
      return;
    }

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
          Authorization: `Bearer ${sessionToUse.access_token}`, // ✅ Added missing auth header
        },
        body: JSON.stringify({ productId, plan }),
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

  return (
    <div className="min-h-screen bg-white text-black px-6 py-12">
      <h1 className="text-3xl sm:text-5xl font-semibold mb-6 text-orange-600 text-center">Pricing</h1>

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

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Charlie Chat */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow hover:shadow-lg hover:-translate-y-1 transform transition duration-200 ease-in-out flex flex-col">
          <h2 className="text-2xl font-semibold mb-2">Charlie Chat</h2>
          {isAnnual ? (
            <>
              <p className="text-xl font-bold mb-1">$16</p>
              <p className="text-sm text-gray-500 mb-4">(Per month, billed annually)</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold mb-1">$20</p>
              <p className="text-sm text-gray-500 mb-4">(Billed monthly)</p>
            </>
          )}
          <p className="text-sm text-gray-700 mb-4">
            It's me, Charles Dobens—my multifamily lessons and stories, my multifamily legal and operational know-how—delivered to you through my Charlie Chat AI assistant.
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li>✔️ Unlimited Charlie Chats searches</li>
            <li>✔️ Full Access to my entire knowledge base</li>
            <li>✔️ Deal tactics</li>
            <li>✔️ Closing strategies</li>
          </ul>
          <p className="text-sm italic text-gray-600 mb-3">Try for free! No credit card required. Includes 250 free property matches.</p>
          <button
            onClick={() => handleCheckout(isAnnual ? CHARLIE_CHAT_ANNUAL : CHARLIE_CHAT_MONTHLY, isAnnual ? "annual" : "monthly")}
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
            My entire Master Class training at your fingertips. Hundreds of hours of additional training on multifamily investing, plus:
          </p>
          <ul className="text-sm space-y-1 text-gray-800 mb-4 flex flex-col">
            <li className="flex items-baseline">
              <span className="text-orange-500 text-l mr-2">✔️</span>
              <span className="text-lg font-semibold text-orange-500">Everything in Charlie Chat</span>
            </li>
            <li>✔️ Access to my Master Class Training Program</li>
            <li>✔️ AI analysis of broker documents and offer memorandums</li>
            <li>✔️ Best practice marketing tools & LOI's</li>
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
              <span className="text-orange-500 text-l mr-2">✔️</span>
              <span className="text-lg font-semibold text-orange-500">Everything in Charlie Chat Pro</span>
            </li>
            <li>✔️ Weekly expert sessions led by me</li>
            <li>✔️ A supportive community of peers & investors</li>
            <li>✔️ Step-by-step roadmap for your multifamily investing journey</li>
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
    </div>
  );
}