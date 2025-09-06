// scripts/load-rental-data.js
// Script to load Monthly Rental Rates.csv into market_rental_data table

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

function parseCSVLine(line) {
  // Handle CSV parsing - city names with commas cause field shifts
  const fields = line.split(',');
  
  // Get data from known positions relative to end of line
  const regionId = parseInt(fields[0]);
  const sizeRank = parseInt(fields[1]);
  
  // City/State might contain commas, so rejoin middle fields
  const cityState = fields.length > 8 ? 
    fields.slice(2, -5).join(',').replace(/"/g, '') : 
    fields[2].replace(/"/g, '');
  
  // Fixed positions from end
  const latitude = parseFloat(fields[fields.length - 5]);
  const longitude = parseFloat(fields[fields.length - 4]);
  const monthlyAverage = parseInt(fields[fields.length - 3]);
  const radius = parseFloat(fields[fields.length - 2]);
  const yoyGrowth = fields[fields.length - 1].trim();
  
  return {
    regionId,
    sizeRank,
    cityState,
    latitude,
    longitude,
    monthlyAverage,
    radius,
    yoyGrowth
  };
}

function convertYoyToNumeric(yoyString) {
  // Convert "8.2%" to 8.2
  if (!yoyString) return null;
  const match = yoyString.match(/^(-?\d+\.?\d*)%?$/);
  return match ? parseFloat(match[1]) : null;
}

function calculateMarketTier(sizeRank) {
  if (sizeRank <= 25) return 1;
  if (sizeRank <= 100) return 2;
  if (sizeRank <= 300) return 3;
  return 4;
}

async function loadRentalData() {
  try {
    console.log('🚀 Starting rental data load...');
    
    // Read CSV file
    const csvPath = './public/Monthly Rental Rates.csv';
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header
    
    console.log(`📄 Found ${lines.length} lines in CSV`);
    
    // Use UPSERT instead of DELETE/INSERT to preserve foreign key relationships
    console.log('🔄 Using UPSERT to update rental data (preserves foreign key relationships)...');
    
    // Process lines in batches
    const batchSize = 100;
    let processed = 0;
    let successful = 0;
    
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize)
        .filter(line => line.trim()) // Only skip empty lines, keep US aggregate
        .map(line => {
          try {
            const parsed = parseCSVLine(line);
            
            // Validate required fields - allow US aggregate (region_id 0, size_rank 0)
            if (isNaN(parsed.regionId) || isNaN(parsed.sizeRank) || !parsed.cityState) {
              console.warn(`⚠️ Skipping invalid line (missing required fields): ${line.substring(0, 100)}...`);
              return null;
            }
            
            // Allow US aggregate (region_id 102001, size_rank 0) to have null coordinates
            // Skip other rows with missing coordinates
            if (parsed.cityState !== 'United States' && (isNaN(parsed.latitude) || isNaN(parsed.longitude))) {
              console.warn(`⚠️ Skipping line with missing coordinates: ${parsed.cityState}`);
              return null;
            }
            
            return {
              region_id: parsed.regionId,
              size_rank: parsed.sizeRank,
              city_state: parsed.cityState,
              latitude: isNaN(parsed.latitude) ? null : parsed.latitude,
              longitude: isNaN(parsed.longitude) ? null : parsed.longitude,
              monthly_rental_average: parsed.monthlyAverage || 0,
              radius: parsed.radius || 0,
              year_over_year_growth: parsed.yoyGrowth,
              yoy_growth_numeric: convertYoyToNumeric(parsed.yoyGrowth),
              market_tier: calculateMarketTier(parsed.sizeRank)
            };
          } catch (error) {
            console.warn(`⚠️ Error parsing line: ${line.substring(0, 50)}... - ${error.message}`);
            return null;
          }
        })
        .filter(record => record !== null); // Remove null records
      
      if (batch.length === 0) {
        continue;
      }
      
      // Upsert batch (update existing, insert new)
      const { data, error } = await supabase
        .from('market_rental_data')
        .upsert(batch, { onConflict: 'region_id' });
      
      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
        console.error('Sample record from failed batch:', batch[0]);
      } else {
        successful += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} records`);
      }
      
      processed += batch.length;
    }
    
    console.log(`\n🎉 Load complete!`);
    console.log(`📊 Processed: ${processed} records`);
    console.log(`✅ Successful: ${successful} records`);
    
    // Verify data
    const { count, error: countError } = await supabase
      .from('market_rental_data')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`📋 Total records in database: ${count || 'unknown'}`);
    }
    
    // Show sample data
    const { data: sampleData } = await supabase
      .from('market_rental_data')
      .select('*')
      .order('size_rank')
      .limit(3);
    
    if (sampleData && sampleData.length > 0) {
      console.log('\n📍 Sample records:');
      sampleData.forEach(record => {
        console.log(`  ${record.city_state} - Rank ${record.size_rank}, Tier ${record.market_tier}, Rent $${record.monthly_rental_average}, Growth ${record.year_over_year_growth}`);
      });
    }
    
  } catch (error) {
    console.error('🔥 Fatal error loading rental data:', error);
  }
}

// Run the load
loadRentalData();