'use client';

import React from 'react';
import { Heart, MapPin, Calendar, Building, DollarSign } from 'lucide-react';

interface Property {
  property_id?: string;
  id?: string;
  address_street?: string;
  address_full?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  units_count?: number;
  year_built?: number;
  assessed_value?: string | number;
  estimated_value?: string | number;
  latitude?: number;
  longitude?: number;
  saved_at?: string;
  out_of_state_absentee_owner?: boolean;
}

interface PropertyCardProps {
  property: Property;
  isFavorited?: boolean;
  onToggleFavorite?: (propertyId: string) => void;
  onViewDetails?: (property: Property) => void;
  showSavedDate?: boolean;
  className?: string;
}

export default function PropertyCard({
  property,
  isFavorited = false,
  onToggleFavorite,
  onViewDetails,
  showSavedDate = false,
  className = ''
}: PropertyCardProps) {
  const propertyId = property.property_id || property.id || '';
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite && propertyId) {
      onToggleFavorite(propertyId);
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(property);
    }
  };

  const formatCurrency = (value: string | number | undefined): string => {
    if (!value) return 'N/A';
    const num = typeof value === 'string' ? parseInt(value) : value;
    return num.toLocaleString();
  };

  const getDisplayAddress = (): string => {
    if (property.address_street) return property.address_street;
    if (property.address_full) return property.address_full;
    return 'Address not available';
  };

  const getLocationText = (): string => {
    const parts = [];
    if (property.address_city) parts.push(property.address_city);
    if (property.address_state) parts.push(property.address_state);
    if (property.address_zip) parts.push(property.address_zip);
    return parts.join(', ') || 'Location not available';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {getDisplayAddress()}
            </h3>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{getLocationText()}</span>
            </div>
          </div>
          
          {onToggleFavorite && (
            <button
              onClick={handleToggleFavorite}
              className={`ml-3 p-2 rounded-full transition-colors ${
                isFavorited 
                  ? 'text-red-500 hover:bg-red-50' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart 
                className="h-5 w-5" 
                fill={isFavorited ? 'currentColor' : 'none'} 
              />
            </button>
          )}
        </div>
      </div>

      {/* Property Details */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Building className="h-4 w-4 mr-2 text-gray-400" />
            <span>{property.units_count || 'N/A'} Units</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            <span>Built {property.year_built || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Financial Information */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Assessed Value:</span>
            <span className="text-sm font-medium text-gray-900">
              ${formatCurrency(property.assessed_value)}
            </span>
          </div>
          
          {property.estimated_value && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Est. Value:</span>
              <span className="text-sm font-medium text-gray-900">
                ${formatCurrency(property.estimated_value)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      {property.out_of_state_absentee_owner && (
        <div className="px-4 pb-3">
          <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
            Absentee Owner
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-50 px-4 py-3 rounded-b-lg flex items-center justify-between">
        {showSavedDate && property.saved_at && (
          <div className="text-xs text-gray-500">
            Saved {new Date(property.saved_at).toLocaleDateString()}
          </div>
        )}
        
        {onViewDetails && (
          <button 
            onClick={handleViewDetails}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer ml-auto"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}