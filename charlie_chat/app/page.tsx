/*
 * CHARLIE2 V2 - Root Homepage with Authentication-based Routing
 * Redirects logged-in users to V2 home page, anonymous users to About page
 * Part of the new V2 application architecture
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Logged in users go to V2 home page
        router.replace('/v2');
      } else {
        // Anonymous users go to About/marketing page
        router.replace('/about');
      }
    }
  }, [user, isLoading, router]);

  // Show minimal loading state while determining redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}