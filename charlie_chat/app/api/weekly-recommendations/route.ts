// app/api/weekly-recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateWeeklyRecommendations, BuyBoxMarket } from '@/lib/weeklyRecommendations';
import type { Listing } from '@/components/ui/listingTypes';

// Utility function for capitalizing words (for case-insensitive city searches)
const capitalizeWords = (str: string) =>
    str.replace(/\b\w/g, (c) => c.toUpperCase());

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Weekly recommendations API called');
    
    // Parse request body to check for forceRefresh
    const requestBody = await req.json();
    const forceRefresh = requestBody.forceRefresh || false;
    console.log('🔄 Force refresh requested:', forceRefresh);
    
    const supabase = createSupabaseAdminClient();
    let user: any = null;
    
    // Check for automated triggers in different ways
    const automatedUserId = req.headers.get('x-user-id');
    const cronUserId = requestBody.userId; // For PostgreSQL cron calls
    
    if (automatedUserId || cronUserId) {
      const userId = automatedUserId || cronUserId;
      console.log('🤖 Automated trigger detected for user:', userId);
      
      // For automated triggers, create a simple user object
      user = {
        id: userId,
        email: `user-${userId}@automated.trigger` // Placeholder email for automated triggers
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
    
    // Debug: Log user info
    console.log('API User ID:', user.id);
    console.log('API User email:', user.email);

    // Check if user has weekly recommendations enabled
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('weekly_recommendations_enabled')
      .eq('user_id', user.id)
      .single();

    console.log('Profile query result:', { profile, profileError });

    if (profileError || !profile) {
      return NextResponse.json(
        { error: `No profile found for user ${user.id}.` },
        { status: 404 }
      );
    }

    if (!profile.weekly_recommendations_enabled) {
      return NextResponse.json(
        { error: 'Weekly recommendations are disabled for this user.' },
        { status: 403 }
      );
    }

    // Run market assignment for manual properties before generating recommendations
    console.log('🎯 Running market assignment for manual properties...');
    try {
      const { data: assignmentResults, error: assignmentError } = await supabase.rpc(
        'assign_manual_properties_to_markets_for_user', 
        { target_user_id: user.id }
      );
      
      if (assignmentError) {
        console.warn('⚠️ Market assignment warning:', assignmentError);
      } else if (assignmentResults && assignmentResults.length > 0) {
        console.log(`✅ Market assignment completed: ${assignmentResults.length} properties updated`);
        assignmentResults.forEach((result: any) => {
          console.log(`  - ${result.updated_property_id}: ${result.old_market_key || 'NULL'} → ${result.new_market_key} (${Number(result.distance_miles).toFixed(2)} miles)`);
        });
      } else {
        console.log('✅ Market assignment completed: no updates needed');
      }
    } catch (marketError) {
      console.error('⚠️ Market assignment error (continuing anyway):', marketError);
    }

    // Fetch user's markets
    const { data: userMarkets, error: marketsError } = await supabase
      .from('user_markets')
      .select('*')
      .eq('user_id', user.id);

    if (marketsError || !userMarkets || userMarkets.length === 0) {
      return NextResponse.json(
        { error: `No markets found for user ${user.id}. Please set up your Buy Box first.` },
        { status: 404 }
      );
    }

    // Get user's existing active favorites for deduplication
    console.log('🔍 Fetching user existing active favorites for deduplication...');
    const { data: existingFavorites, error: favError } = await supabase
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', user.id)
      .eq('status', 'active'); // Only exclude active favorites, not pending

    if (favError) {
      console.error('❌ Error fetching existing favorites:', favError);
    }

    const existingPropertyIds = new Set(
      existingFavorites?.map(fav => fav.property_id) || []
    );
    
    console.log(`📋 User has ${existingPropertyIds.size} existing active favorites to exclude`);

    // Use user_markets data directly with all fields
    const convertedMarkets = userMarkets.map(market => ({
      ...market,
      marketKey: market.market_key,
      type: market.market_type as 'city' | 'zip',
      customName: market.market_name,
      unitsMin: market.units_min,
      unitsMax: market.units_max,
      priceMin: market.assessed_value_min,
      priceMax: market.assessed_value_max,
      yearMin: market.year_built_min,
      yearMax: market.year_built_max,
    }));

    console.log('📋 User markets from database:', JSON.stringify(convertedMarkets, null, 2));

    // Fetch available properties using new market-specific cache
    const propertySearchRequests = convertedMarkets.map(async (market) => {
      // Use stable Market1-5 key from buy box
      const marketKey = market.marketKey;

      console.log(`🔍 Using property IDs from user_markets for market: ${marketKey}`);

      // Get property IDs directly from the user_markets table (already fetched)
      if (!market.property_ids || market.property_ids.length === 0) {
        console.log(`❌ No property IDs found for market ${market.id}: property_ids is empty`);
        return { 
          market, 
          properties: [],
          rentalData: null,
          message: `No properties found for ${market.customName || marketKey}. Please re-save this market in your Buy Box.`
        };
      }

      // Randomly select a subset of property IDs for efficiency (max 100 properties per market)
      const allPropertyIds = market.property_ids as string[];
      const maxPropertiesToProcess = 100;
      
      let cachedIds: string[];
      if (allPropertyIds.length <= maxPropertiesToProcess) {
        cachedIds = allPropertyIds;
      } else {
        // Shuffle array and take first N elements for random selection
        const shuffled = [...allPropertyIds].sort(() => 0.5 - Math.random());
        cachedIds = shuffled.slice(0, maxPropertiesToProcess);
      }
      
      console.log(`🎲 Randomly selected ${cachedIds.length} properties from ${allPropertyIds.length} total for processing`);
      
      // Get rental data if rental_region_id exists
      let rentalData = null;
      if (market.rental_region_id) {
        const { data: rental } = await supabase
          .from('market_rental_data')
          .select('region_id, city_state, monthly_rental_average, yoy_growth_numeric, market_tier')
          .eq('region_id', market.rental_region_id)
          .single();
        rentalData = rental;
      }

      console.log(`💾 Found ${cachedIds.length} cached property IDs for market ${market.id}`);
      console.log(`🏢 Rental data:`, rentalData);

      // Filter cached IDs to exclude user's existing active favorites
      const availableIds = cachedIds.filter(id => !existingPropertyIds.has(id));

      if (availableIds.length === 0) {
        console.log(`⚠️ No new properties available for market ${market.id} after deduplication`);
        return { 
          market, 
          properties: [],
          rentalData,
          message: `All cached properties are already in your favorites`
        };
      }

      // Determine sample size based on market tier (if available)
      const marketTier = rentalData?.market_tier || 4;
      const sampleSizes = { 1: 15, 2: 12, 3: 10, 4: 8 }; // Recommendation sample sizes
      const maxSample = sampleSizes[marketTier as keyof typeof sampleSizes] || 10;
      
      // Random sampling for diversity
      const shuffled = availableIds.sort(() => Math.random() - 0.5);
      const sampleIds = shuffled.slice(0, Math.min(maxSample, 50)); // Cap at 50 for cost control

      console.log(`🎯 Sampling ${sampleIds.length} properties from ${availableIds.length} available (Tier ${marketTier} market)`);

      // Fetch full property details for sample
      const searchPayload = {
        ids: sampleIds,
        size: sampleIds.length, // Request exactly the number of properties we want
        obfuscate: false,
        summary: false
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/realestateapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload),
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch properties for market ${market.id}`);
        return { market, properties: [], rentalData, message: 'Failed to fetch property details' };
      }

      const data = await response.json();
      const properties: Listing[] = data.data || [];
      
      console.log(`📊 Retrieved ${properties.length} properties for market ${market.id}`);
      
      return { market, properties, rentalData };
    });

    // Wait for all property searches to complete
    const marketResults = await Promise.all(propertySearchRequests);

    // Generate recommendations for each market
    const recommendations = marketResults.map(({ market, properties, rentalData, message }) => {
      if (properties.length === 0) {
        return {
          market,
          recommendations: [],
          count: 0,
          message: message || 'No properties found',
          rentalData
        };
      }

      const weeklyRecs = generateWeeklyRecommendations([market], properties, 3);
      const result = weeklyRecs[0]; // Only one market per call
      return {
        ...result,
        rentalData // Include rental market data for enhanced explanations
      };
    });

    // Filter out empty markets and format response
    const validRecommendations = recommendations.filter(rec => rec.count > 0);
    
    console.log(`🔍 DEBUG: Found ${validRecommendations.length} valid recommendations`);
    console.log(`🔍 DEBUG: validRecommendations structure:`, JSON.stringify(validRecommendations.map(r => ({
      marketKey: r.market?.marketKey,
      count: r.count,
      hasRecommendations: !!r.recommendations,
      recommendationsLength: r.recommendations?.length
    })), null, 2));

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
        marketName: getMarketDisplayName(rec.market),
        marketKey: rec.market.marketKey, // Stable identifier for recommendation tracking
        fitScore: scored.fitScore,
        diversityScore: scored.diversityScore,
        totalScore: scored.totalScore,
        reasons: scored.reasons
      }))
    );

    console.log(`💾 Saving ${allRecommendedProperties.length} recommended properties to database...`);

    // Save to database in parallel
    try {
      await Promise.all(allRecommendedProperties.map(async ({ property, marketName, marketKey, fitScore, diversityScore, totalScore, reasons }) => {
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

        // Then, add to user_favorites as pending recommendation (user must choose to activate)
        const { error: favoriteError } = await supabase
          .from('user_favorites')
          .upsert({
            user_id: user.id,
            property_id: property.id,
            market_key: marketKey, // Add market key for tracking
            is_active: true, // Keep existing field for backward compatibility
            status: 'pending', // New status field - pending until user chooses
            saved_at: generatedAt,
            recommendation_type: 'algorithm',
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
      name: getMarketDisplayName(rec.market),
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

// Helper function to get market display name
function getMarketDisplayName(market: BuyBoxMarket): string {
  // Use custom name if user has set one
  if (market.customName?.trim()) {
    return market.customName.trim();
  }
  
  // Auto-generate from location
  if (market.type === 'city' && market.city && market.state) {
    return `${market.city}, ${market.state}`;
  } else if (market.type === 'zip' && market.zip) {
    // Show first zip if multiple zips
    const firstZip = market.zip.split(',')[0].trim();
    return `ZIP ${firstZip}`;
  } else {
    return `Market ${market.marketKey}`;
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