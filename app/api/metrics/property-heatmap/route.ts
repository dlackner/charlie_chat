/*
 * CHARLIE2 V2 - Property Heat Map API
 * Returns property locations and favorite counts for heat map visualization
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
    
    // Get favorited properties with their locations from the time range
    const { data: heatmapData, error } = await supabase
      .from('user_favorites')
      .select(`
        property_id,
        saved_properties!inner(
          latitude,
          longitude,
          address_city,
          address_state,
          estimated_value
        )
      `)
      .gte('saved_at', startDate.toISOString())
      .not('saved_properties.latitude', 'is', null)
      .not('saved_properties.longitude', 'is', null);

    if (error) {
      console.error('Error fetching heatmap data:', error);
      return NextResponse.json({ error: 'Failed to fetch heatmap data' }, { status: 500 });
    }

    if (!heatmapData || heatmapData.length === 0) {
      return NextResponse.json([]);
    }

    // Process the data to count favorites by location
    const locationCounts = new Map<string, {
      latitude: number;
      longitude: number;
      count: number;
      city: string;
      state: string;
      totalValue: number;
    }>();

    heatmapData.forEach((favorite: any) => {
      const property = favorite.saved_properties;
      if (!property || !property.latitude || !property.longitude) return;

      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);
      const estimatedValue = parseFloat(property.estimated_value || '0');
      
      if (isNaN(lat) || isNaN(lng)) return;

      // Round coordinates to create location clusters (approximately 0.1 degree = ~11km)
      const roundedLat = Math.round(lat * 10) / 10;
      const roundedLng = Math.round(lng * 10) / 10;
      const locationKey = `${roundedLat},${roundedLng}`;

      const existing = locationCounts.get(locationKey) || {
        latitude: roundedLat,
        longitude: roundedLng,
        count: 0,
        city: property.address_city || 'Unknown',
        state: property.address_state || 'Unknown',
        totalValue: 0
      };

      locationCounts.set(locationKey, {
        ...existing,
        count: existing.count + 1,
        totalValue: existing.totalValue + estimatedValue
      });
    });

    // Convert to array format for heat map
    const heatmapPoints = Array.from(locationCounts.values()).map(location => ({
      latitude: location.latitude,
      longitude: location.longitude,
      weight: location.count, // This will be used for heat map intensity
      count: location.count,
      city: location.city,
      state: location.state,
      totalValue: location.totalValue,
      averageValue: location.totalValue / location.count
    }));

    return NextResponse.json(heatmapPoints);
  } catch (error) {
    console.error('Error in property heatmap API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}