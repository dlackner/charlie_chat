import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId, analysisName, description, scenarioData } = body;

    if (!submissionId || !analysisName || !scenarioData) {
      return NextResponse.json(
        { error: 'Missing required fields: submissionId, analysisName, and scenarioData are required' },
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert the pricing variation
    const { data, error } = await supabase
      .from('pricing_variations')
      .insert({
        submission_id: submissionId,
        user_id: user.id,
        analysis_name: analysisName,
        description: description || null,
        scenario_data: scenarioData,
        is_public: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving pricing variation:', error);
      return NextResponse.json(
        { error: 'Failed to save pricing variation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, variation: data });

  } catch (error) {
    console.error('Error in pricing variations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Pricing variations GET API called');
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');
    console.log('SubmissionId from params:', submissionId);

    if (!submissionId) {
      console.log('No submissionId provided');
      return NextResponse.json(
        { error: 'submissionId parameter is required' },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('Creating Supabase client...');
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

    console.log('Querying pricing_variations table...');
    // Fetch pricing variations for the submission
    const { data, error } = await supabase
      .from('pricing_variations')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to fetch pricing variations', details: error.message },
        { status: 500 }
      );
    }

    console.log('Pricing variations query successful, data:', data);

    // If we have variations, fetch the user profiles separately
    let enrichedData = data || [];
    if (data && data.length > 0) {
      const userIds = data.map(variation => variation.user_id);
      console.log('Fetching profiles for user IDs:', userIds);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (profileError) {
        console.error('Profile query error:', profileError);
        // Continue without profiles data rather than failing
      } else {
        console.log('Profiles fetched:', profiles);
        // Attach profile data to each variation
        enrichedData = data.map(variation => {
          const profile = profiles?.find(p => p.user_id === variation.user_id);
          return {
            ...variation,
            profiles: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name
            } : null
          };
        });
      }
    }

    console.log('Final enriched data:', enrichedData);
    return NextResponse.json({ variations: enrichedData });

  } catch (error) {
    console.error('Caught exception in pricing variations GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}