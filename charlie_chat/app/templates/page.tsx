"use client";

export const dynamic = 'force-dynamic';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, ImageRun, HorizontalPositionAlign, VerticalPositionAlign } from 'docx';
import { saveAs } from 'file-saver';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { useMyPropertiesAccess } from '@/app/my-properties/components/useMyPropertiesAccess';
import * as numberToWords from 'number-to-words';


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
  inspectionPeriod: string;
  financingPeriod: string;
  daysToClose: string;
  propertyAddress: string;
  ownerFirst: string;
  ownerLast: string;
  ownerStreet: string;
  ownerCity: string;
  ownerState: string;
  ownerZip: string;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  street_address: string;
  city: string;
  state: string;
  zipcode: string;
  phone_number: string;
  business_name?: string;
  job_title?: string;
  logo_base64?: string | null;
}

interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  message: string;
}

// Helper function to validate profile completeness
function validateUserProfile(userProfile: UserProfile | null, userEmail: string | undefined): ValidationResult {
  const missingFields: string[] = [];

  if (!userProfile?.first_name?.trim()) missingFields.push("first name");
  if (!userProfile?.last_name?.trim()) missingFields.push("last name");
  if (!userProfile?.street_address?.trim()) missingFields.push("street address");
  if (!userProfile?.city?.trim()) missingFields.push("city");
  if (!userProfile?.state?.trim()) missingFields.push("state");
  if (!userProfile?.zipcode?.trim()) missingFields.push("zipcode");
  if (!userProfile?.phone_number?.trim()) missingFields.push("phone number");
  if (!userEmail?.trim()) missingFields.push("email");

  const isValid = missingFields.length === 0;

  let message = '';
  if (!isValid) {
    message = `Please complete your profile before generating LOI documents. Missing: ${missingFields.join(", ")}.`;
  }

  return { isValid, missingFields, message };
}

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

function Home() {
  const [formData, setFormData] = useState<LOIFormData>({
    yourName: '',
    yourAddress: '',
    yourCityZip: '',
    yourPhone: '',
    yourEmail: '',
    purchasePrice: '',
    earnestMoney: '',
    inspectionPeriod: '',
    financingPeriod: '',
    daysToClose: '',
    propertyAddress: '',
    ownerFirst: '',
    ownerLast: '',
    ownerStreet: '',
    ownerCity: '',
    ownerState: '',
    ownerZip: '',
  });

  const [loiType, setLoiType] = useState<'short' | 'long' | 'master' | 'assumption' | 'financing'>('short'); // Modified to handle five types

  const { user: currentUser, isLoading: isLoadingAuth, supabase } = useAuth();
  const { hasAccess, isLoading: isLoadingAccess } = useMyPropertiesAccess();
  const router = useRouter();

  const isLoggedIn = !!currentUser;

  useEffect(() => {
    if (!isLoadingAuth && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoadingAuth, isLoggedIn, router]);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser || !supabase) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, street_address, city, state, zipcode, phone_number, business_name, job_title, logo_base64")
          .eq("user_id", currentUser.id)
          .single();

        if (error) {
          console.error("Error loading profile:", error);
          setProfileError("Unable to load profile data");
        } else if (data) {
          setUserProfile(data as UserProfile);
        } else {
          setProfileError("Profile not found");
        }
      } catch (error) {
        console.error("Unexpected error loading profile:", error);
        setProfileError("Failed to load profile");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (currentUser) {
      loadProfile();
    } else {
      setIsLoadingProfile(false);
    }
  }, [currentUser, supabase]);
  /******************************************************************
 * Prefill the LOI form when the page is opened with
 * ?propertyId=<uuid> in the URL.  Data are read from saved_properties.
 ******************************************************************/
  const searchParams = useSearchParams();   // already imported at top
  const propertyId = searchParams.get('propertyId');


  useEffect(() => {
    if (!propertyId || !supabase) return;   // nothing to do

    interface SavedProperty {
      address_full: string | null;
      address_city: string | null;
      address_state: string | null;
      address_zip: string | null;
      owner_first_name: string | null;
      owner_last_name: string | null;
      mail_address_street: string | null;
      mail_address_city: string | null;
      mail_address_state: string | null;
      mail_address_zip: string | null;
    }


    const loadSaved = async () => {
      const { data, error } = await supabase
        .from('saved_properties')
        .select(`
        address_full,
        address_city,
        address_state,
        address_zip,
        owner_first_name,
        owner_last_name,
        mail_address_street,
        mail_address_city,
        mail_address_state,
        mail_address_zip
      `)
        .eq('property_id', propertyId)
        .single();

      if (error || !data) {
        console.warn('saved_properties lookup failed:', error);
        return;
      }

      const propAddr = [
        data.address_full,
        data.address_city,
        data.address_state,
        data.address_zip,
      ].filter(Boolean).join(', ');

      setFormData(prev => ({
        ...prev,
        propertyAddress: propAddr,
        ownerFirst: data.owner_first_name ?? '',
        ownerLast: data.owner_last_name ?? '',
        ownerStreet: data.mail_address_street ?? '',
        ownerCity: data.mail_address_city ?? '',
        ownerState: data.mail_address_state ?? '',
        ownerZip: data.mail_address_zip ?? '',
      }));
    };

    loadSaved();
  }, [propertyId, supabase]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const generateAndDownloadLOI = async () => {
    if (!hasAccess) {
      notify(
        'For access to my proven templates and other features, upgrade to Charlie Chat Pro!'
      );
      return;
    }

    if (!isLoggedIn) {
      const errorMessage = "Authentication error. Please ensure you are signed in.";
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error(errorMessage);
      } else {
        alert(errorMessage);
      }
      return;
    }


    // 🛑 Validate profile completeness
    const validation = validateUserProfile(userProfile, currentUser?.email);

    if (!validation.isValid) {
      console.warn('Profile validation failed:', validation.message);

      // Show toast error notification
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error(validation.message);
      } else {
        alert(validation.message);
      }
      return;
    }

    // Check if profile is still loading
    if (isLoadingProfile) {
      const loadingMessage = "Profile data is still loading. Please try again in a moment.";
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error(loadingMessage);
      } else {
        alert(loadingMessage);
      }
      return;
    }

    // Check for profile errors
    if (profileError) {
      const errorMessage = `Cannot generate LOI: ${profileError}. Please complete your profile first.`;
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error(errorMessage);
      } else {
        alert(errorMessage);
      }
      return;
    }

    try {
      const inspectionDays = Math.min(Number(formData.inspectionPeriod) || 30, 999);
      const financingDays = Math.min(Number(formData.financingPeriod) || 45, 999);
      const closeDays = Math.min(Number(formData.daysToClose) || 30, 999);

      const data = {
        ...formData,
        yourName: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : '',
        yourAddress: userProfile?.street_address || '',
        yourCityZip: userProfile ? `${userProfile.city}, ${userProfile.state} ${userProfile.zipcode}` : '',
        yourPhone: userProfile?.phone_number?.replace(/(\d{3})(\d{3})(\d{4})/, '$1.$2.$3') || '',
        yourEmail: currentUser.email || '',
        businessName: userProfile?.business_name || null,
        logoBase64: userProfile?.logo_base64 || null,
        jobTitle: userProfile?.job_title || null,
        yourPhoneFormatted: formatPhoneJS(userProfile?.phone_number?.replace(/(\d{3})(\d{3})(\d{4})/, '$1.$2.$3') || ''),
        purchasePriceFormatted: formatCurrencyJS(formData.purchasePrice),
        earnestMoneyFormatted: formatCurrencyJS(formData.earnestMoney),
        currentDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        ownerFullName: `${formData.ownerFirst} ${formData.ownerLast}`.trim(),
        ownerCityStateZip: `${formData.ownerCity}, ${formData.ownerState} ${formData.ownerZip}`.trim(),
        inspectionPeriodText: `${numberToWords.toWords(inspectionDays)} (${inspectionDays})`,
        financingPeriodText: `${numberToWords.toWords(financingDays)} (${financingDays})`,
        daysToCloseText: `${numberToWords.toWords(closeDays)} (${closeDays})`
      };

      const tightParagraphConfig = {
        spacing: { after: 40 },
        line: 240 * 1.0,
      };

      const sections: Paragraph[] = [];

      // — Logo (if present) —
      if (data.logoBase64) {
        try {
          const logoBuffer = base64ToBuffer(data.logoBase64);
          const imageType = detectImageType(data.logoBase64);

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
                    top: 480,
                    bottom: 240, // Space below logo
                  },
                },
              }),
            ],
          });
          sections.push(logoParagraph);
        } catch (error) {
          console.error('Error processing logo:', error);
          // Continue without logo if there's an error
        }
      }

      // Common introductory sections (always included)
      sections.push(new Paragraph({ children: [new TextRun(data.yourName)], ...tightParagraphConfig }));
      if (data.businessName) {
        sections.push(new Paragraph({ children: [new TextRun(data.businessName)], ...tightParagraphConfig }));
      }
      sections.push(new Paragraph({ children: [new TextRun(data.yourAddress)], ...tightParagraphConfig }));
      sections.push(new Paragraph({ children: [new TextRun(data.yourCityZip)], ...tightParagraphConfig }));
      sections.push(new Paragraph({ children: [new TextRun(data.yourPhoneFormatted)], ...tightParagraphConfig }));
      sections.push(new Paragraph({ children: [new TextRun(data.yourEmail || '')], ...tightParagraphConfig }));
      sections.push(new Paragraph({ spacing: { after: 120 } }));
      sections.push(new Paragraph({ text: data.currentDate, spacing: { after: 240 } }));
      sections.push(new Paragraph({ spacing: { after: 120 } }));
      sections.push(new Paragraph({ children: [new TextRun(data.ownerFullName)], ...tightParagraphConfig }));
      sections.push(new Paragraph({ children: [new TextRun(data.ownerStreet)], ...tightParagraphConfig }));
      sections.push(new Paragraph({ children: [new TextRun(data.ownerCityStateZip)], ...tightParagraphConfig }));
      sections.push(new Paragraph({ spacing: { after: 120 } }));

      // Conditional content based on LOI type
      if (loiType === 'long') { // Changed from longFormLOI
        sections.push(new Paragraph({ children: [new TextRun({ text: `RE: Letter of Intent for ${data.propertyAddress} ("Property")`, bold: true })], spacing: { after: 40 }, }));
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
            new TextRun(`The title company will be chosen by the Purchaser. Seller shall provide to Purchaser, at Seller's expense and Purchaser's choosing, a standard ALTA policy of title insurance by Title Company in the amount of the Purchase Price for the Property, insuring fee simple title to the Property is vested in Purchaser free and clear of all liens and subject only to exceptions approved by Purchaser during Inspection Period. Additional costs required to obtain an extended coverage policy shall be paid by Purchaser, if Purchaser elects coverage.`)
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
            new TextRun(`The effective date ("Effective Date") of the Agreement shall be the date on which Purchaser has received from the Seller all of the documents listed in Schedule 1 of this Letter. Purchaser shall have an inspection period of ${data.inspectionPeriodText} days ("Inspection Period") starting from the Effective Date to inspect the Property and conduct any due diligence deemed necessary by Purchaser. If, for any reason, during this Inspection Period, Purchaser shall find the Property unsuitable, the Purchaser, by written notice to Seller, shall have the right to declare this Letter and any Agreement based hereon null and void and receive a full refund of any Deposit.`)
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
            new TextRun(`Purchaser’s obligation to purchase shall be subject to Purchaser receiving financing terms and conditions acceptable to Purchaser within ${data.financingPeriodText} days (“Financing Period”) after the Effective Date of the Agreement. Purchaser may cancel the Agreement and receive full refund of the Deposit at any time prior to the expiration of the Financing Period.`)
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
            new TextRun(`The closing will occur on or before ${data.daysToCloseText} days (“Closing Date”) after the end of the Financing Period. Should financing constraints dictate additional time, an additional 30-day extension shall be available upon written request from Purchaser. Such written request shall be made prior to the target closing date.`)
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
        sections.push(new Paragraph({ children: [new TextRun({ text: "PURCHASER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ______________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.yourName)], spacing: { after: 40 } }));
        if (data.jobTitle) {
          sections.push(new Paragraph({ children: [new TextRun(data.jobTitle)], spacing: { after: 40 } }));
        }
        if (data.businessName) {
          sections.push(new Paragraph({ children: [new TextRun(data.businessName)], spacing: { after: 40 } }));
        }
        sections.push(new Paragraph({ children: [new TextRun(data.yourAddress)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.yourCityZip)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun(`ACKNOWLEDGED AND AGREED TO THIS ${data.currentDate}.`)], spacing: { after: 120 } }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "SELLER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ____________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.ownerFullName)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("Owner")], spacing: { after: 40 } }));

      } else if (loiType === 'financing') { // financing LOI
        sections.push(new Paragraph({ children: [new TextRun({ text: `RE: Letter of Intent for ${data.propertyAddress} ("Property")`, bold: true })], spacing: { after: 40 }, }));
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
        // --- FINANCING FORM LOI CONTENT ---
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
            new TextRun({ text: "2. SELLER FINANCING: ", bold: true }),
            new TextRun(`The Seller agrees to provide financing to the Purchaser in a form that is satisfactory to the first position lender to the Property and to the Purchaser. The terms of the financing shall be:`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun(`a.\tAmount:\t\t[AMOUNT OF SELLER FINANCING]`)
          ],
          spacing: { after: 60 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun(`b.\tInterest Rate:\t[INTEREST RATE]`)
          ],
          spacing: { after: 60 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun(`c.\tTerm:\t\t[TERM OF FINANCING]`)
          ],
          spacing: { after: 60 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun(`d.\tInterest Only:\t____ Y  ____ N`)
          ],
          spacing: { after: 60 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun(`e.\tAmortization:\t[PERIOD OF AMORTIZATION]`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "3. PURCHASE AGREEMENT: ", bold: true }),
            new TextRun(`Both parties will strive to execute a mutually acceptable purchase and sale agreement ("Agreement") within ten (10) days after the execution of this Letter.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "4. EARNEST MONEY DEPOSIT: ", bold: true }),
            new TextRun(`A refundable Earnest Money Deposit ("Deposit") subject to additional terms and conditions further defined in the Agreement of ${data.earnestMoneyFormatted} will be deposited within three (3) business days after the effective date as defined below.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "5. TITLE INSURANCE: ", bold: true }),
            new TextRun(`The title company will be chosen by the Purchaser. Seller shall provide to Purchaser, at Seller's expense and Purchaser's choosing, a standard ALTA policy of title insurance by Title Company in the amount of the Purchase Price for the Property, insuring fee simple title to the Property is vested in Purchaser free and clear of all liens and subject only to exceptions approved by Purchaser during Inspection Period. Additional costs required to obtain an extended coverage policy shall be paid by Purchaser, if Purchaser elects coverage.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "6. SURVEY: ", bold: true }),
            new TextRun("Seller agrees to provide Purchaser, at Seller’s expense, with a current ALTA survey of Property within fifteen (15) days following the execution of the Agreement.")
          ],
          spacing:
            { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "7. INSPECTION PERIOD: ", bold: true }),
            new TextRun(`The effective date ("Effective Date") of the Agreement shall be the date on which Purchaser has received from the Seller all of the documents listed in Schedule 1 of this Letter. Purchaser shall have an inspection period of ${data.inspectionPeriodText} days ("Inspection Period") starting from the Effective Date to inspect the Property and conduct any due diligence deemed necessary by Purchaser. If, for any reason, during this Inspection Period, Purchaser shall find the Property unsuitable, the Purchaser, by written notice to Seller, shall have the right to declare this Letter and any Agreement based hereon null and void and receive a full refund of any Deposit.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "8. RIGHT OF ENTRY: ", bold: true }),
            new TextRun(`Purchaser will have the right to enter the Property with prior reasonable notice, during reasonable business hours, for any purpose in connection with its inspection of the Property at any time that the Agreement is in effect.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "9. DUE DILIGENCE INFORMATION: ", bold: true }),
            new TextRun(`Seller will deliver to Purchaser true, correct and complete copies of any and all pertinent records (i.e., survey, leases, environmental studies, inspection reports, capital improvement information, title report, zoning information, operating expenses and financial reports, rent rolls, bank accounts and similar information) regarding Seller’s ownership and operation of the Property. Such information shall include, but not be limited to, the items described on Schedule 1 attached hereto and made a part hereof.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "10. ENVIRONMENTAL REVIEW: ", bold: true }),
            new TextRun(`Purchaser may, in\nits discretion, obtain a current or revised environmental study of the Property\nat Purchaser’s sole cost and expense.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "11. FINANCING PERIOD: ", bold: true }),
            new TextRun(`Purchaser’s obligation to purchase shall be subject to Purchaser receiving financing terms and conditions acceptable to Purchaser within ${data.financingPeriodText} days (“Financing Period”) after the Effective Date of the Agreement. Purchaser may cancel the Agreement and receive full refund of the Deposit at any time prior to the expiration of the Financing Period.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "12. PRORATIONS: ", bold: true }),
            new TextRun(`Rents, lease commissions, interest, insurance premiums, maintenance expenses, operating expenses, utilities and ad valorem taxes for the year of Closing will be prorated effective as of the date of the Closing. Seller shall give credit to Purchaser at the Closing in the aggregate amount of any security deposits or prepaid rents deposited by tenants with Seller, or otherwise owed to tenants, under leases affecting the Property.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "13. CLOSING DATE: ", bold: true }),
            new TextRun(`The closing will occur on or before ${data.daysToCloseText} days (“Closing Date”) after the end of the Financing Period. Should financing constraints dictate additional time, an additional 30-day extension shall be available upon written request from Purchaser. Such written request shall be made prior to the target closing date.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "14. CLOSING COSTS: ", bold: true }),
            new TextRun(`The Seller will pay for basic title insurance, transfer taxes, survey and documentary stamps.  Purchaser and Seller will be responsible for their respective legal, accounting, staff and other typical and customary costs and expenses, as more fully described in the Agreement.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "15. BROKERAGE FEES: ", bold: true }),
            new TextRun(`Brokerage fees and commissions are to be paid by Seller as per agreement with Seller’s agent.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "16. REMOVAL FROM MARKET: ", bold: true }),
            new TextRun(`Seller agrees not to negotiate with respect to, or enter into, any other written agreement or letter of intent for the purchase of, the Property during the period from the mutual execution of this Letter of Intent through the period during which the Agreement is in effect.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "17. CONFIDENTIALITY: ", bold: true }),
            new TextRun(`Purchaser and Seller hereby covenant and agree not to disclose the terms, Purchase Price, or any other information related to this potential transaction to anyone other than their respective legal counsel, broker (if any), accountants, title companies, lenders, governmental authorities and internal staff prior to Closing.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "18. SELLER WARRANTIES: ", bold: true }),
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

        // Signature blocks for Financing Form
        sections.push(new Paragraph({ children: [new TextRun({ text: "PURCHASER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ______________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.yourName)], spacing: { after: 40 } }));
        if (data.jobTitle) {
          sections.push(new Paragraph({ children: [new TextRun(data.jobTitle)], spacing: { after: 40 } }));
        }
        if (data.businessName) {
          sections.push(new Paragraph({ children: [new TextRun(data.businessName)], spacing: { after: 40 } }));
        }
        sections.push(new Paragraph({ children: [new TextRun(data.yourAddress)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.yourCityZip)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun(`ACKNOWLEDGED AND AGREED TO THIS ${data.currentDate}.`)], spacing: { after: 120 } }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "SELLER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ____________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.ownerFullName)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("Owner")], spacing: { after: 40 } }));

      } else if (loiType === 'assumption') { // NEW ASSUMPTION LOI SECTION
        sections.push(new Paragraph({ children: [new TextRun({ text: `RE: Letter of Intent for ${data.propertyAddress} ("Property")`, bold: true })], spacing: { after: 40 }, }));
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

        // --- ASSUMPTION LOI CONTENT (Initially identical to long form) ---
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
            new TextRun(`The title company will be chosen by the Purchaser. Seller shall provide to Purchaser, at Seller's expense and Purchaser's choosing, a standard ALTA policy of title insurance by Title Company in the amount of the Purchase Price for the Property, insuring fee simple title to the Property is vested in Purchaser free and clear of all liens and subject only to exceptions approved by Purchaser during Inspection Period. Additional costs required to obtain an extended coverage policy shall be paid by Purchaser, if Purchaser elects coverage.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "5. SURVEY: ", bold: true }),
            new TextRun("Seller agrees to provide Purchaser, at Seller's expense, with a current ALTA survey of Property within fifteen (15) days following the execution of the Agreement.")
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "6. INSPECTION PERIOD: ", bold: true }),
            new TextRun(`The effective date ("Effective Date") of the Agreement shall be the date on which Purchaser has received from the Seller all of the documents listed in Schedule 1 of this Letter. Purchaser shall have an inspection period of ${data.inspectionPeriodText} days ("Inspection Period") starting from the Effective Date to inspect the Property and conduct any due diligence deemed necessary by Purchaser. If, for any reason, during this Inspection Period, Purchaser shall find the Property unsuitable, the Purchaser, by written notice to Seller, shall have the right to declare this Letter and any Agreement based hereon null and void and receive a full refund of any Deposit.`)
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
            new TextRun(`Seller will deliver to Purchaser true, correct and complete copies of any and all pertinent records (i.e., survey, leases, environmental studies, inspection reports, capital improvement information, title report, zoning information, operating expenses and financial reports, rent rolls, bank accounts and similar information) regarding Seller's ownership and operation of the Property. Such information shall include, but not be limited to, the items described on Schedule 1 attached hereto and made a part hereof.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "9. ENVIRONMENTAL REVIEW: ", bold: true }),
            new TextRun(`Purchaser may, in its discretion, obtain a current or revised environmental study of the Property at Purchaser's sole cost and expense.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "10. FINANCING PERIOD: ", bold: true }),
            new TextRun(`Purchaser's obligation to purchase shall be subject to Purchaser receiving financing terms and conditions acceptable to Purchaser within ${data.financingPeriodText} days ("Financing Period") after the Effective Date of the Agreement. Purchaser may cancel the Agreement and receive full refund of the Deposit at any time prior to the expiration of the Financing Period.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "11. ASSUMPTION OF EXISTING LOAN: ", bold: true }),
            new TextRun(`In the event written approval of the lender to the loan assumption is not obtained in writing on or before fifteen (15) days after the end of the Inspection Period, or if the lender notifies Seller or Purchaser of its disapproval of the loan assumption, and so long as Purchaser has supplied all requested information to the lender and used best efforts to obtain lender approval, Purchaser may terminate the Agreement by written notice to Seller and the Deposit shall be returned to Purchaser, and neither party shall thereafter have any obligations one to the other except for obligations which expressly survive termination of the Agreement.  If lender approves the loan assumption, but imposes economic requirements as an additional financial obligation of Purchaser, then Purchaser shall advise Seller of such requirement and Seller and Purchaser shall attempt in good faith to allocate the responsibility for such obligation between them, failing which, Purchaser may terminate the Agreement at any time by written notice to Seller as set forth above.  If lender approves the loan assumption, but imposes no additional economic requirements, then Purchaser has no termination right, this condition shall be deemed satisfied and the Deposit shall be released to Seller immediately after the expiration of the Financing Period or on the date lender approval is obtained, whichever is earlier and subject to any additional obligations of the parties as described in the Agreement.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "12. CAPITAL RESERVE ACCOUNT: ", bold: true }),
            new TextRun(`Seller agrees to transfer all funds currently being held by the lender in the capital reserve account (“Account”) of the Property to the Purchaser or in the alternative, bring the value of the Account to zero dollars before the Closing Date.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "13. PRORATIONS: ", bold: true }),
            new TextRun(`Rents, lease commissions, interest, insurance premiums, maintenance expenses, operating expenses, utilities and ad valorem taxes for the year of Closing will be prorated effective as of the date of the Closing. Seller shall give credit to Purchaser at the Closing in the aggregate amount of any security deposits or prepaid rents deposited by tenants with Seller, or otherwise owed to tenants, under leases affecting the Property.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "14. CLOSING DATE: ", bold: true }),
            new TextRun(`The closing will occur on or before ${data.daysToCloseText} days ("Closing Date") after the end of the Financing Period. Should financing constraints dictate additional time, an additional 30-day extension shall be available upon written request from Purchaser. Such written request shall be made prior to the target closing date.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "15. CLOSING COSTS: ", bold: true }),
            new TextRun(`The Seller will pay for basic title insurance, transfer taxes, survey and documentary stamps. Purchaser and Seller will be responsible for their respective legal, accounting, staff and other typical and customary costs and expenses, as more fully described in the Agreement.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "16. BROKERAGE FEES: ", bold: true }),
            new TextRun(`Brokerage fees and commissions are to be paid by Seller as per agreement with Seller's agent.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "17. REMOVAL FROM MARKET: ", bold: true }),
            new TextRun(`Seller agrees not to negotiate with respect to, or enter into, any other written agreement or letter of intent for the purchase of, the Property during the period from the mutual execution of this Letter of Intent through the period during which the Agreement is in effect.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "18. CONFIDENTIALITY: ", bold: true }),
            new TextRun(`Purchaser and Seller hereby covenant and agree not to disclose the terms, Purchase Price, or any other information related to this potential transaction to anyone other than their respective legal counsel, broker (if any), accountants, title companies, lenders, governmental authorities and internal staff prior to Closing.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({
          children: [
            new TextRun({ text: "19. SELLER WARRANTIES: ", bold: true }),
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
            new TextRun(`The above represents the general terms and conditions of the proposed transaction. The exact terms and conditions will be contained in the Agreement.`)
          ],
          spacing: { after: 120 }
        }));
        sections.push(new Paragraph({
          children: [
            new TextRun(`Should the above proposal be acceptable to you, please execute your signature below and the Purchaser will begin preparation of the Agreement. Thank you for your consideration and we look forward to the opportunity to work with you on this transaction.`)
          ],
          spacing: { after: 120 }
        }));

        sections.push(new Paragraph({ text: "", spacing: { after: 120 } }));

        // Signature blocks for Assumption LOI
        sections.push(new Paragraph({ children: [new TextRun({ text: "PURCHASER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ______________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.yourName)], spacing: { after: 40 } }));
        if (data.jobTitle) {
          sections.push(new Paragraph({ children: [new TextRun(data.jobTitle)], spacing: { after: 40 } }));
        }
        if (data.businessName) {
          sections.push(new Paragraph({ children: [new TextRun(data.businessName)], spacing: { after: 40 } }));
        }
        sections.push(new Paragraph({ children: [new TextRun(data.yourAddress)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.yourCityZip)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun(`ACKNOWLEDGED AND AGREED TO THIS ${data.currentDate}.`)], spacing: { after: 120 } }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "SELLER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ____________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.ownerFullName)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("Owner")], spacing: { after: 40 } }));



      } else if (loiType === 'master') { // New condition for Master Lease LOI
        sections.push(new Paragraph({ children: [new TextRun({ text: `RE: Letter of Intent for the Master Lease of “Property Name” and Option to Purchase\n${data.propertyAddress} (“Property”)`, bold: true })], spacing: { after: 40 } }));
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
            new TextRun(`Purchaser shall have ${data.inspectionPeriodText} days from the date of execution of the Intent to Lease/Option contract to perform inspections and examine the records of the Property. If, for any reason, during this inspection period, Master Tenant/Purchaser shall find the Property unsuitable, the Master Tenant/Purchaser, by written notice to Seller, shall have the right to declare this Letter and any Intent to Lease/Option contract based hereon null and void and receive a refund of any Earnest Money that has been deposited.`)
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
        sections.push(new Paragraph({ children: [new TextRun({ text: "BUYER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ______________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(`NAME: ${data.yourName}`)], spacing: { after: 40 } }));
        if (data.jobTitle) {
          sections.push(new Paragraph({ children: [new TextRun(`TITLE: ${data.jobTitle}`)], spacing: { after: 40 } }));
        } else {
          sections.push(new Paragraph({ children: [new TextRun("TITLE: ____________________________________")], spacing: { after: 40 } }));
        }
        if (data.businessName) {
          sections.push(new Paragraph({ children: [new TextRun(`COMPANY: ${data.businessName}`)], spacing: { after: 40 } }));
        }

        sections.push(new Paragraph({ spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(`ACKNOWLEDGED AND AGREED TO THIS ${data.currentDate}.`)], spacing: { after: 120 } }));

        sections.push(new Paragraph({ children: [new TextRun({ text: "SELLER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ____________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(`NAME: ${data.ownerFullName}`)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("TITLE: ____________________________________________________")], spacing: { after: 40 } }));

      }
      else { // Original Short Form LOI content
        sections.push(new Paragraph({ children: [new TextRun({ text: `RE: Letter of Intent for ${data.propertyAddress} ("Property")`, bold: true })], spacing: { after: 40 }, }));
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
            content: `The effective date ("Effective Date") of the agreement shall be the date on which Purchaser has received from the Seller all of the documents listed in Schedule 1 of this Letter. Purchaser shall have an inspection period of ${data.inspectionPeriodText} days ("Inspection Period") starting from the Effective Date to inspect the Property and conduct any due diligence deemed necessary by Purchaser. If, for any reason, during this Inspection Period, Purchaser shall find the Property unsuitable, the Purchaser, by written notice to Seller, shall have the right to declare this Letter and any Agreement based hereon null and void and receive a full refund of any Deposit.`
          },

          {
            num: "5",
            heading: "FINANCING PERIOD",
            content: `Purchaser's obligation to purchase shall be subject to Purchaser receiving financing terms and conditions acceptable to Purchaser within ${data.financingPeriodText} days ("Financing Period") after the Effective Date of the Agreement.  Purchaser may cancel the Agreement and receive a full refund of the Deposit at any time prior to the expiration of the Financing Period.`
          },
          {
            num: "6",
            heading: "CLOSING DATE",
            content: `The Closing will occur on or before ${data.daysToCloseText} days ("Closing Date") after the end of the Financing Period. Should financing constraints dictate additional time, an additional 30-day extension shall be available upon written request from Purchaser. Such written request shall be made prior to the target closing date.`
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
            children: [new TextRun(`${section.num}. `), new TextRun({ text: `${section.heading}: `, bold: true }), new TextRun(section.content),],
            spacing: { after: 120 },
          }));
        });
        sections.push(new Paragraph({ spacing: { after: 120 } }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "PURCHASER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ______________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.yourName)], spacing: { after: 40 } }));
        if (data.jobTitle) {
          sections.push(new Paragraph({ children: [new TextRun(data.jobTitle)], spacing: { after: 40 } }));
        }
        if (data.businessName) {
          sections.push(new Paragraph({ children: [new TextRun(data.businessName)], spacing: { after: 40 } }));
        }
        sections.push(new Paragraph({ children: [new TextRun(data.yourAddress)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.yourCityZip)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun(`ACKNOWLEDGED AND AGREED TO THIS ${data.currentDate}.`)], spacing: { after: 120 } }));
        sections.push(new Paragraph({ spacing: { after: 0 } }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "SELLER:", bold: true })], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("BY:    ____________________________________________________")], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun(data.ownerFullName)], spacing: { after: 40 } }));
        sections.push(new Paragraph({ children: [new TextRun("Owner")], spacing: { after: 40 } }));
      }

      // Schedule 1 is common to both forms (remains outside the conditional)
      sections.push(new Paragraph({ children: [new PageBreak()] }));
      sections.push(new Paragraph({ children: [new TextRun({ text: "SCHEDULE 1", bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }));
      sections.push(new Paragraph({ children: [new TextRun("(due diligence information)")], alignment: AlignmentType.CENTER, spacing: { after: 120 } }));
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
      scheduleItemsContent.forEach(item => {
        sections.push(new Paragraph({ text: item, spacing: { after: 120 } }));
      });
      const doc = new Document({ sections: [{ properties: {}, children: sections }] });

      const blob = await Packer.toBlob(doc);
      const safeAddress = data.propertyAddress.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

      // Modify filename generation to include LOI type
      let loiTypeString = '';
      if (loiType === 'long') {
        loiTypeString = 'LONG';
      } else if (loiType === 'master') {
        loiTypeString = 'MASTER_LEASE';
      } else if (loiType === 'assumption') {
        loiTypeString = 'ASSUMPTION';
      } else if (loiType === 'financing') {
        loiTypeString = 'FINANCING';
      } else {
        loiTypeString = 'SHORT';
      }
      const filename = `LOI_${loiTypeString}_${safeAddress || 'document'}.docx`;
      saveAs(blob, filename);

      // Show success toast
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success('LOI document generated successfully!');
      }

    } catch (error) {
      console.error('Error generating LOI document:', error);

      const errorMessage = 'An error occurred while generating the LOI document. Please try again.';

      // Show error toast
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error(errorMessage);
      } else {
        alert(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl border border-gray-200">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-orange-600 text-center font-sans">Generate a Letter of Intent</h1>
        <p className="text-center text-gray-600 mb-8">Choose your LOI type and fill in the details to generate your customized document.</p>

        {/* LOI Type Selection - Moved to Top with Card Design */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Short Form Card */}
            <label className={`relative flex flex-col p-6 rounded-lg border-2 cursor-pointer transition-all h-full ${loiType === 'short' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <input
                type="radio"
                className="sr-only"
                name="loiType"
                value="short"
                checked={loiType === 'short'}
                onChange={() => setLoiType('short')}
              />
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-gray-800">Short Form</span>
                <div className={`w-5 h-5 rounded-full border-2 ${loiType === 'short' ? 'border-orange-500 bg-orange-500' : 'border-gray-400'
                  }`}>
                  {loiType === 'short' && (
                    <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">Quick and simple LOI covering essential terms. Best for straightforward deals.</p>
            </label>

            {/* Long Form Card */}
            <label className={`relative flex flex-col p-6 rounded-lg border-2 cursor-pointer transition-all h-full ${loiType === 'long' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <input
                type="radio"
                className="sr-only"
                name="loiType"
                value="long"
                checked={loiType === 'long'}
                onChange={() => setLoiType('long')}
              />
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-gray-800">Long Form</span>
                <div className={`w-5 h-5 rounded-full border-2 ${loiType === 'long' ? 'border-orange-500 bg-orange-500' : 'border-gray-400'
                  }`}>
                  {loiType === 'long' && (
                    <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">Comprehensive LOI with detailed terms, warranties, and protections. Ideal for complex transactions.</p>
            </label>

            {/* Master Lease Card */}
            <label className={`relative flex flex-col p-6 rounded-lg border-2 cursor-pointer transition-all h-full ${loiType === 'master' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <input
                type="radio"
                className="sr-only"
                name="loiType"
                value="master"
                checked={loiType === 'master'}
                onChange={() => setLoiType('master')}
              />
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-gray-800">Master Lease</span>
                <div className={`w-5 h-5 rounded-full border-2 ${loiType === 'master' ? 'border-orange-500 bg-orange-500' : 'border-gray-400'
                  }`}>
                  {loiType === 'master' && (
                    <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">Master lease agreement with option to purchase. Perfect for lease-to-own strategies.</p>
            </label>

            {/* Assumption Card */}
            <label className={`relative flex flex-col p-6 rounded-lg border-2 cursor-pointer transition-all h-full ${loiType === 'assumption' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <input
                type="radio"
                className="sr-only"
                name="loiType"
                value="assumption"
                checked={loiType === 'assumption'}
                onChange={() => setLoiType('assumption')}
              />
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-gray-800">Assumption</span>
                <div className={`w-5 h-5 rounded-full border-2 ${loiType === 'assumption' ? 'border-orange-500 bg-orange-500' : 'border-gray-400'
                  }`}>
                  {loiType === 'assumption' && (
                    <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">For assuming existing loans. Includes lender approval contingencies and capital reserves.</p>
            </label>

            {/* Financing Card */}
            <label className={`relative flex flex-col p-6 rounded-lg border-2 cursor-pointer transition-all h-full ${loiType === 'financing' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <input
                type="radio"
                className="sr-only"
                name="loiType"
                value="financing"
                checked={loiType === 'financing'}
                onChange={() => setLoiType('financing')}
              />
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-gray-800">Seller Financing</span>
                <div className={`w-5 h-5 rounded-full border-2 ${loiType === 'financing' ? 'border-orange-500 bg-orange-500' : 'border-gray-400'
                  }`}>
                  {loiType === 'financing' && (
                    <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">Includes seller financing terms. Great for deals requiring creative financing solutions.</p>
            </label>
          </div>
        </section>

        <form onSubmit={(e) => { e.preventDefault(); generateAndDownloadLOI(); }} className="space-y-6">


          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Owner Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Owner First Name" name="ownerFirst" value={formData.ownerFirst} onChange={handleChange} placeholder="" />
              <FormField label="Owner Last Name" name="ownerLast" value={formData.ownerLast} onChange={handleChange} placeholder="" />
              <FormField label="Owner Street Address" name="ownerStreet" value={formData.ownerStreet} onChange={handleChange} placeholder="" />
              <FormField label="Owner City" name="ownerCity" value={formData.ownerCity} onChange={handleChange} placeholder="" />
              <FormField label="Owner State" name="ownerState" value={formData.ownerState} onChange={handleChange} placeholder="" />
              <FormField label="Owner Zip Code" name="ownerZip" value={formData.ownerZip} onChange={handleChange} placeholder="" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Offer Terms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Purchase Price" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} placeholder="" />
              <FormField label="Earnest Money Deposit" name="earnestMoney" value={formData.earnestMoney} onChange={handleChange} placeholder="" />
              <FormField label="Inspection Period (in days)" name="inspectionPeriod" value={formData.inspectionPeriod} onChange={handleChange} placeholder="" />
              <FormField label="Financing Period (in days)" name="financingPeriod" value={formData.financingPeriod} onChange={handleChange} placeholder="" />
              <FormField label="Days to Close (after financing)" name="daysToClose" value={formData.daysToClose} onChange={handleChange} placeholder="" />
            </div>
          </section>


          <button
            type="submit"
            disabled={isLoadingAuth || !isLoggedIn || isLoadingAccess}
            className={`w-full md:w-auto mt-6 text-white py-3 px-6 rounded-lg font-semibold text-lg transition duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-50 ${(isLoadingAuth || !isLoggedIn) ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600'
              }`}
          >
            Generate LOI
          </button>
        </form>
      </div>
    </div>
  );
}
export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <Home />
    </Suspense>
  );
}