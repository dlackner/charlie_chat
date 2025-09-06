#!/usr/bin/env node

// Debug script to examine user's market configuration
// Run with: node debug-market-config.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function debugMarketConfig() {
  // Check for environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Debugging User Market Configuration\n');

  try {
    // 1. Check if user_markets table exists and analyze all user markets
    console.log('1. Checking for user_markets table...');
    const { data: userMarketsData, error: userMarketsError } = await supabase
      .from('user_markets')
      .select('*');

    if (userMarketsError) {
      console.log('   ❌ user_markets table does not exist or is inaccessible');
      console.log('   Error:', userMarketsError.message);
    } else {
      console.log(`   ✅ user_markets table exists with ${userMarketsData?.length || 0} total rows`);
      if (userMarketsData && userMarketsData.length > 0) {
        console.log('   All market configurations:');
        userMarketsData.forEach((market, i) => {
          console.log(`     ${i + 1}. Market ID: ${market.id}`);
          console.log(`        User: ${market.user_id}`);
          console.log(`        Market Type: ${market.market_type}`);
          console.log(`        Location: ${market.city || market.zip || 'N/A'}, ${market.state || 'N/A'}`);
          console.log(`        Market Key: ${market.market_key}`);
          console.log(`        Buy Box Criteria:`);
          console.log(`          - Units: ${market.units_min || 'N/A'}-${market.units_max || 'N/A'}`);
          console.log(`          - Assessed Value: $${market.assessed_value_min ? market.assessed_value_min.toLocaleString() : 'N/A'}-$${market.assessed_value_max ? market.assessed_value_max.toLocaleString() : 'N/A'}`);
          console.log(`          - Lambda: ${market.lambda_value}`);
          console.log(`        Created: ${market.created_at}`);
          console.log();
        });
      }
    }

    // 2. Check user_markets table (replaces deprecated user_buy_box_preferences)
    console.log('\n2. Checking user_markets table...');
    const { data: marketsData, error: marketsError } = await supabase
      .from('user_markets')
      .select('user_id, market_key, market_name, market_type, city, state, lambda_value, units_min, units_max, assessed_value_min, assessed_value_max, created_at')
      .limit(10);

    if (marketsError) {
      console.log('   ❌ user_markets table error:', marketsError.message);
    } else {
      console.log(`   ✅ user_markets table exists with ${marketsData?.length || 0} rows`);
      if (marketsData && marketsData.length > 0) {
        console.log('   Market configurations:');
        marketsData.forEach((market, i) => {
          console.log(`     ${i + 1}. Market ${market.market_key} (${market.market_name}):`);
          console.log(`        - User: ${market.user_id}`);
          console.log(`        - Type: ${market.market_type}`);
          console.log(`        - Location: ${market.city}, ${market.state}`);
          console.log(`        - Lambda: ${market.lambda_value}`);
          console.log(`        - Units range: ${market.units_min}-${market.units_max}`);
          console.log(`        - Assessed value range: $${market.assessed_value_min ? market.assessed_value_min.toLocaleString() : 'N/A'}-$${market.assessed_value_max ? market.assessed_value_max.toLocaleString() : 'N/A'}`);
          console.log();
        });
      }
    }

    // 3. Check profiles table for weekly_recommendations_enabled
    console.log('\n3. Checking profiles table for weekly recommendations setting...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, weekly_recommendations_enabled')
      .limit(10);

    if (profilesError) {
      console.log('   ❌ profiles table error:', profilesError.message);
    } else {
      console.log(`   ✅ profiles table exists with ${profilesData?.length || 0} rows`);
      if (profilesData && profilesData.length > 0) {
        const enabledCount = profilesData.filter(p => p.weekly_recommendations_enabled).length;
        console.log(`   ${enabledCount}/${profilesData.length} users have weekly recommendations enabled`);
        
        console.log('   Sample data:');
        profilesData.slice(0, 5).forEach((profile, i) => {
          const userId = profile.id || profile.user_id;
          console.log(`     ${i + 1}. User ${userId}: weekly_enabled=${profile.weekly_recommendations_enabled}`);
        });
      }
    }

    // 4. Check user_property_decisions table to see what's being logged
    console.log('\n4. Checking user_property_decisions table...');
    const { data: decisionsData, error: decisionsError } = await supabase
      .from('user_property_decisions')
      .select('*')
      .order('decided_at', { ascending: false })
      .limit(20);

    if (decisionsError) {
      console.log('   ❌ user_property_decisions table error:', decisionsError.message);
    } else {
      console.log(`   ✅ user_property_decisions table exists with ${decisionsData?.length || 0} recent entries`);
      if (decisionsData && decisionsData.length > 0) {
        // Group by market_key to see what markets are being tracked
        const marketCounts = {};
        decisionsData.forEach(decision => {
          const key = decision.market_key || 'Unknown';
          marketCounts[key] = (marketCounts[key] || 0) + 1;
        });

        console.log('   Recent decisions by market:');
        Object.entries(marketCounts)
          .sort(([,a], [,b]) => b - a)
          .forEach(([market, count]) => {
            console.log(`     ${market}: ${count} decisions`);
          });

        console.log('\n   Sample recent decisions:');
        decisionsData.slice(0, 10).forEach((decision, i) => {
          console.log(`     ${i + 1}. Decision ID: ${decision.id}`);
          console.log(`        User: ${decision.user_id}, Property: ${decision.property_id}`);
          console.log(`        Market: ${decision.market_key} (Tier: ${decision.market_tier})`);
          console.log(`        Decision: ${decision.decision} at ${decision.timestamp}`);
          console.log(`        Full decision object:`, decision);
          console.log();
        });
      }
    }

    // 5. Check saved_properties table for market distribution
    console.log('\n5. Checking saved_properties market distribution...');
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('saved_properties')
      .select('address_city, address_state')
      .limit(100);

    if (propertiesError) {
      console.log('   ❌ saved_properties table error:', propertiesError.message);
    } else {
      console.log(`   ✅ saved_properties table exists with ${propertiesData?.length || 0} sample properties`);
      if (propertiesData && propertiesData.length > 0) {
        // Group by city/state
        const cityCounts = {};
        propertiesData.forEach(prop => {
          if (prop.address_city && prop.address_state) {
            const key = `${prop.address_city}, ${prop.address_state}`;
            cityCounts[key] = (cityCounts[key] || 0) + 1;
          }
        });

        console.log('   Top cities in saved_properties:');
        Object.entries(cityCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .forEach(([city, count]) => {
            console.log(`     ${city}: ${count} properties`);
          });
      }
    }

    // 6. Check for market_statistics table
    console.log('\n6. Checking market_statistics table...');
    const { data: marketStatsData, error: marketStatsError } = await supabase
      .from('market_statistics')
      .select('market_key, property_count, updated_at')
      .limit(10);

    if (marketStatsError) {
      console.log('   ❌ market_statistics table error:', marketStatsError.message);
    } else {
      console.log(`   ✅ market_statistics table exists with ${marketStatsData?.length || 0} markets`);
      if (marketStatsData && marketStatsData.length > 0) {
        console.log('   Available market statistics:');
        marketStatsData.forEach((stat, i) => {
          console.log(`     ${i + 1}. ${stat.market_key}: ${stat.property_count} properties (updated ${stat.updated_at})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n✅ Market configuration debug complete!');
}

// Run the debug function
debugMarketConfig().catch(console.error);