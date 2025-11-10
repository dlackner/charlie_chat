import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
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

    // Get user's last notification click time
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('last_discussion_notification_click')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Calculate cutoff time (1 hour after last click, or show all if never clicked)
    const lastClick = profile?.last_discussion_notification_click;
    const oneHourAfterClick = lastClick ? new Date(new Date(lastClick).getTime() + 60 * 60 * 1000).toISOString() : null;
    const cutoffTime = oneHourAfterClick && new Date() > new Date(oneHourAfterClick) ? oneHourAfterClick : '1970-01-01';

    // First, get all comment IDs where current user is the author
    const { data: userComments, error: userCommentsError } = await supabase
      .from('submission_comments')
      .select('id')
      .eq('user_id', user.id);

    if (userCommentsError) {
      console.error('Error fetching user comments:', userCommentsError);
      return NextResponse.json({ error: 'Failed to fetch user comments' }, { status: 500 });
    }

    // If user has no comments, return empty result
    if (!userComments || userComments.length === 0) {
      return NextResponse.json({ 
        unread_submissions: [],
        total_count: 0
      });
    }

    // Extract comment IDs
    const userCommentIds = userComments.map(comment => comment.id);

    // Find submissions where user has comments that received replies after cutoff time
    const { data: repliesData, error: repliesError } = await supabase
      .from('submission_comments')
      .select(`
        submission_id,
        submissions!inner(
          id,
          submission_name,
          status
        )
      `)
      .not('reply_to_comment_id', 'is', null) // Only get replies (not original comments)
      .gt('created_at', cutoffTime)
      .in('reply_to_comment_id', userCommentIds)
      .eq('submissions.status', 'active'); // Only active submissions

    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
      return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }

    // Group by submission and get unique submissions
    const submissionMap = new Map();
    repliesData?.forEach(reply => {
      const submissionId = reply.submission_id;
      const submissionName = (reply.submissions as any)?.submission_name || 'Unknown Submission';
      
      if (!submissionMap.has(submissionId)) {
        submissionMap.set(submissionId, {
          submission_id: submissionId,
          submission_name: submissionName,
          reply_count: 0
        });
      }
      submissionMap.get(submissionId).reply_count++;
    });

    const unreadSubmissions = Array.from(submissionMap.values());

    return NextResponse.json({ 
      unread_submissions: unreadSubmissions,
      total_count: unreadSubmissions.length
    });

  } catch (error) {
    console.error('Error in discussion-replies API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST endpoint to update last notification click time
export async function POST() {
  try {
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

    // Update the user's last notification click time
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        last_discussion_notification_click: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in discussion-replies POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}