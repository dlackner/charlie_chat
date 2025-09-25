/*
 * Purchase & Sale Agreement Document Generation
 * Leverages existing LOI form data structure and docx patterns
 * Generates comprehensive P&S Agreement with placeholders for manual completion
 */

import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

// Reusing existing LOI form data interface
export interface LOIFormData {
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

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  address: string;
  cityzip: string;
  business_name?: string;
  business_title?: string;
  logoBase64?: string;
}

// Document formatting configurations
const headingConfig = {
  size: 24,
  bold: true,
  color: '333333'
};

const bodyConfig = {
  size: 22,
  color: '333333'
};

const tightParagraphConfig = {
  spacing: { after: 120 }
};

const normalParagraphConfig = {
  spacing: { after: 240 }
};

const sectionParagraphConfig = {
  spacing: { before: 360, after: 240 }
};

/**
 * Generate and download Purchase & Sale Agreement document
 */
export const generatePurchaseAndSaleAgreement = async (
  data: LOIFormData,
  userProfile: UserProfile,
  formatCurrencyJS: (amount: string) => string,
  numberToWords: { toWords: (num: number) => string },
  incrementActivity: (activityType: string) => Promise<void>
) => {
  try {
    // Validation
    if (!data.propertyAddress.trim()) {
      throw new Error('Property address is required');
    }

    if (!data.purchasePrice.trim()) {
      throw new Error('Purchase price is required');
    }

    // Data preparation

    const purchasePriceNum = parseInt(data.purchasePrice.replace(/[,$]/g, ''));
    const earnestMoneyNum = parseInt(data.earnestMoney.replace(/[,$]/g, ''));

    // Extract states for buyer and seller
    const extractStateFromCityZip = (cityZip: string): string => {
      const parts = cityZip.trim().split(' ');
      if (parts.length >= 2) {
        // Assume state is the second-to-last part (before ZIP)
        return parts[parts.length - 2];
      }
      return 'UNKNOWN STATE';
    };

    const buyerState = data.yourCityZip ? extractStateFromCityZip(data.yourCityZip) : 
                     userProfile.cityzip ? extractStateFromCityZip(userProfile.cityzip) : 'UNKNOWN STATE';
    const sellerState = data.ownerState || 'UNKNOWN STATE';
    
    // Extract property state from property address (assuming format includes state)
    const extractPropertyState = (address: string): string => {
      // Look for common state abbreviations in the address
      const stateMatch = address.match(/\b([A-Z]{2})\b/);
      return stateMatch ? stateMatch[1] : 'UNKNOWN STATE';
    };
    
    const propertyState = extractPropertyState(data.propertyAddress);

    const sections: Paragraph[] = [];

    // Header with logo (if available)
    if (userProfile.logoBase64) {
      const logoBuffer = Buffer.from(userProfile.logoBase64.split(',')[1], 'base64');
      sections.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: {
                width: 120,
                height: 60
              },
              type: 'jpg'
            })
          ],
          spacing: { after: 480 }
        })
      );
    }

    // Document title and opening paragraph
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'PURCHASE AND SALE AGREEMENT',
            ...headingConfig,
            size: 28
          })
        ],
        alignment: 'center',
        spacing: { after: 480 }
      })
    );

    // Opening paragraph
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `THIS PURCHASE AND SALE AGREEMENT ("Agreement") is made and entered into this ____ day of _______, 2025 ("Execution Date") by and between ${data.ownerFirst} ${data.ownerLast}, a ${sellerState} [SELLER ENTITY TYPE] (collectively, the "Seller"), and, ${data.yourName} a ${buyerState} [BUYER ENTITY TYPE], and its permitted assigns (in accordance with Section 15.03) ("Buyer").`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 1 - Sale and Purchase
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 1',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Sale and Purchase',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 1.01 The Project.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Subject to the terms and provisions hereof, Seller agrees to sell to Buyer, and Buyer agrees to purchase from Seller:',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Subsections (a) through (f)
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `(a) ${data.propertyAddress}, more particularly described on Exhibit A together with all right, title and interest of Seller, if any, in and to (i) all rights, easements and appurtenances pertaining thereto, (ii) any and all roads, easements, alleys, streets and rights-of-way bounding such real property, (iii) all strips and gores adjacent thereto, and (iv) all rights of ingress and egress unto such real property (collectively, the "Land");`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '(b) All right title and interest of Seller in and to all utility lines, utility facilities, street and drainage improvements, the multi-family apartment facility, buildings, fences, walls and structures presently situated on the Land ("Improvements");',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '(c) All right, title and interest of Seller in and to all fixtures, equipment and other tangible personal property located on and used solely in connection with the maintenance or operation of the Land and Improvements (excluding any furniture, fixtures and equipment owned by Seller\'s property manager or tenants) ("Personal Property");',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '(d) All of the Seller\'s right, title, and interest, as lessor or landlord, in any written leases, tenancies or other rights of occupancy or use for any portion of the Improvements and/or the Land ("Tenant Leases");',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '(e) All of Seller\'s right, title and interest in and to (i) all plans, specifications, warranties, guaranties, licenses and the right to any trade name for the Project, as defined below, and any other trade name associated with the ownership and operation of the Land and Improvements, (ii) all licenses, permits, certificates of occupancy, approvals, dedications, subdivision maps or plats and entitlements issued, approved or granted by any governmental agencies or otherwise with respect to the Land and Improvements, and (iii) any and all development rights and other intangible rights, title, interests, privileges and appurtenances owned by Seller and pertaining to Land and Improvements, (iv) any telephone numbers exclusively used in connection with the Project, and (v) any warranties, guaranties, bonds or other agreements affecting the operation or maintenance of the Land and/or the Improvements (collectively, the "Intangible Property");',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '(f) All of Seller\'s right, title and interest in and to the laundry contact and all service, equipment, supply and maintenance contracts relating to the Land and Improvements ("Service Contracts").',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'The Land, Improvements, Personal Property, Tenant Leases, and Intangible Property, and the Service Contracts are sometimes hereinafter referred to collectively as the "Project". The Project is commonly known as [PROJECT NAME].',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 2 - Purchase Price
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 2',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Purchase Price',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 2.01 Amount.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ` The aggregate Purchase Price (herein so called) for the Project is and shall be ${formatCurrencyJS(data.purchasePrice)} (${numberToWords.toWords(purchasePriceNum)} Dollars), which shall be payable as provided below.`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 2.02 Payment of Purchase Price.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The Purchase Price for the Project shall be payable at Closing as follows:',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'The Purchase Price (i.e., the balance of the Purchase Price after deducting the Earnest Money Deposit) shall be paid in cash, by wire transfer, or other immediately available funds acceptable by the Escrow Agent for immediate disbursement at Closing, subject to normal and customary prorations, credits, and adjustments provided for in this Agreement.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 3 - Earnest Money
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 3',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Earnest Money',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 3.01 Earnest Money Deposits.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ` Upon three business days after the execution of this Agreement, Buyer shall deliver ${formatCurrencyJS(data.earnestMoney)} (${numberToWords.toWords(earnestMoneyNum)} Dollars) ("Earnest Money Deposit") to the Escrow Agent, who will be chosen by the Seller ("Escrow Agent"). The Escrow Agent shall hold the Earnest Money Deposit in escrow in a non-interest-bearing account to be disbursed or applied in accordance with this Agreement. If Buyer fails to timely deliver the Earnest Money Deposit to the Escrow Agent in accordance with this paragraph, Seller may terminate this Agreement upon written notice to Buyer prior to the required deposit by Buyer.`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'If the Closing occurs, the Earnest Money Deposit shall be applied to the Purchase Price at Closing. If the Closing does not occur, then the Escrow Agent shall disburse the Earnest Money Deposit in the manner provided for elsewhere herein.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 3.02 Escrow Agent Bound.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The Escrow Agent shall sign this Agreement as evidence that the Escrow Agent agrees to be bound by the obligations contained herein with respect to the Earnest Money Deposit.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 4 - Conveyance of Title
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 4',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 4.1 Conveyance of Title.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The Land is to be conveyed by a good and sufficient [TYPE OF DEED] (the "Deed") conveying marketable title running to Buyer, or to a nominee owned or controlled by Buyer, identified by written notice to the Seller at least fourteen (14) days before the Closing subject to the Permitted Exceptions determined pursuant to Section 5.02 hereof.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 5 - Survey and Title Matters
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 5',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Survey and Title Matters',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 5.01 Survey.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Within fifteen (15) days after the Execution Date, Seller shall deliver to Buyer, a survey ("Survey") of the Land and the Improvements and a UCC-1 financing statement search of the state and county records if in Seller\'s possession, custody or control. If Buyer requires any modifications or updates to the Survey, the cost of the same shall be borne by Buyer.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 5.02 Title Commitment.',
            ...bodyConfig,
            bold: true
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `(a) Buyer shall obtain from a title examiner or insurance company licensed to do business in the State of ${propertyState} (the "Title Insurer") a title report and commitment for an owner's title insurance policy (current form of ALTA Owner's Policy) (the "Commitment"), and shall furnish to Seller (i) a copy of the Commitment, and (ii) a written statement specifically identifying any liens or encumbrances affecting, or other defects in or objections to title to the Property, together with Buyer's reasons for objecting to the same ("Buyer's Title Objections") within 15 days of the Execution Date (the "Due Diligence Period").`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 5.03 Title Policy.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' At Closing, Buyer shall cause the Title Company to modify (by interlineation or otherwise) the Title Commitment so as to then reflect a current commitment by the Title Company to issue to Buyer an Owner\'s Policy of Title Insurance ("Title Policy") insuring good, marketable and insurable fee simple title to the Project in the Buyer, subject only to the Permitted Exceptions and free and clear of all liens and encumbrances.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 6 - Seller Submission Materials
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 6',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Seller Submission Materials',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 6.01 Plans and Specifications, Leases, and Other Property Information.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Within five (5) business days after the Execution Date, unless otherwise agreed to, Seller shall deliver to Buyer the items below, which items may be copied in a combination of hard printed copies and/or downloaded on a flash drive:',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Due diligence items (a) through (k)
    const dueDiligenceItems = [
      '(a) Copies of ad valorem and personal property tax statements covering the Property for the three (3) years prior to the Effective Date (or the period of time Seller has owned the Real Property, whichever is less) and, if and when available, for the current year, together with a copy of the current year Tax Assessment Notice from applicable appraisal district office.',
      '(b) Copies of all licenses and permits with respect to Seller\'s ownership and operation of the Property, including, without limitation, building permits, swimming pool permits, boiler permits, mechanical permits and certificates of occupancy, wind mitigation reports, flood plan certifications.',
      '(c) To the extent that Seller has possession of these items: Copies of as-built engineering and architectural plans. Drawings, specifications, geotechnical subsoil tests or analyses, termite inspection reports, structural reports, foundation reports, and all amendments or changes thereto, and all blueprints, schematics, renderings, architect\'s drawings and all other reports, plans or studies held by or for Seller which relate to the Property (collectively, the "Plans").',
      '(d) Copies of all Leases (including, without limitation, all modifications, amendments, or supplements thereto) in effect with respect to the Property, as a certified rent roll ("Rent Roll") prepared as of the first day of the month in which the Contract is executed.',
      '(e) Copies of all service contracts, landscaping, pool and/or other maintenance agreements, management contracts, warranties, guaranties, or other agreements relating to the Property, including, without limitation, all laundry leases, other equipment leases and particularly all coin-operated vending or other machines.',
      '(f) A reasonably detailed list for the Seller showing the description and approximate quantity of all of Seller\'s Personal Property included as part of this transaction.',
      '(g) A statement ("Operating Statement") with respect to the results of the ownership and operation of the Property at least for the period of Seller\'s ownership of the Property.',
      '(h) Copies of all correspondence, reports, inspections, and other documents held by or for Seller including, without limitation, Phase I reports or Phase II reports regarding the environmental aspects of the Property.',
      '(i) Copies of all geotechnical reports, and soil compaction tests performed by or on behalf of Seller or which Seller has in its possession relating to the Property.',
      '(j) Copies of the most recent MAI or other type of property appraisal on the Property.',
      '(k) Certified copies of the last twelve months of monthly, itemized bank statements regarding operations at the Property.'
    ];

    dueDiligenceItems.forEach(item => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item,
              ...bodyConfig
            })
          ],
          ...tightParagraphConfig
        })
      );
    });

    // ARTICLE 8 - Inspection and Financing Period
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 8',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Inspection and Financing Period',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 8.01 Inspection Period.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ` Seller agrees that Buyer shall be entitled to enter upon the Project to examine Seller's books and records relating to Seller's operations of the Project and to conduct such additional physical inspections of the Project as Buyer may desire. Termination of Purchase and Sale Agreement. If Buyer notifies Seller in writing before the expiration of the ${data.inspectionPeriod} calendar day period ("Inspection Period") commencing upon the Execution Date, that Buyer, for any reason whatsoever, does not desire to consummate the transaction contemplated by this Agreement, then this Agreement shall terminate, whereupon the Escrow Agent shall immediately return the Earnest Money Deposit to Buyer.`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 8.04 Financing Period.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ` Buyer shall have ${data.financingPeriod} days from the Execution Date ("Financing Period"), in which to obtain a loan commitment satisfactory to the Buyer. In the event Buyer determines, before the expiration of the Financing Period, that Buyer is unable to obtain financing, Buyer shall have the right to terminate this Agreement by giving written notice to Seller of termination before the expiration of the Financing Period.`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 11 - Representations
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 11',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Representations',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 11.02 No Implied Warranties.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Except for the foregoing representations and warranties of Seller set forth in Section 11.01 and any other representations or warranties of Seller expressly set forth herein, Buyer acknowledges and agrees that as a material inducement to Seller to execute this Agreement, Buyer acknowledges, represents and warrants that prior to Closing (i) Buyer will have fully examined and inspected the Project, (ii) Buyer will have accepted the foregoing and the physical condition, value, presence/absence of hazardous substances, financing status, use, leasing, operation, tax status, income and expenses of the Project, (iii) the Project will be purchased by Buyer "AS IS" and "WHERE IS" and "WITH ALL FAULTS" and, upon Closing, Buyer shall assume responsibility for the physical condition of the Project.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 12 - Closing
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 12',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Closing',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 12.01 Time and Place.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ` Subject to all other terms of this Agreement, the consummation of the transaction contemplated by this Agreement, the exchange of documents and funds ("Closing") shall take place at the offices of the Escrow Agent. The date of Closing ("Closing Date") shall be the date which is ${data.daysToClose} days after the receipt of financing approval upon terms and conditions satisfactory to the Buyer, or such earlier day as may be mutually agreed upon by Seller and Buyer.`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 12.07 Costs and Expenses.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Seller shall pay the following costs: the cost of the preparation of the Deed and any other required conveyance documents and any transfer tax or excise tax required. Buyer shall pay for all recording costs, all fees and expenses associated with Buyer\'s financing of the Project, the title examination, title commitment and the premium for the Title Policy and all costs for any endorsements thereto, and the costs associated with obtaining a survey, and any other due diligence expenses.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 14 - Remedies of Default
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 14',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Remedies of Default',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 14.01 Seller Default.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Seller shall be deemed in default under this Agreement upon Seller\'s failure to timely perform any of Seller\'s obligations under this Agreement, and the continuance of such failure for five (5) business days after Seller\'s receipt of written notice thereof from Buyer. In the event of Seller\'s default under this Agreement, then Buyer shall be entitled, as Buyer\'s sole and exclusive remedy to terminate the Agreement and receive a refund of the Earnest Money Deposit and all expenses related to the purchase of the Property that have been incurred by Buyer.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 14.02 Buyer Default.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Buyer shall be deemed in default under this Agreement upon Buyer\'s failure to timely perform any of Buyer\'s obligations under this Agreement, and the continuance of such failure for five (5) business days after Buyer\'s receipt of written notice thereof from Seller. In the event of Buyer\'s default hereunder, Seller shall be entitled, as Seller\'s sole and exclusive remedy, to terminate this Agreement, in which event the Earnest Money Deposit shall be paid to Seller by the Escrow Agent as liquidated damages.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // ARTICLE 15 - Miscellaneous
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ARTICLE 15',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...sectionParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Miscellaneous',
            ...headingConfig
          })
        ],
        alignment: 'center',
        ...normalParagraphConfig
      })
    );

    // Section 15.01 Notices
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.01 Notices.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' All notices, demands, deliveries or other communications of any type (herein collectively referred to as "Notices") given by Seller to Buyer or by Buyer to Seller, whether required by this Agreement or in any way related to the transactions contracted for herein, shall be void and of no effect unless given in accordance with the provisions of this Section. All notices shall be in writing and delivered to the person to whom the notice is directed, (i) in person (provided that such delivery is confirmed by the courier delivery service), (ii) by expedited delivery service with proof of delivery, (iii) by United States Mail, postage prepaid, as a Registered or Certified item, Return Receipt Requested, or (iv) by email or facsimile, provided that receipt for such facsimile is verified by the sender and followed by a notice sent on the same day in accordance with one of the preceding clauses (i), (ii) or (iii). Notices delivered by personal delivery, expedited delivery service or email/facsimile shall be deemed to have been given at the time of such delivery, and notices delivered by mail shall be effective when deposited in a Post Office or other depository under the care or custody of the United States Postal Service, enclosed in a wrapper with proper postage affixed and addressed, as provided below.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.02 Holidays/Business Days
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.02 Holidays/Business Days.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' In the event that the date upon which any duties or obligations hereunder to be performed shall occur upon a Saturday, Sunday or legal holiday, then, in such event, the due date for performance of any duty or obligation shall thereupon be automatically extended to the next succeeding business day. A "business day" hereunder is a day which is not Saturday, Sunday or a legal federal holiday.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.03 Successors and Assignment
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.03 Successors and Assignment.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The terms and provisions of this Agreement are to apply to and bind the permitted successors and assigns of the parties hereto. Buyer may not assign its rights under this Agreement without first obtaining Seller\'s written consent, which Seller cannot reasonably withhold. In the event that Buyer desires to assign its rights under this Agreement Buyer shall send written notice to Seller prior to the effective date of such assignment stating the name and, if applicable, the constituent persons or entities of the Permitted Assignee.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.04 Intentionally Deleted
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.04 Intentionally Deleted.',
            ...bodyConfig,
            bold: true
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.05 Governing Law.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' THIS AGREEMENT SHALL BE CONSTRUED AND INTERPRETED IN ACCORDANCE WITH THE LAWS OF THE STATE OR COMMONWEALTH THAT THE PROPERTY IS LOCATED AND THE OBLIGATIONS OF THE PARTIES HERETO ARE AND SHALL BE PERFORMABLE, AND EXCLUSIVE VENUE FOR ANY ACTION INSTITUTED WITH RESPECT TO THIS AGREEMENT SHALL LIE, IN THE COUNTY WHEREIN THE PROJECT IS LOCATED.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.06 No Oral Modification
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.06 No Oral Modification.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' This Agreement may not be modified or amended, except by an agreement in writing signed by both Seller and Buyer.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.07 No Oral Waiver
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.07 No Oral Waiver.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The parties may waive any of the conditions contained herein or any of the obligations of the other party hereunder, but any such waiver shall be effective only if in writing and signed by the party waiving such conditions or obligations.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.08 Time of Essence.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Time is of the essence of this Agreement.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.09 Attorneys' Fees
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.09 Attorneys\' Fees.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' In the event either party files a suit to enforce this Agreement or any provisions contained herein, the party prevailing in such action shall be entitled to recover, in addition to all other remedies or damages, reasonable attorneys\' fees and court costs incurred by such prevailing party in such suit.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.10 Headings
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.10 Headings.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The descriptive headings of the various Articles and Sections contained in this Agreement are inserted for convenience only and shall not control or affect the meaning or construction of any of the provisions hereof.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.11 Total Agreement.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' This Agreement constitutes the entire agreement among the parties pertaining to the subject matter hereof and supersedes all prior and contemporaneous agreements and understandings of the parties in connection therewith.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.12 Partial Invalidity
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.12 Partial Invalidity.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' If any clause or provision of this Agreement is or should ever be held to be illegal, invalid, or unenforceable under any present or future law applicable to the terms hereof, then it is the intention of the parties hereto that the remainder of this Agreement shall not be affected thereby, and that in lieu of each such clause or provision of this Agreement that is illegal, invalid, or unenforceable, there be added as a part of this Agreement a clause or provision as similar in terms to such illegal, invalid, or unenforceable clause or provision as may be possible and be legal, valid, and enforceable.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.13 Counterpart Execution
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.13 Counterpart Execution.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' To facilitate execution, this Agreement may be executed in as many counterparts as may be convenient or required. It shall not be necessary that the signature of all persons required to bind any party appear on each counterpart. All counterparts shall collectively constitute a single instrument. It shall not be necessary in making proof of this Agreement to produce or account for more than a single counterpart containing the respective signatures of, or on behalf of, each of the parties hereto. Any signature page to any counterpart may be detached from such counterpart without impairing the legal effect of the signatures thereon and thereafter attached to another counterpart identical thereto except having attached to it additional signature pages.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.14 1031 Like-Kind Exchange
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.14 1031 Like-Kind Exchange.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Seller and Buyer will each, at no cost or liability to the other, reasonably cooperate with each other for purposes of allowing Seller and/or Buyer to effect a "like-kind" exchange in accordance with Section 1031 of the Internal Revenue Code in connection with the purchase and sale of the Project.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.15 Execution Date
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.15 Execution Date.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' For purposes of determining the time for performance of various obligations under this Agreement, the "Execution Date" of this Agreement shall be the date that all documents listed in Article 6 are received by the Buyer and the Escrow Agent has received an Agreement executed by both the Seller and the Buyer in whole or in counterpart.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.16 Force Majeure or Material Adverse Effect
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.16 Force Majeure or Material Adverse Effect.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' A Force Majeure ("FM") is defined as an event beyond the control of the Parties, which prevents a Party from complying with any of its obligations under this Agreement, including but not limited to, (1) act of God (such as, but not limited to, fires, explosions, earthquakes, drought, tidal waves and floods); (2) war, hostilities (whether war be declared or not), invasion, act of foreign enemies, mobilization, requisition, or embargo; (3) rebellion, revolution, insurrection, or military or usurped power, or civil war; (4) contamination by radio-activity from any nuclear fuel, or from any nuclear waste from the combustion of nuclear fuel, radio-active toxic explosive, or other hazardous properties of any explosive nuclear assembly or nuclear component of such assembly; (5) riot, commotion, strikes, go slows, lock outs or disorder, unless solely restricted to employees of any third-party vendors to this Agreement; or (6) acts or threats of terrorism.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'A Material Adverse Effect ("MAE") is defined as (1) any epidemic, pandemic, or disease outbreak (including the COVID-19 virus)), including any material worsening of such conditions; (2) an outbreak of disease; or, (3) any global public health emergency (as declared by the World Health Organization)',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Neither Party shall be considered in breach of this Agreement to the extent that performance of their respective obligations is prevented by an FM or MAE that arises after the Execution Date. The Party (the "Affected Party") that is prevented from carrying out its obligations hereunder shall give notice to the other Party of an event of FM or MAE upon it being foreseen by, or becoming known to, the Affected Party. If and to the extent that the Affected Party is prevented from executing its\' contractual duties by the event of an FM or MAE, while the Affected Party is so prevented the Affected Party shall be relieved of its obligations to perform but shall endeavor to continue to perform its obligations under the Agreement so far as reasonably practicable.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'In the event either Party is unable to perform their contractual duties in the time frame agreed upon under this Agreement as a result of a FM or MAE, all time frames within this Agreement will be extended for thirty (30) days or by a period of time equal to the period of interruption caused by the FM or MAE, whichever is shorter, with no penalty or additional economic terms to either party ("MAE Period"). If at the end of the MAE Period, the MAE has not been extinguished to the satisfaction of either Party, then either Party may terminate this Agreement with written notice to the other Party and both Parties will return to their pre-Execution Date position with a return of the Earnest Money Deposit to the Buyer.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.17 No Third-Party Beneficiary
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.17 No Third-Party Beneficiary.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The provisions of this Agreement and of the documents to be executed and delivered at Closing are and will be for the benefit of Seller and Buyer only and are not for the benefit of any third party, and accordingly, no third party shall have the right to enforce the provisions of this Agreement, or the documents to be executed and delivered at Closing, with the exception of successors and assigns permitted under this Agreement.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.18 Recordation
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.18 Recordation.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Neither this Agreement, nor a memorandum or notice hereof, shall be recorded with any Registry of Deeds, and any such recording of the same by either party shall constitute a default hereunder by said party. The provisions of this Section 15.18 shall survive the Closing or any termination of this Agreement.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.19 Limitation on Liability
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.19 Limitation on Liability.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' In no event shall any officer, director, shareholder, employee, member, manager, employee, agent or affiliate of Seller or Buyer have any personal liability hereunder, nor shall any of them be named personally in any suit, action or proceeding concerning any matter hereunder, nor shall any of their assets be attached, liened or levied upon or in any other way held liable for any of the obligations of Seller or Buyer, respectively.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.20 Merger
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.20 Merger.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The acceptance of the Deed by Buyer shall be deemed to be full performance and discharge of every agreement and obligation herein contained or expressed, except such as are, by the terms hereof, to be performed after the delivery of the Deed or are to survive the Closing Date.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.21 Waiver
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.21 Waiver.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The failure or delay of either party at any time to require performance by the other party of any provision of this Agreement, whether such failure or delay is known or unknown, shall not affect the right of such party to require performance of the provision or to exercise any right, power, or remedy hereunder at a later day, and any waiver by either party of any breach of any provision of this Agreement shall not be construed as a waiver of any continuing or succeeding breach of such provision, a waiver of the provision itself or a waiver of any right, power or remedy provided under this Agreement, or at law or in equity. No notice to or demand on either party in any case shall, of itself, entitle such party to any other or further notice or demand in similar or other circumstances.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.22 Trial by Jury
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.22 Trial by Jury.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Each party hereby waives trial by jury in any action, proceeding, claim or counterclaim brought by either party in connection with any matter arising out of, or in any way connected with, this Agreement, the relationship of Seller and Buyer hereunder, Seller\'s ownership or use of the Property, and/or any claims or injury or damage. Each party hereby consents to service of process and any pleading relating to any such action, proceeding, claim or counterclaim, at the address set forth for such party at the notice address specified herein; provided, however, that nothing herein shall be construed as requiring such service at such address.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.23 Electronic Copies
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.23 Electronic Copies.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The Parties acknowledge and agree that any signature to this Agreement including without limitation by facsimile, telecopy, email, or other electronic means (including faxed versions of an original signature or electronically scanned and transmitted versions e.g., via pdf), executed using electronic signing services (e.g. DocuSign and similar applications), or any electronic symbol or process attached to, or associated with, this Agreement and adopted by the party with the intent to sign, authenticate or accept this Agreement, shall be considered as an original signature for all purposes ("Electronic Signature"). It is expressly agreed that each party to this Agreement shall be bound by its own Electronic Signature and shall accept the Electronic Signature of the any other party to this Agreement.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.24 Confidentiality
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.24 Confidentiality.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' Except as may be required under applicable law, regulation or any legal proceedings, Seller and Buyer each agree that they will use their best efforts to keep confidential all information of a confidential nature obtained by them from the other, except for such disclosure to attorneys, lenders, underwriters, investors, accountants, and financial advisors, as may be appropriate in the furtherance of this transaction.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Section 15.25 Submission Not an Offer
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Section 15.25 Submission Not an Offer.',
            ...bodyConfig,
            bold: true
          }),
          new TextRun({
            text: ' The submission of this Agreement for review and execution shall not be deemed an offer by Seller to sell the Property, nor a reservation or option for the Property on behalf of the Buyer. This Agreement shall become effective and binding only upon the execution and delivery hereof by both the Buyer and the Seller.',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Signature blocks
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `EXECUTED on this the ___ day of _________, 2025, by Seller.`,
            ...bodyConfig
          })
        ],
        spacing: { before: 600, after: 360 }
      })
    );

    // Seller signature section
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SELLER:',
            ...bodyConfig,
            bold: true
          })
        ],
        spacing: { before: 360, after: 120 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${data.ownerFirst} ${data.ownerLast}`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '_____________________________________',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'By:     [SELLER]',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Title:     [SELLER\'S TITLE]______________________________',
            ...bodyConfig
          })
        ],
        spacing: { after: 480 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `EXECUTED on this the ___ day of _________, 2025, by Buyer.`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Buyer signature section
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'BUYER:',
            ...bodyConfig,
            bold: true
          })
        ],
        spacing: { before: 360, after: 120 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${data.yourName}`,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '_____________________________________',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'By:     [BUYER]',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Title:     [BUYER\'S TITLE]______________________________',
            ...bodyConfig
          })
        ],
        spacing: { after: 480 }
      })
    );

    // Exhibits section
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'ATTACHMENTS:',
            ...headingConfig
          })
        ],
        spacing: { before: 600, after: 240 }
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Exhibit A:    Land',
            ...bodyConfig
          })
        ],
        ...tightParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Exhibit B:    Deed',
            ...bodyConfig
          })
        ],
        ...tightParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Exhibit C:    Assignment and Assumption of Leases',
            ...bodyConfig
          })
        ],
        ...tightParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Exhibit D:    Bill of Sale and Assignment',
            ...bodyConfig
          })
        ],
        ...tightParagraphConfig
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Exhibit E:    [Reserved]',
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );

    // Generate documents - Main Agreement + Exhibits
    const mainDoc = new Document({
      sections: [{
        properties: {},
        children: sections
      }]
    });

    // Generate all documents as separate files
    const documents = [
      { doc: mainDoc, name: 'Purchase_Sale_Agreement' },
      { doc: await generateLeaseAssignmentExhibit(data, buyerState, sellerState), name: 'Exhibit_C_Lease_Assignment' },
      { doc: await generateBillOfSaleExhibit(data), name: 'Exhibit_D_Bill_of_Sale' }
    ];

    // Convert to blobs and download all documents
    const safeAddress = data.propertyAddress
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    for (const { doc, name } of documents) {
      const blob = await Packer.toBlob(doc);
      const filename = `${name}_${safeAddress || 'document'}.docx`;
      saveAs(blob, filename);
      // Small delay between downloads to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Track activity
    await incrementActivity('purchase_sale_agreements_created');

  } catch (error) {
    console.error('Error generating Purchase & Sale Agreement:', error);
    throw error;
  }
};

/**
 * Generate Exhibit C - Assignment and Assumption of Leases
 */
async function generateLeaseAssignmentExhibit(data: LOIFormData, buyerState: string, sellerState: string): Promise<Document> {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'EXHIBIT C',
          ...headingConfig,
          size: 24
        })
      ],
      alignment: 'center',
      spacing: { after: 240 }
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'ASSIGNMENT AND ASSUMPTION OF LEASES',
          ...headingConfig,
          size: 20
        })
      ],
      alignment: 'center',
      spacing: { after: 480 }
    })
  );

  // Opening paragraph
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `This ASSIGNMENT AND ASSUMPTION OF LEASES ("Assignment") is made and entered into this ____ day of _______, 2025 ("Execution Date") by and between ${data.ownerFirst} ${data.ownerLast}, a ${sellerState} [SELLER ENTITY TYPE] ("Assignor"), and, ${data.yourName} a ${buyerState} [BUYER ENTITY TYPE], and its permitted assigns ("Assignee").`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // WITNESSETH section
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'WITNESSETH',
          ...headingConfig
        })
      ],
      alignment: 'center',
      spacing: { before: 360, after: 240 }
    })
  );

  // Whereas clauses
  const whereasClauses = [
    `WHEREAS, Assignor is the owner of certain real property and improvements located ${data.propertyAddress} also known as [PROJECT NAME] and described more particularly on Exhibit A attached hereto and incorporated herein by reference ("Property"); and`,
    `WHEREAS, simultaneously with the execution and delivery hereof Assignor is executing and delivering to Assignee an [TYPE OF DEED] granting and conveying the Property to Assignee; and`,
    `WHEREAS, Assignor, or Assignor's predecessors in title, have heretofore entered into various tenant leases hereinafter set forth respecting the Property; and`,
    `WHEREAS, Assignor desires to assign and transfer to Assignee all of the rights and benefits of Assignor in and to the said tenant leases upon the terms hereinafter set forth.`
  ];

  whereasClauses.forEach(clause => {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: clause,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );
  });

  // NOW THEREFORE section
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'NOW, THEREFORE, for and in consideration of the sum of TEN DOLLARS ($10.00) and other good and valuable consideration in hand paid by Assignee to Assignor, the receipt and sufficiency of which are hereby acknowledged, Assignor does hereby ASSIGN, TRANSFER, SET OVER, CONVEY and DELIVER unto Assignee, its heirs, legal representatives, successors and assigns, all of the rights, titles, and interests of Assignor in and to the tenant leases described in Exhibit B attached hereto and by this reference made a part hereof ("Tenant Leases").',
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Security deposit clause
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Assignor hereby warrants and represents unto Assignee that to Assignor's knowledge no security deposit or prepaid rental currently exists with respect to the Tenant Leases with the exception of the sum of $______________ as shown on Tenant Leases or additional documents attached hereto and incorporated herein by reference, which amount is hereby assigned by Assignor to Assignee.`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Assumption clause
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `By acceptance hereof, Assignee shall become obligated to keep, fulfill, observe, perform and discharge each and every covenant, duty, debt and obligation that may accrue and become performable, due or owing on or after the Execution Date hereof by Assignor under the terms, provisions and conditions of the Tenant Leases.`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Signature section
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `EXECUTED on this the _____TH day of ________, 2025`,
          ...bodyConfig
        })
      ],
      spacing: { before: 600, after: 360 }
    })
  );

  // Assignor signature
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'ASSIGNOR:',
          ...bodyConfig,
          bold: true
        })
      ],
      spacing: { before: 240, after: 120 }
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.ownerFirst} ${data.ownerLast}`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'By: ___________________________________',
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Assignee signature
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'ASSIGNEE:',
          ...bodyConfig,
          bold: true
        })
      ],
      spacing: { before: 360, after: 120 }
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.yourName}`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'By: ___________________________________',
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  return new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
}

/**
 * Generate Exhibit D - Bill of Sale and Assignment
 */
async function generateBillOfSaleExhibit(data: LOIFormData): Promise<Document> {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'EXHIBIT D',
          ...headingConfig,
          size: 24
        })
      ],
      alignment: 'center',
      spacing: { after: 240 }
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'BILL OF SALE AND ASSIGNMENT',
          ...headingConfig,
          size: 20
        })
      ],
      alignment: 'center',
      spacing: { after: 480 }
    })
  );

  // State and county section
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '[STATE]        }',
          ...bodyConfig
        })
      ],
      ...tightParagraphConfig
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '}    ss. KNOW ALL BY THESE PRESENTS THAT:',
          ...bodyConfig
        })
      ],
      ...tightParagraphConfig
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'County of [COUNTY]                }',
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Opening paragraph
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `This BILL OF SALE AND ASSIGNMENT AND ("Assignment") is executed and entered into by and between ${data.ownerFirst} ${data.ownerLast} ("Assignor"), and ${data.yourName}, and assigns ("Assignee").`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Consideration paragraph
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Assignor, for and in consideration of the sum of ${data.purchasePrice} and other good and valuable consideration in hand paid by Assignee to Assignor, the receipt and sufficiency of which are hereby acknowledged, Assignor does hereby BARGAIN, SELL and DELIVER unto the said Assignee all of the rights, titles, and interests of Assignor, if any, in and to the following (collectively, the "Property") and described more particularly hereto and incorporated herein by reference:`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Property descriptions
  const propertyDescriptions = [
    '(a) All utility lines, utility facilities, street and drainage improvements, the multi-family apartment facility, buildings, fences, walls and structures presently situated on the Land ("Improvements");',
    '(b) All fixtures, equipment and other tangible personal property located on and used solely in connection with the maintenance or operation of the Land and Improvements (excluding any furniture, fixtures and equipment owned by Assignor\'s property manager) ("Personal Property");',
    '(c) Any and all (i) plans, specifications, warranties, guaranties, licenses and the right to the trade name [PROJECT NAME] and any other trade name associated with the ownership and operation of the Land and Improvements, (ii) licenses, permits, certificates of occupancy, approvals, dedications, subdivision maps or plats and entitlements issued, approved or granted by any governmental agencies or otherwise with respect to the Land and Improvements, (iii) development rights and other intangible rights, title, interests, privileges and appurtenances owned by Seller and pertaining to Land and Improvements, (iv) telephone numbers exclusively used in connection with the Project, and (v) warranties, guaranties, bonds or other agreements affecting the operation or maintenance of the Land and/or the Improvements (collectively, the "Intangible Property");'
  ];

  propertyDescriptions.forEach(description => {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: description,
            ...bodyConfig
          })
        ],
        ...normalParagraphConfig
      })
    );
  });

  // Assumption clause
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Assignee hereby assumes any and all obligations of Assignor under the Contracts, and agrees to perform all of the terms, covenants and conditions on the part of the Assignor required therein to be performed, that may accrue and become performable, due or owing on or after the Execution Date hereof.`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // AS-IS disclaimer
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `ASSIGNOR MAKES NO WARRANTY, EXPRESS OR IMPLIED, AS TO TITLE, MERCHANTABILITY, MARKETABILITY, FITNESS, OR SUITABILITY FOR A PARTICULAR PURPOSE IN RESPECT TO THE PROPERTY DESCRIBED HEREIN, AND SAID PROPERTY IS SOLD IN AN "AS IS, WHERE IS" CONDITION, WITH ALL FAULTS.`,
          ...bodyConfig,
          bold: true
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Habendum clause
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `TO HAVE AND TO HOLD all of Assignor's rights, title and interest, if any, in and to the aforesaid Property unto Assignee, its successors and assigns forever.`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Execution date
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `EXECUTED on this the ____th day of _______, 2025`,
          ...bodyConfig
        })
      ],
      spacing: { before: 600, after: 360 }
    })
  );

  // Assignor signature
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'ASSIGNOR:',
          ...bodyConfig,
          bold: true
        })
      ],
      spacing: { before: 240, after: 120 }
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.ownerFirst} ${data.ownerLast}`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'By: ___________________________________',
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  // Assignee signature
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'ASSIGNEE:',
          ...bodyConfig,
          bold: true
        })
      ],
      spacing: { before: 360, after: 120 }
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.yourName}`,
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'By: ___________________________________',
          ...bodyConfig
        })
      ],
      ...normalParagraphConfig
    })
  );

  return new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
}