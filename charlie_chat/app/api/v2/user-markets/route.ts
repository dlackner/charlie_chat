/*
 * CHARLIE2 V2 - User Markets API
 * Fetch user's active markets from user_markets table
 * Part of the new V2 application architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params (passed by client)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Fetch user's markets from user_markets table
    const { data: markets, error } = await supabase
      .from('user_markets')
      .select('id, market_key, market_name, city, state, market_type, property_count, is_locked')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching user markets:', error);
      return NextResponse.json({ error: 'Failed to fetch user markets' }, { status: 500 });
    }

    // Format markets for the frontend
    const formattedMarkets = markets?.map(market => ({
      id: market.id,
      key: market.market_key,
      name: market.market_name || `${market.city}, ${market.state}`,
      city: market.city,
      state: market.state,
      type: market.market_type,
      propertyCount: market.property_count || 0,
      isLocked: market.is_locked
    })) || [];

    return NextResponse.json({
      success: true,
      markets: formattedMarkets
    });

  } catch (error) {
    console.error('User markets API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}