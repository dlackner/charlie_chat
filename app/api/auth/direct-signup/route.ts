import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, userClass } = await request.json();

    // Validate input
    if (!email || !userClass) {
      return NextResponse.json(
        { error: 'Email and user class are required' },
        { status: 400 }
      );
    }

    // Validate user class
    if (!['plus', 'pro'].includes(userClass)) {
      return NextResponse.json(
        { error: 'Invalid user class' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('user_id, user_class')
      .eq('email', email)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing user' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create user using admin client
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true, // Skip email verification
      user_metadata: {
        direct_signup: true,
        initial_user_class: userClass,
        signup_source: 'pricing_page'
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      );
    }

    // Profile is auto-created by trigger with 'trial' user_class and trial_end_date
    // Update to 'core' (free tier) until payment is confirmed via Stripe webhook
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        user_class: 'core',           // Set to free tier until payment confirmed
        trial_end_date: null          // Remove trial end date
      })
      .eq('user_id', authData.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      console.error('Profile update attempted:', {
        user_id: authData.user.id,
        user_class: userClass,
        trial_end_date: null
      });
      // Try to clean up the auth user if profile update fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to update user profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Generate session tokens for immediate authentication
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    });

    if (sessionError) {
      console.error('Error generating session:', sessionError);
      return NextResponse.json({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          user_class: userClass
        },
        message: 'User created successfully. Please sign in to continue to checkout.'
      });
    }

    // Extract the hashed token from the magic link URL
    const hashedToken = sessionData.properties.hashed_token;

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        user_class: userClass
      },
      hashedToken,
      message: 'User created successfully.'
    });

  } catch (error) {
    console.error('Direct signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}