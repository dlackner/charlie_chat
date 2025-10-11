/*
 * CHARLIE2 V2 - LOIs Over Time API
 * Returns weekly LOI creation counts for metrics dashboard
 * Part of the new V2 application architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '90';
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Calculate the start date based on time range
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const supabase = createSupabaseAdminClient();
    
    // Get LOI activity data for the specified time range
    const { data: activityData, error } = await supabase
      .from('user_activity_counts')
      .select('activity_date, count')
      .eq('user_id', userId)
      .eq('activity_type', 'lois_created')
      .gte('activity_date', startDate.toISOString().split('T')[0])
      .order('activity_date', { ascending: true });

    if (error) {
      console.error('Error fetching LOI activity data:', error);
      return NextResponse.json({ error: 'Failed to fetch LOI data' }, { status: 500 });
    }

    // Group by week and sum counts
    const weeklyData = new Map<string, { count: number }>();
    
    activityData?.forEach((activity) => {
      const date = new Date(activity.activity_date);
      
      // Get start of week (Sunday)
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      
      const weekKey = startOfWeek.toISOString().split('T')[0];
      const existing = weeklyData.get(weekKey) || { count: 0 };
      weeklyData.set(weekKey, { count: existing.count + activity.count });
    });

    // Convert to array format for chart
    const chartData = Array.from(weeklyData.entries()).map(([date, data]) => ({
      date,
      count: data.count
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error in LOIs over time API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}