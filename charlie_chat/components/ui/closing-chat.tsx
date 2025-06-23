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

type UserClass = 'trial' |'charlie_chat' | 'charlie_chat_pro' | 'cohort';

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
  supabase,
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
      //console.log("✅ Fetched stripe_customer_id:", data.stripe_customer_id);
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
    //console.log("✅ Stripe checkout returned with session_id:", sessionId);

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
        //console.log("✅ Credits refreshed after checkout:", profile.credits);
        setUserCredits(profile.credits);
      }
    };

    refreshCredits();
  }
}, [currentUser]);


const availablePackages = userClass === 'trial' ? [] : getPackagesFor(userClass);

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
  const [currentBatch, setCurrentBatch] = useState(0);
  const [batchSize] = useState(2);
  const [isWaitingForContinuation, setIsWaitingForContinuation] = useState(false);
  const [totalPropertiesToAnalyze, setTotalPropertiesToAnalyze] = useState(0);
  const handleCreditsUpdated = (newBalance: number) => {
    //console.log("[ClosingChat] handleCreditsUpdated CALLED with newBalance:", newBalance);
    setUserCredits(prevCredits => {
      //console.log("[ClosingChat] Previous credits state:", prevCredits, "New credits to set:", newBalance);
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

const onSendToGPT = (batchIndex = 0, autoProcess = false) => {
  // Batch processing logic
if (batchIndex === 0) {
  // Starting fresh analysis - store total count
  setTotalPropertiesToAnalyze(selectedListings.length);
  setCurrentBatch(0);
  setIsWaitingForContinuation(false);
}

// Calculate which properties to analyze in this batch
const startIndex = batchIndex * batchSize;
const endIndex = Math.min(startIndex + batchSize, selectedListings.length);
const propertiesForThisBatch = selectedListings.slice(startIndex, endIndex);

console.log(`📊 Processing batch ${batchIndex + 1}, properties ${startIndex + 1}-${endIndex} of ${selectedListings.length}`);

// If no properties in this batch, we're done
if (propertiesForThisBatch.length === 0) {
  return;
}
  // Field mappings for better clarity
  const fieldMappings: { [key: string]: string } = {
    'reo': 'Bank Owned (REO)',
    'lastSaleArmsLength': 'Arms Length Sale',
    'absenteeOwner': 'Absentee Owner',
    'inStateAbsenteeOwner': 'In-State Absentee Owner',
    'outOfStateAbsenteeOwner': 'Out-of-State Absentee Owner',
    'mlsActive': 'Currently Listed on MLS',
    'mlsLastSaleDate': 'MLS Last Sale Date',
    'adjustableRate': 'Adjustable Rate Mortgage',
    'maturityDateFirst': 'First Mortgage Maturity Date',
    'maturingDate': 'Mortgage Maturity Date',
    'openMortgageBalance': 'Outstanding Mortgage Balance',
    'preForeclosure': 'Pre-Foreclosure Status',
    'taxLien': 'Tax Lien Status',
    'privateLender': 'Private Lender Financing',
    'unitsCount': 'Number of Units',
    'yearBuilt': 'Year Built',
    'yearsOwned': 'Years Owned by Current Owner',
    'squareFeet': 'Building Square Footage',
    'lotSquareFeet': 'Lot Size (sq ft)',
    'assessedValue': 'Tax Assessed Value',
    'estimatedValue': 'Estimated Market Value',
    'estimatedEquity': 'Estimated Owner Equity',
    'lastSaleAmount': 'Last Sale Price',
    'lastSaleDate': 'Last Sale Date',
    'rentEstimate': 'Estimated Monthly Rent',
    'floodZone': 'In Flood Zone',
    'floodZoneDescription': 'Flood Zone Details',
    'corporateOwned': 'Corporate Owned',
    'ownerOccupied': 'Owner Occupied',
    'owner1FirstName': 'Owner First Name',
    'owner1LastName': 'Owner Last Name',
    'ownerAddress': 'Owner Mailing Address',
    'mailAddress': 'Owner Mailing Address Details'
  };

  const rows = propertiesForThisBatch.map((listing: Listing, index: number) => {
  const globalIndex = startIndex + index + 1; // Show correct property numbers
    const mainDisplayAddress = listing.address?.address || "Unknown Address";
    
    // Send ALL available data instead of filtering specific fields
    const propertyDetails = Object.entries(listing)
      .filter(([key, value]) => {
        // Skip null, undefined, empty strings, and the main address (since we show it separately)
        return value !== null && 
               value !== undefined && 
               value !== "" && 
               key !== 'address'; // We handle address separately
      })
      .map(([key, value]) => {
        // Use field mapping if available, otherwise format the key nicely
        const fieldLabel = fieldMappings[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        
        // Handle different value types
        if (typeof value === 'boolean') {
          value = value ? "Yes" : "No";
        } else if (typeof value === 'object' && value !== null) {
          if (key === "mailAddress") {
            // Special handling for mail address object
            const mailAddr = value as any;
            let formattedMailAddress = "";
            if (mailAddr.street || mailAddr.address) {
              formattedMailAddress += (mailAddr.street || mailAddr.address);
            }
            if (mailAddr.city) {
              formattedMailAddress += formattedMailAddress ? `, ${mailAddr.city}` : mailAddr.city;
            }
            if (mailAddr.state) {
              formattedMailAddress += formattedMailAddress ? `, ${mailAddr.state}` : mailAddr.state;
            }
            if (mailAddr.zip) {
              formattedMailAddress += formattedMailAddress ? ` ${mailAddr.zip}` : mailAddr.zip;
            }
            value = formattedMailAddress.trim() || "N/A";
          } else {
            // For other objects, stringify them
            value = JSON.stringify(value);
          }
        } else if (typeof value === 'number') {
          // Format currency fields
          if (key.toLowerCase().includes('value') || 
              key.toLowerCase().includes('price') || 
              key.toLowerCase().includes('amount') || 
              key.toLowerCase().includes('equity') ||
              key.toLowerCase().includes('balance') ||
              key.toLowerCase().includes('rent')) {
            value = value.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
          } else if (key.toLowerCase().includes('squar') || key.toLowerCase().includes('feet')) {
            // Format square footage
            value = `${value.toLocaleString()} sq ft`;
          } else {
            // For other numbers, just add commas
            value = value.toLocaleString();
          }
        }
        
        return `${fieldLabel}: ${value}`;
      })
      .join('\n');

    // Handle the main address separately to include full address details
    let addressInfo = "";
    if (listing.address) {
      const addr = listing.address;
      let fullAddress = addr.address || "";
      if (addr.city) fullAddress += `, ${addr.city}`;
      if (addr.state) fullAddress += `, ${addr.state}`;
      if (addr.zip) fullAddress += ` ${addr.zip}`;
      addressInfo = `Full Address: ${fullAddress.trim()}\n`;
    }

    const finalPropertyDetails = addressInfo + propertyDetails;

    if (finalPropertyDetails.trim() === "") {
      return `**${index + 1}. ${mainDisplayAddress}**\nNo additional property details available.\n`;
    }

    return `**${globalIndex}. ${mainDisplayAddress}**\n${finalPropertyDetails.trim()}`;
  });

const summaryPrompt = `You are a senior multifamily acquisition analyst preparing detailed investment memos. You must analyze each property using SPECIFIC DATA PROVIDED - do not make generic statements.

**MANDATORY ANALYSIS REQUIREMENTS:**

For EACH property, you must:

1. **FINANCIAL METRICS** (calculate using exact numbers):
   - LTV Ratio: (openMortgageBalance ÷ estimatedValue) × 100
   - Current Equity Position: estimatedValue - openMortgageBalance 
   - Appreciation Since Purchase: ((estimatedValue - lastSaleAmount) ÷ lastSaleAmount) × 100
   - Price Per Unit: estimatedValue ÷ unitsCount
   - Price Per Square Foot: estimatedValue ÷ squareFeet (if available)
   - Tax Assessment Ratio: assessedValue ÷ estimatedValue (indicates tax efficiency)

2. **OWNER PROFILE & MOTIVATION** (use specific data):
   - Owner Type: corporateOwned vs individual, ownerOccupied vs absenteeOwner
   - Years Owned: yearsOwned (acquisition timing analysis)
   - Portfolio Context: totalPropertiesOwned, totalPortfolioValue, totalPortfolioEquity
   - Distress Signals: preForeclosure, auction, taxLien, reo status
   - Geographic Owner Type: inStateAbsenteeOwner vs outOfStateAbsenteeOwner

3. **PROPERTY FUNDAMENTALS**:
   - Building Details: yearBuilt (age = current year - yearBuilt), unitsCount, squareFeet, stories
   - Lot Analysis: lotSquareFeet, land value ratio (assessedLandValue ÷ assessedValue)
   - Risk Factors: floodZone status and floodZoneDescription
   - Market Activity: forSale, mlsActive, investorBuyer activity

4. **DEAL STRUCTURE OPPORTUNITIES**:
   - Assumable Loan: assumable status and implications
   - Existing Financing: openMortgageBalance, lenderName
   - Distressed Opportunities: preForeclosure + auction + foreclosure flags
   - Owner Leverage: Compare individual property equity vs total portfolio position

**OUTPUT FORMAT FOR EACH PROPERTY:**

**Property: [Address] - [unitsCount] Units, Built [yearBuilt]**

**Financial Analysis:**
- LTV: [calculated]% | Equity: $[amount] | Price/Unit: $[amount]
- Appreciation: [calculated]% over [yearsOwned] years ([annual]% annually)
- Tax Assessment: [ratio]% of market value (tax [advantage/disadvantage])

**Owner Situation:**
- [Owner name], [yearsOwned] years owned, [portfolio context]
- Motivation Signals: [specific distress flags or equity position]
- Owner Type: [specific classification and geographic status]

**Deal Strategy:**
- [Specific approach based on LTV, distress signals, owner motivation]
- [Financing opportunities - assumable loans, seller carry potential]
- [Negotiation leverage based on owner's portfolio position]

**Verdict:** [Pursue/Monitor/Pass] - [Specific data-driven rationale with numbers]

---

**CRITICAL:** You must calculate and show actual numbers. Reference specific dollar amounts, percentages, and ratios from the data. Do not make generic statements about "market conditions."

**BATCH ${batchIndex + 1} ANALYSIS** - Properties ${startIndex + 1}-${endIndex} of ${totalPropertiesToAnalyze}

---
${rows.join("\n\n---\n")}
---`;

  // Send the full prompt to the API but display simplified message to user
  sendMessage(summaryPrompt, true, `Analyzing properties ${startIndex + 1}-${endIndex} of ${totalPropertiesToAnalyze}...`);
  
  // Update batch tracking
setCurrentBatch(batchIndex + 1);

// Check if there are more properties to analyze
const hasMoreProperties = endIndex < selectedListings.length;

if (hasMoreProperties && !autoProcess) {
  // Wait for user to decide whether to continue
  setIsWaitingForContinuation(true);
} else if (!hasMoreProperties) {
  // All done - clear selections
  setSelectedListings([]);
  setIsWaitingForContinuation(false);
  setCurrentBatch(0);
  setTotalPropertiesToAnalyze(0);
}
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
      //console.log("[ClosingChat CreditsEffect] No current user from context, clearing local credits.");
      setUserCredits(null);
    }

    return () => {
      isMounted = false;
      //console.log("[ClosingChat CreditsEffect] Cleanup.");
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

  const sendMessage = async (message: string, isPropertyDump = false, displayMessage?: string) => {
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

    // Use displayMessage if provided (for property analysis), otherwise use the actual message
    const messageToDisplay = displayMessage || message;
    
    setMessages((prev) => [...prev, { role: "user", content: messageToDisplay, isPropertyDump }, { role: "assistant", content: "" }]);
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
    alert("We couldn't start checkout because your account is missing billing info. Please contact support.");
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
           //console.log("🚀 Sending API request:", filters); 

            try {
              const res = await fetch("/api/realestateapi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(filters),
              });
            
              const data = await res.json();
              //console.log("🔍 Raw Returned data:", data);
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
          userClass={userClass}
          triggerBuyCreditsModal={() => setShowCreditOptionsModal(true)}
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
  <div className={`leading-relaxed font-sans text-base ${isUser && m.isPropertyDump ? "italic" : ""}`}>
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

{/* UPDATED CONTINUATION UI - Removed "Analyze All Remaining" option */}
          {isWaitingForContinuation && (
            <div className="w-full max-w-4xl px-6 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <span className="text-lg">✅</span>
                  <h3 className="ml-2 text-lg font-semibold text-blue-900">
                    Batch {currentBatch} in process
                  </h3>
                </div>
                
                <p className="text-blue-800 mb-4">
                  Analyzing properties {((currentBatch - 1) * batchSize) + 1}-{Math.min(currentBatch * batchSize, totalPropertiesToAnalyze)} of {totalPropertiesToAnalyze}
                </p>

                <div className="mb-4">
                  <p className="text-sm text-blue-700 font-medium mb-2">
                    📋 Remaining properties ({totalPropertiesToAnalyze - (currentBatch * batchSize)}):
                  </p>
                  <div className="text-sm text-blue-600">
                    {selectedListings.slice(currentBatch * batchSize, currentBatch * batchSize + 3).map((listing, i) => (
                      <div key={i}>• {listing.address?.address || 'Unknown Address'}</div>
                    ))}
                    {totalPropertiesToAnalyze - (currentBatch * batchSize) > 3 && (
                      <div>• ... and {totalPropertiesToAnalyze - (currentBatch * batchSize) - 3} more</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsWaitingForContinuation(false);
                      onSendToGPT(currentBatch, false);
                    }}
                    className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                    style={{ cursor: 'pointer' }}
                  >
                    Analyze Next {Math.min(batchSize, totalPropertiesToAnalyze - (currentBatch * batchSize))} Properties
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsWaitingForContinuation(false);
                      setSelectedListings([]);
                      setCurrentBatch(0);
                      setTotalPropertiesToAnalyze(0);
                    }}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition font-medium"
                  >
                    Stop Here
                  </button>
                </div>
              </div>
            </div>
          )}

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
  
  
      {/* Replace the pricing page code with this simple modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
  <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <Dialog.Panel className="w-full max-w-md rounded bg-white p-6 text-center space-y-4 shadow-xl">
      <Dialog.Title className="text-lg font-semibold">
        Sign up now to continue using Charlie Chat
      </Dialog.Title>
      <Dialog.Description className="text-sm text-gray-500">
        Choose from our flexible plans!
      </Dialog.Description>
        
      <button
        onClick={() => router.push("/signup")}
        className="w-full bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
      >
        Sign Up For Free
      </button>
        
      <button
        onClick={() => router.push("/pricing")}
        className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-100 transition"
      >
        View Plans & Pricing
      </button>
    </Dialog.Panel>
  </div>
</Dialog>

      <Dialog open={showProModal} onClose={() => setShowProModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded bg-white p-6 text-center space-y-4 shadow-xl">
            <Dialog.Title className="text-lg font-semibold">
              Charlie Chat Pro
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500">
              File uploads and enhanced analytics are coming soon!
            </Dialog.Description>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Credit options modal and rest of your existing modals stay the same... */}
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
<Dialog.Panel className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
  {userClass === 'trial' ? (
    // ALL trial users see sign up message
    <>
      <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {userCredits === 0 || userCredits === null ? 
          "Sorry, but you are out of credits." : 
          `You have ${userCredits} credits remaining.`
        }
      </Dialog.Title>
      <p className="text-base font-semibold text-gray-900 mb-6 text-center">
        Sign up now to continue your analysis and find your next investment.
      </p>
      <div className="space-y-3">
        <button
          onClick={() => router.push("/pricing")}
          className="w-full py-3 rounded-md bg-black text-white font-medium hover:bg-gray-800 transition"
        >
          View Pricing Plans
        </button>
      </div>
    </>
  ) : (
      // Regular users (non-trial or trial with credits) - show purchase options
      <>
      <Dialog.Title className="text-2xl font-semibold text-gray-900 mb-2">
        Purchase More Credits
      </Dialog.Title>
      <p className="text-sm text-gray-700 mb-6">
        You're running low on properties. Add more now to continue your analysis and find your next investment.
      </p>
      <div className="space-y-3">
        {availablePackages.map((pkg, i) => (
          <button
            key={i}
            onClick={() => handlePackageSelection(userClass, pkg.amount)} 
            className="w-full py-3 rounded-md text-white font-medium cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg active:scale-95"
            style={{
              backgroundColor: ['#1C599F', '#174A7F', '#133A5F'][i] || '#1C599F'
            }}
          >
            Buy {pkg.amount} Credits — ${pkg.price}
          </button>
        ))}
      </div>
    </>
    )}
    
  </Dialog.Panel>
</Dialog>

{isLoggedIn && userCredits !== null && (
  <div 
    className="fixed bottom-4 right-4 z-50 group cursor-pointer"
    onClick={() => setShowCreditOptionsModal(true)}
    onMouseEnter={() => setShowBuyCreditsTooltip(true)}
    onMouseLeave={() => setShowBuyCreditsTooltip(false)}
    title={`You have ${userCredits} credits remaining. Click to buy more.`}
  >
    {/* Credits Display - hidden on hover */}
    <div
      className={`text-white font-bold px-4 py-3 rounded-lg shadow-lg min-w-[110px] text-center transition-all duration-300 ease-in-out group-hover:opacity-0 group-hover:scale-75 ${
        userCredits <= 5
          ? "bg-red-500"
          : userCredits <= 20
          ? "bg-yellow-500"
          : "bg-orange-500"
      } bg-opacity-75`}
    >
      Credits: {userCredits}
    </div>
    
    {/* Plus Button - shown on hover */}
    <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-in-out">
      <div className="bg-orange-500 hover:bg-orange-600 text-white font-bold w-12 h-12 rounded-full shadow-lg flex items-center justify-center">
        {/* Plus Icon */}
        <div className="relative">
          {/* Horizontal line */}
          <div className="w-6 h-0.5 bg-white rounded-full"></div>
          {/* Vertical line */}
          <div className="w-0.5 h-6 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>
    </div>
    
    {/* Tooltip */}
    {showBuyCreditsTooltip && (
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Buy More Credits
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
      </div>
    )}
  </div>
)}
</>
  );
}