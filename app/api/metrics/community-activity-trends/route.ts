/*
 * CHARLIE2 V2 - Community Activity Trends API
 * Returns weekly trends of properties favorited and total value for community insights
 * Part of the new V2 application architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30';

    // Calculate the start date based on time range
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const supabase = createSupabaseAdminClient();
    
    // Get favorited properties over the time range
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('user_favorites')
      .select('saved_at, property_id')
      .gte('saved_at', startDate.toISOString())
      .order('saved_at', { ascending: true });

    if (favoritesError) {
      console.error('Error fetching favorites data:', favoritesError);
      return NextResponse.json({ error: 'Failed to fetch favorites data' }, { status: 500 });
    }

    if (!favoritesData || favoritesData.length === 0) {
      return NextResponse.json([]);
    }

    // Get estimated values for the favorited properties
    const propertyIds = favoritesData.map(f => f.property_id);
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('saved_properties')
      .select('property_id, estimated_value')
      .in('property_id', propertyIds)
      .not('estimated_value', 'is', null)
      .lte('estimated_value', 50000000);  // Cap at $50M

    if (propertiesError) {
      console.error('Error fetching properties data:', propertiesError);
      return NextResponse.json({ error: 'Failed to fetch properties data' }, { status: 500 });
    }

    // Create a map of property_id to estimated_value
    const propertyValueMap = new Map<string, number>();
    propertiesData?.forEach(prop => {
      const value = parseFloat(prop.estimated_value?.toString() || '0');
      if (!isNaN(value)) {
        propertyValueMap.set(prop.property_id, value);
      }
    });

    // Group by week and calculate counts and total values
    const weeklyData = new Map<string, { count: number; totalValue: number }>();
    
    favoritesData.forEach((favorite) => {
      const date = new Date(favorite.saved_at);
      
      // Get start of week (Sunday)
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      
      const weekKey = startOfWeek.toISOString().split('T')[0];
      const estimatedValue = propertyValueMap.get(favorite.property_id) || 0;
      
      const existing = weeklyData.get(weekKey) || { count: 0, totalValue: 0 };
      weeklyData.set(weekKey, {
        count: existing.count + 1,
        totalValue: existing.totalValue + estimatedValue
      });
    });

    // Convert to array format for chart
    const chartData = Array.from(weeklyData.entries()).map(([date, data]) => ({
      week: date,
      propertiesFavorited: data.count,
      totalValue: data.totalValue
    }));

    // Sort by date
    chartData.sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error in community activity trends API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}