'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    properties?: any[];
    analyzedProperties?: any[];
    isLoading?: boolean;
    propertyCount?: number;
    isPropertyDump?: boolean;
  };
}

interface ChatState {
  messages: Message[];
  threadId: string | null;
  input: string;
  listings: any[];
  selectedListings: any[];
  currentBatch: number;
  totalPropertiesToAnalyze: number;
  fileId: string | null;
  fileName: string | null;
}

interface ChatContextType {
  chatState: ChatState;
  updateChatState: (updates: Partial<ChatState>) => void;
  clearChat: () => void;
}

const defaultChatState: ChatState = {
  messages: [],
  threadId: null,
  input: '',
  listings: [],
  selectedListings: [],
  currentBatch: 0,
  totalPropertiesToAnalyze: 0,
  fileId: null,
  fileName: null,
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatState, setChatState] = useState<ChatState>(defaultChatState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedThreadId = localStorage.getItem('threadId');
      const savedMessages = localStorage.getItem('chatMessages');
      const savedInput = localStorage.getItem('chatInput');
      const savedListings = localStorage.getItem('chatListings');
      const savedSelectedListings = localStorage.getItem('selectedListings');
      
      setChatState(prev => ({
        ...prev,
        threadId: savedThreadId,
        messages: savedMessages ? JSON.parse(savedMessages) : [],
        input: savedInput || '',
        listings: savedListings ? JSON.parse(savedListings) : [],
        selectedListings: savedSelectedListings ? JSON.parse(savedSelectedListings) : [],
        fileId: window.__LATEST_FILE_ID__ || null,
        fileName: window.__LATEST_FILE_NAME__ || null,
      }));
      setIsInitialized(true);
    }
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      if (chatState.threadId) {
        localStorage.setItem('threadId', chatState.threadId);
      }
      if (chatState.messages.length > 0) {
        localStorage.setItem('chatMessages', JSON.stringify(chatState.messages));
      }
      if (chatState.input) {
        localStorage.setItem('chatInput', chatState.input);
      } else {
        localStorage.removeItem('chatInput');
      }
      if (chatState.listings.length > 0) {
        localStorage.setItem('chatListings', JSON.stringify(chatState.listings));
      } else {
        localStorage.removeItem('chatListings');
      }
      if (chatState.selectedListings.length > 0) {
        localStorage.setItem('selectedListings', JSON.stringify(chatState.selectedListings));
      } else {
        localStorage.removeItem('selectedListings');
      }
      
      // Update window globals for file attachments
      if (chatState.fileId) {
        window.__LATEST_FILE_ID__ = chatState.fileId;
      }
      if (chatState.fileName) {
        window.__LATEST_FILE_NAME__ = chatState.fileName;
      }
    }
  }, [chatState, isInitialized]);

  const updateChatState = (updates: Partial<ChatState>) => {
    setChatState(prev => ({ ...prev, ...updates }));
  };

  const clearChat = () => {
    setChatState(defaultChatState);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('threadId');
      localStorage.removeItem('chatMessages');
      localStorage.removeItem('chatInput');
      localStorage.removeItem('chatListings');
      localStorage.removeItem('selectedListings');
      delete window.__LATEST_FILE_ID__;
      delete window.__LATEST_FILE_NAME__;
    }
  };

  return (
    <ChatContext.Provider value={{ chatState, updateChatState, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

// Add type declarations for window properties
declare global {
  interface Window {
    __LATEST_FILE_ID__?: string;
    __LATEST_FILE_NAME__?: string;
  }
}