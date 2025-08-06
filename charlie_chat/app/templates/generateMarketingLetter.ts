/* ----------------------------------------------------------------------
 *  generateMarketingLetter.ts
 *  — Builds and downloads a personalized marketing letter (.docx)
 * ------------------------------------------------------------------- */

import { Document, Packer, Paragraph, TextRun, ISpacingProperties, LineRuleType, ImageRun, AlignmentType, HorizontalPositionAlign, VerticalPositionAlign } from 'docx';
import { saveAs } from 'file-saver';
import type { Listing } from '../../components/ui/listingTypes';

interface SenderInfo {
  name: string;
  address: string;
  cityStateZip: string;
  phone: string;
  email: string;
  businessName?: string | null;
  jobTitle?: string | null;
  logoBase64?: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  message: string;
}

// Helper function to validate profile completeness
export function validateSenderProfile(senderInfo: SenderInfo): ValidationResult {
  const missingFields: string[] = [];

  if (!senderInfo.name?.trim()) missingFields.push("name");
  if (!senderInfo.address?.trim()) missingFields.push("address");
  if (!senderInfo.cityStateZip?.trim()) missingFields.push("city/state/zip");
  if (!senderInfo.phone?.trim()) missingFields.push("phone number");
  if (!senderInfo.email?.trim()) missingFields.push("email");

  const isValid = missingFields.length === 0;
  
  let message = '';
  if (!isValid) {
    message = `Hi there! Please complete your profile in the Account tab so that your outreach is personalized. I want you to make a great first impression!`;
  }

  return { isValid, missingFields, message };
}

export async function generateMarketingLetter(
  listing: Listing,
  senderInfo: SenderInfo
): Promise<{ success: boolean; message?: string }> {

  // 🛑 Validate profile completeness
  const validation = validateSenderProfile(senderInfo);
  
  if (!validation.isValid) {
    console.warn('Profile validation failed:', validation.message);
    
    // Return failure result - let the calling component handle UI
    return {
      success: false,
      message: validation.message
    };
  }

  try {
    /* ────────────────────────────────────────────────────────────────
     *  1️⃣  Owner name & salutation
     * ──────────────────────────────────────────────────────────────── */
    const rawOwnerFirstName =
      (listing.owner_first_name ?? '').trim();
    const rawOwnerLastName =
      (listing.owner_last_name ?? '').trim();

    let displayOwnerFullName: string | null = null;
    let salutationName = 'Property Owner';

    if (rawOwnerFirstName && rawOwnerLastName) {
      displayOwnerFullName = `${rawOwnerFirstName} ${rawOwnerLastName}`;
      salutationName = rawOwnerFirstName;
    } else if (rawOwnerFirstName) {
      displayOwnerFullName = rawOwnerFirstName;
      salutationName = rawOwnerFirstName;
    } else if (rawOwnerLastName) {
      displayOwnerFullName = rawOwnerLastName;
    }

    /* ────────────────────────────────────────────────────────────────
     *  2️⃣  Build owner mailing-address lines
     * ──────────────────────────────────────────────────────────────── */
    let finalOwnerMailStreet = '';
    let finalOwnerMailCityStateZip = '';

    const street =
      listing.mail_address?.street  ?? '';
    const city   =
      listing.mail_address?.city    ?? '';
    const state  =
      listing.mail_address?.state   ?? '';
    const zip    =
      listing.mail_address?.zip     ?? '';

    finalOwnerMailStreet = street.trim();

    const parts: string[] = [];
    if (city)  parts.push(city);
    if (state) parts.push(state);
    if (zip)   parts.push(zip);

    if (parts.length === 1) {
      finalOwnerMailCityStateZip = parts[0];
    } else if (parts.length >= 2) {
      finalOwnerMailCityStateZip = `${city}${state ? ', ' + state : ''}${zip ? ' ' + zip : ''}`;
    }

    if (!finalOwnerMailStreet && listing.mail_address_full) {
      const [first, ...rest] = listing.mail_address_full.split(',');
      finalOwnerMailStreet = first?.trim() || '';
      if (!finalOwnerMailCityStateZip && rest.length) {
        finalOwnerMailCityStateZip = rest.join(',').trim();
      }
    }

    if (!finalOwnerMailStreet && !finalOwnerMailCityStateZip && !displayOwnerFullName) {
      finalOwnerMailStreet       = '[Owner Address Line 1]';
      finalOwnerMailCityStateZip = '[Owner Address Line 2]';
    } else {
      if (!finalOwnerMailStreet)       finalOwnerMailStreet       = '[Mail Address: Street]';
      if (!finalOwnerMailCityStateZip) finalOwnerMailCityStateZip = '[Mail Address: City, State, Zip]';
    }

    /* ────────────────────────────────────────────────────────────────
     *  3️⃣  Property address pieces for body text
     * ──────────────────────────────────────────────────────────────── */
    const propertyStreet = listing.address?.address
      ?? listing.address_full
      ?? '[Property Street]';

    const propertyCity = listing.address?.city
      ?? listing.address_city
      ?? '[Property City]';

    const acquisitionFocusState = listing.address?.state
      ?? listing.address_state
      ?? "[Property's State]";

    /* ────────────────────────────────────────────────────────────────
     *  4️⃣  Helper to make styled paragraphs
     * ──────────────────────────────────────────────────────────────── */
    const createStyledParagraph = (
      text?: string,
      {
        bold = false,
        spaceAfterPt = 2,
        lineRule = LineRuleType.AUTO,
        lines = 240,
        children,
        alignment,
      }: {
        bold?: boolean;
        spaceAfterPt?: number;
        lineRule?: 'auto' | 'exact' | 'atLeast';
        lines?: number;
        children?: TextRun[];
        alignment?: 'left' | 'center' | 'right' | 'justify';
      } = {}
    ): Paragraph => {
      const spacing: ISpacingProperties = {
        after: spaceAfterPt * 20,
        line: lines,
        lineRule,
      };

      // Convert string alignment to AlignmentType enum
      let docxAlignment;
      switch (alignment) {
        case 'center':
          docxAlignment = AlignmentType.CENTER;
          break;
        case 'right':
          docxAlignment = AlignmentType.RIGHT;
          break;
        case 'justify':
          docxAlignment = AlignmentType.JUSTIFIED;
          break;
        case 'left':
        default:
          docxAlignment = AlignmentType.LEFT;
          break;
      }

      return new Paragraph({
        spacing,
        alignment: docxAlignment,
        children: children || (text !== undefined ? [new TextRun({ text, bold })] : []),
      });
    };

    /* ────────────────────────────────────────────────────────────────
     *  5️⃣  Helper to detect image type and convert base64 to buffer
     * ──────────────────────────────────────────────────────────────── */
    const detectImageType = (base64: string): string => {
      if (base64.includes('data:image/png') || base64.includes('PNG')) return 'png';
      if (base64.includes('data:image/jpeg') || base64.includes('data:image/jpg') || base64.includes('JPEG') || base64.includes('JPG')) return 'jpg';
      if (base64.includes('data:image/gif') || base64.includes('GIF')) return 'gif';
      // Default fallback - most logos are PNG
      return 'png';
    };

    const base64ToBuffer = (base64: string): Buffer => {
      // Remove data URL prefix if present (e.g., "data:image/png;base64,")
      const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    };

    /* ────────────────────────────────────────────────────────────────
     *  6️⃣  Compose the letter
     * ──────────────────────────────────────────────────────────────── */
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const letter: Paragraph[] = [];

    // — Logo (if present) —
    if (senderInfo.logoBase64) {
      try {
        const logoBuffer = base64ToBuffer(senderInfo.logoBase64);
        const imageType = detectImageType(senderInfo.logoBase64);
        
        const logoParagraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 }, // Space after logo
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: {
                width: 200, // Back to original working width
                height: 60, // Let it auto scale height
              },
              // Keep the image type detection that was working
              type: imageType as any,
              floating: {
                horizontalPosition: {
                  align: HorizontalPositionAlign.CENTER,
                },
                verticalPosition: {
                  align: VerticalPositionAlign.TOP,
                },
                margins: {
                  top: 0,
                  bottom: 240, // Space below logo
                },
              },
            }),
          ],
        });
        letter.push(logoParagraph);
      } catch (error) {
        console.error('Error processing logo:', error);
        // Continue without logo if there's an error
      }
    }

    // — Sender block —
    letter.push(createStyledParagraph(senderInfo.name));
    if (senderInfo.businessName) letter.push(createStyledParagraph(senderInfo.businessName));
    letter.push(createStyledParagraph(senderInfo.address));
    letter.push(createStyledParagraph(senderInfo.cityStateZip));
    letter.push(createStyledParagraph(senderInfo.phone));
    letter.push(createStyledParagraph(senderInfo.email, { spaceAfterPt: 12 }));
    letter.push(createStyledParagraph(today, { spaceAfterPt: 6 }));

    // — Recipient block —
    if (displayOwnerFullName) letter.push(createStyledParagraph(displayOwnerFullName));
    if (finalOwnerMailStreet && finalOwnerMailStreet !== '[Mail Address: Street]') {
      const spaceAfter = finalOwnerMailCityStateZip ? 2 : 6;
      letter.push(createStyledParagraph(finalOwnerMailStreet, { spaceAfterPt: spaceAfter }));
    }
    if (finalOwnerMailCityStateZip && finalOwnerMailCityStateZip !== '[Mail Address: City, State, Zip]') {
      letter.push(createStyledParagraph(finalOwnerMailCityStateZip, { spaceAfterPt: 6 }));
    }
    if (!displayOwnerFullName && !finalOwnerMailStreet && !finalOwnerMailCityStateZip) {
      letter.push(createStyledParagraph('[Property Owner Address Block]', { spaceAfterPt: 6 }));
    }

    // — Body —
    letter.push(createStyledParagraph(`Dear ${salutationName},`, { spaceAfterPt: 6 }));
    letter.push(
      createStyledParagraph(
        `I hope this note finds you well. I'm reaching out to express sincere interest in your property located at ${propertyStreet}${propertyCity ? `, ${propertyCity}` : ''}. I focus on acquiring multifamily properties in ${acquisitionFocusState}, and this building stood out due to its location, character, and the strength of the local rental market.`,
        { spaceAfterPt: 10 }
      )
    );
    letter.push(
      createStyledParagraph(
        `Whether or not you've ever considered selling, I understand that owning and managing multifamily assets can be demanding – especially in today's environment. Rising operating costs, shifting tenant expectations, and market volatility have prompted many property owners to explore their options.`,
        { spaceAfterPt: 10 }
      )
    );
    letter.push(
      createStyledParagraph(
        `I'm not a broker, and this isn't a listing solicitation. I'm a direct buyer looking to engage in a straightforward, respectful conversation about a potential off-market purchase. My goal is to understand your situation and see if there's a way to align my interest with your goal – on your timeline.`,
        { spaceAfterPt: 10 }
      )
    );
    letter.push(
      createStyledParagraph(
        `In past acquisitions, we've structured deals with flexible terms including delayed closings, continued property management, partial seller financing, and even 1031 exchange participation for owners looking to defer capital gains taxes. Depending on your goals, there may be creative options available that help maximize value while minimizing tax exposure.`,
        { spaceAfterPt: 10 }
      )
    );
    letter.push(
      createStyledParagraph(
        `If you'd simply like to know what your property might be worth in today's market, I'd be happy to offer an informal valuation – no pressure, no obligation.`,
        { spaceAfterPt: 10 }
      )
    );
    letter.push(
      createStyledParagraph(
        `You can reach me directly at ${senderInfo.phone} or ${senderInfo.email}. Even if now isn't the right time, I'd welcome the opportunity to stay in touch.`,
        { spaceAfterPt: 10 }
      )
    );
    letter.push(
      createStyledParagraph(
        `Wishing you all the best and appreciation for your time.`,
        { spaceAfterPt: 10 }
      )
    );
    letter.push(createStyledParagraph('Best regards,', { spaceAfterPt: 2 }));
    letter.push(new Paragraph({ spacing: { after: 240 } }));

    // — Signature —
    letter.push(createStyledParagraph(senderInfo.name));
    if (senderInfo.jobTitle) letter.push(createStyledParagraph(senderInfo.jobTitle));
    if (senderInfo.businessName) letter.push(createStyledParagraph(senderInfo.businessName));

    /* ────────────────────────────────────────────────────────────────
     *  7️⃣  Generate & download
     * ──────────────────────────────────────────────────────────────── */
    const doc = new Document({ sections: [{ children: letter }] });

    const safeFilename = (propertyStreet || 'property')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 60);

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Marketing_Letter_${safeFilename}.docx`);

    // Show success toast
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success('Marketing letter generated successfully!');
    }

    return {
      success: true,
      message: 'Marketing letter generated successfully!'
    };

  } catch (error) {
    console.error('Error generating marketing letter:', error);
    
    const errorMessage = 'An error occurred while generating the marketing letter. Please try again.';
    
    // Show error toast
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.error(errorMessage);
    } else {
      alert(errorMessage);
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
}