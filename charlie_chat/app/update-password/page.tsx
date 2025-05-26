"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function UpdatePasswordFormLogic() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessingCode, setIsProcessingCode] = useState(true);
  const [codeExchangeAttempted, setCodeExchangeAttempted] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const exchangeCode = async () => {
      if (codeExchangeAttempted) return;
      setCodeExchangeAttempted(true);
      setIsProcessingCode(true);

      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(`Failed to process reset link: ${exchangeError.message}. It might be invalid or expired.`);
        } else {
          setSuccess("Reset link verified. You can now set your new password.");
        }
      } else {
        setError("No reset code found in the URL. Please use the link sent to your email.");
      }
      setIsProcessingCode(false);
    };

    exchangeCode();
  }, [searchParams, supabase.auth, codeExchangeAttempted]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isProcessingCode) {
        setError("Please wait, link verification is in progress.");
        return;
    }
    if (codeExchangeAttempted && !success && error) {
        setError("Cannot update password due to an issue with the reset link: " + error);
        return;
    }


    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(`Failed to update password: ${updateError.message}`);
      setSuccess(null);
    } else {
      setSuccess("Your password has been updated successfully. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  };

  if (isProcessingCode && !codeExchangeAttempted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Set a New Password</h1>
        <p>Verifying your reset link...</p>
      </div>
    );
  }

  const formDisabled = isProcessingCode || (codeExchangeAttempted && !success);


  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
      <h1 className="text-xl font-semibold text-gray-800 mb-4 text-center">Set a New Password</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-600">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="At least 6 characters"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={formDisabled}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-600">
            Confirm New Password
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={formDisabled}
          />
        </div>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        {success && <p className="text-green-600 text-sm text-center">{success}</p>}
        <button
          type="submit"
          className={`w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 hover:shadow-lg active:scale-95 ${formDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'}`}
          disabled={formDisabled}
        >
          Update Password
        </button>
      </form>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen flex items-start justify-center pt-24 bg-gray-100 p-6">
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">Set a New Password</h1>
          <p>Loading page...</p>
        </div>
      }>
        <UpdatePasswordFormLogic />
      </Suspense>
    </div>
  );
}