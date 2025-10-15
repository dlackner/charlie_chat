// @ts-nocheck
// This is the old Assistant API implementation - kept for reference only
// All TypeScript checks disabled since this file is unused

import { AssistantResponse } from "ai";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get authenticated user ID from request (same pattern as upload route)
async function getUserId(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const allCookies = cookieStore.getAll();
    const sessionCookie = allCookies.find(cookie => 
      cookie.name.includes('auth-token') && 
      !cookie.name.includes('code-verifier')
    );
    
    if (!sessionCookie?.value) {
      console.log('No auth session cookie found');
      return null;
    }

    let tokenValue = sessionCookie.value;
    if (tokenValue.startsWith('base64-')) {
      tokenValue = Buffer.from(tokenValue.substring(7), 'base64').toString('utf-8');
    }
    
    const tokenData = JSON.parse(tokenValue);
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      console.log('No access token in session cookie');
      return null;
    }

    // Get user from Supabase using the access token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      console.log('Invalid session token:', error?.message);
      return null;
    }
    
    console.log('✅ Authenticated user:', user.id);
    return user.id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

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

// Database persistence functions
async function saveOrUpdateChatThread(userId: string, openaiThreadId: string, title?: string) {
  try {
    // Check if thread already exists
    const { data: existingThread, error: checkError } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('user_id', userId)
      .eq('openai_thread_id', openaiThreadId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing thread:', checkError);
      return null;
    }

    let threadId;
    
    if (existingThread) {
      // Update existing thread
      const { data, error } = await supabase
        .from('chat_threads')
        .update({ 
          updated_at: new Date().toISOString(),
          ...(title && { title })
        })
        .eq('id', existingThread.id)
        .select('id')
        .single();
      
      if (error) {
        console.error('Error updating thread:', error);
        return null;
      }
      threadId = data.id;
    } else {
      // Create new thread
      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          user_id: userId,
          openai_thread_id: openaiThreadId,
          title: title || 'New Conversation'
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error creating thread:', error);
        return null;
      }
      threadId = data.id;
    }

    console.log('✅ Thread saved/updated:', threadId);
    return threadId;
  } catch (error) {
    console.error('Error saving thread:', error);
    return null;
  }
}

async function saveChatMessage(threadId: string, userId: string, role: string, content: string, attachmentData?: any[]) {
  try {
    const metadata = attachmentData ? { attachments: attachmentData } : {};
    
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role,
        content,
        metadata
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving message:', error);
      return null;
    }

    console.log('✅ Message saved:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error saving message:', error);
    return null;
  }
}

async function saveChatAttachments(threadId: string, messageId: string, userId: string, attachments: any[]) {
  try {
    const attachmentRecords = attachments.map(att => ({
      thread_id: threadId,
      message_id: messageId,
      user_id: userId,
      openai_file_id: att.content[0].file_id || att.content[0].fileId,
      file_name: att.name,
      content_type: att.contentType || 'application/pdf',
      file_size: att.file?.size || null
    }));

    const { data, error } = await supabase
      .from('chat_attachments')
      .insert(attachmentRecords)
      .select('id');
    
    if (error) {
      console.error('Error saving attachments:', error);
      return null;
    }

    console.log('✅ Attachments saved:', data.length);
    return data;
  } catch (error) {
    console.error('Error saving attachments:', error);
    return null;
  }
}

export const maxDuration = 30;
export async function POST(req: Request) {
  try {
    const input = await req.json();
    console.log("🔍 Direct API request:", { 
      hasMessage: !!input.message || !!input.messages,
      attachments: input.attachments?.length || 0 
    });

    // Extract message from different formats
    let message = '';
    let attachments = input.attachments || [];

    if (input.message) {
      message = input.message;
    } else if (input.messages && Array.isArray(input.messages)) {
      const lastMessage = input.messages[input.messages.length - 1];
      if (typeof lastMessage?.content === 'string') {
        message = lastMessage.content;
      } else if (Array.isArray(lastMessage?.content)) {
        message = lastMessage.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join(' ');
      }
    }

    if (!message || !message.trim()) {
      return new Response("Missing message content", { status: 400 });
    }

    console.log("💬 Message:", message);
    console.log("📎 Attachments:", attachments.length);

    // Get user ID for persistence
    const userId = await getUserId(req);
    
    // Validate attachments
    const validAttachments = attachments.filter((att: any) => {
      const fileId = att.content?.[0]?.file_id || att.content?.[0]?.fileId;
      return fileId && fileId !== "PLACEHOLDER" && fileId.startsWith("file-");
    });

    console.log("✅ Valid attachments:", validAttachments.length);

    // Load previous file context for persistence
    let previousFiles: string[] = [];
    if (userId) {
      try {
        const { data: recentAttachments } = await supabase
          .from('chat_attachments')
          .select('openai_file_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5); // Keep last 5 files in context
        
        previousFiles = recentAttachments?.map(att => att.openai_file_id) || [];
        console.log("📎 Previous files loaded:", previousFiles.length);
      } catch (error) {
        console.error("Error loading previous files:", error);
      }
    }

    // Combine current and previous files for context
    const allFileIds = [
      ...validAttachments.map(att => att.content[0].file_id || att.content[0].fileId),
      ...previousFiles
    ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

    console.log("📁 All files for context:", allFileIds.length);

    // Save new attachments to database for persistence
    if (userId && validAttachments.length > 0) {
      const tempThreadId = crypto.randomUUID();
      saveOrUpdateChatThread(userId, tempThreadId).then(dbThreadId => {
        if (dbThreadId) {
          saveChatMessage(dbThreadId, userId, 'user', message, validAttachments).then(messageId => {
            if (messageId) {
              saveChatAttachments(dbThreadId, messageId, userId, validAttachments);
            }
          });
        }
      }).catch(error => {
        console.error('Database persistence error:', error);
      });
    }

    // Build input for direct API call
    let apiInput = message;
    
    if (allFileIds.length > 0) {
      const fileContext = allFileIds.map(id => `[File ID: ${id}]`).join('\n');
      apiInput = `${fileContext}\n\n${message}`;
      console.log("📎 Added file context to input");
    }

    console.log("🚀 Calling gpt-4o-mini-search-preview directly");

    // Call gpt-4o-mini-search-preview directly
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial loading message
          const loadingMessage = hasFileAttachment 
            ? "Analyzing your document... 📄\n\n"
            : "Thinking... 💭\n\n";
          
          controller.enqueue(encoder.encode(`0:${JSON.stringify(loadingMessage)}\n`));
          
          // Start the assistant run
          const runConfig: any = {
            assistant_id: process.env.ASSISTANT_ID!,
            model: selectedModel,
            instructions: instructionText,
          };
         
          // When attachments are present, we need to ensure the assistant uses them
          if (hasFileAttachment) {
            runConfig.additional_instructions = `IMPORTANT: Use ONLY the files attached to this specific message. Do NOT use any pre-configured knowledge base or vector stores. The user has uploaded file ID: ${validAttachments[0]?.content[0]?.file_id || validAttachments[0]?.content[0]?.fileId}`;
          }
         
          const runStream = await openai.beta.threads.runs.stream(threadId, runConfig);
          let fullResponse = '';

          // Process the stream
          for await (const event of runStream) {
            if (event.event === 'thread.run.step.created') {
              console.log('🏃 Run step created:', event.data.type);
            }
            else if (event.event === 'thread.run.requires_action') {
              console.log('🔧 Run requires action - handling function calls');
              const runId = event.data.id;
              const toolCalls = event.data.required_action?.submit_tool_outputs?.tool_calls || [];
              
              const toolOutputs = [];
              for (const toolCall of toolCalls) {
                if (toolCall.function?.name === 'searchWeb') {
                  console.log('🔍 Executing web search:', toolCall.function.arguments);
                  try {
                    const args = JSON.parse(toolCall.function.arguments);
                    // For now, return a simple response - we'll implement proper search later
                    const searchResults = {
                      query: args.query,
                      results: [{
                        title: "Current Market Data",
                        snippet: `Based on recent market analysis for "${args.query}", please check current listings on Zillow, Apartments.com, or local MLS data for the most accurate information.`,
                        url: "https://zillow.com"
                      }],
                      summary: `Current market search for: ${args.query}. Recommend checking live listings for accurate data.`
                    };
                    
                    toolOutputs.push({
                      tool_call_id: toolCall.id,
                      output: JSON.stringify(searchResults)
                    });
                    console.log('✅ Web search completed for:', args.query);
                  } catch (error) {
                    console.error('❌ Web search failed:', error);
                    toolOutputs.push({
                      tool_call_id: toolCall.id,
                      output: JSON.stringify({ error: 'Search temporarily unavailable' })
                    });
                  }
                }
              }

              // Submit tool outputs and continue the run
              if (toolOutputs.length > 0) {
                console.log('📤 Submitting tool outputs:', toolOutputs.length);
                await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
                  tool_outputs: toolOutputs
                });
                console.log('✅ Tool outputs submitted, now polling for completion...');
                
                // Poll for run completion after submitting tool outputs
                let runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
                while (runStatus.status === 'in_progress' || runStatus.status === 'queued' || runStatus.status === 'requires_action') {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
                  console.log('🔄 Run status:', runStatus.status);
                  
                  // Handle additional function calls if needed
                  if (runStatus.status === 'requires_action') {
                    console.log('🔧 Run requires additional action during polling');
                    const additionalToolCalls = runStatus.required_action?.submit_tool_outputs?.tool_calls || [];
                    
                    if (additionalToolCalls.length > 0) {
                      console.log('🔄 Processing additional function calls...');
                      // For now, just return a simple response to break the loop
                      const simpleOutputs = additionalToolCalls.map(tc => ({
                        tool_call_id: tc.id,
                        output: JSON.stringify({ 
                          message: "Function processing completed",
                          status: "success" 
                        })
                      }));
                      
                      await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
                        tool_outputs: simpleOutputs
                      });
                    }
                  }
                }
                
                if (runStatus.status === 'completed') {
                  console.log('✅ Run completed after tool outputs');
                  // Get the final messages
                  const messages = await openai.beta.threads.messages.list(threadId);
                  const lastMessage = messages.data[0];
                  if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
                    fullResponse = lastMessage.content[0].text.value;
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(fullResponse)}\n`));
                    controller.close();
                    return;
                  }
                } else {
                  console.log('❌ Run did not complete successfully, status:', runStatus.status);
                  controller.enqueue(encoder.encode(`0:${JSON.stringify("I'm having trouble processing that request right now. Please try again.")}\n`));
                  controller.close();
                  return;
                }
              }
            }
            else if (event.event === 'thread.run.step.completed') {
              if (event.data.type === 'tool_calls') {
                const toolCalls = (event.data as any).step_details?.tool_calls;
                if (toolCalls) {
                  toolCalls.forEach((tc: any) => {
                    if (tc.type === 'file_search') {
                      console.log('✅ File search completed successfully!');
                    } else if (tc.type === 'function') {
                      console.log('✅ Function call completed:', tc.function?.name);
                    }
                  });
                }
              }
            }
            else if (event.event === 'thread.message.delta') {
              const delta = event.data.delta;
              if (delta.content) {
                for (const content of delta.content) {
                  if (content.type === 'text' && content.text?.value) {
                    fullResponse += content.text.value;
                  }
                }
              }
            }
            else if (event.event === 'thread.run.completed') {
              console.log('✅ Run completed successfully');
              // Replace the loading message with the complete response
              controller.enqueue(encoder.encode(`0:${JSON.stringify(fullResponse)}\n`));
              controller.close();
              return;
            }
          }

        } catch (error) {
          console.error('❌ Streaming error:', error);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
        "x-thread-id": threadId,
      },
    });

  } catch (err) {
    console.error("❌ Assistant error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Function to load thread attachments for UI reconstruction
async function loadThreadAttachments(threadId: string, userId: string) {
  try {
    const { data: attachments, error } = await supabase
      .from('chat_attachments')
      .select('*')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading attachments:', error);
      return [];
    }

    // Convert database attachments back to assistant-ui format
    return attachments.map(att => ({
      id: att.id,
      type: "document" as const,
      name: att.file_name,
      contentType: att.content_type,
      content: [{
        type: "text" as const,
        text: `[File: ${att.file_name}]`,
        fileId: att.openai_file_id
      }],
      status: { type: "complete" as const }
    }));
  } catch (error) {
    console.error('Error loading thread attachments:', error);
    return [];
  }
}

// GET endpoint for thread retrieval
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');
    const loadAttachments = url.searchParams.get('loadAttachments') === 'true';

    // Get user ID
    const userId = await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If specific thread requested with attachments
    if (threadId && loadAttachments) {
      const attachments = await loadThreadAttachments(threadId, userId);
      return new Response(JSON.stringify({ attachments }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Load user's threads
    const { data: threads, error } = await supabase
      .from('chat_threads')
      .select('id, title, created_at, updated_at, openai_thread_id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading threads:', error);
      return new Response(JSON.stringify({ threads: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ threads: threads || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GET error:', error);
    return new Response("Internal Server Error", { status: 500 });
  }
}