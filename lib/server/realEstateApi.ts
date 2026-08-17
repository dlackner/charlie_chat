/*
 * Direct server-to-server RealEstateAPI client.
 * Called by server-only code (e.g. the Deal Signals scan job) that must never go through the
 * app's own /api/realestateapi route - a self-fetch that works locally but fails silently in
 * production on Render. See project_render_self_fetch_bug memory for the original incident.
 */

const REALESTATE_API_URL = 'https://api.realestateapi.com/v2/PropertySearch';

export interface RealEstateApiResult {
  ok: boolean;
  data?: any;
  error?: string;
}

export async function searchRealEstateApi(payload: Record<string, any>): Promise<RealEstateApiResult> {
  try {
    const res = await fetch(REALESTATE_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-key': process.env.REALESTATE_API_KEY!,
        'x-user-id': process.env.REALESTATE_API_USER_ID!,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data?.error || `RealEstateAPI returned ${res.status}` };
    }

    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'RealEstateAPI request failed' };
  }
}
