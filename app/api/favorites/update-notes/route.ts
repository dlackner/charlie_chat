/*
 * CHARLIE2 V2 - Update Favorite Notes API
 * Allows updating the notes field of saved properties for reminders functionality
 * Part of the new V2 API architecture
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
    console.log('Auth result - user:', user?.id, 'error:', authError);
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id, notes } = await req.json();
    console.log('Request body - property_id:', property_id, 'notes:', notes);
    
    if (!property_id) {
      console.log('Missing property_id in request');
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }
    
    if (!user.id) {
      console.log('User ID is missing from authenticated user');
      return NextResponse.json({ error: 'User ID missing' }, { status: 401 });
    }

    // Update the notes for this user's property
    console.log('Attempting to update notes for user:', user.id, 'property:', property_id, 'notes:', notes);
    
    const { data, error, count } = await supabase
      .from('user_favorites')
      .update({ notes: notes || '' })
      .eq('user_id', user.id)
      .eq('property_id', property_id)
      .select();

    console.log('Update result - data:', data, 'error:', error, 'count:', count);

    if (error) {
      console.error('Error updating favorite notes:', error);
      return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.error('No records updated - user_favorites record may not exist');
      return NextResponse.json({ error: 'No matching favorite record found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Update favorite notes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}