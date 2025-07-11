import { AssistantResponse } from "ai";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function isRunActive(threadId: string): Promise<boolean> {
  try {
    const runs = await openai.beta.threads.runs.list(threadId);
    return runs.data.some(run =>
      run.status === "queued" || run.status === "in_progress"
    );
  } catch (err) {
    console.error("Error checking active runs:", err);
    return true; // safest to assume the run is active
  }
}

async function performWebSearch(query: string) {
  try {
    console.log('🔍 Brave Search requested for:', query);
    console.log('🔍 BRAVE_API_KEY exists:', !!process.env.BRAVE_API_KEY);

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status}`);
    }

    const data = await response.json();

    const results = data.web?.results?.slice(0, 3).map((result: any) => ({
      title: result.title,
      snippet: result.description,
      url: result.url,
      published: result.age || 'Recent'
    })) || [];

    return {
      query,
      results,
      summary: `Found ${results.length} current results for "${query}". Data sourced from Brave Search.`,
      source: 'Brave Search API'
    };

  } catch (error) {
    console.error('Brave Search failed:', error);

    return {
      query,
      results: [{
        title: "Search Service Unavailable",
        snippet: `Unable to search for current data on "${query}". Using general knowledge: For accurate rental rates, check local listings on Zillow, Apartments.com, or contact local real estate agents.`,
        url: "https://example.com"
      }],
      error: 'Brave Search temporarily unavailable',
      fallback: true
    };
  }
}

// Implement Stuck Run Cleanup
async function cleanupStuckRuns(threadId: string): Promise<void> {
  try {
    const runs = await openai.beta.threads.runs.list(threadId, { limit: 10 });
    
    for (const run of runs.data) {
      if (["queued", "in_progress", "requires_action"].includes(run.status)) {
        console.log(`🛠️ Cancelling stuck run ${run.id} with status ${run.status}`);
        try {
          await openai.beta.threads.runs.cancel(threadId, run.id);
        } catch (e) {
          console.log(`Failed to cancel run ${run.id}:`, e);
        }
      }
    }
    
    // Wait for cancellations to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error("Error cleaning up stuck runs:", error);
  }
}

export const maxDuration = 30;
export async function POST(req: Request) {
  try {
    const input = await req.json();
    console.log("🔍 Full request body:", JSON.stringify(input, null, 2));

    if (!input.message || !input.message.trim()) {
      return new Response("Missing message content", { status: 400 });
    }

    // 1. Validate attachments
    const attachments = input.attachments || [];
    const validAttachments = attachments.filter((att: any) => {
      const fileId = att.content?.[0]?.file_id;
      return fileId && fileId !== "PLACEHOLDER" && fileId.startsWith("file-");
    });

    console.log("📎 Attachments received:", attachments.length);
    console.log("✅ Valid attachments:", validAttachments.length);

    // 2. Create or reuse thread - ALWAYS CREATE NEW FOR NOW
    //console.log("🔁 Creating new thread to avoid stuck runs");
    //let threadId = (await openai.beta.threads.create({})).id;
    let threadId = input.threadId;
let threadExists = false;

if (threadId?.startsWith("thread_")) {
  try {
    // Check if thread exists
    await openai.beta.threads.retrieve(threadId);
    threadExists = true;
    
    // Check for stuck runs and handle them
    if (await isRunActive(threadId)) {
      console.log("⚠️ Thread has active runs, attempting cleanup...");
      await cleanupStuckRuns(threadId);
      
      // If still stuck after cleanup, create new thread
      if (await isRunActive(threadId)) {
        console.log("🔁 Creating new thread due to unresolvable stuck runs");
        threadId = (await openai.beta.threads.create({})).id;
        threadExists = false;
      }
    }
  } catch (e: any) {
    if (e.status === 404) {
      console.log("Thread not found, creating new one");
    } else {
      console.error("Error retrieving thread:", e);
    }
    threadId = null;
    threadExists = false;
  }
}

if (!threadId || !threadExists) {
  console.log("Creating new thread");
  threadId = (await openai.beta.threads.create({})).id;
}

    // 3. Create user message
    const messageData: any = {
      role: "user",
      content: input.message,
    };

    if (validAttachments.length > 0) {
      // Attach files directly to the message
      messageData.attachments = validAttachments.map((att: any) => ({
        file_id: att.content[0].file_id,
        tools: [{ type: "file_search" }],
      }));
      
      // Also try adding file content as part of the message context
      const fileInfo = validAttachments.map((att: any) => 
        `[ATTACHED FILE: ${att.name} (ID: ${att.content[0].file_id})]`
      ).join('\n');
      
      messageData.content = `${fileInfo}\n\n${input.message}`;
    }

    validAttachments.forEach((att: any, i: number) => {
      console.log(`📎 Attachment ${i}:`, JSON.stringify(att, null, 2));
      console.log(`📄 File ID:`, att.content?.[0]?.file_id);
    });

    console.log("📝 Sending message to OpenAI:", JSON.stringify(messageData, null, 2));

    const createdMessage = await openai.beta.threads.messages.create(threadId, messageData);
    
    // Log the created message to verify attachments were included
    console.log("✅ Message created with ID:", createdMessage.id);
    if (validAttachments.length > 0) {
      console.log("📎 Message includes", validAttachments.length, "file attachment(s)");
    }

    // 4. Construct instructions
    const hasFileAttachment = validAttachments.length > 0;
    const selectedModel = hasFileAttachment ? "gpt-4o-mini" : "gpt-3.5-turbo";

    const instructionText = hasFileAttachment
      ? `You are Charlie, a seasoned real estate expert.

CRITICAL: The user has uploaded a PDF document that is attached to this message with file_id: ${validAttachments[0]?.content[0]?.file_id}

You MUST analyze THIS SPECIFIC uploaded document, NOT your knowledge base.

MANDATORY PROCESS:
1. Use file_search to read the ATTACHED document (not your knowledge base)
2. The document is likely a property profile or real estate document
3. Extract and summarize ALL information from the document including:
   - Property address and details
   - Price, size, specifications
   - Financial metrics if available
   - Any other data in the document

IMPORTANT RULES:
- This is a USER-UPLOADED document that needs analysis
- Do NOT search your knowledge base - analyze the ATTACHED file
- Do NOT use web search unless specifically asked
- Focus ONLY on the content of the uploaded document
- If you cannot access the document, say so clearly

The user's file is named: ${validAttachments[0]?.name || 'Property Document'}

Start your response by confirming you're analyzing the uploaded document, not your knowledge base.`
      : `You are Charlie, a seasoned real estate expert. Answer questions clearly and confidently.

⭑ ALWAYS search your knowledge base first for relevant information 
⭑ ALWAYS tell the user when you are basing your response on the knowledge base by saying "Based on my experience, ..." or something similar.
⭑ If specific property data is provided in the message, analyze that data directly without using searchWeb
⭑ Only use searchWeb for general market questions when no specific property details are given
⭑ Do not provide citations when using searchWeb
⭑ For math: no formulas or LaTeX — just results
⭑ When analyzing provided property data, focus on the given information rather than searching for additional market data

If you receive detailed property information to analyze, work with that data first before considering any web searches.`;

    console.log("🤖 Model selected:", selectedModel);
    console.log("📋 Instructions sent:", instructionText);
    console.log("🔗 Thread ID:", threadId);

    // 5. Create the streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ threadId, messageId: createdMessage.id })}\n\n`)
          );

          // Start the assistant run
          const runConfig: any = {
            assistant_id: process.env.ASSISTANT_ID!,
            model: selectedModel,
            instructions: instructionText,
          };
          
          // When attachments are present, we need to ensure the assistant uses them
          if (hasFileAttachment) {
            // Log assistant configuration for debugging
            try {
              const assistant = await openai.beta.assistants.retrieve(process.env.ASSISTANT_ID!);
              console.log("🤖 Assistant tools:", assistant.tools);
              console.log("🤖 Assistant file_search enabled:", assistant.tools?.some(t => t.type === 'file_search'));
              
              // Check if assistant has vector stores attached
              if ((assistant as any).tool_resources?.file_search?.vector_store_ids) {
                console.log("⚠️ Assistant has pre-configured vector stores:", (assistant as any).tool_resources.file_search.vector_store_ids);
              }
            } catch (e) {
              console.error("Failed to retrieve assistant config:", e);
            }
            
            // Try to override tool resources to prioritize message attachments
            runConfig.additional_instructions = `IMPORTANT: Use ONLY the files attached to this specific message. Do NOT use any pre-configured knowledge base or vector stores. The user has uploaded file ID: ${validAttachments[0]?.content[0]?.file_id}`;
          }
          
          const runStream = await openai.beta.threads.runs.stream(threadId, runConfig);

          // Process the stream
          for await (const event of runStream) {
            if (event.event === 'thread.run.step.created') {
              console.log('🏃 Run step created:', event.data.type);
              console.log('🏃 Step details:', JSON.stringify(event.data, null, 2));
            }
            else if (event.event === 'thread.run.step.completed') {
              if (event.data.type === 'tool_calls') {
                const toolCalls = (event.data as any).step_details?.tool_calls;
                if (toolCalls) {
                  toolCalls.forEach((tc: any) => {
                    console.log('🔧 Tool completed:', tc.type);
                    if (tc.type === 'file_search') {
                      console.log('✅ File search completed successfully!');
                    } else if (tc.type === 'function') {
                      console.log('🔍 Function called:', tc.function?.name);
                    }
                  });
                }
              }
            }
            else if (event.event === 'thread.run.requires_action') {
              console.log('⚡ Function call requires action!');

              if (event.data.required_action?.type === 'submit_tool_outputs') {
                const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
                const toolOutputs = [];

                for (const toolCall of toolCalls) {
                  if (toolCall.function.name === 'searchWeb') {
                    const { query } = JSON.parse(toolCall.function.arguments);
                    console.log('🔍 Performing web search for:', query);

                    const searchResult = await performWebSearch(query);

                    toolOutputs.push({
                      tool_call_id: toolCall.id,
                      output: JSON.stringify(searchResult)
                    });
                  }
                }

                // Submit tool outputs with streaming
                console.log('📤 Submitting tool outputs...');
                const outputStream = await openai.beta.threads.runs.submitToolOutputs(
                  threadId,
                  event.data.id,
                  {
                    tool_outputs: toolOutputs,
                    stream: true
                  }
                );

                // Stream the assistant's response after tool outputs
                for await (const outputEvent of outputStream) {
                  if (outputEvent.event === 'thread.message.delta') {
                    const delta = outputEvent.data.delta;
                    if (delta.content) {
                      for (const content of delta.content) {
                        if (content.type === 'text' && content.text?.value) {
                          //console.log('📝 Streaming text:', content.text.value);
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({
                              type: 'text',
                              text: content.text.value
                            })}\n\n`)
                          );
                        }
                      }
                    }
                  }
                  else if (outputEvent.event === 'thread.run.completed') {
                    console.log('✅ Run completed successfully');
                  }
                }
              }
            }
            else if (event.event === 'thread.message.delta') {
              // Handle direct text responses (when no function calls are needed)
              const delta = event.data.delta;
              if (delta.content) {
                for (const content of delta.content) {
                  if (content.type === 'text' && content.text?.value) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({
                        type: 'text',
                        text: content.text.value
                      })}\n\n`)
                    );
                  }
                }
              }
            }
            else if (event.event === 'thread.run.completed') {
              console.log('✅ Run completed successfully');
            }
          }

          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

        } catch (error) {
          console.error('❌ Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: 'Stream processing failed'
            })}\n\n`)
          );
          controller.close();
        }
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
    console.error("❌ Assistant error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}