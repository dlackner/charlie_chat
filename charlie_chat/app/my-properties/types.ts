// app/my-properties/types.ts
// Centralized type definitions to eliminate duplicate SavedProperty interfaces

/* ================================================================
   CORE BASE INTERFACE - Common fields used by most components
   ================================================================ */
export interface BaseSavedProperty {
  id: string;
  property_id: string;
  address_full: string;
  address_city: string;
  address_state: string;
  units_count: number;
  year_built: number;
  last_sale_date: string;
  assessed_value: number;
  estimated_value: number;
  estimated_equity: number;
  years_owned: number;
  out_of_state_absentee_owner: boolean;
  auction: boolean;
  reo: boolean;
  tax_lien: boolean;
  pre_foreclosure: boolean;
  private_lender: boolean;
  saved_at: string;
  notes?: string;
  owner_first_name?: string;
  owner_last_name?: string;
}

/* ================================================================
   SPECIALIZED EXTENSIONS - For specific component needs
   ================================================================ */

// For Matrix View & Property Modal (identical needs)
export interface CoreSavedProperty extends BaseSavedProperty {
  // No additional fields needed - just the base
}

// For Dynamic Map Component (requires coordinates)
export interface MappableSavedProperty extends BaseSavedProperty {
  latitude: number;  // Required for map rendering
  longitude: number; // Required for map rendering
  skipTraceData?: any; // Simple indicator for popup
}

// For Property Cards (with detailed skip trace)
export interface CardSavedProperty extends BaseSavedProperty {
  address_zip?: string;
  skipTraceData?: {
    name: string;
    age?: number;
    gender?: string;
    occupation?: string;
    phone1?: string;
    phone1Type?: string;
    phone1DNC?: boolean;
    phone2?: string;
    phone2Type?: string;
    phone2DNC?: boolean;
    phone1Label?: string;
    phone2Label?: string;
    phoneSummary?: string;
    email?: string;
    currentAddress?: string;
    addressHistory?: Array<{ formattedAddress: string; lastSeen: string }>;
    skipTracedAt?: string;
  };
}

// For Page.tsx (with coordinates and mailing address)
export interface PageSavedProperty extends BaseSavedProperty {
  latitude?: number;
  longitude?: number;
  mailAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    address?: string;
  };
}

// For Skip Trace API (minimal fields needed)
export interface SkipTraceSavedProperty {
  id: string;
  property_id: string;
  address_full: string;
  address_city: string;
  address_state: string;
  address_zip?: string;
  mail_address_street?: string;
  mail_address_city?: string;
  mail_address_state?: string;
  mail_address_zip?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  skip_trace_data?: any;
  last_skip_trace?: string;
}

// For CSV Export (complete interface with all possible fields)
export interface CompleteSavedProperty extends BaseSavedProperty {
  address_street?: string;
  address_zip?: string;
  latitude?: number;
  longitude?: number;
  mail_address_full?: string;
  mail_address_street?: string;
  mail_address_city?: string;
  mail_address_county?: string;
  mail_address_state?: string;
  mail_address_zip?: string;
  property_type?: string;
  stories?: number;
  square_feet?: number;
  lot_square_feet?: number;
  flood_zone?: string;
  flood_zone_description?: string;
  assessed_land_value?: number;
  rent_estimate?: number;
  listing_price?: number;
  mortgage_balance?: number;
  mortgage_maturing_date?: string;
  last_sale_amount?: number;
  last_sale_arms_length?: boolean;
  mls_active?: boolean;
  for_sale?: boolean;
  assumable?: boolean;
  foreclosure?: boolean;
  in_state_absentee_owner?: boolean;
  owner_occupied?: boolean;
  corporate_owned?: boolean;
  investor_buyer?: boolean;
  lender_name?: string;
  total_portfolio_equity?: number;
  total_portfolio_mortgage_balance?: number;
  total_properties_owned?: number;
  created_at?: string;
  updated_at?: string;
  mailAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    skipTraceData?: {
      name?: string;
      age?: number;
      gender?: string;
      occupation?: string;
      phone1?: string;
      phone1Type?: string;
      phone1DNC?: boolean;
      phone2?: string;
      phone2Type?: string;
      phone2DNC?: boolean;
      email?: string;
      currentAddress?: string;
      addressHistory?: Array<{ formattedAddress: string; lastSeen: string }>;
      skipTracedAt?: string;
    };
  };
}

/* ================================================================
   SKIP TRACE WORKFLOW TYPES (from skipTraceIntegration.ts)
   ================================================================ */

export interface SkipTraceRequest {
  address: string;
  city: string;
  state: string;
  zip: string;
  first_name?: string;
  last_name?: string;
}

export interface SkipTraceApiResponse {
  requestId: string;
  responseCode: number;
  responseMessage: string;
  match: boolean;
  output?: {
    identity: {
      phones: Array<{
        phone: string;
        phoneDisplay: string;
        isConnected: boolean;
        doNotCall: boolean;
        phoneType: string;
        lastSeen: string;
      }>;
      emails: Array<{
        email: string;
        emailType: string;
      }>;
      address: {
        formattedAddress: string;
        lastSeen: string;
      };
      addressHistory: Array<{
        formattedAddress: string;
        lastSeen: string;
      }>;
    };
    demographics: {
      age: number;
      ageDisplay: string;
      gender: string;
      jobs: Array<{ display: string }>;
    };
    stats: {
      searchResults: number;
      phoneNumbers: number;
      emailAddresses: number;
      addresses: number;
    };
  };
}

export interface ProcessedSkipTraceData {
  name: string;
  age?: number;
  gender?: string;
  occupation?: string;
  phone1?: string;
  phone1Type?: string;
  phone1DNC?: boolean;
  phone2?: string;
  phone2Type?: string;
  phone2DNC?: boolean;
  phone1Label?: string;
  phone2Label?: string;
  phoneSummary?: string;
  email?: string;
  currentAddress?: string;
  addressHistory?: Array<{ formattedAddress: string; lastSeen: string }>;
  skipTracedAt: string;
}

/* ================================================================
   TYPE ALIASES FOR EASY MIGRATION
   ================================================================ */

// Default export for most common use case
export type SavedProperty = CoreSavedProperty;