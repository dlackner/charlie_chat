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

    /* ───────────────────────── 1. Thread handling (unchanged) ───────────────────────── 
    let threadId = input.threadId;
    let threadExists = false;

    if (threadId?.startsWith("thread_")) {
      try {
        await openai.beta.threads.retrieve(threadId);
        threadExists = true;
      } catch (e: any) {
        if (e.status !== 404) console.error("Error retrieving thread:", e);
        threadId = null;
      }
    }
    if (!threadId || !threadExists) {
      threadId = (await openai.beta.threads.create({})).id;
    }*/

      /* ───────────────────────── 1. TEMPORARY: Always create fresh thread ───────────────────────── */
console.log("Creating fresh thread to avoid stuck runs");
let threadId = input.threadId;

if (!threadId || !threadId.startsWith("thread_")) {
  console.log("Creating new thread");
  threadId = (await openai.beta.threads.create({})).id;
} else {
  console.log("Using existing thread:", threadId);
}
/* ───────────────────── 2. Force cancel ALL stuck runs ─────────────────── 
try {
  const runs = await openai.beta.threads.runs.list(threadId, { limit: 10 });
  for (const run of runs.data) {
    if (["queued", "in_progress", "requires_action"].includes(run.status)) {
      console.log(`Force cancelling run ${run.id} with status ${run.status}`);
      try {
        await openai.beta.threads.runs.cancel(threadId, run.id);
      } catch (e) {
        console.log(`Failed to cancel run ${run.id}:`, e.message);
      }
    }
  }
  
  // Wait for all cancellations to process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if any runs are still active - if so, create a new thread
  const finalCheck = await openai.beta.threads.runs.list(threadId, { limit: 1 });
  if (finalCheck.data[0]?.status && ["queued", "in_progress", "requires_action"].includes(finalCheck.data[0].status)) {
    console.log("Still has active runs, creating new thread");
    threadId = (await openai.beta.threads.create({})).id;
  }
} catch (e) {
  console.log("Error managing runs, creating new thread:", e.message);
  threadId = (await openai.beta.threads.create({})).id;
}*/


/* ─────────────────────── 3. Create the user message ─────────────────────── */
const attachments = input.attachments || [];

// Filter out placeholder attachments and validate file_ids
const validAttachments = attachments.filter((att: any) => {
  const fileId = att.content?.[0]?.file_id;
  return fileId && fileId !== "PLACEHOLDER" && fileId.startsWith("file-");
});

console.log("Received attachments:", attachments);
console.log("Valid attachments:", validAttachments);

const messageData = {
   role: "user" as const,
  content: input.message,
};

// Only add attachments if we have valid ones
if (validAttachments.length > 0) {
  (messageData as any).attachments = validAttachments.map((att: any) => ({
    file_id: att.content[0].file_id,
    tools: [{ type: "file_search" }]
  }));
}

const createdMessage = await openai.beta.threads.messages.create(threadId, messageData);

    /* ───────────────── 4. Detect if this message references a file ───────────── */
    const hasFileAttachment = validAttachments.length > 0;
    const selectedModel = hasFileAttachment ? "gpt-4o-mini" : "gpt-3.5-turbo";

// 5. Stream the run with chosen model
const instructionText = hasFileAttachment 
  ? "You have access to an uploaded document. For each question, intelligently decide whether it requires information from the specific uploaded document or can be answered with general knowledge. If the question asks about specific content, data, or details from the uploaded file, search and use that document. If the question is asking for general advice, strategies, or concepts that don't require the specific document content, answer from your general knowledge. Do NOT reference previous documents or files from other conversations."
  : "Answer using your general knowledge and knowledge base. Do not reference any previously uploaded files.";

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
