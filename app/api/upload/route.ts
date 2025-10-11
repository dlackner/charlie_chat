/*
 * MFOS - File Upload API
 * Handles file uploads for AI Coach attachments
 * Uploads files to OpenAI for use with GPT-4o mini
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { cookies } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (same pattern as chat route)
    const cookieStore = await cookies();
    const supabase = createSupabaseAdminClient();
    
    let userId = '00000000-0000-0000-0000-000000000000';
    let user = null;
    
    const allCookies = cookieStore.getAll();
    const sessionCookie = allCookies.find(cookie => 
      cookie.name.includes('auth-token') && 
      !cookie.name.includes('code-verifier')
    );
    
    if (sessionCookie?.value) {
      try {
        let tokenValue = sessionCookie.value;
        if (tokenValue.startsWith('base64-')) {
          tokenValue = Buffer.from(tokenValue.substring(7), 'base64').toString('utf-8');
        }
        
        const tokenData = JSON.parse(tokenValue);
        const accessToken = tokenData.access_token;
        
        if (accessToken) {
          const { data: { user: authUser }, error } = await supabase.auth.getUser(accessToken);
          if (authUser && !error) {
            userId = authUser.id;
            user = authUser;
          }
        }
      } catch (error) {
        console.error('Error parsing session:', error);
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Check file type - GPT-4o mini supports images and documents
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Supported: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT' 
      }, { status: 400 });
    }

    console.log(`🔄 Uploading file: ${file.name} (${file.size} bytes) for user: ${userId}`);

    // Upload file to OpenAI
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: 'assistants',
    });

    console.log(`✅ File uploaded successfully. OpenAI File ID: ${uploadedFile.id}`);

    return NextResponse.json({
      id: crypto.randomUUID(), // Local attachment ID for UI
      fileId: uploadedFile.id, // OpenAI file ID for assistant
      name: file.name,
      size: file.size,
      type: file.type,
      contentType: file.type,
      status: { type: 'complete' }
    });

  } catch (error) {
    console.error('❌ File upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}