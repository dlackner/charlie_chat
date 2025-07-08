// /api/skiptrace/route.ts - Skip Trace API Endpoint

import { NextRequest, NextResponse } from 'next/server';

interface SkipTraceRequest {
  first_name: string;
  last_name: string;
  mail_address: string;
  mail_city: string;
  mail_state: string;
}

interface SkipTraceApiResponse {
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

export async function POST(request: NextRequest) {
  try {
    // Parse the incoming request body
    const body: SkipTraceRequest = await request.json();

    // Validate required fields
    const { first_name, last_name, mail_address, mail_city, mail_state } = body;

    if (!first_name || !last_name || !mail_address || !mail_city || !mail_state) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['first_name', 'last_name', 'mail_address', 'mail_city', 'mail_state'],
          received: body
        },
        { status: 400 }
      );
    }

    // Prepare the request payload for the external API
    const apiPayload = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      mail_address: mail_address.trim(),
      mail_city: mail_city.trim(),
      mail_state: mail_state.trim()
    };

    console.log('Skip trace request payload:', apiPayload);

    // Make the request to the external skip trace API
    const externalApiResponse = await fetch('https://api.realestateapi.com/v1/SkipTrace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.REALESTATE_SKIP_API_KEY || '',
        // Add any other required headers
      },
      body: JSON.stringify(apiPayload),
    });

    // Check if the external API request was successful
    if (!externalApiResponse.ok) {
      const errorText = await externalApiResponse.text();
      console.error('External skip trace API error:', {
        status: externalApiResponse.status,
        statusText: externalApiResponse.statusText,
        body: errorText
      });

      return NextResponse.json(
        {
          error: 'Skip trace API request failed',
          status: externalApiResponse.status,
          message: errorText
        },
        { status: externalApiResponse.status }
      );
    }

    // Parse the response from the external API
    const apiData: SkipTraceApiResponse = await externalApiResponse.json();

    console.log('Skip trace API response:', {
      requestId: apiData.requestId,
      responseCode: apiData.responseCode,
      match: apiData.match,
      credits: apiData.credits
    });

      // Check if the skip trace was successful
    if (apiData.responseCode !== 0) {
      // Handle specific "no phones found" case differently
      if (apiData.responseMessage && apiData.responseMessage.includes('No phones found')) {
        return NextResponse.json({
          success: false,
          message: 'No contact information available for this property owner',
          responseCode: apiData.responseCode,
          data: null
        }, { status: 200 }); // Return 200 instead of 422
      }

      // Handle other actual errors
      return NextResponse.json(
        {
          error: 'Skip trace failed',
          responseCode: apiData.responseCode,
          message: apiData.responseMessage,
          warnings: apiData.warnings
        },
        { status: 422 }
      );
    }

    // Return the successful response
    return NextResponse.json(apiData, { status: 200 });

  } catch (error) {
    console.error('Skip trace endpoint error:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Failed to connect to skip trace API' },
        { status: 503 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET method for health check
export async function GET() {
  return NextResponse.json(
    {
      message: 'Skip trace API endpoint is running',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}