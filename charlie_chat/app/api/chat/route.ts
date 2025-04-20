import { AssistantResponse } from "ai";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const input = await req.json();

    if (!input.message || input.message.trim() === "") {
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

    return AssistantResponse(
      { threadId, messageId: createdMessage.id },
      async ({ forwardStream }) => {
        const runStream = openai.beta.threads.runs.stream(threadId, {
          assistant_id: process.env.ASSISTANT_ID!,
        });

        await forwardStream(runStream);
      }
    );
  } catch (err) {
    console.error("🔥 Assistant error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
