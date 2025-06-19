"use client";

import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { PDFAttachmentAdapter } from "@/lib/adapters/pdf-attachment-adapter";

export function MyRuntimeProvider({ 
  children, 
  testMode = false 
}: { 
  children: React.ReactNode;
  testMode?: boolean;
}) {
  const runtime = useChatRuntime({
    api: testMode ? "/api/test-chat" : "/api/chat",
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
        new PDFAttachmentAdapter(),
      ]),
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}