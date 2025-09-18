//NOT SURE IF THIS IS STILL BEING USED
//THIS NEEDS TO BE REFACTORED FOR V2 TO SUPPORT TRIAL USER PROCESS
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    // Get authorization header
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const supabase = createSupabaseAdminClient();

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get current user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_class')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // Check if user is trial or disabled (expired trial)
    if (profile?.user_class !== 'trial' && profile?.user_class !== 'disabled') {
      return NextResponse.json({ 
        error: 'Only trial or expired trial users can convert to Charlie Chat',
        current_class: profile?.user_class 
      }, { status: 400 });
    }

    // Update user class to charlie_chat
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        user_class: 'charlie_chat',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update user class' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully converted to Charlie Chat',
      user_class: 'charlie_chat'
    });

  } catch (error) {
    console.error('Charlie Chat conversion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}