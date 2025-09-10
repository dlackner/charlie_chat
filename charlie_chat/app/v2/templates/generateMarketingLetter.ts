/*
 * CHARLIE2 V2 - Marketing Letter Generator
 * Generates personalized marketing letters for property owners
 * Supports printing, email generation, and CSV export functionality
 */

import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface Property {
  address_full: string;
  address_state?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  property_id?: string;
}

interface SenderInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  business?: string;
  title?: string;
  logoBase64?: string | null;
}

interface MarketingLetterResult {
  success: boolean;
  message?: string;
  emailBody?: string;
  csvData?: string;
}

export async function generateMarketingLetter(
  property: Property, 
  senderInfo: SenderInfo,
  outputType: 'print' | 'email' | 'csv' = 'print'
): Promise<MarketingLetterResult> {
  try {
    // Validate required sender information
    if (!senderInfo.name || !senderInfo.phone || !senderInfo.email) {
      return {
        success: false,
        message: 'Please complete your profile with name, phone, and email to generate marketing letters.'
      };
    }

    // Validate property information
    if (!property.address_full) {
      return {
        success: false,
        message: 'Property address is required to generate marketing letters.'
      };
    }

    // Determine owner name
    const ownerName = property.owner_first_name && property.owner_last_name
      ? `${property.owner_first_name} ${property.owner_last_name}`
      : 'Property Owner';

    // Create marketing letter content
    const subject = `Inquiry About Your Property - ${property.address_full}`;
    
    const letterBody = `Dear ${ownerName},

I hope this note finds you well. I'm reaching out to express sincere interest in your property located at ${property.address_full}. I focus on acquiring multifamily properties in ${property.address_state || 'the area'}, and this building stood out due to its location, character, and the strength of the local rental market.

Whether or not you've ever considered selling, I understand that owning and managing multifamily assets can be demanding – especially in today's environment. Rising operating costs, shifting tenant expectations, and market volatility have prompted many property owners to explore their options.

I'm not a broker, and this isn't a listing solicitation. I'm a direct buyer looking to engage in a straightforward, respectful conversation about a potential off-market purchase. My goal is to understand your situation and see if there's a way to align my interest with your goal – on your timeline.

In past acquisitions, we've structured deals with flexible terms including delayed closings, continued property management, partial seller financing, and even 1031 exchange participation for owners looking to defer capital gains taxes. Depending on your goals, there may be creative options available that help maximize value while minimizing tax exposure.

If you'd simply like to know what your property might be worth in today's market, I'd be happy to offer an informal valuation – no pressure, no obligation.

You can reach me directly at ${senderInfo.phone} or ${senderInfo.email}. Even if now isn't the right time, I'd welcome the opportunity to stay in touch.

Thank you,

${senderInfo.name}
${senderInfo.title || ''}
${senderInfo.business || ''}
${senderInfo.phone}
${senderInfo.email}`;

    // Handle different output types
    switch (outputType) {
      case 'print':
        await generatePrintableDocument(letterBody, property, senderInfo);
        break;
      
      case 'email':
        return {
          success: true,
          message: 'Email content generated',
          emailBody: letterBody
        };
      
      case 'csv':
        const csvContent = generateCSVData(property, senderInfo, letterBody);
        return {
          success: true,
          message: 'CSV data generated',
          csvData: csvContent
        };
    }

    return {
      success: true,
      message: 'Marketing letter generated successfully'
    };

  } catch (error) {
    console.error('Error generating marketing letter:', error);
    return {
      success: false,
      message: 'Failed to generate marketing letter. Please try again.'
    };
  }
}

async function generatePrintableDocument(
  letterBody: string, 
  property: Property, 
  senderInfo: SenderInfo
): Promise<void> {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header with sender info
          new Paragraph({
            children: [
              new TextRun({
                text: senderInfo.name,
                bold: true,
                size: 24
              })
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 120 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `${senderInfo.address}\n${senderInfo.city}, ${senderInfo.state} ${senderInfo.zip}\n${senderInfo.phone}\n${senderInfo.email}`,
                size: 22
              })
            ],
            spacing: { after: 240 }
          }),

          // Date
          new Paragraph({
            children: [
              new TextRun({
                text: new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                size: 22
              })
            ],
            spacing: { after: 240 }
          }),

          // Letter content
          ...letterBody.split('\n\n').map(paragraph => 
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraph,
                  size: 22
                })
              ],
              spacing: { after: 120 }
            })
          )
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Marketing_Letter_${property.address_full?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
    saveAs(blob, fileName);
    
    console.log('Marketing letter document generated:', fileName);
  } catch (error) {
    console.error('Error generating printable document:', error);
    throw error;
  }
}

function generateCSVData(property: Property, senderInfo: SenderInfo, letterBody: string): string {
  const csvRows = [
    'Property Address,Owner Name,Sender Name,Sender Phone,Sender Email,Letter Content,Generated Date',
    `"${property.address_full}","${property.owner_first_name || ''} ${property.owner_last_name || ''}","${senderInfo.name}","${senderInfo.phone}","${senderInfo.email}","${letterBody.replace(/"/g, '""')}","${new Date().toISOString()}"`
  ];
  
  return csvRows.join('\n');
}

// Helper function to create mailto links for email client integration
export function createMailtoLink(property: Property, senderInfo: SenderInfo, letterBody: string): string {
  const subject = `Inquiry About Your Property - ${property.address_full}`;
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(letterBody);
  
  // This would need the recipient email from property owner data
  const recipientEmail = 'owner@example.com'; // This should come from property data
  
  return `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
}