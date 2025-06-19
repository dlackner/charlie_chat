"use client";

import { useState, useCallback, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const notify = (msg: string) => {
  const box = Object.assign(document.createElement('div'), { innerText: msg });
  Object.assign(box.style, {
    position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
    background: '#1C599F', color: '#fff', padding: '18px 32px',
    borderRadius: '6px', zIndex: 9999, fontFamily: 'sans-serif'
  });
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3000);          // auto‑vanish after 5 s
};

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
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
      />
    </div>
  );

  function formatPhoneJS(phoneNumberString: string) {
    const cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phoneNumberString;
  }

  function formatCurrencyJS(value: string) {
    const numberValue = parseFloat(value.replace(/[^0-9.-]+/g, ""));
    if (isNaN(numberValue)) {
      return value;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(numberValue);
  }

export default function Home() {
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

  const [loiType, setLoiType] = useState<'short' | 'long' | 'master'>('short'); // Modified to handle three types

  const { user: currentUser, isLoading: isLoadingAuth, supabase } = useAuth();
  const router = useRouter();

  const isLoggedIn = !!currentUser;

  useEffect(() => {
    if (!isLoadingAuth && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoadingAuth, isLoggedIn, router]);

  const [userClass, setUserClass] = useState<string | null>(null);

useEffect(() => {
  if (!isLoadingAuth && isLoggedIn && currentUser?.id) {
    const fetchUserClass = async () => {
      const { data, error } = await supabase
        .from('profiles') // adjust this if your table is named differently
        .select('user_class')
        .eq('user_id', currentUser.id)
        .single();

      if (error) {
        console.error('Error fetching user_class:', error.message);
        setUserClass(null);
      } else {
        setUserClass(data.user_class);
      }
    };

    fetchUserClass();
  }
}, [isLoadingAuth, isLoggedIn, currentUser, supabase]);
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const generateAndDownloadLOI = async () => {
  if (!currentUser || userClass === 'charlie_chat' || userClass === 'trial') {
    notify(
      'For access to my proven templates and other features, upgrade to Charlie Chat Pro!'
    );          // 🔔 shows banner for 3 s, then continues
    return;
}
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

    const sections: Paragraph[] = [];

    // Common introductory sections (always included)
    sections.push(new Paragraph({ children: [new TextRun(data.yourName)], ...tightParagraphConfig }));
    sections.push(new Paragraph({ children: [new TextRun(data.yourAddress)], ...tightParagraphConfig }));
    sections.push(new Paragraph({ children: [new TextRun(data.yourCityZip)], ...tightParagraphConfig }));
    sections.push(new Paragraph({ children: [new TextRun(data.yourPhoneFormatted)], ...tightParagraphConfig }));
    sections.push(new Paragraph({ children: [new TextRun(data.yourEmail)], ...tightParagraphConfig }));
    sections.push(new Paragraph({ text: data.currentDate, spacing: { after: 240 } }));
    sections.push(new Paragraph({ spacing: { after: 120 } }));
    sections.push(new Paragraph({ children: [new TextRun(data.ownerFullName)], ...tightParagraphConfig }));
    sections.push(new Paragraph({ children: [new TextRun(data.ownerStreet)], ...tightParagraphConfig }));
    sections.push(new Paragraph({ children: [new TextRun(data.ownerCityStateZip)], ...tightParagraphConfig }));
    sections.push(new Paragraph({ spacing: { after: 120 } }));

    // Conditional content based on LOI type
    if (loiType === 'long') { // Changed from longFormLOI
        sections.push(new Paragraph({ children: [new TextRun({ text: `RE: Letter of Intent for ${data.propertyAddress}`, bold: true })], spacing: { after: 40 }, }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun(`Dear ${data.ownerFirst},`)], spacing: { after: 120 }, }));
        sections.push(new Paragraph({
            children: [
new TextRun(
                `Please find outlined below the general terms and conditions under which ${data.yourName} ("Purchaser") would be willing to purchase the above referenced Property. This letter will serve as a non-binding letter of intent between Purchaser or its Assignee, and the Owner of Record ("Seller").`
            ),
        ],
        spacing: { after: 200 },
    }));
    sections.push(new Paragraph({
        children: [
            new TextRun(
                `Let this letter serve as our expression of intent to purchase the above referenced Property under the following terms and conditions:`
            ),
        ],
        spacing: { after: 120 },
        }));
        // --- LONG FORM LOI CONTENT ---
               sections.push(new Paragraph({ text: "", spacing: { after: 60 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "1. PURCHASE PRICE: ", bold: true }),
                new TextRun(`The Purchase Price of the Property shall be: ${data.purchasePriceFormatted}.`)
            ],
            spacing: { after: 120 }
        }));
                sections.push(new Paragraph({
            children: [
                new TextRun({ text: "2. PURCHASE AGREEMENT: ", bold: true }),
                new TextRun(`Both parties will strive to execute a mutually acceptable purchase and sale agreement ("Agreement") within ten (10) days after the execution of this Letter.`)
            ],
            spacing: { after: 120 }
        }));
              sections.push(new Paragraph({
            children: [
                new TextRun({ text: "3. EARNEST MONEY DEPOSIT: ", bold: true }),
                new TextRun(`A refundable Earnest Money Deposit ("Deposit") subject to additional terms and conditions further defined in the Agreement of ${data.earnestMoneyFormatted} will be deposited within three (3) business days after the effective date as defined below.`)
            ],
            spacing: { after: 120 }
        }));
        
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "4. TITLE INSURANCE: ", bold: true }),
                new TextRun(`The title company will be chosen by the Purchaser. Seller shall provide to Purchaser, at Seller's expense and Purchaser's choosing, a standard ALTA policy of title insurance by Title Company in the amount of the Purchase Price for the Property, insuring that fee simple title to the Property is vested in Purchaser free and clear of all liens and subject only to exceptions approved by Purchaser during Inspection Period. Additional costs required to obtain an extended coverage policy shall be paid by Purchaser, if Purchaser elects coverage.`)
            ],
            spacing: { after: 120 }
        }));
                sections.push(new Paragraph({
            children: [
                new TextRun({ text: "5. SURVEY: ", bold: true }),
                new TextRun("Seller agrees to provide Purchaser, at Seller’s expense, with a current ALTA survey of Property within fifteen (15) days following the execution of the Agreement.")
            ],
            spacing:
            { after: 120 }
        }));
            sections.push(new Paragraph({
            children: [
                new TextRun({ text: "6. INSPECTION PERIOD: ", bold: true }),
                new TextRun(`The effective date (“Effective Date”) of the Agreement shall be the date on which Purchaser has received from the Seller all of the documents listed in Schedule 1 of this Letter. Purchaser shall have an inspection period of [NUMBER OF DAYS TO INSPECT] ([XX]) days (“Inspection Period”) starting from the Effective Date to inspect the Property and conduct any due diligence deemed necessary by Purchaser. If, for any reason, during this Inspection Period, Purchaser shall find the Property unsuitable, the Purchaser, by written notice to Seller, shall have the right to declare this Letter and any Agreement based hereon null and void and receive a full refund of any Deposit.`)
            ],
            spacing: { after: 120 }
        }));
                sections.push(new Paragraph({
            children: [
                new TextRun({ text: "7. RIGHT OF ENTRY: ", bold: true }),
                new TextRun(`Purchaser will have the right to enter the Property with prior reasonable notice, during reasonable business hours, for any purpose in connection with its inspection of the Property at any time that the Agreement is in effect.`)
            ],
            spacing: { after: 120 }
        }));
                sections.push(new Paragraph({
            children: [
                new TextRun({ text: "8. DUE DILIGENCE INFORMATION: ", bold: true }),
                new TextRun(`Seller will deliver to Purchaser true, correct and complete copies of any and all pertinent records (i.e., survey, leases, environmental studies, inspection reports, capital improvement information, title report, zoning information, operating expenses and financial reports, rent rolls, bank accounts and similar information) regarding Seller’s ownership and operation of the Property. Such information shall include, but not be limited to, the items described on Schedule 1 attached hereto and made a part hereof.`)
            ],
            spacing: { after: 120 }
        }));
    
            sections.push(new Paragraph({
            children: [
                new TextRun({ text: "9. ENVIRONMENTAL REVIEW: ", bold: true }),
                new TextRun(`Purchaser may, in\nits discretion, obtain a current or revised environmental study of the Property\nat Purchaser’s sole cost and expense.`)
            ],
            spacing: { after: 120 }
        }));
            sections.push(new Paragraph({
            children: [
                new TextRun({ text: "10. FINANCING PERIOD: ", bold: true }),
                new TextRun(`Purchaser’s obligation to purchase shall be subject to Purchaser receiving financing terms and conditions acceptable to Purchaser within [NUMBER OF DAYS FOR FINANCING] (XX) days (“Financing Period”) after the Effective Date of the Agreement. Purchaser may cancel the Agreement and receive full refund of the Deposit at any time prior to the expiration of the Financing Period.`)
            ],
            spacing: { after: 120 }
        }));
            sections.push(new Paragraph({
            children: [
                new TextRun({ text: "11. PRORATIONS: ", bold: true }),
                new TextRun(`Rents, lease commissions, interest, insurance premiums, maintenance expenses, operating expenses, utilities and ad valorem taxes for the year of Closing will be prorated effective as of the date of the Closing. Seller shall give credit to Purchaser at the Closing in the aggregate amount of any security deposits or prepaid rents deposited by tenants with Seller, or otherwise owed to tenants, under leases affecting the Property.`)
            ],
            spacing: { after: 120 }
        }));
            sections.push(new Paragraph({
            children: [
                new TextRun({ text: "12. CLOSING DATE: ", bold: true }),
                new TextRun(`The closing will occur on or before [CLOSING DAYS AFTER FINAINCING PERIOD] ([XX]) days (“Closing Date”) after the end of the Financing Period. Should financing constraints dictate additional time, an additional 30-day extension shall be available upon written request from Purchaser. Such written request shall be made prior to the target closing date.`)
            ],
            spacing: { after: 120 }
        }));
            sections.push(new Paragraph({
            children: [
                new TextRun({ text: "13. CLOSING COSTS: ", bold: true }),
                new TextRun(`The Seller will pay for basic title insurance, transfer taxes, survey and documentary stamps.  Purchaser and Seller will be responsible for their respective legal, accounting, staff and other typical and customary costs and expenses, as more fully described in the Agreement.`)
            ],
            spacing: { after: 120 }
        }));
        
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "14. BROKERAGE FEES: ", bold: true }),
                new TextRun(`Brokerage fees and commissions are to be paid by Seller as per agreement with Seller’s agent.`)
            ],
            spacing: { after: 120 }
        }));
        
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "15. REMOVAL FROM MARKET: ", bold: true }),
                new TextRun(`Seller agrees not to negotiate with respect to, or enter into, any other written agreement or letter of intent for the purchase of, the Property during the period from the mutual execution of this Letter of Intent through the period during which the Agreement is in effect.`)
            ],
            spacing: { after: 120 }
        }));
        
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "16. CONFIDENTIALITY: ", bold: true }),
                new TextRun(`Purchaser and Seller hereby covenant and agree not to disclose the terms, Purchase Price, or any other information related to this potential transaction to anyone other than their respective legal counsel, broker (if any), accountants, title companies, lenders, governmental authorities and internal staff prior to Closing.`)
            ],
            spacing: { after: 120 }
        }));
        
        sections.push(new Paragraph({
            children: [
              new TextRun({ text: "17. SELLER WARRANTIES: ", bold: true }),  
              new TextRun(`Seller warrants and represents to Purchaser that Seller is the sole owner of the Property, including all real estate and improvements thereon, and such ownership interest is not subject to any options, contracts, assignments, or similar agreements relating to ownership of the Property, and no consent or approval of any party is required for Seller to enter into this Letter and to create obligations herein. The foregoing warranty and representation shall survive the termination or expiration of this Letter or any Agreement entered into by Seller and Purchaser.`)
            ],
            spacing: { after: 120 }
        }));
        
        sections.push(new Paragraph({
            children: [
                new TextRun(`This Letter is intended to provide both evidence of a non-binding agreement and guidance in the preparation of a more complete written agreement between the parties. The parties agree to use commercially reasonable efforts to negotiate a more complete agreement, which will supersede this Letter, containing at least the terms contained herein.`)
            ],
            spacing: { after: 120 }
        }));
        
        sections.push(new Paragraph({
            children: [
                new TextRun(`If you are agreeable to the foregoing terms and conditions, please sign and date this letter in the space provided below, and return a signed copy to me, by email or facsimile, on or before 5:00PM, EST on the fifth day after the date of this letter. Upon receipt, we will commence preparation of a draft of the Agreement.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
            children: [
                new TextRun(`The above represents the general terms and conditions of the proposed transaction.  The exact terms and conditions will be contained in the Agreement.`)
            ],
            spacing: { after: 120 }
        }));
sections.push(new Paragraph({
            children: [
                new TextRun(`Should the above proposal be acceptable to you, please execute your signature below and the Purchaser will begin preparation of the Agreement.  Thank you for your consideration and we look forward to the opportunity to work with you on this transaction.`)
            ],
            spacing: { after: 120 }
        }));



        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));

        // Signature blocks for Long Form
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
    } else if (loiType === 'master') { // New condition for Master Lease LOI
        sections.push(new Paragraph({ children: [new TextRun({ text: `RE: Letter of Intent for the Master Lease of “Property Name” and Option to Purchase\n${data.propertyAddress}(“Property”)`, bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun(`Dear ${data.ownerFirst}`)], spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun(
                    `Please find outlined below the general terms and conditions under which ${data.yourName} (“Master Tenant/Purchaser”), would be willing to provide management services to the Property in the form of a master lease contract as well as provide an option to purchase the above referenced Property.`
                ),
            ],
            spacing: { after: 120 },
        }));
        sections.push(new Paragraph({
            children: [
                new TextRun(
                    `This letter will serve as a binding letter of intent between the Owner of Record, (represented by ___________) and ${data.yourName} or its Assignee.`
                ),
            ],
            spacing: { after: 120 },
        }));

        // Master Lease Specific Terms with blank lines
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "TERM: ", bold: true }),
                new TextRun(`The term of this agreement will be for ___________ months with an extension of ____________ months. The extension will be exercisable in the sole discretion of the Master Tenant/Purchaser`)
            ],
            spacing: { after: 120 }
        }));
       

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "RATE: ", bold: true }),
                new TextRun(`The Master Tenant/Purchaser shall pay to the Seller the lesser of $ _______________ or fifty percent of the Net Operating Income on a monthly basis within thirty days following the end of a month.`)
            ],
            spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "SUB-LETTING: ", bold: true }),
                new TextRun(`Master Tenant/Purchaser has the right to sub-let any part of the facility to individual tenants.`)
            ],
            spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "EXPENSES: ", bold: true }),
                new TextRun(`Master Tenant/Purchaser shall pay for the following expenses on a monthly basis:\nManagement Fees\nRepairs and Maintenance costs not to exceed five percent of Gross Collected Rents. Seller shall be responsible for all remaining charges`)
            ],
            spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "MANAGEMENT: ", bold: true }),
                new TextRun(`Master Tenant/Purchase shall be solely responsible for all management responsibilities.`)
            ],
            spacing: { after: 60 }
        }));
        sections.push(new Paragraph({
            children: [
                new TextRun(`Seller shall assign management contract to Master Tenant/Purchaser`)
            ],
            spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "INSURANCE: ", bold: true }),
                new TextRun(`Seller shall be required to carry commercial liability insurance and shall add Master Tenant/Purchaser as additional named insured.`)
            ],
            spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "OPTION PRICE: ", bold: true }),
                new TextRun(`Purchase Price of the Property shall be paid by the following terms and conditions:\nPurchase Price: ${data.purchasePriceFormatted}\nOption Price: _______________\nSeller Financing: _______________ (to be payable by buyer at closing)\nFirst Mortgage: _______________ (assumable)`)
            ],
            spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "OPTION TERM: ", bold: true }),
                new TextRun(`The term of the option shall run concurrently with the term of the Master Lease.`)
            ],
            spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "INSPECTION PERIOD: ", bold: true }),
                new TextRun(`Purchaser shall have forty five (45) days from the date of execution of the Intent to Lease/Option contract to perform inspections and examine the records of the Property. If, for any reason, during this inspection period, Master Tenant/Purchaser shall find the Property unsuitable, the Master Tenant/Purchaser, by written notice to Seller, shall have the right to declare this Letter and any Intent to Lease/Option contract based hereon null and void and receive a refund of any Earnest Money that has been deposited.`)
            ],
            spacing: { after: 120 }
        }));
        
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "EARNEST MONEY DEPOSIT: ", bold: true }),
                new TextRun(`A refundable Earnest Money Deposit in the amount of ${data.earnestMoneyFormatted} will be deposited with the escrow agent within three (3) business days after signing the Lease/Option Contract.`)
            ],
            spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "PURCHASE AGREEMENT: ", bold: true }),
                new TextRun(`Both parties will strive to execute a mutually acceptable Lease/Option Agreement within 15 days after the execution of this Letter of Intent. `)
            ],
            spacing: { after: 120 }
        }));
        
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "BROKERAGE FEES: ", bold: true }),
                new TextRun(`To be paid by Seller as per seller agreement with Seller’s agent.`)
            ],
            spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
            children: [
                new TextRun(`The above represents the general terms and conditions of the proposed transaction. The exact terms and conditions will be contained in a mutually acceptable Purchase Agreement. Should the above proposal be acceptable to you, please execute your signature below and ${data.yourName} will begin preparation of the Lease/Option Agreement.`)
            ],
            spacing: { after: 120 }
        }));
   
        sections.push(new Paragraph({
            children: [
                new TextRun(`Thank you for your consideration and we look forward to the opportunity to work with you on this transaction.`)
            ],
            spacing: { after: 120 }
        }));

        // Signature blocks for Master Lease LOI
        sections.push(new Paragraph({ children: [new TextRun({ text: "BUYER:", bold: true })], spacing: {after: 40} }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ______________________________________________________")], spacing: {after: 40} }));
        sections.push(new Paragraph({ children: [new TextRun(`NAME: ${data.yourName}`)], spacing: {after: 40} }));
        sections.push(new Paragraph({ children: [new TextRun("TITLE: ____________________________________")], spacing: {after: 40} }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ______________________________________________________")], spacing: {after: 40} }));
        sections.push(new Paragraph({ children: [new TextRun("NAME:  ________________________________")], spacing: {after: 40} }));
        sections.push(new Paragraph({ children: [new TextRun("TITLE:  Managing Partner")], spacing: {after: 40} }));

        sections.push(new Paragraph({ children: [new TextRun(`ACKNOWLEDGED AND AGREED TO THIS ${data.currentDate}.`)], spacing: {after: 120} }));

        sections.push(new Paragraph({ children: [new TextRun({ text: "SELLER:", bold: true })], spacing: {after: 40} }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ____________________________________________________")], spacing: {after: 40} }));
        sections.push(new Paragraph({ children: [new TextRun(`NAME: ${data.ownerFullName}`)], spacing: {after: 40} }));
        sections.push(new Paragraph({ children: [new TextRun("TITLE: ____________________________________________________")], spacing: {after: 40} }));

    }
    else { // Original Short Form LOI content
    sections.push(new Paragraph({ children: [new TextRun({ text: `RE: Letter of Intent for ${data.propertyAddress}`, bold: true })], spacing: { after: 40 }, }));
    sections.push(new Paragraph({ spacing: { after: 0 } }));
    sections.push(new Paragraph({ children: [new TextRun(`Dear ${data.ownerFirst},`)], spacing: { after: 120 }, }));
    sections.push(new Paragraph({
        children: [
            new TextRun(
                `Please find outlined below the general terms and conditions under which ${data.yourName} ("Purchaser") would be willing to purchase the above referenced Property. This letter will serve as a non-binding letter of intent between Purchaser or its Assignee, and the Owner of Record ("Seller").`
            ),
        ],
        spacing: { after: 200 },
    }));
    sections.push(new Paragraph({
        children: [
            new TextRun(
                `Let this letter serve as our expression of intent to purchase the above referenced Property under the following terms and conditions:`
            ),
        ],
        spacing: { after: 200 },
    }));
    const loiSectionsContentShortForm = [
            {
              num: "1",
              heading: "PURCHASE PRICE",
                content: `The Purchase Price of the Property shall be: ${data.purchasePriceFormatted}.`
            },
            {
              num: "2",
              heading: "PURCHASE AGREEMENT",
              content: 'Both parties will strive to execute a mutually acceptable Purchase Agreement within ten (10) days after the execution of this Letter of Intent. The date of completion of the signed Purchase Agreement shall be the “Execution Date.”'
            },
            {
              num: "3",
              heading: "EARNEST MONEY DEPOSIT",
              content: `A refundable Earnest Money Deposit ("Deposit") subject to additional terms and conditions further defined in the Agreement of ${data.earnestMoneyFormatted} will be deposited within three (3) business days after the effective date as defined below.`
            },
            {
              num: "4",
              heading: "INSPECTION PERIOD",
              content: 'The effective date ("Effective Date") of the agreement shall be the date on which Purchaser has received from the Seller all of the documents listed in Schedule 1 of this Letter. Purchaser shall have an inspection period of [NUMBER OF DAYS TO INSPECT] (XX) days ("Inspection Period") starting from the Effective Date to inspect the Property and conduct any due diligence deemed necessary by Purchaser. If, for any reason, during this Inspection Period, Purchaser shall find the Property unsuitable, the Purchaser, by written notice to Seller, shall have the right to declare this Letter and any Agreement based hereon null and void and receive a full refund of any Deposit.'
            },
            {
              num: "5",
              heading: "FINANCING PERIOD",
              content: `Purchaser's obligation to purchase shall be subject to Purchaser receiving financing terms and conditions acceptable to Purchaser within [NUMBER OF DAYS FOR FINANCING] (XX) days ("Financing Period") after the Effective Date of the Agreement.  Purchaser may cancel the Agreement and receive a full refund of the Deposit at any time prior to the expiration of the Financing Period.`
            },            
            {
              num: "6",
              heading: "CLOSING DATE",
              content: 'The Closing will occur on or before [CLOSING DAYS AFTER FINANCING PERIOD] (XX) days ("Closing Date") after the end of the Financing Period. Should financing constraints dictate additional time, an additional 30-day extension shall be available upon written request from Purchaser. Such written request shall be made prior to the target closing date.'
            },
            {
              num: "7",
              heading: "CLOSING COSTS",
              content: 'The Seller will pay for basic title insurance, transfer taxes, survey and documentary stamps.'
            },
            {
              num: "8",
              heading: "BROKERAGE FEES",
              content: 'To be paid by Seller as per seller agreement with Seller’s agent.'
            },
            {
              num: "9",
              heading: "GENERAL TERMS",
              content: 'The above represents the general terms and conditions of the proposed transaction. The exact terms and conditions will be contained in a mutually acceptable Purchase Agreement.'
            },
            {
              num: "10",
              heading: "EXECUTION INSTRUCTIONS",
              content: 'Should the above proposal be acceptable to you, please execute your signature below and Purchaser will begin preparation of the Purchase Agreement. Thank you for your consideration and we look forward to the opportunity to work with you on this transaction.'
            }
          ];
        loiSectionsContentShortForm.forEach(section => {
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
    }

    // Schedule 1 is common to both forms (remains outside the conditional)
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    sections.push(new Paragraph({ children: [new TextRun({ text: "SCHEDULE 1", bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 }}));
    sections.push(new Paragraph({ children: [new TextRun("(due diligence information)")], alignment: AlignmentType.CENTER, spacing: { after: 120 }}));
    const scheduleItemsContent = [
        "(a) Copies of ad valorem and personal property tax statements covering the Property for the three (3) years prior to the Effective Date (or the period of time Seller has owned the Real Property, whichever is less) and, if and when available, for the current year, together with a copy of the current year Tax Assessment Notice from applicable appraisal district office.",
        "(b) Copies of all licenses and permits with respect to Seller’s ownership and operation of the Property, including, without limitation, building permits, swimming pool permits, boiler permits, mechanical permits and certificates of occupancy, wind mitigation reports, flood plan certifications.",
        "(c) To the extent that Seller has possession of these items: Copies of as-built engineering and architectural plans. Drawings, specifications, geotechnical subsoil tests or analyses, termite inspection reports, structural reports, foundation reports, and all amendments or changes thereto, and all blueprints, schematics, renderings, architect’s drawings and all other reports, plans or studies held by or for Seller which relate to the Property (collectively, the “Plans”).",
        "(d) Copies of all Leases (including, without limitation, all modifications, amendments, or supplements thereto) in effect with respect to the Property, as a certified rent roll (”Rent Roll”) prepared as of the first day of the month in which the Contract is executed, which Rent Roll shall reflect, as of the date thereof with respect to each tenant occupying the Property or with respect to prospective tenants who have executed leases but have not yet occupied the Property: (i) the space occupied (or to be occupied); (ii) names of tenants, (iii) monthly rent, including escalations; (iv) the amount of the security deposit (and any other deposits) and any prepaid rent or charges; (v) amount of rent in arrearage; (vi) the date through which rent is paid, (vii)the commencement date and the expiration date of the lease term; (viii) any concessions granted which are now effective or which may in the future become effective; and (ix) tenant responsibility for water, sewage and other utility charges. The Rent Roll shall be accompanied by Seller’s signed certificate that the Rent Roll is complete and correct as of the date shown on said Rent Roll, and that there has been no material adverse change with respect to any item shown on the Rent Roll during the period from the date thereof to the date of such certificate.",
        "(e) Copies of all service contracts, landscaping, pool and/or other maintenance agreements, management contracts, warranties, guaranties, or other agreements relating to the Property, including, without limitation, all laundry leases, other equipment leases and particularly all coin-operated vending or other machines.",
        "(f) A reasonably detailed list for the Seller showing the description and approximate quantity of all of Seller’s Personal Property included as part of this transaction, together with copies of any lease, rental, or other agreements with respect to any such Personal Property.",
        "(g) A statement (”Operating Statement”) with respect to the results of the ownership and operation of the Property at least for the period of Seller’s ownership of the Property (and information in Seller’s possession from the previous owner of the Property) and which shall set forth (i) ad valorem taxes for the city, county and state; (ii) insurance premiums for fire, extended coverage, workmen’s compensation, vandalism and malicious mischief, general liability, rent continuation and other forms of insurance; (iii) expenses incurred for water, electricity, natural gas, and other utilities; (iv) total rents and other charges collected and total rents and other charges due from the tenants; (v) management fees paid by Seller; (vi) maintenance, repair, and other expenses relating to the management and operation of the Property; (vii) amounts paid for capital improvements to the Property; and (viii) all other income from the Property or expenses of operation of the Property. The Operating Statement shall be accompanied by Seller’s certificate that said Operating statement is true, complete and correct to Seller’s actual knowledge as of the date provided.",
        "(h) Copies of all correspondence, reports, inspections, and other documents held by or for Seller including, without limitation, and Phase I reports or Phase II reports regarding the environmental aspects of the Property or any toxic or hazardous substances affecting or relating to the Property including, without limitation, any asbestos testing results.",
        "(i) Copies of all geotechnical reports, and soil compaction tests performed by or on behalf of Seller or which Seller has in its possession relating to the Property.",
        "(j) Copies of the most recent MAI or other type of property appraisal on the Property.",
        "(k) Certified copies of the last twelve months of monthly, itemized bank statements regarding operations at the Property."
      ];
    scheduleItemsContent.forEach(item => { sections.push(new Paragraph({ text: item, spacing: { after: 120 } }));
    });
    const doc = new Document({ sections: [{ properties: {}, children: sections, }], });
    Packer.toBlob(doc).then(blob => {
      const safeAddress = data.propertyAddress.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      // Modify filename generation to include LOI type
      let loiTypeString = '';
      if (loiType === 'long') {
          loiTypeString = 'LONG';
      } else if (loiType === 'master') {
          loiTypeString = 'MASTER_LEASE';
      } else {
          loiTypeString = 'SHORT';
      }
      const filename = `LOI_${loiTypeString}_${safeAddress || 'document'}.docx`;
      saveAs(blob, filename);
      //console.log('Document created successfully');
    }).catch(err => { console.error('Error creating document: ', err); });
  };

  if (isLoadingAuth || !isLoggedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl border border-gray-200">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-orange-600 text-center font-sans">Generate a Letter of Intent</h1>
        <p className="text-center text-gray-600 mb-8">Fill in the details below to generate your customized Letter of Intent. Select your version below.</p>

        <form onSubmit={(e) => { e.preventDefault(); generateAndDownloadLOI(); }} className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Your Full Name" name="yourName" value={formData.yourName} onChange={handleChange} placeholder="John Doe" />
              <FormField label="Your Email" name="yourEmail" type="email" value={formData.yourEmail} onChange={handleChange} placeholder="john.doe@example.com" />
              <FormField label="Your Phone Number" name="yourPhone" type="tel" value={formData.yourPhone} onChange={handleChange} placeholder="(123) 456-7890" />
              <FormField label="Your Address" name="yourAddress" value={formData.yourAddress} onChange={handleChange} placeholder="123 Main St" />
              <FormField label="Your City, Zip" name="yourCityZip" value={formData.yourCityZip} onChange={handleChange} placeholder="Anytown, 12345" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Property Information</h2>
            <FormField label="Property Address" name="propertyAddress" value={formData.propertyAddress} onChange={handleChange} placeholder="456 Oak Ave, Anytown, CA 90210" />
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Owner Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Owner First Name" name="ownerFirst" value={formData.ownerFirst} onChange={handleChange} placeholder="Jane" />
              <FormField label="Owner Last Name" name="ownerLast" value={formData.ownerLast} onChange={handleChange} placeholder="Smith" />
              <FormField label="Owner Street Address" name="ownerStreet" value={formData.ownerStreet} onChange={handleChange} placeholder="789 Pine Ln" />
              <FormField label="Owner City" name="ownerCity" value={formData.ownerCity} onChange={handleChange} placeholder="Otherville" />
              <FormField label="Owner State" name="ownerState" value={formData.ownerState} onChange={handleChange} placeholder="NY" />
              <FormField label="Owner Zip Code" name="ownerZip" value={formData.ownerZip} onChange={handleChange} placeholder="67890" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Financial Terms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Purchase Price" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} placeholder="$500,000" />
              <FormField label="Earnest Money Deposit" name="earnestMoney" value={formData.earnestMoney} onChange={handleChange} placeholder="$10,000" />
            </div>
          </section>

          {/* New LOI Type Selection - Radio Buttons */}
          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">LOI Type</h2>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-5 w-5 text-orange-600"
                  name="loiType"
                  value="short"
                  checked={loiType === 'short'}
                  onChange={() => setLoiType('short')}
                />
                <span className="ml-2 text-gray-700 font-medium">Short Form LOI</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-5 w-5 text-orange-600"
                  name="loiType"
                  value="long"
                  checked={loiType === 'long'}
                  onChange={() => setLoiType('long')}
                />
                <span className="ml-2 text-gray-700 font-medium">Long Form LOI</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-5 w-5 text-orange-600"
                  name="loiType"
                  value="master"
                  checked={loiType === 'master'}
                  onChange={() => setLoiType('master')}
                />
                <span className="ml-2 text-gray-700 font-medium">Master Lease LOI</span>
              </label>
            </div>
          </section>

          <button
            type="submit"
            disabled={isLoadingAuth || !isLoggedIn}
            className={`w-full md:w-auto mt-6 text-white py-3 px-6 rounded-lg font-semibold text-lg transition duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-50 ${
              (isLoadingAuth || !isLoggedIn) ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600'
            }`}
          >
            Generate LOI
          </button>
        </form>
      </div>
    </div>
  );
}