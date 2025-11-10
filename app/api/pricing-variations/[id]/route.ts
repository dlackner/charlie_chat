import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const variationId = resolvedParams.id;

    if (!variationId) {
      return NextResponse.json(
        { error: 'Variation ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Fetch single pricing variation
    const { data, error } = await supabase
      .from('pricing_variations')
      .select('*')
      .eq('id', variationId)
      .eq('is_public', true)
      .single();

    if (error) {
      console.error('Error fetching pricing variation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pricing variation' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Pricing variation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ variation: data });

  } catch (error) {
    console.error('Error in pricing variation GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const variationId = resolvedParams.id;

    if (!variationId) {
      return NextResponse.json(
        { error: 'Variation ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { analysisName, description, scenarioData } = body;

    if (!scenarioData) {
      return NextResponse.json(
        { error: 'Scenario data is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateData: any = {
      scenario_data: scenarioData,
      updated_at: new Date().toISOString()
    };

    if (analysisName) updateData.analysis_name = analysisName;
    if (description !== undefined) updateData.description = description;

    // Update the pricing variation (only if user owns it)
    const { data, error: updateError } = await supabase
      .from('pricing_variations')
      .update(updateData)
      .eq('id', variationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating pricing variation:', updateError);
      return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, variation: data });
  } catch (error) {
    console.error('Error in PUT /api/pricing-variations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const variationId = resolvedParams.id;

    if (!variationId) {
      return NextResponse.json(
        { error: 'Variation ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the pricing variation (only if user owns it)
    const { error: deleteError } = await supabase
      .from('pricing_variations')
      .delete()
      .eq('id', variationId)
      .eq('user_id', user.id); // Only allow deleting own variations

    if (deleteError) {
      console.error('Error deleting pricing variation:', deleteError);
      return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/pricing-variations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}