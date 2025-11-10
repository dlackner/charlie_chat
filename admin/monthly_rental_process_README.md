# Monthly Rental Data Processing

This directory contains the automated monthly rental data processing system for MultifamilyOS.

## Files

- `monthly_rental_data_processor.py` - Main processing script
- `market_rental_data_schema.sql` - Database table schema
- `monthly_rental_process_README.md` - This documentation

## Monthly Process

### 1. Receive CSV File - put file in public folder and give Claude the filename.  It will take it from there
Each month, you'll receive a Zillow MSA rental data CSV file with format:
- Columns: RegionID, SizeRank, RegionName, RegionType, StateName, 2015-01-31, 2015-02-28, ...
- Latest column contains the current month's data (e.g., 2025-08-31)

### 2. Run Processing Script
```bash
cd /home/dan/Work/mfos/admin
python3 monthly_rental_data_processor.py /path/to/new_csv_file.csv
```

### 3. Review Generated Files
The script automatically generates:
- `rental_data_upsert_YYYY_MM_DD.sql` - SQL file for database import
- `rental_data_summary_YYYY_MM_DD.txt` - Processing summary and statistics

### 4. Import to Database
Execute the SQL file in your Supabase database to update the `market_rental_data` table.

## Features

### ✅ Automated Processing
- **Auto-detects target month** from CSV columns
- **6-month lookback** for missing current data
- **YOY calculations** based on actual dates used (12 months back)
- **Market tier assignment** (1=Primary, 2=Secondary, 3=Tertiary)
- **Coordinate lookup** for 500+ cities

### ✅ Data Quality
- **Preserves existing coordinates** via COALESCE in UPSERT
- **Handles missing data** gracefully with fallback logic
- **Validates data types** and filters MSA-only records
- **Reports missing coordinates** for manual lookup

### ✅ Business Rules
- **Market Tiers**: 1-50=Tier 1, 51-100=Tier 2, 101+=Tier 3
- **Default Radius**: T1=50mi, T2=35mi, T3=10mi
- **YOY Calculation**: Dynamic based on actual data dates
- **Missing Data**: 6-month lookback, preserves existing data

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
Processing Date: 2025-10-01 15:49:43
Target Month: 2025-08-31
Total MSAs processed: 576

📊 MARKET TIER BREAKDOWN:
  Tier 1 (Primary): 49 markets
  Tier 2 (Secondary): 50 markets
  Tier 3 (Tertiary): 477 markets

📈 YOY GROWTH STATISTICS:
  MSAs with YOY data: 421
  MSAs missing YOY: 155
  Average YOY growth: 3.36%

🚀 TOP 10 FASTEST GROWING MARKETS:
   1. Abilene, TX: 19.92%
   2. Mankato, MN: 14.00%
   [...]

🗺️ COORDINATE COVERAGE:
  Cities with coordinates: 538 (93.4%)
  Cities missing coordinates: 38
```

### SQL File Structure
```sql
-- Auto-generated UPSERT for market rental data
INSERT INTO public.market_rental_data
  (region_id, size_rank, city_state, latitude, longitude, ...)
VALUES
  (394913, 1, 'New York, NY', 40.7128, -74.006, 3555, 50.0, '5.03%', 5.03, 1, now()),
  [...]
ON CONFLICT (region_id) DO UPDATE
SET [updates with COALESCE protection]
```

## Troubleshooting

### Missing Coordinates
If new cities appear without coordinates:
1. Note the region IDs from the summary report
2. Look up coordinates manually
3. Add to the `get_coordinate_lookup()` function
4. Re-run the processing script

### Data Issues
- Check CSV format matches expected structure
- Verify RegionType = 'msa' for proper filtering
- Ensure date columns follow YYYY-MM-DD format

## Maintenance

### Monthly Tasks
1. Run processing script with new CSV
2. Review summary for data quality
3. Execute SQL in Supabase
4. Verify import success

### Periodic Tasks
- Update coordinate lookup for new cities
- Monitor YOY calculation accuracy
- Review market tier assignments

## Support

For issues or questions about the rental data processing system, check:
1. Script output and error messages
2. CSV file format and data quality
3. Database connection and permissions
4. Coordinate lookup coverage