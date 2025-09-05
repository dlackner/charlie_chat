'use client';

import { useState } from 'react';
import { Settings, Heart, X, Star, ArrowLeft, ArrowRight, Grid3x3, Map } from 'lucide-react';

export default function BuyBoxPage() {
  const [selectedMarket, setSelectedMarket] = useState('Denver, CO');
  const [flippedCards, setFlippedCards] = useState<{ [key: number]: boolean }>({});
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  
  // Sample market-specific buy box criteria - would come from API/state
  const marketCriteria = {
    'Denver, CO': {
      minUnits: 15,
      maxUnits: 35,
      minYearBuilt: 1990,
      maxYearBuilt: 2010,
      minAssessedValue: 1000000,
      maxAssessedValue: 2500000,
      minEstimatedValue: 1200000,
      maxEstimatedValue: 2800000
    },
    'Austin, TX': {
      minUnits: 10,
      maxUnits: 25,
      minYearBuilt: 1985,
      maxYearBuilt: 2005,
      minAssessedValue: 800000,
      maxAssessedValue: 1500000,
      minEstimatedValue: 950000,
      maxEstimatedValue: 1750000
    },
    'Phoenix, AZ': {
      minUnits: 20,
      maxUnits: 50,
      minYearBuilt: 1980,
      maxYearBuilt: 2000,
      minAssessedValue: 1200000,
      maxAssessedValue: 2000000,
      minEstimatedValue: 1400000,
      maxEstimatedValue: 2300000
    }
  };

  // Get markets from criteria keys
  const markets = Object.keys(marketCriteria);
  
  // Get criteria for selected market
  const selectedCriteria = marketCriteria[selectedMarket as keyof typeof marketCriteria];

  // Sample recommendations organized by market - would come from API
  const allRecommendations = {
    'Denver, CO': [
      {
        id: 1,
        address: '1234 Market Street',
        city: 'Denver',
        state: 'CO',
        zip: '80202',
        units: 24,
        built: 1998,
        assessed: '$1,850,000',
        estEquity: '$1,650,000',
        absenteeOwner: true,
        matchPercentage: 95,
        reasons: [
          'Strong match for your criteria',
          'Perfect unit count (24 units)',
          'Denver market - high growth area',
          'Out-of-state owner in California',
          'Built in optimal year range'
        ]
      },
      {
        id: 2,
        address: '567 Highland Ave',
        city: 'Denver',
        state: 'CO',
        zip: '80205',
        units: 18,
        built: 2005,
        assessed: '$2,100,000',
        estEquity: '$1,850,000',
        absenteeOwner: true,
        matchPercentage: 92,
        reasons: [
          'Strong match for your criteria',
          'Highland neighborhood - gentrifying area',
          'Out-of-state corporate owner',
          'Recent construction - lower maintenance',
          'Near public transit - attractive to tenants'
        ]
      },
      {
        id: 3,
        address: '890 Federal Blvd',
        city: 'Denver',
        state: 'CO',
        zip: '80204',
        units: 32,
        built: 1985,
        assessed: '$2,300,000',
        estEquity: '$1,950,000',
        absenteeOwner: true,
        matchPercentage: 88,
        reasons: [
          'Good match for your criteria',
          'Large property - economies of scale',
          'Federal Boulevard corridor - development area',
          'Older building - potential value-add opportunity',
          'Out-of-state LLC owner'
        ]
      }
    ],
    'Austin, TX': [
      {
        id: 4,
        address: '789 Industrial Ave',
        city: 'Austin',
        state: 'TX', 
        zip: '78701',
        units: 18,
        built: 1985,
        assessed: '$1,200,000',
        estEquity: '$980,000',
        absenteeOwner: false,
        matchPercentage: 88,
        reasons: [
          'Good match for your criteria',
          'Austin market - tech hub growth',
          'Mid-range unit count (18 units)',
          'Older building - potential value-add',
          'Local owner but corporate entity'
        ]
      },
      {
        id: 5,
        address: '321 South Lamar',
        city: 'Austin',
        state: 'TX',
        zip: '78704',
        units: 12,
        built: 1992,
        assessed: '$980,000',
        estEquity: '$750,000',
        absenteeOwner: true,
        matchPercentage: 94,
        reasons: [
          'Strong match for your criteria',
          'South Lamar - hot neighborhood',
          'Perfect size property (12 units)',
          'California-based owner',
          'Near entertainment district'
        ]
      }
    ],
    'Phoenix, AZ': [
      {
        id: 6,
        address: '456 Camelback Rd',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85016',
        units: 28,
        built: 1988,
        assessed: '$1,650,000',
        estEquity: '$1,200,000',
        absenteeOwner: true,
        matchPercentage: 91,
        reasons: [
          'Strong match for your criteria',
          'Camelback corridor - premium location',
          'Large unit count - good cash flow',
          'Out-of-state owner (New York)',
          'Desert market - population growth'
        ]
      },
      {
        id: 7,
        address: '123 Central Ave',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85003',
        units: 22,
        built: 1995,
        assessed: '$1,450,000',
        estEquity: '$1,100,000',
        absenteeOwner: true,
        matchPercentage: 89,
        reasons: [
          'Good match for your criteria',
          'Central Phoenix - urban core',
          'Mid-size property (22 units)',
          'Corporate ownership structure',
          'Near downtown business district'
        ]
      },
      {
        id: 8,
        address: '789 Scottsdale Rd',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85251',
        units: 16,
        built: 2001,
        assessed: '$1,350,000',
        estEquity: '$1,050,000',
        absenteeOwner: false,
        matchPercentage: 85,
        reasons: [
          'Moderate match for your criteria',
          'Scottsdale area - upscale market',
          'Newer construction (2001)',
          'Local owner but considering sale',
          'High-end tenant demographic'
        ]
      }
    ]
  };

  // Get recommendations for selected market
  const recommendations = allRecommendations[selectedMarket as keyof typeof allRecommendations] || [];

  // Get market counts for tabs
  const marketCounts = {
    'Denver, CO': allRecommendations['Denver, CO'].length,
    'Austin, TX': allRecommendations['Austin, TX'].length,  
    'Phoenix, AZ': allRecommendations['Phoenix, AZ'].length
  };

  const toggleCardFlip = (cardId: number) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleFavorite = (propertyId: number) => {
    // Handle favorite action
    console.log('Favorited property:', propertyId);
  };

  const handleNotInterested = (propertyId: number) => {
    // Handle not interested action
    console.log('Not interested in property:', propertyId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Buy Box Recommendations</h1>
          <p className="text-gray-600">Weekly personalized recommendations based on your criteria</p>
        </div>

        {/* Market Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {markets.map((market) => {
                const count = marketCounts[market as keyof typeof marketCounts];
                const isSelected = selectedMarket === market;
                
                return (
                  <button
                    key={market}
                    onClick={() => setSelectedMarket(market)}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      isSelected
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {market}
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Buy Box Criteria Summary - Market Specific */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedMarket} Buy Box Criteria
            </h2>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3x3 className="h-4 w-4 mr-1.5" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'map' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Map className="h-4 w-4 mr-1.5" />
                  Map
                </button>
              </div>
              
              <button className="flex items-center text-blue-600 hover:text-blue-700 font-medium">
                <Settings className="h-4 w-4 mr-2" />
                Edit Criteria
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Unit Range</div>
              <div className="font-medium text-gray-900">{selectedCriteria.minUnits}-{selectedCriteria.maxUnits} units</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Year Built Range</div>
              <div className="font-medium text-gray-900">{selectedCriteria.minYearBuilt}-{selectedCriteria.maxYearBuilt}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Assessed Value Range</div>
              <div className="font-medium text-gray-900">
                ${(selectedCriteria.minAssessedValue / 1000000).toFixed(1)}M - ${(selectedCriteria.maxAssessedValue / 1000000).toFixed(1)}M
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Estimated Value Range</div>
              <div className="font-medium text-gray-900">
                ${(selectedCriteria.minEstimatedValue / 1000000).toFixed(1)}M - ${(selectedCriteria.maxEstimatedValue / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>
        </div>

        {/* Selected Market Results Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {selectedMarket} Recommendations
          </h3>
          <p className="text-gray-600">
            {recommendations.length} properties this week matching your buy box criteria
          </p>
        </div>

        {/* Weekly Recommendations - Grid or Map View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((property, index) => (
              <RecommendationCard 
                key={property.id}
                property={property}
                isFlipped={flippedCards[property.id] || false}
                onFlip={() => toggleCardFlip(property.id)}
                onFavorite={() => handleFavorite(property.id)}
                onNotInterested={() => handleNotInterested(property.id)}
                index={index + 1}
                total={recommendations.length}
              />
            ))}
          </div>
        ) : (
          <MapView 
            properties={recommendations}
            selectedMarket={selectedMarket}
            onFavorite={handleFavorite}
            onNotInterested={handleNotInterested}
          />
        )}

        {/* Pagination or Load More */}
        {recommendations.length > 0 && (
          <div className="text-center mt-8">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Load More Recommendations
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MapView({
  properties,
  selectedMarket,
  onFavorite,
  onNotInterested
}: {
  properties: any[];
  selectedMarket: string;
  onFavorite: (id: number) => void;
  onNotInterested: (id: number) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Map Container */}
      <div className="relative h-96 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <Map className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedMarket} Property Map
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Interactive map showing {properties.length} recommendations in this market
          </p>
          <div className="text-xs text-gray-500">
            Map integration with Google Maps or Mapbox would go here
          </div>
        </div>

        {/* Sample Map Pins/Markers */}
        <div className="absolute inset-0">
          {properties.map((property, index) => (
            <div
              key={property.id}
              className={`absolute w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-all ${
                property.matchPercentage >= 90 
                  ? 'bg-green-500' 
                  : property.matchPercentage >= 85 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              style={{
                left: `${20 + (index * 15)}%`,
                top: `${30 + (index * 10)}%`
              }}
              title={`${property.address} - ${property.matchPercentage}% match`}
            >
              <span className="text-white text-xs font-bold flex items-center justify-center w-full h-full">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({
  property,
  isFlipped,
  onFlip,
  onFavorite,
  onNotInterested,
  index,
  total
}: {
  property: any;
  isFlipped: boolean;
  onFlip: () => void;
  onFavorite: () => void;
  onNotInterested: () => void;
  index: number;
  total: number;
}) {
  return (
    <div className="relative h-96 perspective-1000">
      <div 
        className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={onFlip}
      >
        {/* Front Side - Property Card */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
          {/* Property Image */}
          <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300">
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-400/30 rounded-lg"></div>
                <div className="text-sm font-medium">Property Photo</div>
              </div>
            </div>
            
            {/* Property counter */}
            <div className="absolute top-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs">
              Property {index} of {total}
            </div>
          </div>

          {/* Property Details */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-1 truncate">
              {property.address}
            </h3>
            
            <p className="text-sm text-gray-600 mb-3">
              {property.city}, {property.state} • {property.units} Units • Built {property.built}
            </p>

            <div className="mb-3">
              <div className="text-xl font-bold text-gray-900">
                {property.assessed}
              </div>
              {property.estEquity !== 'N/A' && (
                <div className="text-sm text-gray-600">
                  Est. Equity: <span className="font-medium text-green-600">{property.estEquity}</span>
                </div>
              )}
            </div>

            {/* Match indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium text-gray-900">{property.matchPercentage}% match</span>
              </div>
              <span className="text-xs text-blue-600 font-medium">Click to see why</span>
            </div>
          </div>
        </div>

        {/* Back Side - Why This Property */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
          <div className="p-6 h-full flex flex-col">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Why this property:</h3>
              <div className="flex items-center justify-center space-x-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i}
                    className={`h-5 w-5 ${i < Math.floor(property.matchPercentage / 20) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-blue-600">{property.matchPercentage}% match</span>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {property.reasons.map((reason: string, idx: number) => (
                <div key={idx} className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">{reason}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200">
              <span className="text-xs text-blue-600 font-medium">Click to see property details</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-4 right-4 flex space-x-2 z-10">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onNotInterested();
          }}
          className="p-2 bg-white/90 text-gray-600 rounded-full hover:bg-white hover:text-gray-800 transition-colors shadow-lg border border-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="p-2 bg-white/90 text-red-500 rounded-full hover:bg-white hover:text-red-600 transition-colors shadow-lg border border-gray-200"
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}