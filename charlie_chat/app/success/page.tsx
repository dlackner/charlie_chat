"use client";

import { useEffect } from "react";

export default function SuccessPage() {
  useEffect(() => {
    localStorage.setItem("questionCount", "0");
    localStorage.setItem("charlie_chat_pro", "true");
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white text-center">
      <div>
        <h1 className="text-3xl font-semibold mb-2">✅ You're all set!</h1>
        <p className="text-gray-600 mb-4">Unlimited access to Charlie Chat is now unlocked 🧠</p>
        <a href="/" className="inline-block bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition">
          Go Back to Chat
        </a>
      </div>
    </div>
  );
}
