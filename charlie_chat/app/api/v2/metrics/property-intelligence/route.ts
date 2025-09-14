/*
 * CHARLIE2 V2 - Property Intelligence Metrics API
 * Pipeline analytics with status, market, and source filtering
 * Part of the new V2 API architecture
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

interface PropertyIntelligenceData {
  status: string;
  count: number;
  estimated_value: number;
  percentage: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get user ID from query params (passed by client)
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const markets = searchParams.get('markets')?.split(',').filter(Boolean) || [];
    const sources = searchParams.get('sources')?.split(',').filter(Boolean) || [];
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get market names for filtering
    const { data: userMarkets } = await supabase
      .from('user_markets')
      .select('market_key, market_name')
      .eq('user_id', userId);

    // Create market key to name mapping
    const marketKeyToName = new Map();
    userMarkets?.forEach(market => {
      marketKeyToName.set(market.market_key, market.market_name);
    });

    // Build the main query without complex joins
    let query = supabase
      .from('user_favorites')
      .select(`
        favorite_status,
        recommendation_type,
        market_key,
        saved_properties:property_id (
          estimated_value
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    // Apply market filter if specified (filter by market_key)
    if (markets.length > 0) {
      const filteredMarketKeys = Array.from(marketKeyToName.entries())
        .filter(([, name]) => markets.includes(name))
        .map(([key]) => key);
      
      if (filteredMarketKeys.length > 0) {
        query = query.in('market_key', filteredMarketKeys);
      }
    }

    // Apply source filter if specified
    if (sources.length > 0) {
      query = query.in('recommendation_type', sources);
    }

    const { data: favorites, error } = await query;

    if (error) {
      console.error('Error fetching property intelligence data:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch data', 
        details: error.message,
        hint: error.hint 
      }, { status: 500 });
    }

    // If no favorites found, return empty data structure
    if (!favorites || favorites.length === 0) {
      return NextResponse.json({
        data: [],
        summary: {
          total_properties: 0,
          total_estimated_value: 0,
          average_value: 0,
          statuses_represented: 0
        },
        filters: {
          markets_applied: markets,
          sources_applied: sources
        }
      });
    }

    // Process the data by favorite_status
    const statusMap = new Map<string, { count: number; total_value: number }>();
    
    // Normalize status values (handle both database and display formats)
    const normalizeStatus = (status: string | null): string => {
      if (!status) return 'Reviewing';
      
      const statusMapping: { [key: string]: string } = {
        'REVIEWED': 'Reviewing',
        'COMMUNICATED': 'Communicating',
        'ENGAGED': 'Engaged',
        'ANALYZED': 'Analyzing',
        'LOI_SENT': 'LOI Sent',
        'ACQUIRED': 'Acquired',
        'REJECTED': 'Rejected'
      };
      
      return statusMapping[status] || status;
    };

    favorites.forEach((favorite) => {
      const status = normalizeStatus(favorite.favorite_status);
      const propertyData = favorite.saved_properties as any;
      const estimatedValue = propertyData?.estimated_value ? parseFloat(propertyData.estimated_value) : 0;

      if (!statusMap.has(status)) {
        statusMap.set(status, { count: 0, total_value: 0 });
      }

      const current = statusMap.get(status)!;
      current.count += 1;
      current.total_value += estimatedValue;
    });

    // Convert to array and calculate percentages
    const totalCount = Array.from(statusMap.values()).reduce((sum, item) => sum + item.count, 0);
    const totalValue = Array.from(statusMap.values()).reduce((sum, item) => sum + item.total_value, 0);

    const statusOrder = ['Reviewing', 'Communicating', 'Engaged', 'Analyzing', 'LOI Sent', 'Acquired', 'Rejected'];
    
    const intelligenceData: PropertyIntelligenceData[] = statusOrder
      .filter(status => statusMap.has(status))
      .map(status => {
        const data = statusMap.get(status)!;
        return {
          status,
          count: data.count,
          estimated_value: data.total_value,
          percentage: totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0
        };
      });

    // Summary statistics
    const summary = {
      total_properties: totalCount,
      total_estimated_value: totalValue,
      average_value: totalCount > 0 ? totalValue / totalCount : 0,
      statuses_represented: intelligenceData.length
    };

    return NextResponse.json({
      data: intelligenceData,
      summary,
      filters: {
        markets_applied: markets,
        sources_applied: sources
      }
    });
    
  } catch (error) {
    console.error('Property Intelligence API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}