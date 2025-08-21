"use client";

import { Dialog } from "@headlessui/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { WeeklyRecommendationsModal } from "@/components/WeeklyRecommendationsModal";
import { Listing } from "@/components/ui/listingTypes";
import { PropertyBatchState } from './chatServices';
import { PACKAGES, getPackagesFor } from '@/lib/pricing';
import type { User } from '@supabase/supabase-js'
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import {
  useChat,
  usePropertyBatch,
  useModals,
  useFileUpload,
  useUserCredits,
  useMessageLimits,
  useListings,
  usePackageSelection
} from './chatHooks';
import {
  PDFAttachmentAdapter,
  handleDoneWithProperty,
  sendMessageWithAttachments,
  sendMessageWithoutAttachments,
  processPropertyBatch,
  detectAttachments,
  extractAttachmentData
} from './chatServices';
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  UserClass,
  ExtendedUser,
  ChatMessage,
  BATCH_SIZE,
  EXAMPLES,
  FIELD_MAPPINGS
} from './chatTypes';
import {
  ChatHeader,
  MessageList,
  ChatInput,
  PropertyAnalysisUI,
  CreditDisplay
} from './chatComponents';
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

// DEFINE USER CLASSES AND PROPERTY PACKAGES.  NOT CONNECTED TO THE NEW LIB\PRICING.TS FILE YET
export function ClosingChat() {
  const {
    userCredits,
    setUserCredits,
    userClass,
    setUserClass,
    handleCreditsUpdated,
    currentUser
  } = useUserCredits();

  const { isLoading: isLoadingAuth, supabase } = useAuth() as { isLoading: boolean; supabase: any };
  const { setShowSignUpModal } = useModal();
  const stripeCustomerId = (currentUser as any)?.stripe_customer_id;

  const availablePackages = userClass === 'trial' || userClass === 'disabled' ? [] : getPackagesFor(userClass);
  const {
    messages,
    setMessages,
    input,
    setInput,
    threadId,
    setThreadId,
    bottomRef,
    hasMessages
  } = useChat();
  const {
    showModal,
    setShowModal,
    showProModal,
    setShowProModal,
    showCreditOptionsModal,
    setShowCreditOptionsModal,
    showBuyCreditsTooltip,
    setShowBuyCreditsTooltip
  } = useModals();
  const {
    count,
    setCount,
    isPro,
    setIsPro,
    isLoggedIn,
    checkMessageLimit,
    incrementMessageCount
  } = useMessageLimits();

  const { listings, setListings, toggleListingSelect: toggleListingSelectFn } = useListings();
  const batchSize = BATCH_SIZE;
  
  // Weekly recommendations state - DISABLED
  // TO RE-ENABLE: Uncomment the 3 lines below
  // const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  // const [weeklyRecommendations, setWeeklyRecommendations] = useState<Array<{
  //   name: string;
  //   msa_name?: string;
  //   properties: Listing[];
  // }>>([]);
  // const [hasNewRecommendations, setHasNewRecommendations] = useState(false);
  const {
    selectedListings,
    setSelectedListings,
    currentBatch,
    setCurrentBatch,
    isWaitingForContinuation,
    setIsWaitingForContinuation,
    totalPropertiesToAnalyze,
    setTotalPropertiesToAnalyze,
    resetBatch
  } = usePropertyBatch();
  const [isStreaming, setIsStreaming] = useState(false);
  const {
    uploadError,
    setUploadError,
    isUploadingFile,
    setIsUploadingFile,
    clearError
  } = useFileUpload();

  const router = useRouter();

  const handleSendMessage = async (message: string, isPropertyDump = false, displayMessage?: string) => {
    if (!message.trim()) return;

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

    const hasAttachments = detectAttachments();

    const callbacks = {
      onMessageUpdate: setMessages,
      onThreadIdUpdate: setThreadId,
      onBatchComplete: () => { }
    };

    if (hasAttachments) {
      const attachmentData = extractAttachmentData();
      await sendMessageWithAttachments(
        { message, threadId, attachments: attachmentData, isPropertyDump, displayMessage },
        callbacks
      );
    } else {
      await sendMessageWithoutAttachments(
        { message, threadId, isPropertyDump, displayMessage },
        callbacks
      );
    }

    setInput("");
  };

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
            resetToDocumentMode();
            // Clear thread to start fresh conversation with new document
            localStorage.removeItem("threadId");
            delete (window as any).__CURRENT_THREAD_ID__;

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

  const resetToDocumentMode = () => {
    setSelectedListings([]);
    setCurrentBatch(0);
    setTotalPropertiesToAnalyze(0);
    setIsWaitingForContinuation(false);
    
    // Clear chat and batch state when uploading a new document, but preserve sidebar listings
    if (typeof window !== 'undefined') {
      localStorage.removeItem("threadId");
      localStorage.removeItem("chatMessages");
      // Keep listings and selectedListings for sidebar persistence
      localStorage.removeItem("batchSelectedListings");
      localStorage.removeItem("currentBatch");
      localStorage.removeItem("totalPropertiesToAnalyze");
      localStorage.removeItem("isWaitingForContinuation");
    }
    
    delete (window as any).__CURRENT_THREAD_ID__;
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: "📎 You uploaded a new document. How can I help?" }
    ]);
  };

  const toggleListingSelect = (listing: Listing) => {
    toggleListingSelectFn(listing, selectedListings, setSelectedListings);
  };

  const { handlePackageSelection } = usePackageSelection();

  // Weekly recommendations handlers - DISABLED
  // TO RE-ENABLE: Uncomment the handleCharlieClick function below
  // const handleCharlieClick = () => {
  //   setShowRecommendationsModal(true);
  //   setHasNewRecommendations(false);
  // };

  const handleFavoriteProperty = async (propertyId: string) => {
    // TODO: Add to favorites in database
  };

  const handleDismissProperty = async (propertyId: string) => {
    // TODO: Track dismissal for learning
  };

  // Load weekly recommendations from API
  const loadWeeklyRecommendations = async () => {
    // Feature disabled - weekly recommendations not ready for production
    return;
    
    // TO RE-ENABLE: Remove the return statement above and uncomment all code below until the closing */
    /*
    
    try {
      // Get the user's session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.log('No authenticated session, skipping weekly recommendations');
        return;
      }

      const response = await fetch('/api/weekly-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch weekly recommendations:', response.status);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.recommendations.length > 0) {
        // Sort recommendations by market name for easier review
        const sortedRecommendations = data.recommendations.sort((a: any, b: any) => {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        });
        
        setWeeklyRecommendations(sortedRecommendations);
        setHasNewRecommendations(true);
        console.log(`✅ Loaded ${data.recommendations.length} weekly recommendations`);
      } else {
        console.log('No weekly recommendations available');
      }
    } catch (error) {
      console.error('Error loading weekly recommendations:', error);
    }
  */
  };

  useEffect(() => {
    // Load recommendations when component mounts - DISABLED
    // loadWeeklyRecommendations();
  }, []);

  // Fallback mock data for testing when API has no data

  // Load existing weekly recommendations from database on component mount - DISABLED
  useEffect(() => {
    const loadExistingRecommendations = async () => {
      // Feature disabled - weekly recommendations not ready for production
      return;
      
      // TO RE-ENABLE: Remove the return statement above and uncomment all code below until the closing */
      /*
      
      // Only load if no recommendations are already loaded
      if (weeklyRecommendations.length > 0) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // Check if user has existing weekly recommendations in database
        const { data: existingRecs } = await supabase
          .from('user_favorites')
          .select(`
            property_id,
            saved_properties (*)
          `)
          .eq('user_id', session.user.id)
          .eq('recommendation_type', 'weekly_recommendation')
          .eq('is_active', true)
          .limit(10);

        if (existingRecs && existingRecs.length > 0) {
          // Group existing recommendations by market (city, state) for easier review
          const properties = existingRecs.map((rec: any) => rec.saved_properties).filter(Boolean);
          const marketGroups: { [key: string]: any[] } = {};
          
          properties.forEach((property: any) => {
            const city = property.address_city || 'Unknown City';
            const state = property.address_state || 'Unknown State';
            const marketKey = `${city}, ${state}`;
            
            if (!marketGroups[marketKey]) {
              marketGroups[marketKey] = [];
            }
            marketGroups[marketKey].push(property);
          });
          
          // Convert to array format and sort by market name
          const formattedRecs = Object.keys(marketGroups)
            .sort((a, b) => a.localeCompare(b))
            .map(marketName => ({
              name: marketName,
              properties: marketGroups[marketName]
            }));
          
          setWeeklyRecommendations(formattedRecs);
          setHasNewRecommendations(true);
          console.log('✅ Loaded existing weekly recommendations:', existingRecs.length, 'properties across', formattedRecs.length, 'markets');
        }
      } catch (error) {
        console.error('Error loading existing recommendations:', error);
      }
    */
    };

    // loadExistingRecommendations(); // DISABLED
  }, [/* weeklyRecommendations.length, */ supabase.auth]);

  // Property Analysis UI handlers
  const handleContinueBatch = () => {
    setIsWaitingForContinuation(false);

    const callbacks = {
      onMessageUpdate: setMessages,
      onBatchStateUpdate: (state: Partial<PropertyBatchState>) => {
        if (state.currentBatch !== undefined) setCurrentBatch(state.currentBatch);
        if (state.totalPropertiesToAnalyze !== undefined) setTotalPropertiesToAnalyze(state.totalPropertiesToAnalyze);
        if (state.selectedListings !== undefined) setSelectedListings(state.selectedListings);
      },
      onWaitingForContinuation: setIsWaitingForContinuation,
      sendMessage: handleSendMessage
    };

    const batchState = {
      selectedListings,
      currentBatch,
      totalPropertiesToAnalyze
    };

    processPropertyBatch(selectedListings, currentBatch, false, batchState, callbacks);
  };

  const handleStopAnalysis = () => {
    setIsWaitingForContinuation(false);
    setSelectedListings([]);
    setCurrentBatch(0);
    setTotalPropertiesToAnalyze(0);
  };

  if (isLoadingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading chat...</p>
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
            onSearch={async (data: any) => {
              if (data.clearResults) {
                setListings([]);
              } else if (data.listings) {
                // API now returns snake_case data, so no transformation needed
                setListings(data.listings);
              }
            }}
            listings={listings}
            selectedListings={selectedListings}
            toggleListingSelect={toggleListingSelect}
            onSendToGPT={(listingsToProcess, autoProcess) => {
              const callbacks = {
                onMessageUpdate: setMessages,
                onBatchStateUpdate: (state: Partial<PropertyBatchState>) => {
                  if (state.currentBatch !== undefined) setCurrentBatch(state.currentBatch);
                  if (state.totalPropertiesToAnalyze !== undefined) setTotalPropertiesToAnalyze(state.totalPropertiesToAnalyze);
                  if (state.selectedListings !== undefined) setSelectedListings(state.selectedListings);
                },
                onWaitingForContinuation: setIsWaitingForContinuation,
                sendMessage: handleSendMessage
              };

              const batchState = {
                selectedListings,
                currentBatch,
                totalPropertiesToAnalyze
              };

              processPropertyBatch(listingsToProcess || selectedListings, 0, !!autoProcess, batchState, callbacks);
            }}
            isLoggedIn={isLoggedIn}
            triggerAuthModal={() => setShowModal(true)}
            onCreditsUpdate={handleCreditsUpdated}
            userClass={userClass === 'disabled' ? 'trial' : userClass}
            triggerBuyCreditsModal={() => setShowCreditOptionsModal(true)}
            triggerProModal={() => setShowProModal(true)}
            clearSelectedListings={() => setSelectedListings([])}
            userCredits={userCredits}
          />

          {/* Chat UI */}
          <div className="flex-1 flex flex-col items-center justify-start overflow-hidden">
            <ChatHeader 
              hasMessages={hasMessages}
              // TO RE-ENABLE: Uncomment the 2 lines below
              // hasNewRecommendations={hasNewRecommendations}
              // onCharlieClick={handleCharlieClick}
            />

            <MessageList
              messages={messages}
              hasMessages={hasMessages}
              bottomRef={bottomRef!}
              onExampleClick={handleSendMessage}
            />

            {/* PropertyAnalysisUI - now positioned above chat input */}
            <PropertyAnalysisUI
              isWaitingForContinuation={isWaitingForContinuation}
              currentBatch={currentBatch}
              totalPropertiesToAnalyze={totalPropertiesToAnalyze}
              selectedListings={selectedListings}
              onContinueBatch={handleContinueBatch}
              onStopAnalysis={handleStopAnalysis}
            />

            {/* Chat input - now at the bottom */}
            <ChatInput
              input={input}
              setInput={setInput}
              onSendMessage={handleSendMessage}
              isLoggedIn={isLoggedIn}
              userClass={userClass}
              setShowProModal={setShowProModal}
              setShowModal={setShowModal}
              isUploadingFile={isUploadingFile}
              uploadError={uploadError}
              setUploadError={setUploadError}
              onDoneWithProperty={handleDoneWithProperty}
              onDocumentRemoved={() => setMessages(prev => [...prev])}
            />
          </div>
        </div>

        {/* Show CreditDisplay for Trial and Charlie Chat users */}
        {(userClass === 'trial' || userClass === 'charlie_chat') && (
          <CreditDisplay
            userCredits={userCredits}
            isLoggedIn={isLoggedIn}
            showBuyCreditsTooltip={showBuyCreditsTooltip}
            setShowBuyCreditsTooltip={setShowBuyCreditsTooltip}
            setShowCreditOptionsModal={setShowCreditOptionsModal}
          />
        )}

        {/* Auth Modal */}
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
                onClick={() => {
                  setShowModal(false);
                  setShowSignUpModal(true);
                }}
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
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 text-center space-y-6 shadow-xl">
              {/* Charlie branding header */}
              <div className="flex flex-col items-center">
                <img
                  src="/charlie.png"
                  alt="Charlie"
                  className="w-16 h-16 rounded-full mb-3 shadow-md border"
                />
                <Dialog.Title className="text-2xl font-light tracking-tight text-gray-900">
                  Unlock the full potential of Charlie Chat
                </Dialog.Title>
              </div>

              {/* Benefits list */}
              <div className="text-left space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-sm text-gray-700">My favorite properties</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-sm text-gray-700">PDF document analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-sm text-gray-700">Marketing & legal templates</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-sm text-gray-700">Mapping & advanced analytics </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-sm text-gray-700">250 monthly property credits</span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowProModal(false);
                    router.push("/pricing");
                  }}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
                >
                  Upgrade Now
                </button>
                <button
                  onClick={() => setShowProModal(false)}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>


        {/* Credit Options Modal */}
        {showCreditOptionsModal && (
          <div
            className="fixed inset-0 bg-black opacity-75 z-50"
            aria-hidden="true"
          />
        )}
        <Dialog
          open={showCreditOptionsModal}
          onClose={() => setShowCreditOptionsModal(false)}
          className="fixed inset-0 z-60 flex items-center justify-center"
        >
          <Dialog.Panel className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            {userClass === 'trial' ? (
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
            ) : userClass === 'disabled' ? (
              <>
                {/* Header with Charlie image */}
                <div className="flex items-center mb-4">
                  <img
                    src="/charlie.png"
                    alt="Charlie"
                    className="w-12 h-12 rounded-full mr-3 shadow-md border-[0.5px] border-gray-300"
                  />
                  <div className="flex items-center">
                    <span className="text-lg mr-2">⚠️</span>
                    <Dialog.Title className="text-xl font-semibold text-gray-900">
                      Charlie here!
                    </Dialog.Title>
                  </div>
                </div>
                
                <p className="text-base text-gray-700 mb-6 leading-relaxed">
                  Your trial period has ended, but don't worry! Choose a plan below to continue using Charlie Chat and access all your saved properties.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => router.push("/pricing")}
                    className="w-full py-3 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors duration-150"
                  >
                    Choose Your Plan
                  </button>
                </div>
              </>
            ) : userClass === 'charlie_chat' ? (
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
            ) : (
              <>
                <Dialog.Title className="text-2xl font-semibold text-gray-900 mb-2">
                  Unlimited Credits
                </Dialog.Title>
                <p className="text-sm text-gray-700 mb-6">
                  You have unlimited property searches with your current plan. No need to purchase additional credits!
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowCreditOptionsModal(false)}
                    className="w-full py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors duration-150"
                  >
                    Got It
                  </button>
                </div>
              </>
            )}
          </Dialog.Panel>
        </Dialog>


        {/* Weekly Recommendations Modal - DISABLED */}
        {/* TO RE-ENABLE: Uncomment the entire WeeklyRecommendationsModal component below */}
        {/*<WeeklyRecommendationsModal
          isOpen={showRecommendationsModal}
          onClose={() => setShowRecommendationsModal(false)}
          markets={weeklyRecommendations}
          onFavoriteProperty={handleFavoriteProperty}
          onDismissProperty={handleDismissProperty}
        />*/}
      </>
    </AssistantRuntimeProvider>
  );
}