const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xdzaajnsjqnrkcjhexed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkemFham5zanFucmtjamhleGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjQzMjQzNCwiZXhwIjoyMDQyMDA4NDM0fQ.VWwYyiERgLXqKenxEuSmTkPv9pkMSKCqWaFVhP9Yutw'
);

const userId = '19fa747a-e254-4545-a74d-ebfb6c418bb8';

async function checkUserMarkets() {
  console.log('🔍 Checking user markets for:', userId);
  
  // Get user markets
  const { data: markets, error } = await supabase
    .from('user_markets')
    .select('*')
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error fetching markets:', error);
    return;
  }
  
  console.log('\n📊 User Markets:');
  console.log(`Found ${markets.length} markets\n`);
  
  markets.forEach((market, index) => {
    console.log(`=== Market ${index + 1}: ${market.market_name || market.market_key} ===`);
    console.log(`Market Key: ${market.market_key}`);
    console.log(`Market Type: ${market.market_type}`);
    console.log(`City: ${market.city || 'N/A'}`);
    console.log(`State: ${market.state || 'N/A'}`);
    console.log(`ZIP: ${market.zip || 'N/A'}`);
    
    // Check criteria
    console.log('\n🎯 CRITERIA:');
    console.log(`Units: ${market.units_min || 'N/A'} - ${market.units_max || 'N/A'}`);
    console.log(`Assessed Value: ${market.assessed_value_min || 'N/A'} - ${market.assessed_value_max || 'N/A'}`);
    console.log(`Estimated Value: ${market.estimated_value_min || 'N/A'} - ${market.estimated_value_max || 'N/A'}`);
    console.log(`Year Built: ${market.year_built_min || 'N/A'} - ${market.year_built_max || 'N/A'}`);
    
    // Check if any criteria is set
    const hasCriteria = (
      market.units_min > 0 || market.units_max > 0 ||
      market.assessed_value_min > 0 || market.assessed_value_max > 0 ||
      market.estimated_value_min > 0 || market.estimated_value_max > 0 ||
      market.year_built_min > 0 || market.year_built_max > 0
    );
    
    console.log(`❗ Has Criteria: ${hasCriteria ? 'YES' : 'NO'}`);
    
    // Check properties
    const propertyCount = market.property_ids ? market.property_ids.length : 0;
    console.log(`\n🏘️ PROPERTIES:`);
    console.log(`Property IDs Count: ${propertyCount}`);
    console.log(`Has Properties: ${propertyCount > 0 ? 'YES' : 'NO'}`);
    
    if (propertyCount > 0) {
      console.log(`First few property IDs: ${market.property_ids.slice(0, 3).join(', ')}...`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  });
  
  // Summary
  const marketsWithoutCriteria = markets.filter(m => 
    !(m.units_min > 0 || m.units_max > 0 ||
      m.assessed_value_min > 0 || m.assessed_value_max > 0 ||
      m.estimated_value_min > 0 || m.estimated_value_max > 0 ||
      m.year_built_min > 0 || m.year_built_max > 0)
  );
  
  const marketsWithoutProperties = markets.filter(m => !m.property_ids || m.property_ids.length === 0);
  
  console.log('🚨 SUMMARY:');
  console.log(`Total markets: ${markets.length}`);
  console.log(`Markets without criteria: ${marketsWithoutCriteria.length}`);
  console.log(`Markets without properties: ${marketsWithoutProperties.length}`);
  
  if (marketsWithoutCriteria.length > 0) {
    console.log('\n❌ Markets missing criteria:');
    marketsWithoutCriteria.forEach(m => 
      console.log(`  - ${m.market_name || m.market_key} (${m.market_type})`));
  }
  
  if (marketsWithoutProperties.length > 0) {
    console.log('\n❌ Markets missing properties:');
    marketsWithoutProperties.forEach(m => 
      console.log(`  - ${m.market_name || m.market_key} (${m.market_type})`));
  }
  
  // Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('weekly_recommendations_enabled')
    .eq('user_id', userId)
    .single();
    
  console.log('\n👤 USER PROFILE:');
  console.log(`Weekly recommendations enabled: ${profile?.weekly_recommendations_enabled || 'NO'}`);
}

checkUserMarkets().catch(console.error);