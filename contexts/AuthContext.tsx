"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User, SupabaseClient, Session } from '@supabase/supabase-js';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;


    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error: sessionError }) => {
        if (!isMounted) return;
        if (sessionError) {
          console.error("[AuthContext] Error in initial getSession:", sessionError.message);
          setUser(null);
          setSession(null);
        } else {
          setUser(initialSession?.user ?? null);
          setSession(initialSession ?? null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("[AuthContext] Error in initial getSession catch:", err);
        setUser(null);
        setSession(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        
        // Clear localStorage on sign out for privacy/security
        if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
          localStorage.removeItem("threadId");
          localStorage.removeItem("chatMessages");
          localStorage.removeItem("listings");
          localStorage.removeItem("selectedListings");
          localStorage.removeItem("batchSelectedListings");
          localStorage.removeItem("currentBatch");
          localStorage.removeItem("totalPropertiesToAnalyze");
          localStorage.removeItem("isWaitingForContinuation");
        }
        
        setUser(currentSession?.user ?? null);
        setSession(currentSession ?? null);
        
        if (isLoading && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
            setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const contextValue = useMemo(() => ({
    supabase,
    user,
    session,
    isLoading,
  }), [supabase, user, session, isLoading]);


  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};