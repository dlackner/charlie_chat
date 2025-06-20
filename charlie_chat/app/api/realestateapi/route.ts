import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    //console.log("📝 Raw body from client ➡️", body);

    if (body.clearResults) {
      //console.log("🧹 Clearing results as requested.");
      return NextResponse.json([]);
    }

    const {
      zip,
      city,
      state,
      propertyType,
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
      stories_min,
      stories_max,
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
      tax_lien,
      pre_foreclosure,
      private_lender,
      street,
      house,
      ids_only // ✅ include ids_only
    } = body;

    // ✅ Convert ZIP string to array
    const zipArray = zip
      ? zip.split(",").map((z: string) => z.trim()).filter((z: string) => z.length > 0)
      : [];

    //console.log("📬 ZIP array being sent ➡️", zipArray);

    const payload = {
      zip: zipArray.length > 0 ? zipArray : undefined,
      property_type: propertyType,
      city,
      state,
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
      stories_min,
      stories_max,
      ids_only: ids_only ?? false,
      obfuscate: false,
      summary: false,
      size: 25,
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
      tax_lien,
      pre_foreclosure,
      private_lender,
      street,
      house
    };

    //console.log("📦 Outgoing payload ➡️", payload);

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

    if (!res.ok) {
      console.error("❌ API returned error:", data);
      return NextResponse.json({ error: data }, { status: res.status });
    }

    if (ids_only) {
      const ids = Array.isArray(data.data) ? data.data : [];
      //console.log("🧠 Returning IDs only:", ids);
      return NextResponse.json({ ids }); // ✅ wrapped in { ids }
    }

   //console.log("📍 Sample listing:", data.data?.[0]);

    return NextResponse.json(data.data);
  } catch (err) {
    console.error("🔥 Uncaught API route error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}