// contexts/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User, SupabaseClient, Session } from '@supabase/supabase-js';

// ... (AuthContextType and AuthContext definitions remain the same)
type AuthContextType = {
  supabase: SupabaseClient;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const SupabaseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Initial state

  useEffect(() => {
    let isMounted = true;
    console.log("[AuthContext] useEffect RUNNING. Initial isLoading:", isLoading); // Log if effect re-runs

    // Set loading to true only if it's not already true (e.g. on initial mount)
    // This helps if the effect re-runs due to a dependency change but loading is already handled.
    // However, with [supabase] as the only dep, it should only run once unless supabase instance changes.
    if (isMounted && !isLoading) { // Check current state before setting
        // This scenario is less likely with stable supabase dep, but for safety:
        // setIsLoading(true); 
    } else if (isMounted && isLoading) {
        // It's already true, which is expected on first run.
    }


    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error: sessionError }) => {
        if (!isMounted) return;
        if (sessionError) {
          console.error("[AuthContext] Error in initial getSession:", sessionError.message);
          setUser(null);
          setSession(null);
        } else {
          console.log("[AuthContext] Initial getSession complete. User ID:", initialSession?.user?.id || "null");
          setUser(initialSession?.user ?? null);
          setSession(initialSession ?? null);
        }
      })
      .catch((err) => { // Catch for the getSession promise itself
        if (!isMounted) return;
        console.error("[AuthContext] CATCH block for initial getSession:", err);
        setUser(null);
        setSession(null);
      })
      .finally(() => {
        if (isMounted) {
          console.log("[AuthContext] Initial getSession flow FINISHED. Setting isLoading to false.");
          setIsLoading(false); // Crucial: set loading to false after initial check completes
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        console.log(`[AuthContext] onAuthStateChange event: ${event}, User ID: ${currentSession?.user?.id || 'null'}`);
        setUser(currentSession?.user ?? null);
        setSession(currentSession ?? null);
        
        // If an event like SIGNED_IN or INITIAL_SESSION occurs and loading is still somehow true,
        // ensure it gets set to false. This is a fallback.
        if (isLoading && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
            console.log(`[AuthContext] onAuthStateChange (${event}) is also setting isLoading to false as a fallback.`);
            setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      console.log("[AuthContext] Unsubscribed from onAuthStateChange.");
    };
  }, [supabase]); // supabase instance is stable due to useMemo

  const contextValue = useMemo(() => ({
    supabase,
    user,
    session,
    isLoading,
  }), [supabase, user, session, isLoading]);

  // Log the value being provided by the context
  useEffect(() => {
    console.log("[AuthContext] PROVIDING VALUE:", contextValue);
  }, [contextValue]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};