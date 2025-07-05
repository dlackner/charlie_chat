import type { User } from '@supabase/supabase-js'
import type { Attachment, AttachmentStatus } from "@assistant-ui/react";

// User and Auth Types
export type UserClass = 'trial' | 'charlie_chat' | 'charlie_chat_pro' | 'cohort';

export type ExtendedUser = User & {
  stripe_customer_id?: string;
};

// Property/Listing Types
export type Listing = {
  id: string;
  address: {
    street?: string;
    address: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  mailAddress?: {
    address?: string;
    city?: string;
    county?: string;
    state?: string;
    street?: string;
    zip?: string;
  };
  lastSaleArmsLength?: boolean;
  mlsActive?: boolean;
  lastSaleAmount?: number;
  lotSquareFeet?: number;
  yearsOwned?: number;
  outOfStateAbsenteeOwner?: number;
  property_type?: string;
  squareFeet?: number;
  rentEstimate?: number;
  assessedLandValue?: number;
  assessedValue?: number;
  assumable?: boolean;
  auction?: boolean;
  corporate_owned?: boolean;
  estimatedEquity?: number;
  estimatedValue?: number;
  floodZone?: boolean;
  foreclosure?: boolean;
  forSale?: boolean;
  privateLender?: boolean;
  inStateAbsenteeOwner?: boolean;
  investorBuyer?: boolean;
  lastSaleDate?: string;
  lenderName?: string;
  listingPrice?: number;
  mortgageBalance?: number;
  mortgageMaturingDate?: string;
  yearBuilt?: number;
  ownerOccupied?: boolean;
  preForeclosure?: boolean;
  reo?: boolean;
  taxLien?: boolean;
  totalPortfolioEquity?: number;
  totalPortfolioMortgageBalance?: number;
  totalPropertiesOwned?: number;
  floodZoneDescription?: string;
  unitsCount?: number;
  owner1FirstName?: string;
  owner1LastName?: string;
  stories?: number;
};

// Message Types
export interface ChatMessage {
  role: string;
  content: string;
  isPropertyDump?: boolean;
  isLoading?: boolean;
  propertyCount?: number;
}

// Attachment Types
export interface PDFAttachment {
  content: Array<{
    type: "file_search";
    file_id: string;
  }>;
}

// Window Extensions
declare global {
  interface Window {
    __LATEST_FILE_ID__?: string;
    __LATEST_FILE_NAME__?: string;
    __CURRENT_THREAD_ID__?: string;
  }
}

// Constants
export const BATCH_SIZE = 2;

export const EXAMPLES = [
  "How do I creatively structure seller financing?",
  "What are the key metrics when evaluating a multifamily property?",
  "What assumptions should I model for a 5-year hold of a property?",
  "How do I get started in multifamily investing? ",
];

// Field mappings for better clarity in property analysis
export const FIELD_MAPPINGS: { [key: string]: string } = {
  'reo': 'Bank Owned (REO)',
  'lastSaleArmsLength': 'Arms Length Sale',
  'absenteeOwner': 'Absentee Owner',
  'inStateAbsenteeOwner': 'In-State Absentee Owner',
  'outOfStateAbsenteeOwner': 'Out-of-State Absentee Owner',
  'mlsActive': 'Currently Listed on MLS',
  'mlsLastSaleDate': 'MLS Last Sale Date',
  'adjustableRate': 'Adjustable Rate Mortgage',
  'maturityDateFirst': 'First Mortgage Maturity Date',
  'maturingDate': 'Mortgage Maturity Date',
  'openMortgageBalance': 'Outstanding Mortgage Balance',
  'preForeclosure': 'Pre-Foreclosure Status',
  'taxLien': 'Tax Lien Status',
  'privateLender': 'Private Lender Financing',
  'unitsCount': 'Number of Units',
  'yearBuilt': 'Year Built',
  'yearsOwned': 'Years Owned by Current Owner',
  'squareFeet': 'Building Square Footage',
  'lotSquareFeet': 'Lot Size (sq ft)',
  'assessedValue': 'Tax Assessed Value',
  'estimatedValue': 'Estimated Market Value',
  'estimatedEquity': 'Estimated Owner Equity',
  'lastSaleAmount': 'Last Sale Price',
  'lastSaleDate': 'Last Sale Date',
  'rentEstimate': 'Estimated Monthly Rent',
  'floodZone': 'In Flood Zone',
  'floodZoneDescription': 'Flood Zone Details',
  'corporateOwned': 'Corporate Owned',
  'ownerOccupied': 'Owner Occupied',
  'owner1FirstName': 'Owner First Name',
  'owner1LastName': 'Owner Last Name',
  'ownerAddress': 'Owner Mailing Address',
  'mailAddress': 'Owner Mailing Address Details'
};

// Component Props Types (for future components)
export interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (message: string) => void;
  isLoggedIn: boolean;
  userClass: UserClass;
  onShowModal: () => void;
  onShowProModal: () => void;
  uploadError: string | null;
  isUploadingFile: boolean;
}

export interface MessageListProps {
  messages: ChatMessage[];
  isWaitingForContinuation: boolean;
  currentBatch: number;
  totalPropertiesToAnalyze: number;
  selectedListings: Listing[];
  batchSize: number;
  onContinueAnalysis: () => void;
  onStopAnalysis: () => void;
}

export interface CreditDisplayProps {
  userCredits: number | null;
  userClass: UserClass;
  onShowCreditModal: () => void;
}