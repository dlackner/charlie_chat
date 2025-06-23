import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { 
  CompositeAttachmentAdapter, 
  SimpleImageAttachmentAdapter, 
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";

const runtime = useChatRuntime({
  api: "/api/chat",
  adapters: {
    attachments: new CompositeAttachmentAdapter([
      new SimpleImageAttachmentAdapter({
        maxFileSize: 10 * 1024 * 1024 // 10MB
      }),
      new SimpleTextAttachmentAdapter({
        accept: "text/*, application/pdf",
        maxFileSize: 10 * 1024 * 1024 // 10MB
      }),
    ]),
  },