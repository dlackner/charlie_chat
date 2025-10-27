import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { property_id } = await request.json();

    if (!property_id) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Call the PropertyDetail API directly with the property_id
    const detailResponse = await fetch('https://api.realestateapi.com/v2/PropertyDetail', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': process.env.REALESTATE_API_KEY || '',
        'x-user-id': process.env.REALESTATE_API_USER_ID || '',
      },
      body: JSON.stringify({
        comps: false,
        id: property_id
      }),
    });

    const detailData = await detailResponse.json();

    if (!detailResponse.ok) {
      console.error('PropertyDetail API error:', detailData);
      return NextResponse.json(
        { error: 'Failed to fetch property details from external API' },
        { status: 500 }
      );
    }

    return NextResponse.json(detailData);

  } catch (error) {
    console.error('Error fetching property details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}