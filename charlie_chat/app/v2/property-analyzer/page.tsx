/*
 * CHARLIE2 V2 - Property Analyzer Page
 * Financial analysis and investment calculation tools
 * Part of the new V2 application architecture (redirects to offer-analyzer)
 */
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PropertyAnalyzerRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to the new offer-analyzer URL with all query parameters
    const params = searchParams.toString();
    const redirectUrl = params ? `/offer-analyzer?${params}` : '/offer-analyzer';
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Offer Analyzer...</p>
      </div>
    </div>
  );
}

export default function PropertyAnalyzerRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PropertyAnalyzerRedirectContent />
    </Suspense>
  );
}