'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  redirectTo = '/', 
  fallback = (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600">Loading...</div>
    </div>
  )
}: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Show nothing if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}