/*
 * CHARLIE2 V2 - AI Coach Interface
 * Modern chat interface using assistant-ui components with real estate coaching focus
 * Features chat persistence, suggested prompts, and GPT-4o mini integration
 * Part of the new V2 application architecture
 */

'use client';

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { MessageCircle, Plus, Trash2 } from 'lucide-react';
import { AICoachThread } from './components/AICoachThread';
import { usePersistedChatRuntime } from './hooks/usePersistedChatRuntime';
import { AttachmentProvider, useAttachments } from './context/AttachmentContext';

interface AICoachContentProps {
  threads: Array<{
    id: string;
    title: string;
    updated_at: string;
  }>;
  loadingThreads: boolean;
  loadThread: (threadId: string) => void;
  createNewThread: () => void;
  deleteThread: (threadId: string) => void;
  runtime: any;
}

const AICoachContent = ({ threads, loadingThreads, loadThread, createNewThread, deleteThread, runtime }: AICoachContentProps) => {
  
  const handleDeleteThread = (threadId: string) => {
    deleteThread(threadId);
  };
  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header Navigation - Always Visible */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">AI Coach</h1>
            </div>
            <button
              onClick={createNewThread}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">New Thread</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with Thread List */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        
          {/* Custom Thread List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingThreads ? (
              <div className="text-sm text-gray-500 text-center py-8">
                Loading conversations...
              </div>
            ) : threads.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-2">
                {threads.map((thread) => (
                  <div key={thread.id} className="group flex items-start gap-2 p-3 rounded-lg text-sm transition-colors text-gray-600 hover:bg-gray-100">
                    <button
                      className="flex-1 text-left focus:outline-none min-w-0"
                      onClick={() => loadThread(thread.id)}
                    >
                      <div className="font-medium break-words">{thread.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(thread.updated_at).toLocaleDateString()}
                      </div>
                    </button>
                    <button 
                      className="opacity-50 hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all flex-shrink-0"
                      onClick={() => handleDeleteThread(thread.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          <AssistantRuntimeProvider runtime={runtime}>
            <AICoachThread />
          </AssistantRuntimeProvider>
        </div>
      </div>
    </div>
  );
};

// Component that uses attachments and creates runtime
const AICoachWithAttachments = () => {
  const { attachments, clearAttachments } = useAttachments();
  const { runtime, threads, loadingThreads, loadThread, createNewThread, deleteThread } = usePersistedChatRuntime(attachments, clearAttachments);

  return (
    <AICoachContent 
      threads={threads}
      loadingThreads={loadingThreads}
      loadThread={loadThread}
      createNewThread={createNewThread}
      deleteThread={deleteThread}
      runtime={runtime}
    />
  );
};

export default function AICoachPage() {
  return (
    <AttachmentProvider>
      <AICoachWithAttachments />
    </AttachmentProvider>
  );
}