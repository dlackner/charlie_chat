/*
 * CHARLIE2 V2 - Daily Offers Count API
 * Returns count of offers created on a specific date
 * Part of the new V2 API architecture for activity coaching
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Query offer scenarios for the specific date
    const { data: offers, error } = await supabase
      .from('offer_scenarios')
      .select('id, created_at')
      .eq('user_id', user.id)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`);

    if (error) {
      console.error('Error fetching daily offers:', error);
      return NextResponse.json({ error: 'Failed to fetch offers count' }, { status: 500 });
    }

    console.log(`Found ${offers?.length || 0} offers for user ${user.id} on ${date}`);

    return NextResponse.json({ 
      date,
      count: offers?.length || 0,
      user_id: user.id
    });
    
  } catch (error) {
    console.error('Daily offers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}