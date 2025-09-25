/*
 * MFOS - AI Coach Thread Component
 * Custom Thread component with real estate focused welcome message and suggestions
 * Based on assistant-ui Thread component with custom attachment system
 */

'use client';

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";
import { useState } from "react";
import {
  ArrowDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizontalIcon,
  Sparkles,
  Paperclip,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ComposerAttachments } from "@/components/attachment";
import { hasAccess } from '@/lib/v2/accessControl';
import type { UserClass } from '@/lib/v2/accessControl';
import { StandardModalWithActions } from '@/components/shared/StandardModal';
import { useRouter } from 'next/navigation';

// Real estate focused suggested prompts
const WELCOME_SUGGESTIONS = [
  "How do I creatively structure seller financing?",
  "What are the key metrics when evaluating a multifamily property?",
  "What assumptions should I model for a 5-year hold of a property?",
  "How do I get started in multifamily investing?"
];

interface AICoachThreadProps {
  userClass?: string | null;
}

export const AICoachThread: FC<AICoachThreadProps> = ({ userClass }) => {
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  return (
    <ThreadPrimitive.Root
      className="bg-background box-border flex h-full flex-col overflow-hidden"
      style={{
        ["--thread-max-width" as string]: "42rem",
      }}
    >
      {/* Scrollable conversation area */}
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col items-center overflow-y-scroll scroll-smooth bg-inherit px-4 pt-8 pb-4">
        <AICoachWelcome />

        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserMessage,
            EditComposer: EditComposer,
            AssistantMessage: AssistantMessage,
          }}
        />

        <ThreadPrimitive.If empty={false}>
          <div className="min-h-8 flex-grow" />
        </ThreadPrimitive.If>
      </ThreadPrimitive.Viewport>

      {/* Fixed input area at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end mx-auto relative">
          <ThreadScrollToBottom />
          <Composer userClass={userClass} setShowUpgradeModal={setShowUpgradeModal} />
        </div>
      </div>
      
      {/* Upgrade Modal */}
      <StandardModalWithActions
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade Required"
        showCloseButton={true}
        primaryAction={{
          label: "View Plans",
          onClick: () => {
            setShowUpgradeModal(false);
            router.push('/pricing');
          }
        }}
        secondaryAction={{
          label: "Maybe Later",
          onClick: () => setShowUpgradeModal(false)
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Paperclip className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">File Attachments</h3>
              <p className="text-gray-600">Upload files to enhance your AI conversations</p>
            </div>
          </div>
          <p className="text-gray-700">
            Upgrade your plan to attach files and get more detailed AI assistance. 
            Choose from our Plus or Pro plans to unlock this feature and many more!
          </p>
        </div>
      </StandardModalWithActions>
    </ThreadPrimitive.Root>
  );
};

const AICoachWelcome: FC = () => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Hello there!
          </h2>
          <p className="mt-4 font-medium text-gray-600">
            How can I help you with your multifamily investing journey today?
          </p>
        </div>
        <AICoachWelcomeSuggestions />
      </div>
    </ThreadPrimitive.Empty>
  );
};

const AICoachWelcomeSuggestions: FC = () => {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
      {WELCOME_SUGGESTIONS.map((suggestion, index) => (
        <ThreadPrimitive.Suggestion
          key={index}
          className="hover:bg-blue-50 hover:border-blue-300 flex grow flex-col items-start justify-center rounded-lg border border-gray-200 bg-white p-4 transition-colors ease-in text-left"
          prompt={suggestion}
          method="replace"
          autoSend
        >
          <span className="text-sm font-medium text-gray-900 leading-relaxed">
            {suggestion}
          </span>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom
      className={cn(
        "absolute -top-12 right-4 rounded-full border border-gray-200 bg-white shadow-sm transition-opacity hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-0 data-[state=visible]:opacity-100 data-[state=hidden]:opacity-0 p-2",
      )}
    >
      <ArrowDownIcon className="size-4 text-gray-600" />
      <span className="sr-only">Scroll to bottom</span>
    </ThreadPrimitive.ScrollToBottom>
  );
};

interface ComposerProps {
  userClass?: string | null;
  setShowUpgradeModal: (show: boolean) => void;
}

const Composer: FC<ComposerProps> = ({ userClass, setShowUpgradeModal }) => {
  return (
    <ComposerPrimitive.Root className="focus-within:border-aui-ring/20 flex w-full flex-col rounded-lg border shadow-sm transition-colors ease-in">
      {/* Attachment display with custom UI */}
      <ComposerAttachments />
      
      {/* Input and Controls */}
      <div className="flex items-end px-2.5">
        <ComposerPrimitive.AddAttachment
          className="my-2.5 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
          onClick={() => {
            if (!hasAccess(userClass as UserClass, 'ai_coach_attachments')) {
              setShowUpgradeModal(true);
              return false; // Prevent default attachment behavior
            }
            return true; // Allow default attachment behavior
          }}
        >
          <Paperclip className="size-4" />
        </ComposerPrimitive.AddAttachment>
        <ComposerPrimitive.Input
          placeholder="Send a message..."
          rows={1}
          autoFocus
          className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
        />
        <ComposerPrimitive.Send className="my-2.5 flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white transition-opacity ease-in hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-0.5">
          <SendHorizontalIcon className="size-4" />
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

// User Message Component
const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4">
      <div className="bg-muted text-foreground col-start-2 row-start-1 max-w-xl break-words rounded-3xl px-5 py-2.5">
        <MessagePrimitive.Content />
      </div>
      <div className="col-start-2 row-start-2 mx-3 mt-1">
        <ActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

// Assistant Message Component  
const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[auto_1fr] gap-x-3 gap-y-2 py-4">
      <div className="bg-muted text-muted-foreground col-start-1 row-span-full row-start-1 flex size-8 items-center justify-center rounded-full text-xs font-medium">
        AI
      </div>

      <div className="text-foreground col-start-2 row-start-1 space-y-4 break-words leading-7">
        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
      </div>
      <div className="col-start-2 row-start-2 mx-1 mt-1">
        <ActionBar />
      </div>
      <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 mt-2" />
    </MessagePrimitive.Root>
  );
};

// Edit Composer Component
const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4">
      <ComposerPrimitive.Root className="bg-gray-50 col-start-2 row-start-1 flex w-full max-w-xl flex-col gap-2 rounded-xl">
        <ComposerPrimitive.Input className="text-gray-900 flex h-8 w-full resize-none bg-transparent p-4 pb-0 outline-none focus:ring-0" />
        <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
          <ComposerPrimitive.Cancel className="bg-transparent p-2 rounded-full hover:bg-gray-200 cursor-pointer">
            <span className="text-sm text-gray-600">Cancel</span>
            <span className="sr-only">Cancel</span>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 cursor-pointer">
            <CheckIcon className="size-4" />
            <span className="sr-only">Send</span>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

// Action Bar Component
const ActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root className="text-gray-600 flex items-center gap-1 rounded-full transition-opacity ease-in data-[state=closed]:opacity-0 data-[state=open]:opacity-100 data-[state=running]:opacity-100">
      <ActionBarPrimitive.Copy className="hover:bg-gray-100 p-2 rounded-full cursor-pointer">
        <CopyIcon className="size-4" />
        <span className="sr-only">Copy</span>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload className="hover:bg-gray-100 p-2 rounded-full cursor-pointer">
        <RefreshCwIcon className="size-4" />
        <span className="sr-only">Refresh</span>
      </ActionBarPrimitive.Reload>
      <ActionBarPrimitive.Edit className="hover:bg-gray-100 p-2 rounded-full cursor-pointer">
        <PencilIcon className="size-4" />
        <span className="sr-only">Edit</span>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

// Branch Picker Component
interface BranchPickerProps {
  className?: string;
}

const BranchPicker: FC<BranchPickerProps> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root className={cn("inline-flex items-center text-xs", className)}>
      <BranchPickerPrimitive.Previous className="hover:bg-gray-100 p-2 rounded cursor-pointer">
        <ChevronLeftIcon className="size-4" />
        <span className="sr-only">Previous</span>
      </BranchPickerPrimitive.Previous>
      <BranchPickerPrimitive.Number />
      <BranchPickerPrimitive.Next className="hover:bg-gray-100 p-2 rounded cursor-pointer">
        <ChevronRightIcon className="size-4" />
        <span className="sr-only">Next</span>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};