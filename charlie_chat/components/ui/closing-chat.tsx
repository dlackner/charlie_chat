"use client";

import { Dialog } from "@headlessui/react";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Sidebar } from "@/components/ui/sidebar";
import { Plus, SendHorizonal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { ComposerAddAttachment, ComposerAttachments } from "@/components/attachment";
import type { User } from '@supabase/supabase-js'
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  Attachment,
  AttachmentStatus,
} from "@assistant-ui/react";
import OpenAI from "openai";

// Extend the Window interface to include our custom properties
declare global {
  interface Window {
    __LATEST_FILE_ID__?: string;
    __LATEST_FILE_NAME__?: string;
    __CURRENT_THREAD_ID__?: string;
  }
}

//const DEFAULT_USER_CLASS: UserClass = 'charlie_chat'; 
//const [userClass, setUserClass] = useState<UserClass>('charlie_chat'); // WE SET THIS DOWN BELOW
type ExtendedUser = User & {
  stripe_customer_id?: string;
};
type Listing = {
  id: string;
  address: {
    street?: string;
    address: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  mailAddress?: {
    address?: string;
    city?: string;
    county?: string;
    state?: string;
    street?: string;
    zip?: string;
  };
  lastSaleArmsLength?: boolean;
  mlsActive?: boolean;
  lastSaleAmount?: number;
  lotSquareFeet?: number;
  yearsOwned?: number;
  outOfStateAbsenteeOwner?: number;
  property_type?: string;
  squareFeet?: number;
  rentEstimate?: number;
  assessedLandValue?: number;
  assessedValue?: number;
  assumable?: boolean;
  auction?: boolean;
  corporate_owned?: boolean;
  estimatedEquity?: number;
  estimatedValue?: number;
  floodZone?: boolean;
  foreclosure?: boolean;
  forSale?: boolean;
  privateLender?: boolean;
  inStateAbsenteeOwner?: boolean;
  investorBuyer?: boolean;
  lastSaleDate?: string;
  lenderName?: string;
  listingPrice?: number;
  mortgageBalance?: number;
  mortgageMaturingDate?: string;
  yearBuilt?: number;
  ownerOccupied?: boolean;
  preForeclosure?: boolean;
  reo?: boolean;
  taxLien?: boolean;
  totalPortfolioEquity?: number;  
  totalPortfolioMortgageBalance?: number; 
  totalPropertiesOwned?: number;
  floodZoneDescription?: string;
  unitsCount?: number;
  owner1FirstName?: string;
  owner1LastName?: string;
  stories?: number;
};

// DEFINE USER CLASSES AND PROPERTY PACKAGES.  NOT CONNECTED TO THE NEW LIB\PRICING.TS FILE YET
import { PACKAGES, getPackagesFor } from '@/lib/pricing';
import { AuthenticationError } from "openai";

type UserClass = 'trial' |'charlie_chat' | 'charlie_chat_pro' | 'cohort';

const EXAMPLES = [
  "How do I creatively structure seller financing?",
  "What are the key metrics when evaluating a multifamily property?",
  "What assumptions should I model for a 5-year hold of a property?",
  "How do I get started in multifamily investing? ",
];

// PDF Attachment Adapter
class PDFAttachmentAdapter {
  matches(attachment: Attachment) {
    return attachment.file?.type === "application/pdf";
  }

async send(attachment: Attachment): Promise<{
  id: string;
  type: "document";
  name: string;
  content: any[];
  status: AttachmentStatus;
}> {
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const uploaded = await openai.files.create({
    file: attachment.file!,
    purpose: "assistants",
  });

  // Store the file_id globally so we can access it later
  window.__LATEST_FILE_ID__ = uploaded.id;
  window.__LATEST_FILE_NAME__ = attachment.file!.name;
  
  console.log("📎 File uploaded with ID:", uploaded.id);

  return {
    id: attachment.id,
    type: "document",
    name: attachment.file!.name,
    content: [
      {
        type: "file_search",
        file_id: uploaded.id,
      },
    ],
    status: { type: "complete" },
  };
}

  async remove(attachment: Attachment) {
    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    });
    
    const fileId = (attachment.content?.[0] as any)?.file_id;
    if (fileId) {
      try {
        await openai.files.del(fileId);
      } catch (err) {
        console.warn("Failed to delete file from OpenAI:", err);
      }
    }
  }
}

export function ClosingChat() {
  // Add this component here
  const PropertyAnalysisLoader = ({ propertyCount, currentProperty = null }: { propertyCount: number; currentProperty?: string | null }) => {
    return (
      <div className="flex justify-start mb-4">
        <div className="inline-block max-w-[75%] px-4 py-3 bg-gray-100 text-gray-800 rounded-xl rounded-bl-none shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="leading-relaxed">
              <div className="font-medium">
                {currentProperty 
                  ? `Analyzing ${currentProperty}...` 
                  : `Wait while Charlie analyzes your ${propertyCount} ${propertyCount === 1 ? 'property' : 'properties'}`
                }
              </div>
              <div className="text-sm text-gray-600 mt-1">
                This may take a moment...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };


const [userClass, setUserClass] = useState<UserClass>('charlie_chat'); 


const {
  user: currentUser,
  isLoading: isLoadingAuth,
  supabase,
} = useAuth() as { user: ExtendedUser; isLoading: boolean; supabase: any };

const { chatState, updateChatState, clearChat } = useChat();

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

  const messages = chatState.messages;
  const input = chatState.input;
  const threadId = chatState.threadId;
  const listings = chatState.listings;
  const selectedListings = chatState.selectedListings;
  const [showProModal, setShowProModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [count, setCount] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [batchSize] = useState(2);
  const [isWaitingForContinuation, setIsWaitingForContinuation] = useState(false);
  const [totalPropertiesToAnalyze, setTotalPropertiesToAnalyze] = useState(0);
  const hasMessages = messages.length > 0;
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
const [isUploadingFile, setIsUploadingFile] = useState(false);
const runtime = useChatRuntime({
  api: "/api/chat",
  adapters: {
    attachments: {
      accept: "application/pdf",
      add: async ({ file }: { file: File }) => {
  // Clear any previous errors
  setUploadError(null);
  
  // Validate file type
  if (file.type !== "application/pdf") {
    const errorMsg = `Only PDF files are supported. You tried to upload: ${file.name}`;
    setUploadError(errorMsg);
    
    // Auto-clear error after 5 seconds
    setTimeout(() => setUploadError(null), 5000);
    
    throw new Error(errorMsg);
  }

  // Set loading state at the start
  setIsUploadingFile(true);
  
  try {
    // Auto-clear existing attachments before adding new one
    try {
      // Clear visual elements first
      const attachmentElements = document.querySelectorAll('div[class*="flex-grow"][class*="basis-0"]');
      attachmentElements.forEach(container => {
        const textContent = container.textContent || '';
        if (textContent.includes('Property_Profile') || textContent.includes('.pdf')) {
          const parentContainer = container.closest('div[class*="relative mt-3"]');
          if (parentContainer) {
            parentContainer.remove();
          } else {
            container.remove();
          }
        }
      });
      
      // Clear stored file references
      if ((window as any).__LATEST_FILE_ID__) {
        // Delete previous file from OpenAI
        const openai = new OpenAI({
          apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
          dangerouslyAllowBrowser: true,
        });
        try {
          await openai.files.del((window as any).__LATEST_FILE_ID__);
          console.log("Deleted previous file:", (window as any).__LATEST_FILE_ID__);
        } catch (err) {
          console.warn("Failed to delete previous file:", err);
        }
      }
      
      delete (window as any).__LATEST_FILE_ID__;
      delete (window as any).__LATEST_FILE_NAME__;
      
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (e) {
      console.log("Could not auto-clear existing attachments:", e);
    }

   // Now add the new attachment
       const adapter = new PDFAttachmentAdapter();
const result = await adapter.send({
  id: crypto.randomUUID(),
  file,
  type: "document",
  name: file.name,
  contentType: "application/pdf",
  status: { type: "requires-action", reason: "composer-send" }
});
    // Clear thread to start fresh conversation with new document
    localStorage.removeItem("threadId");
    delete (window as any).__CURRENT_THREAD_ID__;

    console.log("New document uploaded - cleared thread for fresh conversation");
    return {
      ...result,
      contentType: "application/pdf",
      file: file
    };
    
  } catch (error) {
    console.error("File upload failed:", error);
    throw error;
 } finally {
    // Clear loading state when done (success or failure)
    setIsUploadingFile(false);
  }
},
      remove: async (attachment: Attachment) => {
        const fileId = (attachment.content?.[0] as any)?.file_id;
        if (fileId) {
          try {
            const openai = new OpenAI({
              apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
              dangerouslyAllowBrowser: true,
            });
            await openai.files.del(fileId);
          } catch (err) {
            console.warn("Failed to delete file from OpenAI:", err);
          }
        }
      },
    } as any,
  },
});
  const handleCreditsUpdated = (newBalance: number) => {
    //console.log("[ClosingChat] handleCreditsUpdated CALLED with newBalance:", newBalance);
    setUserCredits(prevCredits => {
      //console.log("[ClosingChat] Previous credits state:", prevCredits, "New credits to set:", newBalance);
      return newBalance;
    });
  };
  
  const handleDoneWithProperty = async () => {
  try {
    // 1. Delete the file from OpenAI
    if ((window as any).__LATEST_FILE_ID__) {
      const openai = new OpenAI({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      });
      
      try {
        await openai.files.del((window as any).__LATEST_FILE_ID__);
        console.log("🗑️ Deleted file from OpenAI:", (window as any).__LATEST_FILE_ID__);
      } catch (err) {
        console.warn("Failed to delete file from OpenAI:", err);
      }
    }

    // 2. Clear all file references
    delete (window as any).__LATEST_FILE_ID__;
    delete (window as any).__LATEST_FILE_NAME__;

    // 3. Force a re-render to update the UI
    updateChatState({ messages: [...messages] }); // Trigger re-render

    console.log("✅ Done with property - switched back to general mode");
    
  } catch (error) {
    console.error("Error removing property:", error);
  }
};

  const toggleListingSelect = (listing: any) => {
    const exists = selectedListings.some((l) => l.id === listing.id);
    if (exists) {
      updateChatState({ selectedListings: selectedListings.filter((l) => l.id !== listing.id) });
    } else {
      updateChatState({ selectedListings: [...selectedListings, listing] });
    }
  };
const onSendToGPT = (filteredListings?: any[], autoProcessOrBatchIndex?: boolean | number) => {
  // Handle both calling patterns
  let batchIndex = 0;
  let autoProcess = false;
  let listingsToProcess = selectedListings;

  if (Array.isArray(filteredListings)) {
    // Called from sidebar with filtered listings
    listingsToProcess = filteredListings;
    batchIndex = 0;
    autoProcess = typeof autoProcessOrBatchIndex === 'boolean' ? autoProcessOrBatchIndex : false;
  } else {
    // Called internally with batch index (existing behavior)
    batchIndex = filteredListings || 0;
    autoProcess = typeof autoProcessOrBatchIndex === 'boolean' ? autoProcessOrBatchIndex : false;
    listingsToProcess = selectedListings;
  }
  // Batch processing logic
if (batchIndex === 0) {
  // Starting fresh analysis - store total count
  setTotalPropertiesToAnalyze(selectedListings.length);
  setCurrentBatch(0);
  setIsWaitingForContinuation(false);
  
  // Add loading message to chat
  updateChatState({
    messages: [...messages, {
      role: "assistant",
      content: "",
      metadata: { isLoading: true, propertyCount: selectedListings.length }
    }]
  });
}

// Calculate which properties to analyze in this batch
const startIndex = batchIndex * batchSize;
const endIndex = Math.min(startIndex + batchSize, listingsToProcess.length);
const propertiesForThisBatch = listingsToProcess.slice(startIndex, endIndex);

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
    // Data is already filtered by sidebar, just format it nicely
const propertyDetails = Object.entries(listing)
  .filter(([key, value]) => {
    return value !== null && 
           value !== undefined && 
           value !== "" && 
           key !== 'address' && 
           key !== 'id';
  })
  .map(([key, value]) => {
    const fieldLabel = fieldMappings[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    
    if (typeof value === 'boolean') {
      value = value ? "Yes" : "No";
    } else if (typeof value === 'object' && value !== null) {
      if (key === "mailAddress") {
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
        value = JSON.stringify(value);
      }
    } else if (typeof value === 'number') {
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
        value = `${value.toLocaleString()} sq ft`;
      } else {
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

  const summaryPrompt = `Senior multifamily analyst: Analyze each property using ONLY provided data. Calculate exact numbers, no generic statements.

  For EACH property calculate but do not show the calculations::
  
  **CALCULATIONS REQUIRED:**
  - LTV: (openMortgageBalance ÷ estimatedValue) × 100
  - Equity: estimatedValue - openMortgageBalance 
  - Appreciation: ((estimatedValue - lastSaleAmount) ÷ lastSaleAmount) × 100
  - Price/Unit: estimatedValue ÷ unitsCount
  - Tax Ratio: assessedValue ÷ estimatedValue
  
  **ANALYZE:**
  1. Owner: corporateOwned, yearsOwned, totalPropertiesOwned, distress signals
  2. Property: age, units, sq ft, flood risk, financing details
  3. Strategy: Based on LTV, equity, owner motivation, distress flags
  
  **OUTPUT:**
  **Property: [Address] - [units] Units, Built [year]**
  - LTV: X% | Equity: $X | Price/Unit: $X | Appreciation: X%
  - Owner: [name], [years] owned, [portfolio size], [motivation signals]
  - Strategy: [specific approach based on data]
  - **Verdict: Pursue/Monitor/Pass** - [data-driven rationale]
  
  Use actual numbers only. Reference specific amounts/percentages from data.
  
  **BATCH ${batchIndex + 1} ANALYSIS** - Properties ${startIndex + 1}-${endIndex} of ${totalPropertiesToAnalyze}
  
  ---
  ${rows.join("\n\n---\n")}
  ---`;

  // Send the full prompt to the API but display simplified message to user
  sendMessage(summaryPrompt, true, `Analyzing properties`);
  
  // Update batch tracking
setCurrentBatch(batchIndex + 1);

// Check if there are more properties to analyze
const hasMoreProperties = endIndex < selectedListings.length;

if (hasMoreProperties && !autoProcess) {
  // Wait for user to decide whether to continue
  setIsWaitingForContinuation(true);
} else if (!hasMoreProperties) {
  // All done - clear selections
  updateChatState({ selectedListings: [] });
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
  }, [currentUser, supabase])
  ;

  // Safe access to localStorage on client only (for non-auth critical things or fallbacks)
  useEffect(() => {
    // Only set from localStorage if NOT logged in or if these are supplementary
    if (!isLoggedIn) {
      const storedPro = localStorage.getItem("charlie_chat") === "true";
      const storedCount = Number(localStorage.getItem("questionCount") || 0);
      setIsPro(storedPro); // This might be overridden if logged in and fetching from DB
      setCount(isNaN(storedCount) ? 0 : storedCount);
    }
    // ThreadId is now handled by ChatContext
  }, [isLoggedIn]); // Re-run if login status changes

const scrollToBottom = useCallback(() => {
  if (bottomRef.current) {
    bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }
}, []);

const throttledScroll = useCallback(() => {
  if (!isStreaming) {
    scrollToBottom();
  }
}, [isStreaming, scrollToBottom]);

useEffect(() => {
  const timeoutId = setTimeout(() => {
    throttledScroll();
  }, 100);

  return () => clearTimeout(timeoutId);
}, [messages, throttledScroll]);

 const sendMessage = async (message: string, isPropertyDump = false, displayMessage?: string) => {
  if (!message.trim()) return;
  
  // Your existing message limit checks
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

  setCount((prev) => prev + 1);

  // Check if there are attachments in the UI
const hasAttachments = document.querySelector('[data-attachment]') !== null ||
                      document.querySelector('.aui-attachment') !== null ||
                      document.querySelector('[class*="attachment"]') !== null ||
                      document.querySelector('[class*="file"]') !== null ||
                      Array.from(document.querySelectorAll('div')).some(el => el.textContent?.includes('Property_Profil'));

console.log("Attachment detection:", {
  dataAttachment: !!document.querySelector('[data-attachment]'),
  auiAttachment: !!document.querySelector('.aui-attachment'),
  anyAttachment: !!document.querySelector('[class*="attachment"]'),
  fileElement: !!document.querySelector('[class*="file"]'),
  propertyDiv: Array.from(document.querySelectorAll('div')).some(el => el.textContent?.includes('Property_Profil')),
  hasAttachments
});

console.log("All possible attachment elements:");
console.log("Elements with 'document':", document.querySelectorAll('*[class*="document"]'));
console.log("Elements with 'file':", document.querySelectorAll('*[class*="file"]'));
console.log("Elements with 'composer':", document.querySelectorAll('*[class*="composer"]'));
console.log("All divs with text content:", Array.from(document.querySelectorAll('div')).filter(el => el.textContent?.includes('Property_Profil')));
  
if (hasAttachments) {
  console.log("Using custom system WITH attachments");
    localStorage.removeItem("threadId");
    updateChatState({ threadId: null });
  
  // Try to extract attachment data from the DOM/runtime state
  let attachmentData = [];
  
  // Method 1: Try to find attachment data in the runtime state
  try {
    // Look for attachment data in various places
    const runtimeState = runtime.getState?.();
    if (runtimeState?.attachments) {
      attachmentData = runtimeState.attachments;
    }
  } catch (e) {
    console.log("Runtime getState failed:", e);
  }
  
  // Method 2: If no runtime data, create attachment data from DOM
if (attachmentData.length === 0) {
  const fileElements = document.querySelectorAll('[class*="file"]');
  const propertyDivs = Array.from(document.querySelectorAll('div')).filter(el => el.textContent?.includes('Property_Profil'));
  
  if (fileElements.length > 0 || propertyDivs.length > 0) {
    console.log("Found attachment elements but need to extract file_id");
    console.log("File elements:", fileElements);
    console.log("Property divs:", propertyDivs);
    
    // Use the stored file_id from upload
    const storedFileId = window.__LATEST_FILE_ID__;
    const storedFileName = window.__LATEST_FILE_NAME__ || "Property_Profile.pdf";
    
    if (storedFileId) {
      console.log("Using stored file_id:", storedFileId);
      attachmentData.push({
        id: crypto.randomUUID(),
        type: "document", 
        name: storedFileName,
        content: [{
          type: "file_search",
          file_id: storedFileId
        }],
        status: { type: "complete" }
      });
    } else {
      console.log("No stored file_id found - creating placeholder");
      attachmentData.push({
        id: crypto.randomUUID(),
        type: "document", 
        name: "Property_Profile.pdf",
        content: [{
          type: "file_search",
          file_id: "PLACEHOLDER"
        }],
        status: { type: "complete" }
      });
    }
  }
}
  
  console.log("Extracted attachment data:", attachmentData);
  
// Add message to your UI for display
const messageToDisplay = displayMessage || message;
updateChatState({
  messages: [...messages, 
    { role: "user", content: messageToDisplay, metadata: { isPropertyDump } }, 
    { role: "assistant", content: "" }
  ],
  input: ""
});

// Let the AI decide if the document is relevant
const enhancedMessage = message; // Don't force document usage

const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    message: enhancedMessage,  // Just the original message
    threadId,
    attachments: attachmentData  // Attachments available but not forced
  }),
});


// Continue with your existing streaming logic...
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
             const newMessages = [...messages];
  
  // Remove any loading messages
  const filteredMessages = newMessages.filter(msg => !msg.metadata?.isLoading);
  
  // Add or update the assistant response
  if (filteredMessages.length > 0 && filteredMessages[filteredMessages.length - 1].role === 'assistant') {
      filteredMessages[filteredMessages.length - 1].content = fullText;
  } else {
    filteredMessages.push({ role: "assistant", content: fullText });
  }
  
  updateChatState({ messages: filteredMessages });
            }
          }
        }
      } catch (err) {
        console.warn("❌ Failed to parse line:", json, err);
      }
    }
  }
  
  // Handle threadId assignment
  if (!threadId && res.headers) {
    const newThreadId = res.headers.get("x-thread-id");
    if (newThreadId && newThreadId.startsWith("thread_")) {
      const titles = JSON.parse(localStorage.getItem("chatTitles") || "{}");
      titles[newThreadId] = message.slice(0, 50);
      localStorage.setItem("chatTitles", JSON.stringify(titles));
      updateChatState({ threadId: newThreadId });
      localStorage.setItem("threadId", newThreadId);
    }
  }
}
  
} else {
  console.log("Using custom system (no attachments)");
    
    // Your existing custom sendMessage logic
    const messageToDisplay = displayMessage || message;
    updateChatState({
      messages: [...messages, 
        { role: "user", content: messageToDisplay, metadata: { isPropertyDump } }, 
        { role: "assistant", content: "" }
      ],
      input: ""
    });

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, threadId }),
    });

    // Handle threadId assignment
if (!threadId && res.headers) {
  const newThreadId = res.headers.get("x-thread-id");
  if (newThreadId && newThreadId.startsWith("thread_")) {
    const titles = JSON.parse(localStorage.getItem("chatTitles") || "{}");
    titles[newThreadId] = message.slice(0, 50);
    localStorage.setItem("chatTitles", JSON.stringify(titles));
    updateChatState({ threadId: newThreadId });
    localStorage.setItem("threadId", newThreadId);
  }
}
    // Your existing streaming logic...
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
                  const newMessages = [...messages];
  
  // Remove any loading messages
  const filteredMessages = newMessages.filter(msg => !msg.metadata?.isLoading);
  
  // Add or update the assistant response
  if (filteredMessages.length > 0 && filteredMessages[filteredMessages.length - 1].role === 'assistant') {
      filteredMessages[filteredMessages.length - 1].content = fullText;
  } else {
    filteredMessages.push({ role: "assistant", content: fullText });
  }
  
  updateChatState({ messages: filteredMessages });
                }
              }
            }
          } catch (err) {
            console.warn("❌ Failed to parse line:", json, err);
          }
        }
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
  <AssistantRuntimeProvider runtime={runtime}>
    <>
      {/* Main layout container */}
      <div className="flex h-screen overflow-hidden bg-white text-black">
         {/* Sidebar */}
 
<Sidebar
  onSearch={async (filters: Record<string, string | number | boolean>) => {
    try {
      const res = await fetch("/api/realestateapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
    
      const data = await res.json();
      updateChatState({ listings: data || [] });
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
  {/* Header section - conditionally sized */}
  <div className={`transition-all duration-500 ease-in-out ${
    hasMessages 
      ? "py-2" // Minimal padding when chat is active
      : "py-8"  // Full padding when no messages
  }`}>
    <img
      src="/charlie.png"
      alt="Charlie Headshot"
      className={`rounded-full mx-auto shadow-md border transition-all duration-500 ease-in-out ${
        hasMessages 
          ? "w-12 h-12 mb-2" // Smaller when chat is active
          : "w-24 h-24 mb-4" // Full size when no messages
      }`}
    />
    <h1 className={`font-light text-center tracking-tight transition-all duration-500 ease-in-out ${
      hasMessages 
        ? "text-xl mb-1" // Smaller when chat is active
        : "text-3xl sm:text-5xl mb-2" // Full size when no messages
    }`}>
      Charlie Chat
    </h1>
    {!hasMessages && ( // Only show subtitle when no messages
      <p className="text-center text-gray-500 mb-6 text-sm sm:text-base">
        Conversational AI for Multifamily Investors
      </p>
    )}
  </div>

  {/* Message list */}
  <div className={`w-full max-w-4xl flex-1 overflow-y-auto px-6 space-y-4 transition-all duration-500 ease-in-out ${
    hasMessages 
      ? "py-2 pb-2" // Minimal top padding when chat is active
      : "py-6 pb-2" // Full padding when no messages
  }`}>
    {/* Rest of your messages mapping code stays exactly the same */}
    {messages.map((m, i) => {
  // Show loading component for loading messages
  if (m.metadata?.isLoading) {
    return (
      <PropertyAnalysisLoader 
        key={i}
        propertyCount={m.metadata?.propertyCount || 0} 
      />
    );
  }
  
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
            <div className={`leading-relaxed font-sans text-base ${isUser && m.metadata?.isPropertyDump ? "italic" : ""}`}>
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
                    Please wait. Batch {currentBatch} in progress...
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
  onSendToGPT(undefined, currentBatch);
}}
                    className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                    style={{ cursor: 'pointer' }}
                  >
                    Analyze Next {Math.min(batchSize, totalPropertiesToAnalyze - (currentBatch * batchSize))} Properties
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsWaitingForContinuation(false);
                      updateChatState({ selectedListings: [] });
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
<div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-2">
{isUploadingFile ? (
  <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 border border-orange-200 rounded-lg">
    <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
    <span className="text-sm text-orange-700">Processing document...</span>
  </div>
) : (
  (window as any).__LATEST_FILE_NAME__ && (
    <div className="flex items-center gap-3">
      {/* Attachment display */}
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded">
        <div className="w-4 h-4 bg-red-500 rounded text-white text-xs flex items-center justify-center">📄</div>
        <span className="text-sm text-gray-700">{(window as any).__LATEST_FILE_NAME__}</span>
      </div>
      
      {/* NEW: Done with Property button */}
      <button
        onClick={handleDoneWithProperty}
        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
        title="Remove attachment and switch back to general mode"
      >
        Remove Document
      </button>
    </div>
  )
)}
  </div>

</div>
  {/* File upload error display */}
{uploadError && (
  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-center">
      <span className="text-red-500 mr-2">⚠️</span>
      <span className="text-red-700 text-sm">{uploadError}</span>
      <button 
        onClick={() => setUploadError(null)}
        className="ml-auto text-red-500 hover:text-red-700"
      >
        ✕
      </button>
    </div>
  </div>
)}
  <div className="flex items-center border border-gray-300 rounded-lg shadow-sm p-2 focus-within:ring-2 focus-within:ring-black">

{isLoggedIn && (userClass === 'charlie_chat_pro' || userClass === 'cohort') && <ComposerAddAttachment />}

{!(userClass === 'charlie_chat_pro' || userClass === 'cohort') && (
  <button
    type="button"
    onClick={() => (isLoggedIn ? setShowProModal(true) : setShowModal(true))}
    className="p-2 hover:bg-gray-100 rounded transition"
    title="Upgrade to Pro to upload"
  >
    <Plus className="w-5 h-5 text-gray-400" />
  </button>
)}

              <input
                id="chat-input"
                className="flex-1 px-3 py-2 text-base sm:text-lg focus:outline-none placeholder-gray-500"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => updateChatState({ input: e.target.value })}
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
              File uploads and enhanced analytics are only available in pro!
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
  </AssistantRuntimeProvider>
);
}