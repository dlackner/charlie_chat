"use client"; // This will be a client component due to useState and event handlers

import { useState, useCallback } from 'react';
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

  // Helper component for form fields to reduce repetition
  const FormField = ({ label, name, type = "text", value, onChange, placeholder }: {
    label: string;
    name: keyof LOIFormData;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}:</label>
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
      />
    </div>
  );
  
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // --- JavaScript Helper Functions (formatCurrencyJS, formatPhoneJS) ---
  // (Keep these as they are)
  const formatCurrencyJS = (value: string): string => {
    try {
      const numberValue = parseFloat(value.replace(/[^0-9.-]+/g,""));
      if (isNaN(numberValue)) return value;
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
    // ... (keep your existing generateAndDownloadLOI function content) ...
    // This function's logic doesn't need to change for the layout update.
    const data = {
      ...formData,
      yourPhoneFormatted: formatPhoneJS(formData.yourPhone),
      purchasePriceFormatted: formatCurrencyJS(formData.purchasePrice),
      earnestMoneyFormatted: formatCurrencyJS(formData.earnestMoney),
      currentDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      ownerFullName: `${formData.ownerFirst} ${formData.ownerLast}`.trim(),
      ownerCityStateZip: `${formData.ownerCity}, ${formData.ownerState} ${formData.ownerZip}`.trim(),
    };

    const tightParagraphConfig = {
        spacing: { after: 40 },
        line: 240 * 1.0,
    };
    const sections = [
        new Paragraph({ children: [new TextRun(data.yourName)], ...tightParagraphConfig }),
        new Paragraph({ children: [new TextRun(data.yourAddress)], ...tightParagraphConfig }),
        new Paragraph({ children: [new TextRun(data.yourCityZip)], ...tightParagraphConfig }),
        new Paragraph({ children: [new TextRun(data.yourPhoneFormatted)], ...tightParagraphConfig }),
        new Paragraph({ children: [new TextRun(data.yourEmail)], ...tightParagraphConfig }),
        new Paragraph({ text: data.currentDate, spacing: { after: 240 } }),
        new Paragraph({ spacing: { after: 120 } }),
        new Paragraph({ children: [new TextRun(data.ownerFullName)], ...tightParagraphConfig }),
        new Paragraph({ children: [new TextRun(data.ownerStreet)], ...tightParagraphConfig }),
        new Paragraph({ children: [new TextRun(data.ownerCityStateZip)], ...tightParagraphConfig }),
        new Paragraph({ spacing: { after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: `RE: Letter of Intent for ${data.propertyAddress}`, bold: true })], spacing: { after: 40 }, }),
        new Paragraph({ spacing: { after: 0 } }),
        new Paragraph({ children: [new TextRun(`Dear ${data.ownerFirst},`)], spacing: { after: 120 }, }),
        new Paragraph({
            children: [
                new TextRun(
                    `This Letter of Intent is provided to you to acknowledge the interest and intent of ${data.yourName} to acquire the fee simple interest of the Property, on the general terms and conditions set forth below. The terms listed below are not intended to be all-inclusive. Moreover, all of the terms and conditions, and all covenants, warranties and representations between the parties relating to this proposed transaction must be reflected in a definitive written agreement (“Agreement”) executed by all of the parties.`
                ),
            ],
            spacing: { after: 200 },
        }),
    ];
    const loiSectionsContent = [
        { num: "1", heading: "Seller", content: "Owner of Record" },
        { num: "2", heading: "Purchaser", content: `${data.yourName}, and/or assigns` },
        { num: "3", heading: "Property", content: data.propertyAddress },
        { num: "4", heading: "Purchase Price", content: `${data.purchasePriceFormatted}: The Purchase Price shall not include any liabilities or obligations owed by Seller to any person or entities on or before the Closing Date, unless expressly assumed in writing by Purchaser.`},
        { num: "5", heading: "Earnest Money Deposit", content: `${data.earnestMoneyFormatted} is to be deposited with Title Company within two (2) business days after the Effective Date as defined below. The Earnest Money Deposit is fully refundable to Purchaser at any time prior to expiration of the Inspection Period, and any time thereafter only upon Purchaser’s failure to obtain acceptable financing, or as a consequence of a default by Seller, or by mutual agreement of the parties.`},
         { num: "22", heading: "Execution Instructions", content: `If you are agreeable to the foregoing terms and conditions, please sign and date this letter in the space provided below, and return a signed copy to me, by email or facsimile, on or before 5:00PM, PST on the fifth day after the date of this letter. Upon receipt, we will commence preparation of a draft of the Agreement.` }
    ];
    loiSectionsContent.forEach(section => {
        sections.push(new Paragraph({
            children: [ new TextRun(`${section.num}. `), new TextRun({ text: `${section.heading}: `, bold: true }), new TextRun(section.content), ],
            spacing: { after: 120 },
        }));
    });
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
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    sections.push(new Paragraph({ children: [new TextRun({ text: "SCHEDULE 1", bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 }}));
    sections.push(new Paragraph({ children: [new TextRun("(due diligence information)")], alignment: AlignmentType.CENTER, spacing: { after: 120 }}));
    const scheduleItemsContent = [
        "(a) Copies of ad valorem and personal property tax statements covering the Property for the three (3) years prior to the Effective Date (or the period of time Seller has owned the Real Property, whichever is less) and, if and when available, for the current year, together with a copy of the current year Tax Assessment Notice from applicable appraisal district office.",
        "(b) Copies of all licenses and permits with respect to Seller’s ownership and operation of the Property, including, without limitation, building permits, swimming pool permits, boiler permits, mechanical permits and certificates of occupancy, wind mitigation reports, flood plan certifications.",
        "(k) Certified copies of the last twelve months of monthly, itemized bank statements regarding operations at the Property."
    ];
    scheduleItemsContent.forEach(item => { sections.push(new Paragraph({ text: item, spacing: { after: 120 } })); });
    const doc = new Document({ sections: [{ properties: {}, children: sections, }], });
    Packer.toBlob(doc).then(blob => {
      const safeAddress = data.propertyAddress.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      saveAs(blob, `LOI_${safeAddress || 'document'}.docx`);
      console.log('Document created successfully');
    }).catch(err => { console.error('Error creating document: ', err); });
  };


  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Generate Letter of Intent (LOI)</h1>
      <form onSubmit={(e) => { e.preventDefault(); generateAndDownloadLOI(); }} className="space-y-8 bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">

        {/* Your Info Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Your Name" name="yourName" value={formData.yourName} onChange={handleChange} />
            <FormField label="Your Phone" name="yourPhone" type="tel" value={formData.yourPhone} onChange={handleChange} />
            <FormField label="Your Address" name="yourAddress" value={formData.yourAddress} onChange={handleChange} />
            <FormField label="Your Email" name="yourEmail" type="email" value={formData.yourEmail} onChange={handleChange} />
            <FormField label="Your City/State/ZIP" name="yourCityZip" value={formData.yourCityZip} onChange={handleChange} />
          </div>
        </section>

        {/* Property & Offer Info Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Property & Offer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2"> {/* Property Address spans full width */}
              <FormField label="Property Address" name="propertyAddress" value={formData.propertyAddress} onChange={handleChange} />
            </div>
            <FormField label="Purchase Price ($)" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} />
            <FormField label="Earnest Money ($)" name="earnestMoney" value={formData.earnestMoney} onChange={handleChange} />
          </div>
        </section>

        {/* Owner Info Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Owner Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Owner First Name" name="ownerFirst" value={formData.ownerFirst} onChange={handleChange} />
            <FormField label="Owner Last Name" name="ownerLast" value={formData.ownerLast} onChange={handleChange} />
            <FormField label="Owner Street" name="ownerStreet" value={formData.ownerStreet} onChange={handleChange} />
            <FormField label="Owner City" name="ownerCity" value={formData.ownerCity} onChange={handleChange} />
            <FormField label="Owner State" name="ownerState" value={formData.ownerState} onChange={handleChange} />
            <FormField label="Owner ZIP" name="ownerZip" value={formData.ownerZip} onChange={handleChange} />
          </div>
        </section>

        <button
          type="submit"
          className="w-full md:w-auto mt-6 bg-orange-500 text-white py-3 px-6 rounded-lg font-semibold text-lg transition duration-200 transform hover:scale-105 hover:bg-orange-600 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-50"
        >
          Generate and Download LOI
        </button>
      </form>
    </div>
  );
}