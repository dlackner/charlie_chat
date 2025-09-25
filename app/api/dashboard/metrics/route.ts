import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  console.log('Dashboard metrics API called with userId:', userId);

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // 1. Total Pipeline Value - sum of favorited properties
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('user_favorites')
      .select(`
        saved_properties!inner(estimated_value, listing_price)
      `)
      .eq('user_id', userId);

    if (pipelineError) {
      console.error('Pipeline data error:', pipelineError);
      throw pipelineError;
    }

    console.log('Pipeline data:', pipelineData);
    const totalPipelineValue = pipelineData?.reduce((sum, item) => {
      const property = item.saved_properties as any;
      const value = property?.estimated_value || property?.listing_price || 0;
      console.log('Property value:', value, 'from:', property);
      return sum + value;
    }, 0) || 0;
    console.log('Total pipeline value:', totalPipelineValue);

    // 2. Buy Box Markets - count distinct market_keys
    const { data: marketsData, error: marketsError } = await supabase
      .from('user_markets')
      .select('market_key')
      .eq('user_id', userId);

    if (marketsError) throw marketsError;

    const uniqueMarkets = new Set(marketsData?.map(m => m.market_key) || []);
    const buyBoxMarkets = uniqueMarkets.size;

    // 3. Properties Favorited - count of user's favorite properties
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId);

    if (favoritesError) throw favoritesError;

    const propertiesFavorited = favoritesData?.length || 0;

    // 4. Total Units - sum units from favorited properties  
    const { data: unitsData, error: unitsError } = await supabase
      .from('user_favorites')
      .select(`
        saved_properties!inner(units_count)
      `)
      .eq('user_id', userId);

    if (unitsError) throw unitsError;

    const totalUnits = unitsData?.reduce((sum, item) => {
      const property = item.saved_properties as any;
      return sum + (property?.units_count || 1); // Default to 1 unit if not specified
    }, 0) || 0;

    // Calculate trends (compare with 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Previous pipeline value
    const { data: prevPipelineData } = await supabase
      .from('user_favorites')
      .select(`
        saved_properties!inner(estimated_value, listing_price)
      `)
      .eq('user_id', userId)
      .lte('created_at', thirtyDaysAgo.toISOString());

    const prevPipelineValue = prevPipelineData?.reduce((sum, item) => {
      const property = item.saved_properties as any;
      const value = property?.estimated_value || property?.listing_price || 0;
      return sum + value;
    }, 0) || 0;

    // Previous buy box markets
    const { data: prevMarketsData } = await supabase
      .from('user_markets')
      .select('market_key')
      .eq('user_id', userId)
      .lte('created_at', thirtyDaysAgo.toISOString());

    const prevUniqueMarkets = new Set(prevMarketsData?.map(m => m.market_key) || []);
    const prevBuyBoxMarkets = prevUniqueMarkets.size;

    // Previous properties favorited
    const { data: prevFavoritesData } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .lte('created_at', thirtyDaysAgo.toISOString());

    const prevPropertiesFavorited = prevFavoritesData?.length || 0;

    // Previous total units
    const { data: prevUnitsData } = await supabase
      .from('user_favorites')
      .select(`
        saved_properties!inner(units_count)
      `)
      .eq('user_id', userId)
      .lte('created_at', thirtyDaysAgo.toISOString());

    const prevTotalUnits = prevUnitsData?.reduce((sum, item) => {
      const property = item.saved_properties as any;
      return sum + (property?.units_count || 1);
    }, 0) || 0;

    // Calculate changes and trends
    const pipelineChange = totalPipelineValue - prevPipelineValue;
    const marketsChange = buyBoxMarkets - prevBuyBoxMarkets;
    const favoritedChange = propertiesFavorited - prevPropertiesFavorited;
    const unitsChange = totalUnits - prevTotalUnits;

    // Helper function to format currency
    const formatCurrency = (value: number) => {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      }
      return `$${value.toLocaleString()}`;
    };

    // Helper function to format percentage change
    const formatChange = (current: number, previous: number, isPercentage = false) => {
      if (previous === 0) {
        return current > 0 ? `+${current}` : '0';
      }
      
      if (isPercentage) {
        const percentChange = ((current - previous) / previous) * 100;
        return percentChange >= 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`;
      } else {
        const change = current - previous;
        return change >= 0 ? `+${change}` : `${change}`;
      }
    };

    return NextResponse.json({
      metrics: {
        totalPipelineValue: {
          value: formatCurrency(totalPipelineValue),
          rawValue: totalPipelineValue,
          change: formatChange(totalPipelineValue, prevPipelineValue, true),
          trend: pipelineChange >= 0 ? 'up' : 'down'
        },
        buyBoxMarkets: {
          value: buyBoxMarkets.toString(),
          rawValue: buyBoxMarkets,
          change: formatChange(buyBoxMarkets, prevBuyBoxMarkets),
          trend: marketsChange >= 0 ? 'up' : 'down'
        },
        propertiesFavorited: {
          value: propertiesFavorited.toString(),
          rawValue: propertiesFavorited,
          change: formatChange(propertiesFavorited, prevPropertiesFavorited),
          trend: favoritedChange >= 0 ? 'up' : 'down'
        },
        totalUnits: {
          value: totalUnits.toLocaleString(),
          rawValue: totalUnits,
          change: formatChange(totalUnits, prevTotalUnits),
          trend: unitsChange >= 0 ? 'up' : 'down'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    
    // Return fallback metrics instead of error
    return NextResponse.json({
      metrics: {
        totalPipelineValue: {
          value: "$0",
          rawValue: 0,
          change: "0%",
          trend: 'up' as const
        },
        buyBoxMarkets: {
          value: "0",
          rawValue: 0,
          change: "+0",
          trend: 'up' as const
        },
        propertiesOwned: {
          value: "0",
          rawValue: 0,
          change: "+0",
          trend: 'up' as const
        },
        totalUnits: {
          value: "0",
          rawValue: 0,
          change: "+0",
          trend: 'up' as const
        }
      }
    });
  }
}