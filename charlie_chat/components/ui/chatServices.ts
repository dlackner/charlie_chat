import OpenAI from "openai";
import { Attachment, AttachmentStatus } from "@assistant-ui/react";
import { Listing, ChatMessage, FIELD_MAPPINGS, BATCH_SIZE } from './chatTypes';

// Charlie's Analysis Personality Constants
const CHARLIE_ANALYSIS_STYLES = [
  {
    style: "contrarian",
    intro: "Let me cut through the noise and tell you what everyone else is missing about these properties:",
    perspective: "I'm looking for the hidden flaws and unexpected opportunities that most investors overlook."
  },
  {
    style: "opportunistic", 
    intro: "Here's where I see the real money-making potential in this batch:",
    perspective: "I'm hunting for properties where the numbers tell a story the seller doesn't even know."
  },
  {
    style: "cautious",
    intro: "Time for some hard truths about these properties - not everything that glitters is gold:",
    perspective: "I'm scrutinizing these deals like my own money is on the line, because yours should be."
  },
  {
    style: "aggressive",
    intro: "Let's separate the wheat from the chaff - here's what these properties are really worth:",
    perspective: "I'm looking for deals that make other investors kick themselves for missing out."
  }
];

const CHARLIE_VERDICT_PHRASES: { [key: string]: string[] } = {
  pursue: [
    "This one's got my attention - here's why:",
    "I'd put this on my short list, and here's my game plan:",
    "This property is speaking my language:",
    "If I were writing the check, here's what I'd do:",
    "This one passes the Charlie test:"
  ],
  monitor: [
    "Not quite there yet, but worth keeping an eye on:",
    "This one's in my 'maybe' pile for these reasons:",
    "I'm not convinced yet, but here's what could change my mind:",
    "Sitting on the fence with this one:",
    "This property is playing hard to get, but:"
  ],
  pass: [
    "I'm walking away from this one, and you should too:",
    "This deal doesn't pass the smell test:",
    "Hard pass on this property - here's why:",
    "This one's a headache waiting to happen:",
    "I've seen this movie before, and it doesn't end well:"
  ]
};

// Helper Functions for Charlie's Personality
const getRandomAnalysisStyle = () => {
  return CHARLIE_ANALYSIS_STYLES[Math.floor(Math.random() * CHARLIE_ANALYSIS_STYLES.length)];
};

const getVerdictPhrase = (verdict: string) => {
  const phrases = CHARLIE_VERDICT_PHRASES[verdict.toLowerCase()] || CHARLIE_VERDICT_PHRASES.pass;
  return phrases[Math.floor(Math.random() * phrases.length)];
};

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

// Enhanced Property Analysis Functions
export const formatPropertyForAnalysis = (listing: Listing, globalIndex: number): string => {
  const mainDisplayAddress = listing.address?.address || "Unknown Address";
  
  // Calculate some key metrics upfront to give Charlie context
  const keyMetrics = [];
  
  // Price per unit if it's multifamily (use assessed value instead of list price)
  if (listing.unitsCount && listing.unitsCount > 1 && listing.assessedValue) {
    const pricePerUnit = listing.assessedValue / listing.unitsCount;
    keyMetrics.push(`Assessed Value/Unit: ${pricePerUnit.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}`);
  }
  
  // Price per square foot if we have both values (use assessed value)
  if (listing.assessedValue && listing.squareFeet) {
    const pricePerSqFt = listing.assessedValue / listing.squareFeet;
    keyMetrics.push(`Assessed Value/Sq Ft: ${pricePerSqFt.toFixed(0)}`);
  }
  
  
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

  // Add market signals and key metrics at the top
  let marketContext = "";
  if (keyMetrics.length > 0) {
    marketContext += `Key Metrics: ${keyMetrics.join(" | ")}\n`;
  }

  const finalPropertyDetails = addressInfo + marketContext + propertyDetails;

  if (finalPropertyDetails.trim() === "") {
    return `**${globalIndex}. ${mainDisplayAddress}**\nNo additional property details available.\n`;
  }

  return `**Property ${globalIndex}: ${mainDisplayAddress}**\n\n${finalPropertyDetails.trim()}`;
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

  // Get Charlie's random analysis style for this batch
  const analysisStyle = getRandomAnalysisStyle();
  
  // Add some specific instructions to make Charlie more opinionated
  const charlieInstructions = [
    "Channel your inner real estate contrarian - question conventional wisdom",
    "Look for red flags that other investors miss",
    "Identify hidden value that's not obvious from the listing",
    "Apply hard-earned market lessons from your knowledge base", 
    "Be specific about what you'd negotiate and why",
    "Call out when something smells fishy",
    "Share tactical insights that only come from experience"
  ];
  
  const randomInstruction = charlieInstructions[Math.floor(Math.random() * charlieInstructions.length)];

  return `You are Charlie, an experienced real estate investor with deep market knowledge. ${analysisStyle.intro}

${analysisStyle.perspective} ${randomInstruction}

For each of these ${propertiesForThisBatch.length} properties, provide:

1. **Complete Property Description**: Start with a comprehensive overview including:
   - Property type, year built, number of units, stories
   - Building and lot square footage if available
   - Assessed value, estimated market value, estimated equity
   - Last sale amount and date if available
   - Mortgage balance, years owned by current owner
   - Owner information (names, occupancy status, absentee owner status)
   - Property flags: flood zone, foreclosure, pre-foreclosure, REO, auction status
   - Investment indicators: corporate owned, private lender, tax liens
   - Calculate key metrics from available data: equity percentage, value per unit
   - Any concerning signals like recent sales matching assessed values

2. **Charlie's Take**: Your unfiltered opinion on what makes this property interesting, concerning, or mediocre. Reference specific market knowledge from your training

3. **Strategy**: Specific pursuit tactics - what would you offer, what would you negotiate, what contingencies would you include

4. **Verdict**: Use one of these exact formats:
   - **Verdict: PURSUE** - ${getVerdictPhrase('pursue')}
   - **Verdict: MONITOR** - ${getVerdictPhrase('monitor')}  
   - **Verdict: PASS** - ${getVerdictPhrase('pass')}

Make each analysis distinct - vary your language, focus on different aspects, and let your personality shine through. Don't just recite numbers; tell the story of why this property does or doesn't make sense.

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
          console.log("🔍 Parsed data:", parsed);

          
          // NEW: Handle the updated response format
          if (parsed.type === 'text' && parsed.text) {
            const delta = parsed.text;
            fullText += delta;
            
console.log("📝 About to update UI with:", fullText);
console.log("📝 Current messages length before update");

            onMessageUpdate((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const filteredMessages = newMessages.filter(msg => !msg.isLoading);
              
              if (filteredMessages.length > 0 && filteredMessages[filteredMessages.length - 1].role === 'assistant') {
                filteredMessages[filteredMessages.length - 1].content = fullText;
                return filteredMessages;
              }
              return [...filteredMessages, { role: "assistant", content: fullText }];
            });

            console.log("📝 UI update completed");
          }
          // Handle threadId and messageId from initial response
          else if (parsed.threadId) {
            if (!threadId) {
              onThreadIdUpdate(parsed.threadId);
              localStorage.setItem("threadId", parsed.threadId);
            }
          }
          
        } catch (err) {
          console.warn("❌ Failed to parse line:", json, err);
        }
      }
    }
  }

  // Handle threadId assignment from headers as fallback
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

  // Handle threadId assignment from headers
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
          console.log("🔍 Parsed data:", parsed);

          
          // NEW: Handle the updated response format
          if (parsed.type === 'text' && parsed.text) {
            const delta = parsed.text;
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
          // Handle threadId and messageId from initial response
          else if (parsed.threadId) {
            if (!threadId) {
              onThreadIdUpdate(parsed.threadId);
              localStorage.setItem("threadId", parsed.threadId);
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