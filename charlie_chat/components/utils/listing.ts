// components/utils/listing.ts

import type { Listing } from '../ui/listingTypes';

/**
 * Filters a listing object to include only relevant fields for analysis
 * Removes unnecessary data and organizes fields by category
 */
export const filterRelevantFields = (listing: Listing) => {
  return {
    id: listing.id,
    address: listing.address,

    // Property basics
    property_type: listing.property_type,
    units_count: listing.units_count,
    year_built: listing.year_built,
    square_feet: listing.square_feet,
    lot_square_feet: listing.lot_square_feet,
    stories: listing.stories,

    // Financial data
    estimated_value: listing.estimated_value,
    assessed_value: listing.assessed_value,
    last_sale_amount: listing.last_sale_amount,
    last_sale_date: listing.last_sale_date,
    rent_estimate: listing.rent_estimate,

    // Owner & financing
    mortgage_balance: listing.mortgage_balance,
    estimated_equity: listing.estimated_equity,
    lender_name: listing.lender_name,
    mortgage_maturing_date: listing.mortgage_maturing_date,
    private_lender: listing.private_lender,

    // Owner profile
    owner_first_name: listing.owner_first_name,
    owner_last_name: listing.owner_last_name,
    mail_address: listing.mail_address,
    years_owned: listing.years_owned,
    owner_occupied: listing.owner_occupied,
    corporate_owned: listing.corporate_owned,
    total_properties_owned: listing.total_properties_owned,
    total_portfolio_equity: listing.total_portfolio_equity,

    // Distress indicators
    pre_foreclosure: listing.pre_foreclosure,
    foreclosure: listing.foreclosure,
    reo: listing.reo,
    auction: listing.auction,
    tax_lien: listing.tax_lien,

    // Market indicators
    mls_active: listing.mls_active,
    for_sale: listing.for_sale,
    flood_zone: listing.flood_zone,
    last_sale_arms_length: listing.last_sale_arms_length,
    investor_buyer: listing.investor_buyer,
    assumable: listing.assumable
  };
};