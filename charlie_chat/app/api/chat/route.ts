import { AssistantResponse } from "ai";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const input = await req.json();

    if (!input.message || !input.message.trim()) {
      return new Response("Missing message content", { status: 400 });
    }

    let threadId = input.threadId;

    if (!threadId || !threadId.startsWith("thread_")) {
      const newThread = await openai.beta.threads.create({});
      threadId = newThread.id;
    }

    const createdMessage = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: input.message,
    });

    const runStream = await openai.beta.threads.runs.stream(threadId, {
      assistant_id: process.env.ASSISTANT_ID!,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
    
        console.log("🔥 Starting OpenAI run stream..."); // ✅ this is the key one
    
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ threadId, messageId: createdMessage.id })}\n\n`));
    
        for await (const chunk of runStream) {
          console.log("📦 Streaming chunk:", chunk); // ✅ log every chunk
    
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
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("🔥 Assistant error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
