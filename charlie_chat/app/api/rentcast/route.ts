import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { zip, propertyType, units_min } = body;

    const payload = {
      zip,
      property_type: propertyType,
      units_min,
      ids_only: false,
      obfuscate: false,
      summary: false,
      size: 1,
    };

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

    console.log("📍 Sample listing:", data.data?.[0]);

    return NextResponse.json(data.data);
  } catch (err) {
    console.error("🔥 Uncaught API route error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
