'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface ChatStateContextType {
  threadId: string | null;
  setThreadId: (id: string | null) => void;
  messages: any[];
  setMessages: (msgs: any[]) => void;
  addMessage: (msg: any) => void; // Add this helper
  sidebarData: any;
  setSidebarData: (data: any) => void;
  attachedFile: any;
  setAttachedFile: (file: any) => void;
  isLoading: boolean; // Add loading state
  setIsLoading: (loading: boolean) => void;
  clearChat: () => void; // Add clear function
}

const ChatStateContext = createContext<ChatStateContextType | undefined>(undefined);

export function ChatStateProvider({ children }: { children: ReactNode }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [attachedFile, setAttachedFile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to add a single message
  const addMessage = (msg: any) => {
    setMessages(prev => [...prev, msg]);
  };

  // Helper function to clear all chat data
  const clearChat = () => {
    setThreadId(null);
    setMessages([]);
    setSidebarData(null);
    setAttachedFile(null);
    setIsLoading(false);
    // Clear sessionStorage too
    sessionStorage.removeItem("chatThreadId");
    sessionStorage.removeItem("chatMessages");
    sessionStorage.removeItem("chatSidebar");
  };

  // Persist to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("chatThreadId", JSON.stringify(threadId));
    sessionStorage.setItem("chatMessages", JSON.stringify(messages));
    sessionStorage.setItem("chatSidebar", JSON.stringify(sidebarData));
  }, [threadId, messages, sidebarData]);

  // Restore from sessionStorage on mount
  useEffect(() => {
    const tId = sessionStorage.getItem("chatThreadId");
    const msgs = sessionStorage.getItem("chatMessages");
    const sData = sessionStorage.getItem("chatSidebar");

    if (tId && tId !== 'null') setThreadId(JSON.parse(tId));
    if (msgs) setMessages(JSON.parse(msgs));
    if (sData && sData !== 'null') setSidebarData(JSON.parse(sData));
  }, []);

  return (
    <ChatStateContext.Provider
      value={{
        threadId,
        setThreadId,
        messages,
        setMessages,
        addMessage,
        sidebarData,
        setSidebarData,
        attachedFile,
        setAttachedFile,
        isLoading,
        setIsLoading,
        clearChat,
      }}
    >
      {children}
    </ChatStateContext.Provider>
  );
}

export function useChatState() {
  const context = useContext(ChatStateContext);
  if (!context) {
    throw new Error("useChatState must be used within a ChatStateProvider");
  }
  return context;
}