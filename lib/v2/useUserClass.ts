/*
 * User Class Hook
 * Single source of truth for fetching the current user's user_class from profiles.
 * Several places previously duplicated this fetch independently (MobileNavigation,
 * usePropertyAnalyzerAccess) and drifted out of sync with each other - this consolidates it.
 */
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserClass } from '@/lib/v2/accessControl';

interface UseUserClassResult {
  userClass: UserClass;
  isLoading: boolean;
}

export function useUserClass(): UseUserClassResult {
  const { user, supabase, isLoading: authLoading } = useAuth();
  const [userClass, setUserClass] = useState<UserClass>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setUserClass(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchUserClass = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_class')
          .eq('user_id', user.id)
          .single();

        if (!cancelled) {
          setUserClass(error ? null : (data?.user_class as UserClass) ?? null);
        }
      } catch {
        if (!cancelled) setUserClass(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchUserClass();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, supabase]);

  return { userClass, isLoading };
}
