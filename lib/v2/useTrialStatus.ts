/*
 * CHARLIE2 V2 - Trial Status Hook
 * React hook for managing trial status and triggering modal
 * Integrates with auth system and trial manager
 * Part of the new V2 application architecture
 */

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TrialStatusResult {
  userClass: string | null;
  showTrialEndModal: boolean;
  setShowTrialEndModal: (show: boolean) => void;
  isLoading: boolean;
}

export function useTrialStatus(): TrialStatusResult {
  const { user } = useAuth();
  const [showTrialEndModal, setShowTrialEndModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Remove the trial status checking from browser - this should be done server-side
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    // Just set loading to false since we're fetching user_class directly from profiles table
    setIsLoading(false);
  }, [user?.id]);

  // The userClass will be fetched directly in the navigation component
  // This hook now just manages the modal state

  return {
    userClass: null, // userClass is now managed in navigation component
    showTrialEndModal,
    setShowTrialEndModal,
    isLoading
  };
}