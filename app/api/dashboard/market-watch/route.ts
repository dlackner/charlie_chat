/*
 * Market Watch feed aggregation - the on-market counterpart to /api/dashboard/signals.
 * Turns deal_signal_events rows for the two Market Watch signal keys (new_listing,
 * price_reduced - see lib/server/dealSignalsExtraction.ts) into MarketWatchItem[]. These are
 * never scored/weighted and never gated by min_signal_strength - they're ambient "something
 * changed, go look in Discover" prompts, not motivation signals.
 *
 * One card per EVENT, not per property (unlike Signal Feed) - a property that both goes
 * active and later gets a price cut is two distinct, separately timestamped things worth
 * surfacing, not one accumulating card.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getLocationKey } from '@/lib/server/dealSignalsLocation';
import { passesMarketFilters, type MarketCriteria } from '@/lib/server/dealSignalsMarketFilters';
import { MARKET_WATCH_SIGNALS } from '@/lib/server/dealSignalsExtraction';

interface MarketRow extends MarketCriteria {
  id: string;
  market_type: 'city' | 'zip' | 'county';
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}

export async function GET(_req: NextRequest) {
  try {
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

    const { data: marketRows, error: marketsError } = await admin
      .from('deal_signal_markets')
      .select(
        'id, market_type, city, state, zip, county, units_min, units_max, assessed_value_min, assessed_value_max, estimated_value_min, estimated_value_max, year_built_min, year_built_max'
      )
      .eq('user_id', user.id);

    if (marketsError) {
      return NextResponse.json({ error: `Failed to load markets: ${marketsError.message}` }, { status: 500 });
    }

    const markets: MarketRow[] = marketRows || [];
    if (markets.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const marketsByLocationKey = new Map<string, MarketRow[]>();
    for (const m of markets) {
      const key = getLocationKey(m);
      const list = marketsByLocationKey.get(key) || [];
      list.push(m);
      marketsByLocationKey.set(key, list);
    }
    const locationKeys = Array.from(marketsByLocationKey.keys());

    const { data: snapshotRows, error: snapshotsError } = await admin
      .from('deal_signal_property_snapshots')
      .select('property_id, location_key, flags')
      .in('location_key', locationKeys);

    if (snapshotsError) {
      return NextResponse.json({ error: `Failed to load snapshots: ${snapshotsError.message}` }, { status: 500 });
    }

    const marketWatchSnapshots = (snapshotRows || []).filter((row: any) =>
      MARKET_WATCH_SIGNALS.some((key) => row.flags?.[key])
    );
    if (marketWatchSnapshots.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const propertyIds = marketWatchSnapshots.map((s: any) => s.property_id);
    const locationKeyByProperty = new Map(marketWatchSnapshots.map((s: any) => [s.property_id, s.location_key]));

    // Same "already decided" exclusion Signal Feed uses - favorited or rejected properties
    // don't need an ambient nudge back to Discover.
    const { data: favoriteRows } = await admin
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', user.id)
      .in('property_id', propertyIds);
    const decidedPropertyIds = new Set((favoriteRows || []).map((f: any) => f.property_id));

    const remainingIds = propertyIds.filter((id: string) => !decidedPropertyIds.has(id));
    if (remainingIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // "Not interested right now" - unlike the favorites exclusion above, this only hides an
    // event while it's no newer than the dismissal. Each Market Watch card is its own event
    // (not aggregated per property like Signal Feed), so a later event on the same property
    // - e.g. a price drop after a dismissed "new listing" - reappears on its own.
    const { data: dismissalRows } = await admin
      .from('deal_signal_dismissals')
      .select('property_id, dismissed_at')
      .eq('user_id', user.id)
      .in('property_id', remainingIds);
    const dismissedAtByProperty = new Map<string, string>(
      (dismissalRows || []).map((d: any) => [d.property_id, d.dismissed_at])
    );

    const { data: eventRows, error: eventsError } = await admin
      .from('deal_signal_events')
      .select('property_id, signal_key, detected_at, property_snapshot')
      .in('property_id', remainingIds)
      .in('signal_key', MARKET_WATCH_SIGNALS as unknown as string[])
      .order('detected_at', { ascending: false });

    if (eventsError) {
      return NextResponse.json({ error: `Failed to load events: ${eventsError.message}` }, { status: 500 });
    }

    // Each signal_key can only ever fire once per property (false->true, never resets), but
    // dedupe defensively in case of a re-run.
    const seenEventKeys = new Set<string>();
    const items: any[] = [];

    for (const event of eventRows || []) {
      const dedupeKey = `${event.property_id}-${event.signal_key}`;
      if (seenEventKeys.has(dedupeKey)) continue;
      seenEventKeys.add(dedupeKey);

      const dismissedAt = dismissedAtByProperty.get(event.property_id);
      if (dismissedAt && new Date(dismissedAt).getTime() >= new Date(event.detected_at).getTime()) continue;

      const locationKey = locationKeyByProperty.get(event.property_id);
      const marketsForLocation = marketsByLocationKey.get(locationKey) || [];
      const propSnapshot = event.property_snapshot || {};
      const matchedMarket = marketsForLocation.find((m) => passesMarketFilters(propSnapshot, m));
      if (!matchedMarket) continue;

      const detectedLabel = formatRelativeTime(event.detected_at);
      const address = propSnapshot.address || 'Address unavailable';
      const city = propSnapshot.city || '';
      const state = propSnapshot.state || '';
      const price = propSnapshot.mlsListingPrice != null ? formatCurrency(propSnapshot.mlsListingPrice) : null;

      const badge = event.signal_key === 'new_listing' ? 'New listing' : 'Price drop';
      const detail =
        event.signal_key === 'new_listing'
          ? [propSnapshot.units ? `${propSnapshot.units} units` : null, price].filter(Boolean).join(' · ') || 'New on market'
          : price
            ? `Reduced to ${price}`
            : 'Price reduced';

      items.push({
        id: dedupeKey,
        propertyId: event.property_id,
        marketId: matchedMarket.id,
        badge,
        address,
        city,
        state,
        detail,
        meta: detectedLabel,
        detectedAt: event.detected_at
      });
    }

    items.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}
