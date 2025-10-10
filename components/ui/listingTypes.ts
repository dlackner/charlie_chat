// components/ui/listingTypes.ts
// Centralized Listing type definitions using snake_case to match API structure
// Following the pattern established in app/my-properties/types.ts

/* ================================================================
   CORE LISTING INTERFACE - Main property data structure
   ================================================================ */

export interface Listing {
  id: string;
  
  // Address Information
  address: {
    street?: string;
    address: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  address_full?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  
  mail_address?: {
    address?: string;
    city?: string;
    county?: string;
    state?: string;
    street?: string;
    zip?: string;
  };
  mail_address_full?: string;
  mail_address_street?: string;
  mail_address_city?: string;
  mail_address_state?: string;
  mail_address_zip?: string;
  mail_address_county?: string;
  
  // Property Characteristics
  property_type?: string;
  units_count?: number;
  stories?: number;
  square_feet?: number;
  lot_square_feet?: number;
  year_built?: number;
  
  // Financial Information
  assessed_value?: number;
  assessed_land_value?: number;
  estimated_value?: number;
  estimated_equity?: number;
  rent_estimate?: number;
  listing_price?: number;
  
  // Mortgage Information
  mortgage_balance?: number;
  mortgage_maturing_date?: string;
  lender_name?: string;
  
  // Sale History
  last_sale_date?: string;
  last_sale_amount?: number;
  last_sale_arms_length?: boolean;
  
  // Ownership Information
  years_owned?: number;
  owner_occupied?: boolean;
  in_state_absentee_owner?: boolean;
  out_of_state_absentee_owner?: boolean;
  corporate_owned?: boolean;
  investor_buyer?: boolean;
  owner_first_name?: string;
  owner_last_name?: string;
  
  // Portfolio Information
  total_portfolio_equity?: number;
  total_portfolio_mortgage_balance?: number;
  total_properties_owned?: number;
  
  // Property Flags
  mls_active?: boolean;
  mls_days_on_market?: number;
  for_sale?: boolean;
  assumable?: boolean;
  auction?: boolean;
  reo?: boolean;
  foreclosure?: boolean;
  pre_foreclosure?: boolean;
  private_lender?: boolean;
  free_clear?: boolean;
  
  // Location Information
  flood_zone?: boolean;
  flood_zone_description?: string;
  latitude?: number;
  longitude?: number;
}

/* ================================================================
   LEGACY CAMELCASE MAPPING - For transition period
   ================================================================ */

// Map camelCase to snake_case for backward compatibility during migration
export const CAMEL_TO_SNAKE_MAPPING = {
  // Property characteristics
  unitsCount: 'units_count',
  squareFeet: 'square_feet',
  lotSquareFeet: 'lot_square_feet',
  yearBuilt: 'year_built',
  
  // Financial
  assessedValue: 'assessed_value',
  assessedLandValue: 'assessed_land_value',
  estimatedValue: 'estimated_value',
  estimatedEquity: 'estimated_equity',
  rentEstimate: 'rent_estimate',
  listingPrice: 'listing_price',
  
  // Mortgage
  mortgageBalance: 'mortgage_balance',
  mortgageMaturingDate: 'mortgage_maturing_date',
  lenderName: 'lender_name',
  
  // Sale history
  lastSaleDate: 'last_sale_date',
  lastSaleAmount: 'last_sale_amount',
  lastSaleArmsLength: 'last_sale_arms_length',
  
  // Ownership
  yearsOwned: 'years_owned',
  ownerOccupied: 'owner_occupied',
  inStateAbsenteeOwner: 'in_state_absentee_owner',
  outOfStateAbsenteeOwner: 'out_of_state_absentee_owner',
  investorBuyer: 'investor_buyer',
  owner1FirstName: 'owner_first_name',
  owner1LastName: 'owner_last_name',
  
  // Portfolio
  totalPortfolioEquity: 'total_portfolio_equity',
  totalPortfolioMortgageBalance: 'total_portfolio_mortgage_balance',
  totalPropertiesOwned: 'total_properties_owned',
  
  // Flags
  mlsActive: 'mls_active',
  forSale: 'for_sale',
  preForeclosure: 'pre_foreclosure',
  privateLender: 'private_lender',
  freeClear: 'free_clear',
  floodZone: 'flood_zone',
  floodZoneDescription: 'flood_zone_description'
} as const;

/* ================================================================
   UTILITY FUNCTIONS - For data transformation
   ================================================================ */

// Convert API response (snake_case) to internal Listing type
export function normalizeApiResponse(apiData: any): Listing {
  return {
    ...apiData,
    // Handle nested address objects if needed
    mail_address: apiData.mailAddress || apiData.mail_address
  };
}

// Convert legacy camelCase property access to snake_case
export function getPropertyValue(listing: Listing, property: string): any {
  const snakeProperty = CAMEL_TO_SNAKE_MAPPING[property as keyof typeof CAMEL_TO_SNAKE_MAPPING] || property;
  return (listing as any)[snakeProperty];
}

/* ================================================================
   SPECIALIZED INTERFACES - For specific component needs
   ================================================================ */

// For components that need coordinates
export interface MappableListing extends Listing {
  latitude: number;
  longitude: number;
}

// For property selection and batch operations
export interface SelectableListing extends Listing {
  selected?: boolean;
}

// For components that need classification data
export interface ClassifiedListing extends Listing {
  classifications?: Array<{
    type: string;
    label: string;
    color: string;
  }>;
}

// Listing interface is already exported above with 'export interface Listing'
// No additional export needed