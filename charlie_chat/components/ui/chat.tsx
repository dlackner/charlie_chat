"use client";

import { useState } from "react";

export function Chat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: input }, { role: "assistant", content: "" }]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: fullText },
        ]);
      }
    }

    setInput("");
  };

  return (
    <div className="max-w-xl mx-auto mt-10 space-y-4">
      <div className="bg-white p-4 shadow rounded space-y-2 min-h-[300px]">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`whitespace-pre-wrap ${
            m.role === "user" ? "text-right text-blue-600" : "text-left text-black"
          }`}
        >
          {m.content}
        </div>
      ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border p-2 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask me about toilet paper specs..."
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}
