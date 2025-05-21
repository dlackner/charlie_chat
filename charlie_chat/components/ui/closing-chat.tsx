"use client";

import { Dialog } from "@headlessui/react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sidebar } from "@/components/ui/sidebar";
import { Plus, SendHorizonal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from '@supabase/supabase-js'

type Listing = {
  id: string;
  address: {
    address: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  bedrooms?: number;
  squareFeet?: number;
  rentEstimate?: number;
  assessedValue?: number;
  estimatedValue?: number;
  lastSalePrice?: number;
  yearBuilt?: number;
  pool?: boolean;
  [key: string]: any;
};

const EXAMPLES = [
  "How do I creatively structure seller financing?",
  "Is it possible to convert a hotel into a multifamily apartment?",
  "What assumptions should I model for a 5-year hold of a property?",
  "How do I get started in multifamily investing? ",
];


export function ClosingChat() {

  const { 
    user: currentUser,    // User object from context
    isLoading: isLoadingAuth, // Global loading state for auth
    supabase              // Shared Supabase client instance
  } = useAuth();

  const router = useRouter();
  const [userCredits, setUserCredits] = useState<number | null>(null);

  const isLoggedIn = !!currentUser;

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [count, setCount] = useState(0);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListings, setSelectedListings] = useState<Listing[]>([]);

  const handleCreditsUpdated = (newBalance: number) => {
    console.log("[ClosingChat] handleCreditsUpdated CALLED with newBalance:", newBalance);
    setUserCredits(prevCredits => {
      console.log("[ClosingChat] Previous credits state:", prevCredits, "New credits to set:", newBalance);
      return newBalance;
    });
  };
  
  const toggleListingSelect = (listing: any) => {
    const exists = selectedListings.some((l) => l.id === listing.id);
    if (exists) {
      setSelectedListings((prev) => prev.filter((l) => l.id !== listing.id));
    } else {
      setSelectedListings((prev) => [...prev, listing]);
    }
  };

  const onSendToGPT = () => {
    // Define the list of fields you want to send for each property
    const fieldsToSend = [
      "absenteeOwner", "address", "adjustableRate", "assessedValue", "assumable",
      "corporateOwned", "estimatedEquity", "estimatedValue", "floodZone", "floodZoneDescription",
      "forSale", "inStateAbsenteeOwner", "lastSaleAmount", "lastSaleArmsLength", "lastSaleDate",
      "lenderName", "listingAmount", "lotSquareFeet", "maturityDateFirst", "mlsActive",
      "mlsLastSaleDate", "openMortgageBalance", "outOfStateAbsenteeOwner", "owner1FirstName",
      "owner1LastName", "propertyId", "stories", "unitsCount", "yearBuilt", "yearsOwned"
    ];

    const rows = selectedListings.map((listing: Listing, index: number) => {
      const mainDisplayAddress = listing.address?.address || "Unknown Address";
      let propertyDetails = "";

      for (const field of fieldsToSend) {
        if (listing.hasOwnProperty(field)) {
          let value = listing[field as keyof Listing];

          if (value === null || value === undefined) {
            continue;
          }

          // Special formatting for specific fields or types
          if (field === "address" && typeof value === 'object' && value !== null) {
            const addrObj = value as Listing['address'];
            let formattedAddress = addrObj.address || "";
            if (addrObj.city) formattedAddress += `, ${addrObj.city}`;
            if (addrObj.state) formattedAddress += `, ${addrObj.state}`;
            if (addrObj.zip) formattedAddress += ` ${addrObj.zip}`;
            value = formattedAddress.trim() || "N/A";
          } else if (typeof value === 'boolean') {
            value = value ? "Yes" : "No";
          } else if (typeof value === 'object' && value !== null) {
            // For any other unexpected objects, stringify them, or skip/handle as needed
            value = JSON.stringify(value);
          } else if (value === "") { // Skip empty strings
            continue;
          }


          const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // Add spaces and capitalize

          propertyDetails += `${fieldLabel}: ${value}\n`;
        }
      }

      if (propertyDetails.trim() === "") {
        propertyDetails = "No additional specified details available for this property.\n";
      }

      return `**${index + 1}. ${mainDisplayAddress}**\n${propertyDetails.trim()}`;
    });

    const summaryPrompt = `Give me a market summary and an underwriting strategy for each property. For each property, consider the following details if available:\n\n---\n${rows.join("\n\n---\n")}\n---`;

    sendMessage(summaryPrompt);
    setSelectedListings([]);
  };

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserCredits = async (userToFetchFor: User) => {
      if (!supabase) { // Should always have supabase from context if AuthProvider is set up
        console.error("[ClosingChat CreditsEffect] Supabase client not available.");
        if (isMounted) setUserCredits(null);
        return;
      }
      console.log(`[ClosingChat CreditsEffect] Attempting to fetch profile/credits for user ${userToFetchFor.id}`);
      try {
        // Using the shared Supabase client from context
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('credits')
          .eq('user_id', userToFetchFor.id)
          .single();

        if (!isMounted) return;

        if (profileError) {
          console.error(`[ClosingChat CreditsEffect] Error fetching profile for ${userToFetchFor.id}:`, profileError.message);
          setUserCredits(null); // Or set to 0 if that's your preferred error state for credits
        } else if (profile) {
          console.log(`[ClosingChat CreditsEffect] Profile fetched for ${userToFetchFor.id}, credits: ${profile.credits}`);
          setUserCredits(profile.credits);
        } else {
          console.warn(`[ClosingChat CreditsEffect] No profile found for user ${userToFetchFor.id}. Setting credits to 0.`);
          setUserCredits(0); // Default if no profile
        }
      } catch (e: any) {
        if (!isMounted) return;
        console.error(`[ClosingChat CreditsEffect] Exception during profile fetch for ${userToFetchFor.id}:`, e.message, e);
        setUserCredits(null);
      }
    };

    if (currentUser && isMounted) {
      // currentUser is from useAuth(). If it exists, fetch their credits.
      fetchUserCredits(currentUser);
    } else if (!currentUser && isMounted) {
      // No user (logged out, or initial state before user is loaded by AuthContext)
      // Clear local credits if the user logs out or if there's no user from context.
      console.log("[ClosingChat CreditsEffect] No current user from context, clearing local credits.");
      setUserCredits(null);
    }

    return () => {
      isMounted = false;
      console.log("[ClosingChat CreditsEffect] Cleanup.");
    };
  }, [currentUser, supabase]);

  // Safe access to localStorage on client only (for non-auth critical things or fallbacks)
  useEffect(() => {
    // Only set from localStorage if NOT logged in or if these are supplementary
    if (!isLoggedIn) {
      const storedPro = localStorage.getItem("charlie_chat_pro") === "true";
      const storedCount = Number(localStorage.getItem("questionCount") || 0);
      setIsPro(storedPro); // This might be overridden if logged in and fetching from DB
      setCount(isNaN(storedCount) ? 0 : storedCount);
    }
    const savedThreadId = localStorage.getItem("threadId");
    if (savedThreadId) {
      setThreadId(savedThreadId);
    }
  }, [isLoggedIn]); // Re-run if login status changes

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // The 'count' and 'isPro' are now potentially managed by Supabase user data for logged-in users
    // For guests, it still uses localStorage or default values
    let currentMessageCount = count;
    if (!isLoggedIn) {
        let guestCount = Number(localStorage.getItem("questionCount") || 0);
        if (isNaN(guestCount)) guestCount = 0;
        currentMessageCount = guestCount;
    }

    if (!isLoggedIn && !isPro && currentMessageCount >= 3) {
      setShowModal(true);
      return;
    }

    if (!isLoggedIn) {
        localStorage.setItem("questionCount", String(currentMessageCount + 1));
    }
    // If logged in, token decrementing should happen server-side or via a call to update Supabase DB

    setCount((prev) => prev + 1); // This now reflects either guest count or DB-driven count

    setMessages((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, threadId }),
    });

    const resClone = res.clone();
    let resJson: any = {};

    try {
      const contentType = resClone.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        resJson = await resClone.json();

        if (resJson.autoSwitched && resJson.threadId) {
          console.warn("⚠️ Backend forked to new thread due to stuck run:", resJson.threadId);
          setThreadId(resJson.threadId);
          localStorage.setItem("threadId", resJson.threadId);

          const titles = JSON.parse(localStorage.getItem("chatTitles") || "{}");
          titles[resJson.threadId] = message.slice(0, 50);
          localStorage.setItem("chatTitles", JSON.stringify(titles));
        }
      }
    } catch (e) {
      // all good — fallback to stream
    }
    
    if (messages.length === 0 && message.trim().length > 0) {
      const newThreadId = res.headers.get("x-thread-id");
    
      if (newThreadId && newThreadId.startsWith("thread_")) {
        const titles = JSON.parse(localStorage.getItem("chatTitles") || "{}");
        titles[newThreadId] = message.slice(0, 50); 
        localStorage.setItem("chatTitles", JSON.stringify(titles));
        setThreadId(newThreadId);
        localStorage.setItem("threadId", newThreadId);
      }
    }
    const reader = res.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    
    if (reader) {
      let fullText = ""; 
    
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
    
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data:"));
    
        for (const line of lines) {
          const json = line.replace("data: ", "").trim();
          if (json === "[DONE]") return; // Stream finished
    
          try {
            const parsed = JSON.parse(json);
            const contentBlocks = parsed?.data?.delta?.content;
    
            if (Array.isArray(contentBlocks)) {
              for (const block of contentBlocks) {
                if (block.type === "text" && block.text?.value) {
                  const delta = block.text.value;
    
                  fullText += delta;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                        newMessages[newMessages.length - 1].content = fullText;
                        return newMessages;
                    }
                    // Should not happen if we added an empty assistant message first
                    return [...newMessages, { role: "assistant", content: fullText }];
                  });
                }
              }
            }
          } catch (err) {
            console.warn("❌ Failed to parse line:", json, err);
          }
        }
      }
      if (!threadId && res.headers) {
        const newThreadId = res.headers.get("x-thread-id");
        if (newThreadId && newThreadId.startsWith("thread_")) {
          const titles = JSON.parse(localStorage.getItem("chatTitles") || "{}");
          titles[newThreadId] = message.slice(0, 50);
          localStorage.setItem("chatTitles", JSON.stringify(titles));
          setThreadId(newThreadId);
          localStorage.setItem("threadId", newThreadId);
        }
      }
    }
  };

  const handleCheckout = async () => {
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  };

  
  if (isLoadingAuth) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Loading chat...</p> {/* Or a proper spinner component */}
        </div>
    );
  }

  return (
    <>
      {/* Main layout container */}
      {/* Your Header component would go here, passing isLoggedIn and handleSignOut */}
      {/* Example: <Header isLoggedIn={isLoggedIn} onSignOut={handleSignOut} /> */}
      <div className="flex h-screen overflow-hidden bg-white text-black">
         {/* Sidebar */}
         <Sidebar
          onSearch={async (filters: Record<string, string | number | boolean>) => {
            try {
              const res = await fetch("/api/rentcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(filters),
              });
            
              const data = await res.json();
              console.log("🔍 Raw RentCast data:", data);
              setListings(data || []);
            } catch (err) {
              console.error("RentCast API error:", err);
            }
          }}
          listings={listings}
          selectedListings={selectedListings}
          toggleListingSelect={toggleListingSelect}
          onSendToGPT={onSendToGPT}
          isLoggedIn={isLoggedIn} // Now uses Supabase auth state
          triggerAuthModal={() => setShowModal(true)}
          onCreditsUpdate={handleCreditsUpdated}
        />

        {/* Left: Chat UI */}
        <div className="flex-1 flex flex-col items-center justify-start overflow-hidden">
          <img
            src="/charlie.png"
            alt="Charlie Headshot"
            className="w-24 h-24 rounded-full mx-auto mb-4 shadow-md border"
          />
          <h1 className="text-3xl sm:text-5xl font-light text-center mb-2 tracking-tight">
            Charlie Chat
          </h1>
          <p className="text-center text-gray-500 mb-6 text-sm sm:text-base">
            Conversational AI for Multifamily Investors
          </p>
  
          {/* Message list */}
          <div className="w-full max-w-4xl flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((m, i) => {
            const isUser = m.role === "user";
            const cleanContent = m.content
              .replace(/\s?【\d+:\d+†[^】]+】\s?/g, "")
              .replace(/\s?\[\d+:\d+\^source\]\s?/g, "")
              .replace(/\s?\[\^?\d+\]\s?/g, "")
              .replace(/ +(?=\.|,|!|\?)/g, "")
              .replace(/\n/g, '\n\n') 
              .trim();
            
            return (
              <div
                key={i}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`inline-block max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-xl shadow-sm ${ 
                    isUser
                      ? "bg-sky-100 text-sky-900 rounded-br-none" 
                      : "bg-gray-100 text-gray-800 rounded-bl-none" 
                  }`}
                >
                  <div className="text-base leading-relaxed font-sans"> 
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0 whitespace-pre-line" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc pl-5 my-2" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="mb-1" {...props} />
                        ),
                      }}
                    >
                      {cleanContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />

          <div className="w-full max-w-5xl border-t p-4 bg-white sticky bottom-0 z-10">
           <div className="flex items-center border border-gray-300 rounded-lg shadow-sm p-2 focus-within:ring-2 focus-within:ring-black">
              <button
                id="upload-docs"
                type="button"
                onClick={() => {
                    if (!isLoggedIn) {
                        setShowModal(true); // Show login/upgrade modal if not logged in
                    } else if (!isPro) { // If logged in but not Pro
                        setShowProModal(true); // Show Pro upgrade modal
                    } else {
                        // TODO: Implement file upload logic for Pro users
                        alert("File upload for Pro users coming soon!");
                    }
                }}
                className="p-2 hover:bg-gray-100 rounded transition"
                title={isPro ? "Upload documents (Pro)" : "Upgrade to Pro to upload"}
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
              <input
                id="chat-input"
                className="flex-1 px-3 py-2 text-base sm:text-lg focus:outline-none placeholder-gray-500"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { 
                    e.preventDefault(); 
                    sendMessage(input);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim()} 
                className="p-2 hover:bg-gray-100 rounded transition disabled:opacity-50"
                title="Send"
              >
                <SendHorizonal className="w-5 h-5 text-gray-600" />
              </button>
            </div>
        </div>
  
          {messages.length === 0 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl w-full mx-auto">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(ex)}
                  className="text-left text-sm px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-sm"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
  
      <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded bg-white p-6 text-center space-y-4 shadow-xl">
            <Dialog.Title className="text-lg font-semibold">
              You've hit your free limit or need to sign in
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500">
              Sign in to continue chatting or upgrade for unlimited access.
            </Dialog.Description>

            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/stripe/checkout", { method: "POST" });
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                  } else {
                    alert("Oops — couldn't start checkout.");
                  }
                } catch (err) {
                  console.error("Checkout error:", err);
                  alert("Something went wrong launching checkout.");
                }
              }}
              className="w-full bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
            >
              Unlock Unlimited Access 💳
            </button>
            
            <button
              onClick={() => {
                router.push("/login"); // Use Next.js router for client-side navigation
              }}
              className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-100 transition"
            >
              Sign In to Your Account
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>


      <Dialog open={showProModal} onClose={() => setShowProModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded bg-white p-6 text-center space-y-4 shadow-xl">
            <Dialog.Title className="text-lg font-semibold">
              Charlie Chat Pro 🔒
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500">
              File uploads and enhanced analysis are available with Charlie Chat Pro.
            </Dialog.Description>
                  
            <button
              onClick={handleCheckout}
              className="bg-black text-white px-4 py-2 rounded mt-4 hover:bg-gray-800 transition"
            >
              Upgrade Now 💳
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>


      {isLoggedIn && userCredits !== null && (
        <div 
          className="fixed bottom-4 right-4 z-50 bg-orange-500 bg-opacity-75 text-white font-bold p-3 rounded-lg shadow-lg"
          title={`You have ${userCredits} credits remaining.`}
        >
          Credits: {userCredits}
        </div>
      )}
    </>
  );
}