import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const submissionId = formData.get('submissionId') as string;
    const fileType = formData.get('fileType') as string; // 'cash_flow' or 'investment_analysis'

    if (!file || !submissionId || !fileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = new Date().getTime();
    const fileName = `${user.id}/${submissionId}/${fileType}_${timestamp}.pdf`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('submission-pdfs')
      .upload(fileName, file, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('submission-pdfs')
      .getPublicUrl(fileName);

    // Update submissions table with the URL
    const updateColumn = fileType === 'cash_flow' ? 'cash_flow_pdf_url' : 'investment_analysis_pdf_url';
    
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ [updateColumn]: publicUrl })
      .eq('id', submissionId)
      .eq('user_id', user.id); // Ensure user owns this submission

    if (updateError) {
      console.error('Database update error:', updateError);
      // Try to delete the uploaded file
      await supabase.storage.from('submission-pdfs').remove([fileName]);
      return NextResponse.json({ error: 'Failed to update submission record' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName: fileName
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}