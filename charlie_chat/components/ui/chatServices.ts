import OpenAI from "openai";
import { Attachment, AttachmentStatus } from "@assistant-ui/react";
import { Listing, ChatMessage, FIELD_MAPPINGS, BATCH_SIZE } from './chatTypes';

// PDF Attachment Adapter Class
export class PDFAttachmentAdapter {
  matches(attachment: Attachment) {
    return attachment.file?.type === "application/pdf";
  }

  async send(attachment: Attachment): Promise<{
    id: string;
    type: "document";
    name: string;
    content: any[];
    status: AttachmentStatus;
  }> {
    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    });

    const uploaded = await openai.files.create({
      file: attachment.file!,
      purpose: "assistants",
    });

    // Store the file_id globally so we can access it later
    window.__LATEST_FILE_ID__ = uploaded.id;
    window.__LATEST_FILE_NAME__ = attachment.file!.name;
    
    console.log("📎 File uploaded with ID:", uploaded.id);

    return {
      id: attachment.id,
      type: "document",
      name: attachment.file!.name,
      content: [
        {
          type: "file_search",
          file_id: uploaded.id,
        },
      ],
      status: { type: "complete" },
    };
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

// File Management Functions
export const handleDoneWithProperty = async (): Promise<void> => {
  try {
    // 1. Delete the file from OpenAI
    if ((window as any).__LATEST_FILE_ID__) {
      const openai = new OpenAI({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      });
      
      try {
        await openai.files.del((window as any).__LATEST_FILE_ID__);
        console.log("🗑️ Deleted file from OpenAI:", (window as any).__LATEST_FILE_ID__);
      } catch (err) {
        console.warn("Failed to delete file from OpenAI:", err);
      }
    }

    // 2. Clear all file references
    delete (window as any).__LATEST_FILE_ID__;
    delete (window as any).__LATEST_FILE_NAME__;

    console.log("✅ Done with property - switched back to general mode");
    
  } catch (error) {
    console.error("Error removing property:", error);
  }
};

// Property Analysis Functions
export const formatPropertyForAnalysis = (listing: Listing, globalIndex: number): string => {
  const mainDisplayAddress = listing.address?.address || "Unknown Address";
  
  // Send ALL available data instead of filtering specific fields
  const propertyDetails = Object.entries(listing)
    .filter(([key, value]) => {
      return value !== null && 
             value !== undefined && 
             value !== "" && 
             key !== 'address' && 
             key !== 'id';
    })
    .map(([key, value]) => {
      const fieldLabel = FIELD_MAPPINGS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      if (typeof value === 'boolean') {
        value = value ? "Yes" : "No";
      } else if (typeof value === 'object' && value !== null) {
        if (key === "mailAddress") {
          const mailAddr = value as any;
          let formattedMailAddress = "";
          if (mailAddr.street || mailAddr.address) {
            formattedMailAddress += (mailAddr.street || mailAddr.address);
          }
          if (mailAddr.city) {
            formattedMailAddress += formattedMailAddress ? `, ${mailAddr.city}` : mailAddr.city;
          }
          if (mailAddr.state) {
            formattedMailAddress += formattedMailAddress ? `, ${mailAddr.state}` : mailAddr.state;
          }
          if (mailAddr.zip) {
            formattedMailAddress += formattedMailAddress ? ` ${mailAddr.zip}` : mailAddr.zip;
          }
          value = formattedMailAddress.trim() || "N/A";
        } else {
          value = JSON.stringify(value);
        }
      } else if (typeof value === 'number') {
        if (key.toLowerCase().includes('value') || 
            key.toLowerCase().includes('price') || 
            key.toLowerCase().includes('amount') || 
            key.toLowerCase().includes('equity') ||
            key.toLowerCase().includes('balance') ||
            key.toLowerCase().includes('rent')) {
          value = value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
        } else if (key.toLowerCase().includes('squar') || key.toLowerCase().includes('feet')) {
          value = `${value.toLocaleString()} sq ft`;
        } else {
          value = value.toLocaleString();
        }
      }
      
      return `${fieldLabel}: ${value}`;
    })
    .join('\n');

  // Handle the main address separately to include full address details
  let addressInfo = "";
  if (listing.address) {
    const addr = listing.address;
    let fullAddress = addr.address || "";
    if (addr.city) fullAddress += `, ${addr.city}`;
    if (addr.state) fullAddress += `, ${addr.state}`;
    if (addr.zip) fullAddress += ` ${addr.zip}`;
    addressInfo = `Full Address: ${fullAddress.trim()}\n`;
  }

  const finalPropertyDetails = addressInfo + propertyDetails;

  if (finalPropertyDetails.trim() === "") {
    return `**${globalIndex}. ${mainDisplayAddress}**\nNo additional property details available.\n`;
  }

  return `**${globalIndex}. ${mainDisplayAddress}**\n${finalPropertyDetails.trim()}`;
};

export const generatePropertyAnalysisPrompt = (
  propertiesForThisBatch: Listing[],
  batchIndex: number,
  startIndex: number,
  endIndex: number,
  totalPropertiesToAnalyze: number
): string => {
  const rows = propertiesForThisBatch.map((listing: Listing, index: number) => {
    const globalIndex = startIndex + index + 1;
    return formatPropertyForAnalysis(listing, globalIndex);
  });

  return `Analyze these ${propertiesForThisBatch.length} properties. Compile a complete description using all available data.  If the data exists, calculate LTV, equity, price/unit, and appreciation for each. Output the complete description for each property, a specific pursuit strategy, and a final  **Verdict: Pursue/Monitor/Pass** with a rationale for each property.

Do not show calculation steps. Do not repeat properties. Start immediately:

**BATCH ${batchIndex + 1} ANALYSIS** - Properties ${startIndex + 1}-${endIndex} of ${totalPropertiesToAnalyze}

${rows.join("\n\n")}`;
};

// Message Sending Functions
interface SendMessageOptions {
  message: string;
  threadId: string | null;
  attachments?: any[];
  isPropertyDump?: boolean;
  displayMessage?: string;
}

interface SendMessageCallbacks {
  onMessageUpdate: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;  
  onThreadIdUpdate: (threadId: string) => void;
  onBatchComplete: (hasMoreProperties: boolean) => void;
  }

export const sendMessageWithAttachments = async (
  options: SendMessageOptions,
  callbacks: SendMessageCallbacks
): Promise<void> => {
  const { message, threadId, attachments = [], isPropertyDump = false, displayMessage } = options;
  const { onMessageUpdate, onThreadIdUpdate, onBatchComplete } = callbacks;

  // Add message to UI for display
  const messageToDisplay = displayMessage || message;
  
  onMessageUpdate(prev => [
    ...prev, 
    { role: "user", content: messageToDisplay, isPropertyDump }, 
    { role: "assistant", content: "" }
  ]);

  // Let the AI decide if the document is relevant
  const enhancedMessage = message; // Don't force document usage

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      message: enhancedMessage,
      threadId,
      attachments
    }),
  });

  // Stream the response
  const reader = res.body?.getReader();
  const decoder = new TextDecoder("utf-8");

  if (reader) {
    let fullText = ""; 

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data:"));

      for (const line of lines) {
        const json = line.replace("data: ", "").trim();
        if (json === "[DONE]") return;

        try {
          const parsed = JSON.parse(json);
          const contentBlocks = parsed?.data?.delta?.content;

          if (Array.isArray(contentBlocks)) {
            for (const block of contentBlocks) {
              if (block.type === "text" && block.text?.value) {
                const delta = block.text.value;
                fullText += delta;
                
                onMessageUpdate((prev: ChatMessage[]) => {
                  const newMessages = [...prev];
                  const filteredMessages = newMessages.filter(msg => !msg.isLoading);
                  
                  if (filteredMessages.length > 0 && filteredMessages[filteredMessages.length - 1].role === 'assistant') {
                    filteredMessages[filteredMessages.length - 1].content = fullText;
                    return filteredMessages;
                  }
                  return [...filteredMessages, { role: "assistant", content: fullText }];
                });
              }
            }
          }
        } catch (err) {
          console.warn("❌ Failed to parse line:", json, err);
        }
      }
    }
  }

  // Handle threadId assignment
  if (!threadId && res.headers) {
    const newThreadId = res.headers.get("x-thread-id");
    if (newThreadId && newThreadId.startsWith("thread_")) {
      const titles = JSON.parse(localStorage.getItem("chatTitles") || "{}");
      titles[newThreadId] = message.slice(0, 50);
      localStorage.setItem("chatTitles", JSON.stringify(titles));
      onThreadIdUpdate(newThreadId);
      localStorage.setItem("threadId", newThreadId);
    }
  }
};

export const sendMessageWithoutAttachments = async (
  options: SendMessageOptions,
  callbacks: SendMessageCallbacks
): Promise<void> => {
  const { message, threadId, isPropertyDump = false, displayMessage } = options;
  const { onMessageUpdate, onThreadIdUpdate } = callbacks;

  const messageToDisplay = displayMessage || message;
  
  onMessageUpdate(prev => [
    ...prev, 
    { role: "user", content: messageToDisplay, isPropertyDump }, 
    { role: "assistant", content: "" }
  ]);

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, threadId }),
  });

  // Handle threadId assignment
  if (!threadId && res.headers) {
    const newThreadId = res.headers.get("x-thread-id");
    if (newThreadId && newThreadId.startsWith("thread_")) {
      const titles = JSON.parse(localStorage.getItem("chatTitles") || "{}");
      titles[newThreadId] = message.slice(0, 50);
      localStorage.setItem("chatTitles", JSON.stringify(titles));
      onThreadIdUpdate(newThreadId);
      localStorage.setItem("threadId", newThreadId);
    }
  }

  // Stream the response
  const reader = res.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  
  if (reader) {
    let fullText = ""; 

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data:"));

      for (const line of lines) {
        const json = line.replace("data: ", "").trim();
        if (json === "[DONE]") return;

        try {
          const parsed = JSON.parse(json);
          const contentBlocks = parsed?.data?.delta?.content;

          if (Array.isArray(contentBlocks)) {
            for (const block of contentBlocks) {
              if (block.type === "text" && block.text?.value) {
                const delta = block.text.value;
                fullText += delta;
                
                onMessageUpdate((prev: ChatMessage[]) => {
                  const newMessages = [...prev];
                  const filteredMessages = newMessages.filter(msg => !msg.isLoading);
                  
                  if (filteredMessages.length > 0 && filteredMessages[filteredMessages.length - 1].role === 'assistant') {
                    filteredMessages[filteredMessages.length - 1].content = fullText;
                    return filteredMessages;
                  }
                  return [...filteredMessages, { role: "assistant", content: fullText }];
                });
              }
            }
          }
        } catch (err) {
          console.warn("❌ Failed to parse line:", json, err);
        }
      }
    }
  }
};

// Property Batch Processing
export interface PropertyBatchState {
  selectedListings: Listing[];
  currentBatch: number;
  totalPropertiesToAnalyze: number;
}

interface PropertyBatchCallbacks {
  onMessageUpdate: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  onBatchStateUpdate: (state: Partial<PropertyBatchState>) => void;
  onWaitingForContinuation: (waiting: boolean) => void;
  sendMessage: (message: string, isPropertyDump: boolean, displayMessage?: string) => void;
}

export const processPropertyBatch = (
  listingsToProcess: Listing[],
  batchIndex: number,
  autoProcess: boolean,
  state: PropertyBatchState,
  callbacks: PropertyBatchCallbacks
): void => {
  const { onMessageUpdate, onBatchStateUpdate, onWaitingForContinuation, sendMessage } = callbacks;

  // Batch processing logic
  if (batchIndex === 0) {
    // Starting fresh analysis - store total count
    onBatchStateUpdate({
      totalPropertiesToAnalyze: listingsToProcess.length,
      currentBatch: 0
    });
    onWaitingForContinuation(false);
    
    // Add loading message to chat
    onMessageUpdate((prev: ChatMessage[]) => [...prev, {
      role: "assistant",
      content: "",
      isLoading: true,
      propertyCount: listingsToProcess.length
    }]);
  }

  // Calculate which properties to analyze in this batch
  const startIndex = batchIndex * BATCH_SIZE;
  const endIndex = Math.min(startIndex + BATCH_SIZE, listingsToProcess.length);
  const propertiesForThisBatch = listingsToProcess.slice(startIndex, endIndex);

  console.log(`📊 Processing batch ${batchIndex + 1}, properties ${startIndex + 1}-${endIndex} of ${listingsToProcess.length}`);

  // If no properties in this batch, we're done
  if (propertiesForThisBatch.length === 0) {
    return;
  }

  const summaryPrompt = generatePropertyAnalysisPrompt(
    propertiesForThisBatch,
    batchIndex,
    startIndex,
    endIndex,
    state.totalPropertiesToAnalyze
  );

  // Send the full prompt to the API but display simplified message to user
  callbacks.sendMessage(summaryPrompt, true, ` `);
  
  // Update batch tracking
  onBatchStateUpdate({ currentBatch: batchIndex + 1 });

  // Check if there are more properties to analyze
  const hasMoreProperties = endIndex < listingsToProcess.length;

  if (hasMoreProperties && !autoProcess) {
    // Wait for user to decide whether to continue
    onWaitingForContinuation(true);
  } else if (!hasMoreProperties) {
    // All done - clear selections
    onBatchStateUpdate({
      currentBatch: 0,
      totalPropertiesToAnalyze: 0
    });
    onWaitingForContinuation(false);
  }
};

// Utility Functions
export const detectAttachments = (): boolean => {
  return !!(window as any).__LATEST_FILE_ID__;
};

export const extractAttachmentData = () => {
  let attachmentData = [];
  
  // Use the stored file_id from upload
  const storedFileId = window.__LATEST_FILE_ID__;
  const storedFileName = window.__LATEST_FILE_NAME__ || "Property_Profile.pdf";
  
  if (storedFileId) {
    console.log("Using stored file_id:", storedFileId);
    attachmentData.push({
      id: crypto.randomUUID(),
      type: "document", 
      name: storedFileName,
      content: [{
        type: "file_search",
        file_id: storedFileId
      }],
      status: { type: "complete" }
    });
  } else {
    console.log("No stored file_id found - creating placeholder");
    attachmentData.push({
      id: crypto.randomUUID(),
      type: "document", 
      name: "Property_Profile.pdf",
      content: [{
        type: "file_search",
        file_id: "PLACEHOLDER"
      }],
      status: { type: "complete" }
    });
  }
  
  return attachmentData;
};