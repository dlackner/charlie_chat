import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Get current date and date 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get active submission count (only Capital Club submissions)
    const { count: activeCount, error: activeError } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_public', true)
      .eq('partnership_type', 'Capital Club');

    if (activeError) throw activeError;

    // Get submissions created in the last 7 days (only Capital Club submissions)
    const { count: newCount, error: newError } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_public', true)
      .eq('partnership_type', 'Capital Club')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (newError) throw newError;

    return NextResponse.json({
      activeCount: activeCount || 0,
      newThisWeek: newCount || 0
    });

  } catch (error) {
    console.error('Error fetching submission metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission metrics' },
      { status: 500 }
    );
  }
}