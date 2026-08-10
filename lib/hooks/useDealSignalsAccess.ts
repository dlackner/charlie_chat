"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasAccess, type UserClass } from "@/lib/v2/accessControl";

interface UseDealSignalsAccessReturn {
  hasAccess: boolean;
  isLoading: boolean;
  userClass: string | null;
}

// Deal Signals is Plus/Pro - see lib/v2/accessControl.ts PERMISSIONS. Shared between the
// setup page (app/discover/signals/setup) and the feed (app/dashboard/signals).
export const useDealSignalsAccess = (): UseDealSignalsAccessReturn => {
  const { user: currentUser, supabase } = useAuth();
  const [userClass, setUserClass] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserClass = async () => {
      if (!currentUser || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_class")
          .eq("user_id", currentUser.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error("Error loading user class:", error);
          }
          setUserClass(null);
        } else {
          setUserClass(data?.user_class || null);
        }
      } catch (error) {
        console.error("Unexpected error loading user class:", error);
        setUserClass(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser && supabase) {
      loadUserClass();
    } else {
      setIsLoading(false);
    }
  }, [currentUser, supabase]);

  const userHasAccess = userClass ? hasAccess(userClass as UserClass, 'deal_signals') : false;

  return {
    hasAccess: userHasAccess,
    isLoading,
    userClass
  };
};
