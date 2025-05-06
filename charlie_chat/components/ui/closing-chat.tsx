"use client";

import { Dialog } from "@headlessui/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sidebar } from "@/components/ui/sidebar";
import { useRef, useEffect } from "react";
import { Plus, SendHorizonal } from "lucide-react";
import dynamic from "next/dynamic";


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
  [key: string]: any; // <-- optional catch-all if you're passing full listing to GPT
};

const EXAMPLES = [
  "How do I creatively structure seller financing?",
  "Is it possible to convert a hotel into a multifamily apartment?",
  "What assumptions should I model for a 5-year hold of a property?",
  "How do I get started in multifamily investing? ",
];


const FeatureTour = dynamic(() => import("@/components/ui/feature-tour"), { ssr: false });

export function ClosingChat() {
  
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [isPro, setIsPro] = useState(false);
  const [count, setCount] = useState(0);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListings, setSelectedListings] = useState<Listing[]>([]);
  
  const toggleListingSelect = (listing: any) => {
    const exists = selectedListings.some((l) => l.id === listing.id);
    if (exists) {
      setSelectedListings((prev) => prev.filter((l) => l.id !== listing.id));
    } else {
      setSelectedListings((prev) => [...prev, listing]);
    }
  };

  const onSendToGPT = () => {
  const rows = selectedListings.map((l, i) => {
    const address = l.address?.address || "Unknown Address";
    const metadata = JSON.stringify(l, null, 2);

    return `**${i + 1}. ${address}**

<!--
${metadata}
-->`;
  });

  const summaryPrompt = `Charlie, please evaluate the following listings for their potential as multifamily hotel conversions.

---
${rows.join("\n\n")}
---
### 🔍 Evaluation Criteria

**1. Most Promising**  
Which property stands out based on location, potential rental yield, or zoning feasibility?  

**2. Red Flags**  
Note any missing data, inconsistent values, or concerns that might require deeper due diligence.  

**3. Recommendation**  
If you had to explore one listing further, which would it be — and why?

Please keep it concise, sharp, and grounded in investment logic. A bit of personality is welcome, but let’s keep the insights actionable.
`;

  sendMessage(summaryPrompt);
  setSelectedListings([]);
};
  const bottomRef = useRef<HTMLDivElement | null>(null);

  
  // Safe access to localStorage on client only
  useEffect(() => {
    const storedPro = localStorage.getItem("charlie_chat_pro") === "true";
    const storedCount = Number(localStorage.getItem("questionCount") || 0);
    const savedThreadId = localStorage.getItem("threadId");
  
    setIsPro(storedPro);
    setCount(isNaN(storedCount) ? 0 : storedCount);
  
    if (savedThreadId) {
      setThreadId(savedThreadId);
    }
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (message: string) => {
    
    if (!message.trim()) return;
    let count = Number(localStorage.getItem("questionCount"));

    if (isNaN(count)) {
      count = 0;
      localStorage.setItem("questionCount", "0");
    }

    if (!isPro && count >= 300) {
      setShowModal(true);
      return;
    }
    localStorage.setItem("questionCount", String(count + 1));
    setCount((prev) => prev + 1);

    setMessages((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, threadId }),
    });
    
    // Only save title on first message of a thread
    // Save title if this is the first message of a new thread
    if (messages.length === 0 && message.trim().length > 0) {
      const newThreadId = res.headers.get("x-thread-id");
    
      if (newThreadId && newThreadId.startsWith("thread_")) {
        const titles = JSON.parse(localStorage.getItem("chatTitles") || "{}");
        titles[newThreadId] = message.slice(0, 50); // Save first message as title
        localStorage.setItem("chatTitles", JSON.stringify(titles));
        setThreadId(newThreadId);
        localStorage.setItem("threadId", newThreadId);
      }
    }
    const reader = res.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    
    if (reader) {
      let buffer = "";
      let fullText = ""; // ✅ Move it up here
    
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
                  setMessages((prev) => [
                    ...prev.slice(0, -1),
                    { role: "assistant", content: fullText },
                  ]);
                }
              }
            } else {
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

  return (
    <>
      {/* Main layout container */}
     <FeatureTour />
      <div className="flex h-screen overflow-hidden bg-white text-black">
         {/* Sidebar */}
         <Sidebar
          onSearch={async (filters) => {
            try {
              const res = await fetch("/api/rentcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(filters),
              });
          
              const data = await res.json();
              console.log("🔍 Raw RentCast data:", data);
              setListings(data || []); // Adjust depending on RentCast response format
            } catch (err) {
              console.error("RentCast API error:", err);
            }
          }}
          listings={listings}
          selectedListings={selectedListings}
          toggleListingSelect={toggleListingSelect}
          onSendToGPT={onSendToGPT}
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
            Conversational AI for Multifamily Investment Questions
          </p>
  
          {/* Message list */}
          <div className="w-full max-w-4xl flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((m, i) => {
          const isUser = m.role === "user";
          const cleanContent = m.content
            // remove full-width citations like  
            .replace(/\s?【\d+:\d+†[^】]+】\s?/g, "")
            // remove bracketed OpenAI citations like [8:5^source]
            .replace(/\s?\[\d+:\d+\^source\]\s?/g, "")
            // remove markdown-style footnotes like [1] or [^1]
            .replace(/\s?\[\^?\d+\]\s?/g, "")
            // remove trailing space before punctuation
            .replace(/ +(?=\.|,|!|\?)/g, "")
            // squash extra newlines
            .replace(/\n/g, '\n\n')  // squash double newlines to one (optional)
            .trim();

          //console.log("🪵 Cleaned content:\n", JSON.stringify(cleanContent)); // ✅ put this here
    
          return (
            <div
              key={i}
              className={`text-sm font-sans leading-snug ${
                isUser ? "text-sky-800" : "text-gray-800"
              }`}
            >
              <div
                className={`inline-block max-w-4xl px-4 py-2 rounded-xl ${
                  isUser ? "bg-sky-100 ml-auto" : "bg-gray-50"
                }`}
              >
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="mb-1 leading-snug whitespace-pre-line" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-black" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc pl-5 mb-1" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="mb-1" {...props} />
                    ),
                  }}
                >
                  {cleanContent}
                </ReactMarkdown>
              </div>
              <div ref={bottomRef} />

            </div>
            
          );
        })}

          {/* Input box pinned to bottom */}
          <div className="w-full max-w-5xl border-t p-4 bg-white sticky bottom-0 z-10">
            <div className="flex items-center border border-gray-300 rounded-lg shadow-sm p-2 focus-within:ring-2 focus-within:ring-black">
              {/* Plus icon */}
              <button
                id="upload-docs"
                type="button"
                onClick={() => setShowProModal(true)} // 👈 trigger your modal
                className="p-2 hover:bg-gray-100 rounded transition"
                title="Upload or upgrade"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>

              {/* Input field */}
              <input
                id="chat-input"
                className="flex-1 px-3 py-2 text-lg focus:outline-none"
                placeholder="Ask me anything about buying, selling, or investing..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage(input);
                }}
              />

              {/* Send icon */}
              <button
                type="button"
                onClick={() => sendMessage(input)}
                className="p-2 hover:bg-gray-100 rounded transition"
                title="Send"
              >
                <SendHorizonal className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
  
          {/* Examples (only if no messages yet) */}
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
  
      {/* 🚨 MODAL 🚨 */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded bg-white p-6 text-center space-y-4 shadow-xl">
            <Dialog.Title className="text-lg font-semibold">
              You've hit your free limit 🧠
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500">
              Sign up now to keep chatting with Charlie Chat, your multifamily expert advisor 🏠
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
              className="bg-black text-white px-4 py-2 rounded mt-4 hover:bg-gray-800 transition"
            >
              Unlock Unlimited Access 💳
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

      
    </>
  );
  


}
