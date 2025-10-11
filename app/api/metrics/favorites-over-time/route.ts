/*
 * CHARLIE2 V2 - Favorites Over Time API
 * Returns chart data for user favorites added over time
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

    // Query user favorites within the date range
    const { data: weeklyData, error } = await supabase
      .from('user_favorites')
      .select('saved_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gte('saved_at', startDateStr)
      .order('saved_at', { ascending: true });

    if (error) {
      console.error('Error fetching favorites for chart:', error);
      return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }

    console.log(`Found ${weeklyData?.length || 0} favorites for user ${user.id} since ${startDateStr}`);

    // Group favorites by week using PostgreSQL's DATE_TRUNC logic (Monday start)
    const weeklyCounts = new Map<string, number>();

    weeklyData.forEach(favorite => {
      const favoriteDate = new Date(favorite.saved_at);
      // Get Monday of the week (PostgreSQL DATE_TRUNC('week') behavior)
      const monday = new Date(favoriteDate);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      
      const weekKey = monday.toISOString().split('T')[0];
      weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) || 0) + 1);
    });

    // Convert to chart data format (just show first day of week)
    const chartData = Array.from(weeklyCounts.entries()).map(([weekStart, count]) => {
      const startDate = new Date(weekStart);
      return {
        date: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('Final chart data:', chartData);

    return NextResponse.json({ 
      chartData,
      summary: {
        total: weeklyData.length,
        average: weeklyData.length / Math.max(weeklyCounts.size, 1),
        period: `${weeklyCounts.size} weeks`
      }
    });
    
  } catch (error) {
    console.error('Favorites over time API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}