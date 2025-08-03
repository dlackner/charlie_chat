// Test endpoint to simulate the automated weekly trigger
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { userEmail } = await req.json();
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required for testing' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    
    // Find user by email using admin client
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('User lookup error:', userError);
      return NextResponse.json(
        { error: 'Failed to find user', details: userError },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'User not found with that email' },
        { status: 404 }
      );
    }

    const user = users[0];

    console.log(`🧪 Testing weekly trigger for user: ${user.email} (${user.id})`);

    // Call the weekly recommendations API as the automated trigger would
    const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/weekly-recommendations`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      userEmail: user.email,
      userId: user.id,
      result: result,
      message: response.ok 
        ? 'Weekly recommendations triggered successfully!' 
        : 'Weekly recommendations failed'
    });

  } catch (error) {
    console.error('🔥 Test trigger error:', error);
    return NextResponse.json(
      { error: 'Test trigger failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Weekly recommendations test endpoint',
    usage: 'POST with { "userEmail": "user@example.com" }',
    purpose: 'Test the automated weekly trigger functionality'
  });
}