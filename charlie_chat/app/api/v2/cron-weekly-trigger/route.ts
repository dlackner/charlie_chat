/*
 * CHARLIE2 V2 - Weekly Recommendations Cron Trigger
 * Simple cron endpoint that calls the V2 weekly recommendations API for all eligible users
 * Designed to work with PostgreSQL cron jobs or external scheduling services
 */

import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = createSupabaseAdminClient();
    
    console.log('🚀 V2 Cron trigger: Executing weekly recommendations for all users');
    
    // Call the V2 SQL function that processes all users
    const { data, error } = await supabase.rpc('trigger_weekly_recommendations_v2');
    
    if (error) {
      console.error('Error executing trigger_weekly_recommendations:', error);
      return NextResponse.json(
        { error: 'Failed to execute weekly trigger function', details: error },
        { status: 500 }
      );
    }
    
    console.log('✅ V2 Weekly recommendations trigger completed successfully');
    console.log('Results:', data);
    
    return NextResponse.json({
      success: true,
      message: 'V2 Weekly recommendations trigger executed successfully',
      results: data,
      version: '2.0',
      endpoint: '/api/v2/weekly-recommendations'
    });

  } catch (error) {
    console.error('🔥 V2 Cron trigger error:', error);
    return NextResponse.json(
      { error: 'V2 Cron trigger failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'V2 Weekly recommendations cron trigger endpoint',
    usage: 'POST to execute weekly recommendations for all eligible users',
    note: 'This endpoint calls the SQL function trigger_weekly_recommendations_v2() which uses the V2 API',
    version: '2.0',
    targetEndpoint: '/api/v2/weekly-recommendations'
  });
}