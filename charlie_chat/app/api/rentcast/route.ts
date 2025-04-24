import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { zipcode, beds} = body;

  //console.log("📨 Incoming RentCast API filters:", body);
  const apiKey = process.env.RENTCAST_API_KEY;
  const url = `https://api.rentcast.io/v1/properties?zipCode=${zipcode}&propertyType=Multi-Family&bedrooms=${beds}`;
  //console.log("🌐 Outgoing RentCast URL:", url);


  const res = await fetch(url, {
    headers: {
      "X-Api-Key": apiKey!,
    },
  });

  const data = await res.json();
  if (Array.isArray(data.properties)) {
    console.log(`📦 Retrieved ${data.properties.length} properties from RentCast:\n`);
    data.properties.forEach((p, i) => {
      console.log(
        `#${i + 1}: ${p.formattedAddress ?? "Unknown Address"}\n` +
        `  Beds: ${p.bedrooms ?? "?"}\n` +
        `  Rent Estimate: $${p.rentEstimate ?? "N/A"}\n` +
        `  Last Sale Price: $${p.lastSalePrice ?? "N/A"}\n` +
        `  -----------------------------`
      );
    });
  } else {
    console.warn("⚠️ No properties array in RentCast response:", data);
  }
  
  // You can also filter by price client-side here if needed
  return NextResponse.json(data);
}
