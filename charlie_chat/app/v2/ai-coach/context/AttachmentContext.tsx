/*
 * CHARLIE2 V2 - Attachment Context
 * Manages file attachments for AI Coach
 * Provides state management for file uploads and attachment handling
 * Part of the new V2 application architecture
 */

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// File attachment interface
export interface FileAttachment {
  fileId: string;
  name: string;
  size: number;
  type: string;
}

interface AttachmentContextType {
  attachments: FileAttachment[];
  addAttachment: (attachment: FileAttachment) => void;
  removeAttachment: (fileId: string) => void;
  clearAttachments: () => void;
}

const AttachmentContext = createContext<AttachmentContextType | undefined>(undefined);

export function AttachmentProvider({ children }: { children: ReactNode }) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const addAttachment = (attachment: FileAttachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const removeAttachment = (fileId: string) => {
    setAttachments(prev => prev.filter(att => att.fileId !== fileId));
  };

  const clearAttachments = () => {
    setAttachments([]);
  };

  return (
    <AttachmentContext.Provider value={{
      attachments,
      addAttachment,
      removeAttachment,
      clearAttachments,
    }}>
      {children}
    </AttachmentContext.Provider>
  );
}

export function useAttachments() {
  const context = useContext(AttachmentContext);
  if (context === undefined) {
    throw new Error('useAttachments must be used within an AttachmentProvider');
  }
  return context;
}