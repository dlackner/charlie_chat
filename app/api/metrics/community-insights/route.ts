/*
 * CHARLIE2 V2 - Community Insights API
 * Returns community-wide metrics for the metrics dashboard top row
 * Part of the new V2 application architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    // Get total number of users from profiles table
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('user_id', { count: 'exact', head: true });

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching user count:', userError);
    }

    // Get total number of favorited properties from user_favorites table
    const { count: favoritedCount, error: favoritedError } = await supabase
      .from('user_favorites')
      .select('property_id', { count: 'exact', head: true });

    if (favoritedError && favoritedError.code !== 'PGRST116') {
      console.error('Error fetching favorited properties count:', favoritedError);
    }

    // Get average estimated value of favorited properties (capped at $50M to exclude outliers)
    // Join user_favorites with saved_properties to get estimated_value of favorited properties
    const { data: avgValueData, error: avgValueError } = await supabase
      .from('user_favorites')
      .select(`
        saved_properties!inner(estimated_value)
      `)
      .not('saved_properties.estimated_value', 'is', null)
      .lte('saved_properties.estimated_value', 50000000);

    if (avgValueError) {
      console.error('Error fetching average estimated value:', avgValueError);
    }

    // Calculate average estimated value of favorited properties
    let averageEstimatedValue = 0;
    if (avgValueData && avgValueData.length > 0) {
      console.log('Sample avgValueData entries:', avgValueData.slice(0, 5));
      
      const values = avgValueData.map((favorite: any) => {
        const value = parseFloat(favorite.saved_properties?.estimated_value?.toString() || '0');
        return isNaN(value) ? 0 : value;
      }).filter(value => value > 0);
      
      console.log('Sample estimated values:', values.slice(0, 10));
      console.log('Min value:', Math.min(...values));
      console.log('Max value:', Math.max(...values));
      console.log('Count of valid values:', values.length);
      
      if (values.length > 0) {
        const total = values.reduce((sum, value) => sum + value, 0);
        averageEstimatedValue = Math.round(total / values.length);
        console.log('Total:', total, 'Average:', averageEstimatedValue);
      }
    }

    // Get count of properties searched (from saved_properties)
    const { count: searchedCount, error: searchedError } = await supabase
      .from('saved_properties')
      .select('property_id', { count: 'exact', head: true });

    if (searchedError && searchedError.code !== 'PGRST116') {
      console.error('Error fetching searched properties count:', searchedError);
    }

    // Return the community insights
    return NextResponse.json({
      totalUsers: userCount || 0,
      totalFavorited: favoritedCount || 0,
      averageEstimatedValue: averageEstimatedValue,
      propertiesSearched: searchedCount || 0
    });

  } catch (error) {
    console.error('Error in community insights API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}