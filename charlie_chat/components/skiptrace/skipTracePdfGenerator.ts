// skipTracePdfGenerator.ts - Skip Trace PDF Generation

import jsPDF from 'jspdf';
import type { ContactSummary, ContactOption } from './types';

export const generateSkipTracePdf = async (contactSummary: ContactSummary): Promise<void> => {
  try {
    const doc = new jsPDF({ orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 20;
    const rightMargin = 20;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    let currentY = 20;

    // Helper function to add text with automatic line wrapping
    const addText = (
      text: string, 
      x: number, 
      y: number, 
      options: {
        fontSize?: number;
        fontStyle?: 'normal' | 'bold';
        maxWidth?: number;
        align?: 'left' | 'center' | 'right';
      } = {}
    ): number => {
      const { fontSize = 11, fontStyle = 'normal', maxWidth = contentWidth, align = 'left' } = options;
      
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      
      const lines = doc.splitTextToSize(text, maxWidth);
      const lineHeight = fontSize * 0.35;
      
      lines.forEach((line: string, index: number) => {
        const lineY = y + (index * lineHeight);
        doc.text(line, x, lineY, { align } as any);
      });
      
      return y + (lines.length * lineHeight);
    };

    // Helper function to add a section header
    const addSectionHeader = (title: string, y: number): number => {
      // Orange background with rounded corners (approximate with multiple rectangles)
      doc.setFillColor(249, 115, 22); // Orange-500 color
      doc.roundedRect(leftMargin, y - 5, contentWidth, 12, 3, 3, 'F');
      
      // White text
      doc.setTextColor(255, 255, 255);
      const textY = addText(title, leftMargin + 5, y + 3, { fontSize: 12, fontStyle: 'bold' });
      
      // Reset text color to black for subsequent text
      doc.setTextColor(0, 0, 0);
      
      return textY + 8;
    };

    // Header
    doc.setTextColor(0, 0, 0); // Black text
    currentY = addText('CONTACT INFORMATION', pageWidth / 2, 15, { 
      fontSize: 24, 
      fontStyle: 'bold', 
      align: 'center' 
    }) + 10;
    
    doc.setTextColor(0, 0, 0);

    // Property and Owner Information
    currentY = addSectionHeader('PROPERTY & OWNER INFORMATION', currentY);
    currentY = addText(`Property: ${contactSummary.propertyAddress}`, leftMargin, currentY) + 5;
    currentY = addText(`Owner: ${contactSummary.ownerName}`, leftMargin, currentY) + 5;
    currentY = addText(`Search Date: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, leftMargin, currentY) + 10;

    // Search Results Status
    if (!contactSummary.searchSuccess) {
      currentY = addSectionHeader('SEARCH RESULTS', currentY);
      currentY = addText('No contact information found for this owner.', leftMargin, currentY, {
        fontStyle: 'bold'
      }) + 5;
      currentY = addText('This could mean the owner information is outdated, incomplete, or the person has limited public records.', leftMargin, currentY) + 15;
      
      // Save the PDF even with no results
      const safePropertyAddress = contactSummary.propertyAddress.replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`Contact_Report_${safePropertyAddress}.pdf`);
      return;
    }

    // Primary Contact Information
    currentY = addSectionHeader('PRIMARY CONTACT INFORMATION', currentY);
    
    if (contactSummary.primaryContact.address) {
      currentY = addText(`Current Address: ${contactSummary.primaryContact.address}`, leftMargin, currentY) + 5;
    }
    
    if (contactSummary.primaryContact.phone) {
      const phone = contactSummary.primaryContact.phone;
      let phoneText = `Phone: ${phone.displayValue || phone.value}`;
      if (phone.phoneType) phoneText += ` (${phone.phoneType})`;
      if (phone.isConnected === false) phoneText += ' - DISCONNECTED';
      if (phone.doNotCall) phoneText += ' - DO NOT CALL';
      
      currentY = addText(phoneText, leftMargin, currentY, {
        fontStyle: phone.isConnected === false ? 'normal' : 'bold'
      }) + 5;
    }
    
    if (contactSummary.primaryContact.email) {
      const email = contactSummary.primaryContact.email;
      currentY = addText(`Email: ${email.value}`, leftMargin, currentY, { fontStyle: 'bold' }) + 5;
    }

    currentY += 5;

    // Demographics
    if (contactSummary.demographics.age || contactSummary.demographics.occupation) {
      currentY = addSectionHeader('DEMOGRAPHICS', currentY);
      
      if (contactSummary.demographics.ageDisplay) {
        currentY = addText(`Age: ${contactSummary.demographics.ageDisplay}`, leftMargin, currentY) + 5;
      }
      
      if (contactSummary.demographics.gender) {
        currentY = addText(`Gender: ${contactSummary.demographics.gender}`, leftMargin, currentY) + 5;
      }
      
      if (contactSummary.demographics.occupation) {
        currentY = addText(`Occupation: ${contactSummary.demographics.occupation}`, leftMargin, currentY) + 5;
      }
      
      currentY += 5;
    }

    // Alternative Contact Information
    if (contactSummary.alternativeContacts.length > 0) {
      currentY = addSectionHeader('ALTERNATIVE CONTACT OPTIONS', currentY);
      
      const phones = contactSummary.alternativeContacts.filter(c => c.type === 'phone');
      const emails = contactSummary.alternativeContacts.filter(c => c.type === 'email');
      
      phones.forEach(phone => {
        let phoneText = `Phone: ${phone.displayValue || phone.value}`;
        if (phone.phoneType) phoneText += ` (${phone.phoneType})`;
        if (phone.isConnected === false) phoneText += ' - DISCONNECTED';
        if (phone.doNotCall) phoneText += ' - DO NOT CALL';
        
        currentY = addText(phoneText, leftMargin, currentY) + 4;
      });
      
      emails.forEach(email => {
        currentY = addText(`Email: ${email.value}`, leftMargin, currentY) + 4;
      });
      
      currentY += 5;
    }

    // Address History
    if (contactSummary.addressHistory.length > 0) {
      currentY = addSectionHeader('ADDRESS HISTORY', currentY);
      
      contactSummary.addressHistory.forEach((addr, index) => {
        let addressText = `${index + 1}. ${addr.formattedAddress}`;
        if (addr.lastSeen) {
          addressText += ` (Last seen: ${addr.lastSeen})`;
        }
        currentY = addText(addressText, leftMargin, currentY) + 4;
      });
      
      currentY += 5;
    }

    // Remove Search Statistics section

    // Footer/Disclaimer
    if (currentY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const disclaimer = 'DISCLAIMER: This information is provided for legitimate business purposes only. Use of this data must comply with applicable laws including TCPA, CAN-SPAM, and state privacy regulations. Verify contact preferences before initiating communication.';
    doc.text(doc.splitTextToSize(disclaimer, contentWidth), leftMargin, currentY);

    // Save the PDF
    const safePropertyAddress = contactSummary.propertyAddress.replace(/[^a-zA-Z0-9]/g, "_");
    const safeOwnerName = contactSummary.ownerName.replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Contact_Report_${safeOwnerName}_${safePropertyAddress}.pdf`);
    
  } catch (error) {
    console.error('Error generating skip trace PDF:', error);
    throw new Error('Failed to generate contact report PDF');
  }
};