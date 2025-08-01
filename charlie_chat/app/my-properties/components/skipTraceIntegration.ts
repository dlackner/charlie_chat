import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { 
  SkipTraceSavedProperty as SavedProperty,
  SkipTraceRequest,
  SkipTraceApiResponse, 
  ProcessedSkipTraceData 
} from '../types';

// skipTraceIntegration.ts  (drop this in src/services or wherever you keep it)

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */


/** Matches the RealEstateAPI v1 /SkipTrace JSON body */

{/*export interface SkipTraceApiResponse {
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
    }*/}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

export const validatePropertyForSkipTrace = (
    property: SavedProperty
): { isValid: boolean; missing: string[] } => {
    const missing: string[] = [];

    // Check for owner mailing address (required for skip tracing)
    if (!property.mail_address_street?.trim()) {
        missing.push('Owner Mailing Street');
    } else {
        // Check if it's a PO Box (screen these out)
        const address = property.mail_address_street.trim();
        if (/^(PO|P\.O\.?)\s+(Box|BOX)\s+/i.test(address)) {
            missing.push('PO Box addresses cannot be skip traced');
        }
    }

    if (!property.mail_address_city?.trim()) missing.push('Owner Mailing City');
    if (!property.mail_address_state?.trim()) missing.push('Owner Mailing State');

    return { isValid: missing.length === 0, missing };
};

// Clean up Address to make a better match

const cleanAddressForSkipTrace = (address: string): string => {
    if (!address) return address;

    // Remove common suite/unit designations that cause skip trace failures
    return address
        .replace(/\s+(Ste|Suite|Unit|Apt|Apartment|#)\s+\w+$/i, '')  // Remove "Ste 301", "Unit A", "Apt 2B", "# 123"
        .replace(/\s+(Ste|Suite|Unit|Apt|Apartment|#)\s+[\w\-]+$/i, '') // Handle ranges like "Unit 1-2"
        .trim();
};


/* -------------------------------------------------------------------------- */
/*  Mapping                                                                   */
/* -------------------------------------------------------------------------- */

export const mapPropertyToSkipTraceRequest = (
    property: SavedProperty
): SkipTraceRequest => {
    // Check if we have owner mailing address data
    const hasMailingAddress = property.mail_address_street?.trim() &&
        property.mail_address_city?.trim() &&
        property.mail_address_state?.trim();

    if (!hasMailingAddress) {
        throw new Error('Owner mailing address is required for skip tracing');
    }

    // Clean the address to remove suite/unit info
    const cleanedAddress = cleanAddressForSkipTrace(
        property.mail_address_street ? property.mail_address_street.trim() : ''
    );

    return {
        address: cleanedAddress,
        city: property.mail_address_city?.trim() || '',
        state: property.mail_address_state?.trim() || '',
        zip: property.mail_address_zip?.trim() || '',
        first_name: property.owner_first_name?.trim() || '',
        last_name: property.owner_last_name?.trim()
    };
};

/* -------------------------------------------------------------------------- */
/*  API Call                                                                  */
/* -------------------------------------------------------------------------- */

const debug = (...args: any[]) => process.env.NEXT_PUBLIC_SKIPTRACE_DEBUG && console.log('[SkipTrace]', ...args);

export const callSkipTraceApi = async (body: SkipTraceRequest): Promise<SkipTraceApiResponse> => {
    const res = await fetch('/api/skiptrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
        // Fix the error handling to use the message field from the API response
        if (data.message) {
            throw new Error(data.message); // This will be "Unable to locate valid property from address(es) provided."
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('Skip trace failed');
        }
    }

    return data;
};


/* -------------------------------------------------------------------------- */
/*  Helpers (ported from the legacy service)                                  */
/* -------------------------------------------------------------------------- */

const pickPhones = (phones: any[] = []) =>
    phones
        .filter(p => p.isConnected)     // connected only
        .sort((a, b) => (+b.isConnected) - (+a.isConnected)); // already true but keeps intent

const firstNonEmpty = <T>(arr: T[]): T | undefined => (arr.length ? arr[0] : undefined);

/* -------------------------------------------------------------------------- */
/*  Response Processing                                                       */
/* -------------------------------------------------------------------------- */
const formatPhoneLabel = (
    p?: { phone?: string; phoneDisplay?: string; phoneType?: string; doNotCall?: boolean }
) =>
    p
        ? `${p.phoneDisplay ?? p.phone} • ${p.phoneType ?? ''}${p.doNotCall ? ' (DNC)' : ''
        }`
        : undefined;

export const processSkipTraceResponse = (
    res: SkipTraceApiResponse,
    property: SavedProperty
): ProcessedSkipTraceData => {
    const ownerName = `${property.owner_first_name ?? ''} ${property.owner_last_name ?? ''}`.trim();

    if (!res.match || !res.output) {
        return { name: ownerName, skipTracedAt: new Date().toLocaleDateString() };
    }

    const { identity, demographics } = res.output;

    const phones = pickPhones(identity.phones);
    const emails = identity.emails ?? [];

    return {
        name: ownerName,
        age: demographics.age,
        gender: demographics.gender,
        occupation: demographics.jobs?.[0]?.display,

        /* ─── phones raw ─── */
        phone1: phones[0]?.phoneDisplay ?? phones[0]?.phone,
        phone1Type: phones[0]?.phoneType,
        phone1DNC: phones[0]?.doNotCall,
        phone2: phones[1]?.phoneDisplay ?? phones[1]?.phone,
        phone2Type: phones[1]?.phoneType,
        phone2DNC: phones[1]?.doNotCall,

        /* ─── NEW pretty labels ─── */
        phone1Label: formatPhoneLabel(phones[0]),
        phone2Label: formatPhoneLabel(phones[1]),
        phoneSummary: [formatPhoneLabel(phones[0]), formatPhoneLabel(phones[1])]
            .filter(Boolean)
            .join('  |  '),

        /* rest unchanged */
        email: emails[0]?.email,
        currentAddress: identity.address?.formattedAddress,
        addressHistory: identity.addressHistory ?? [],
        skipTracedAt: new Date().toLocaleDateString()
    };
};

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export const performSkipTrace = async (
    property: SavedProperty
): Promise<ProcessedSkipTraceData> => {
    const { isValid, missing } = validatePropertyForSkipTrace(property);
    if (!isValid) {
        throw new Error(`Cannot run skip‑trace — missing: ${missing.join(', ')}`);
    }

    const request = mapPropertyToSkipTraceRequest(property);
    debug('request', request);

    const response = await callSkipTraceApi(request);
    debug('response', response);

    const data = processSkipTraceResponse(response, property);

    // Save skip trace results to Supabase
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase

        .from('saved_properties')
        .update({
            skip_trace_data: data,
            last_skip_trace: new Date().toISOString(),
        })
        .eq('id', property.id);

    if (error) {
        console.warn('⚠️ Failed to save skip trace data to Supabase:', error.message);
    }

    return {
        ...data,
        skipTracedAt: new Date().toISOString(), // Helpful for immediate UI display
    };
};

export const handleSkipTraceForProperty = async (
    propertyId: string,
    property: SavedProperty,
    onSuccess: (id: string, data: ProcessedSkipTraceData) => void,
    onError: (id: string, msg: string) => void
) => {
    try {
        const data = await performSkipTrace(property);
        onSuccess(propertyId, data);
    } catch (err) {
        // Add debugging logs
        console.log('Raw error caught:', err);
        console.log('Error type:', typeof err);
        console.log('Error message:', err instanceof Error ? err.message : 'No message');
        
        let msg = 'Unknown skip‑trace error';
        
        if (err instanceof Error) {
            const errorText = err.message.toLowerCase();
            console.log('Error text (lowercase):', errorText);
            
            // Handle various formats of the "property not found" error
            if (errorText.includes('unable to locate valid property') || 
                errorText.includes('address(es) provided') ||
                errorText.includes('property from address')) {
                msg = 'No skip trace data available - property address not found in database';
                console.log('Using friendly message:', msg);
            } else if (errorText.includes('no phones found') || 
                       errorText.includes('no contact information')) {
                msg = 'No contact information available for this owner';
            } else if (errorText.includes('po box') || 
                       errorText.includes('PO Box') ||
                       errorText.includes('po box addresses cannot be skip traced')) {
                msg = 'Skip trace not available for PO Box addresses - need a physical mailing address';
            } else if (errorText.includes('proxy error') || 
                       errorText.includes('skip‑trace failed')) {
                msg = 'Skip trace service temporarily unavailable - please try again later';
            } else {
                console.error('Unhandled skip trace error:', err.message);
                msg = 'Skip trace failed - please try again or contact support';
            }
        }
        
        console.log('Final message being sent to onError:', msg);
        onError(propertyId, msg);
    }
};