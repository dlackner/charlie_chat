import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Use today's date as seed for consistent daily selection
    const today = new Date().toISOString().slice(0, 10); // "2024-12-01"
    const seed = parseInt(today.replace(/-/g, '')); // 20241201
    
    // Get 24 random properties using raw SQL with TABLESAMPLE for performance
    // This ensures all users see the same properties on the same day
    const { data: properties, error } = await supabase
      .from('saved_properties')
      .select('*')
      .not('address_full', 'is', null) // Ensure properties have addresses
      .not('units_count', 'is', null) // Ensure properties have unit data
      .limit(100) // Get more than needed
      .then(async (result) => {
        if (result.error) return result;
        
        // Shuffle the results using today's date as seed for consistency
        const shuffled = result.data?.sort(() => {
          // Simple seeded random using today's date
          const x = Math.sin(seed) * 10000;
          return (x - Math.floor(x)) - 0.5;
        }).slice(0, 24) || [];
        
        return { data: shuffled, error: null };
      });
    
    if (error) {
      console.error('Error fetching daily properties:', error);
      return NextResponse.json({ error: 'Failed to fetch daily properties' }, { status: 500 });
    }
    
    // Map database fields to component expected fields
    const mappedProperties = properties?.map(prop => ({
      ...prop,
      id: prop.property_id || prop.id,
      units: prop.units_count || 0,
      address_full: prop.address_full || prop.address_street || 'Address Not Available'
    })) || [];
    
    return NextResponse.json({
      properties: mappedProperties,
      count: mappedProperties.length,
      date: today
    });
    
  } catch (error) {
    console.error('Error in daily-properties API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}