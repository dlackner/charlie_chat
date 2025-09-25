//USED IN THE THE NEW V2 VERSION

// /api/skiptrace/route.ts – simplified (no legacy mail_* support)

import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Upstream request & response types                                  */
/* ------------------------------------------------------------------ */

type SkipTraceRequest = {
  address: string;
  city: string;
  state: string;
  zip: string;
  first_name?: string; // optional
  last_name?: string;  // optional
};

interface SkipTraceApiResponse {
  requestId: string;
  responseCode: number;
  responseMessage: string;
  warnings: string;
  match: boolean;
  credits: number;
  input: Record<string, any>;
  output?: Record<string, any>;
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    /* 1️⃣ Parse and basic‑validate body -------------------------------- */
    const body: SkipTraceRequest = await req.json();

    const missing = ['address', 'city', 'state', 'zip'].filter(
      k => !(body as any)[k]?.trim()
    );

    if (missing.length) {
      return NextResponse.json(
        { error: 'Missing required fields', required: missing, received: body },
        { status: 400 }
      );
    }

    /* 2️⃣ Normalise payload -------------------------------------------------- */
    const payload: SkipTraceRequest = {
      address: body.address.trim(),
      city: body.city.trim(),
      state: body.state.trim(),
      zip: body.zip.trim(),
      // add name fields only if non‑empty
      ...(body.first_name?.trim() && { first_name: body.first_name.trim() }),
      ...(body.last_name?.trim() && { last_name: body.last_name.trim() }),
    };
    /* 3️⃣ Call upstream RealEstateAPI --------------------------------- */
    const upstream = await fetch('https://api.realestateapi.com/v1/SkipTrace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-Key': process.env.REALESTATE_SKIP_API_KEY ?? '',
        'X-User-Id': process.env.REALESTATE_SKIP_USER_ID ?? 'MyApp',
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: 'Upstream error', status: upstream.status, body: text },
        { status: upstream.status }
      );
    }

    const data: SkipTraceApiResponse = await upstream.json();

    /* 4️⃣ Handle upstream result -------------------------------------- */
    if (data.responseCode !== 0) {
      if (data.responseMessage?.includes('No phones found')) {
        return NextResponse.json(
          {
            success: false,
            message: 'No contact information available for this owner',
            responseCode: data.responseCode,
            data: null,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          error: 'Skip‑trace failed',
          responseCode: data.responseCode,
          message: data.responseMessage,
          warnings: data.warnings,
        },
        { status: 422 }
      );
    }

    /* 5️⃣ Success – pass upstream payload straight through ------------- */
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('[SkipTrace] proxy error', err);

    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/* Simple GET health‑check */
export async function GET() {
  return NextResponse.json(
    { message: 'Skip‑trace proxy running', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
