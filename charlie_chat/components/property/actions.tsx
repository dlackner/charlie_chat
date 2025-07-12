// actions.tsx - Property Actions/Download Buttons Component

'use client';

import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, ISpacingProperties, LineRuleType } from 'docx';
import { saveAs } from 'file-saver';
import type { Listing } from '../ui/sidebar';
import { SkipTraceButton } from '../skiptrace/SkipTraceButton';
import { classifyProperty } from '../property/property-classifier';

interface PropertyActionsProps {
  listing: Listing;
  userClass: 'trial' | 'charlie_chat' | 'charlie_chat_pro' | 'cohort';
}

export const PropertyActions = ({ listing, userClass }: PropertyActionsProps) => {
  const formatCurrency = (val: number | undefined) =>
    val ? `$${val.toLocaleString()}` : "N/A";

  const downloadLetter = async (listing: Listing) => {
    const yourDataPlaceholders = {
      name: "[Your Name]",
      address: "[Your Address]",
      cityStateZip: "[City, State, Zip Code]",
      phone: "[Phone Number]",
      email: "[Email Address]",
    };
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const rawOwnerFirstName = listing.owner1FirstName?.trim();
    const rawOwnerLastName = listing.owner1LastName?.trim();
    let displayOwnerFullName: string | null = null;
    let salutationName = "Property Owner";
    if (rawOwnerFirstName && rawOwnerLastName) {
      displayOwnerFullName = `${rawOwnerFirstName} ${rawOwnerLastName}`;
      salutationName = rawOwnerFirstName;
    } else if (rawOwnerFirstName) {
      displayOwnerFullName = rawOwnerFirstName;
      salutationName = rawOwnerFirstName;
    } else if (rawOwnerLastName) {
      displayOwnerFullName = rawOwnerLastName;
    }
    let finalOwnerMailStreet = "";
    let finalOwnerMailCityStateZip = "";
    if (listing.mailAddress) {
      finalOwnerMailStreet = listing.mailAddress.street || "";
      const city = listing.mailAddress.city;
      const stateAbbr = listing.mailAddress.state;
      const zipCode = listing.mailAddress.zip;
      let cityStateZipParts = [];
      if (city) cityStateZipParts.push(city);
      if (stateAbbr) cityStateZipParts.push(stateAbbr);
      if (zipCode) cityStateZipParts.push(zipCode);
      if (city && stateAbbr && zipCode) {
          finalOwnerMailCityStateZip = `${city}, ${stateAbbr} ${zipCode}`;
      } else if (city && stateAbbr) {
          finalOwnerMailCityStateZip = `${city}, ${stateAbbr}`;
      } else if (city && zipCode) {
          finalOwnerMailCityStateZip = `${city} ${zipCode}`;
      } else {
          finalOwnerMailCityStateZip = cityStateZipParts.join(' ');
      }
      if (!finalOwnerMailStreet && listing.mailAddress.address) {
          const addressParts = listing.mailAddress.address.split(',');
          finalOwnerMailStreet = addressParts[0]?.trim() || "";
          if (addressParts.length > 1 && !finalOwnerMailCityStateZip) {
              finalOwnerMailCityStateZip = addressParts.slice(1).join(',').trim();
          }
      }
   } else if (listing.mailAddress) {
      const { street, address, city, state, zip } = listing.mailAddress;
      finalOwnerMailStreet = street || address || "";
      finalOwnerMailCityStateZip = [city, state, zip].filter(Boolean).join(', ');
    }
    if (!finalOwnerMailStreet && !finalOwnerMailCityStateZip && !displayOwnerFullName) {
        finalOwnerMailStreet = "[Owner Address Line 1]";
        finalOwnerMailCityStateZip = "[Owner Address Line 2]";
    } else {
        if (!finalOwnerMailStreet) finalOwnerMailStreet = "[Mail Address: Street]";
        if (!finalOwnerMailCityStateZip) finalOwnerMailCityStateZip = "[Mail Address: City, State, Zip]";
    }
    const propertyStreet = listing.address?.street || "[Property Street]";
    const propertyCity = listing.address?.city || "[Property City]";
    const acquisitionFocusState = listing.address?.state || "[Property's State]";
    const createStyledParagraph = (
      text?: string,
      { bold = false, spaceAfterPt = 2, lineRule = LineRuleType.AUTO, lines = 240, children }: {
        bold?: boolean;
        spaceAfterPt?: number;
        lineRule?: "auto" | "exact" | "atLeast";
        lines?: number;
        children?: TextRun[];
      } = {}
    ): Paragraph => {
      const spacingOptions: ISpacingProperties = {
        after: spaceAfterPt * 20,
        line: lines,
        lineRule: lineRule as "auto" | "exact" | "atLeast",
      };
      return new Paragraph({
        children: children || (text !== undefined ? [new TextRun({ text, bold })] : []),
        spacing: spacingOptions,
      });
    };
    const letterElements: Paragraph[] = [];
    letterElements.push(createStyledParagraph(yourDataPlaceholders.name));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.address));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.cityStateZip));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.phone));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.email, { spaceAfterPt: 12 }));
    letterElements.push(createStyledParagraph(today, { spaceAfterPt: 6 }));
    let addedAnyOwnerInfo = false;
    if (displayOwnerFullName) {
      letterElements.push(createStyledParagraph(displayOwnerFullName));
      addedAnyOwnerInfo = true;
    }
    if (finalOwnerMailStreet && finalOwnerMailStreet !== "[Mail Address: Street]") {
      const spaceAfterStreet = (finalOwnerMailCityStateZip && finalOwnerMailCityStateZip !== "[Mail Address: City, State, Zip]" && finalOwnerMailCityStateZip.trim() !== "") ? 2 : 6;
      letterElements.push(createStyledParagraph(finalOwnerMailStreet, { spaceAfterPt: spaceAfterStreet }));
      addedAnyOwnerInfo = true;
    }
    if (finalOwnerMailCityStateZip && finalOwnerMailCityStateZip !== "[Mail Address: City, State, Zip]" && finalOwnerMailCityStateZip.trim() !== "") {
      letterElements.push(createStyledParagraph(finalOwnerMailCityStateZip, { spaceAfterPt: 6 }));
      addedAnyOwnerInfo = true;
    }
    if (!addedAnyOwnerInfo) {
        letterElements.push(createStyledParagraph("[Property Owner Address Block]", { spaceAfterPt: 6 }));
    }
    letterElements.push(createStyledParagraph(`Dear ${salutationName},`, { spaceAfterPt: 6 }));
    letterElements.push(createStyledParagraph(`I hope this note finds you well. I'm reaching out to express sincere interest in your property located at ${propertyStreet}${propertyCity && propertyCity !== "[Property City]" ? `, ${propertyCity}` : ''}. I focus on acquiring multifamily properties in ${acquisitionFocusState}, and this building stood out due to its location, character, and the strength of the local rental market.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`Whether or not you've ever considered selling, I understand that owning and managing multifamily assets can be demanding – especially in today's environment. Rising operating costs, shifting tenant expectations, and market volatility have prompted many property owners to explore their options.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`I'm not a broker, and this isn't a listing solicitation. I'm a direct buyer looking to engage in a straightforward, respectful conversation about a potential off-market purchase. My goal is to understand your situation and see if there's a way to align my interest with your goal – on your timeline.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`In past acquisitions, we've structured deals with flexible terms including delayed closings, continued property management, partial seller financing, and even 1031 exchange participation for owners looking to defer capital gains taxes. Depending on your goals, there may be creative options available that help maximize value while minimizing tax exposure.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`If you'd simply like to know what your property might be worth in today's market, I'd be happy to offer an informal valuation – no pressure, no obligation.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`You can reach me directly at ${yourDataPlaceholders.phone} or ${yourDataPlaceholders.email}. Even if now isn't the right time, I'd welcome the opportunity to stay in touch.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`Wishing you all the best and appreciation for your time.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph("Best regards,", { spaceAfterPt: 2 }));
    letterElements.push(new Paragraph({ spacing: { after: 240 } }));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.name, { spaceAfterPt: 2 }));
    const doc = new Document({ sections: [{ properties: {}, children: letterElements }] });
    try {
      const blob = await Packer.toBlob(doc);
      const safePropertyAddress = (propertyStreet || "property").replace(/[^a-zA-Z0-9]/g, "_");
      saveAs(blob, `Marketing_Letter_${safePropertyAddress}.docx`);
    } catch (error) {
      console.error("Error generating .docx file:", error);
      alert("Error generating document. Please try again.");
    }
  };

  const downloadProfile = (listing: Listing) => {
    const doc = new jsPDF({ orientation: "landscape" });
    const leftX = 10;
    const rightX = 150;
    let startY = 30;
    
    // Use the lower resolution logo
    doc.addImage("/MFOS.png", "PNG", 10, 8, 50, 10);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const address = listing.address?.address || "No Address";
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(address)}`;
    const centerX = doc.internal.pageSize.getWidth() / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(address, centerX, startY, { align: "center" });
    const textWidth = doc.getTextWidth(address);
    const linkX = centerX + textWidth / 2 + 5;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 238);
    doc.textWithLink("View Map", linkX, startY, { url: googleMapsUrl });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");

    startY = 45;
    
    // Get property classifications for the badge
    const classifications = classifyProperty(listing);
    const classificationText = classifications.length > 0 
      ? classifications.map(c => c.label).join(", ")
      : "Standard";

    const addSection = (title: string, fields: [string, any][], x: number, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, x, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      fields.forEach(([label, value], i) => {
        doc.text(`${label} ${value}`, x, y + 7 + i * 6);
      });
    };
    
    // Add the classification to PROPERTY OVERVIEW
    addSection("PROPERTY OVERVIEW", [
      ["Property ID:", listing.id], 
      ["Classification:", classificationText],
      ["Units:", listing.unitsCount ?? "N/A"], 
      ["Stories:", listing.stories ?? "N/A"], 
      ["Year Built:", listing.yearBuilt ?? "N/A"], 
      ["Lot Size:", `${listing.lotSquareFeet?.toLocaleString()} sq ft`], 
      ["Years Owned:", listing.yearsOwned ?? "N/A"],
    ], leftX, startY);
    
    addSection("VALUATION & EQUITY", [
      ["Assessed Value:", formatCurrency(listing.assessedValue)], 
      ["Estimated Market Value:", formatCurrency(listing.estimatedValue)], 
      ["Estimated Equity:", formatCurrency(listing.estimatedValue)], 
      ["Listing Price:", "Not listed"],
    ], leftX, startY + 54); // Adjusted Y position to account for extra line
    
    addSection("MORTGAGE & FINANCING", [
      ["Mortgage Balance:", formatCurrency(listing.mortgageBalance)], 
      ["Lender:", listing.lenderName ?? "N/A"], 
      ["Mortgage Maturity Date:", listing.mortgageMaturingDate ?? "N/A"],
    ], leftX, startY + 89); // Adjusted Y position
    
    addSection("SALES & TRANSACTION HISTORY", [
      ["Last Sale Date:", listing.lastSaleDate ?? "N/A"], 
      ["Last Sale Amount:", formatCurrency(listing.lastSaleAmount)], 
      ["Arms-Length Sale:", listing.lastSaleArmsLength ? "Yes" : "No"], 
      ["MLS Active:", listing.mlsActive ? "Yes" : "No"],
    ], rightX, startY);
    
    addSection("FLOOD ZONE INFORMATION", [
      ["Flood Zone:", listing.floodZone ? "Yes" : "No"], 
      ["Flood Zone Description:", listing.floodZoneDescription ?? "N/A"],
    ], rightX, startY + 35);
    
    addSection("OWNERSHIP DETAILS", [
      ["Owner Name:", `${listing.owner1FirstName ?? ""} ${listing.owner1LastName ?? ""}`], 
      ["Owner Address:", listing.mailAddress ?? "N/A"], 
      ["In-State Absentee Owner:", listing.inStateAbsenteeOwner ? "Yes" : "No"], 
      ["Out-of-State Absentee Owner:", listing.outOfStateAbsenteeOwner ? "Yes" : "No"],
    ], rightX, startY + 60);
    
    addSection("OTHER INFORMATION", [
      ["Assumable:", listing.assumable ? "Yes" : "No"], 
      ["REO:", listing.reo ? "Yes" : "No"], 
      ["Auction:", listing.auction ? "Yes" : "No"], 
      ["Tax Lien:", listing.taxLien ? "Yes" : "No"],
      ["Pre Foreclosure:", listing.preForeclosure ? "Yes" : "No"], 
      ["Private Lender:", listing.privateLender ? "Yes" : "No"],
    ], rightX, startY + 95);
    
    const safeAddress = (listing.address?.address || "property").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Property_Profile_${safeAddress}.pdf`);
  };

  return (
    <div className="mt-6 flex gap-4">
      <button
        onClick={() => downloadLetter(listing)}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900
                   transform transition-all duration-150 ease-in-out
                   hover:scale-105 active:scale-90
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
      >
        Download Letter 📩
      </button>
      
      <button
        onClick={() => downloadProfile(listing)}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900
                   transform transition-all duration-150 ease-in-out
                   hover:scale-105 active:scale-90
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
      >
        Download Profile 📄
      </button>
      
      <SkipTraceButton 
        listing={listing}
        userClass={userClass}
      />
    </div>
  );
};