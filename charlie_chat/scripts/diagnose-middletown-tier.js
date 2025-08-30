// scripts/diagnose-middletown-tier.js
// Diagnostic script to trace tier assignment for Middletown, RI coordinates
// Coordinates: 41.4912414456759, -71.2809178270402

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Calculate distance between two lat/long points using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
}

async function diagnoseMiddletownTier() {
  try {
    console.log('🔍 Diagnosing Middletown, RI Market Tier Assignment');
    console.log('Coordinates: 41.4912414456759, -71.2809178270402');
    console.log('=' .repeat(60));
    
    const testLat = 41.4912414456759;
    const testLng = -71.2809178270402;
    
    // 1. Get ALL rental markets and calculate distances
    console.log('\n📍 1. Querying all rental markets from market_rental_data...');
    const { data: rentalMarkets, error } = await supabase
      .from('market_rental_data')
      .select('region_id, latitude, longitude, radius, city_state, market_tier, size_rank, monthly_rental_average');
    
    if (error) {
      console.error('❌ Error fetching rental markets:', error);
      return;
    }
    
    console.log(`Found ${rentalMarkets?.length || 0} rental markets in database`);
    
    // Calculate distances to all markets
    const marketsWithDistances = [];
    
    for (const market of rentalMarkets || []) {
      if (market.latitude && market.longitude) {
        const distance = calculateDistance(testLat, testLng, market.latitude, market.longitude);
        marketsWithDistances.push({
          ...market,
          distance: distance,
          withinRadius: distance <= market.radius
        });
      }
    }
    
    // Sort by distance
    marketsWithDistances.sort((a, b) => a.distance - b.distance);
    
    console.log('\n🗺️ 2. Nearest 10 rental markets to Middletown coordinates:');
    marketsWithDistances.slice(0, 10).forEach((market, index) => {
      const withinRadiusText = market.withinRadius ? '✅ WITHIN RADIUS' : '❌ outside radius';
      console.log(`  ${index + 1}. ${market.city_state}`);
      console.log(`     Distance: ${market.distance.toFixed(2)} miles`);
      console.log(`     Market Radius: ${market.radius} miles`);
      console.log(`     ${withinRadiusText}`);
      console.log(`     Market Tier: ${market.market_tier} (Size Rank: ${market.size_rank})`);
      console.log(`     Region ID: ${market.region_id}`);
      console.log(`     Monthly Avg Rent: $${market.monthly_rental_average}`);
      console.log('     ---');
    });
    
    // 3. Find markets within radius
    const marketsWithinRadius = marketsWithDistances.filter(m => m.withinRadius);
    
    console.log(`\n🎯 3. Markets within their radius (${marketsWithinRadius.length} found):`);
    if (marketsWithinRadius.length > 0) {
      marketsWithinRadius.forEach((market, index) => {
        console.log(`  ${index + 1}. ${market.city_state}`);
        console.log(`     Distance: ${market.distance.toFixed(2)} miles (within ${market.radius} mile radius)`);
        console.log(`     Market Tier: ${market.market_tier} ⭐`);
        console.log(`     Size Rank: ${market.size_rank}`);
        console.log(`     Region ID: ${market.region_id}`);
        console.log('     ---');
      });
      
      // The first match would be returned by findNearestRentalMarket
      const firstMatch = marketsWithinRadius[0];
      console.log(`\n🏆 RESULT: findNearestRentalMarket() would return:`);
      console.log(`   Region ID: ${firstMatch.region_id}`);
      console.log(`   Market Tier: ${firstMatch.market_tier}`);
      console.log(`   City: ${firstMatch.city_state}`);
      
    } else {
      console.log('  No markets found within their radius');
      console.log('\n🔄 4. Fallback logic would be used based on property count:');
      console.log('   >= 8000: Tier 1');
      console.log('   >= 1000: Tier 2'); 
      console.log('   >= 300: Tier 3');
      console.log('   < 300: Tier 4');
    }
    
    // 4. Check Rhode Island markets specifically
    console.log('\n🏛️ 5. All Rhode Island markets in database:');
    const riMarkets = marketsWithDistances.filter(m => 
      m.city_state.toLowerCase().includes('ri') || 
      m.city_state.toLowerCase().includes('rhode island')
    );
    
    if (riMarkets.length > 0) {
      riMarkets.forEach((market, index) => {
        console.log(`  ${index + 1}. ${market.city_state}`);
        console.log(`     Distance from Middletown: ${market.distance.toFixed(2)} miles`);
        console.log(`     Market Radius: ${market.radius} miles`);
        console.log(`     Within Radius: ${market.withinRadius ? 'YES' : 'NO'}`);
        console.log(`     Market Tier: ${market.market_tier}`);
        console.log(`     Size Rank: ${market.size_rank}`);
        console.log('     ---');
      });
    } else {
      console.log('  No Rhode Island markets found in database');
    }
    
    // 5. Check nearby New England markets
    console.log('\n🍂 6. Nearby New England markets (within 50 miles):');
    const nearbyMarkets = marketsWithDistances
      .filter(m => m.distance <= 50)
      .slice(0, 15); // Top 15 nearest
    
    nearbyMarkets.forEach((market, index) => {
      const withinRadiusText = market.withinRadius ? '✅' : '❌';
      console.log(`  ${index + 1}. ${market.city_state} (${market.distance.toFixed(2)}mi) ${withinRadiusText}`);
      console.log(`     Radius: ${market.radius}mi, Tier: ${market.market_tier}, Rank: ${market.size_rank}`);
    });
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('🔥 Fatal error during diagnosis:', error);
  }
}

// Run the diagnosis
diagnoseMiddletownTier();