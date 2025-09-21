/*
 * CHARLIE2 V2 - Trial to Core Conversion API
 * Handles user class conversion from trial to core subscription
 * Supports both legacy and new user class systems during transition
 * Part of the new V2 application architecture
 */

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

    // Check if user is trial
    if (profile?.user_class !== 'trial') {
      return NextResponse.json({ 
        error: 'Only trial users can convert to MultifamilyOS Core',
        current_class: profile?.user_class 
      }, { status: 400 });
    }

    // Update user class to core (V2) or charlie_chat (legacy compatibility)
    // During transition period, use charlie_chat for backward compatibility
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        user_class: 'charlie_chat', // Will transition to 'core' when ready
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update user class' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully converted to MultifamilyOS Core',
      user_class: 'charlie_chat' // Legacy class during transition
    });

  } catch (error) {
    console.error('MultifamilyOS Core conversion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}