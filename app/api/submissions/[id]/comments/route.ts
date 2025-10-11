import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
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
    const params = await context.params;
    const submissionId = params.id;

    // Fetch all comments for this submission
    const { data: comments, error } = await supabase
      .from('submission_comments')
      .select(`
        id,
        comment_text,
        reply_to_comment_id,
        reply_context_snippet,
        created_at,
        updated_at,
        is_edited,
        user_id
      `)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false }); // Newest first

    if (error) throw error;

    if (!comments || comments.length === 0) {
      return NextResponse.json({
        comments: [],
        total: 0
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(comments.map(c => c.user_id))];
    
    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds);

    if (profilesError) throw profilesError;

    // Create a map of user profiles
    const profilesMap = new Map();
    profiles?.forEach(profile => {
      profilesMap.set(profile.user_id, profile);
    });

    // Transform flat list into nested structure
    const commentsMap = new Map<string, any>();
    const topLevelComments: any[] = [];
    
    // First pass: create all comment objects
    comments?.forEach(comment => {
      const profile = profilesMap.get(comment.user_id);
      const commentData = {
        id: comment.id,
        comment_text: comment.comment_text,
        reply_to_comment_id: comment.reply_to_comment_id,
        reply_context_snippet: comment.reply_context_snippet,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        is_edited: comment.is_edited,
        user_id: comment.user_id,
        user_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown User',
        replies: []
      };
      commentsMap.set(comment.id, commentData);
    });

    // Second pass: organize into nested structure
    comments?.forEach(comment => {
      const commentData = commentsMap.get(comment.id);
      
      if (comment.reply_to_comment_id) {
        // This is a reply
        const parentComment = commentsMap.get(comment.reply_to_comment_id);
        if (parentComment) {
          parentComment.replies.push(commentData);
        } else {
          // Parent comment doesn't exist, treat as top-level
          topLevelComments.push(commentData);
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(commentData);
      }
    });

    // Sort replies within each comment (oldest first for natural conversation flow)
    topLevelComments.forEach(comment => {
      comment.replies.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return NextResponse.json({
      comments: topLevelComments,
      total: comments?.length || 0
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
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
    const params = await context.params;
    const submissionId = params.id;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Debug logging
    console.log('Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message
    });
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'No user found. Please sign in again.' 
      }, { status: 401 });
    }

    // Check if user has first_name and last_name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.first_name || !profile?.last_name) {
      return NextResponse.json(
        { error: 'Profile incomplete. Please add your first and last name to comment.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { comment_text, reply_to_comment_id, reply_context_snippet } = body;

    // Validate input
    if (!comment_text || comment_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    if (comment_text.length > 500) {
      return NextResponse.json(
        { error: 'Comment must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Simple server-side sanitization (remove HTML tags and potential script content)
    const sanitizedComment = comment_text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    // Sanitize reply context if provided
    let sanitizedContext = null;
    if (reply_context_snippet) {
      sanitizedContext = reply_context_snippet
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
      
      if (sanitizedContext.length > 100) {
        sanitizedContext = sanitizedContext.substring(0, 97) + '...';
      }
    }

    // Insert comment
    const { data: newComment, error: insertError } = await supabase
      .from('submission_comments')
      .insert({
        submission_id: submissionId,
        user_id: user.id,
        comment_text: sanitizedComment,
        reply_to_comment_id: reply_to_comment_id || null,
        reply_context_snippet: sanitizedContext
      })
      .select(`
        id,
        comment_text,
        reply_to_comment_id,
        reply_context_snippet,
        created_at,
        updated_at,
        is_edited,
        user_id
      `)
      .single();

    if (insertError) throw insertError;

    // Return comment with user name
    const responseComment = {
      ...newComment,
      user_name: `${profile.first_name} ${profile.last_name}`,
      replies: []
    };

    return NextResponse.json({ comment: responseComment }, { status: 201 });

  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create comment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}