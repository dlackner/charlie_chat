// Temporary API to check user favorites status for debugging
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { userEmail } = await req.json();
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    
    // Find user by email in profiles table
    let profile: { user_id: string; email: string } | null = null;
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('email', userEmail)
      .single();

    if (profileError || !profileData) {
      // Try auth.users as fallback
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', userEmail)
        .single();
        
      if (authError || !authUsers) {
        return NextResponse.json(
          { error: `User not found with email: ${userEmail}` },
          { status: 404 }
        );
      }
      
      profile = {
        user_id: authUsers.id,
        email: authUsers.email
      };
    } else {
      profile = profileData;
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get user favorites with their status
    const { data: favorites, error: favError } = await supabase
      .from('user_favorites')
      .select(`
        property_id,
        status,
        recommendation_type,
        is_active,
        generated_at,
        saved_properties!inner (
          address_full,
          address_city,
          address_state
        )
      `)
      .eq('user_id', profile.user_id)
      .eq('recommendation_type', 'algorithm')
      .order('generated_at', { ascending: false })
      .limit(20);

    if (favError) {
      return NextResponse.json(
        { error: 'Failed to fetch favorites', details: favError },
        { status: 500 }
      );
    }

    // Count by status
    const statusCounts = favorites?.reduce((acc, fav) => {
      acc[fav.status] = (acc[fav.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number }) || {};

    return NextResponse.json({
      success: true,
      userEmail: profile.email,
      userId: profile.user_id,
      totalFavorites: favorites?.length || 0,
      statusCounts,
      recentFavorites: favorites?.slice(0, 10).map(fav => ({
        property_id: fav.property_id,
        status: fav.status,
        address: Array.isArray(fav.saved_properties) 
          ? (fav.saved_properties[0] as any)?.address_full 
          : (fav.saved_properties as any)?.address_full,
        city: Array.isArray(fav.saved_properties) 
          ? (fav.saved_properties[0] as any)?.address_city 
          : (fav.saved_properties as any)?.address_city,
        state: Array.isArray(fav.saved_properties) 
          ? (fav.saved_properties[0] as any)?.address_state 
          : (fav.saved_properties as any)?.address_state,
        generated_at: fav.generated_at
      }))
    });

  } catch (error) {
    console.error('Error checking favorites status:', error);
    return NextResponse.json(
      { error: 'Failed to check favorites status' },
      { status: 500 }
    );
  }
}