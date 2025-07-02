import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  Attachment,
  AttachmentStatus,
} from "@assistant-ui/react";

import OpenAI from "openai";

// Set up your OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // or fetch securely from backend
  dangerouslyAllowBrowser: true, // required for client-side usage
});

// Define the custom PDF adapter
class PDFAttachmentAdapter {
  accept = "application/pdf";

  matches(attachment: Attachment) {
    return attachment.file?.type === "application/pdf";
  }

  async add({ file }: { file: File }): Promise<any> { // Use any to bypass strict typing
    const uploaded = await openai.files.create({
      file: file,
      purpose: "assistants",
    });

    return {
      id: crypto.randomUUID(),
      type: "document",
      name: file.name,
      contentType: "application/pdf",
      content: [
        {
          type: "file_search",
          file_id: uploaded.id,
        } as any, // Cast to any
      ],
      status: { type: "complete" },
    } as any; // Cast entire return to any
  }

async send(attachment: Attachment): Promise<any> { // Use any return type
  console.log("🔄 Starting upload for:", attachment.file!.name);
  console.log("🔄 File size:", attachment.file!.size);
  console.log("🔄 File type:", attachment.file!.type);
  
  try {
    const uploaded = await openai.files.create({
      file: attachment.file!,
      purpose: "assistants",
    });

    console.log("✅ Upload successful, file ID:", uploaded.id);

    return {
      id: attachment.id,
      type: "document",
      name: attachment.file!.name,
      contentType: "application/pdf",
      content: [
        {
          type: "file_search",
          file_id: uploaded.id,
        } as any,
      ],
      status: { type: "complete" },
    } as any;
  } catch (error) {
    throw error; // This will show the error in your UI
  }
}

async remove(attachment: Attachment) {
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });
  
  const fileId = (attachment.content?.[0] as any)?.file_id;
  if (fileId) {
    try {
      await openai.files.del(fileId);
    } catch (err) {
      console.warn("Failed to delete file from OpenAI:", err);
    }
  }
}
}

// Create your runtime with the composite adapter
const runtime = useChatRuntime({
  api: "/api/chat",
  adapters: {
    attachments: new CompositeAttachmentAdapter([
      new SimpleImageAttachmentAdapter(),
      new SimpleTextAttachmentAdapter(),
      new PDFAttachmentAdapter(), // 🔥 Add the OpenAI-enabled PDF handler
    ]),
  },
});
