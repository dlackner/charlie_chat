"use client"; // This will be a client component due to useState and event handlers

import { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver'; // Helper to trigger download

// Define an interface for your form data
interface LOIFormData {
  yourName: string;
  yourAddress: string;
  yourCityZip: string;
  yourPhone: string;
  yourEmail: string;
  purchasePrice: string;
  earnestMoney: string;
  propertyAddress: string;
  ownerFirst: string;
  ownerLast: string;
  ownerStreet: string;
  ownerCity: string;
  ownerState: string;
  ownerZip: string;
}

export default function TemplatesPage() {
  const [formData, setFormData] = useState<LOIFormData>({
    yourName: '',
    yourAddress: '',
    yourCityZip: '',
    yourPhone: '',
    yourEmail: '',
    purchasePrice: '',
    earnestMoney: '',
    propertyAddress: '',
    ownerFirst: '',
    ownerLast: '',
    ownerStreet: '',
    ownerCity: '',
    ownerState: '',
    ownerZip: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- JavaScript Helper Functions ---
  const formatCurrencyJS = (value: string): string => {
    try {
      const numberValue = parseFloat(value.replace(/[^0-9.-]+/g,""));
      if (isNaN(numberValue)) return value; // Return original if not a valid number
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numberValue);
    } catch {
      return value;
    }
  };

  const formatPhoneJS = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
    }
    return value;
  };

  const generateAndDownloadLOI = async () => {
    const data = {
      ...formData,
      yourPhoneFormatted: formatPhoneJS(formData.yourPhone),
      purchasePriceFormatted: formatCurrencyJS(formData.purchasePrice),
      earnestMoneyFormatted: formatCurrencyJS(formData.earnestMoney),
      currentDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      ownerFullName: `${formData.ownerFirst} ${formData.ownerLast}`,
      ownerCityStateZip: `${formData.ownerCity}, ${formData.ownerState} ${formData.ownerZip}`,
    };

    // --- Document Creation using 'docx' library ---
    // (This is where the bulk of the Python script's logic needs to be translated)

    const tightParagraphConfig = {
        spacing: { after: 40 }, // Corresponds to Pt(2) approx. 2 * 20 = 40 twentieths of a point
        line: 240 * 1.0, // Corresponds to 1.0 line spacing (240 = single)
    };

    const sections = [
        new Paragraph({
            children: [new TextRun(data.yourName)],
            ...tightParagraphConfig,
        }),
        new Paragraph({
            children: [new TextRun(data.yourAddress)],
            ...tightParagraphConfig,
        }),
        new Paragraph({
            children: [new TextRun(data.yourCityZip)],
            ...tightParagraphConfig,
        }),
        new Paragraph({
            children: [new TextRun(data.yourPhoneFormatted)],
            ...tightParagraphConfig,
        }),
        new Paragraph({
            children: [new TextRun(data.yourEmail)],
            ...tightParagraphConfig,
        }),
        new Paragraph({ text: data.currentDate, spacing: { after: 240 } }), // Pt(12) approx 12 * 20
        new Paragraph({ spacing: { after: 120 } }), // Empty paragraph for space

        new Paragraph({ children: [new TextRun(data.ownerFullName)], ...tightParagraphConfig }),
        new Paragraph({ children: [new TextRun(data.ownerStreet)], ...tightParagraphConfig }),
        new Paragraph({ children: [new TextRun(data.ownerCityStateZip)], ...tightParagraphConfig }),
        new Paragraph({ spacing: { after: 120 } }),

        new Paragraph({
            children: [new TextRun({ text: `RE: Letter of Intent for ${data.propertyAddress}`, bold: true })],
            spacing: { after: 40 },
        }),
        new Paragraph({ spacing: { after: 0 } }), // Empty paragraph like in python code
        new Paragraph({
            children: [new TextRun(`Dear ${data.ownerFirst},`)],
            spacing: { after: 120 },
        }),

        // Intro Paragraph
        new Paragraph({
            children: [
                new TextRun(
                    `This Letter of Intent is provided to you to acknowledge the interest and intent of ${data.yourName} to acquire the fee simple interest of the Property, on the general terms and conditions set forth below. The terms listed below are not intended to be all-inclusive. Moreover, all of the terms and conditions, and all covenants, warranties and representations between the parties relating to this proposed transaction must be reflected in a definitive written agreement (“Agreement”) executed by all of the parties.`
                ),
            ],
            spacing: { after: 200 }, // Pt(10)
        }),
    ];

    // Numbered Sections (example for one, you'll need to do all 22)
    const loiSectionsContent = [
        { num: "1", heading: "Seller", content: "Owner of Record" },
        { num: "2", heading: "Purchaser", content: `${data.yourName}, and/or assigns` },
        { num: "3", heading: "Property", content: data.propertyAddress },
        { num: "4", heading: "Purchase Price", content: `${data.purchasePriceFormatted}: The Purchase Price shall not include any liabilities or obligations owed by Seller to any person or entities on or before the Closing Date, unless expressly assumed in writing by Purchaser.`},
        // ... (add all 22 sections from your Python script here)
        { num: "5", heading: "Earnest Money Deposit", content: `${data.earnestMoneyFormatted} is to be deposited with Title Company within two (2) business days after the Effective Date as defined below. The Earnest Money Deposit is fully refundable to Purchaser at any time prior to expiration of the Inspection Period, and any time thereafter only upon Purchaser’s failure to obtain acceptable financing, or as a consequence of a default by Seller, or by mutual agreement of the parties.`},
        // ... (continue for all sections)
         { num: "22", heading: "Execution Instructions", content: `If you are agreeable to the foregoing terms and conditions, please sign and date this letter in the space provided below, and return a signed copy to me, by email or facsimile, on or before 5:00PM, PST on the fifth day after the date of this letter. Upon receipt, we will commence preparation of a draft of the Agreement.` }
    ];

    loiSectionsContent.forEach(section => {
        sections.push(new Paragraph({
            children: [
                new TextRun(`${section.num}. `),
                new TextRun({ text: `${section.heading}: `, bold: true }),
                new TextRun(section.content),
            ],
            spacing: { after: 120 }, // Pt(6)
        }));
    });

    // Signature Block
    sections.push(new Paragraph({ spacing: { after: 120 } }));
    sections.push(new Paragraph({ children: [new TextRun({ text: "PURCHASER:", bold: true })], spacing: {after: 40} }));
    sections.push(new Paragraph({ children: [new TextRun("BY:    ______________________________________________________")], spacing: {after: 40} }));
    sections.push(new Paragraph({ children: [new TextRun(data.yourName)], spacing: {after: 40} }));
    sections.push(new Paragraph({ children: [new TextRun(data.yourAddress)], spacing: {after: 40} }));
    sections.push(new Paragraph({ children: [new TextRun(data.yourCityZip)], spacing: {after: 40} }));
    sections.push(new Paragraph({ spacing: { after: 0 } }));
    sections.push(new Paragraph({ children: [new TextRun(`ACKNOWLEDGED AND AGREED TO THIS ${data.currentDate}.`)], spacing: {after: 120} }));
    sections.push(new Paragraph({ spacing: { after: 0 } }));
    sections.push(new Paragraph({ children: [new TextRun({ text: "SELLER:", bold: true })], spacing: {after: 40} }));
    sections.push(new Paragraph({ children: [new TextRun("BY:    ____________________________________________________")], spacing: {after: 40} }));
    sections.push(new Paragraph({ children: [new TextRun(data.ownerFullName)], spacing: {after: 40} }));
    sections.push(new Paragraph({ children: [new TextRun("Owner")], spacing: {after: 40} }));


    // Schedule 1
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    sections.push(new Paragraph({ children: [new TextRun({ text: "SCHEDULE 1", bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 }}));
    sections.push(new Paragraph({ children: [new TextRun("(due diligence information)")], alignment: AlignmentType.CENTER, spacing: { after: 120 }}));

    const scheduleItemsContent = [ /* ... your full list of schedule items ... */
        "(a) Copies of ad valorem and personal property tax statements covering the Property for the three (3) years prior to the Effective Date (or the period of time Seller has owned the Real Property, whichever is less) and, if and when available, for the current year, together with a copy of the current year Tax Assessment Notice from applicable appraisal district office.",
        "(b) Copies of all licenses and permits with respect to Seller’s ownership and operation of the Property, including, without limitation, building permits, swimming pool permits, boiler permits, mechanical permits and certificates of occupancy, wind mitigation reports, flood plan certifications.",
        // ... (add all schedule items)
        "(k) Certified copies of the last twelve months of monthly, itemized bank statements regarding operations at the Property."
    ];
    scheduleItemsContent.forEach(item => {
        sections.push(new Paragraph({ text: item, spacing: { after: 120 } }));
    });


    const doc = new Document({
      sections: [{
        properties: {}, // You can define page margins, size, etc. here if needed
        children: sections,
      }],
    });

    // --- Save and Download ---
    Packer.toBlob(doc).then(blob => {
      const safeAddress = data.propertyAddress.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      saveAs(blob, `LOI_${safeAddress || 'document'}.docx`);
      console.log('Document created successfully');
    }).catch(err => {
        console.error('Error creating document: ', err);
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Generate Letter of Intent (LOI)</h1>
      <form onSubmit={(e) => { e.preventDefault(); generateAndDownloadLOI(); }} className="space-y-4">
        {/* Your Info Section */}
        <h2 className="text-xl font-semibold">Your Information</h2>
        <div>
          <label htmlFor="yourName" className="block text-sm font-medium text-gray-700">Your Name:</label>
          <input type="text" name="yourName" id="yourName" value={formData.yourName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="yourAddress" className="block text-sm font-medium text-gray-700">Your Address:</label>
          <input type="text" name="yourAddress" id="yourAddress" value={formData.yourAddress} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="yourCityZip" className="block text-sm font-medium text-gray-700">Your City/State/ZIP:</label>
          <input type="text" name="yourCityZip" id="yourCityZip" value={formData.yourCityZip} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="yourPhone" className="block text-sm font-medium text-gray-700">Your Phone:</label>
          <input type="tel" name="yourPhone" id="yourPhone" value={formData.yourPhone} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="yourEmail" className="block text-sm font-medium text-gray-700">Your Email:</label>
          <input type="email" name="yourEmail" id="yourEmail" value={formData.yourEmail} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        {/* Property & Offer Info Section */}
        <h2 className="text-xl font-semibold mt-6">Property & Offer Information</h2>
        <div>
          <label htmlFor="propertyAddress" className="block text-sm font-medium text-gray-700">Property Address:</label>
          <input type="text" name="propertyAddress" id="propertyAddress" value={formData.propertyAddress} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
         <div>
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">Purchase Price ($):</label>
          <input type="text" name="purchasePrice" id="purchasePrice" value={formData.purchasePrice} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="earnestMoney" className="block text-sm font-medium text-gray-700">Earnest Money ($):</label>
          <input type="text" name="earnestMoney" id="earnestMoney" value={formData.earnestMoney} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        {/* Owner Info Section */}
        <h2 className="text-xl font-semibold mt-6">Owner Information</h2>
        <div>
          <label htmlFor="ownerFirst" className="block text-sm font-medium text-gray-700">Owner First Name:</label>
          <input type="text" name="ownerFirst" id="ownerFirst" value={formData.ownerFirst} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="ownerLast" className="block text-sm font-medium text-gray-700">Owner Last Name:</label>
          <input type="text" name="ownerLast" id="ownerLast" value={formData.ownerLast} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="ownerStreet" className="block text-sm font-medium text-gray-700">Owner Street:</label>
          <input type="text" name="ownerStreet" id="ownerStreet" value={formData.ownerStreet} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="ownerCity" className="block text-sm font-medium text-gray-700">Owner City:</label>
          <input type="text" name="ownerCity" id="ownerCity" value={formData.ownerCity} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="ownerState" className="block text-sm font-medium text-gray-700">Owner State:</label>
          <input type="text" name="ownerState" id="ownerState" value={formData.ownerState} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="ownerZip" className="block text-sm font-medium text-gray-700">Owner ZIP:</label>
          <input type="text" name="ownerZip" id="ownerZip" value={formData.ownerZip} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Generate and Download LOI
        </button>
      </form>
    </div>
  );
}