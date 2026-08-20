import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const ACTIVITY_TYPES = [
  'property_searches',
  'properties_retrieved',
  'offers_created',
  'lois_created',
  'marketing_letters_created',
  'emails_sent'
] as const;

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client for auth verification (with anon key)
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const anonSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Create Supabase client with service role key for admin operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is admin
    const { data: callerProfile } = await anonSupabase
      .from('profiles')
      .select('user_class')
      .eq('user_id', user.id)
      .single();

    if (callerProfile?.user_class !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // month param format: YYYY-MM, defaults to current month
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format, expected YYYY-MM' }, { status: 400 });
    }

    const monthStart = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    const nextMonth = monthNum === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNum + 1).padStart(2, '0')}-01`;

    const { data: activityRows, error: activityError } = await supabase
      .from('user_activity_counts')
      .select('user_id, activity_type, count')
      .gte('activity_date', monthStart)
      .lt('activity_date', nextMonth);

    if (activityError) {
      console.error('Error fetching activity counts:', activityError);
      return NextResponse.json({ error: 'Failed to fetch activity metrics' }, { status: 500 });
    }

    const userIds = Array.from(new Set((activityRows || []).map(row => row.user_id)));

    const { data: profiles, error: profilesError } = userIds.length > 0
      ? await supabase
          .from('profiles')
          .select('user_id, email, full_name, user_class')
          .in('user_id', userIds)
      : { data: [], error: null };

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Deal Signals market count is current state (up to 5 watched markets per user),
    // not a monthly activity event, so it's fetched separately and kept out of `total`.
    const { data: dealSignalMarketRows, error: dealSignalMarketsError } = userIds.length > 0
      ? await supabase
          .from('deal_signal_markets')
          .select('user_id')
          .in('user_id', userIds)
      : { data: [], error: null };

    if (dealSignalMarketsError) {
      console.error('Error fetching deal signal markets:', dealSignalMarketsError);
      return NextResponse.json({ error: 'Failed to fetch deal signals market counts' }, { status: 500 });
    }

    const dealSignalMarketCounts = new Map<string, number>();
    for (const row of dealSignalMarketRows || []) {
      dealSignalMarketCounts.set(row.user_id, (dealSignalMarketCounts.get(row.user_id) ?? 0) + 1);
    }

    type UserMetrics = {
      user_id: string;
      email: string | null;
      full_name: string | null;
      user_class: string | null;
      total: number;
      deal_signals_markets: number;
    } & Record<typeof ACTIVITY_TYPES[number], number>;

    const metricsByUser = new Map<string, UserMetrics>();

    for (const row of activityRows || []) {
      if (!metricsByUser.has(row.user_id)) {
        const profile = profileMap.get(row.user_id);
        const base: any = {
          user_id: row.user_id,
          email: profile?.email ?? null,
          full_name: profile?.full_name ?? null,
          user_class: profile?.user_class ?? null,
          total: 0,
          deal_signals_markets: dealSignalMarketCounts.get(row.user_id) ?? 0
        };
        for (const type of ACTIVITY_TYPES) base[type] = 0;
        metricsByUser.set(row.user_id, base as UserMetrics);
      }

      const entry = metricsByUser.get(row.user_id)!;
      if ((ACTIVITY_TYPES as readonly string[]).includes(row.activity_type)) {
        entry[row.activity_type as typeof ACTIVITY_TYPES[number]] += row.count;
        entry.total += row.count;
      }
    }

    const users = Array.from(metricsByUser.values()).sort((a, b) => b.total - a.total);

    const totals: Record<string, number> = { total: 0, deal_signals_markets: 0 };
    for (const type of ACTIVITY_TYPES) totals[type] = 0;
    for (const u of users) {
      totals.total += u.total;
      totals.deal_signals_markets += u.deal_signals_markets;
      for (const type of ACTIVITY_TYPES) totals[type] += u[type];
    }

    return NextResponse.json({ month, users, totals, activityTypes: ACTIVITY_TYPES });
  } catch (error) {
    console.error('Error in admin metrics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
