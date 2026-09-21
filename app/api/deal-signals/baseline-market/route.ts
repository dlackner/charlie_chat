/*
 * Triggers a one-time baseline scan for a single market, right after a user saves it on
 * the setup page - see lib/server/dealSignalsBaseline.ts for what that actually does.
 * Called fire-and-forget from the client (Save doesn't wait on this to complete).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { runMarketBaseline } from '@/lib/server/dealSignalsBaseline';
import { defaultWeights } from '@/lib/dealSignalsCatalog';

export async function POST(req: NextRequest) {
  try {
    const { marketId } = await req.json();
    if (!marketId) {
      return NextResponse.json({ error: 'marketId is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          }
        }
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    const { data: market, error: marketError } = await admin
      .from('deal_signal_markets')
      .select(
        'id, user_id, market_type, city, state, zip, county, units_min, units_max, assessed_value_min, assessed_value_max, estimated_value_min, estimated_value_max, year_built_min, year_built_max, baseline_completed_at'
      )
      .eq('id', marketId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (marketError) {
      return NextResponse.json({ error: `Failed to load market: ${marketError.message}` }, { status: 500 });
    }
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }
    if (market.baseline_completed_at) {
      return NextResponse.json({ skipped: true, reason: 'Already baselined' });
    }

    // Atomic claim: only succeeds if no one else has started (or a stale start from a crashed
    // run more than 10 minutes ago) - prevents two near-simultaneous Save Setup clicks (e.g.
    // Markets tab then Weights tab before the first baseline finishes) from both running a
    // full, separately-paid baseline scan for the same market. Two separate attempts instead
    // of a single .or() filter - combining .or() with .update() in supabase-js/PostgREST
    // throws "column does not exist" here even for a column that plainly exists.
    const { data: freshLock, error: freshLockError } = await admin
      .from('deal_signal_markets')
      .update({ baseline_started_at: new Date().toISOString() })
      .eq('id', marketId)
      .is('baseline_completed_at', null)
      .is('baseline_started_at', null)
      .select('id');

    if (freshLockError) {
      return NextResponse.json({ error: `Failed to claim baseline lock: ${freshLockError.message}` }, { status: 500 });
    }

    let lockedRows = freshLock;
    if (!lockedRows || lockedRows.length === 0) {
      const staleCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: staleLock, error: staleLockError } = await admin
        .from('deal_signal_markets')
        .update({ baseline_started_at: new Date().toISOString() })
        .eq('id', marketId)
        .is('baseline_completed_at', null)
        .lt('baseline_started_at', staleCutoff)
        .select('id');

      if (staleLockError) {
        return NextResponse.json({ error: `Failed to claim baseline lock: ${staleLockError.message}` }, { status: 500 });
      }
      lockedRows = staleLock;
    }

    if (!lockedRows || lockedRows.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'Baseline already in progress' });
    }

    const { data: weightsRow } = await admin
      .from('deal_signal_weights')
      .select('weights, min_signal_strength')
      .eq('user_id', user.id)
      .maybeSingle();

    const weights: Record<string, number> = { ...defaultWeights, ...(weightsRow?.weights || {}) };
    const minSignalStrength = weightsRow?.min_signal_strength ?? 20;

    const result = await runMarketBaseline(admin, market, weights, minSignalStrength);

    await admin
      .from('deal_signal_markets')
      .update({ baseline_completed_at: new Date().toISOString() })
      .eq('id', marketId);

    return NextResponse.json({ marketId, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}
