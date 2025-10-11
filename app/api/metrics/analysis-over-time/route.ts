/*
 * CHARLIE2 V2 - Offers Created Over Time API
 * Returns chart data for offers created over time
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

    // Query offer scenarios with purchase price data within the date range
    const { data: offers, error } = await supabase
      .from('offer_scenarios')
      .select('created_at, offer_data')
      .eq('user_id', user.id)
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching offers for chart:', error);
      return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }

    console.log(`Found ${offers?.length || 0} offers for user ${user.id} since ${startDateStr}`);
    
    // Debug: Check the structure of offer_data
    if (offers && offers.length > 0) {
      console.log('Sample offer_data:', JSON.stringify(offers[0].offer_data, null, 2));
    }

    // Helper function to get week start date (Sunday)
    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Group offers by week with count and total purchase price
    const weeklyData = new Map<string, { count: number; totalPrice: number }>();

    // Calculate number of weeks to cover the date range
    const numWeeks = Math.ceil(days / 7);

    // Initialize all weeks in range with 0
    for (let i = 0; i < numWeeks; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1));
      const weekStart = getWeekStart(date);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyData.set(weekKey, { count: 0, totalPrice: 0 });
    }

    // Count actual offers by week and sum purchase prices
    offers.forEach(offer => {
      const offerDate = new Date(offer.created_at);
      const weekStart = getWeekStart(offerDate);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (weeklyData.has(weekKey)) {
        const existing = weeklyData.get(weekKey)!;
        const purchasePrice = offer.offer_data?.purchasePrice || 0;
        console.log(`Offer ${offer.created_at}: offer_data =`, offer.offer_data, 'purchasePrice =', purchasePrice);
        weeklyData.set(weekKey, {
          count: existing.count + 1,
          totalPrice: existing.totalPrice + purchasePrice
        });
      }
    });

    // Convert to chart data format (just show first day of week)
    const chartData = Array.from(weeklyData.entries()).map(([weekStart, data]) => {
      const startDate = new Date(weekStart);
      return {
        date: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: data.count,
        totalPrice: data.totalPrice
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ 
      chartData,
      summary: {
        total: offers.length,
        average: offers.length / numWeeks,
        period: `${numWeeks} weeks`
      }
    });
    
  } catch (error) {
    console.error('Offers over time API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}