// app/api/weekly-recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateWeeklyRecommendations, BuyBoxMarket } from '@/lib/weeklyRecommendations';
import type { Listing } from '@/components/ui/listingTypes';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Weekly recommendations API called');
    
    const supabase = createSupabaseAdminClient();
    let user: any = null;
    
    // Check if this is an automated trigger (with x-user-id header)
    const automatedUserId = req.headers.get('x-user-id');
    
    if (automatedUserId) {
      console.log('🤖 Automated trigger detected for user:', automatedUserId);
      
      // For automated triggers, create a simple user object
      user = {
        id: automatedUserId,
        email: `user-${automatedUserId}@automated.trigger` // Placeholder email for automated triggers
      };
      
      console.log('👤 Automated trigger user:', { userId: user.id, email: user.email });
    } else {
      // Regular user request - verify token
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        );
      }
      
      // Verify the user token and get user info
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      console.log('👤 User auth result:', { userId: authUser?.id, email: authUser?.email, authError });
      
      if (authError || !authUser?.email) {
        console.log('❌ Auth failed:', authError);
        return NextResponse.json(
          { error: 'Unauthorized - Invalid token' },
          { status: 401 }
        );
      }
      
      user = authUser;
    }
    
    // Fetch user's Buy Box preferences with cached property IDs
    const { data: preferences, error: prefsError } = await supabase
      .from('user_buy_box_preferences')
      .select('*, cached_property_ids, cache_updated_at, cache_criteria_hash')
      .eq('user_id', user.id)
      .single();

    if (prefsError || !preferences) {
      return NextResponse.json(
        { error: 'No Buy Box preferences found. Please set up your criteria first.' },
        { status: 404 }
      );
    }

    if (!preferences.weekly_recommendations_enabled) {
      return NextResponse.json(
        { error: 'Weekly recommendations are disabled for this user.' },
        { status: 403 }
      );
    }

    // Get user's existing favorites for deduplication
    console.log('🔍 Fetching user existing favorites for deduplication...');
    const { data: existingFavorites, error: favError } = await supabase
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (favError) {
      console.error('❌ Error fetching existing favorites:', favError);
    }

    const existingPropertyIds = new Set(
      existingFavorites?.map(fav => fav.property_id) || []
    );
    
    console.log(`📋 User has ${existingPropertyIds.size} existing favorites to exclude`);

    // Convert JSONB target_markets to BuyBoxMarket format
    const userMarkets: BuyBoxMarket[] = preferences.target_markets || [];

    console.log('📋 User markets from database:', JSON.stringify(userMarkets, null, 2));

    if (userMarkets.length === 0) {
      return NextResponse.json(
        { error: 'No target markets configured in your Buy Box preferences.' },
        { status: 400 }
      );
    }

    // Check if we can use cached property IDs for efficient deduplication
    const canUseCachedIds = preferences.cached_property_ids && 
                           preferences.cache_updated_at &&
                           preferences.cached_property_ids.length > 0;

    console.log(`💾 Cache available: ${canUseCachedIds}, IDs: ${preferences.cached_property_ids?.length || 0}`);

    // Fetch available properties from external API
    const propertySearchRequests = userMarkets.map(async (market) => {
      // If we have cached IDs, use them for efficient deduplication
      if (canUseCachedIds) {
        console.log(`🎯 Using cached IDs for market ${market.id} with deduplication`);
        
        // Filter cached IDs to exclude user's existing favorites
        const availableIds = preferences.cached_property_ids.filter((id: string) => 
          !existingPropertyIds.has(id)
        );

        if (availableIds.length === 0) {
          console.log(`⚠️ No new properties available for market ${market.id} after deduplication`);
          return { market, properties: [] };
        }

        // Fetch full property details for the deduplicated IDs (limit to 50 for performance)
        const searchPayload = {
          ids: availableIds.slice(0, 50),
          obfuscate: false,
          summary: false
        };

        console.log(`🔍 Fetching details for ${availableIds.slice(0, 50).length} deduplicated properties`);

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/realestateapi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchPayload),
        });

        if (!response.ok) {
          console.error(`❌ Failed to fetch cached properties for market ${market.id}`);
          return { market, properties: [] };
        }

        const data = await response.json();
        const properties: Listing[] = data.data || [];
        
        console.log(`📊 Retrieved ${properties.length} cached properties for market ${market.id}`);
        
        return { market, properties };
      }

      // Fallback to original search method if no cache available
      const searchPayload: any = {
        size: 50, // Reduce size since we'll filter afterwards
        resultIndex: 0,
        obfuscate: false,
        summary: false,
        ids_only: false
      };

      // Add market-specific filters
      if (market.type === 'city') {
        searchPayload.city = market.city;
        searchPayload.state = market.state;
      } else if (market.type === 'zip' && market.zip) {
        searchPayload.zip = market.zip; // Send as string, realestateapi will split it
      }

      // Add unit constraints with 50% expansion for exploration
      const unitsExpansion = Math.ceil((market.units_max - market.units_min) * 0.5);
      searchPayload.units_min = Math.max(1, market.units_min - unitsExpansion);
      searchPayload.units_max = market.units_max + unitsExpansion;

      // Add value constraints with 50% expansion
      const valueExpansion = Math.ceil((market.assessed_value_max - market.assessed_value_min) * 0.5);
      searchPayload.assessed_value_min = Math.max(0, market.assessed_value_min - valueExpansion);
      searchPayload.assessed_value_max = market.assessed_value_max + valueExpansion;

      console.log(`🔍 Fetching properties for market ${market.id}:`, JSON.stringify(searchPayload, null, 2));

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/realestateapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload),
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch properties for market ${market.id}`);
        return { market, properties: [] };
      }

      const data = await response.json();
      let properties: Listing[] = data.data || [];
      
      // Apply deduplication to fallback search results
      const propertiesBeforeDedup = properties.length;
      properties = properties.filter(property => !existingPropertyIds.has(property.id));
      
      console.log(`📊 Found ${propertiesBeforeDedup} properties for market ${market.id}, ${properties.length} after deduplication`);
      
      return { market, properties };
    });

    // Wait for all property searches to complete
    const marketResults = await Promise.all(propertySearchRequests);

    // Generate recommendations for each market
    const recommendations = marketResults.map(({ market, properties }) => {
      if (properties.length === 0) {
        return {
          market,
          recommendations: [],
          count: 0,
          message: 'No properties found matching expanded criteria'
        };
      }

      const weeklyRecs = generateWeeklyRecommendations([market], properties, 3);
      return weeklyRecs[0]; // Only one market per call
    });

    // Filter out empty markets and format response
    const validRecommendations = recommendations.filter(rec => rec.count > 0);

    if (validRecommendations.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No suitable properties found for your criteria this week. Try expanding your Buy Box parameters.',
        recommendations: []
      });
    }

    // Generate a batch ID for this recommendation set
    const batchId = crypto.randomUUID();
    const generatedAt = new Date().toISOString();

    // Save all recommended properties to database
    const allRecommendedProperties = validRecommendations.flatMap(rec => 
      rec.recommendations.map(scored => ({
        property: scored.property,
        marketName: rec.market.type === 'city' 
          ? `${rec.market.city}, ${rec.market.state}`
          : `ZIP ${rec.market.zip}`,
        fitScore: scored.fitScore,
        diversityScore: scored.diversityScore,
        totalScore: scored.totalScore,
        reasons: scored.reasons
      }))
    );

    console.log(`💾 Saving ${allRecommendedProperties.length} recommended properties to database...`);

    // Save to database in parallel
    try {
      await Promise.all(allRecommendedProperties.map(async ({ property, marketName, fitScore, diversityScore, totalScore, reasons }) => {
        // First, upsert to saved_properties table (bypass RLS with admin client)
        const { data: savedProperty, error: propertyError } = await supabase
          .from('saved_properties')
          .upsert({
            property_id: property.id,
            address_full: property.address_street || property.address_full || '',
            address_city: property.address_city || '',
            address_state: property.address_state || '',
            address_zip: property.address_zip || null,
            units_count: property.units_count || 0,
            year_built: property.year_built || null,
            last_sale_date: property.last_sale_date || null,
            assessed_value: property.assessed_value || 0,
            assessed_land_value: property.assessed_land_value ?? null,
            estimated_value: property.estimated_value || 0,
            estimated_equity: property.estimated_equity || 0,
            years_owned: property.years_owned || 0,
            out_of_state_absentee_owner: property.out_of_state_absentee_owner || false,
            auction: property.auction || false,
            reo: property.reo || false,
            tax_lien: property.tax_lien || false,
            pre_foreclosure: property.pre_foreclosure || false,
            private_lender: property.private_lender || false,
            owner_first_name: property.owner_first_name || null,
            owner_last_name: property.owner_last_name || null,
            mail_address_full: property.mail_address_full || null,
            mail_address_street: property.mail_address_street || null,
            mail_address_city: property.mail_address_city || null,
            mail_address_state: property.mail_address_state || null,
            mail_address_zip: property.mail_address_zip || null,
            mail_address_county: property.mail_address_county || null,
            latitude: property.latitude ?? null,
            longitude: property.longitude ?? null,
            property_type: property.property_type || null,
            square_feet: property.square_feet ?? null,
            lot_square_feet: property.lot_square_feet ?? null,
            stories: property.stories ?? null,
            flood_zone: property.flood_zone ?? null,
            flood_zone_description: property.flood_zone_description || null,
            rent_estimate: property.rent_estimate ?? null,
            listing_price: property.listing_price ?? null,
            mortgage_balance: property.mortgage_balance ?? null,
            mortgage_maturing_date: null,
            last_sale_arms_length: property.last_sale_arms_length ?? null,
            mls_active: property.mls_active ?? null,
            for_sale: property.for_sale ?? null,
            assumable: property.assumable ?? null,
            foreclosure: property.foreclosure ?? null,
            in_state_absentee_owner: property.in_state_absentee_owner ?? null,
            owner_occupied: property.owner_occupied ?? null,
            corporate_owned: property.corporate_owned ?? null,
            investor_buyer: property.investor_buyer ?? null,
            lender_name: property.lender_name || null,
            total_portfolio_equity: property.total_portfolio_equity ?? null,
            total_portfolio_mortgage_balance: property.total_portfolio_mortgage_balance ?? null,
            total_properties_owned: property.total_properties_owned ?? null,
            saved_at: generatedAt
          }, {
            onConflict: 'property_id'
          })
          .select();

        if (propertyError) {
          console.error('❌ Error saving property to saved_properties:', property.id, propertyError);
          return;
        }

        // Then, add to user_favorites as weekly recommendation
        const { error: favoriteError } = await supabase
          .from('user_favorites')
          .upsert({
            user_id: user.id,
            property_id: property.id,
            is_active: true,
            saved_at: generatedAt,
            recommendation_type: 'weekly_recommendation',
            recommendation_batch_id: batchId,
            fit_score: fitScore,
            diversity_score: diversityScore,
            total_score: totalScore,
            selection_reasons: reasons,
            generated_at: generatedAt
          }, {
            onConflict: 'user_id,property_id'
          });

        if (favoriteError) {
          console.error('❌ Error saving to user_favorites:', property.id, favoriteError);
        } else {
          console.log(`✅ Saved weekly recommendation: ${property.address_full} (Score: ${totalScore})`);
        }
      }));

      console.log(`💾 Successfully saved ${allRecommendedProperties.length} properties to database`);
    } catch (error) {
      console.error('❌ Error saving recommendations to database:', error);
      // Continue anyway - don't fail the API call if database save fails
    }

    // Format for frontend consumption (matching WeeklyRecommendationsModal expected structure)
    const formattedRecommendations = validRecommendations.map(rec => ({
      name: rec.market.type === 'city' 
        ? `${rec.market.city}, ${rec.market.state}`
        : `ZIP ${rec.market.zip}`,
      msa_name: rec.market.type === 'city' 
        ? `${rec.market.city} Metro Area`
        : undefined,
      properties: rec.recommendations.map(scored => scored.property)
    }));

    console.log(`✅ Generated ${formattedRecommendations.length} market recommendations with ${formattedRecommendations.reduce((sum, m) => sum + m.properties.length, 0)} total properties`);

    return NextResponse.json({
      success: true,
      recommendations: formattedRecommendations,
      metadata: {
        generatedAt,
        batchId,
        userEmail: user.email,
        totalMarkets: formattedRecommendations.length,
        totalProperties: formattedRecommendations.reduce((sum, m) => sum + m.properties.length, 0)
      }
    });

  } catch (error) {
    console.error('🔥 Error generating weekly recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/debugging
export async function GET() {
  return NextResponse.json({
    message: 'Weekly recommendations API is active',
    endpoint: 'POST /api/weekly-recommendations',
    requiresAuth: true
  });
}