"use client";

import { useState, useCallback, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; 

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

  const { user: currentUser, isLoading: isLoadingAuth, supabase } = useAuth();
  const router = useRouter();
  const isLoggedIn = !!currentUser;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

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

    if (!isLoggedIn) {
        alert("Authentication error. Please ensure you are signed in.");
        return;
      }

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
                    `Please find outlined below the general terms and conditions under which ${data.yourName} (“Purchaser”) would be willing to purchase the above referenced Property. This letter will serve as a non-binding letter of intent between Purchaser or its Assignee, and the Owner of Record (“Seller”). Let this letter serve as our expression of intent to purchase the above referenced Property under the following terms and conditions:`
                ),
            ],
            spacing: { after: 200 },
        }),
    ];
    const loiSectionsContent = [
        {
          num: "1",
          heading: "Purchase Price",
          content: `${data.purchasePriceFormatted}`
        },
        {
          num: "2",
          heading: "Earnest Money Deposit",
          content: `${data.earnestMoneyFormatted}`
        },
        {
          num: "3",
          heading: "Purchase Agreement",
          content: 'Both parties will strive to execute a mutually acceptable Purchase Agreement within thirty (30) days after the execution of this Letter of Intent.' // Corrected quote and number
        },
        {
          num: "4",
          heading: "Earnest Money Deposit",
          content: `A refundable Earnest Money Deposit in the amount of ${data.earnestMoneyFormatted} will be deposited with the Escrow Agent within five (5) business days.`
        },
        {
          num: "5",
          heading: "Inspection Period",
          content: 'Purchaser shall have an Inspection Period of thirty (30) days to inspect the property and conduct any due diligence. If the Purchaser finds the Property unsuitable, this LOI shall be void and the Earnest Money refunded.'
        },
        {
          num: "6",
          heading: "Closing Date",
          content: 'The Closing will occur on or before thirty (30) days after the end of the Inspection Period. An additional 30-day extension may be granted upon written request.'
        },
        {
          num: "7",
          heading: "Closing Costs",
          content: 'The Seller will pay for basic title insurance, transfer taxes, survey and documentary stamps.'
        },
        {
          num: "8",
          heading: "Brokerage Fees",
          content: 'To be paid by Seller as per seller agreement with Seller’s agent.'
        },
        {
          num: "9",
          heading: "General Terms",
          content: 'The above represents the general terms and conditions of the proposed transaction. A full agreement will be prepared after mutual acceptance.'
        },
        {
          num: "10",
          heading: "Execution Instructions",
          content: 'Should the above proposal be acceptable to you, please execute your signature below and Purchaser will begin preparation of the Purchase Agreement.'
        }
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
        "(c) To the extent that Seller has possession of these items: Copies of as-built engineering and architectural plans. Drawings, specifications, geotechnical subsoil tests or analyses, termite inspection reports, structural reports, foundation reports, and all amendments or changes thereto, and all blueprints, schematics, renderings, architect’s drawings and all other reports, plans or studies held by or for Seller which relate to the Property (collectively, the “Plans”).", // Removed trailing comma inside string if any
        "(d) Copies of all Leases (including, without limitation, all modifications, amendments, or supplements thereto) in effect with respect to the Property, as a certified rent roll (”Rent Roll”) prepared as of the first day of the month in which the Contract is executed, which Rent Roll shall reflect, as of the date thereof with respect to each tenant occupying the Property or with respect to prospective tenants who have executed leases but have not yet occupied the Property: (i) the space occupied (or to be occupied); (ii) names of tenants, (iii) monthly rent, including escalations; (iv) the amount of the security deposit (and any other deposits) and any prepaid rent or charges; (v) amount of rent in arrearage; (vi) the date through which rent is paid, (vii)the commencement date and the expiration date of the lease term; (viii) any concessions granted which are now effective or which may in the future become effective; and (ix) tenant responsibility for water, sewage and other utility charges. The Rent Roll shall be accompanied by Seller’s signed certificate that the Rent Roll is complete and correct as of the date shown on said Rent Roll, and that there has been no material adverse change with respect to any item shown on the Rent Roll during the period from the date thereof to the date of such certificate.",
        "(e) Copies of all service contracts, landscaping, pool and/or other maintenance agreements, management contracts, warranties, guaranties, or other agreements relating to the Property, including, without limitation, all laundry leases, other equipment leases and particularly all coin-operated vending or other machines.",
        "(f) A reasonably detailed list for the Seller showing the description and approximate quantity of all of Seller’s Personal Property included as part of this transaction, together with copies of any lease, rental, or other agreements with respect to any such Personal Property.",
        "(g) A statement (”Operating Statement”) with respect to the results of the ownership and operation of the Property at least for the period of Seller’s ownership of the Property (and information in Seller’s possession from the previous owner of the Property) and which shall set forth (i) ad valorem taxes for the city, county and state; (ii) insurance premiums for fire, extended coverage, workmen’s compensation, vandalism and malicious mischief, general liability, rent continuation and other forms of insurance; (iii) expenses incurred for water, electricity, natural gas, and other utilities; (iv) total rents and other charges collected and total rents and other charges due from the tenants; (v) management fees paid by Seller; (vi) maintenance, repair, and other expenses relating to the management and operation of the Property; (vii) amounts paid for capital improvements to the Property; and (viii) all other income from the Property or expenses of operation of the Property. The Operating Statement shall be accompanied by Seller’s certificate that said Operating statement is true, complete and correct to Seller’s actual knowledge as of the date provided.",
        "(h) Copies of all correspondence, reports, inspections, and other documents held by or for Seller including, without limitation, and Phase I reports or Phase II reports regarding the environmental aspects of the Property or any toxic or hazardous substances affecting or relating to the Property including, without limitation, any asbestos testing results.",
        "(i) Copies of all geotechnical reports, and soil compaction tests performed by or on behalf of Seller or which Seller has in its possession relating to the Property.",
        "(j) Copies of the most recent MAI or other type of property appraisal on the Property.",
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoadingAuth) {
      alert("Please wait, checking authentication status...");
      return;
    }

    if (!isLoggedIn) {
      alert("You must be signed in to generate an LOI. Please log in or sign up.");
      return;
    }

    await generateAndDownloadLOI();
  };


  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Generate Letter of Intent (LOI)</h1>
      <form onSubmit={handleFormSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">

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

        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Property & Offer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormField label="Property Address" name="propertyAddress" value={formData.propertyAddress} onChange={handleChange} />
            </div>
            <FormField label="Purchase Price ($)" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} />
            <FormField label="Earnest Money ($)" name="earnestMoney" value={formData.earnestMoney} onChange={handleChange} />
          </div>
        </section>

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
          disabled={isLoadingAuth || !isLoggedIn}
          className={`w-full md:w-auto mt-6 text-white py-3 px-6 rounded-lg font-semibold text-lg transition duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-50 ${
            (isLoadingAuth || !isLoggedIn) ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:shadow-xl'
          }`}
        >
          {isLoadingAuth ? "Verifying Access..." : (isLoggedIn ? "Generate and Download LOI" : "Sign In to Generate LOI")}
        </button>
      </form>
    </div>
  );
}