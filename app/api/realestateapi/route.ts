//PART OF THE NEW V2 VERSION

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Transform external API camelCase response to snake_case for consistent frontend usage
function transformListingToSnakeCase(listing: any) {
  return {
    // Essential ID field - must be preserved
    id: listing.id,
    
    // Address handling - keep nested structure but add flat access
    address_street: listing.address?.street,
    address_city: listing.address?.city,
    address_state: listing.address?.state,
    address_zip: listing.address?.zip,
    address_full: listing.address?.address,
    county: listing.county,
    
    // Mail address handling
    mail_address_street: listing.mailAddress?.street,
    mail_address_city: listing.mailAddress?.city,
    mail_address_state: listing.mailAddress?.state,
    mail_address_zip: listing.mailAddress?.zip,
    mail_address_full: listing.mailAddress?.address,
    
    // Property characteristics
    units_count: listing.unitsCount,
    year_built: listing.yearBuilt,
    square_feet: listing.squareFeet,
    lot_square_feet: listing.lotSquareFeet,
    
    // Financial information
    assessed_value: listing.assessedValue,
    assessed_land_value: listing.assessedLandValue,
    estimated_value: listing.estimatedValue,
    estimated_equity: listing.estimatedEquity,
    
    // Sale history
    last_sale_date: listing.lastSaleDate,
    last_sale_amount: listing.lastSalePrice,
    last_sale_arms_length: listing.lastSaleArmsLength,
    
    // Ownership information
    years_owned: listing.yearsOwned,
    owner_occupied: listing.ownerOccupied,
    in_state_absentee_owner: listing.inStateAbsenteeOwner,
    out_of_state_absentee_owner: listing.outOfStateAbsenteeOwner,
    corporate_owned: listing.corporateOwned,
    investor_buyer: listing.investorBuyer,
    owner_first_name: listing.owner1FirstName,
    owner_last_name: listing.owner1LastName,
    
    // Mortgage information
    mortgage_balance: listing.openMortgageBalance,
    mortgage_maturing_date: listing.maturityDateFirst,
    lender_name: listing.lenderName,
    
    // Property flags
    mls_active: listing.mlsActive,
    mls_days_on_market: listing.mlsDaysOnMarket,
    for_sale: listing.forSale,
    assumable: listing.assumable,
    auction: listing.auction,
    reo: listing.reo,
    foreclosure: listing.foreclosure,
    pre_foreclosure: listing.preForeclosure,
    private_lender: listing.privateLender,
    free_clear: listing.freeClear,
    
    // Portfolio information
    total_portfolio_equity: listing.totalPortfolioEquity,
    total_portfolio_mortgage_balance: listing.totalPortfolioMortgageBalance,
    total_properties_owned: listing.totalPropertiesOwned,
    
    // Location information
    flood_zone: listing.floodZone,
    flood_zone_description: listing.floodZoneDescription,
    latitude: listing.latitude,
    longitude: listing.longitude,
    
    // Property details
    property_type: listing.propertyType,
    stories: listing.stories,
    
    // Financial/Investment Analysis
    equity_percent: listing.equityPercent,
    loan_to_value_ratio: listing.loanToValueRatio,
    mortgage_rate_first: listing.mortgageRateFirst,
    mortgage_amount_first: listing.mortgageAmountFirst,
    mortgage_type_first: listing.mortgageTypeFirst,
    total_open_mortgage_balance: listing.totalOpenMortgageBalance,
    
    // Property Details for Analysis
    building_square_feet: listing.buildingSquareFeet,
    effective_year_built: listing.effectiveYearBuilt,
    school_district_name: listing.schoolDistrictName,
    school_rating: listing.schoolRating,
    neighborhood_name: listing.neighborhoodName,
    walk_score: listing.walkScore,
    median_household_income: listing.medianHouseholdIncome,
    
    // Risk Assessment
    distressed_property: listing.distressedProperty,
    bankruptcy_date: listing.bankruptcyDate,
    tax_delinquent: listing.taxDelinquent,
    lien_amount: listing.lienAmount,
    judgment_amount: listing.judgmentAmount,
    
    // Owner Intelligence
    owner_type: listing.ownerType,
    owner_mailing_address_same_as_property: listing.ownerMailingAddressSameAsProperty,
    years_of_ownership: listing.yearsOfOwnership
  };
}

export async function POST(req: NextRequest) {
  console.log("🚀 REALESTATEAPI ROUTE HIT!");
  try {
    const body = await req.json();
    console.log("📝 Raw body from client ➡️", body);

    // Get user ID from request body for search tracking (optional)
    const userId = body.userId; // Frontend can pass this
    let user = userId ? { id: userId } : null;
    
    if (userId) {
      console.log("📊 User ID provided for search tracking:", userId);
    } else {
      console.log("⚠️ No user ID provided, skipping search tracking");
    }

    if (body.clearResults) {
      console.log("🧹 Clearing results as requested.");
      return NextResponse.json([]);
    }

    const {
      zip,
      city,
      state,
      county,
      property_type,
      units_min,
      mls_active,
      units_max,
      flood_zone,
      year_built_min,
      year_built_max,
      lot_size_min,
      lot_size_max,
      mortgage_min,
      mortgage_max,
      assessed_value_min,
      assessed_value_max,
      value_min,
      value_max,
      estimated_equity_min,
      estimated_equity_max,
      equity_percent_min,
      stories_min,
      stories_max,
      latitude,
      longitude,
      radius,
      in_state_owner,
      out_of_state_owner,
      corporate_owned,
      years_owned_min,
      years_owned_max,
      last_sale_arms_length,
      last_sale_price_min,
      last_sale_price_max,
      assumable,
      auction,
      reo,
      pre_foreclosure,
      private_lender,
      street,
      house,
      size,
      resultIndex,
      count,
      ids_only,
      ids, // ADD MISSING IDS FIELD
      id, // Single ID field
      // MLS fields
      mls_cancelled,
      mls_days_on_market_min,
      mls_days_on_market_max,
      // Unit type filters
      mfh_2to4,
      mfh_5plus,
      // ADD COMPOUND QUERY FIELDS:
      or,
      and
    } = body;

    // ✅ Convert ZIP string to array
    const zipArray = zip
      ? zip.split(",").map((z: string) => z.trim()).filter((z: string) => z.length > 0)
      : [];

    console.log("📬 ZIP array being sent ➡️", zipArray);

    const payload = {
      zip: zipArray.length > 0 ? zipArray : undefined,
      property_type: property_type,
      city,
      state,
      county,
      latitude,
      longitude,
      radius,
      units_min,
      units_max,
      mls_active,
      flood_zone,
      year_built_min,
      year_built_max,
      lot_size_min,
      lot_size_max,
      mortgage_min,
      mortgage_max,
      assessed_value_min,
      assessed_value_max,
      value_min,
      value_max,
      estimated_equity_min,
      estimated_equity_max,
      equity_percent: equity_percent_min ? parseInt(equity_percent_min) : undefined,
      equity_percent_operator: equity_percent_min ? 'gte' : undefined,
      stories_min,
      stories_max,
      ids_only: ids_only ?? false,
      ids: ids, // Pass through the ids array
      id: id, // Pass through single id
      obfuscate: false,
      summary: false,
      size: size ?? 1,
      resultIndex: resultIndex ?? 0,
      count: count ?? false,
      in_state_owner,
      out_of_state_owner,
      corporate_owned,
      years_owned_min,
      years_owned_max,
      last_sale_arms_length,
      last_sale_price_min,
      last_sale_price_max,
      assumable,
      auction,
      reo,
      pre_foreclosure,
      private_lender,
      street,
      house,
      // MLS fields
      mls_cancelled,
      mls_days_on_market_min,
      mls_days_on_market_max,
      // Unit type filters
      mfh_2to4,
      mfh_5plus,
      // ADD COMPOUND QUERY FIELDS TO PAYLOAD:
      ...(or && { or }),
      ...(and && { and })
    };

    console.log("🎯 PROPERTY_TYPE DEBUG:", property_type, "Type:", typeof property_type);
    console.log("📦 Outgoing payload ➡️", JSON.stringify(payload, null, 2));

    const res = await fetch("https://api.realestateapi.com/v2/PropertySearch", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": process.env.REALESTATE_API_KEY!,
        "x-user-id": process.env.REALESTATE_API_USER_ID!,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("🔍 External API Response Structure:", {
  resultCount: data.resultCount,
  resultIndex: data.resultIndex,
  recordCount: data.recordCount,
  dataLength: data.data?.length,
  responseKeys: Object.keys(data)
});

    if (!res.ok) {
      console.error("❌ API returned error:", data);
      return NextResponse.json({ error: data }, { status: res.status });
    }

    if (ids_only) {
      const ids = Array.isArray(data.data) ? data.data : [];
      console.log("🧠 Returning IDs only:", ids);
      return NextResponse.json({ ids }); // ✅ wrapped in { ids }
    }

    console.log("📍 Sample listing (before transformation):", data.data?.[0]);
    
    // Transform camelCase API response to snake_case for consistent frontend usage
    if (data.data && Array.isArray(data.data)) {
      data.data = data.data.map(transformListingToSnakeCase);
      console.log("📍 Sample listing (after transformation):", data.data?.[0]);
    }

    // Track property search activity for all users (especially important for core users)
    // Only track actual searches, not ids_only requests or count requests
    console.log("🔍 TRACKING CHECK:", {
      ids_only,
      count,
      hasUser: !!user,
      userId: user?.id,
      conditions: {
        notIdsOnly: !ids_only,
        notCount: !count,
        hasUser: !!(user && user.id),
        willTrack: !ids_only && !count && user && user.id
      }
    });
    
    if (!ids_only && !count && user && user.id) {
      try {
        console.log("📤 Making tracking API call for userId:", user.id);
        const trackingUrl = `${req.nextUrl.origin}/api/activity-count`;
        console.log("📍 Tracking URL:", trackingUrl);
        
        const trackingResponse = await fetch(trackingUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            activityType: 'property_searches'
          }),
        });
        
        const trackingData = await trackingResponse.text();
        console.log("📊 Tracking response status:", trackingResponse.status);
        console.log("📊 Tracking response data:", trackingData);
        console.log("✅ Property search tracked for user:", user.id);
      } catch (trackingError) {
        // Don't fail the search if tracking fails
        console.error("❌ Failed to track search activity:", trackingError);
      }
    } else {
      console.log("⚠️ Skipping tracking - conditions not met");
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("🔥 Uncaught API route error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}