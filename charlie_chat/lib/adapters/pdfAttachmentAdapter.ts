import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const PdfAttachmentAdapter = {
  async upload(file: File) {
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are supported.');
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `attachments/${uuidv4()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    const { publicUrl } = supabase.storage.from('attachments').getPublicUrl(filePath).data;

    return {
      name: file.name,
      url: publicUrl,
      type: file.type,
    };
  },

  async parse(attachment: { url: string }) {
    // Placeholder: You could send the URL to an embedding/processing API or return text
    return `[PDF uploaded: ${attachment.url}]`;
  },
};
