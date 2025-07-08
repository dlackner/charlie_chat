import { AssistantResponse } from "ai";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const input = await req.json();
    console.log("🔍 Full request body:", JSON.stringify(input, null, 2));
    if (!input.message || !input.message.trim()) {
      return new Response("Missing message content", { status: 400 });
    }

    /* ───────────────────── MOVE THIS UP: Validate attachments first ─────────────────────── */
    const attachments = input.attachments || [];

    // Filter out placeholder attachments and validate file_ids
    const validAttachments = attachments.filter((att: any) => {
      const fileId = att.content?.[0]?.file_id;
      return fileId && fileId !== "PLACEHOLDER" && fileId.startsWith("file-");
    });

    console.log("Received attachments:", attachments);
    console.log("Valid attachments:", validAttachments);

    /* ───────────────────────── NOW: Handle thread management ─────────────────────────*/
    console.log("Managing thread for request");
    let threadId = input.threadId;

    // Force new thread if there are valid attachments to avoid context pollution
    if (validAttachments.length > 0) {
      console.log("File attachment detected - creating fresh thread");
      threadId = (await openai.beta.threads.create({})).id;
    } else if (!threadId || !threadId.startsWith("thread_")) {
      console.log("Creating new thread");
      threadId = (await openai.beta.threads.create({})).id;
    } else {
      console.log("Using existing thread:", threadId);
    }

    /* ─────────────────────── Create the user message ─────────────────────── */
    const messageData: any = {
      role: "user",
      content: input.message,
    };

    // ✅ Attach files only if present and valid
    if (validAttachments.length > 0) {
      messageData.attachments = validAttachments.map((att: any) => ({
        file_id: att.content[0].file_id,
        tools: [
          { type: "file_search" },
          { type: "code_interpreter" }
        ]
      }));
    }
// ADD THIS DEBUGGING HERE:
validAttachments.forEach((att: any, i: number) => {
  console.log(`Attachment ${i}:`, JSON.stringify(att, null, 2));
  console.log(`File ID extracted:`, att.content?.[0]?.file_id);
});

console.log("Sending to OpenAI:", JSON.stringify(messageData, null, 2));

const createdMessage = await openai.beta.threads.messages.create(threadId, messageData);

    /* ───────────────── 4. Detect if this message references a file ───────────── */
    const hasFileAttachment = validAttachments.length > 0;
    const selectedModel = hasFileAttachment ? "gpt-4o-mini" : "gpt-3.5-turbo";

// 5. Stream the run with chosen model
const instructionText = hasFileAttachment
  ? `CRITICAL: Never use LaTeX, formulas, or mathematical notation. Just state results directly.
  **CRITICAL: Never say "I don't have internet access" or "I cannot access the internet"

A document has been uploaded. You are Charlie, a seasoned real estate expert with extensive market knowledge.

FOR SUMMARIZATION REQUESTS ("summarize", "summary", "tell me about this document"):
- When a user says "summarize the document" refer to the attached document 
- If asked to "summarize", treat it as: "What are the key points from this uploaded document?"
- You MUST read and analyze the uploaded file content
- Create a summary based ONLY on what is written in the uploaded document
- Do NOT use your knowledge about Master Lease Options, syndications, or other real estate concepts
- Start with: "This document contains information about [specific property/content from the file]..."

FOR MATHEMATICAL CALCULATIONS:
- Never show formulas or equations
- Just state the result: "Based on $50,000 NOI and 7% cap rate, offer around $714,286"
- No LaTeX, brackets, fractions, or special formatting

FOR OTHER QUESTIONS:
- Answer based on the uploaded document when relevant
- Use your real estate expertise when appropriate

**FOR ANALYSIS QUESTIONS** that require combining document data with real estate concepts:
- Extract relevant data from the uploaded document first
- Apply your real estate knowledge and expertise to analyze that data
- Example: "Does this meet buy box criteria?" → Use document data + your buy box knowledge

**FOR GENERAL REAL ESTATE QUESTIONS** (even with document attached):
- Use your extensive real estate knowledge and market expertise confidently
- Don't claim you "can't access the internet" - you have broad market knowledge
- Provide helpful insights about markets, trends, and rental rates
- If asked about current market data, share what you know and suggest verification when appropriate

TONE: Confident real estate expert, not a limited AI assistant.
Always be clear about your sources: "Based on the uploaded document, this property has X units. Regarding buy box criteria, typically investors look for..."`
  : `CRITICAL: Never use LaTeX, formulas, or mathematical notation. Just state results directly.

You are Charlie, a seasoned real estate investor with extensive market knowledge across the US.

FOR MATHEMATICAL CALCULATIONS:
- Never show formulas or equations
- Just state the result clearly
- No LaTeX, brackets, fractions, or special formatting

Provide confident, actionable advice using your real estate expertise. Don't claim limitations about internet access - share your knowledge and suggest verification when appropriate.`
  // ADD LOGGING HERE:
console.log("🤖 Model selected:", selectedModel);
console.log("📋 Instructions sent:", instructionText);
console.log("📎 File attachments:", validAttachments.length);
console.log("📝 User message:", input.message);
console.log("🔗 Thread ID:", threadId);

const runStream = await openai.beta.threads.runs.stream(threadId, {
  assistant_id: process.env.ASSISTANT_ID!,
  model: selectedModel,
  instructions: instructionText
});

// 6. Convert to SSE for the frontend
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ threadId, messageId: createdMessage.id })}\n\n`)
    );
    for await (const chunk of runStream) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    }
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  },
});

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "x-thread-id": threadId,
      },
    });
  } catch (err) {
    console.error("Assistant error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
