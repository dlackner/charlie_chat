import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage, UserClass, Listing, ExtendedUser } from './chatTypes';

// Chat State Hook
export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Initialize thread from localStorage
  useEffect(() => {
    const savedThreadId = localStorage.getItem("threadId");
    if (savedThreadId) {
      setThreadId(savedThreadId);
    }
  }, []);

  // Auto-scroll functionality
  const bottomRef = useRef<HTMLDivElement | null>(null);
  
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

  const resetBatch = () => {
    setSelectedListings([]);
    setCurrentBatch(0);
    setIsWaitingForContinuation(false);
    setTotalPropertiesToAnalyze(0);
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

  const toggleListingSelect = (listing: Listing, selectedListings: Listing[], setSelectedListings: (listings: Listing[]) => void) => {
    const exists = selectedListings.some((l) => l.id === listing.id);
    if (exists) {
      setSelectedListings(selectedListings.filter((l) => l.id !== listing.id));
    } else {
      setSelectedListings([...selectedListings, listing]);
    }
  };

  return {
    listings,
    setListings,
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