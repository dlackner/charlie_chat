# Monthly Rental Data Processing

This directory contains the automated monthly rental data processing system for MultifamilyOS.

## Files

- `monthly_rental_data_processor.py` - Main processing script
- `market_rental_data_schema.sql` - Database table schema
- `monthly_rental_process_README.md` - This documentation

## Monthly Process

### 1. Prepare CSV File
Each month, you'll receive a Zillow MSA rental data CSV file with the following format:
```
RegionID,SizeRank,City/State,Lat,Long,Monthly Average,Radius,YOY
394913,1,"New York, NY",40.7128,-74.006,3232,25.0,4.28%
...
```

### 2. Run Processing Script
```bash
cd /home/dan/Work/mfos/admin
python3 monthly_rental_data_processor.py path/to/csv_file.csv
```

The script will:
- Process the CSV data
- Add market tier assignments
- Generate SQL for database import
- Place output CSV in `/public/Monthly Rental Rates.csv` (if enabled)

### 3. Review Generated Files
The script automatically generates:
- `rental_data_upsert_YYYY_MM_DD.sql` - SQL file for database import
- `rental_data_summary_YYYY_MM_DD.txt` - Processing summary and statistics

### 4. Import to Database
Execute the SQL file in your Supabase database to update the `market_rental_data` table.

**Note:** The map component now reads directly from the database via `/api/rental-data`, so once the SQL is executed, the map displays current data automatically.

## Features

### ✅ Data Processing
- **Parses rental CSV data** with RegionID, City/State, rental values
- **Market tier assignment** (1=Primary, 51-100=Secondary, 101+=Tertiary)
- **Coordinate lookup** for 720+ MSAs
- **YOY parsing** from CSV year_over_year_growth column

### ✅ Data Quality
- **Preserves existing coordinates** via COALESCE in UPSERT
- **Validates coordinates** - reports missing coordinates
- **SQL conflict handling** - updates or inserts based on region_id
- **Reports processing statistics** - tier breakdown, coordinate coverage

### ✅ Business Rules
- **Market Tiers**: 1-50=Tier 1, 51-100=Tier 2, 101+=Tier 3
- **Default Radius**: Varies by market (typically 7.5-25 miles)
- **YOY Storage**: Stored as text (e.g., '4.28%') and numeric value

## Database Schema

```sql
market_rental_data (
  id UUID PRIMARY KEY,
  region_id INTEGER UNIQUE,
  size_rank INTEGER,
  city_state TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  monthly_rental_average INTEGER,
  radius NUMERIC(8,2),
  year_over_year_growth TEXT,
  yoy_growth_numeric NUMERIC(5,2),
  market_tier INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Expected Output

### Summary Report
```
=== MONTHLY RENTAL DATA PROCESSING SUMMARY ===
Processing Date: 2026-03-15 11:00:44
Target Month: 2026-01-31
Total MSAs processed: 720

📊 MARKET TIER BREAKDOWN:
  Tier 1 (Primary): 50 markets
  Tier 2 (Secondary): 50 markets
  Tier 3 (Tertiary): 620 markets

📈 YOY GROWTH STATISTICS:
  MSAs with YOY data: 720
  MSAs missing YOY: 0
  Average YOY growth: 2.14%

🗺️ COORDINATE COVERAGE:
  Cities with coordinates: 720 (100%)
  Cities missing coordinates: 0
```

### SQL File Structure
```sql
-- Auto-generated UPSERT for market rental data
-- Processed on 2026-03-15 11:00:44
-- Total MSAs: 720
-- Cities with coordinates: 720

INSERT INTO public.market_rental_data
  (region_id, size_rank, city_state, latitude, longitude, monthly_rental_average, radius, year_over_year_growth, yoy_growth_numeric, market_tier, updated_at)
VALUES
  (394913, 1, 'New York, NY', 40.7128, -74.006, 3232, 25.0, '4.28%', 4.28, 1, now()),
  (753899, 2, 'Los Angeles, CA', 34.0522, -118.2437, 2885, 25.0, '1.64%', 1.64, 1, now()),
  [...]
ON CONFLICT (region_id) DO UPDATE
SET
  size_rank = EXCLUDED.size_rank,
  city_state = EXCLUDED.city_state,
  monthly_rental_average = EXCLUDED.monthly_rental_average,
  year_over_year_growth = EXCLUDED.year_over_year_growth,
  yoy_growth_numeric = EXCLUDED.yoy_growth_numeric,
  market_tier = EXCLUDED.market_tier,
  updated_at = now();
```

## Workflow

### Complete Monthly Update Process
1. **Receive CSV** - Get monthly rental data from Zillow
2. **Process CSV** - Run `python3 monthly_rental_data_processor.py filename.csv`
3. **Review Output** - Check summary report for coordinate coverage and statistics
4. **Execute SQL** - Run the generated `rental_data_upsert_YYYY_MM_DD.sql` in Supabase
5. **Verify in App** - Map automatically shows updated data from `/api/rental-data`

### How the App Uses This Data
- **Map Component** (`/discover` page) fetches from `/api/rental-data`
- **API Endpoint** queries `market_rental_data` table directly
- **Data displays** as rental circles with color-coded rent levels
- **Popup shows** city name, average rent, market rank, and YOY growth

## Troubleshooting

### Missing Coordinates
If new cities appear without coordinates:
1. Note region IDs from the summary report
2. Look up coordinates manually
3. Add to `get_coordinate_lookup()` function in the Python script
4. Re-run the processing script

### Data Quality Issues
- Verify CSV column format: `RegionID,SizeRank,City/State,Lat,Long,Monthly Average,Radius,YOY`
- Check that rental values are numeric (not text)
- Ensure YOY column contains percentages (e.g., '4.28%') or blank

### Map Not Updating
- Verify SQL was executed in Supabase (`market_rental_data` table)
- Check `/api/rental-data` endpoint in browser Network tab
- Hard refresh browser (Ctrl+Shift+R) to clear caches

## Support

For issues or questions about the rental data processing system, check:
1. Script output and error messages
2. CSV file format and data quality
3. Database connection and permissions
4. Coordinate lookup coverage