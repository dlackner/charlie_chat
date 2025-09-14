/*
 * CHARLIE2 V2 - Update Favorite Market API
 * Updates market assignment for properties in user_favorites
 * Converts market_name to market_key using user_markets lookup
 * Part of the new V2 API architecture
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
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

    const { property_id, market_key } = await req.json();
    
    if (!property_id) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    // If market_key looks like a market_name (contains spaces, letters), look up the actual market_key
    let actualMarketKey = market_key;
    
    if (market_key && (market_key.includes(' ') || /^[A-Za-z]/.test(market_key))) {
      // This looks like a market_name, find the corresponding market_key
      const { data: marketData, error: marketError } = await supabase
        .from('user_markets')
        .select('market_key')
        .eq('user_id', user.id)
        .ilike('market_name', `%${market_key}%`)
        .single();

      if (marketError) {
        return NextResponse.json({ error: 'Market not found' }, { status: 404 });
      }
      
      actualMarketKey = marketData.market_key;
    }

    // Update the market_key field in user_favorites table
    const { error } = await supabase
      .from('user_favorites')
      .update({ market_key: actualMarketKey })
      .eq('user_id', user.id)
      .eq('property_id', property_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to update property market' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}