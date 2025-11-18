/*
 * CHARLIE2 V2 - Shared Property Map Component
 * Consolidated map component for discover, engage, and other property display pages
 * Features: Dynamic centering, popups, context-aware navigation, rental data overlay
 * Replaces inline DiscoverMap and provides unified map experience
 */
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ProcessedRentData, getRentColorQuintiles } from '@/lib/v2/rentDataProcessor';

interface PropertyMapProps {
  properties: any[];
  className?: string;
  context?: 'discover' | 'engage' | 'buybox';
  currentViewMode?: string;
  isShowingFavorites?: boolean;
  searchQuery?: string;
  hasSearched?: boolean;
  rentData?: ProcessedRentData[];
  showRentOverlay?: boolean;
  // Engage page filter states
  selectedMarkets?: string[];
  selectedStatuses?: string[];
  selectedSource?: string;
  selectedPipelineStage?: string;
}

const PropertyMap = dynamic(() => import('react-map-gl/mapbox').then((mod) => {
  const { Map, Marker, Popup, Source, Layer } = mod;
  
  return function PropertyMapComponent({ 
    properties, 
    className, 
    context = 'discover',
    currentViewMode, 
    isShowingFavorites, 
    searchQuery, 
    hasSearched,
    rentData,
    showRentOverlay = true,
    selectedMarkets,
    selectedStatuses,
    selectedSource,
    selectedPipelineStage
  }: PropertyMapProps) {
    const [viewState, setViewState] = useState({
      longitude: -71.3128,
      latitude: 41.4901,
      zoom: 13
    });
    const [popupInfo, setPopupInfo] = useState<any>(null);

    // Center on most recent property when properties change
    useEffect(() => {
      if (properties?.length > 0) {
        const validProperties = properties.filter(p => p.latitude && p.longitude);
        if (validProperties.length > 0) {
          // Use the first property (most recent) instead of centroid for better UX
          const mostRecentProperty = validProperties[0];
          setViewState({
            latitude: mostRecentProperty.latitude,
            longitude: mostRecentProperty.longitude,
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
        // For engage context, go back to engage page with current view mode and filter states
        const baseUrl = new URL('/engage', window.location.origin);
        
        // Preserve view mode
        if (currentViewMode && currentViewMode !== 'cards') {
          baseUrl.searchParams.set('viewMode', currentViewMode);
        }
        
        // Preserve filter states
        if (selectedMarkets && selectedMarkets.length > 0) {
          baseUrl.searchParams.set('markets', selectedMarkets.join(','));
        }
        if (selectedStatuses && selectedStatuses.length > 0) {
          baseUrl.searchParams.set('statuses', selectedStatuses.join(','));
        }
        if (selectedSource && selectedSource !== 'All') {
          baseUrl.searchParams.set('source', selectedSource);
        }
        if (selectedPipelineStage && selectedPipelineStage !== 'all') {
          baseUrl.searchParams.set('stage', selectedPipelineStage);
        }
        if (searchQuery && searchQuery.trim()) {
          baseUrl.searchParams.set('search', searchQuery);
        }
        
        backUrl = encodeURIComponent(baseUrl.toString());
      } else if (context === 'buybox') {
        // For buybox context, go back to buybox page
        const baseUrl = new URL('/discover/buybox', window.location.origin);
        backUrl = encodeURIComponent(baseUrl.toString());
      } else {
        // For discover context, create a clean back URL
        const baseUrl = new URL('/discover', window.location.origin);
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
      window.location.href = `/discover/property/${popupInfo.property_id || popupInfo.id}${contextParam}${separator}back=${backUrl}`;
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
          {/* Rental Data Overlay - Geographic circles that maintain size */}
          {showRentOverlay && rentData && rentData.length > 0 && (
            <Source
              id="rental-data"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: rentData
                  .filter(metro => metro.latitude && metro.longitude)
                  .map((metro, index) => {
                    // Create a circle polygon with geographic radius
                    const radiusMiles = metro.radius || 25;
                    const radiusKm = radiusMiles * 1.60934; // Convert miles to km
                    const center = [Number(metro.longitude), Number(metro.latitude)];
                    
                    // Create circle coordinates (approximate circle with polygon)
                    const points = [];
                    const numPoints = 32;
                    for (let i = 0; i < numPoints; i++) {
                      const angle = (i / numPoints) * 2 * Math.PI;
                      const dx = radiusKm / 111.32 * Math.cos(angle); // 111.32 km per degree longitude at equator
                      const dy = radiusKm / 110.574 * Math.sin(angle); // 110.574 km per degree latitude
                      
                      // Adjust longitude for latitude
                      const adjustedDx = dx / Math.cos(center[1] * Math.PI / 180);
                      
                      points.push([center[0] + adjustedDx, center[1] + dy]);
                    }
                    points.push(points[0]); // Close the polygon
                    
                    return {
                      type: 'Feature',
                      geometry: {
                        type: 'Polygon',
                        coordinates: [points]
                      },
                      properties: {
                        id: `rent-${index}`,
                        averageRent: metro.averageRent,
                        radius: radiusMiles,
                        RegionName: metro.RegionName,
                        sizeRank: metro.sizeRank,
                        yoyPercent: metro.yoyPercent,
                        color: getRentColorQuintiles(metro.averageRent),
                        center: center
                      }
                    };
                  })
              }}
            >
              <Layer
                id="rental-circles"
                type="fill"
                paint={{
                  'fill-color': ['get', 'color'],
                  'fill-opacity': 0.3
                }}
              />
              <Layer
                id="rental-circles-stroke"
                type="line"
                paint={{
                  'line-color': '#ffffff',
                  'line-width': 2,
                  'line-opacity': 1
                }}
              />
            </Source>
          )}
          
          {/* Add rental data markers for click events */}
          {showRentOverlay && rentData?.map((metro, index) => {
            if (!metro.latitude || !metro.longitude) return null;
            
            return (
              <Marker
                key={`rent-marker-${index}`}
                longitude={Number(metro.longitude)}
                latitude={Number(metro.latitude)}
                onClick={(e) => {
                  e.originalEvent?.stopPropagation();
                  setPopupInfo({
                    ...metro,
                    isRentData: true,
                    id: `rent-${index}`
                  });
                }}
              >
                <div 
                  className="w-4 h-4 rounded-full cursor-pointer opacity-0 hover:opacity-30 transition-opacity"
                  style={{ backgroundColor: getRentColorQuintiles(metro.averageRent) }}
                />
              </Marker>
            );
          })}
          
          {/* Property Markers */}
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
              {popupInfo.isRentData ? (
                // Rental data popup
                <div className="p-3 max-w-64">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm break-words leading-tight">
                    {popupInfo.RegionName}
                  </h3>
                  <div className="text-xs text-gray-600 mb-2">
                    Average Rent: <span className="font-bold text-gray-900">${popupInfo.averageRent?.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    Market Size Rank: #{popupInfo.sizeRank}
                  </div>
                  {popupInfo.yoyPercent && (
                    <div className="text-xs text-gray-600">
                      YoY Change: {typeof popupInfo.yoyPercent === 'number' ? 
                        `${popupInfo.yoyPercent > 0 ? '+' : ''}${popupInfo.yoyPercent.toFixed(1)}%` : 
                        popupInfo.yoyPercent
                      }
                    </div>
                  )}
                </div>
              ) : (
                // Property popup
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
              )}
            </Popup>
          )}
        </Map>
      </div>
    );
  };
}), { ssr: false });

export default PropertyMap;