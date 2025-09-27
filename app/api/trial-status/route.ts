/*
 * CHARLIE2 V2 - Trial Status API
 * Server-side endpoint to check and update trial status
 * Part of the new V2 application architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkAndUpdateTrialStatus } from '@/lib/v2/trialManager';

export async function POST(req: NextRequest) {
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

    // Get user's profile and check trial status manually here with proper supabase client
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_class, trial_end_date, created_at')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile for trial check:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    console.log('Profile data:', profile);

    // Only check trial users
    if (profile.user_class !== 'trial') {
      return NextResponse.json({
        success: true,
        wasExpired: false,
        userClass: profile.user_class
      });
    }

    // Determine trial end date
    let trialEndDate: Date;
    if (profile.trial_end_date) {
      trialEndDate = new Date(profile.trial_end_date);
    } else {
      trialEndDate = new Date(profile.created_at);
      trialEndDate.setDate(trialEndDate.getDate() + 7);
    }

    const now = new Date();
    const isExpired = now > trialEndDate;

    console.log('Trial check details:', {
      userId: user.id,
      trialEndDate: trialEndDate.toISOString(),
      now: now.toISOString(),
      isExpired
    });

    if (isExpired) {
      // Convert trial to core using the authenticated supabase client
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          user_class: 'core',
          trial_end_date: now.toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating expired trial user:', updateError);
        return NextResponse.json({
          success: true,
          wasExpired: true,
          userClass: 'trial' // Keep as trial if update failed
        });
      }

      console.log(`✅ Converted expired trial user ${user.id} to core`);
      return NextResponse.json({
        success: true,
        wasExpired: true,
        userClass: 'core'
      });
    }

    return NextResponse.json({
      success: true,
      wasExpired: false,
      userClass: 'trial'
    });

  } catch (error) {
    console.error('Trial status API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}