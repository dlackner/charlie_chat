import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Plus, SendHorizonal } from "lucide-react";
import { ComposerAddAttachment } from "@/components/attachment";
import { ChatMessage, EXAMPLES, BATCH_SIZE } from './chatTypes';
import { Listing } from './chatTypes';

// Component interfaces
interface ChatHeaderProps {
    hasMessages: boolean;
}

interface MessageListProps {
    messages: ChatMessage[];
    hasMessages: boolean;
    bottomRef: React.RefObject<HTMLDivElement> | null;
    onExampleClick: (example: string) => void;
    chatInputContent?: React.ReactNode;
    propertyAnalysisContent?: React.ReactNode;
}

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    onSendMessage: (message: string) => void;
    isLoggedIn: boolean;
    userClass: string;
    setShowProModal: (show: boolean) => void;
    setShowModal: (show: boolean) => void;
    isUploadingFile: boolean;
    uploadError: string | null;
    setUploadError: (error: string | null) => void;
    onDoneWithProperty: () => void;
    onDocumentRemoved?: () => void;
}

interface PropertyAnalysisUIProps {
    isWaitingForContinuation: boolean;
    currentBatch: number;
    totalPropertiesToAnalyze: number;
    selectedListings: Listing[];
    onContinueBatch: () => void;
    onStopAnalysis: () => void;
}

interface CreditDisplayProps {
    userCredits: number | null;
    isLoggedIn: boolean;
    showBuyCreditsTooltip: boolean;
    setShowBuyCreditsTooltip: (show: boolean) => void;
    setShowCreditOptionsModal: (show: boolean) => void;
}

// Property Analysis Loader Component
export const PropertyAnalysisLoader = ({ propertyCount, currentProperty = null }: { propertyCount: number; currentProperty?: string | null }) => {
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

// Chat Header Component
export const ChatHeader: React.FC<ChatHeaderProps> = ({ hasMessages }) => {
    return (
        <div className={`transition-all duration-500 ease-in-out ${hasMessages
            ? "py-2" // Minimal padding when chat is active
            : "py-8"  // Full padding when no messages
            }`}>
            <img
                src="/charlie.png"
                alt="Charlie Headshot"
                className={`rounded-full mx-auto shadow-md border transition-all duration-500 ease-in-out ${hasMessages
                    ? "w-12 h-12 mb-2" // Smaller when chat is active
                    : "w-24 h-24 mb-4" // Full size when no messages
                    }`}
            />
            <h1 className={`font-light text-center tracking-tight transition-all duration-500 ease-in-out ${hasMessages
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
    );
};

// Message List Component
// Message List Component - FIXED VERSION
// Message List Component - FIXED VERSION
// Message List Component - FIXED VERSION
export const MessageList: React.FC<MessageListProps> = ({
    messages,
    hasMessages,
    bottomRef,
    onExampleClick,
    chatInputContent,
    propertyAnalysisContent
}) => {
    return (
        <div className="w-full max-w-4xl flex-1 flex flex-col h-full min-h-0">
            {/* Scrollable messages area */}
            <div className={`flex-1 overflow-y-auto px-6 space-y-4 transition-all duration-500 ease-in-out min-h-0 ${hasMessages
                ? "py-2" // Minimal top padding when chat is active
                : "py-6" // Full padding when no messages
                }`}>
                {messages.map((m, i) => {
                    // Show loading component for loading messages
                    if (m.isLoading) {
                        return (
                            <PropertyAnalysisLoader
                                key={i}
                                propertyCount={m.propertyCount || 0}
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
                                className={`inline-block max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-xl shadow-sm ${isUser
                                    ? "bg-sky-100 text-sky-900 rounded-br-none"
                                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                                    }`}
                            >
                              <div className={`leading-relaxed font-sans text-base ${isUser && m.isPropertyDump ? "italic" : ""}`}>
  {isUser && m.isPropertyDump ? (
    // Simple rendering for property dumps - much faster
    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border">
      {cleanContent}
    </pre>
  ) : (
    // Full ReactMarkdown for regular messages
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
  )}
</div>
                            </div>
                        </div>
                    );
                })}
                {bottomRef && <div ref={bottomRef} />}

                {messages.length === 0 && (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl w-full mx-auto">
                        {EXAMPLES.map((ex, i) => (
                            <button
                                key={i}
                                onClick={() => onExampleClick(ex)}
                                className="text-left text-sm px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-sm"
                            >
                                {ex}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* PropertyAnalysisUI - positioned above chat input */}
            {/*{propertyAnalysisContent && (
                <div className="flex-shrink-0 w-full px-6">
                    {propertyAnalysisContent}
                </div>
            )}
            
            {/* Chat input pinned to bottom - MOVED OUTSIDE scrollable area */}
            <div className="flex-shrink-0">
                {chatInputContent}
            </div>
        </div>
    );
};
// Chat Input Component
export const ChatInput: React.FC<ChatInputProps> = ({
    input,
    setInput,
    onSendMessage,
    isLoggedIn,
    userClass,
    setShowProModal,
    setShowModal,
    isUploadingFile,
    uploadError,
    setUploadError,
    onDoneWithProperty,
    onDocumentRemoved
}) => {
    return (
        <div className="w-full max-w-5xl border-t p-4 bg-white">
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
                                    <span className="text-sm text-gray-700">
                                        Analyzing: <strong>{(window as any).__LATEST_FILE_NAME__}</strong>
                                    </span>
                                </div>

                                {/* Done with Property button */}
                                <button
                                    onClick={async () => {
                                        await onDoneWithProperty();
                                        onDocumentRemoved?.();
                                    }}
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                    title="Remove attachment and switch back to chat mode"
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
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSendMessage(input);
                            setInput("");
                        }
                    }}
                />

                <button
                    type="button"
                    onClick={() => {
                        if (input.trim()) {
                            onSendMessage(input);
                            setInput("");
                        }
                    }}
                    disabled={!input.trim()}
                    className="p-2 hover:bg-gray-100 rounded transition disabled:opacity-50"
                    title="Send"
                >
                    <SendHorizonal className="w-5 h-5 text-gray-600" />
                </button>
            </div>
        </div>
    );
};

// Property Analysis UI Component
export const PropertyAnalysisUI: React.FC<PropertyAnalysisUIProps> = ({
    isWaitingForContinuation,
    currentBatch,
    totalPropertiesToAnalyze,
    selectedListings,
    onContinueBatch,
    onStopAnalysis
}) => {
    if (!isWaitingForContinuation || currentBatch < 1) return null;

    const batchSize = BATCH_SIZE;

    return (
        <div className="w-full max-w-4xl px-6 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-start gap-2">
                    <button
                        onClick={onContinueBatch}
                        className="bg-blue-900 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition font-medium"
                    >
                        Continue
                    </button>
                    <button
                        onClick={onStopAnalysis}
                        className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition font-medium"
                    >
                        Stop
                    </button>
                </div>
            </div>
        </div>
    );
};

// Credit Display Component
export const CreditDisplay: React.FC<CreditDisplayProps> = ({
    userCredits,
    isLoggedIn,
    showBuyCreditsTooltip,
    setShowBuyCreditsTooltip,
    setShowCreditOptionsModal
}) => {
    if (!isLoggedIn || userCredits === null) return null;

    return (
        <div
            className="fixed bottom-4 right-4 z-50 group cursor-pointer"
            onClick={() => setShowCreditOptionsModal(true)}
            onMouseEnter={() => setShowBuyCreditsTooltip(true)}
            onMouseLeave={() => setShowBuyCreditsTooltip(false)}
            title={`You have ${userCredits} credits remaining. Click to buy more.`}
        >
            {/* Credits Display - hidden on hover */}
            <div
                className={`text-white font-bold px-4 py-3 rounded-lg shadow-lg min-w-[110px] text-center transition-all duration-300 ease-in-out group-hover:opacity-0 group-hover:scale-75 ${userCredits <= 5
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
    );
};