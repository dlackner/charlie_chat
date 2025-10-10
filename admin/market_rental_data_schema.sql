-- Market Rental Data Table Schema
-- This table stores monthly MSA rental data from Zillow with coordinates and market analysis

CREATE TABLE IF NOT EXISTS public.market_rental_data (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  region_id INTEGER NOT NULL,
  size_rank INTEGER NOT NULL,
  city_state TEXT NOT NULL,
  latitude NUMERIC(10, 7) NULL,
  longitude NUMERIC(10, 7) NULL,
  monthly_rental_average INTEGER NOT NULL,
  radius NUMERIC(8, 2) NOT NULL,
  year_over_year_growth TEXT NOT NULL,
  yoy_growth_numeric NUMERIC(5, 2) NULL,
  market_tier INTEGER NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  
  CONSTRAINT market_rental_data_pkey PRIMARY KEY (id),
  CONSTRAINT market_rental_data_region_id_key UNIQUE (region_id)
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rental_coordinates 
  ON public.market_rental_data USING btree (latitude, longitude) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_size_rank 
  ON public.market_rental_data USING btree (size_rank) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_city_state 
  ON public.market_rental_data USING btree (city_state) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_region_id 
  ON public.market_rental_data USING btree (region_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_market_tier 
  ON public.market_rental_data USING btree (market_tier) 
  TABLESPACE pg_default;

-- Comments for documentation
COMMENT ON TABLE public.market_rental_data IS 'Monthly MSA rental data from Zillow with market analysis and coordinates';
COMMENT ON COLUMN public.market_rental_data.region_id IS 'Zillow Region ID (unique identifier)';
COMMENT ON COLUMN public.market_rental_data.size_rank IS 'Market size ranking (1=largest, 576=smallest)';
COMMENT ON COLUMN public.market_rental_data.city_state IS 'MSA name in "City, State" format';
COMMENT ON COLUMN public.market_rental_data.latitude IS 'Latitude coordinate (7 decimal places)';
COMMENT ON COLUMN public.market_rental_data.longitude IS 'Longitude coordinate (7 decimal places)';
COMMENT ON COLUMN public.market_rental_data.monthly_rental_average IS 'Average monthly rent for the MSA';
COMMENT ON COLUMN public.market_rental_data.radius IS 'Search radius in miles for the market';
COMMENT ON COLUMN public.market_rental_data.year_over_year_growth IS 'YOY growth as formatted text (e.g., "5.03%")';
COMMENT ON COLUMN public.market_rental_data.yoy_growth_numeric IS 'YOY growth as numeric value for calculations';
COMMENT ON COLUMN public.market_rental_data.market_tier IS 'Market tier: 1=Primary (1-50), 2=Secondary (51-100), 3=Tertiary (101+)';

-- Business Rules:
-- 1. Market Tiers: Tier 1 (ranks 1-50), Tier 2 (ranks 51-100), Tier 3 (ranks 101+)
-- 2. Default Radius: Tier 1 = 50.0 miles, Tier 2 = 35.0 miles, Tier 3 = 10.0 miles
-- 3. YOY Calculation: Based on 12 months back from actual data date used
-- 4. Missing Data Handling: 6-month lookback for current data, preserves existing coordinates
-- 5. Monthly Updates: Use UPSERT with COALESCE to preserve existing lat/long and radius data