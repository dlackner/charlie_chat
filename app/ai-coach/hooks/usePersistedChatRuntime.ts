/*
 * CHARLIE2 V2 - Persisted Chat Runtime Hook
 * Custom hook to integrate assistant-ui with database persistence
 * Manages thread loading, saving, and synchronization
 * Part of the new V2 application architecture
 */

'use client';

import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import {
  Attachment,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";
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

// Define the custom PDF adapter that uses our secure server endpoint
class PDFAttachmentAdapter {
  accept = "application/pdf";

  // Check if this adapter can handle the file
  matches(attachment: { file?: File }) {
    console.log("🔍 PDFAttachmentAdapter.matches called with:", attachment.file?.type);
    return attachment.file?.type === "application/pdf";
  }

  async add({ file }: { file: File }): Promise<any> {
    console.log("🔄 PDFAttachmentAdapter.add called with file:", file.name);
    console.log("🔄 File size:", file.size);
    console.log("🔄 File type:", file.type);
    
    try {
      // Upload via our secure server endpoint
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      console.log("✅ Upload successful, file ID:", result.fileId);

      const attachment = {
        id: result.id,
        type: "document" as const,
        name: result.name,
        contentType: result.contentType,
        file: file, // Include the original file for UI display
        content: [
          {
            type: "text" as const,
            text: `[File: ${result.name}]`,
            // Store the OpenAI file ID for the server to use
            fileId: result.fileId,
          },
        ],
        status: { type: "complete" as const },
      };

      console.log("🔄 Returning attachment object:", attachment);
      return attachment;
    } catch (error) {
      console.error("❌ Upload failed:", error);
      throw error;
    }
  }

  async send(attachment: Attachment): Promise<any> {
    console.log("🔄 Starting upload for:", attachment.file!.name);
    
    try {
      // Upload via our secure server endpoint
      const formData = new FormData();
      formData.append('file', attachment.file!);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      console.log("✅ Upload successful, file ID:", result.fileId);

      return {
        content: [
          {
            type: "text" as const,
            text: `[File: ${attachment.file!.name}]`,
            fileId: result.fileId,
          },
        ],
      };
    } catch (error) {
      console.error("❌ Upload failed:", error);
      throw error;
    }
  }

  async remove(attachment: Attachment) {
    const fileId = (attachment.content?.[0] as any)?.file_id;
    if (fileId) {
      try {
        // Note: File deletion could be implemented as a separate API endpoint
        // For now, we'll just log that cleanup would happen here
        console.log("🗑️ File would be deleted from OpenAI:", fileId);
        // TODO: Implement DELETE /api/upload/:fileId endpoint for cleanup
      } catch (err) {
        console.warn("Failed to delete file:", err);
      }
    }
  }
}

export function usePersistedChatRuntime() {
  const { user: currentUser } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(false);

  // Create runtime with thread persistence and authentication
  const runtime = useChatRuntime({
    api: "/api/chat",
    body: {
      threadId: currentThreadId,
    },
    credentials: "include", // Include cookies for Supabase session
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new PDFAttachmentAdapter(),
      ]),
    },
  });

  // Load user's threads
  const loadThreads = useCallback(async () => {
    if (!currentUser) return;
    
    setLoadingThreads(true);
    try {
      const response = await fetch('/api/chat', {
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
      // Set the current thread ID
      setCurrentThreadId(threadId);
      
      // Switch runtime to new thread with loaded messages
      runtime.switchToNewThread();
      
      // The messages will be loaded automatically via the API when threadId is set
      
    } catch (error) {
      // Error loading thread
    }
  }, [runtime]);

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
      const response = await fetch(`/api/chat?threadId=${threadId}`, {
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