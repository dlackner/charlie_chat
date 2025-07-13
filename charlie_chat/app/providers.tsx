"use client";

import { ReactNode } from "react";
import { SupabaseAuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SupabaseAuthProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </SupabaseAuthProvider>
  );
}