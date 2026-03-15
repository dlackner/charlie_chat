/*
 * CHARLIE2 V2 - Rental Data API
 * Serves market rental data from database for map overlays
 * Replaces CSV-based approach with real-time database queries
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch all rental data from database
    const { data: rentalData, error } = await supabase
      .from('market_rental_data')
      .select('region_id, size_rank, city_state, latitude, longitude, monthly_rental_average, radius, year_over_year_growth, yoy_growth_numeric')
      .order('size_rank', { ascending: true });

    if (error) {
      console.error('Error fetching rental data:', error);
      return NextResponse.json({ error: 'Failed to fetch rental data' }, { status: 500 });
    }

    if (!rentalData) {
      return NextResponse.json([], { status: 200 });
    }

    // Transform database format to CSV format for compatibility with RentDataProcessor
    const csvContent = [
      'RegionID,SizeRank,City/State,Lat,Long,Monthly Average,Radius,YOY %',
      ...rentalData.map(row =>
        `${row.region_id},${row.size_rank},"${row.city_state}",${row.latitude},${row.longitude},${row.monthly_rental_average},${row.radius},"${row.year_over_year_growth || ''}"`
      )
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'ETag': `"rental-data-${Date.now()}"` // Simple ETag for cache busting
      }
    });
  } catch (error) {
    console.error('Error in rental data API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
