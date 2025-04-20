import OpenAI from "openai";
import { NextRequest } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");

  if (!threadId) {
    return new Response("Missing threadId", { status: 400 });
  }

  const threadMessages = await openai.beta.threads.messages.list(threadId);
  const messages = threadMessages.data
    .reverse()
    .map((msg) => ({
      role: msg.role,
      content: msg.content?.[0]?.text?.value || "",
    }));

  return Response.json(messages);
}
