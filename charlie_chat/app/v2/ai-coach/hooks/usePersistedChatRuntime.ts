/*
 * CHARLIE2 V2 - Persisted Chat Runtime Hook
 * Custom hook to integrate assistant-ui with database persistence
 * Manages thread loading, saving, and synchronization
 * Part of the new V2 application architecture
 */

'use client';

import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";

interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export function usePersistedChatRuntime(attachments?: any[], clearAttachments?: () => void) {
  const { user: currentUser } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(false);

  // Create runtime with thread persistence and authentication
  const runtime = useChatRuntime({
    api: "/api/v2/chat",
    body: {
      threadId: currentThreadId,
      attachments: attachments || [],
    },
    credentials: "include", // Include cookies for Supabase session
    onFinish: () => {
      // Clear attachments after message is sent
      if (clearAttachments) {
        clearAttachments();
      }
    },
  });

  // Load user's threads
  const loadThreads = useCallback(async () => {
    if (!currentUser) return;
    
    setLoadingThreads(true);
    try {
      const response = await fetch('/api/v2/chat', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads || []);
      }
    } catch (error) {
      // Error loading threads
    } finally {
      setLoadingThreads(false);
    }
  }, [currentUser]);

  // Load messages for a specific thread
  const loadThread = useCallback(async (threadId: string) => {
    try {
      // Set the current thread ID which will be sent to the API
      // The API will load existing messages and include them in the conversation
      setCurrentThreadId(threadId);
      
      // The runtime will automatically handle the thread context via the threadId in the API body
      
    } catch (error) {
      // Error loading thread
    }
  }, []);

  // Create new thread
  const createNewThread = useCallback(() => {
    setCurrentThreadId(null);
    runtime.switchToNewThread();
    // Refresh threads list after creating new thread
    setTimeout(loadThreads, 1000);
  }, [runtime, loadThreads]);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    try {
      const response = await fetch(`/api/v2/chat?threadId=${threadId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        // If we're deleting the current thread, create a new one
        if (currentThreadId === threadId) {
          setCurrentThreadId(null);
          runtime.switchToNewThread();
        }
        // Refresh threads list
        loadThreads();
      } else {
        // Failed to delete thread
      }
    } catch (error) {
      // Error deleting thread
    }
  }, [currentThreadId, runtime, loadThreads]);

  // Load threads on mount
  useEffect(() => {
    if (currentUser) {
      loadThreads();
    }
  }, [currentUser, loadThreads]);

  return {
    runtime,
    threads,
    currentThreadId,
    loadingThreads,
    loadThread,
    createNewThread,
    deleteThread,
    refreshThreads: loadThreads,
  };
}