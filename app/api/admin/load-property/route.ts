import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

interface PropertyData {
  absenteeOwner?: boolean;
  address?: {
    address?: string;
    city?: string;
    county?: string;
    fips?: string;
    state?: string;
    street?: string;
    zip?: string;
  };
  adjustableRate?: boolean;
  airConditioningAvailable?: any;
  apn?: string;
  assessedImprovementValue?: number;
  assessedLandValue?: number;
  assessedValue?: number;
  assumable?: boolean;
  auction?: boolean;
  auctionDate?: any;
  basement?: boolean;
  bathrooms?: any;
  bedrooms?: any;
  cashBuyer?: boolean;
  companyName?: string;
  corporateOwned?: boolean;
  death?: boolean;
  deck?: boolean;
  deckArea?: number;
  equity?: boolean;
  equityPercent?: number;
  estimatedEquity?: number;
  estimatedMortgagePayment?: number;
  estimatedValue?: number;
  firstMortgagePercent?: any;
  floodZone?: boolean;
  floodZoneDescription?: string;
  floodZoneType?: string;
  foreclosure?: boolean;
  forSale?: boolean;
  freeClear?: boolean;
  garage?: boolean;
  highEquity?: boolean;
  hoa?: any;
  id?: string;
  improvementValuePercent?: any;
  inherited?: boolean;
  inStateAbsenteeOwner?: boolean;
  investorBuyer?: boolean;
  judgment?: boolean;
  landUse?: string;
  lastMortgage1Amount?: any;
  lastSaleAmount?: string;
  lastSaleArmsLength?: any;
  lastUpdateDate?: string;
  latitude?: number;
  lenderName?: any;
  listingAmount?: any;
  listingPriceToValuePercent?: any;
  longitude?: number;
  lotSquareFeet?: number;
  mailAddress?: {
    address?: string;
    city?: string;
    state?: string;
    street?: string;
    zip?: string;
  };
  medianIncome?: string;
  MFH2to4?: boolean;
  MFH5plus?: boolean;
  mlsActive?: boolean;
  mlsCancelled?: boolean;
  mlsFailed?: boolean;
  mlsHasPhotos?: boolean;
  mlsListingPrice?: any;
  mlsPending?: boolean;
  mlsSold?: boolean;
  negativeEquity?: boolean;
  openMortgageBalance?: number;
  openMortgagePercent?: any;
  outOfStateAbsenteeOwner?: boolean;
  owner1LastName?: string;
  ownerOccupied?: boolean;
  parcelAccountNumber?: string;
  patio?: boolean;
  patioArea?: number;
  pool?: boolean;
  poolArea?: number;
  portfolioPurchasedLast12Months?: number;
  portfolioPurchasedLast6Months?: number;
  preForeclosure?: boolean;
  pricePerSquareFoot?: number;
  priceReduced?: boolean;
  priorSaleAmount?: any;
  privateLender?: boolean;
  propertyId?: string;
  propertyType?: string;
  propertyUse?: string;
  propertyUseCode?: number;
  rentAmount?: any;
  reo?: boolean;
  roofConstruction?: any;
  roofMaterial?: any;
  roomsCount?: number;
  secondMortgagePercent?: any;
  squareFeet?: number;
  stories?: any;
  taxLien?: any;
  thirdMortgagePercent?: any;
  totalPortfolioEquity?: string;
  totalPortfolioMortgageBalance?: string;
  totalPortfolioValue?: string;
  totalPropertiesOwned?: string;
  unitsCount?: number;
  vacant?: boolean;
  yearBuilt?: any;
  yearsOwned?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, propertyData }: { userId: string; propertyData: PropertyData } = body;

    if (!userId || !propertyData) {
      return NextResponse.json(
        { error: 'User ID and property data are required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid UUID format' },
        { status: 400 }
      );
    }

    // Validate property has required fields
    if (!propertyData.id && !propertyData.propertyId) {
      return NextResponse.json(
        { error: 'Property must have an ID' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const propertyId = propertyData.id || propertyData.propertyId;

    // Check if property already exists
    const { data: existingProperty } = await supabase
      .from('saved_properties')
      .select('property_id')
      .eq('property_id', propertyId)
      .single();

    if (existingProperty) {
      return NextResponse.json(
        { error: `Property ${propertyId} already exists in saved_properties` },
        { status: 409 }
      );
    }

    // Insert into saved_properties
    const { error: propertyError } = await supabase
      .from('saved_properties')
      .insert({
        property_id: propertyId,
        address_street: propertyData.address?.street || null,
        address_full: propertyData.address?.address || null,
        address_city: propertyData.address?.city || null,
        address_state: propertyData.address?.state || null,
        address_zip: propertyData.address?.zip || null,
        latitude: propertyData.latitude || null,
        longitude: propertyData.longitude || null,
        mail_address_full: propertyData.mailAddress?.address || null,
        mail_address_street: propertyData.mailAddress?.street || null,
        mail_address_city: propertyData.mailAddress?.city || null,
        mail_address_state: propertyData.mailAddress?.state || null,
        mail_address_zip: propertyData.mailAddress?.zip || null,
        property_type: propertyData.propertyType || null,
        units_count: propertyData.unitsCount || null,
        year_built: propertyData.yearBuilt || null,
        square_feet: propertyData.squareFeet || null,
        lot_square_feet: propertyData.lotSquareFeet || null,
        flood_zone: propertyData.floodZone || null,
        flood_zone_description: propertyData.floodZoneDescription || null,
        assessed_value: propertyData.assessedValue || null,
        assessed_land_value: propertyData.assessedLandValue || null,
        estimated_value: propertyData.estimatedValue || null,
        estimated_equity: propertyData.estimatedEquity || null,
        last_sale_amount: propertyData.lastSaleAmount ? parseFloat(propertyData.lastSaleAmount) : null,
        mls_active: propertyData.mlsActive || null,
        for_sale: propertyData.forSale || null,
        assumable: propertyData.assumable || null,
        auction: propertyData.auction || null,
        reo: propertyData.reo || null,
        pre_foreclosure: propertyData.preForeclosure || null,
        foreclosure: propertyData.foreclosure || null,
        private_lender: propertyData.privateLender || null,
        owner_last_name: propertyData.owner1LastName || propertyData.companyName || null,
        out_of_state_absentee_owner: propertyData.outOfStateAbsenteeOwner || null,
        in_state_absentee_owner: propertyData.inStateAbsenteeOwner || null,
        owner_occupied: propertyData.ownerOccupied || null,
        corporate_owned: propertyData.corporateOwned || null,
        investor_buyer: propertyData.investorBuyer || null,
        total_portfolio_equity: propertyData.totalPortfolioEquity ? parseFloat(propertyData.totalPortfolioEquity) : null,
        total_portfolio_mortgage_balance: propertyData.totalPortfolioMortgageBalance ? parseFloat(propertyData.totalPortfolioMortgageBalance) : null,
        total_properties_owned: propertyData.totalPropertiesOwned ? parseInt(propertyData.totalPropertiesOwned) : null,
        equity_percent: propertyData.equityPercent || null,
        total_open_mortgage_balance: propertyData.openMortgageBalance || null,
        median_household_income: propertyData.medianIncome ? parseFloat(propertyData.medianIncome) : null,
        county: propertyData.address?.county || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        saved_at: new Date().toISOString()
      });

    if (propertyError) {
      console.error('Error inserting property:', propertyError);
      return NextResponse.json(
        { error: 'Failed to save property to database' },
        { status: 500 }
      );
    }

    // Check if user favorite already exists
    const { data: existingFavorite } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .single();

    if (existingFavorite) {
      return NextResponse.json(
        { error: `Property ${propertyId} is already in user favorites` },
        { status: 409 }
      );
    }

    // Insert into user_favorites
    const { error: favoriteError } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        property_id: propertyId,
        saved_at: new Date().toISOString(),
        is_active: true,
        recommendation_type: 'manual',
        favorite_status: 'Reviewing',
        status: 'active'
      });

    if (favoriteError) {
      console.error('Error inserting favorite:', favoriteError);
      return NextResponse.json(
        { error: 'Failed to add property to user favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Property loaded successfully',
      propertyId: propertyId
    });

  } catch (error) {
    console.error('Error in load-property API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}