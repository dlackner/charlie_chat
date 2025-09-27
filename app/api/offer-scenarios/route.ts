/*
 * CHARLIE2 V2 - Offer Scenarios API
 * CRUD operations for saved offer analysis scenarios
 * Part of the new V2 API architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET - List offer scenarios for a property
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const all = searchParams.get('all');

    let query = supabase
      .from('offer_scenarios')
      .select(`
        *,
        saved_properties!inner(address_full)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // If propertyId is provided, filter by it; if all=true, get all user offers
    if (propertyId && !all) {
      query = query.eq('property_id', propertyId);
    } else if (!propertyId && !all) {
      return NextResponse.json({ error: 'Property ID is required unless all=true' }, { status: 400 });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching offer scenarios:', error);
      return NextResponse.json({ error: 'Failed to fetch offer scenarios' }, { status: 500 });
    }

    return NextResponse.json({ scenarios: data });
  } catch (error) {
    console.error('Offer scenarios GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new offer scenario
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { propertyId, offerName, offerDescription, offerData } = body;

    if (!propertyId || !offerName || !offerData) {
      return NextResponse.json({ 
        error: 'Property ID, offer name, and offer data are required' 
      }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('offer_scenarios')
      .upsert({
        user_id: user.id,
        property_id: propertyId,
        offer_name: offerName,
        offer_description: offerDescription || null,
        offer_data: offerData,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,property_id,offer_name',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting offer scenario:', error);
      return NextResponse.json({ error: 'Failed to save analysis scenario' }, { status: 500 });
    }

    return NextResponse.json({ scenario: data }, { status: 201 });
  } catch (error) {
    console.error('Offer scenarios POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update offer scenario
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, offerName, offerDescription, offerData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Scenario ID is required' }, { status: 400 });
    }
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (offerName) updateData.offer_name = offerName;
    if (offerDescription !== undefined) updateData.offer_description = offerDescription;
    if (offerData) updateData.offer_data = offerData;

    const { data, error } = await supabase
      .from('offer_scenarios')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only update their own scenarios
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'An offer with this name already exists for this property' 
        }, { status: 409 });
      }
      console.error('Error updating offer scenario:', error);
      return NextResponse.json({ error: 'Failed to update offer scenario' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ scenario: data });
  } catch (error) {
    console.error('Offer scenarios PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete offer scenario
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Scenario ID is required' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('offer_scenarios')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only delete their own scenarios
      .select()
      .single();

    if (error) {
      console.error('Error deleting offer scenario:', error);
      return NextResponse.json({ error: 'Failed to delete offer scenario' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Scenario deleted successfully' });
  } catch (error) {
    console.error('Offer scenarios DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}