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
            text: `THIS PURCHASE AND SALE AGREEMENT ("Agreement") is made and entered into this ____ day of _______, 2025 ("Execution Date") by and between ${data.ownerFirst} ${data.ownerLast}, a [STATE OF DOMICILE] [SELLER ENTITY TYPE] (collectively, the "Seller"), and, ${data.yourName} a [STATE OF DOMICILE] [BUYER ENTITY TYPE], and its permitted assigns (in accordance with Section 15.03) ("Buyer").`,
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
            text: `(a) Buyer shall obtain from a title examiner or insurance company licensed to do business in the State of [PROPERTY STATE] (the "Title Insurer") a title report and commitment for an owner's title insurance policy (current form of ALTA Owner's Policy) (the "Commitment"), and shall furnish to Seller (i) a copy of the Commitment, and (ii) a written statement specifically identifying any liens or encumbrances affecting, or other defects in or objections to title to the Property, together with Buyer's reasons for objecting to the same ("Buyer's Title Objections") within 15 days of the Execution Date (the "Due Diligence Period").`,
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
      { doc: await generateLeaseAssignmentExhibit(data), name: 'Exhibit_C_Lease_Assignment' },
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
async function generateLeaseAssignmentExhibit(data: LOIFormData): Promise<Document> {
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
          text: `This ASSIGNMENT AND ASSUMPTION OF LEASES ("Assignment") is made and entered into this ____ day of _______, 2025 ("Execution Date") by and between ${data.ownerFirst} ${data.ownerLast}, a [STATE OF DOMICILE] [SELLER ENTITY TYPE] ("Assignor"), and, ${data.yourName} a [STATE OF DOMICILE] [BUYER ENTITY TYPE], and its permitted assigns ("Assignee").`,
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