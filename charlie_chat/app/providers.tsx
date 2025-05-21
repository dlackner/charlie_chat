"use client"; // Keep this, as Context Providers are client components

import { ReactNode } from "react";
import { SupabaseAuthProvider } from "@/contexts/AuthContext"; // Adjust path if you placed AuthContext.tsx elsewhere

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SupabaseAuthProvider>
      {/* If you have other global providers (e.g., for theme, analytics, etc.), 
          you can wrap them here or around SupabaseAuthProvider as appropriate.
          For now, we're just focusing on auth. */}
      {children}
    </SupabaseAuthProvider>
  );
}