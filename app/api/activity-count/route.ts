/*
 * Activity Count API
 * Increments user activity counts for coaching metrics
 * Part of the new V2 application architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { incrementActivityCountServer, ServerActivityType } from '@/lib/server/activityTracking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, activityType, count } = body;

    if (!userId || !activityType) {
      return NextResponse.json({ error: 'Missing userId or activityType' }, { status: 400 });
    }

    const result = await incrementActivityCountServer(userId, activityType as ServerActivityType, count);

    if (!result.success) {
      const status = result.error === 'Invalid activity type' ? 400 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in activity count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
