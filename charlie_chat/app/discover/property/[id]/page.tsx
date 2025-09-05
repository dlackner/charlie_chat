'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, ExternalLink } from 'lucide-react';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [showStreetView, setShowStreetView] = useState(false);

  // Sample property data - in real app this would come from API based on params.id
  const property = {
    address: "96 Rhode Island Ave",
    city: "Newport",
    state: "RI",
    zip: "02840",
    propertyId: "199596975",
    classification: "High Equity, Seller Finance",
    units: 14,
    stories: 3,
    yearBuilt: 1900,
    lotSize: "30,000 sq ft",
    yearsOwned: "N/A",
    assessedValue: "$1,651,100",
    estimatedMarketValue: "$1,651,100",
    estimatedEquity: "$1,651,100",
    listingPrice: "Not listed",
    mortgageBalance: "$500,000",
    lender: "Peoples Fsb",
    mortgageMaturityDate: "N/A",
    lastSaleDate: "N/A",
    lastSaleAmount: "$0",
    armsLengthSale: "No",
    mlsActive: "No",
    mlsDaysOnMarket: "N/A",
    floodZone: "Yes",
    floodZoneDescription: "AREA OF MINIMAL FLOOD HAZARD",
    ownerName: "96 Rhode Island Rlty Llc",
    ownerAddress: "N/A",
    inStateAbsenteeOwner: "No",
    outOfStateAbsenteeOwner: "Yes",
    assumable: "No",
    reo: "No",
    auction: "No",
    taxLien: "No",
    preForeclosure: "No",
    privateLender: "No"
  };

  const handlePrint = () => {
    window.print();
  };

  const openStreetView = () => {
    const address = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
    const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&parameters&pano&viewpoint&heading&pitch&fov&cbll&layer=c&z=18&q=${encodeURIComponent(address)}`;
    window.open(streetViewUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center text-gray-600 hover:text-gray-700 font-medium"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </button>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {property.address}, {property.city}, {property.state} {property.zip}
            </h1>
          </div>
          
          {/* Large Property Image */}
          <div 
            onClick={openStreetView}
            className="w-full h-96 bg-gradient-to-br from-gray-200 to-gray-300 cursor-pointer hover:shadow-lg transition-shadow flex items-center justify-center relative overflow-hidden"
          >
            <div className="text-gray-600 text-center">
              <div className="w-20 h-20 mx-auto mb-3 bg-gray-400/30 rounded-lg flex items-center justify-center">
                <ExternalLink className="h-10 w-10" />
              </div>
              <div className="text-lg font-medium mb-1">Click for Street View</div>
              <div className="text-sm text-gray-500">Interactive street-level view of the property</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Property Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">PROPERTY OVERVIEW</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property ID:</span>
                  <span className="font-medium">{property.propertyId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Classification:</span>
                  <span className="font-medium">{property.classification}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Units:</span>
                  <span className="font-medium">{property.units}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stories:</span>
                  <span className="font-medium">{property.stories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Year Built:</span>
                  <span className="font-medium">{property.yearBuilt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lot Size:</span>
                  <span className="font-medium">{property.lotSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Years Owned:</span>
                  <span className="font-medium">{property.yearsOwned}</span>
                </div>
              </div>
            </div>

            {/* Valuation & Equity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">VALUATION & EQUITY</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Assessed Value:</span>
                  <span className="font-medium">{property.assessedValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Market Value:</span>
                  <span className="font-medium">{property.estimatedMarketValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Equity:</span>
                  <span className="font-medium text-green-600">{property.estimatedEquity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Listing Price:</span>
                  <span className="font-medium">{property.listingPrice}</span>
                </div>
              </div>
            </div>

            {/* Mortgage & Financing */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">MORTGAGE & FINANCING</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mortgage Balance:</span>
                  <span className="font-medium">{property.mortgageBalance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lender:</span>
                  <span className="font-medium">{property.lender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mortgage Maturity Date:</span>
                  <span className="font-medium">{property.mortgageMaturityDate}</span>
                </div>
              </div>
            </div>

            {/* Flood Zone Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">FLOOD ZONE INFORMATION</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Flood Zone:</span>
                  <span className="font-medium">{property.floodZone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flood Zone Description:</span>
                  <span className="font-medium">{property.floodZoneDescription}</span>
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
                  <span className="font-medium">{property.lastSaleDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sale Amount:</span>
                  <span className="font-medium">{property.lastSaleAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Arms-Length Sale:</span>
                  <span className="font-medium">{property.armsLengthSale}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MLS Active:</span>
                  <span className="font-medium">{property.mlsActive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MLS Days on Market:</span>
                  <span className="font-medium">{property.mlsDaysOnMarket}</span>
                </div>
              </div>
            </div>

            {/* Ownership Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">OWNERSHIP DETAILS</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Owner Name:</span>
                  <span className="font-medium">{property.ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Owner Address:</span>
                  <span className="font-medium">{property.ownerAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In-State Absentee Owner:</span>
                  <span className="font-medium">{property.inStateAbsenteeOwner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Out-of-State Absentee Owner:</span>
                  <span className="font-medium text-orange-600">{property.outOfStateAbsenteeOwner}</span>
                </div>
              </div>
            </div>

            {/* Other Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">OTHER INFORMATION</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Assumable:</span>
                  <span className="font-medium">{property.assumable}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">REO:</span>
                  <span className="font-medium">{property.reo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Auction:</span>
                  <span className="font-medium">{property.auction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Lien:</span>
                  <span className="font-medium">{property.taxLien}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pre Foreclosure:</span>
                  <span className="font-medium">{property.preForeclosure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Private Lender:</span>
                  <span className="font-medium">{property.privateLender}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}