'use client';

import { useState, useEffect, Suspense } from 'react';
import { ArrowLeft, ExternalLink, MapPin, Heart } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { StreetViewImage } from '@/components/ui/StreetViewImage';

interface Property {
  property_id: string;
  address_street: string;
  address_full?: string;
  address_city: string;
  address_state: string;
  address_zip?: string;
  latitude?: number;
  longitude?: number;
  units_count?: number;
  stories?: number;
  year_built?: number;
  lot_square_feet?: number;
  square_feet?: number;
  years_owned?: number;
  assessed_value?: number;
  estimated_value?: number;
  estimated_equity?: number;
  listing_price?: number;
  mortgage_balance?: number;
  lender_name?: string;
  flood_zone?: boolean;
  flood_zone_description?: string;
  last_sale_date?: string;
  last_sale_amount?: number;
  last_sale_arms_length?: boolean;
  mls_active?: boolean;
  mls_days_on_market?: number;
  owner_first_name?: string;
  owner_last_name?: string;
  mail_address_full?: string;
  in_state_absentee_owner?: boolean;
  out_of_state_absentee_owner?: boolean;
  assumable?: boolean;
  reo?: boolean;
  auction?: boolean;
  pre_foreclosure?: boolean;
  private_lender?: boolean;
}

function PropertyProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams?.get('property');
  const offerId = searchParams?.get('offer');
  const returnUrl = searchParams?.get('returnUrl');
  const { user, supabase, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [purchasePrice, setPurchasePrice] = useState<number | null>(null);

  // Fetch property data and offer scenario
  useEffect(() => {
    const fetchData = async () => {
      if (!propertyId || !supabase) return;

      try {
        // Fetch property data
        const { data: propertyData, error: propertyError } = await supabase
          .from('saved_properties')
          .select('*')
          .eq('property_id', propertyId)
          .single();

        if (propertyError) throw propertyError;
        setProperty(propertyData);

        // Fetch offer scenario if offerId is provided
        if (offerId) {
          const { data: offerData, error: offerError } = await supabase
            .from('offer_scenarios')
            .select('offer_data')
            .eq('id', offerId)
            .single();

          if (offerError) {
            console.error('Error fetching offer scenario:', offerError);
          } else if (offerData?.offer_data?.purchasePrice) {
            setPurchasePrice(offerData.offer_data.purchasePrice);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [propertyId, offerId, supabase]);

  // Helper functions
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString || 'N/A';
    }
  };

  const formatYesNo = (value: boolean | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value ? 'Yes' : 'No';
  };

  // Generate Street View URL
  const getStreetViewUrl = () => {
    if (!property) return '';
    const address = `${property.address_street}, ${property.address_city}, ${property.address_state} ${property.address_zip || ''}`;
    return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
  };

  // Generate Zillow URL
  const getZillowUrl = () => {
    if (!property) return '';
    const address = `${property.address_street.replace(/\s+/g, '-')}-${property.address_city}-${property.address_state}-${property.address_zip || ''}`;
    return `https://www.zillow.com/homedetails/${address.toLowerCase()}/123456789_zpid/`;
  };

  if (loading || authLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading property details...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !property) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Property not found'}</p>
            <button 
              onClick={() => router.back()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push(returnUrl || '/fund/browse')}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.address_street}</h1>
                  <p className="text-lg text-gray-600 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    {property.address_city}, {property.address_state} {property.address_zip}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{purchasePrice ? 'Purchase Price' : 'Estimated Value'}</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(purchasePrice || property.estimated_value)}</div>
                </div>
              </div>

              {/* Street View Image */}
              <div className="relative mb-6">
                <StreetViewImage
                  address={`${property.address_street || property.address_full}, ${property.address_city}, ${property.address_state} ${property.address_zip}`}
                  latitude={property.latitude}
                  longitude={property.longitude}
                  className="h-80 w-full"
                  width={800}
                  height={320}
                />
                
                {/* External Link Icons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {/* Zillow */}
                  <button
                    onClick={() => window.open(getZillowUrl(), '_blank')}
                    className="p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors"
                    title="View on Zillow"
                  >
                    <img 
                      src="/Zillow Logo_Primary_RGB.png" 
                      alt="Zillow" 
                      className="w-5 h-5 object-contain"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Property Information Sections - Matching View Details page exactly */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Property Overview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">PROPERTY OVERVIEW</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Units:</span>
                    <span className="font-medium">{property.units_count || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stories:</span>
                    <span className="font-medium">{property.stories || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year Built:</span>
                    <span className="font-medium">{property.year_built || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lot Size:</span>
                    <span className="font-medium">
                      {property.lot_square_feet ? `${property.lot_square_feet.toLocaleString()} sq ft` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Square Feet:</span>
                    <span className="font-medium">
                      {property.square_feet ? `${property.square_feet.toLocaleString()} sq ft` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Years Owned:</span>
                    <span className="font-medium">{property.years_owned || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Valuation & Equity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">VALUATION & EQUITY</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assessed Value:</span>
                    <span className="font-medium">{formatCurrency(property.assessed_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Market Value:</span>
                    <span className="font-medium">{formatCurrency(property.estimated_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Equity:</span>
                    <span className="font-medium text-green-600">{formatCurrency(property.estimated_equity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Listing Price:</span>
                    <span className="font-medium">{formatCurrency(property.listing_price) || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Mortgage & Financing */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">MORTGAGE & FINANCING</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mortgage Balance:</span>
                    <span className="font-medium">{formatCurrency(property.mortgage_balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lender:</span>
                    <span className="font-medium">{property.lender_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mortgage Maturity Date:</span>
                    <span className="font-medium">N/A</span>
                  </div>
                </div>
              </div>

              {/* Flood Zone Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">FLOOD ZONE INFORMATION</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Flood Zone:</span>
                    <span className="font-medium">{formatYesNo(property.flood_zone)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Flood Zone Description:</span>
                    <span className="font-medium">{property.flood_zone_description || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Sales & Transaction History */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">SALES & TRANSACTION HISTORY</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Sale Date:</span>
                    <span className="font-medium">{formatDate(property.last_sale_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Sale Amount:</span>
                    <span className="font-medium">{formatCurrency(property.last_sale_amount) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Arms-Length Sale:</span>
                    <span className="font-medium">{formatYesNo(property.last_sale_arms_length)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MLS Active:</span>
                    <span className="font-medium">{formatYesNo(property.mls_active)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MLS Days on Market:</span>
                    <span className="font-medium">{property.mls_days_on_market || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Ownership Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">OWNERSHIP DETAILS</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Owner Name:</span>
                    <span className="font-medium">
                      {property.owner_first_name && property.owner_last_name 
                        ? `${property.owner_first_name} ${property.owner_last_name}`
                        : property.owner_last_name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Owner Address:</span>
                    <span className="font-medium">{property.mail_address_full || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">In-State Absentee Owner:</span>
                    <span className="font-medium">{formatYesNo(property.in_state_absentee_owner)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Out-of-State Absentee Owner:</span>
                    <span className="font-medium text-orange-600">{formatYesNo(property.out_of_state_absentee_owner)}</span>
                  </div>
                </div>
              </div>

              {/* Other Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">OTHER INFORMATION</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assumable:</span>
                    <span className="font-medium">{formatYesNo(property.assumable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">REO:</span>
                    <span className="font-medium">{formatYesNo(property.reo)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auction:</span>
                    <span className="font-medium">{formatYesNo(property.auction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pre Foreclosure:</span>
                    <span className="font-medium">{formatYesNo(property.pre_foreclosure)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Private Lender:</span>
                    <span className="font-medium">{formatYesNo(property.private_lender)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function PropertyProfilePage() {
  return (
    <Suspense fallback={
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading property details...</p>
          </div>
        </div>
      </AuthGuard>
    }>
      <PropertyProfileContent />
    </Suspense>
  );
}