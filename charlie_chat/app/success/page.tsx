"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isCreditPack = mode === "credit";
  const [credits, setCredits] = useState<number | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const fetchCredits = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("No user session found", authError);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("❌ Failed to fetch credits:", error);
      } else {
        setCredits(data.credits);
      }
    };

    if (isCreditPack) {
      fetchCredits();
    } else {
      localStorage.setItem("questionCount", "0");
      localStorage.setItem("charlie_chat_pro", "true");
    }
  }, [isCreditPack, supabase]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white text-center">
      <div>
        <h1 className="text-3xl font-semibold mb-2">✅ You're all set!</h1>
        <p className="text-gray-600 mb-4">
          {isCreditPack
            ? credits === null
              ? "Adding your new credits..."
              : `You now have ${credits} credits in your account.`
            : "Unlimited access to Charlie Chat is now unlocked!"}
        </p>
        <a
          href="/"
          className="inline-block bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
        >
          Go Back to Chat
        </a>
      </div>
    </div>
  );
}
