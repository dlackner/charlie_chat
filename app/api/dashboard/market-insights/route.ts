/*
 * CHARLIE2 V2 - Dashboard Market Insights API
 * Provides market pulse data, portfolio insights, and AI trends for selected buy box markets
 * Part of the new V2 application architecture
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Debug: Check if API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is not set');
} else {
  console.log('✅ OPENAI_API_KEY is loaded, length:', process.env.OPENAI_API_KEY.length);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const marketKey = searchParams.get('marketKey');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  if (!marketKey) {
    return NextResponse.json({ error: 'Market key is required' }, { status: 400 });
  }

  try {
    // Get user's buy box preferences for this market
    const { data: buyBoxData, error: buyBoxError } = await supabase
      .from('user_markets')
      .select('*')
      .eq('user_id', userId)
      .eq('market_key', marketKey)
      .single();

    if (buyBoxError && buyBoxError.code !== 'PGRST116') {
      console.error('Buy box data error:', buyBoxError);
      throw buyBoxError;
    }

    // Get market details from user_markets to understand city/state/county
    const marketDetails = buyBoxData || {};
    console.log('Market details for', marketKey, ':', marketDetails);
    
    // Section 1: Market Pulse - Use real estate API to get mls_active properties
    const realEstatePayload: any = {
      size: 250, // API limit is 250 properties max
      resultIndex: 0,
      mls_active: true, // Required: only MLS active properties
      property_type: 'MFR', // Required: only multifamily properties
    };

    // Required location filters (AND logic)
    if (marketDetails.city) {
      realEstatePayload.city = marketDetails.city;
    }
    if (marketDetails.state) {
      realEstatePayload.state = marketDetails.state;
    }
    if (marketDetails.county) {
      realEstatePayload.county = marketDetails.county;
    }

    // Build OR query for buy box criteria (any criteria can match)
    const orConditions = [];
    
    // Units range criteria
    if (marketDetails.units_min && marketDetails.units_max) {
      orConditions.push({
        units_min: marketDetails.units_min,
        units_max: marketDetails.units_max
      });
    }
    
    // Value range criteria
    if (marketDetails.estimated_value_min && marketDetails.estimated_value_max) {
      orConditions.push({
        value_min: marketDetails.estimated_value_min,
        value_max: marketDetails.estimated_value_max
      });
    }
    
    // Year built range criteria
    if (marketDetails.year_built_min && marketDetails.year_built_max) {
      orConditions.push({
        year_built_min: marketDetails.year_built_min,
        year_built_max: marketDetails.year_built_max
      });
    }
    
    // Add OR conditions to payload if we have any
    if (orConditions.length > 0) {
      realEstatePayload.or = orConditions;
    }

    console.log('Calling real estate API with payload:', realEstatePayload);

    let marketProperties: any[] = [];

    try {
      // Call the real estate API using the same pattern as the discover page
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://www.multifamilyos.ai' 
          : 'http://localhost:3000');
      
      const realEstateResponse = await fetch(`${baseUrl}/api/realestateapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(realEstatePayload),
      });

      if (!realEstateResponse.ok) {
        console.error('Real estate API error:', realEstateResponse.status, realEstateResponse.statusText);
        throw new Error(`Real estate API error: ${realEstateResponse.status}`);
      }

      const apiResponse = await realEstateResponse.json();
      
      // The real estate API returns data in a specific structure
      marketProperties = apiResponse?.data || [];
      console.log('Real estate API returned:', marketProperties?.length, 'properties');
      console.log('API response structure:', { 
        dataLength: apiResponse?.dataLength,
        recordCount: apiResponse?.count,
        hasData: !!apiResponse?.data 
      });
    } catch (apiError) {
      console.error('Error calling real estate API:', apiError);
      // Fall back to empty array if API fails
      marketProperties = [];
    }

    // Calculate market pulse metrics
    const activeListings = marketProperties?.length || 0;
    const avgEstimatedValue = marketProperties?.length 
      ? marketProperties.reduce((sum, prop) => sum + (prop.estimated_value || 0), 0) / marketProperties.length
      : 0;
    const avgAssessedValue = marketProperties?.length
      ? marketProperties.reduce((sum, prop) => sum + (prop.assessed_value || 0), 0) / marketProperties.length
      : 0;

    // Note: Buy box matching is now handled by the real estate API with OR logic
    // so activeListings already represents properties that match the buy box criteria

    // Section 2: Portfolio Insights - User's tracked properties in this market's geographic location
    const { data: allUserProperties, error: userPropertiesError } = await supabase
      .from('user_favorites')
      .select(`
        saved_properties!inner(estimated_value, listing_price, units_count, address_city, address_state, county),
        property_id
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (userPropertiesError) {
      console.error('User properties error:', userPropertiesError);
      throw userPropertiesError;
    }

    // Filter user properties by the selected market's geographic location (same logic as Engage page)
    const userMarketProperties = (allUserProperties || []).filter(item => {
      const prop = item.saved_properties as any;
      
      // If no location criteria specified in market, include all properties
      if (!marketDetails.city && !marketDetails.state && !marketDetails.county) {
        return true;
      }
      
      // Match by city and state (same logic as enhanced Engage page filtering)
      const cityMatch = marketDetails.city && prop?.address_city?.toLowerCase().includes(marketDetails.city.toLowerCase());
      const stateMatch = marketDetails.state && (prop?.address_state?.toLowerCase().includes(marketDetails.state.toLowerCase()));
      
      return cityMatch && stateMatch;
    });


    const propertiesTracked = userMarketProperties.length;
    const totalInvestment = (userMarketProperties || []).reduce((sum, item) => {
      const prop = item.saved_properties as any;
      return sum + (prop?.estimated_value || prop?.listing_price || 0);
    }, 0);

    // Get user's offer scenarios for properties in this market only
    // We'll get offers for properties that are favorited in this specific market
    const { data: offerScenarios, error: offersError } = await supabase
      .from('offer_scenarios')
      .select(`
        offer_data,
        property_id
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    let avgCapRate = 6.8; // Default
    if (!offersError && offerScenarios?.length && userMarketProperties?.length) {
      // Get property IDs that are favorited in this market
      const marketPropertyIds = userMarketProperties.map(item => item.property_id);
      
      // Filter offer scenarios to only include properties favorited in this market
      const marketOfferScenarios = offerScenarios.filter(scenario => 
        marketPropertyIds.includes(scenario.property_id)
      );

      const capRates = marketOfferScenarios
        .map(scenario => {
          try {
            const data = typeof scenario.offer_data === 'string' 
              ? JSON.parse(scenario.offer_data) 
              : scenario.offer_data;
            return data.targetCapRate || data.capRate;
          } catch {
            return null;
          }
        })
        .filter(rate => rate && rate > 0);
      
      if (capRates.length > 0) {
        avgCapRate = capRates.reduce((sum, rate) => sum + rate, 0) / capRates.length;
      }
    }

    // Best opportunity logic removed per user request

    // Section 3: AI Market Trends (real AI analysis)
    const trends = await generateRealAITrends(marketDetails, marketProperties, userMarketProperties, buyBoxData);

    // Helper function to format currency - no decimals
    const formatCurrency = (value: number) => {
      if (value >= 1000000) {
        return `$${Math.round(value / 1000000)}M`;
      } else if (value >= 100000) {
        return `$${Math.round(value / 1000)}K`;
      }
      return `$${Math.round(value).toLocaleString()}`;
    };

    return NextResponse.json({
      // Cacheable data (market data doesn't change often)
      cacheable: {
        marketPulse: {
          activeListings,
          avgEstimatedValue: formatCurrency(avgEstimatedValue),
          avgAssessedValue: formatCurrency(avgAssessedValue)
        },
        aiTrends: trends
      },
      // Non-cacheable data (user portfolio changes during session)
      portfolioInsights: {
        propertiesTracked,
        totalInvestment: formatCurrency(totalInvestment),
        avgCapRate: `${avgCapRate.toFixed(1)}%`
      }
    });

  } catch (error) {
    console.error('Error fetching market insights:', error);
    
    // Return fallback data
    return NextResponse.json({
      cacheable: {
        marketPulse: {
          activeListings: 0,
          avgEstimatedValue: '$0',
          avgAssessedValue: '$0'
        },
        aiTrends: {
          marketBriefing: 'Market analysis unavailable. Add more properties to your buy box to generate insights for this market.'
        }
      },
      portfolioInsights: {
        propertiesTracked: 0,
        totalInvestment: '$0',
        avgCapRate: '0%'
      }
    });
  }
}

// Generate real AI trends using GPT-4o mini
async function generateRealAITrends(marketDetails: any, marketProperties: any[], userProperties: any[], buyBoxData: any) {
  const fallbackTrends = {
    marketBriefing: 'Market analysis unavailable. Add more properties to your buy box to generate insights for this market.'
  };

  if (!marketProperties || !Array.isArray(marketProperties) || marketProperties.length === 0) {
    return fallbackTrends;
  }

  try {
    // Prepare market data for AI analysis
    const avgPrice = marketProperties.length > 0 
      ? marketProperties.reduce((sum, prop) => sum + (prop.estimated_value || 0), 0) / marketProperties.length 
      : 0;
    
    // Calculate estimated cap rates from available properties
    const capRates = marketProperties
      .filter(prop => prop.estimated_value && prop.rent_estimate)
      .map(prop => (prop.rent_estimate * 12) / prop.estimated_value * 100);
    const avgCapRate = capRates.length > 0 
      ? capRates.reduce((sum, rate) => sum + rate, 0) / capRates.length 
      : null;

    // Get rental data for this market (simulate what the map shows)
    let rentalInsights = '';
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://www.multifamilyos.ai' 
          : 'http://localhost:3000');
      const rentResponse = await fetch(`${baseUrl}/Monthly%20Rental%20Rates.csv?v=3`);
      if (rentResponse.ok) {
        const csvText = await rentResponse.text();
        const lines = csvText.split('\n');
        
        // Find rental data for this market
        const marketRentLine = lines.find(line => 
          line.toLowerCase().includes(marketDetails.city?.toLowerCase() || '') && 
          line.toLowerCase().includes(marketDetails.state?.toLowerCase() || '')
        );
        
        if (marketRentLine) {
          const values = marketRentLine.split(',');
          const avgRent = values[5]?.replace(/"/g, '') || 'N/A';
          const yoyGrowth = values[7]?.replace(/"/g, '') || 'N/A';
          rentalInsights = `Average Rent: $${avgRent}/month, YOY Growth: ${yoyGrowth}`;
        }
      }
    } catch (error) {
      console.error('Error fetching rental data:', error);
    }

    // Create AI prompt for market analysis
    const marketAnalysisPrompt = `Write a comprehensive 150-200 word market briefing for multifamily investors in ${marketDetails.city}, ${marketDetails.state}.

CURRENT MARKET DATA:
- Active MLS Listings: ${marketProperties.length} multifamily properties
- Average Property Value: $${Math.round(avgPrice).toLocaleString()}
- Market Cap Rates: ${avgCapRate ? `${avgCapRate.toFixed(1)}% average` : 'Analyzing current rates'}
- Your Target Range: $${Math.round(buyBoxData.estimated_value_min || 500000).toLocaleString()} - $${Math.round(buyBoxData.estimated_value_max || 2000000).toLocaleString()}
- Properties You Track: ${userProperties.length} in this market
${rentalInsights ? `- Rental Market: ${rentalInsights}` : ''}

Write a professional market briefing that includes:
1. Current market conditions using the specific data above
2. One key trend or opportunity in this market
3. One specific, actionable investment recommendation

Use the actual numbers provided. Write in a confident, professional tone as if briefing a sophisticated investor. Focus on actionable intelligence they can use immediately. When mentioning dollar amounts, use whole numbers without decimals (e.g., $263,000 not $262,933.33).`;

    const result = await openai.chat.completions.create({
      model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a real estate market analyst. Provide specific, clear insights using the data provided. Write complete sentences. Do not use markdown formatting. Follow the exact format requested.'
        },
        {
          role: 'user', 
          content: marketAnalysisPrompt
        }
      ],
      max_tokens: 400,
      temperature: 0.3
    });

    // Get the single market briefing paragraph
    const marketBriefing = result.choices[0]?.message?.content || 'Generating market analysis...';
    console.log('🤖 Market briefing generated:', marketBriefing.substring(0, 100) + '...');

    return {
      marketBriefing: marketBriefing.trim()
    };

  } catch (error) {
    console.error('Error generating AI trends:', error);
    return fallbackTrends;
  }
}