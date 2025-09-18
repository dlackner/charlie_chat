/*
 * CHARLIE2 V2 - Process Expired Trials API
 * Cron job endpoint to automatically convert expired trial users to core
 * Runs daily to check and update trial statuses
 * Part of the new V2 application architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { processExpiredTrials } from '@/lib/v2/trialManager';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Starting expired trials processing...');
    
    const result = await processExpiredTrials();
    
    console.log(`✅ Expired trials processing complete: ${result.processed} converted, ${result.errors} errors`);
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in expired trials processing:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Processing failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate request (in production, use proper auth)
    const testMode = request.nextUrl.searchParams.get('test') === 'true';
    
    if (!testMode && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Use POST method for production' }, { status: 405 });
    }

    console.log('🧪 Test mode: Processing expired trials...');
    
    const result = await processExpiredTrials();
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
      mode: 'test'
    });

  } catch (error) {
    console.error('❌ Error in test expired trials processing:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Processing failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}