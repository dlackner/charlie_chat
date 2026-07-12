-- Create market_rental_data table for rental data storage
-- Execute this first in Supabase before running the data import

create table public.market_rental_data (
  id uuid not null default gen_random_uuid (),
  region_id integer not null,
  size_rank integer not null,
  city_state text not null,
  latitude numeric(10, 7) null,
  longitude numeric(10, 7) null,
  monthly_rental_average integer not null,
  radius numeric(8, 2) not null,
  year_over_year_growth text not null,
  yoy_growth_numeric numeric(5, 2) null,
  market_tier integer null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint market_rental_data_pkey primary key (id),
  constraint market_rental_data_region_id_key unique (region_id)
) TABLESPACE pg_default;

create index IF not exists idx_rental_coordinates on public.market_rental_data using btree (latitude, longitude) TABLESPACE pg_default;

create index IF not exists idx_rental_size_rank on public.market_rental_data using btree (size_rank) TABLESPACE pg_default;

create index IF not exists idx_rental_city_state on public.market_rental_data using btree (city_state) TABLESPACE pg_default;

create index IF not exists idx_rental_region_id on public.market_rental_data using btree (region_id) TABLESPACE pg_default;

create index IF not exists idx_rental_market_tier on public.market_rental_data using btree (market_tier) TABLESPACE pg_default;