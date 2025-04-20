"use client";

import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sidebar } from "@/components/ui/sidebar";

type Listing = {
  id: string;
  formattedAddress: string;
  bedrooms?: number;
  rentEstimate?: number;
  propertyValue?: number;
  lastSalePrice?: number;
};

const EXAMPLES = [
  "How do I creatively structure seller financing?",
  "Is it possible to convert a hotel into a multifamily apartment?",
  "What assumptions should I model for a 5-year hold of a property?",
  "How do I get started in multifamily investing? ",
];

export function ClosingChat() {
  
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
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
      const rent = l.rentEstimate ?? null;
      const value = l.propertyValue ?? l.lastSalePrice ?? null;
      const capRate = rent && value ? `${((rent * 12) / value * 100).toFixed(2)}%` : "N/A";
  
      return `**${i + 1}. ${l.formattedAddress}**  
  Beds: ${l.bedrooms ?? "N/A"}  
  Estimated Rent: ${rent ? `$${rent.toLocaleString()}` : "N/A"}  
  Estimated Value: ${value ? `$${value.toLocaleString()}` : "N/A"}  
  Cap Rate: ${capRate}\n`;
    });
  
    const summaryPrompt = `Charlie, please evaluate the following listings for their potential as multifamily hotel conversions.

---

### 📊 Cap Rate Analysis  
**Formula:** Cap Rate = (Estimated Rent × 12) ÷ Estimated Value

${rows.join("\n")}

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

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    let count = Number(localStorage.getItem("questionCount"));

    if (isNaN(count)) {
      count = 0;
      localStorage.setItem("questionCount", "0");
    }

    if (!isPro && count >= 3) {
      setShowModal(true);
      return;
    }
    localStorage.setItem("questionCount", String(count + 1));
    setCount((prev) => prev + 1);

    setMessages((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setInput("");
    // Only save title on first message of a thread
    if (
      messages.length === 0 &&        // This is a new thread
      message.trim().length > 0 &&    // Ignore blank prompts
      threadId?.startsWith("thread_") // Only save real OpenAI threads
    ) {
      const titles = JSON.parse(localStorage.getItem("chatTitles") || "{}");
      titles[threadId] = message.slice(0, 50); // Take first 50 chars
      localStorage.setItem("chatTitles", JSON.stringify(titles));
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, threadId }),
    });
    
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
    }
    
    
    
    

    // Capture threadId if first time
    const newThreadId = res.headers.get("x-thread-id");
    if (newThreadId && !threadId) {
      setThreadId(newThreadId);
      localStorage.setItem("threadId", newThreadId);
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
        <div className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
          <h1 className="text-3xl sm:text-5xl font-light text-center mb-2 tracking-tight">
            Charlie Chat
          </h1>
          <p className="text-center text-gray-500 mb-6 text-sm sm:text-base">
            Conversational AI for Multifamily Investment Questions
          </p>
  
          {/* Input box */}
          <div className="w-full max-w-xl">
            <input
              className="w-full border border-gray-300 rounded-lg p-4 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Ask me anything about buying, selling, or investing..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage(input);
              }}
            />
          </div>
  
          {/* Examples (only if no messages yet) */}
          {messages.length === 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
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
  
          {/* Message list */}
          <div className="mt-8 w-full max-w-xl space-y-4">
          {messages.map((m, i) => {
            const isUser = m.role === "user";

            return (
              <div
                key={i}
                className={`text-sm font-sans whitespace-pre-wrap leading-snug ${
                  isUser ? "text-sky-800" : "text-gray-800"
                }`}
              >
                <div
                  className={`inline-block max-w-xl px-4 py-2 rounded-xl ${
                    isUser ? "bg-sky-100 ml-auto" : "bg-gray-50"
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p className="mb-2" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-black" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc pl-5 mb-2" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="mb-1" {...props} />
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })}



          </div>
  
          {/* How it works */}
          {messages.length === 0 && (
            <div className="mt-20 border-t pt-10 w-full max-w-4xl">
              <h2 className="text-2xl sm:text-3xl font-light text-center mb-2 tracking-tight">How it works</h2>
              <p className="text-center text-gray-500 mb-10 text-sm sm:text-base">
                Charlie Chat connects you directly with me for clear, honest advice on multifamily investing.
              </p>
  
              <div className="grid sm:grid-cols-3 gap-8">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <span className="text-xl">💬</span>
                  </div>
                  <div>
                    <h3 className="font-light text-base mb-1">1. Ask Your Question</h3>
                    <p className="text-sm text-gray-600">
                         Whether it’s about deals, underwriting, or decoding a broker’s “great opportunity,” just ask—I’m here to give it to you straight.
                    </p>
                  </div>
                </div>
  
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <span className="text-xl">📊</span>
                  </div>
                  <div>
                    <h3 className="font-light text-base mb-1">2. Get My Advice</h3>
                    <p className="text-sm text-gray-600">
                        You’ll get clear, actionable guidance from someone who’s done this a few hundred times (and made all the mistakes so you don’t have to).
                    </p>
                  </div>
                </div>
  
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <span className="text-xl">🏠</span>
                  </div>
                  <div>
                    <h3 className="font-light text-base mb-1">3. Invest With Confidence</h3>
                    <p className="text-sm text-gray-600">
                        You’re not just playing real estate anymore—you’re making smart moves backed by strategy, not guesswork.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
  
        {/* Charlie Image */}
        <div className="hidden lg:flex items-start justify-center w-[300px] shrink-0 pt-10 -ml-50">
          <img
            src="/charlie.png"
            alt="Charlie - Your Real Estate Guide"
            className="w-full max-w-[260px] object-contain rounded-xl shadow-lg"
          />
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
              Sign up to keep chatting with Charlie Chat, your real estate sidekick 🏠
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
    </>
  );
  


}
