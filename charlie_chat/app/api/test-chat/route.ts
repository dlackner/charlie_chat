import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 Real OpenAI API received:', JSON.stringify(body, null, 2));

    const { messages } = body;
    const lastMessage = messages[messages.length - 1];
    
    // Extract text content and handle PDFs differently
    let textContent = '';
    let hasPDF = false;
    
    if (lastMessage?.content && Array.isArray(lastMessage.content)) {
      for (const item of lastMessage.content) {
        if (item.type === 'text') {
          textContent += item.text;
        } else if (item.type === 'image' && item.image) {
          if (item.image.startsWith('data:application/pdf')) {
            hasPDF = true;
            // For PDFs, we'll mention it in the text since Assistants API doesn't directly accept PDF base64
            textContent += '\n\n[Note: User has attached a PDF document for analysis]';
          }
          // For actual images, we could handle them separately if needed
        }
      }
    } else if (typeof lastMessage?.content === 'string') {
      textContent = lastMessage.content;
    }

    // If there's a PDF, we need to inform the assistant about it
    if (hasPDF) {
      textContent += '\n\nPlease note: The user has uploaded a PDF document. Since I cannot directly process the PDF content in this format, please let them know that for PDF analysis, they should either:\n1. Extract the text from the PDF and paste it\n2. Use the main chat interface which may have better PDF processing capabilities\n3. Describe what specific information they want from the PDF';
    }

    // Create a thread and add the message
    const thread = await openai.beta.threads.create();
    
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: textContent
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID!,
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0];
      
      if (response.content[0].type === 'text') {
        const responseText = response.content[0].text.value;
        
        // Return streaming format that matches your main chat exactly - single chunk
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Send the complete response as one chunk
            const chunk = {
              data: {
                delta: {
                  content: [{
                    type: "text",
                    text: {
                      value: responseText
                    }
                  }]
                }
              }
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
    } else {
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process with OpenAI Assistant',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}