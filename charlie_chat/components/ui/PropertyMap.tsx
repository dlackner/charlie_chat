'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Map, Marker, Popup } from 'react-map-gl/mapbox';
import { MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Property {
  id?: string | number;
  address_full?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  latitude?: number;
  longitude?: number;
  assessed_value?: string | number;
  estimated_value?: string | number;
  units_count?: number;
  year_built?: number;
  out_of_state_absentee_owner?: boolean;
}

interface PropertyMapProps {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  selectedPropertyId?: string | number;
  className?: string;
}

export default function PropertyMap({
  properties,
  onPropertySelect,
  selectedPropertyId,
  className = ''
}: PropertyMapProps) {
  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState({
    longitude: -71.3128, // Newport, RI (default)
    latitude: 41.4901,
    zoom: 13
  });
  const [popupInfo, setPopupInfo] = useState<Property | null>(null);
  const [geocodedProperties, setGeocodedProperties] = useState<Property[]>([]);

  // Update map center when properties change - since all properties have lat/lng
  useEffect(() => {
    if (properties.length > 0) {
      // Calculate center of all properties (they all have coordinates)
      const validProperties = properties.filter(p => p.latitude && p.longitude);
      
      if (validProperties.length > 0) {
        const avgLat = validProperties.reduce((sum, p) => sum + p.latitude!, 0) / validProperties.length;
        const avgLng = validProperties.reduce((sum, p) => sum + p.longitude!, 0) / validProperties.length;
        
        // Update map view to center on properties
        setViewState({
          latitude: avgLat,
          longitude: avgLng,
          zoom: 12
        });
      }
    }
  }, [properties]);

  // Since all properties have coordinates, just use them directly
  useEffect(() => {
    setGeocodedProperties(properties);
  }, [properties]);

  const handleMarkerClick = (property: Property) => {
    setPopupInfo(property);
    if (onPropertySelect) {
      onPropertySelect(property);
    }
  };

  // Don't render if no Mapbox token
  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500 p-8">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm">Map view requires Mapbox configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        {geocodedProperties.map((property, index) => {
          if (!property.latitude || !property.longitude) return null;
          
          const isSelected = selectedPropertyId && property.id === selectedPropertyId;
          
          return (
            <Marker
              key={property.id || index}
              longitude={property.longitude}
              latitude={property.latitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(property);
              }}
            >
              <button
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  isSelected
                    ? 'bg-blue-600 border-white shadow-lg'
                    : 'bg-red-500 border-white shadow-md hover:bg-red-600'
                }`}
                title={property.address_full || property.address_street || 'Property'}
              >
                <span className="text-white text-xs font-bold">
                  {property.units_count || '?'}
                </span>
              </button>
            </Marker>
          );
        })}

        {popupInfo && popupInfo.latitude && popupInfo.longitude && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            offset={-10}
            className="property-popup"
          >
            <div className="p-3 min-w-64">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                {popupInfo.address_full || popupInfo.address_street || 'Property'}
              </h3>
              
              <div className="space-y-1 text-xs text-gray-600">
                <div>
                  {popupInfo.address_city}, {popupInfo.address_state} {popupInfo.address_zip}
                </div>
                <div>
                  {popupInfo.units_count || 'N/A'} Units • Built {popupInfo.year_built || 'Unknown'}
                </div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-sm font-bold text-gray-900">
                  ${popupInfo.assessed_value ? parseInt(popupInfo.assessed_value.toString()).toLocaleString() : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">
                  Est. Value: ${popupInfo.estimated_value ? parseInt(popupInfo.estimated_value.toString()).toLocaleString() : 'N/A'}
                </div>
              </div>

              {popupInfo.out_of_state_absentee_owner && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                    Absentee Owner
                  </span>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}