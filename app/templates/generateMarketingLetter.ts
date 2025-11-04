/*
 * CHARLIE2 V2 - Marketing Letter Generator
 * Generates personalized marketing letters for property owners
 * Supports printing, email generation, and CSV export functionality
 */

import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun } from 'docx';
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

    // Determine salutation based on owner name fields
    const salutation = property.owner_first_name && property.owner_last_name
      ? property.owner_first_name  // Use first name for personal greeting
      : 'Property Owner';  // Use formal greeting when only last name or no name
    
    // Full owner name for address section
    const ownerName = (property.owner_first_name || property.owner_last_name)
      ? `${property.owner_first_name || ''} ${property.owner_last_name || ''}`.trim()
      : 'Property Owner';

    // Create marketing letter content
    const subject = `Inquiry About Your Property - ${property.address_full}`;
    
    // Format phone number for readability
    const formatPhoneNumber = (phone: string) => {
      const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
      if (cleaned.length === 10) {
        return `${cleaned.slice(0,3)}.${cleaned.slice(3,6)}.${cleaned.slice(6,10)}`;
      }
      return phone; // Return original if not 10 digits
    };

    const formattedPhone = formatPhoneNumber(senderInfo.phone);

    const letterBody = `Dear ${salutation},

I hope this note finds you well. I'm reaching out to express sincere interest in your property located at ${property.address_full}. I focus on acquiring multifamily properties in ${property.address_state || 'the area'}, and this building stood out due to its location, character, and the strength of the local rental market.

Whether or not you've ever considered selling, I understand that owning and managing multifamily assets can be demanding – especially in today's environment. Rising operating costs, shifting tenant expectations, and market volatility have prompted many property owners to explore their options.

I'm not a broker, and this isn't a listing solicitation. I'm a direct buyer looking to engage in a straightforward, respectful conversation about a potential off-market purchase. My goal is to understand your situation and see if there's a way to align my interest with your goal – on your timeline.

In past acquisitions, we've structured deals with flexible terms including delayed closings, continued property management, partial seller financing, and even 1031 exchange participation for owners looking to defer capital gains taxes. Depending on your goals, there may be creative options available that help maximize value while minimizing tax exposure.

If you'd simply like to know what your property might be worth in today's market, I'd be happy to offer an informal valuation – no pressure, no obligation.

You can reach me directly at ${formattedPhone} or ${senderInfo.email}. Even if now isn't the right time, I'd welcome the opportunity to stay in touch.`;

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
    const children = [];

    // Format phone number for readability
    const formatPhoneNumber = (phone: string) => {
      const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
      if (cleaned.length === 10) {
        return `${cleaned.slice(0,3)}.${cleaned.slice(3,6)}.${cleaned.slice(6,10)}`;
      }
      return phone; // Return original if not 10 digits
    };

    const formattedPhone = formatPhoneNumber(senderInfo.phone);

    // Logo (if provided) - centered at top
    if (senderInfo.logoBase64) {
      try {
        const logoData = senderInfo.logoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const logoBuffer = Buffer.from(logoData, 'base64');
        
        children.push(new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: {
                width: 180,
                height: 60
              },
              type: 'png'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }));
      } catch (error) {
        console.log('Logo processing failed:', error);
        children.push(new Paragraph({
          children: [],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }));
      }
    }

    // Sender header with business info
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: senderInfo.name,
            size: 22
          })
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: 100 }
      })
    );

    if (senderInfo.business) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: senderInfo.business,
              size: 22
            })
          ],
          spacing: { after: 100 }
        })
      );
    }

    if (senderInfo.title) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: senderInfo.title,
              size: 22
            })
          ],
          spacing: { after: 200 }
        })
      );
    }

    // Sender contact info - each line separately
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: senderInfo.address,
            size: 22
          })
        ],
        spacing: { after: 80 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${senderInfo.city}, ${senderInfo.state} ${senderInfo.zip}`,
            size: 22
          })
        ],
        spacing: { after: 80 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: formattedPhone,
            size: 22
          })
        ],
        spacing: { after: 80 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: senderInfo.email,
            size: 22
          })
        ],
        spacing: { after: 400 }
      })
    );

    // Date
    children.push(
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
        spacing: { after: 400 }
      })
    );

    // Recipient address (Property Owner)
    const ownerName = (property.owner_first_name || property.owner_last_name)
      ? `${property.owner_first_name || ''} ${property.owner_last_name || ''}`.trim()
      : 'Property Owner';

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: ownerName,
            size: 22
          })
        ],
        spacing: { after: 100 }
      })
    );

    // Property address
    const propertyAddressParts = property.address_full.split(', ');
    const streetAddress = propertyAddressParts[0] || property.address_full;
    const cityStateZip = propertyAddressParts.length > 1 
      ? propertyAddressParts.slice(1).join(', ')
      : (property.address_state ? `City, ${property.address_state}` : '');

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: streetAddress,
            size: 22
          })
        ],
        spacing: { after: 80 }
      })
    );

    if (cityStateZip) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cityStateZip,
              size: 22
            })
          ],
          spacing: { after: 400 }
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [],
          spacing: { after: 400 }
        })
      );
    }

    // Letter content - exclude signature section
    const paragraphs = letterBody.split('\n\n');
    const bodyParagraphs = paragraphs.filter(p => !p.trim().startsWith('Thank you,'));
    
    bodyParagraphs.forEach((paragraph) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: paragraph,
              size: 22
            })
          ],
          spacing: { after: 240 }
        })
      );
    });

    // Add signature section manually with proper paragraph breaks
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Thank you,',
            size: 22
          })
        ],
        spacing: { after: 240 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: senderInfo.name,
            size: 22
          })
        ],
        spacing: { after: 100 }
      })
    );

    if (senderInfo.title) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: senderInfo.title,
              size: 22
            })
          ],
          spacing: { after: 100 }
        })
      );
    }

    if (senderInfo.business) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: senderInfo.business,
              size: 22
            })
          ],
          spacing: { after: 200 }
        })
      );
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1152,    // 0.8 inch
              right: 1152,  // 0.8 inch  
              bottom: 1152, // 0.8 inch
              left: 1152    // 0.8 inch
            }
          }
        },
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Marketing_Letter_${property.address_full?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
    
    saveAs(blob, fileName);
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