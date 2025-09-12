/*
 * CHARLIE2 V2 - Shared Property Map Component
 * Reusable Mapbox map for displaying properties across discover and engage pages
 * Features: Dynamic centering, popups, context-aware navigation
 */
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';

interface PropertyMapProps {
  properties: any[];
  className?: string;
  context?: 'discover' | 'engage' | 'buybox';
  currentViewMode?: string;
  isShowingFavorites?: boolean;
  searchQuery?: string;
  hasSearched?: boolean;
}

const PropertyMap = dynamic(() => import('react-map-gl/mapbox').then((mod) => {
  const { Map, Marker, Popup } = mod;
  
  return function PropertyMapComponent({ 
    properties, 
    className, 
    context = 'discover',
    currentViewMode, 
    isShowingFavorites, 
    searchQuery, 
    hasSearched 
  }: PropertyMapProps) {
    const [viewState, setViewState] = useState({
      longitude: -71.3128,
      latitude: 41.4901,
      zoom: 13
    });
    const [popupInfo, setPopupInfo] = useState<any>(null);

    // Calculate centroid when properties change
    useEffect(() => {
      if (properties?.length > 0) {
        const validProperties = properties.filter(p => p.latitude && p.longitude);
        if (validProperties.length > 0) {
          const avgLat = validProperties.reduce((sum, p) => sum + p.latitude, 0) / validProperties.length;
          const avgLng = validProperties.reduce((sum, p) => sum + p.longitude, 0) / validProperties.length;
          setViewState({
            latitude: avgLat,
            longitude: avgLng,
            zoom: 12
          });
        }
      }
    }, [properties]);

    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      return (
        <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
          <div className="text-center text-gray-500 p-8">
            <div className="h-12 w-12 mx-auto mb-4 text-gray-400">🗺️</div>
            <p className="text-sm">Map requires configuration</p>
          </div>
        </div>
      );
    }

    const handlePopupClick = () => {
      if (!popupInfo) return;

      let backUrl = '';
      
      if (context === 'engage') {
        // For engage context, go back to engage page with current view mode
        const baseUrl = new URL('/v2/engage', window.location.origin);
        if (currentViewMode && currentViewMode !== 'cards') {
          baseUrl.searchParams.set('viewMode', currentViewMode);
        }
        backUrl = encodeURIComponent(baseUrl.toString());
      } else if (context === 'buybox') {
        // For buybox context, go back to buybox page
        const baseUrl = new URL('/v2/discover/buybox', window.location.origin);
        backUrl = encodeURIComponent(baseUrl.toString());
      } else {
        // For discover context, create a clean back URL
        const baseUrl = new URL('/v2/discover', window.location.origin);
        baseUrl.searchParams.set('viewMode', currentViewMode || 'cards');
        
        if (isShowingFavorites) {
          baseUrl.searchParams.set('showingFavorites', 'true');
        } else if (hasSearched && searchQuery) {
          baseUrl.searchParams.set('q', searchQuery);
          baseUrl.searchParams.set('hasResults', 'true');
        }
        
        backUrl = encodeURIComponent(baseUrl.toString());
      }

      // Navigate to property details with appropriate context
      const contextParam = context === 'engage' ? '?context=engage' : context === 'buybox' ? '?context=buybox' : '';
      const separator = contextParam ? '&' : '?';
      window.location.href = `/v2/discover/property/${popupInfo.id || popupInfo.property_id}${contextParam}${separator}back=${backUrl}`;
    };

    return (
      <div className={`relative ${className}`}>
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: '100%', height: '100%' }}
        >
          {properties?.filter(p => p.latitude && p.longitude).map((property, index) => {
            return (
              <Marker
                key={property.id || index}
                longitude={Number(property.longitude)}
                latitude={Number(property.latitude)}
                onClick={(e) => {
                  e.originalEvent?.stopPropagation();
                  setPopupInfo(property);
                }}
              >
                <button className="w-8 h-8 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-red-600 transition-colors">
                  <span className="text-white text-xs font-bold">
                    {property.units_count || property.units || '?'}
                  </span>
                </button>
              </Marker>
            );
          })}

          {popupInfo && (
            <Popup
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              onClose={() => setPopupInfo(null)}
              closeButton={true}
              closeOnClick={false}
              offset={10}
            >
              <div 
                className="p-3 max-w-64 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={handlePopupClick}
              >
                <h3 className="font-semibold text-gray-900 mb-2 text-sm break-words leading-tight">
                  {popupInfo.address_street || popupInfo.address || 'Property'}
                </h3>
                <div className="text-xs text-gray-600 mb-2">
                  {popupInfo.units_count || popupInfo.units || 'N/A'} Units • Built {popupInfo.year_built || popupInfo.built || 'Unknown'}
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="text-sm font-bold text-gray-900">
                    {popupInfo.assessed_value ? 
                      `$${parseInt(popupInfo.assessed_value.toString()).toLocaleString()}` : 
                      popupInfo.assessed || 'N/A'
                    }
                  </div>
                  <div className="text-xs text-gray-600">
                    Assessed Value
                  </div>
                </div>
                <div className="mt-2 text-xs text-blue-600 font-medium">
                  Click for details →
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    );
  };
}), { ssr: false });

export default PropertyMap;