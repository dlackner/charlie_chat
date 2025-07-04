// types.ts - Skip Trace Module Types

import type { Listing } from '../ui/sidebar'; // Adjust path as needed

// ===== INPUT TYPES =====

export interface SkipTraceRequest {
  first_name: string;
  last_name: string;
  mail_address: string;
  mail_city: string;
  mail_state: string;
}

// Validation result for required fields
export interface SkipTraceValidation {
  isValid: boolean;
  missingFields: string[];
}

// ===== API RESPONSE TYPES (Full Structure) =====

export interface SkipTraceApiResponse {
  requestId: string;
  responseCode: number;
  requestDate: string;
  responseMessage: string;
  warnings: string;
  input: {
    address: string;
    zip: string;
    state: string;
    city: string;
  };
  output: {
    identity: {
      names: Array<{
        firstName: string;
        middleName: string;
        lastName: string;
        fullName: string;
      }>;
      address: {
        house: string;
        preDir: string;
        street: string;
        postDir: string;
        strType: string;
        aptNbr: string;
        aptType: string;
        city: string;
        state: string;
        county: string;
        zip: string;
        z4: string;
        latitude: string;
        longitude: string;
        formattedAddress: string;
        lastSeen: string;
        validSince: string;
      };
      addressHistory: Array<{
        house: string;
        preDir: string;
        street: string;
        postDir: string;
        strType: string;
        aptNbr: string;
        aptType: string;
        city: string;
        state: string;
        county: string;
        zip: string;
        z4: string;
        latitude: string;
        longitude: string;
        formattedAddress: string;
        lastSeen: string;
        validSince: string;
      }>;
      phones: Array<{
        phone: string;
        telcoName: string;
        phoneDisplay: string;
        phoneExtension: string;
        isConnected: boolean;
        doNotCall: boolean;
        phoneType: string;
        lastSeen: string;
        validSince: string;
      }>;
      emails: Array<{
        email: string;
        emailType: string;
      }>;
    };
    demographics: {
      dob: string;
      dod: string;
      deceased: boolean;
      gender: string;
      age: number;
      ageDisplay: string;
      images: any[];
      social: any[];
      education: any[];
      jobs: Array<{
        title: string;
        org: string;
        industry: string;
        display: string;
        dates: string;
      }>;
      names: Array<{
        type: string;
        prefix: string;
        firstName: string;
        lastName: string;
        middleName: string;
        suffix: string;
        fullName: string;
        lastSeen: string;
        validSince: string;
      }>;
    };
    relationships: any[];
    stats: {
      searchResults: number;
      names: number;
      addresses: number;
      phoneNumbers: number;
      emailAddresses: number;
      associates: number;
      jobs: number;
      socialProfiles: number;
      images: number;
    };
  };
  match: boolean;
  cached: boolean;
  statusCode: number;
  statusMessage: string;
  credits: number;
  live: boolean;
  requestExecutionTimeMS: string;
}

// ===== PROCESSED/FILTERED TYPES FOR PDF =====

export interface ContactOption {
  type: 'phone' | 'email';
  value: string;
  displayValue?: string; // For formatted phone numbers
  isConnected?: boolean; // For phones
  doNotCall?: boolean; // For phones
  phoneType?: string; // For phones
  emailType?: string; // For emails
  status: 'primary' | 'alternative' | 'disconnected';
}

export interface AddressInfo {
  formattedAddress: string;
  lastSeen?: string;
  isPrimary: boolean;
}

export interface ContactSummary {
  ownerName: string;
  propertyAddress: string;
  searchSuccess: boolean;
  primaryContact: {
    address?: string;
    phone?: ContactOption;
    email?: ContactOption;
  };
  demographics: {
    age?: number;
    ageDisplay?: string;
    gender?: string;
    occupation?: string;
  };
  alternativeContacts: ContactOption[];
  addressHistory: AddressInfo[];
  searchStats: {
    totalResults: number;
    phoneNumbers: number;
    emailAddresses: number;
    addresses: number;
  };
}

// ===== COMPONENT PROPS =====

export interface SkipTraceButtonProps {
  listing: Listing;
  userClass: 'trial' | 'charlie_chat' | 'charlie_chat_pro' | 'cohort';
}

// ===== UTILITY TYPES =====

export interface SkipTraceError {
  type: 'validation' | 'api' | 'network' | 'permission';
  message: string;
  details?: string;
}

export interface SkipTraceState {
  isLoading: boolean;
  error: SkipTraceError | null;
  lastResult: ContactSummary | null;
}