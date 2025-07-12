// @ts-ignore
import 'dotenv/config'; // 👈 this loads your .env
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // or hardcode your key: "sk-xxxx"
});

async function addFunctionTool(assistantId: string) {
  const updated = await openai.beta.assistants.update(assistantId, {
    tools: [
      { type: "file_search" },
      {
        type: "function",
        function: {
          name: "searchWeb",
          description: "Searches the web and returns summarized results.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query, e.g. 'Tampa 1BR rent'.",
              },
            },
            required: ["query"],
          },
        },
      },
    ],
  });

  console.log("✅ Assistant updated:", updated.id);
}

addFunctionTool("asst_NdohCcGPznFhTtNjPDQrmGOJ");
