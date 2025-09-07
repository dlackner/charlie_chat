import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get('input');
    
    if (!input || input.length < 3) {
      return NextResponse.json({ predictions: [] });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Use Google Places Autocomplete API - optimized for US real estate
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:us&language=en&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Since we're already filtering to US with components=country:us, just limit results
    const filteredPredictions = data.predictions?.slice(0, 5) || [];
    
    return NextResponse.json({
      predictions: filteredPredictions || [],
      status: data.status
    });
    
  } catch (error) {
    console.error('Places autocomplete error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch address suggestions',
      predictions: [] 
    }, { status: 500 });
  }
}