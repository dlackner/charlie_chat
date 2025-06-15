"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import type { User } from "@supabase/supabase-js";

type ExtendedUser = User & {
  stripe_customer_id?: string;
};

export default function CreditPackCheckoutPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const startCheckout = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();

      const session = sessionData.session;
      if (!session) {
        setError("You're not logged in. Please sign in again.");
        setLoading(false);
        return;
      }

      const user = session.user;
      const userId = user.id;
      const accessToken = session.access_token; // Get the access token

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile?.stripe_customer_id) {
        console.error("Could not fetch stripe_customer_id:", profileError);
        setError("Your account is missing Stripe info. Please contact support.");
        setLoading(false);
        return;
      }

      const stripeCustomerId = profile.stripe_customer_id;
      const amount = searchParams.get("amount");
      const userClass = searchParams.get("userClass") || "charlie_chat";

      if (!amount) {
        setError("Missing credit pack amount.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}` // Include the auth token
        },
        body: JSON.stringify({
          userClass,
          amount: parseInt(amount, 10),
          userId,
          stripeCustomerId,
        }),
      });

      const responseData = await response.json();

      if (responseData?.url) {
        window.location.href = responseData.url;
      } else {
        setError(responseData?.error || "Unable to start checkout.");
        setLoading(false);
      }
    };

    startCheckout();
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
        <div className="bg-white p-6 rounded shadow-md text-center max-w-md">
          <h2 className="text-red-600 text-lg font-bold">Checkout Failed</h2>
          <p className="text-gray-700 mt-2">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            onClick={() => router.push("/")}
          >
            Return to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-800">
          Redirecting to secure checkout...
        </h1>
        <p className="text-gray-500 mt-2">
          Please wait while we create your Stripe session.
        </p>
      </div>
    </div>
  );
}