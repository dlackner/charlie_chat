/*
 * CHARLIE2 V2 - Update Favorite Market API
 * Allows updating the market assignment of saved properties
 */
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id, market_key } = await req.json();
    
    if (!property_id) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    // Update the market_key field in user_favorites table
    // This represents which user market this property is assigned to
    const { error } = await supabase
      .from('user_favorites')
      .update({ market_key: market_key })
      .eq('user_id', user.id)
      .eq('property_id', property_id);

    if (error) {
      console.error('Error updating property market:', error);
      return NextResponse.json({ error: 'Failed to update property market' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Update market API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}