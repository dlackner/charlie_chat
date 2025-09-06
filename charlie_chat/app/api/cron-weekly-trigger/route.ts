// Simple cron endpoint that calls the SQL trigger function
import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = createSupabaseAdminClient();
    
    console.log('🚀 Cron trigger: Executing weekly recommendations SQL function');
    
    // Call the SQL function that processes all users
    const { data, error } = await supabase.rpc('trigger_weekly_recommendations');
    
    if (error) {
      console.error('Error executing trigger_weekly_recommendations:', error);
      return NextResponse.json(
        { error: 'Failed to execute weekly trigger function', details: error },
        { status: 500 }
      );
    }
    
    console.log('✅ Weekly recommendations trigger completed successfully');
    console.log('Results:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Weekly recommendations trigger executed successfully',
      results: data
    });

  } catch (error) {
    console.error('🔥 Cron trigger error:', error);
    return NextResponse.json(
      { error: 'Cron trigger failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Weekly recommendations cron trigger endpoint',
    usage: 'POST to execute weekly recommendations for all eligible users',
    note: 'This endpoint calls the SQL function trigger_weekly_recommendations()'
  });
}