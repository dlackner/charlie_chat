#!/usr/bin/env python3
"""
Monthly Rental Data Processing Script
Processes Zillow MSA rental data and generates SQL for Supabase upload
"""

import pandas as pd
import numpy as np
from datetime import datetime
import sys

def determine_market_tier(size_rank):
    """Determine market tier based on size rank"""
    if pd.isna(size_rank) or size_rank == 0:
        return None
    elif 1 <= size_rank <= 50:
        return 1
    elif 51 <= size_rank <= 100:
        return 2
    else:
        return 3

def calculate_yoy_change(current_value, last_year_value):
    """Calculate year-over-year percentage change"""
    if pd.isna(current_value) or pd.isna(last_year_value) or last_year_value == 0:
        return None, None
    
    yoy_decimal = (current_value - last_year_value) / last_year_value
    yoy_percentage = f"{yoy_decimal * 100:.2f}%"
    
    return yoy_percentage, round(yoy_decimal * 100, 2)

def get_latest_available_value(row, target_date, max_lookback_months=6):
    """
    Get the latest available rental value, looking back up to max_lookback_months
    if the target month is missing
    """
    # Try the target date first
    if target_date in row.index and not pd.isna(row[target_date]):
        return row[target_date], target_date
    
    # Generate list of dates to check (going backwards from target)
    date_columns = [col for col in row.index if col.count('-') == 2]  # Date format YYYY-MM-DD
    date_columns.sort(reverse=True)  # Most recent first
    
    # Find target date position
    try:
        target_idx = date_columns.index(target_date)
    except ValueError:
        # Target date not in columns, start from the most recent
        target_idx = 0
    
    # Look for data within the lookback period (6 months back from target)
    for i in range(target_idx, min(target_idx + max_lookback_months, len(date_columns))):
        date_col = date_columns[i]
        if not pd.isna(row[date_col]):
            return row[date_col], date_col
    
    return None, None

def find_yoy_comparison_column(row, actual_current_date):
    """
    Find the year-ago column by counting back 12 months from actual current date used
    """
    try:
        # Get all date columns and sort them
        date_columns = [col for col in row.index if col.count('-') == 2]  # Date format YYYY-MM-DD
        date_columns.sort()
        
        # Find the index of the actual current date used
        try:
            current_idx = date_columns.index(actual_current_date)
        except ValueError:
            # If exact date not found, find the closest earlier date
            current_idx = 0
            for i, date_col in enumerate(date_columns):
                if date_col <= actual_current_date:
                    current_idx = i
                else:
                    break
        
        # Go back 12 months (approximately 12 positions in monthly data)
        yoy_idx = current_idx - 12
        if yoy_idx >= 0 and yoy_idx < len(date_columns):
            return date_columns[yoy_idx]
        
        return None
    except:
        return None

def process_rental_data(csv_file_path, target_month="2025-08-31"):
    """Process rental data and generate SQL"""
    
    print(f"Processing rental data for target month: {target_month}")
    
    # Read CSV
    print("Reading CSV file...")
    df = pd.read_csv(csv_file_path)
    
    # Filter out non-MSA rows (keep only metropolitan areas)
    df = df[df['RegionType'] == 'msa'].copy()
    
    print(f"Found {len(df)} MSA records")
    
    print(f"YOY will be calculated dynamically based on actual date used for each MSA")
    
    # Process each MSA
    results = []
    
    for idx, row in df.iterrows():
        region_id = row['RegionID']
        size_rank = row['SizeRank']
        region_name = row['RegionName']
        
        # Skip if no size rank
        if pd.isna(size_rank) or size_rank == 0:
            continue
            
        # Get current month rental value (with fallback)
        current_value, actual_current_date = get_latest_available_value(row, target_month)
        
        # Find the YOY comparison column (12 months back from actual current date)
        yoy_comparison_column = find_yoy_comparison_column(row, actual_current_date) if actual_current_date else None
        
        # Get last year's value (with fallback if needed)
        last_year_value, actual_last_year_date = get_latest_available_value(row, yoy_comparison_column) if yoy_comparison_column else (None, None)
        
        # Skip if no current data found
        if current_value is None:
            print(f"No recent data found for {region_name} (ID: {region_id})")
            continue
        
        # Calculate YOY change
        yoy_text, yoy_numeric = calculate_yoy_change(current_value, last_year_value)
        
        # Determine market tier
        market_tier = determine_market_tier(size_rank)
        
        # Default radius for new MSAs (will be preserved if exists in DB via COALESCE)
        default_radius = 10.0
        if market_tier == 1:
            default_radius = 50.0
        elif market_tier == 2:
            default_radius = 35.0
        elif market_tier == 3:
            default_radius = 10.0
        
        result = {
            'region_id': int(region_id),
            'size_rank': int(size_rank),
            'city_state': region_name,
            'monthly_rental_average': int(round(current_value)),
            'radius': default_radius,
            'year_over_year_growth': yoy_text if yoy_text else 'N/A',
            'yoy_growth_numeric': yoy_numeric,
            'market_tier': market_tier,
            'data_date_used': actual_current_date,
            'yoy_comparison_date': actual_last_year_date
        }
        
        results.append(result)
    
    print(f"Processed {len(results)} MSAs with valid data")
    
    # Generate SQL
    sql_lines = [
        "-- Auto-generated UPSERT for market rental data",
        f"-- Processed on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"-- Target month: {target_month}",
        f"-- Total MSAs: {len(results)}",
        "",
        "INSERT INTO public.market_rental_data",
        "  (region_id, size_rank, city_state, latitude, longitude, monthly_rental_average, radius, year_over_year_growth, yoy_growth_numeric, market_tier, updated_at)",
        "VALUES"
    ]
    
    # Add value rows
    value_rows = []
    for result in results:
        yoy_numeric_sql = result['yoy_growth_numeric'] if result['yoy_growth_numeric'] is not None else 'NULL'
        
        value_row = (
            f"  ({result['region_id']}, {result['size_rank']}, '{result['city_state']}', "
            f"NULL, NULL, {result['monthly_rental_average']}, {result['radius']}, "
            f"'{result['year_over_year_growth']}', {yoy_numeric_sql}, {result['market_tier']}, now())"
        )
        value_rows.append(value_row)
    
    sql_lines.extend([",\n".join(value_rows)])
    
    # Add conflict resolution
    sql_lines.extend([
        "ON CONFLICT (region_id) DO UPDATE",
        "SET",
        "  size_rank               = EXCLUDED.size_rank,",
        "  city_state              = EXCLUDED.city_state,",
        "  monthly_rental_average  = EXCLUDED.monthly_rental_average,",
        "  year_over_year_growth   = EXCLUDED.year_over_year_growth,",
        "  yoy_growth_numeric      = EXCLUDED.yoy_growth_numeric,",
        "  market_tier             = EXCLUDED.market_tier,",
        "  radius                  = COALESCE(public.market_rental_data.radius, EXCLUDED.radius),",
        "  latitude                = COALESCE(public.market_rental_data.latitude, EXCLUDED.latitude),",
        "  longitude               = COALESCE(public.market_rental_data.longitude, EXCLUDED.longitude),",
        "  updated_at              = now();"
    ])
    
    return results, "\n".join(sql_lines)

def generate_summary_report(results):
    """Generate a summary report of the processing"""
    
    # Market tier breakdown
    tier_counts = {}
    for result in results:
        tier = result['market_tier']
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    
    # YOY statistics
    yoy_values = [r['yoy_growth_numeric'] for r in results if r['yoy_growth_numeric'] is not None]
    
    report = [
        "=== PROCESSING SUMMARY ===",
        f"Total MSAs processed: {len(results)}",
        "",
        "Market Tier Breakdown:",
        f"  Tier 1 (Primary): {tier_counts.get(1, 0)} markets",
        f"  Tier 2 (Secondary): {tier_counts.get(2, 0)} markets", 
        f"  Tier 3 (Tertiary): {tier_counts.get(3, 0)} markets",
        "",
        "YOY Growth Statistics:",
        f"  MSAs with YOY data: {len(yoy_values)}",
        f"  MSAs missing YOY: {len(results) - len(yoy_values)}",
    ]
    
    if yoy_values:
        report.extend([
            f"  Average YOY growth: {np.mean(yoy_values):.2f}%",
            f"  Median YOY growth: {np.median(yoy_values):.2f}%",
            f"  Min YOY growth: {min(yoy_values):.2f}%",
            f"  Max YOY growth: {max(yoy_values):.2f}%",
        ])
    
    # Top 10 fastest growing
    top_growth = sorted([r for r in results if r['yoy_growth_numeric'] is not None], 
                       key=lambda x: x['yoy_growth_numeric'], reverse=True)[:10]
    
    if top_growth:
        report.extend([
            "",
            "Top 10 Fastest Growing Markets:",
        ])
        for i, market in enumerate(top_growth, 1):
            report.append(f"  {i:2d}. {market['city_state']}: {market['yoy_growth_numeric']:.2f}%")
    
    return "\n".join(report)

if __name__ == "__main__":
    # Configuration
    csv_file = "/home/dan/Downloads/Metro_zori_uc_mfr_sm_month (2).csv"
    target_month = "2025-08-31"  # Latest month in the data
    
    try:
        # Process the data
        results, sql = process_rental_data(csv_file, target_month)
        
        # Generate summary report
        summary = generate_summary_report(results)
        
        # Save SQL to file
        sql_filename = f"rental_data_upsert_{target_month.replace('-', '_')}.sql"
        with open(sql_filename, 'w') as f:
            f.write(sql)
        
        # Save summary to file
        summary_filename = f"rental_data_summary_{target_month.replace('-', '_')}.txt"
        with open(summary_filename, 'w') as f:
            f.write(summary)
        
        # Print summary to console
        print("\n" + summary)
        print(f"\nSQL file saved as: {sql_filename}")
        print(f"Summary saved as: {summary_filename}")
        
    except Exception as e:
        print(f"Error processing data: {e}")
        sys.exit(1)