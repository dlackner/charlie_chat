import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage, UserClass, Listing, ExtendedUser } from './chatTypes';
import { performFullCleanup, safeLocalStorageWrite } from '@/lib/localStorage-cleanup';

// Chat State Hook
export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Initialize thread and messages from localStorage with cleanup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Perform cleanup on app start
      performFullCleanup();
      
      const savedThreadId = localStorage.getItem("threadId");
      if (savedThreadId) {
        setThreadId(savedThreadId);
      }
      
      const savedMessages = localStorage.getItem("chatMessages");
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          // Add timestamps to messages that don't have them
          const messagesWithTimestamps = parsedMessages.map((msg: ChatMessage, index: number) => ({
            ...msg,
            timestamp: msg.timestamp || Date.now() - (parsedMessages.length - index) * 60000
          }));
          setMessages(messagesWithTimestamps);
          
          // Immediate scroll to bottom on load to prevent flash
          setTimeout(() => {
            scrollToBottom(false);
          }, 0);
        } catch (error) {
          console.error('Failed to parse saved messages:', error);
          localStorage.removeItem("chatMessages");
        }
      }
    }
  }, []);

  // Save threadId to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && threadId) {
      safeLocalStorageWrite("threadId", threadId);
    }
  }, [threadId]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      // Add timestamp to new messages
      const messagesWithTimestamps = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp || Date.now()
      }));
      safeLocalStorageWrite("chatMessages", JSON.stringify(messagesWithTimestamps));
    }
  }, [messages]);

  // Auto-scroll functionality
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isInitialLoad = useRef(true);
  
  const scrollToBottom = useCallback((smooth = false) => {
    if (bottomRef.current) {
      const scrollContainer = bottomRef.current.closest('.overflow-y-auto');
      if (scrollContainer) {
        // Scroll to show bottom messages but leave room for input
        const containerHeight = scrollContainer.clientHeight;
        const inputBuffer = 120; // Reserve space for chat input
        const targetPosition = scrollContainer.scrollHeight - containerHeight + inputBuffer;
        
        scrollContainer.scrollTo({
          top: Math.max(0, targetPosition),
          behavior: smooth ? "smooth" : "auto"
        });
      } else {
        // Fallback to original method
        bottomRef.current.scrollIntoView({ 
          behavior: smooth ? "smooth" : "auto",
          block: "center"
        });
      }
    }
  }, []);

  const throttledScroll = useCallback(() => {
    if (!isStreaming) {
      // Use instant scroll on initial load, smooth for updates
      scrollToBottom(!isInitialLoad.current);
      isInitialLoad.current = false;
    }
  }, [isStreaming, scrollToBottom]);

  useEffect(() => {
    // Immediate scroll for initial load, slight delay for updates
    const delay = isInitialLoad.current ? 0 : 100;
    const timeoutId = setTimeout(() => {
      throttledScroll();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [messages, throttledScroll]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    threadId,
    setThreadId,
    isStreaming,
    setIsStreaming,
    bottomRef: bottomRef as React.RefObject<HTMLDivElement>, 
    hasMessages: messages.length > 0
  };
};

// Property Batch Processing Hook
export const usePropertyBatch = () => {
  const [selectedListings, setSelectedListings] = useState<Listing[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [isWaitingForContinuation, setIsWaitingForContinuation] = useState(false);
  const [totalPropertiesToAnalyze, setTotalPropertiesToAnalyze] = useState(0);

  // Initialize batch state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBatchSelectedListings = localStorage.getItem("batchSelectedListings");
      if (savedBatchSelectedListings) {
        try {
          const parsedBatchSelectedListings = JSON.parse(savedBatchSelectedListings);
          setSelectedListings(parsedBatchSelectedListings);
        } catch (error) {
          console.error('Failed to parse saved batch selected listings:', error);
          localStorage.removeItem("batchSelectedListings");
        }
      }

      const savedCurrentBatch = localStorage.getItem("currentBatch");
      if (savedCurrentBatch) {
        try {
          const parsedCurrentBatch = JSON.parse(savedCurrentBatch);
          setCurrentBatch(parsedCurrentBatch);
        } catch (error) {
          console.error('Failed to parse saved current batch:', error);
          localStorage.removeItem("currentBatch");
        }
      }

      const savedTotalPropertiesToAnalyze = localStorage.getItem("totalPropertiesToAnalyze");
      if (savedTotalPropertiesToAnalyze) {
        try {
          const parsedTotalProperties = JSON.parse(savedTotalPropertiesToAnalyze);
          setTotalPropertiesToAnalyze(parsedTotalProperties);
        } catch (error) {
          console.error('Failed to parse saved total properties:', error);
          localStorage.removeItem("totalPropertiesToAnalyze");
        }
      }

      const savedIsWaitingForContinuation = localStorage.getItem("isWaitingForContinuation");
      if (savedIsWaitingForContinuation) {
        try {
          const parsedIsWaiting = JSON.parse(savedIsWaitingForContinuation);
          setIsWaitingForContinuation(parsedIsWaiting);
        } catch (error) {
          console.error('Failed to parse saved waiting state:', error);
          localStorage.removeItem("isWaitingForContinuation");
        }
      }
    }
  }, []);

  // Save batch state to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeLocalStorageWrite("batchSelectedListings", JSON.stringify(selectedListings));
    }
  }, [selectedListings]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeLocalStorageWrite("currentBatch", JSON.stringify(currentBatch));
    }
  }, [currentBatch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeLocalStorageWrite("totalPropertiesToAnalyze", JSON.stringify(totalPropertiesToAnalyze));
    }
  }, [totalPropertiesToAnalyze]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeLocalStorageWrite("isWaitingForContinuation", JSON.stringify(isWaitingForContinuation));
    }
  }, [isWaitingForContinuation]);

  const resetBatch = () => {
    setSelectedListings([]);
    setCurrentBatch(0);
    setIsWaitingForContinuation(false);
    setTotalPropertiesToAnalyze(0);
    
    // Clear from localStorage as well
    if (typeof window !== 'undefined') {
      localStorage.removeItem("batchSelectedListings");
      localStorage.removeItem("currentBatch");
      localStorage.removeItem("totalPropertiesToAnalyze");
      localStorage.removeItem("isWaitingForContinuation");
    }
  };

  return {
    selectedListings,
    setSelectedListings,
    currentBatch,
    setCurrentBatch,
    isWaitingForContinuation,
    setIsWaitingForContinuation,
    totalPropertiesToAnalyze,
    setTotalPropertiesToAnalyze,
    resetBatch
  };
};

// Modal State Hook
export const useModals = () => {
  const [showModal, setShowModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showCreditOptionsModal, setShowCreditOptionsModal] = useState(false);
  const [showBuyCreditsTooltip, setShowBuyCreditsTooltip] = useState(false);

  return {
    showModal,
    setShowModal,
    showProModal,
    setShowProModal,
    showCreditOptionsModal,
    setShowCreditOptionsModal,
    showBuyCreditsTooltip,
    setShowBuyCreditsTooltip
  };
};

// File Upload Hook
export const useFileUpload = () => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const clearError = () => setUploadError(null);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadError]);

  return {
    uploadError,
    setUploadError,
    isUploadingFile,
    setIsUploadingFile,
    clearError
  };
};

// User Credits and Class Hook
export const useUserCredits = () => {
  const { user: currentUser, supabase } = useAuth() as { 
    user: ExtendedUser; 
    supabase: any 
  };
  
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [userClass, setUserClass] = useState<UserClass>('charlie_chat');

  useEffect(() => {
    let isMounted = true;

    const fetchUserCreditsAndClass = async (userToFetchFor: ExtendedUser) => {
      if (!supabase) {
        console.error("[useUserCredits] Supabase client not available.");
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
          console.error(`[useUserCredits] Error fetching profile for ${userToFetchFor.id}:`, profileError.message);
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
        console.error(`[useUserCredits] Exception during profile fetch:`, e.message);
        setUserCredits(null);
      }
    };

    if (currentUser && isMounted) {
      fetchUserCreditsAndClass(currentUser);
    } else if (!currentUser && isMounted) {
      setUserCredits(null);
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser, supabase]);

  // Handle checkout session success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");

    if (sessionId && currentUser) {
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
          setUserCredits(profile.credits);
        }
      };

      refreshCredits();
    }
  }, [currentUser, supabase]);

  const handleCreditsUpdated = (newBalance: number) => {
    setUserCredits(newBalance);
  };

  return {
    userCredits,
    setUserCredits,
    userClass,
    setUserClass,
    handleCreditsUpdated,
    currentUser
  };
};

// Message Limits Hook (for guest users)
export const useMessageLimits = () => {
  const [count, setCount] = useState(0);
  const [isPro, setIsPro] = useState(false);
  
  const { currentUser } = useUserCredits();
  const isLoggedIn = !!currentUser;

  // Initialize from localStorage for non-logged in users
  useEffect(() => {
    if (!isLoggedIn) {
      const storedPro = localStorage.getItem("charlie_chat") === "true";
      const storedCount = Number(localStorage.getItem("questionCount") || 0);
      setIsPro(storedPro);
      setCount(isNaN(storedCount) ? 0 : storedCount);
    }
  }, [isLoggedIn]);

  const checkMessageLimit = (): boolean => {
    let currentMessageCount = count;
    if (!isLoggedIn) {
      let guestCount = Number(localStorage.getItem("questionCount") || 0);
      if (isNaN(guestCount)) guestCount = 0;
      currentMessageCount = guestCount;
    }

    return !isLoggedIn && !isPro && currentMessageCount >= 3;
  };

  const incrementMessageCount = () => {
    if (!isLoggedIn) {
      const currentCount = Number(localStorage.getItem("questionCount") || 0);
      localStorage.setItem("questionCount", String(currentCount + 1));
    }
    setCount((prev) => prev + 1);
  };

  return {
    count,
    setCount,
    isPro,
    setIsPro,
    isLoggedIn,
    checkMessageLimit,
    incrementMessageCount
  };
};

// Listing Management Hook
export const useListings = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListings, setSelectedListings] = useState<Listing[]>([]);

  // Initialize listings and selectedListings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedListings = localStorage.getItem("listings");
      if (savedListings) {
        try {
          const parsedListings = JSON.parse(savedListings);
          setListings(parsedListings);
        } catch (error) {
          console.error('Failed to parse saved listings:', error);
          localStorage.removeItem("listings");
        }
      }
      
      const savedSelectedListings = localStorage.getItem("selectedListings");
      if (savedSelectedListings) {
        try {
          const parsedSelectedListings = JSON.parse(savedSelectedListings);
          setSelectedListings(parsedSelectedListings);
        } catch (error) {
          console.error('Failed to parse saved selected listings:', error);
          localStorage.removeItem("selectedListings");
        }
      }
    }
  }, []);

  // Save listings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && listings.length > 0) {
      safeLocalStorageWrite("listings", JSON.stringify(listings));
    }
  }, [listings]);

  // Save selectedListings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeLocalStorageWrite("selectedListings", JSON.stringify(selectedListings));
    }
  }, [selectedListings]);

const toggleListingSelect = (listing: Listing, externalSelectedListings: Listing[], externalSetSelectedListings: (listings: Listing[]) => void) => {
  // @ts-ignore
  externalSetSelectedListings((prevSelectedListings) => {
    const exists = prevSelectedListings.some((l: Listing) => l.id === listing.id);
    if (exists) {
      return prevSelectedListings.filter((l: Listing) => l.id !== listing.id);
    } else {
      return [...prevSelectedListings, listing];
    }
  });
};

  return {
    listings,
    setListings,
    selectedListings,
    setSelectedListings,
    toggleListingSelect
  };
};

// Package Selection Hook
export const usePackageSelection = () => {
  const router = useRouter();
  const { currentUser, userClass } = useUserCredits();
  const { user: authUser, supabase } = useAuth() as { user: ExtendedUser; supabase: any };

  const handlePackageSelection = async (selectedUserClass: string, amount: number) => {
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
      userClass: selectedUserClass,
      userId: currentUser.id,
      stripeCustomerId: data.stripe_customer_id,
    });

    router.push(`/checkout/credit-pack?${params.toString()}`);
  };

  return {
    handlePackageSelection,
    userClass
  };
};