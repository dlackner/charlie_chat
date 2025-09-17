/*
 * CHARLIE2 V2 - AI Coach Chat API
 * Modern chat endpoint for V2 AI Coach using GPT-4o mini
 * Features streaming responses, chat persistence, and real estate coaching
 * Part of the new V2 application architecture
 */

import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { cookies } from "next/headers";

// Real estate coaching system prompt
const getSystemPrompt = (hasAttachments: boolean, attachmentInfo?: string) => {
  const basePrompt = `You are an expert multifamily real estate investment coach with over 25 years of experience. You help investors at all levels - from beginners to experienced operators - navigate the complexities of multifamily investing.

Your expertise includes:
- Property analysis and underwriting
- Market evaluation and timing
- Financing strategies and structures
- Due diligence processes
- Deal negotiation and closing
- Portfolio management and scaling
- Capital raising and investor relations
- Legal and regulatory considerations

Communication style:
- Practical and actionable advice
- Use real-world examples when helpful
- Ask clarifying questions to give better guidance
- Be encouraging but realistic about challenges
- Focus on education and building competence
- Reference specific metrics, ratios, and industry standards when relevant

Always prioritize helping the investor make informed, profitable decisions while managing risk appropriately.`;

  if (hasAttachments) {
    return `${basePrompt}

IMPORTANT: The user has uploaded file attachments to this conversation. ${attachmentInfo || ''} 
When analyzing uploaded documents:
- Focus on the specific content of the uploaded files
- Extract and summarize all relevant property information
- Provide detailed analysis based on the document content
- If the file contains property data, analyze it thoroughly for investment potential`;
  }

  return basePrompt;
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseAdminClient();
    
    // Extract session token from cookies
    let userId = '00000000-0000-0000-0000-000000000000';
    
    // Look for Supabase auth token with project ID
    const allCookies = cookieStore.getAll();
    const sessionCookie = allCookies.find(cookie => 
      cookie.name.includes('auth-token') && 
      !cookie.name.includes('code-verifier')
    );
    
    if (sessionCookie?.value) {
      try {
        // Parse the base64-encoded cookie value
        let tokenValue = sessionCookie.value;
        if (tokenValue.startsWith('base64-')) {
          tokenValue = Buffer.from(tokenValue.substring(7), 'base64').toString('utf-8');
        }
        
        // Parse the JSON token to get the access_token
        const tokenData = JSON.parse(tokenValue);
        const accessToken = tokenData.access_token;
        
        if (accessToken) {
          // Verify the session token with admin client
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          if (user && !error) {
            userId = user.id;
          }
        }
      } catch (error) {
        console.error('Session verification error:', error);
        // Continue with dummy user for now
      }
    }

    const body = await request.json();
    const { messages, threadId, attachments } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response("Messages array required", { status: 400 });
    }

    // Process attachments
    const validAttachments = (attachments || []).filter((att: any) => {
      const fileId = att.fileId || att.content?.[0]?.file_id;
      return fileId && fileId !== "PLACEHOLDER" && fileId.startsWith("file-");
    });


    // Get or create thread
    let currentThreadId = threadId;
    let existingMessages: any[] = [];
    
    if (currentThreadId) {
      // Load existing messages for this thread
      const { data: threadMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('thread_id', currentThreadId)
        .order('created_at', { ascending: true });
      
      if (!messagesError && threadMessages) {
        existingMessages = threadMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
    }
    
    if (!currentThreadId) {
      // Create new thread
      const firstUserMessage = messages.find(m => m.role === 'user');
      let title = 'New Conversation';
      
      if (firstUserMessage?.content) {
        // Handle different content formats from AI SDK
        if (typeof firstUserMessage.content === 'string') {
          title = firstUserMessage.content;
        } else if (Array.isArray(firstUserMessage.content)) {
          // Extract text from content array (AI SDK format)
          const textContent = firstUserMessage.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join(' ');
          title = textContent || 'New Conversation';
        }
        
        // Truncate if too long
        if (title.length > 50) {
          title = title.substring(0, 50) + '...';
        }
      }

      const { data: newThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: userId,
          title,
        })
        .select()
        .single();

      if (threadError) {
        console.error('Error creating thread:', threadError);
        // If it's a foreign key constraint error, continue without persistence for now
        if (threadError.message?.includes('foreign key')) {
            currentThreadId = 'temp-thread-' + Date.now();
        } else {
          return new Response("Failed to create thread", { status: 500 });
        }
      }

      if (newThread?.id) {
        currentThreadId = newThread.id;
      }
    }

    // Save user message to database
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user' && currentThreadId && !currentThreadId.startsWith('temp-')) {
      try {
        await supabase.from('chat_messages').insert({
          thread_id: currentThreadId,
          user_id: userId,
          role: 'user',
          content: lastMessage.content,
        });
      } catch (error) {
        console.error('Error saving user message:', error);
        // Continue without persistence
      }
    }

    // Process and enhance messages with attachment information
    let processedMessages = [...messages];
    if (validAttachments.length > 0) {
      const lastMessage = processedMessages[processedMessages.length - 1];
      if (lastMessage?.role === 'user') {
        const attachmentInfo = validAttachments.map((att: any) => 
          `[ATTACHED FILE: ${att.name || 'Unknown'} (ID: ${att.fileId || att.content?.[0]?.file_id})]`
        ).join('\n');
        
        lastMessage.content = `${attachmentInfo}\n\n${lastMessage.content}`;
      }
    }

    // Convert to core messages and combine with existing messages
    const coreMessages = convertToCoreMessages(processedMessages);
    const allMessages = [
      ...existingMessages, // Include previous messages from the thread
      ...coreMessages     // Include current message from the client
    ];
    
    // Create system prompt with attachment context
    const hasAttachments = validAttachments.length > 0;
    const attachmentInfo = hasAttachments ? 
      `You have access to ${validAttachments.length} uploaded file(s): ${validAttachments.map((att: any) => att.name || 'Unknown').join(', ')}.` : 
      undefined;
    
    const messagesWithSystem = [
      { role: 'system' as const, content: getSystemPrompt(hasAttachments, attachmentInfo) },
      ...allMessages
    ];

    // Stream response from OpenAI
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: messagesWithSystem,
      temperature: 0.7,
      maxTokens: 2000,
      onFinish: async (finishResult) => {
        // Save assistant response to database
        if (currentThreadId && !currentThreadId.startsWith('temp-')) {
          try {
            await supabase.from('chat_messages').insert({
              thread_id: currentThreadId,
              user_id: userId,
              role: 'assistant',
              content: finishResult.text,
            });
          } catch (error) {
            console.error('Error saving assistant message:', error);
          }
        }
      },
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response("Internal server error", { status: 500 });
  }
}

// GET endpoint to retrieve threads and messages
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseAdminClient();
    
    // Extract session token from cookies
    let userId = '00000000-0000-0000-0000-000000000000';
    
    // Look for Supabase auth token with project ID
    const allCookies = cookieStore.getAll();
    const sessionCookie = allCookies.find(cookie => 
      cookie.name.includes('auth-token') && 
      !cookie.name.includes('code-verifier')
    );
    
    if (sessionCookie?.value) {
      try {
        // Parse the base64-encoded cookie value
        let tokenValue = sessionCookie.value;
        if (tokenValue.startsWith('base64-')) {
          tokenValue = Buffer.from(tokenValue.substring(7), 'base64').toString('utf-8');
        }
        
        // Parse the JSON token to get the access_token
        const tokenData = JSON.parse(tokenValue);
        const accessToken = tokenData.access_token;
        
        if (accessToken) {
          // Verify the session token with admin client
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          if (user && !error) {
            userId = user.id;
          }
        }
      } catch (error) {
        console.error('Session verification error:', error);
        // Continue with dummy user for now
      }
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (threadId) {
      // Get messages for specific thread
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return new Response("Failed to fetch messages", { status: 500 });
      }

      return Response.json({ messages });
    } else {
      // Get all threads for user
      const { data: threads, error } = await supabase
        .from('chat_threads')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching threads:', error);
        return new Response("Failed to fetch threads", { status: 500 });
      }

      return Response.json({ threads });
    }

  } catch (error) {
    console.error('Chat GET API error:', error);
    return new Response("Internal server error", { status: 500 });
  }
}

// DELETE endpoint to remove threads
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseAdminClient();
    
    // Extract session token from cookies
    let userId = '00000000-0000-0000-0000-000000000000';
    
    // Look for Supabase auth token with project ID
    const allCookies = cookieStore.getAll();
    const sessionCookie = allCookies.find(cookie => 
      cookie.name.includes('auth-token') && 
      !cookie.name.includes('code-verifier')
    );
    
    if (sessionCookie?.value) {
      try {
        // Parse the base64-encoded cookie value
        let tokenValue = sessionCookie.value;
        if (tokenValue.startsWith('base64-')) {
          tokenValue = Buffer.from(tokenValue.substring(7), 'base64').toString('utf-8');
        }
        
        // Parse the JSON token to get the access_token
        const tokenData = JSON.parse(tokenValue);
        const accessToken = tokenData.access_token;
        
        if (accessToken) {
          // Verify the session token with admin client
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          if (user && !error) {
            userId = user.id;
          }
        }
      } catch (error) {
        console.error('Session verification error:', error);
        // Continue with dummy user for now
      }
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return new Response("Thread ID required", { status: 400 });
    }

    // Delete all messages in the thread first
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', userId);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
      return new Response("Failed to delete thread messages", { status: 500 });
    }

    // Delete the thread
    const { error: threadError } = await supabase
      .from('chat_threads')
      .delete()
      .eq('id', threadId)
      .eq('user_id', userId);

    if (threadError) {
      console.error('Error deleting thread:', threadError);
      return new Response("Failed to delete thread", { status: 500 });
    }

    return new Response("Thread deleted successfully", { status: 200 });

  } catch (error) {
    console.error('Chat DELETE API error:', error);
    return new Response("Internal server error", { status: 500 });
  }
}