import type { User } from '@supabase/supabase-js'
import type { Attachment, AttachmentStatus } from "@assistant-ui/react";

// User and Auth Types
export type UserClass = 'trial' | 'charlie_chat' | 'charlie_chat_pro' | 'cohort' | 'disabled';

export type ExtendedUser = User & {
  stripe_customer_id?: string;
};

// Property/Listing Types
import type { Listing } from './listingTypes';
export type { Listing };

// Message Types
export interface ChatMessage {
  role: string;
  content: string;
  isPropertyDump?: boolean;
  isLoading?: boolean;
  propertyCount?: number;
  timestamp?: number;
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
  'last_sale_arms_length': 'Arms Length Sale',
  'absentee_owner': 'Absentee Owner',
  'in_state_absentee_owner': 'In-State Absentee Owner',
  'out_of_state_absentee_owner': 'Out-of-State Absentee Owner',
  'mls_active': 'Currently Listed on MLS',
  'mls_last_sale_date': 'MLS Last Sale Date',
  'adjustable_rate': 'Adjustable Rate Mortgage',
  'maturity_date_first': 'First Mortgage Maturity Date',
  'mortgage_maturing_date': 'Mortgage Maturity Date',
  'mortgage_balance': 'Outstanding Mortgage Balance',
  'pre_foreclosure': 'Pre-Foreclosure Status',
  'tax_lien': 'Tax Lien Status',
  'private_lender': 'Private Lender Financing',
  'units_count': 'Number of Units',
  'year_built': 'Year Built',
  'years_owned': 'Years Owned by Current Owner',
  'square_feet': 'Building Square Footage',
  'lot_square_feet': 'Lot Size (sq ft)',
  'assessed_value': 'Tax Assessed Value',
  'estimated_value': 'Estimated Market Value',
  'estimated_equity': 'Estimated Owner Equity',
  'last_sale_amount': 'Last Sale Price',
  'last_sale_date': 'Last Sale Date',
  'rent_estimate': 'Estimated Monthly Rent',
  'flood_zone': 'In Flood Zone',
  'flood_zone_description': 'Flood Zone Details',
  'corporate_owned': 'Corporate Owned',
  'owner_occupied': 'Owner Occupied',
  'owner_first_name': 'Owner First Name',
  'owner_last_name': 'Owner Last Name',
  'owner_address': 'Owner Mailing Address',
  'mail_address': 'Owner Mailing Address Details'
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