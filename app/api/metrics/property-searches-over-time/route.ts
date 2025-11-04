/*
 * CHARLIE2 V2 - Property Searches Over Time API
 * Returns property search activity metrics for a specific user over time
 * Used for monthly activity reports and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const timeRange = searchParams.get('timeRange') || '30';

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const days = parseInt(timeRange);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query user_activity_counts table for property searches
    const { data, error } = await supabase
      .from('user_activity_counts')
      .select('activity_date, count')
      .eq('user_id', userId)
      .eq('activity_type', 'property_searches')
      .gte('activity_date', startDate.toISOString().split('T')[0])
      .lte('activity_date', endDate.toISOString().split('T')[0])
      .order('activity_date', { ascending: true });

    if (error) {
      console.error('Error fetching property searches data:', error);
      return NextResponse.json({ error: 'Failed to fetch property searches data' }, { status: 500 });
    }

    // Group data by week to match the format of other metrics
    const weeklyData: { [key: string]: number } = {};
    
    if (data) {
      data.forEach(record => {
        const date = new Date(record.activity_date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Get Sunday of that week
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = 0;
        }
        weeklyData[weekKey] += record.count;
      });
    }

    // Convert to array format matching other metrics APIs
    const chartData = Object.entries(weeklyData).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: count
    }));

    return NextResponse.json(chartData);

  } catch (error) {
    console.error('Error in property-searches-over-time API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}