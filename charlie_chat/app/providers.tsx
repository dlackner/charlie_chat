"use client";

import { ReactNode } from "react";
import { SupabaseAuthProvider } from "@/contexts/AuthContext";
import { ModalProvider } from "@/contexts/ModalContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SupabaseAuthProvider>
      <ModalProvider>
        {children}
      </ModalProvider>
    </SupabaseAuthProvider>
  );
}