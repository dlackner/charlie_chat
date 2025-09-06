import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const { propertyId, stage } = await request.json();

    // TODO: Add authentication check
    // TODO: Update property stage in database
    // Example: await supabase.from('properties').update({ stage }).eq('id', propertyId)
    
    console.log(`API: Updating property ${propertyId} to stage ${stage}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({ 
      success: true, 
      message: `Property ${propertyId} moved to ${stage}` 
    });
  } catch (error) {
    console.error('Error updating property stage:', error);
    return NextResponse.json(
      { error: 'Failed to update property stage' },
      { status: 500 }
    );
  }
}