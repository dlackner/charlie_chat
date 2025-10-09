'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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
  year_built?: number;
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
  owner_first_name?: string;
  owner_last_name?: string;
  out_of_state_absentee_owner?: boolean;
  in_state_absentee_owner?: boolean;
}

interface OfferScenario {
  id: string;
  offer_name: string;
  offer_data: {
    purchasePrice?: number;
    downPayment?: number;
    renovationBudget?: number;
    projected_irr?: string;
    projected_cash_on_cash?: string;
    projected_cap_rate?: string;
    projected_equity_at_horizon?: number;
    [key: string]: any;
  };
}

function PropertyProfilePrintContent() {
  const searchParams = useSearchParams();
  const propertyId = searchParams?.get('property');
  const offerId = searchParams?.get('offer');
  
  const { supabase, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [offerScenario, setOfferScenario] = useState<OfferScenario | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!propertyId || !offerId || !supabase) return;

      try {
        // Fetch property data
        const { data: propertyData, error: propertyError } = await supabase
          .from('saved_properties')
          .select('*')
          .eq('property_id', propertyId)
          .single();

        if (propertyError) throw propertyError;
        setProperty(propertyData);

        // Fetch offer scenario
        const { data: offerData, error: offerError } = await supabase
          .from('offer_scenarios')
          .select('*')
          .eq('id', offerId)
          .single();

        if (offerError) throw offerError;
        setOfferScenario(offerData);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load property data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [propertyId, offerId, supabase]);


  // Format currency
  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property profile...</p>
        </div>
      </div>
    );
  }

  if (error || !property || !offerScenario) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Property data not found'}</p>
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-content {
            margin: 0 !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
        }
        
        @media screen {
          .print-content {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 40px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100">
        {/* Screen-only controls */}
        <div className="no-print bg-white shadow-sm border-b p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Property Profile - Print View</h1>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Print
              </button>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Print content */}
        <div className="print-content">
          {/* Header */}
          <div className="mb-8 border-b-2 border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Profile</h1>
            <p className="text-xl text-gray-600">
              {property.address_street}, {property.address_city}, {property.address_state}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Property Overview */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Property Overview</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Basic Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium">{property.address_street}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">City, State:</span>
                    <span className="font-medium">{property.address_city}, {property.address_state}</span>
                  </div>
                  {property.address_zip && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ZIP Code:</span>
                      <span className="font-medium">{property.address_zip}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Units:</span>
                    <span className="font-medium">{property.units_count || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year Built:</span>
                    <span className="font-medium">{property.year_built || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Financial Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assessed Value:</span>
                    <span className="font-medium">{formatCurrency(property.assessed_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Value:</span>
                    <span className="font-medium">{formatCurrency(property.estimated_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Listing Price:</span>
                    <span className="font-medium">{formatCurrency(property.listing_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mortgage Balance:</span>
                    <span className="font-medium">{formatCurrency(property.mortgage_balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Equity:</span>
                    <span className="font-medium">{formatCurrency(property.estimated_equity)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Offer Scenario */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Investment Scenario</h2>
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{offerScenario.offer_name}</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Purchase Price:</span>
                    <span className="font-medium">{formatCurrency(offerScenario.offer_data.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Down Payment:</span>
                    <span className="font-medium">{formatCurrency(offerScenario.offer_data.downPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Renovation Budget:</span>
                    <span className="font-medium">{formatCurrency(offerScenario.offer_data.renovationBudget)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Projected IRR:</span>
                    <span className="font-medium">{offerScenario.offer_data.projected_irr || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash-on-Cash Return:</span>
                    <span className="font-medium">{offerScenario.offer_data.projected_cash_on_cash || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cap Rate:</span>
                    <span className="font-medium">{offerScenario.offer_data.projected_cap_rate || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Owner Information */}
          {(property.owner_first_name || property.owner_last_name) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Owner Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Owner Name:</span>
                  <span className="font-medium">{property.owner_first_name} {property.owner_last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Out of State Owner:</span>
                  <span className="font-medium">{property.out_of_state_absentee_owner ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In State Absentee:</span>
                  <span className="font-medium">{property.in_state_absentee_owner ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Additional Information</h2>
            <div className="space-y-2">
              {property.last_sale_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sale Date:</span>
                  <span className="font-medium">{formatDate(property.last_sale_date)}</span>
                </div>
              )}
              {property.last_sale_amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sale Amount:</span>
                  <span className="font-medium">{formatCurrency(property.last_sale_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Flood Zone:</span>
                <span className="font-medium">{property.flood_zone ? 'Yes' : 'No'}</span>
              </div>
              {property.flood_zone_description && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Flood Zone Details:</span>
                  <span className="font-medium">{property.flood_zone_description}</span>
                </div>
              )}
              {property.lender_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Lender:</span>
                  <span className="font-medium">{property.lender_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PropertyProfilePrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property profile...</p>
        </div>
      </div>
    }>
      <PropertyProfilePrintContent />
    </Suspense>
  );
}