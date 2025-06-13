"use client";

import { Dialog } from "@headlessui/react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sidebar } from "@/components/ui/sidebar";
import { Plus, SendHorizonal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from '@supabase/supabase-js'

//const DEFAULT_USER_CLASS: UserClass = 'charlie_chat'; 
//const [userClass, setUserClass] = useState<UserClass>('charlie_chat'); // WE SET THIS DOWN BELOW
type ExtendedUser = User & {
  stripe_customer_id?: string;
};
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

// DEFINE USER CLASSES AND PROPERTY PACKAGES.  NOT CONNECTED TO THE NEW LIB\PRICING.TS FILE YET
import { PACKAGES, getPackagesFor } from '@/lib/pricing';
import { AuthenticationError } from "openai";

type UserClass = 'charlie_chat' | 'charlie_chat_pro' | 'cohort';

const EXAMPLES = [
  "How do I creatively structure seller financing?",
  "Is it possible to convert a hotel into a multifamily apartment?",
  "What assumptions should I model for a 5-year hold of a property?",
  "How do I get started in multifamily investing? ",
];


export function ClosingChat() {
//const [userClass, setUserClass] = useState<UserClass>(DEFAULT_USER_CLASS);
const [userClass, setUserClass] = useState<UserClass>('charlie_chat'); // Remove the line above when we go to production

const {
  user: currentUser,
  isLoading: isLoadingAuth,
  supabase
} = useAuth() as { user: ExtendedUser; isLoading: boolean; supabase: any };

useEffect(() => {
  const fetchStripeCustomerId = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("stripe_customer_id,user_class") //ADDED user_class to fetch so we can determine which packages and services
      .eq("user_id", currentUser.id)
      .single();

    if (error) {
      console.error("Error fetching stripe_customer_id:", error.message);
    } else if (data?.stripe_customer_id) {
      console.log("✅ Fetched stripe_customer_id:", data.stripe_customer_id);
      // Use the value directly wherever you need it, don't set it on currentUser
    }
  };

  if (currentUser?.id) {
    fetchStripeCustomerId();
  }
}, [currentUser?.id, supabase]);

const stripeCustomerId = (currentUser as any)?.stripe_customer_id;
  const router = useRouter();
  const [userCredits, setUserCredits] = useState<number | null>(null);
  useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");

  if (sessionId && currentUser) {
    console.log("✅ Stripe checkout returned with session_id:", sessionId);

    // Clean up URL so session_id disappears
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);

    const refreshCredits = async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("user_id", currentUser.id)
        .single();

      if (error) {
        console.error("❌ Error refreshing credits after checkout:", error);
      } else {
        console.log("✅ Credits refreshed after checkout:", profile.credits);
        setUserCredits(profile.credits);
      }
    };

    refreshCredits();
  }
}, [currentUser]);


const availablePackages = getPackagesFor(userClass);

  const [showBuyCreditsTooltip, setShowBuyCreditsTooltip] = useState(false);
  const [showCreditOptionsModal, setShowCreditOptionsModal] = useState(false);

  const isLoggedIn = !!currentUser;

  const [messages, setMessages] = useState<{ role: string; content: string, isPropertyDump?: boolean }[]>([]);
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
    const fieldsToSend = [
      "absenteeOwner", "address", "adjustableRate", "assessedValue", "assumable",
      "corporateOwned", "estimatedEquity", "estimatedValue", "floodZone", "floodZoneDescription",
      "forSale", "inStateAbsenteeOwner", "lastSaleAmount", "lastSaleArmsLength", "lastSaleDate",
      "lenderName", "listingAmount", "lotSquareFeet", "maturityDateFirst", "mlsActive",
      "mlsLastSaleDate", "openMortgageBalance", "outOfStateAbsenteeOwner", "owner1FirstName",
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
            value = JSON.stringify(value);
          } else if (value === "") { // Skip empty strings
            continue;
          }


          const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

          propertyDetails += `${fieldLabel}: ${value}\n`;
        }
      }

      if (propertyDetails.trim() === "") {
        propertyDetails = "No additional specified details available for this property.\n";
      }

      return `**${index + 1}. ${mainDisplayAddress}**\n${propertyDetails.trim()}`;
    });

    const summaryPrompt = `Give me a market summary and an insightful underwriting strategy for each property. Ruminate, don't rush. Use infomration on tax liens, assumable, pre foreclosure, and auction flags when formulating your strategy. Mortgage balance and owner equity are also very important. Consider the following details if available:\n\n---\n${rows.join("\n\n---\n")}\n---`;

    //sendMessage(summaryPrompt);
    sendMessage(summaryPrompt, true);
    
    setSelectedListings([]);
  };

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

const fetchUserCreditsAndClass = async (userToFetchFor: User) => {
  if (!supabase) {
    console.error("[ClosingChat] Supabase client not available.");
    if (isMounted) setUserCredits(null);
    return;
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, user_class')
      .eq('user_id', userToFetchFor.id)
      .single();

    if (!isMounted) return;

    if (profileError) {
      console.error(`[ClosingChat] Error fetching profile for ${userToFetchFor.id}:`, profileError.message);
      setUserCredits(null);
    } else if (profile) {
      setUserCredits(profile.credits);
      if (profile.user_class) {
        setUserClass(profile.user_class as UserClass);
      } else {
        console.warn("No user_class found, leaving default in place.");
      }
    } else {
      setUserCredits(0);
    }
  } catch (e: any) {
    if (!isMounted) return;
    console.error(`[ClosingChat] Exception during profile fetch:`, e.message);
    setUserCredits(null);
  }
};


    if (currentUser && isMounted) {
      // currentUser is from useAuth(). If it exists, fetch their credits.
      fetchUserCreditsAndClass(currentUser);
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
      const storedPro = localStorage.getItem("charlie_chat") === "true";
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

  const sendMessage = async (message: string, isPropertyDump = false) => {
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

    setMessages((prev) => [...prev, { role: "user", content: message, isPropertyDump }, { role: "assistant", content: "" }]);
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
          if (json === "[DONE]") return;
    
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

const handleSubscriptionCheckout = async (productId: string, plan: "monthly" | "annual") => {
console.log("→ Subscription payload:", { productId, plan }); //FOR DEBUGGING
console.log("🔍 About to call checkout endpoint at:", window.location.origin + "/api/stripe/checkout");
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, plan }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    console.error("Subscription checkout failed:", data.error);
    alert("Checkout failed: " + (data.error || "Unknown error"));
  }
};

const handlePackageSelection = async (userClass: string, amount: number) => {
  if (!currentUser?.id) {
    alert("Missing user ID. Please sign in again.");
    return;
  }

  // Fetch stripe_customer_id from Supabase
  const { data, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", currentUser.id)
    .single();

  if (error || !data?.stripe_customer_id) {
    console.error("Missing or invalid Stripe customer ID:", error?.message);
    alert("We couldn’t start checkout because your account is missing billing info. Please contact support.");
    return;
  }

  const params = new URLSearchParams({
    amount: amount.toString(),
    userClass,
    userId: currentUser.id,
    stripeCustomerId: data.stripe_customer_id,
  });

  router.push(`/checkout/credit-pack?${params.toString()}`);
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
      <div className="flex h-screen overflow-hidden bg-white text-black">
         {/* Sidebar */}
         <Sidebar
          onSearch={async (filters: Record<string, string | number | boolean>) => {
            console.log("🚀 Sending API request:", filters); 

            try {
              const res = await fetch("/api/realestateapi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(filters),
              });
            
              const data = await res.json();
              console.log("🔍 Raw Returned data:", data);
              setListings(data || []);
            } catch (err) {
              console.error("Realestateapi API error:", err);
            }
          }}
          listings={listings}
          selectedListings={selectedListings}
          toggleListingSelect={toggleListingSelect}
          onSendToGPT={onSendToGPT}
          isLoggedIn={isLoggedIn}
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
  <div
  className={`leading-relaxed font-sans ${
    isUser && m.isPropertyDump ? "text-[2px] text-gray-500" : "text-base"
  }`}
>
  <ReactMarkdown
    components={{
      h1: (props) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
      h2: (props) => <h2 className="text-base font-semibold mt-3 mb-2" {...props} />,
      h3: (props) => <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />,
      p: (props) => <p className="mb-2 last:mb-0 whitespace-pre-line" {...props} />,
      strong: (props) => <strong className="font-semibold" {...props} />,
      ul: (props) => <ul className="list-disc pl-5 my-2" {...props} />,
      li: (props) => <li className="mb-1" {...props} />,
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
                        setShowModal(true);
                    } else if (!isPro) {
                        setShowProModal(true);
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
    <Dialog.Panel className="w-full max-w-xs rounded p-6 text-center space-y-4 shadow-xl" style={{ backgroundColor: '#1C599F' }}>
      <Dialog.Title className="text-lg font-semibold text-white">
        Sign up now to continue using Charlie Chat
      </Dialog.Title>
      <Dialog.Description className="text-sm text-white">
        Includes 50 FREE property listings!<br />
        No credit card required.
      </Dialog.Description>

      <button
        onClick={async () => {
          try {
            const res = await fetch("/api/stripe/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT,
                plan: "monthly",
              }),
            });
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
      >
        {/*Sign up for 3 days of free access! No credit card required!*/}
      </button>
      <button
        onClick={() => {
          router.push("/signup");
        }}
        className="w-full border border-blue-300 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Sign Up
      </button>
    </Dialog.Panel>
  </div>
</Dialog>*/

      <Dialog open={showProModal} onClose={() => setShowProModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded bg-white p-6 text-center space-y-4 shadow-xl">
            <Dialog.Title className="text-lg font-semibold">
              Charlie Chat Pro 🔒
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500">
              File uploads and enhanced analytics are coming soon!
            </Dialog.Description>
             {/*      
            <button
              onClick={handleCheckout}
              className="bg-black text-white px-4 py-2 rounded mt-4 hover:bg-gray-800 transition"
            >
              Upgrade Now 💳
            </button>
            */}
          </Dialog.Panel>
        </div>
      </Dialog>


{/* Full-screen black overlay whenever the credit modal is open */}
{showCreditOptionsModal && (
  <div
    className="fixed inset-0 bg-black opacity-75 z-40"
    aria-hidden="true"
  />
)}
<Dialog
  open={showCreditOptionsModal}
  onClose={() => setShowCreditOptionsModal(false)}
  className="fixed inset-0 z-50 flex items-center justify-center"
>

  {/* Panel */}
  <Dialog.Panel className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
    {/* Title */}
    <Dialog.Title className="text-2xl font-semibold text-gray-900 mb-2">
      Purchase More Credits
    </Dialog.Title>

    {/* Subtitle */}
    <p className="text-sm text-gray-700 mb-6">
      You’re running low on properties. Add more now to continue your analysis and find your next investment.
    </p>

{/* Option Buttons */}
<div className="space-y-3">
  {availablePackages.map((pkg, i) => (
    <button
      key={i}
      onClick={() => handlePackageSelection(userClass, pkg.amount)} 
      className="w-full py-3 rounded-md text-white font-medium cursor-pointer"
      style={{
        backgroundColor: ['#1C599F', '#174A7F', '#133A5F'][i] || '#1C599F'
      }}
    >
      Buy {pkg.amount} Credits — ${pkg.price}
    </button>
  ))}
</div>


    {/* Cancel */}
    <div className="mt-6 text-right">
      <button
        onClick={() => setShowCreditOptionsModal(false)}
        className="inline-block px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
      >
        Cancel
      </button>
    </div>
  </Dialog.Panel>
</Dialog>


{isLoggedIn && userCredits !== null && (
  <div
    className={`fixed bottom-4 right-4 z-50 text-white font-bold p-3 rounded-lg shadow-lg min-w-[110px] text-center ${
      userCredits <= 5
        ? "bg-red-500"
        : userCredits <= 20
        ? "bg-yellow-500"
        : "bg-orange-500"
    } bg-opacity-75`}
    title={`You have ${userCredits} credits remaining.`}
    onMouseEnter={() => setShowBuyCreditsTooltip(true)}
    onMouseLeave={() => setShowBuyCreditsTooltip(false)}
    onClick={() => setShowCreditOptionsModal(true)}
  >
    {showBuyCreditsTooltip ? "+ More" : `Credits: ${userCredits}`}
  </div>
)}
</>
);
}