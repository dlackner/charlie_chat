 "use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { ListingProvider } from "@/contexts/ListingContext";

export default function ClosingChatLayout({ children }: { children: ReactNode }) {
  return (
    <ListingProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-white p-4">
          <Sidebar
            listings={[]}
            selectedListings={[]}
            toggleListingSelect={() => {}}
            onSearch={() => Promise.resolve()}
            onSendToGPT={() => {}}
            isLoggedIn={true}
            triggerAuthModal={() => {}}
            onCreditsUpdate={() => {}}
          />
        </aside>

        {/* Main chat area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ListingProvider>
  );
}