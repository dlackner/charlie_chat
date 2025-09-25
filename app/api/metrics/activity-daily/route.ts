/*
 * CHARLIE2 V2 - Daily Activity API
 * Returns daily activity count for a specific user and activity type
 * Part of the new V2 application architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const activityType = searchParams.get('activityType');
    const date = searchParams.get('date');

    if (!userId || !activityType || !date) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate activity type
    const validActivityTypes = ['offers_created', 'lois_created', 'marketing_letters_created', 'emails_sent'];
    if (!validActivityTypes.includes(activityType)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    
    // Get activity count for the specific date
    const { data, error } = await supabase
      .from('user_activity_counts')
      .select('count')
      .eq('user_id', userId)
      .eq('activity_type', activityType)
      .eq('activity_date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching daily activity:', error);
      return NextResponse.json({ error: 'Failed to fetch activity data' }, { status: 500 });
    }

    // Return count or 0 if no data found
    return NextResponse.json({ count: data?.count || 0 });
  } catch (error) {
    console.error('Error in daily activity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}