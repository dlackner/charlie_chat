/*
 * CHARLIE2 V2 - Places Autocomplete API
 * Location search and autocomplete functionality
 * Part of the new V2 API architecture
 */
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

    // Smart filtering based on input type
    const isLikelyStreetAddress = /^\d+\s+.+/.test(input); // Starts with number + text
    const isZipCode = /^\d{5}/.test(input); // Starts with 5 digits
    const isCityState = input.includes(','); // Contains comma
    
    let url;
    if (isLikelyStreetAddress) {
      // For street addresses, use address type
      url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:us&language=en&key=${apiKey}`;
    } else if (isZipCode || isCityState) {
      // For zip codes and city/state, use cities type to get cleaner results
      url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&components=country:us&language=en&key=${apiKey}`;
    } else {
      // For general searches, use geocode to get both cities and addresses but filter better
      url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=geocode&components=country:us&language=en&key=${apiKey}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter out irrelevant results and prioritize better matches
    let predictions = data.predictions || [];
    
    // For zip code searches, prioritize postal code results
    if (isZipCode) {
      predictions = predictions.filter((p: any) => 
        p.types?.includes('postal_code') || 
        p.description?.includes(input.substring(0, 5))
      );
    }
    
    // For city searches, prioritize locality results
    if (isCityState && !isLikelyStreetAddress) {
      predictions = predictions.filter((p: any) => 
        p.types?.includes('locality') || 
        p.types?.includes('administrative_area_level_3') ||
        p.types?.includes('postal_code')
      );
    }
    
    const filteredPredictions = predictions.slice(0, 5);
    
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