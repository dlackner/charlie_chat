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
    let threadExists = false;

    if (threadId && threadId.startsWith("thread_")) {
      try {
          await openai.beta.threads.retrieve(threadId);
          threadExists = true;
          console.log("Existing thread confirmed:", threadId);
      } catch (error: any) {
          if (error.status === 404) {
              console.warn("Received threadId that was not found, will create a new one:", threadId);
              threadId = null; // Force creation of a new thread
          } else {
              console.error("Error retrieving thread:", error);
              // Decide if you want to proceed or throw an error
              // For now, let's try to create a new thread if unsure
              threadId = null;
          }
      }
    }
  
    if (!threadId || !threadExists) { // Create new thread if no ID, or it didn't start with "thread_", or it didn't exist
        console.log("Creating a new thread...");
        const newThread = await openai.beta.threads.create({});
        threadId = newThread.id;
        console.log("New thread created:", threadId);
    }

    const runs = await openai.beta.threads.runs.list(threadId!, { limit: 1 });
    if (runs.data.length > 0) {
        let latestRun = runs.data[0];
    
        // Only attempt to cancel if the run is in a state that *can* be cancelled
        if (['queued', 'in_progress'].includes(latestRun.status)) { // <--- MODIFIED CONDITION HERE
            console.log(`Previous run ${latestRun.id} is active (${latestRun.status}). Attempting to cancel it.`);
            try {
                await openai.beta.threads.runs.cancel(threadId!, latestRun.id);
                console.log(`Cancellation request sent for run ${latestRun.id}. It will move to 'cancelling' then 'cancelled'.`);
                // After sending cancel, it will go to 'cancelling'. We still need to poll until it's truly terminal.
            } catch (cancelError: any) {
                console.error(`Error sending cancellation request for run ${latestRun.id}:`, cancelError);
                // If cancelling itself fails (e.g. run just completed or failed),
                // we might want to retrieve its status again before deciding to error out.
                // For now, let's log and proceed to polling, as the run might have already terminated.
                latestRun = await openai.beta.threads.runs.retrieve(threadId!, latestRun.id); // Refresh status
            }
        } else if (['cancelling'].includes(latestRun.status)) {
            console.log(`Previous run ${latestRun.id} is already in 'cancelling' state. Will poll for completion.`);
        }
      
      
        // Poll if the run is still in any non-terminal "active" state (including 'cancelling')
        if (['queued', 'in_progress', 'requires_action', 'cancelling'].includes(latestRun.status)) {
            console.log(`Polling for run ${latestRun.id} (current status: ${latestRun.status}) to reach a terminal state...`);
            let attempts = 0;
            const maxAttempts = 15; // Poll for a maximum of ~15 seconds (1s interval)
            let runIsStillActive = true;
        
            while (runIsStillActive && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                try {
                    latestRun = await openai.beta.threads.runs.retrieve(threadId!, latestRun.id);
                } catch (retrieveError: any) {
                    console.error(`Error retrieving run ${latestRun.id} during polling:`, retrieveError);
                    // If retrieve fails (e.g., 404 if it got deleted/expired quickly after cancel), assume it's no longer active.
                    runIsStillActive = false; 
                    break;
                }

                console.log(`Run ${latestRun.id} status: ${latestRun.status} (Attempt ${attempts + 1})`);
                if (!['queued', 'in_progress', 'requires_action', 'cancelling'].includes(latestRun.status)) {
                    runIsStillActive = false; // It has reached a terminal state
                }
                attempts++;
            }
          
            if (runIsStillActive) { // Check again after loop
                console.error(`Run ${latestRun.id} did not reach a terminal state in time. Current status: ${latestRun.status}`);
                return new Response(JSON.stringify({
                    error: `The previous operation on run ${latestRun.id} is still processing (${latestRun.status}). Please try again shortly.`
                }), { status: 409 }); // 409 Conflict
            }
            console.log(`Run ${latestRun.id} is now in a terminal state: ${latestRun.status}`);
        }
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
        "x-thread-id": threadId, // ✅ this line enables thread persistence!
      },
    });
  } catch (err) {
    console.error("🔥 Assistant error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
