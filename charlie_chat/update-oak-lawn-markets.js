// update-oak-lawn-markets.js
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPropertyCount(marketCriteria) {
  const searchPayload = {
    size: 8000,
    resultIndex: 0,
    count: true,
    ids_only: true,
    property_type: "MFR",
    obfuscate: false,
    summary: false,
    zip: marketCriteria.zip,
    units_min: marketCriteria.units_min,
    units_max: marketCriteria.units_max,
    assessed_value_min: marketCriteria.assessed_value_min,
    assessed_value_max: marketCriteria.assessed_value_max
  };

  const response = await fetch('http://localhost:3000/api/realestateapi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchPayload)
  });

  const data = await response.json();
  const propertyIds = data.ids || data.data || [];
  const count = propertyIds.length || 0;

  return { count, propertyIds };
}

async function updateOakLawnMarket(userId) {
  try {
    console.log(`Processing user: ${userId}`);
    
    // Get the Oak Lawn market for this user
    const { data: market, error: marketError } = await supabase
      .from('user_markets')
      .select('*')
      .eq('user_id', userId)
      .eq('market_name', 'Oak Lawn')
      .single();

    if (marketError || !market) {
      console.log(`No Oak Lawn market found for user ${userId}`);
      return;
    }

    // Run property count check
    const { count, propertyIds } = await checkPropertyCount({
      zip: '75235,75219',
      units_min: 2,
      units_max: 25,
      assessed_value_min: 1000000,
      assessed_value_max: 10000000
    });

    console.log(`Found ${count} properties for ${userId}`);

    // Update the market with property data
    const { error: updateError } = await supabase
      .from('user_markets')
      .update({
        property_ids: propertyIds,
        property_count: count,
        updated_at: new Date().toISOString()
      })
      .eq('id', market.id);

    if (updateError) {
      console.error(`Error updating market for ${userId}:`, updateError);
    } else {
      console.log(`✅ Updated Oak Lawn market for ${userId} with ${count} properties`);
    }

    // Also ensure weekly recommendations are enabled for this user
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        weekly_recommendations_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error(`Error enabling weekly recommendations for ${userId}:`, profileError);
    } else {
      console.log(`✅ Enabled weekly recommendations for ${userId}`);
    }

  } catch (error) {
    console.error(`Error processing ${userId}:`, error);
  }
}

async function main() {
  // Get all charlie_chat users
  const { data: users, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_class', 'charlie_chat');

  if (error) {
    console.error('Error fetching charlie_chat users:', error);
    return;
  }

  console.log(`Found ${users.length} charlie_chat users to process`);

  for (const user of users) {
    await updateOakLawnMarket(user.user_id);
    // Add small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('✅ Finished processing all charlie_chat users');
}

main().catch(console.error);