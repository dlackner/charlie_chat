/*
 * Activity Count API
 * Increments user activity counts for coaching metrics
 * Part of the new V2 application architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📥 Activity tracking request received:", body);

    const { userId, activityType, count } = body;

    if (!userId || !activityType) {
      console.error("❌ Missing required fields:", { userId, activityType });
      return NextResponse.json({ error: 'Missing userId or activityType' }, { status: 400 });
    }

    // Validate activity type
    const validActivityTypes = ['offers_created', 'lois_created', 'marketing_letters_created', 'emails_sent', 'property_searches', 'properties_retrieved'];
    if (!validActivityTypes.includes(activityType)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    // Optional increment amount (defaults to 1, e.g. for event counters like property_searches).
    // properties_retrieved passes the actual number of properties returned in the response.
    const incrementBy = Number.isInteger(count) && count > 0 ? count : 1;

    const supabase = createSupabaseAdminClient();
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format

    console.log("📊 Calling increment_activity_count with:", {
      p_user_id: userId,
      p_activity_date: today,
      p_activity_type: activityType,
      p_count: incrementBy
    });

    // Use the PostgreSQL function to properly increment
    const { error } = await supabase
      .rpc('increment_activity_count', {
        p_user_id: userId,
        p_activity_date: today,
        p_activity_type: activityType,
        p_count: incrementBy
      });

    if (error) {
      console.error('❌ Error incrementing activity count:', error);
      return NextResponse.json({ error: 'Failed to increment activity count' }, { status: 500 });
    }

    console.log("✅ Activity count incremented successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in activity count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}