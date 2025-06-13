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
 if (!currentUser || userClass === 'charlie_chat') {
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
                    `Please find outlined below the general terms and conditions under which ${data.yourName} (“Purchaser”) would be willing to purchase the above referenced Property. This letter will serve as a non-binding letter of intent between Purchaser or its Assignee, and the Owner of Record (“Seller”).
Let this letter serve as our expression of intent to purchase the above referenced Property under the following terms
and conditions:`
                ),
            ],
            spacing: { after: 200 },
        }));
        // --- LONG FORM LOI CONTENT ---
        sections.push(new Paragraph({
            children: [
                new TextRun(
                    `This Letter of Intent is provided to you to acknowledge the\ninterest and intent of ${data.yourName} to acquire the fee simple interest\nof the Property, on the general terms and conditions set forth below. The terms\nlisted below are not intended to be all-inclusive. Moreover, all of the terms\nand conditions, and all
covenants, warranties and representations between the\nparties relating to this proposed transaction must be reflected in a definitive\nwritten agreement (“Agreement”) executed by all of the parties.`
                ),
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Seller: ", bold: true }),
                new TextRun("Owner of Record")
            ],
            spacing: { after: 60 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 60 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Purchaser: ", bold: true }),
                new TextRun(`${data.yourName}, and/or assigns`)
            ],
            spacing: { after: 60 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 60 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Property: ", bold: true }),
                new TextRun(`${data.propertyAddress}`)
            ],
            spacing: { after: 60 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 60 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Purchase Price: ", bold: true }),
                new TextRun(`[PURCHASE PRICE] The Purchase Price shall not include any liabilities or obligations owed by Seller\nto any person or entities on or before the Closing Date, unless expressly\nassumed in writing by Purchaser.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Earnest Money Deposit: ", bold: true }),
                new TextRun(`[EARNEST MONEY] To be deposited with Title Company within two (2) business days after the\nEffective Date as defined below. The Earnest Money Deposit is fully refundable\nto Purchaser at any time prior to
expiration of the Inspection Period, and any\ntime thereafter only upon Purchaser’s failure to obtain acceptable financing,\nor as a consequence of a default by Seller, or by mutual agreement of the\nparties.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Closing Date: ", bold: true }),
                new TextRun(`The Closing Date\nof this transaction shall occur at the Title Company on or before thirty (30) days\nafter the expiration of the Financing Period or as mutually agreed by the\nparties.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Title Company: ", bold: true }),
                new TextRun("The Title Company will be chosen by the Purchaser.")
            ],
            spacing:
            { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Title Insurance: ", bold: true }),
                new TextRun(`Seller shall\nprovide to Purchaser, at Seller’s expense and Purchaser’s choosing, a standard\nATLA policy of title insurance by Title Company in the amount of the Purchase\nPrice for the Property, insuring that fee simple title
to the Property is\nvested in Purchaser free and clear of all liens and subject only to exceptions\napproved by Purchaser during Inspection Period. Additional costs required to\nobtain an extended coverage policy shall be paid by Purchaser, if Purchaser\nelects coverage.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Survey: ", bold: true }),
                new TextRun(`Seller agrees to\nprovide Purchaser, at Seller’s expense, with a current ALTA survey of Property\nwithin fifteen (15) days following the Effective Date of the Agreement.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Inspection Period: ", bold: true }),
                new TextRun(`Purchaser has\nforty-five (45) days after the Effective Date to complete its due diligence\ninvestigation. Purchaser may cancel the Agreement and escrow at any time during\nthe Inspection Period without cost or penalty by written notice
to Seller. In\nthat event, The Earnest Money Deposit, plus accrued interest thereon, if any,\nshall be immediately refunded to Purchaser by the Title Company.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Due Diligence Information: ", bold: true }),
                new TextRun(`Seller will deliver to\nPurchaser true, correct and complete copies of any and all pertinent records\n(i.e., survey, leases, environmental studies, inspection reports, capital\nimprovement information, title report, zoning information, operating expenses\nand financial reports, rent
rolls, bank accounts and similar information)\nregarding Seller’s ownership and operation of the Property. Such information\nshall include, but not be limited to, the items described on Schedule 1\nattached hereto and made a part hereof. Receipt of Due Diligence Information\nshall be the effective date of the Agreement (“Effective Date”).`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Environmental Review: ", bold: true }),
                new TextRun(`Purchaser may, in\nits discretion, obtain a current or revised environmental study of the Property\nat Purchaser’s sole cost and expense.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Right of Entry: ", bold: true }),
                new TextRun(`Purchaser will\nhave the right to enter the Property with prior reasonable notice, during\nreasonable business hours, for any purpose in connection with its inspection of\nthe Property.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Closing Costs: ", bold: true }),
                new TextRun(`Purchaser and\nSeller will be responsible for their respective legal, accounting, staff and\nother typical and customary costs and expenses, as more fully described in the\nAgreement.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Prorations: ", bold: true }),
                new TextRun(`Rents, lease\ncommissions, interest, insurance premiums, maintenance expenses, operating\nexpenses, utilities and ad valorem taxes for the year of Closing will be\nprorated effective as of the date of the Closing. Seller shall give credit to\nPurchaser at
the Closing in the aggregate amount of any security deposits or\nprepaid rents deposited by tenants with Seller, or otherwise owed to tenants,\nunder leases affecting the Property.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Financing Period Contingency: ", bold: true }),
                new TextRun(`Purchaser’s obligation to\npurchase the Property shall be subject to Purchaser receiving financing terms\nand conditions acceptable to Purchaser within seventy-five (75) days\nafter the Effective Date of the Agreement. Purchaser may cancel the Agreement\nand
receive full refund of the Earnest money deposit at any time prior to the\nexpiration of the Financing Period.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Sales Commission: ", bold: true }),
                new TextRun(`Purchaser has not\nengaged a broker to assist with this transaction. Seller shall be responsible\nfor payment of any buyer’s broker’s commissions owed as a result of the\nproposed transaction.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Removal from Market: ", bold: true }),
                new TextRun(`Seller agrees not\nto negotiate with respect to, or enter into any other written agreement or\nletter of intent for the purchase of, the Property during the period from the\nmutual execution of this Letter
of Intent through the period during which the\nAgreement is in effect.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: "Confidentiality: ", bold: true }),
                new TextRun(`Purchaser and Seller hereby\ncovenant and agree not to disclose the terms, Purchase Price, or any other\ninformation related to this potential transaction to anyone other than their\nrespective legal counsel, broker (if any), accountants, title companies,
lenders,\ngovernmental authorities and internal staff prior to Closing.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun(`Seller warrants and represents to Purchaser that Seller is the\nsole owner of the Property, including all real estate and improvements thereon,\nand such ownership interest is not subject to any options, contracts,\nassignments, or similar agreements relating to ownership of the Property, and\nno consent or approval of any party is required for Seller to enter into this\nLetter of Intent
and to create obligations herein. The foregoing warranty and\nrepresentation shall survive the termination or expiration of this Letter of\nIntent or any Agreement entered into by Seller and Purchaser.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun(`This Letter of Intent is intended to provide both evidence of a\nnon-binding agreement and guidance in the preparation of a more complete\nwritten agreement between the parties. The parties agree to use commercially\nreasonable efforts to negotiate a more complete agreement, which will supersede\nthis Letter of Intent, containing at least the terms contained herein.`)
            ],
            spacing: { after: 120 }
        }));
        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun(`If you are agreeable to the foregoing terms and conditions, please\nsign and date this letter in the space provided below, and return a signed copy\nto me, by email or facsimile, on or before 5:00PM, PST on the fifth day after\nthe date of this letter. Upon receipt, we will commence preparation of a draft\nof the Agreement.`)
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
                    `Please find outlined below the general terms and conditions under which ${data.yourName} (“Purchaser”) would be willing to purchase the above referenced Property. This letter will serve as a non-binding letter of intent between Purchaser or its Assignee, and the Owner of Record (“Seller”).
Let this letter serve as our expression of intent to purchase the above referenced Property under the following terms
and conditions:`
                ),
            ],
            spacing: { after: 200 },
        }));
        const loiSectionsContentShortForm = [
            {
              num: "1",
              heading: "Purchase Price",
                content: `The Purchase Price of the Property shall be paid by the following terms and conditions:\n
\tPurchase Price: ${data.purchasePriceFormatted}\n\n\tEarnest Money Deposit: ${data.earnestMoneyFormatted}` // Using formatted values
            },
            {
              num: "2",
              heading: "Purchase Agreement",
              content: 'Both parties will strive to execute a mutually acceptable Purchase Agreement within fifteen (30) days after the execution of this Letter of Intent. The date of completion of the signed Purchase Agreement shall be the “Execution Date.”'
            },
            {
              num: "3",
              heading: "Earnest Money Deposit",
              content: `A refundable Earnest Money Deposit in the amount of ${data.earnestMoneyFormatted} will be deposited with the Escrow Agent within five (5) business days.`
            },
            {
              num: "4",
              heading: "Inspection Period",
              content: 'The Effective Date shall be the date on which Purchaser has received all of the documents listed in Schedule 1. Purchaser shall have an Inspection Period of thirty (30) days starting from the Effective Date to inspect the property and conduct any due diligence deemed necessary by Purchaser. If, for any reason, during this Inspection Period, Purchaser shall find the Property unsuitable, the Purchaser, by written notice to Seller, shall have the right to declare this Letter and any Purchase Agreement based hereon null and void and receive a full refund of any Earnest Money that has been deposited.'
            },
            {
              num: "5",
              heading: "Closing Date",
              content: 'The Closing will occur on or before thirty (30) days after the end of the Inspection Period. Should financing or other constraints dictate additional time, an additional 30-day extension shall be available upon written request from Purchaser. Such written request shall be made prior to the target closing date.'
            },
            {
              num: "6",
              heading: "Closing Costs",
              content: 'The Seller will pay for basic title insurance, transfer taxes, survey and documentary stamps.'
            },
            {
              num: "7",
              heading: "Brokerage Fees",
              content: 'To be paid by Seller as per seller agreement with Seller’s agent.'
            },
            {
              num: "8",
              heading: "General Terms",
              content: 'The above represents the general terms and conditions of the proposed transaction. The exact terms and conditions will be contained in a mutually acceptable Purchase Agreement.'
            },
            {
              num: "9",
              heading: "Execution Instructions",
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
      console.log('Document created successfully');
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