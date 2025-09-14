/*
 * CHARLIE2 V2 - Individual Offer Scenario API
 * GET, PUT, DELETE operations for a specific offer scenario
 * Part of the new V2 API architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET - Fetch a specific offer scenario by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { data, error } = await supabase
      .from('offer_scenarios')
      .select('*')
      .eq('id', (await params).id)
      .eq('user_id', user.id) // Ensure user can only access their own scenarios
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching offer scenario:', error);
      return NextResponse.json({ error: 'Failed to fetch offer scenario' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ scenario: data });
  } catch (error) {
    console.error('Offer scenario GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a specific offer scenario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { offer_name, offer_description, offer_data } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (offer_name) updateData.offer_name = offer_name;
    if (offer_description !== undefined) updateData.offer_description = offer_description;
    if (offer_data) updateData.offer_data = offer_data;

    const { data, error } = await supabase
      .from('offer_scenarios')
      .update(updateData)
      .eq('id', (await params).id)
      .eq('user_id', user.id) // Ensure user can only update their own scenarios
      .select()
      .single();

    if (error) {
      console.error('Error updating offer scenario:', error);
      return NextResponse.json({ error: 'Failed to update offer scenario' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ scenario: data });
  } catch (error) {
    console.error('Offer scenario PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Soft delete a specific offer scenario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { data, error } = await supabase
      .from('offer_scenarios')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', (await params).id)
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
    console.error('Offer scenario DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}