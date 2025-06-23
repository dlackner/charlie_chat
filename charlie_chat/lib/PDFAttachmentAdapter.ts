import { AttachmentAdapter, PendingAttachment, CompleteAttachment } from "@assistant-ui/react";

// Don't import PDF.js statically - it breaks SSR
let pdfjsLib: any = null;

export class PDFAttachmentAdapter implements AttachmentAdapter {
  accept = "application/pdf";

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    console.log("🔍 PDFAttachmentAdapter.add() called with file:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error("PDF processing only available in browser");
    }

    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSize) {
      throw new Error(`PDF size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit`);
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error("File must be a PDF document");
    }

    return {
      id: crypto.randomUUID(),
      type: "document" as const,
      name: file.name,
      file,
      status: { type: "running" as const },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    console.log("🔍 PDFAttachmentAdapter.send() called for:", {
      id: attachment.id,
      name: attachment.name,
      fileSize: attachment.file.size
    });
    
    try {
      // Load PDF.js dynamically only when needed
      if (!pdfjsLib) {
        console.log("📚 Loading PDF.js dynamically...");
        pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
        console.log("✅ PDF.js loaded successfully");
      }

      console.log("📄 Starting PDF text extraction...");
      const extractedText = await this.extractTextFromPDF(attachment.file);
      
      console.log("✅ PDF text extraction complete:", {
        textLength: extractedText.length,
        firstChars: extractedText.substring(0, 100),
        wordCount: extractedText.split(/\s+/).length
      });
      
      if (!extractedText.trim()) {
        throw new Error("Could not extract text from PDF");
      }

      const content = `[PDF Document: ${attachment.name}]

File Information:
- Name: ${attachment.name}
- Size: ${(attachment.file.size / 1024).toFixed(2)} KB
- Text Extraction: Successful

Extracted Content:
${extractedText}`;

      return {
        id: attachment.id,
        type: "document" as const,
        name: attachment.name,
        content: [{ type: "text" as const, text: content }],
        status: { type: "complete" as const },
      };

    } catch (error) {
      console.warn("⚠️ PDF text extraction failed:", error.message);
      
      // Your existing fallback code...
      return {
        id: attachment.id,
        type: "document" as const,
        name: attachment.name,
        content: [{ 
          type: "text" as const, 
          text: `[PDF Document: ${attachment.name}] - Processing failed: ${error.message}` 
        }],
        status: { type: "complete" as const },
      };
    }
  }

  async remove(attachment: PendingAttachment): Promise<void> {
    console.log("🗑️ Removing attachment:", attachment.id);
  }

  private async extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
    
    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
    }
    
    return fullText.trim();
  }
}