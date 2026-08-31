'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserClass } from '@/lib/v2/useUserClass';
import { hasAccess, type Feature } from '@/lib/v2/accessControl';

interface FeatureGuardProps {
  feature: Feature;
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

// Nest this inside AuthGuard - it only checks tier access, not authentication.
// AuthGuard should already guarantee a logged-in user by the time this renders.
export function FeatureGuard({
  feature,
  children,
  redirectTo = '/pricing',
  fallback = (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600">Loading...</div>
    </div>
  )
}: FeatureGuardProps) {
  const { userClass, isLoading } = useUserClass();
  const router = useRouter();
  const allowed = hasAccess(userClass, feature);

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.push(redirectTo);
    }
  }, [isLoading, allowed, router, redirectTo]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
