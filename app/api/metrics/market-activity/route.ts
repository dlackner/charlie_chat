/*
 * CHARLIE2 V2 - Market Activity Distribution API
 * Returns chart data for user activity across different markets
 * Part of the new V2 API architecture
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
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate the start date based on the days parameter
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Query user favorites with market data and property values within the date range
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        market_key, 
        saved_at,
        saved_properties:property_id (
          estimated_value
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gte('saved_at', startDateStr)
      .order('saved_at', { ascending: true });

    if (error) {
      console.error('Error fetching market activity:', error);
      return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }

    // Get user markets to map market_key to market_name
    const { data: marketsData, error: marketsError } = await supabase
      .from('user_markets')
      .select('market_key, market_name')
      .eq('user_id', user.id);

    if (marketsError) {
      console.error('Error getting markets:', marketsError);
    }

    // Create a map of market_key to market_name
    const marketMap = new Map();
    if (marketsData) {
      marketsData.forEach(market => {
        marketMap.set(market.market_key, market.market_name);
      });
    }

    // Group favorites by market with counts and estimated values
    const marketData = new Map<string, { count: number; total_value: number }>();

    favorites.forEach(favorite => {
      const marketKey = favorite.market_key || 'no_market';
      const marketName = marketKey === 'no_market' ? 'No Market' : (marketMap.get(marketKey) || `Market ${marketKey}`);
      const estimatedValue = (favorite.saved_properties as any)?.estimated_value || 0;
      
      if (marketData.has(marketName)) {
        const existing = marketData.get(marketName)!;
        marketData.set(marketName, {
          count: existing.count + 1,
          total_value: existing.total_value + estimatedValue
        });
      } else {
        marketData.set(marketName, {
          count: 1,
          total_value: estimatedValue
        });
      }
    });

    // Convert to chart data format and sort by count
    const chartData = Array.from(marketData.entries())
      .map(([market_name, data]) => ({
        market_name,
        count: data.count,
        total_value: data.total_value
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ 
      chartData,
      summary: {
        total_properties: favorites.length,
        unique_markets: chartData.length,
        period: `${days} days`,
        top_market: chartData.length > 0 ? chartData[0].market_name : 'None'
      }
    });
    
  } catch (error) {
    console.error('Market activity API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}