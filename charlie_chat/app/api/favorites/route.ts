import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id, property_data, action } = await req.json();
    
    if (!property_id) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    if (action === 'add') {
      // First, save the property data to saved_properties table
      if (property_data) {
        const { error: propertyError } = await supabase
          .from('saved_properties')
          .upsert({
            property_id: property_id,
            ...property_data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'property_id'
          });

        if (propertyError) {
          console.error('Error saving property data:', propertyError);
          return NextResponse.json({ error: 'Failed to save property data' }, { status: 500 });
        }
      }

      // Then add to user favorites
      const { data, error } = await supabase
        .from('user_favorites')
        .upsert({
          user_id: user.id,
          property_id: property_id,
          is_active: true,
          status: 'active',
          recommendation_type: 'manual'
        }, {
          onConflict: 'user_id,property_id'
        })
        .select();

      if (error) {
        console.error('Error adding favorite:', error);
        return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
      }

      return NextResponse.json({ success: true, favorite: data[0] });
      
    } else if (action === 'remove') {
      // Remove from favorites (set is_active to false)
      const { error } = await supabase
        .from('user_favorites')
        .update({ 
          is_active: false,
          status: 'archived'
        })
        .eq('user_id', user.id)
        .eq('property_id', property_id);

      if (error) {
        console.error('Error removing favorite:', error);
        return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Favorites API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const property_id = searchParams.get('property_id');
    
    if (property_id) {
      // Check if specific property is favorited
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('property_id', property_id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking favorite:', error);
        return NextResponse.json({ error: 'Failed to check favorite status' }, { status: 500 });
      }

      return NextResponse.json({ is_favorite: !!data });
    } else {
      // Get all user favorites
      const { data, error } = await supabase
        .from('user_favorites')
        .select('property_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error getting favorites:', error);
        return NextResponse.json({ error: 'Failed to get favorites' }, { status: 500 });
      }

      const favoritePropertyIds = data.map(fav => fav.property_id);
      return NextResponse.json({ favorites: favoritePropertyIds });
    }
    
  } catch (error) {
    console.error('Favorites API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}