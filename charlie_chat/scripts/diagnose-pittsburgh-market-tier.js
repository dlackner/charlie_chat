// scripts/diagnose-pittsburgh-market-tier.js
// Diagnostic script to query database and show exact Pittsburgh market tier data
// LIKELY CAN DELETE THIS

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

async function diagnosePittsburghMarketTier() {
  try {
    console.log('🔍 Diagnosing Pittsburgh Market Tier Data');
    console.log('=' .repeat(50));
    
    // 1. Query user_markets table for Pittsburgh
    console.log('\n📍 1. Checking user_markets table for Pittsburgh entries...');
    const { data: userMarkets, error: userMarketsError } = await supabase
      .from('user_markets')
      .select('*')
      .ilike('city', '%pittsburgh%');
    
    if (userMarketsError) {
      console.error('❌ Error querying user_markets:', userMarketsError);
    } else {
      console.log(`Found ${userMarkets?.length || 0} entries in user_markets:`);
      if (userMarkets && userMarkets.length > 0) {
        userMarkets.forEach((market, index) => {
          console.log(`  ${index + 1}. ID: ${market.id}`);
          console.log(`     City: ${market.city}`);
          console.log(`     State: ${market.state}`);
          console.log(`     Market Key: ${market.market_key}`);
          console.log(`     Market Tier: ${market.market_tier}`);
          console.log(`     Coordinates: ${market.latitude}, ${market.longitude}`);
          console.log(`     Radius: ${market.radius}`);
          console.log(`     Created: ${market.created_at}`);
          console.log('     ---');
        });
      } else {
        console.log('  No entries found in user_markets for Pittsburgh');
      }
    }

    // 2. Query market_rental_data table for Pittsburgh
    console.log('\n📊 2. Checking market_rental_data table for Pittsburgh entries...');
    const { data: rentalData, error: rentalDataError } = await supabase
      .from('market_rental_data')
      .select('*')
      .ilike('city_state', '%pittsburgh%');
    
    if (rentalDataError) {
      console.error('❌ Error querying market_rental_data:', rentalDataError);
    } else {
      console.log(`Found ${rentalData?.length || 0} entries in market_rental_data:`);
      if (rentalData && rentalData.length > 0) {
        rentalData.forEach((data, index) => {
          console.log(`  ${index + 1}. Region ID: ${data.region_id}`);
          console.log(`     City/State: ${data.city_state}`);
          console.log(`     Size Rank: ${data.size_rank}`);
          console.log(`     Market Tier: ${data.market_tier}`);
          console.log(`     Coordinates: ${data.latitude}, ${data.longitude}`);
          console.log(`     Monthly Rent Avg: $${data.monthly_rental_average}`);
          console.log(`     Radius: ${data.radius}`);
          console.log(`     YoY Growth: ${data.year_over_year_growth} (${data.yoy_growth_numeric})`);
          console.log(`     Created: ${data.created_at}`);
          console.log('     ---');
        });
      } else {
        console.log('  No entries found in market_rental_data for Pittsburgh');
      }
    }

    // 3. Also search for any variations of Pittsburgh naming
    console.log('\n🔍 3. Checking for Pittsburgh variations in market_rental_data...');
    const searchTerms = ['pittsburgh', 'pitt ', 'pittsburg'];
    
    for (const term of searchTerms) {
      const { data: variantData, error: variantError } = await supabase
        .from('market_rental_data')
        .select('*')
        .ilike('city_state', `%${term}%`);
      
      if (variantError) {
        console.error(`❌ Error searching for "${term}":`, variantError);
      } else if (variantData && variantData.length > 0) {
        console.log(`Found ${variantData.length} entries containing "${term}":`);
        variantData.forEach((data, index) => {
          console.log(`  ${index + 1}. ${data.city_state} - Tier ${data.market_tier}, Rank ${data.size_rank}`);
        });
      } else {
        console.log(`  No entries found containing "${term}"`);
      }
    }

    // 4. Show market tier calculation logic for reference
    console.log('\n🧮 4. Market Tier Calculation Reference:');
    console.log('  Tier 1: Size Rank 1-25');
    console.log('  Tier 2: Size Rank 26-100');
    console.log('  Tier 3: Size Rank 101-300');
    console.log('  Tier 4: Size Rank 301+');

    // 5. Check for all markets with tier 2 to see size rank distribution
    console.log('\n📈 5. All Tier 2 markets in database (for comparison):');
    const { data: tier2Markets, error: tier2Error } = await supabase
      .from('market_rental_data')
      .select('city_state, size_rank, market_tier')
      .eq('market_tier', 2)
      .order('size_rank');
    
    if (tier2Error) {
      console.error('❌ Error querying tier 2 markets:', tier2Error);
    } else if (tier2Markets && tier2Markets.length > 0) {
      console.log(`Found ${tier2Markets.length} Tier 2 markets:`);
      tier2Markets.slice(0, 10).forEach((market, index) => {
        console.log(`  ${index + 1}. ${market.city_state} - Rank ${market.size_rank}`);
      });
      if (tier2Markets.length > 10) {
        console.log(`  ... and ${tier2Markets.length - 10} more`);
      }
    }

    // 6. Check for any markets in Pennsylvania
    console.log('\n🏛️ 6. All Pennsylvania markets in database:');
    const { data: paMarkets, error: paError } = await supabase
      .from('market_rental_data')
      .select('city_state, size_rank, market_tier, region_id')
      .ilike('city_state', '%pa%')
      .order('size_rank');
    
    if (paError) {
      console.error('❌ Error querying PA markets:', paError);
    } else if (paMarkets && paMarkets.length > 0) {
      console.log(`Found ${paMarkets.length} Pennsylvania markets:`);
      paMarkets.forEach((market, index) => {
        console.log(`  ${index + 1}. ${market.city_state} - Rank ${market.size_rank}, Tier ${market.market_tier}, Region ID ${market.region_id}`);
      });
    } else {
      console.log('  No Pennsylvania markets found');
    }

    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('🔥 Fatal error during diagnosis:', error);
  }
}

// Run the diagnosis
diagnosePittsburghMarketTier();