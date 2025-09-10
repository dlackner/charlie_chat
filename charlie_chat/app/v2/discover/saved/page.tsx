/*
 * CHARLIE2 V2 - Saved Searches Page
 * Pre-configured search templates for different property investment strategies
 * Routes to V2 discover page with applied filters
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Building, Calendar, DollarSign, Users, TrendingUp, Home, X } from 'lucide-react';

// Sample saved search criteria - would come from database
const savedSearches = [
  {
    id: 1,
    name: 'High Cash Flow Properties',
    description: 'Multi-family properties with strong rental income potential',
    icon: DollarSign,
    color: 'green',
    criteria: {
      minUnits: 8,
      maxUnits: 50,
      minYearBuilt: 1980,
      maxYearBuilt: 2015,
      minAssessedValue: 500000,
      maxAssessedValue: 2000000,
      propertyTypes: ['Multi-Family'],
      specialFeatures: ['High Cash Flow', 'Rental Income']
    }
  },
  {
    id: 2,
    name: 'Fix & Flip Opportunities',
    description: 'Properties with renovation potential and quick turnaround',
    icon: Home,
    color: 'orange',
    criteria: {
      minUnits: 1,
      maxUnits: 4,
      minYearBuilt: 1950,
      maxYearBuilt: 1990,
      minAssessedValue: 100000,
      maxAssessedValue: 800000,
      propertyTypes: ['Single Family', 'Duplex'],
      specialFeatures: ['Distressed', 'Below Market Value']
    }
  },
  {
    id: 3,
    name: 'New Construction',
    description: 'Recently built properties with modern amenities',
    icon: Building,
    color: 'blue',
    criteria: {
      minUnits: 1,
      maxUnits: 100,
      minYearBuilt: 2010,
      maxYearBuilt: 2024,
      minAssessedValue: 200000,
      maxAssessedValue: 5000000,
      propertyTypes: ['Multi-Family', 'Single Family'],
      specialFeatures: ['New Construction', 'Modern Amenities']
    }
  },
  {
    id: 4,
    name: 'Value-Add Properties',
    description: 'Properties with upside potential through improvements',
    icon: TrendingUp,
    color: 'purple',
    criteria: {
      minUnits: 5,
      maxUnits: 25,
      minYearBuilt: 1970,
      maxYearBuilt: 2000,
      minAssessedValue: 300000,
      maxAssessedValue: 1500000,
      propertyTypes: ['Multi-Family'],
      specialFeatures: ['Value-Add', 'Below Market Rent']
    }
  },
  {
    id: 5,
    name: 'Luxury Properties',
    description: 'High-end properties in premium locations',
    icon: Users,
    color: 'indigo',
    criteria: {
      minUnits: 1,
      maxUnits: 20,
      minYearBuilt: 1995,
      maxYearBuilt: 2024,
      minAssessedValue: 1000000,
      maxAssessedValue: 10000000,
      propertyTypes: ['Multi-Family', 'Single Family'],
      specialFeatures: ['Luxury', 'Premium Location']
    }
  },
  {
    id: 6,
    name: 'Student Housing',
    description: 'Properties near universities and colleges',
    icon: Calendar,
    color: 'yellow',
    criteria: {
      minUnits: 3,
      maxUnits: 20,
      minYearBuilt: 1980,
      maxYearBuilt: 2020,
      minAssessedValue: 200000,
      maxAssessedValue: 1200000,
      propertyTypes: ['Multi-Family'],
      specialFeatures: ['Near University', 'Student Housing']
    }
  }
];

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchCriteria: any;
  onSearch: (location: string) => void;
}

function LocationModal({ isOpen, onClose, searchCriteria, onSearch }: LocationModalProps) {
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      setError('Please enter a city or zip code');
      return;
    }
    setError('');
    onSearch(location.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Search Location</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Searching for: <span className="font-medium">{searchCriteria?.name}</span>
          </p>
          <p className="text-xs text-gray-500">{searchCriteria?.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              City or Zip Code
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter city or zip code"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Search Properties
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const [selectedSearch, setSelectedSearch] = useState<any>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string; hover: string } } = {
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', hover: 'hover:bg-green-100' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', hover: 'hover:bg-orange-100' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hover: 'hover:bg-blue-100' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hover: 'hover:bg-purple-100' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', hover: 'hover:bg-indigo-100' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', hover: 'hover:bg-yellow-100' }
    };
    return colorMap[color] || colorMap.blue;
  };

  const handleSearchClick = (search: any) => {
    setSelectedSearch(search);
    setShowLocationModal(true);
  };

  const handleLocationSearch = (location: string) => {
    if (!selectedSearch) return;

    // Build query parameters from criteria
    const params = new URLSearchParams();
    
    // Add location
    params.set('location', location);
    
    // Add criteria from selected search
    const criteria = selectedSearch.criteria;
    if (criteria.minUnits) params.set('minUnits', criteria.minUnits.toString());
    if (criteria.maxUnits) params.set('maxUnits', criteria.maxUnits.toString());
    if (criteria.minYearBuilt) params.set('minYearBuilt', criteria.minYearBuilt.toString());
    if (criteria.maxYearBuilt) params.set('maxYearBuilt', criteria.maxYearBuilt.toString());
    if (criteria.minAssessedValue) params.set('minAssessedValue', criteria.minAssessedValue.toString());
    if (criteria.maxAssessedValue) params.set('maxAssessedValue', criteria.maxAssessedValue.toString());
    if (criteria.propertyTypes) params.set('propertyTypes', criteria.propertyTypes.join(','));
    if (criteria.specialFeatures) params.set('specialFeatures', criteria.specialFeatures.join(','));
    
    // Add search name for context
    params.set('savedSearch', selectedSearch.name);

    // Close modal and redirect
    setShowLocationModal(false);
    setSelectedSearch(null);
    
    // Redirect to V2 discover page with filters
    router.push(`/v2/discover?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Searches</h1>
          <p className="text-gray-600">Pre-configured search criteria to help you find specific types of properties</p>
        </div>

        {/* Search Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedSearches.map((search) => {
            const colorClasses = getColorClasses(search.color);
            const Icon = search.icon;
            
            return (
              <div
                key={search.id}
                onClick={() => handleSearchClick(search)}
                className={`${colorClasses.bg} ${colorClasses.border} ${colorClasses.hover} border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${colorClasses.bg} p-3 rounded-lg ${colorClasses.border} border-2`}>
                    <Icon className={`h-6 w-6 ${colorClasses.text}`} />
                  </div>
                  <button className={`${colorClasses.text} hover:bg-white/50 p-1 rounded`}>
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{search.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{search.description}</p>
                
                {/* Criteria Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Units:</span>
                    <span className="font-medium">{search.criteria.minUnits}-{search.criteria.maxUnits}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Year Built:</span>
                    <span className="font-medium">{search.criteria.minYearBuilt}-{search.criteria.maxYearBuilt}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Value Range:</span>
                    <span className="font-medium">
                      ${(search.criteria.minAssessedValue / 1000).toFixed(0)}K-${(search.criteria.maxAssessedValue / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
                
                {/* Action Button */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className={`${colorClasses.text} text-sm font-medium flex items-center justify-center`}>
                    <Search className="h-4 w-4 mr-2" />
                    Click to Search
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State for Custom Searches */}
        <div className="mt-12 text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Create Custom Searches</h3>
          <p className="text-gray-600 mb-4">
            Save your own search criteria for quick access later
          </p>
          <button 
            onClick={() => router.push('/v2/discover')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Start New Search
          </button>
        </div>
      </div>

      {/* Location Modal */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          setSelectedSearch(null);
        }}
        searchCriteria={selectedSearch}
        onSearch={handleLocationSearch}
      />
    </div>
  );
}