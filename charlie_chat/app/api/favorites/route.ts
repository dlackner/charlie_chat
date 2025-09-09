import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
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
    
    // TEMPORARY: Hardcoded user for testing
    const user = { id: '99b75078-44aa-4e04-a66e-7b414c55c976' };
    
    // TODO: Restore auth check when sign-in is implemented
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { property_id, property_data, action } = await req.json();
    
    if (!property_id) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    if (action === 'add') {
      // First, save the property data to saved_properties table
      if (property_data) {
        // Only include fields that exist in the saved_properties table schema
        const validFields = [
          'address_street', 'address_full', 'address_city', 'address_state', 'address_zip',
          'latitude', 'longitude', 'mail_address_full', 'mail_address_street', 'mail_address_city', 
          'mail_address_county', 'mail_address_state', 'mail_address_zip', 'property_type', 'units_count',
          'stories', 'year_built', 'square_feet', 'lot_square_feet', 'flood_zone', 'flood_zone_description',
          'assessed_value', 'assessed_land_value', 'estimated_value', 'estimated_equity', 'rent_estimate',
          'listing_price', 'mortgage_balance', 'mortgage_maturing_date', 'last_sale_date', 'last_sale_amount',
          'last_sale_arms_length', 'years_owned', 'mls_active', 'for_sale', 'assumable', 'auction', 'reo',
          'tax_lien', 'pre_foreclosure', 'foreclosure', 'private_lender', 'owner_first_name', 'owner_last_name',
          'out_of_state_absentee_owner', 'in_state_absentee_owner', 'owner_occupied', 'corporate_owned',
          'investor_buyer', 'lender_name', 'total_portfolio_equity', 'total_portfolio_mortgage_balance',
          'total_properties_owned', 'equity_percent', 'loan_to_value_ratio', 'mortgage_rate_first',
          'mortgage_amount_first', 'mortgage_type_first', 'total_open_mortgage_balance', 'building_square_feet',
          'effective_year_built', 'school_district_name', 'school_rating', 'neighborhood_name', 'walk_score',
          'median_household_income', 'distressed_property', 'bankruptcy_date', 'tax_delinquent', 'lien_amount',
          'judgment_amount', 'owner_type', 'owner_mailing_address_same_as_property', 'years_of_ownership'
        ];

        const filteredPropertyData: any = { property_id: property_id };
        
        // Only include fields that exist in the database schema
        validFields.forEach(field => {
          if (property_data[field] !== undefined) {
            filteredPropertyData[field] = property_data[field];
          }
        });


        const { error: propertyError } = await supabase
          .from('saved_properties')
          .upsert(filteredPropertyData, {
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
    
    // TEMPORARY: Hardcoded user for testing
    const user = { id: '99b75078-44aa-4e04-a66e-7b414c55c976' };
    
    // TODO: Restore auth check when sign-in is implemented
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

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