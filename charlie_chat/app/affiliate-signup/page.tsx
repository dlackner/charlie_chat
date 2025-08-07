"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AffiliateSignupPage() {
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check for error parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'cancelled') {
      setError('Payment setup was cancelled. No worries! You can try again below.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // Create Stripe Setup Intent to capture card
      const response = await fetch("/api/stripe/affiliate-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email,
          affiliate_sale: true 
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsProcessing(false);
        return;
      }

      if (data.url) {
        // Redirect to Stripe to capture payment method
        window.location.href = data.url;
      } else {
        setError("Unable to process request. Please try again.");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Setup intent error:", error);
      setError("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <div className="flex items-start gap-4 mb-6">
          <img 
            src="/charlie.png" 
            alt="Charlie Dobens" 
            className="w-16 h-16 rounded-full flex-shrink-0"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Congratulations!
            </h1>
            <p className="text-gray-600 text-sm">
              You're on the path to smarter real estate investing with me at your side. Let's secure your spot and get you started with full access to everything I've built.
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              required
              disabled={isProcessing}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-[1.02]"
            >
              {isProcessing ? "Processing..." : "Sign Up Now"}
            </button>
            
            <p className="text-xs text-gray-500 text-center">
              Your trial starts immediately with 250 free property searches. I'm confident you're going to love what we've built!
            </p>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              What You Get:
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✓ Immediate access to Charlie Chat AI</li>
              <li>✓ 250 free property searches to start</li>
              <li>✓ Full trial of all premium features</li>
              <li>✓ No charge until you decide to continue</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}