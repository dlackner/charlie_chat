/*
 * CHARLIE2 V2 - Saved Searches API
 * CRUD operations for user's saved search criteria
 * Part of the new V2 API architecture
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch user's saved searches
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's saved searches
    const { data: savedSearches, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved searches:', error);
      return NextResponse.json({ error: 'Failed to fetch saved searches' }, { status: 500 });
    }

    return NextResponse.json({ data: savedSearches });

  } catch (error) {
    console.error('Saved searches GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new saved search
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/v2/saved-searches called');
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { name, description, filters } = await request.json();
    console.log('Request body parsed, user_id:', session.user.id);

    // Validate required fields
    if (!name || !filters) {
      return NextResponse.json({ 
        error: 'Name and filters are required' 
      }, { status: 400 });
    }

    // Insert new saved search
    const { data: savedSearch, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        filters: filters
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating saved search:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to create saved search', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ data: savedSearch }, { status: 201 });

  } catch (error) {
    console.error('Saved searches POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove saved search
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search ID from URL params
    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('id');

    if (!searchId) {
      return NextResponse.json({ error: 'Search ID is required' }, { status: 400 });
    }

    // Delete saved search (only if owned by user)
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', searchId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting saved search:', error);
      return NextResponse.json({ error: 'Failed to delete saved search' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Search deleted successfully' });

  } catch (error) {
    console.error('Saved searches DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}