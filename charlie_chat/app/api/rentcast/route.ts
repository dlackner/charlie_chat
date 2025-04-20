import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { zipcode, beds} = body;

  const apiKey = process.env.RENTCAST_API_KEY;
  const url = `https://api.rentcast.io/v1/properties?postalCode=${zipcode}&bedrooms=${beds}`;

  const res = await fetch(url, {
    headers: {
      "X-Api-Key": apiKey!,
    },
  });

  const data = await res.json();

  // You can also filter by price client-side here if needed
  return NextResponse.json(data);
}
