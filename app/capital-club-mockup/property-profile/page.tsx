'use client';

import { useState } from 'react';
import { ArrowLeft, ExternalLink, MapPin, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PropertyProfilePage() {
  const router = useRouter();
  
  // Mock property data - same as used in Capital Club mockup
  const mockProperty = {
    id: '12345',
    address: '432 Elm Street',
    city: 'Atlanta',
    state: 'GA',
    zip: '30309',
    units: 24,
    year_built: 1995,
    estimated_value: 2850000,
    assessed_value: 2600000,
    property_type: 'Multifamily',
    square_footage: 18000,
    lot_size: 0.75,
    stories: 3,
    parking_spaces: 30,
    current_rent_roll: 28800,
    market_rent: 32400,
    occupancy_rate: 92,
    cap_rate: 6.2,
    price_per_unit: 118750,
    price_per_sqft: 158,
    owner_name: 'Atlanta Properties LLC',
    owner_phone: '(404) 555-0123',
    owner_email: 'info@atlantaprops.com',
    mailing_address: '432 Elm Street, Atlanta, GA 30309',
    last_sale_date: '2019-03-15',
    last_sale_price: 2100000,
    deed_type: 'Warranty Deed',
    tax_year: 2024,
    annual_taxes: 18500,
    flood_zone: 'X',
    zoning: 'R-5',
    latitude: 33.7849,
    longitude: -84.3888
  };

  // Helper functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Generate Street View URL
  const getStreetViewUrl = () => {
    const address = `${mockProperty.address}, ${mockProperty.city}, ${mockProperty.state} ${mockProperty.zip}`;
    return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
  };

  // Generate Zillow URL (mock)
  const getZillowUrl = () => {
    const address = `${mockProperty.address.replace(/\s+/g, '-')}-${mockProperty.city}-${mockProperty.state}-${mockProperty.zip}`;
    return `https://www.zillow.com/homedetails/${address.toLowerCase()}/123456789_zpid/`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{mockProperty.address}</h1>
                <p className="text-lg text-gray-600 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  {mockProperty.city}, {mockProperty.state} {mockProperty.zip}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Purchase Price</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(4200000)}</div>
              </div>
            </div>

            {/* Property Image with Clickable Icons */}
            <div className="relative mb-6">
              <div className="h-80 bg-gray-300 rounded-lg flex items-center justify-center relative">
                <div className="text-center text-gray-500">
                  <div className="text-lg font-medium">Property Image</div>
                  <div className="text-sm">Click icons below to view on external sites</div>
                </div>
                
                {/* Clickable Icons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {/* Google Street View */}
                  <button
                    onClick={() => window.open(getStreetViewUrl(), '_blank')}
                    className="p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors"
                    title="View on Google Street View"
                  >
                    <ExternalLink className="h-5 w-5 text-blue-600" />
                  </button>
                  
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
        </div>

        {/* Property Information Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Property Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">PROPERTY OVERVIEW</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Units:</span>
                  <span className="font-medium">{mockProperty.units}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Type:</span>
                  <span className="font-medium">{mockProperty.property_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Year Built:</span>
                  <span className="font-medium">{mockProperty.year_built}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Square Footage:</span>
                  <span className="font-medium">{mockProperty.square_footage.toLocaleString()} sq ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lot Size:</span>
                  <span className="font-medium">{mockProperty.lot_size} acres</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stories:</span>
                  <span className="font-medium">{mockProperty.stories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Parking Spaces:</span>
                  <span className="font-medium">{mockProperty.parking_spaces}</span>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">FINANCIAL INFORMATION</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Value:</span>
                  <span className="font-medium text-green-600">{formatCurrency(mockProperty.estimated_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Assessed Value:</span>
                  <span className="font-medium">{formatCurrency(mockProperty.assessed_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Rent Roll:</span>
                  <span className="font-medium">{formatCurrency(mockProperty.current_rent_roll)}/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Rent:</span>
                  <span className="font-medium">{formatCurrency(mockProperty.market_rent)}/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Occupancy Rate:</span>
                  <span className="font-medium">{formatPercent(mockProperty.occupancy_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cap Rate:</span>
                  <span className="font-medium">{formatPercent(mockProperty.cap_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price per Unit:</span>
                  <span className="font-medium">{formatCurrency(mockProperty.price_per_unit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price per Sq Ft:</span>
                  <span className="font-medium">{formatCurrency(mockProperty.price_per_sqft)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Annual Taxes:</span>
                  <span className="font-medium">{formatCurrency(mockProperty.annual_taxes)}</span>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">LOCATION INFORMATION</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium">{mockProperty.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">City:</span>
                  <span className="font-medium">{mockProperty.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">State:</span>
                  <span className="font-medium">{mockProperty.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ZIP Code:</span>
                  <span className="font-medium">{mockProperty.zip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Latitude:</span>
                  <span className="font-medium">{mockProperty.latitude}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Longitude:</span>
                  <span className="font-medium">{mockProperty.longitude}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flood Zone:</span>
                  <span className="font-medium">{mockProperty.flood_zone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Zoning:</span>
                  <span className="font-medium">{mockProperty.zoning}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Ownership Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">OWNERSHIP INFORMATION</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Owner Name:</span>
                  <span className="font-medium">{mockProperty.owner_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{mockProperty.owner_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{mockProperty.owner_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mailing Address:</span>
                  <span className="font-medium text-right">{mockProperty.mailing_address}</span>
                </div>
              </div>
            </div>

            {/* Historical Data */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">HISTORICAL DATA</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sale Date:</span>
                  <span className="font-medium">{formatDate(mockProperty.last_sale_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sale Price:</span>
                  <span className="font-medium">{formatCurrency(mockProperty.last_sale_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deed Type:</span>
                  <span className="font-medium">{mockProperty.deed_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Year:</span>
                  <span className="font-medium">{mockProperty.tax_year}</span>
                </div>
              </div>
            </div>

            {/* Market Comparables */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">MARKET COMPARABLES</h2>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">456 Oak Avenue</span>
                    <span className="text-green-600 font-medium">{formatCurrency(2950000)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    28 units • Built 1998 • 0.8 miles away
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">789 Pine Street</span>
                    <span className="text-green-600 font-medium">{formatCurrency(2650000)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    22 units • Built 1992 • 1.2 miles away
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">321 Maple Drive</span>
                    <span className="text-green-600 font-medium">{formatCurrency(3200000)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    30 units • Built 2001 • 0.6 miles away
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}