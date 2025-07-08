// skipTraceService.ts - Skip Trace API Service and Data Processing

import type { Listing } from '../ui/sidebar'; // Update this path
import type {
  SkipTraceRequest,
  SkipTraceValidation,
  SkipTraceApiResponse,
  ContactSummary,
  ContactOption,
  AddressInfo,
  SkipTraceError
} from './types';

// ===== DATA VALIDATION =====

export const validateSkipTraceData = (listing: Listing): SkipTraceValidation => {
  const missingFields: string[] = [];

  // Check required fields
  if (!listing.owner1FirstName?.trim()) {
    missingFields.push('Owner First Name');
  }
  if (!listing.owner1LastName?.trim()) {
    missingFields.push('Owner Last Name');
  }
  if (!listing.address?.street?.trim()) {
    missingFields.push('Property Street Address');
  }
  if (!listing.address?.city?.trim()) {
    missingFields.push('Property City');
  }
  if (!listing.address?.state?.trim()) {
    missingFields.push('Property State');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

// ===== PDF GENERATION SUPPORT =====

// Create a minimal ContactSummary for PDF generation when skip trace data is incomplete
export const createMinimalContactSummary = (listing: Listing): ContactSummary => {
  const ownerName = `${listing.owner1FirstName || ''} ${listing.owner1LastName || ''}`.trim() || 'Unknown Owner';
  const propertyAddress = listing.address?.address || 'Unknown Property';

  return {
    ownerName,
    propertyAddress,
    searchSuccess: false, // This will trigger the "no contact information found" section in PDF
    primaryContact: {},
    demographics: {},
    alternativeContacts: [],
    addressHistory: [],
    searchStats: {
      totalResults: 0,
      phoneNumbers: 0,
      emailAddresses: 0,
      addresses: 0
    }
  };
};

// Function to get contact summary for PDF generation (works with incomplete data)
export const getContactSummaryForPdf = async (listing: Listing): Promise<ContactSummary> => {
  const validation = validateSkipTraceData(listing);
  
  if (!validation.isValid) {
    // If data is incomplete, return a minimal contact summary for PDF generation
    return createMinimalContactSummary(listing);
  }

  try {
    // If data is complete, attempt skip trace
    return await performSkipTrace(listing);
  } catch (error) {
    // Check if this is a "no results found" type error
    if (error instanceof Error && 
        (error.message.includes('No phones found') || 
         error.message.includes('No contact information') ||
         error.message.includes('Skip trace failed'))) {
      
      // This is a valid "no results" response, not a real error
      // Create a contact summary that shows the search was attempted but no results found
      const ownerName = `${listing.owner1FirstName || ''} ${listing.owner1LastName || ''}`.trim();
      const propertyAddress = listing.address?.address || 'Unknown Property';
      
      return {
        ownerName,
        propertyAddress,
        searchSuccess: false, // This will show "No contact information found" in PDF
        primaryContact: {},
        demographics: {},
        alternativeContacts: [],
        addressHistory: [],
        searchStats: {
          totalResults: 0,
          phoneNumbers: 0,
          emailAddresses: 0,
          addresses: 0
        }
      };
    }
    
    // For other types of errors (network issues, etc.), fall back to minimal data
    console.warn('Skip trace failed, generating PDF with minimal data:', error);
    return createMinimalContactSummary(listing);
  }
};

// ===== DATA MAPPING =====

export const mapListingToSkipTraceRequest = (listing: Listing): SkipTraceRequest => {
  return {
    first_name: listing.owner1FirstName?.trim() || '',
    last_name: listing.owner1LastName?.trim() || '',
    mail_address: listing.address?.street?.trim() || '',
    mail_city: listing.address?.city?.trim() || '',
    mail_state: listing.address?.state?.trim() || ''
  };
};

// ===== CONTACT PROCESSING =====

const processPhoneNumbers = (phones: SkipTraceApiResponse['output']['identity']['phones']): ContactOption[] => {
  if (!phones || phones.length === 0) return [];

  return phones
    .map(phone => ({
      type: 'phone' as const,
      value: phone.phone,
      displayValue: phone.phoneDisplay,
      isConnected: phone.isConnected,
      doNotCall: phone.doNotCall,
      phoneType: phone.phoneType,
      status: phone.isConnected ? 'primary' : 'disconnected'
    } as ContactOption))
    .sort((a, b) => {
      // Sort: connected phones first, then by type (landline, mobile, etc.)
      if (a.isConnected && !b.isConnected) return -1;
      if (!a.isConnected && b.isConnected) return 1;
      return 0;
    });
};

const processEmails = (emails: SkipTraceApiResponse['output']['identity']['emails']): ContactOption[] => {
  if (!emails || emails.length === 0) return [];

  return emails.map((email, index) => ({
    type: 'email' as const,
    value: email.email,
    emailType: email.emailType,
    status: index === 0 ? 'primary' : 'alternative'
  } as ContactOption));
};

const processAddresses = (
  currentAddress: SkipTraceApiResponse['output']['identity']['address'],
  addressHistory: SkipTraceApiResponse['output']['identity']['addressHistory']
): AddressInfo[] => {
  const addresses: AddressInfo[] = [];

  // Add current address
  if (currentAddress?.formattedAddress) {
    addresses.push({
      formattedAddress: currentAddress.formattedAddress,
      lastSeen: currentAddress.lastSeen,
      isPrimary: true
    });
  }

  // Add address history
  if (addressHistory && addressHistory.length > 0) {
    addressHistory.forEach(addr => {
      if (addr.formattedAddress) {
        addresses.push({
          formattedAddress: addr.formattedAddress,
          lastSeen: addr.lastSeen,
          isPrimary: false
        });
      }
    });
  }

  return addresses;
};

// ===== MAIN PROCESSING FUNCTION =====

export const processSkipTraceResponse = (
  response: SkipTraceApiResponse,
  listing: Listing
): ContactSummary => {
  const ownerName = `${listing.owner1FirstName || ''} ${listing.owner1LastName || ''}`.trim();
  const propertyAddress = listing.address?.address || 'Unknown Property';

  // Handle no match case
  if (!response.match || !response.output) {
    return {
      ownerName,
      propertyAddress,
      searchSuccess: true,
      primaryContact: {},
      demographics: {},
      alternativeContacts: [],
      addressHistory: [],
      searchStats: {
        totalResults: 0,
        phoneNumbers: 0,
        emailAddresses: 0,
        addresses: 0
      }
    };
  }
  
  const { identity, demographics, stats } = response.output;

  // Process contact information
  const phoneContacts = processPhoneNumbers(identity.phones);
  const emailContacts = processEmails(identity.emails);
  const addresses = processAddresses(identity.address, identity.addressHistory);

  // Get primary contacts
  const primaryPhone = phoneContacts.find(p => p.status === 'primary');
  const primaryEmail = emailContacts.find(e => e.status === 'primary');
  const primaryAddress = addresses.find(a => a.isPrimary);

  // Get alternative contacts (excluding primary ones)
  const alternativeContacts = [
    ...phoneContacts.filter(p => p.status !== 'primary'),
    ...emailContacts.filter(e => e.status !== 'primary')
  ];

  // Process demographics
  const occupation = demographics.jobs?.[0]?.display || undefined;

  return {
    ownerName,
    propertyAddress,
    searchSuccess: true,
    primaryContact: {
      address: primaryAddress?.formattedAddress,
      phone: primaryPhone,
      email: primaryEmail
    },
    demographics: {
      age: demographics.age,
      ageDisplay: demographics.ageDisplay,
      gender: demographics.gender,
      occupation
    },
    alternativeContacts,
    addressHistory: addresses.filter(a => !a.isPrimary),
    searchStats: {
      totalResults: stats.searchResults,
      phoneNumbers: stats.phoneNumbers,
      emailAddresses: stats.emailAddresses,
      addresses: stats.addresses
    }
  };
};

// ===== API CALL =====

export const callSkipTraceApi = async (
  request: SkipTraceRequest
): Promise<SkipTraceApiResponse> => {
  try {
    const response = await fetch('/api/skiptrace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} - ${errorText}`);
    }

    const data: SkipTraceApiResponse = await response.json();
    
    if (data.responseCode !== 0) {
      throw new Error(`Skip trace failed: ${data.responseMessage}`);
    }

    return data;
  } catch (error) {
    console.error('Skip trace API error:', error);
    throw error;
  }
};

// ===== MAIN FUNCTION =====

export const performSkipTrace = async (listing: Listing): Promise<ContactSummary> => {
  // Validate required data
  const validation = validateSkipTraceData(listing);
  if (!validation.isValid) {
    throw new Error(`Missing required data: ${validation.missingFields.join(', ')}`);
  }

  // Map listing data to API request
  const request = mapListingToSkipTraceRequest(listing);

  // Call the API
  const response = await callSkipTraceApi(request);

  // Process and return the results
  return processSkipTraceResponse(response, listing);
};