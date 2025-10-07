'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { ArrowLeft, MapPin, ExternalLink, Home, DollarSign, Loader2, Printer } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/components/shared/AlertModal';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';


interface PropertyModalProps {
  property: any;
  onClose: () => void;
}

function PropertyModal({ property, onClose }: PropertyModalProps) {
  const streetViewUrl = `https://www.google.com/maps?q=${encodeURIComponent(property.address_full || property.address_street || '')}&layer=c&cbll=${property.latitude},${property.longitude}&cbp=12,0,0,0,5&z=17`;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">{(property.address_street || property.address_full || 'Address not available').split(',')[0]}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <Home className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Units</p>
                <p className="text-sm font-medium">{property.units_count || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Assessed Value</p>
                <p className="text-sm font-medium">${property.assessed_value ? (property.assessed_value / 1000000).toFixed(2) : 'N/A'}M</p>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-500">Estimated Market Value</p>
            <p className="text-lg font-semibold text-green-600">${property.estimated_value ? (property.estimated_value / 1000000).toFixed(2) : 'N/A'}M</p>
          </div>
          
          <div className="pt-4 border-t">
            <a
              href={streetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Street View
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoadtripContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { } = useAuth();
  const { showWarning, AlertComponent } = useAlert();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [centerProperty, setCenterProperty] = useState<any>(null);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForPrint, setSelectedForPrint] = useState<string[]>([]);
  const [searchRadius, setSearchRadius] = useState(1);
  const [valueRangePercent, setValueRangePercent] = useState(10);
  const [isSearching, setIsSearching] = useState(false);

  // Calculate distance between two lat/lng points in miles
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const propertyId = searchParams.get('propertyId') || '189430701'; // Hardcoded for now
  console.log('🎯 Roadtrip propertyId from URL:', propertyId);

  // Manual search function for radius changes
  const handleRadiusSearch = async () => {
    if (!centerProperty) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const assessedValue = centerProperty.assessed_value;
      const rangeMultiplier = valueRangePercent / 100;
      const valueMin = Math.round(assessedValue * (1 - rangeMultiplier)); // -Range%
      const valueMax = Math.round(assessedValue * (1 + rangeMultiplier)); // +Range%
      
      console.log('🔍 Manual search with radius:', searchRadius, 'miles and range:', valueRangePercent, '%');
      
      const nearbyResponse = await fetch('/api/realestateapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property_type: 'MFR',
          latitude: centerProperty.latitude,
          longitude: centerProperty.longitude,
          radius: searchRadius,
          assessed_value_min: valueMin,
          assessed_value_max: valueMax,
          size: 50
        })
      });
      
      if (nearbyResponse.ok) {
        const nearbyData = await nearbyResponse.json();
        console.log('🏘️ New radius search results:', nearbyData);
        
        const propertiesArray = nearbyData.data || nearbyData;
        
        if (Array.isArray(propertiesArray)) {
          const filtered = propertiesArray.filter((prop: any) => prop.id !== propertyId);
          setNearbyProperties(filtered);
          
          // Update map circles with new radius
          if (mapInstanceRef.current) {
            const map = mapInstanceRef.current;
            
            // Helper function to create circle coordinates
            const createCircle = (center: [number, number], radiusInMiles: number, points = 64) => {
              const coords = [];
              const distanceX = radiusInMiles / (69.047 * Math.cos(center[1] * Math.PI / 180));
              const distanceY = radiusInMiles / 69.047;

              for (let i = 0; i < points; i++) {
                const theta = (i / points) * (2 * Math.PI);
                const x = distanceX * Math.cos(theta);
                const y = distanceY * Math.sin(theta);
                coords.push([center[0] + x, center[1] + y]);
              }
              coords.push(coords[0]); // Close the circle
              return coords;
            };
            
            // Update search radius circle
            if (map.getSource('search-radius-circle')) {
              map.getSource('search-radius-circle').setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Polygon',
                  coordinates: [createCircle([centerProperty.longitude, centerProperty.latitude], searchRadius)]
                }
              });
            }
            
            // Update or remove half-radius circle
            if (searchRadius > 0.5) {
              if (map.getSource('half-radius-circle')) {
                map.getSource('half-radius-circle').setData({
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'Polygon',
                    coordinates: [createCircle([centerProperty.longitude, centerProperty.latitude], searchRadius / 2)]
                  }
                });
              } else {
                // Add half-radius circle if it doesn't exist
                map.addSource('half-radius-circle', {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'Polygon',
                      coordinates: [createCircle([centerProperty.longitude, centerProperty.latitude], searchRadius / 2)]
                    }
                  }
                });

                map.addLayer({
                  id: 'half-radius-circle',
                  type: 'fill',
                  source: 'half-radius-circle',
                  paint: {
                    'fill-color': 'rgba(59, 130, 246, 0.15)',
                    'fill-outline-color': 'rgba(59, 130, 246, 0.7)'
                  }
                });
              }
            } else {
              // Remove half-radius circle if radius is 0.5
              if (map.getLayer('half-radius-circle')) {
                map.removeLayer('half-radius-circle');
                map.removeSource('half-radius-circle');
              }
            }
            
            // Clear existing nearby property markers
            if (map._nearbyMarkers) {
              map._nearbyMarkers.forEach(marker => marker.remove());
            }
            map._nearbyMarkers = [];
            
            // Add new nearby property markers
            filtered.forEach((property) => {
              const streetViewUrl = `https://www.google.com/maps?q=${encodeURIComponent(property.address_full || property.address_street || '')}&layer=c&cbll=${property.latitude},${property.longitude}&cbp=12,0,0,0,5&z=17`;
              
              const popup = new mapboxgl.Popup({ 
                closeButton: false, 
                closeOnClick: false,
                closeOnMove: false,
                offset: 25
              }).setHTML(`
                <div class="p-2">
                  <p class="font-bold text-sm text-gray-900 mb-1">${(property.address_street || property.address_full || 'Address not available').split(',')[0]}</p>
                  <p class="text-xs text-gray-600 mb-2">${property.units_count || 'N/A'} units • $${property.assessed_value ? (property.assessed_value / 1000000).toFixed(2) : 'N/A'}M</p>
                  <a href="${streetViewUrl}" target="_blank" class="text-xs text-blue-600 hover:text-blue-800" style="text-decoration: none;">Street View →</a>
                </div>
              `);

              const marker = new mapboxgl.Marker({ color: '#3b82f6' })
                .setLngLat([property.longitude, property.latitude])
                .addTo(map);

              // Store marker reference for cleanup
              if (!map._nearbyMarkers) map._nearbyMarkers = [];
              map._nearbyMarkers.push(marker);

              // Add click events for popup
              marker.getElement().addEventListener('click', () => {
                document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());
                popup.setLngLat([property.longitude, property.latitude]).addTo(map);
              });
            });
          }
        } else {
          setNearbyProperties([]);
        }
      } else {
        throw new Error('Search failed');
      }
    } catch (err) {
      console.error('Error in radius search:', err);
      setError('Failed to search with new radius');
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch center property from saved_properties and nearby properties
  useEffect(() => {
    let isCancelled = false;
    
    const fetchPropertyData = async () => {
      if (isCancelled) return;

      try {
        console.log('🔍 Fetching saved property with ID:', propertyId);
        
        // Get center property from saved_properties table to get lat/lng/assessed_value
        const savedPropertyResponse = await fetch('/api/favorites', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!savedPropertyResponse.ok) {
          throw new Error('Failed to fetch saved properties');
        }
        
        const savedData = await savedPropertyResponse.json();
        console.log('📦 Saved properties response:', savedData);
        
        // Find the center property by property_id
        const centerProperty = savedData.favorites?.find((fav: any) => 
          fav.property_id === propertyId
        )?.property_data;
        
        if (!centerProperty) {
          throw new Error('Center property not found in saved properties');
        }
        
        console.log('🏢 Center property from saved_properties:', centerProperty);
        console.log('📍 Center property lat/lng:', centerProperty.latitude, centerProperty.longitude);
        console.log('💵 Center property assessed_value:', centerProperty.assessed_value);
        
        if (isCancelled) return;
        setCenterProperty(centerProperty);

        // Calculate assessed value range (+/- Range%)
        if (centerProperty.latitude && centerProperty.longitude && centerProperty.assessed_value) {
          const assessedValue = centerProperty.assessed_value;
          const rangeMultiplier = valueRangePercent / 100;
          const valueMin = Math.round(assessedValue * (1 - rangeMultiplier)); // -Range%
          const valueMax = Math.round(assessedValue * (1 + rangeMultiplier)); // +Range%
          
          console.log('🌍 Searching near lat/lng:', centerProperty.latitude, centerProperty.longitude);
          console.log('📏 Using radius:', searchRadius, 'miles');
          console.log('💰 Assessed value range:', valueMin, 'to', valueMax);
          
          // Make ONLY ONE API call for nearby properties
          const nearbyResponse = await fetch('/api/realestateapi', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              property_type: 'MFR',
              latitude: centerProperty.latitude,
              longitude: centerProperty.longitude,
              radius: searchRadius, // Use current radius state
              assessed_value_min: valueMin,
              assessed_value_max: valueMax,
              size: 50
            })
          });
          
          if (nearbyResponse.ok) {
            const nearbyData = await nearbyResponse.json();
            console.log('🏘️ Nearby properties response:', nearbyData);
            console.log('🔍 nearbyData structure:', {
              type: typeof nearbyData,
              isArray: Array.isArray(nearbyData),
              hasData: !!nearbyData.data,
              dataIsArray: Array.isArray(nearbyData.data),
              dataLength: nearbyData.data?.length
            });
            
            // Extract the actual properties array from the API response
            const propertiesArray = nearbyData.data || nearbyData;
            
            // Ensure we have an array of properties
            if (Array.isArray(propertiesArray)) {
              console.log('✅ Found', propertiesArray.length, 'nearby properties with radius:', searchRadius);
              // Filter out the center property from nearby results 
              const filtered = propertiesArray.filter((prop: any) => prop.id !== propertyId);
              console.log('🎯 After filtering center property:', filtered.length, 'properties remaining');
              if (!isCancelled) {
                setNearbyProperties(filtered);
              }
            } else {
              console.error('❌ No valid properties array found:', nearbyData);
              if (!isCancelled) {
                setNearbyProperties([]);
              }
            }
          } else {
            console.error('❌ Nearby properties API request failed:', nearbyResponse.status);
          }
        } else {
          throw new Error('Center property missing lat/lng or assessed_value');
        }
      } catch (err) {
        console.error('Error fetching property data:', err);
        setError('Failed to load property data');
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchPropertyData();
    
    // Cleanup function to prevent duplicate requests
    return () => {
      isCancelled = true;
    };
  }, [propertyId, searchRadius, valueRangePercent]); // Re-fetch when propertyId, radius, or range changes

  // Initialize Mapbox map with real data
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !mapboxgl.accessToken || !centerProperty) return;

    try {
      // Create Mapbox map
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [centerProperty.longitude, centerProperty.latitude],
        zoom: 14
      });

      mapInstanceRef.current = map;

      map.on('load', () => {
        setMapLoaded(true);

        // Helper function to create circle coordinates
        const createCircle = (center: [number, number], radiusInMiles: number, points = 64) => {
          const coords = [];
          const distanceX = radiusInMiles / (69.047 * Math.cos(center[1] * Math.PI / 180));
          const distanceY = radiusInMiles / 69.047;

          for (let i = 0; i < points; i++) {
            const theta = (i / points) * (2 * Math.PI);
            const x = distanceX * Math.cos(theta);
            const y = distanceY * Math.sin(theta);
            coords.push([center[0] + x, center[1] + y]);
          }
          coords.push(coords[0]); // Close the circle
          return coords;
        };

        // Add search radius circle (outer)
        map.addSource('search-radius-circle', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [createCircle([centerProperty.longitude, centerProperty.latitude], searchRadius)]
            }
          }
        });

        map.addLayer({
          id: 'search-radius-circle',
          type: 'fill',
          source: 'search-radius-circle',
          paint: {
            'fill-color': 'rgba(59, 130, 246, 0.1)',
            'fill-outline-color': 'rgba(59, 130, 246, 0.4)'
          }
        });

        // Add half-radius circle (inner) only if radius > 0.5
        if (searchRadius > 0.5) {
          map.addSource('half-radius-circle', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [createCircle([centerProperty.longitude, centerProperty.latitude], searchRadius / 2)]
              }
            }
          });

          map.addLayer({
            id: 'half-radius-circle',
            type: 'fill',
            source: 'half-radius-circle',
            paint: {
              'fill-color': 'rgba(59, 130, 246, 0.15)',
              'fill-outline-color': 'rgba(59, 130, 246, 0.7)'
            }
          });
        }

        // Add center property marker (red)
        const centerStreetViewUrl = `https://www.google.com/maps?q=${encodeURIComponent(centerProperty.address_full || centerProperty.address_street || '')}&layer=c&cbll=${centerProperty.latitude},${centerProperty.longitude}&cbp=12,0,0,0,5&z=17`;
        
        const centerPopup = new mapboxgl.Popup({ 
          closeButton: false, 
          closeOnClick: false,
          closeOnMove: false,
          offset: 25
        }).setHTML(`
          <div class="p-2">
            <p class="font-bold text-sm text-red-600 mb-1">${(centerProperty.address_street || centerProperty.address_full || 'Address not available').split(',')[0]} (Target)</p>
            <p class="text-xs text-gray-600 mb-2">${centerProperty.units_count || 'N/A'} units • $${centerProperty.assessed_value ? (centerProperty.assessed_value / 1000000).toFixed(2) : 'N/A'}M</p>
            <a href="${centerStreetViewUrl}" target="_blank" class="text-xs text-blue-600 hover:text-blue-800" style="text-decoration: none;">Street View →</a>
          </div>
        `);

        const centerMarker = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([centerProperty.longitude, centerProperty.latitude])
          .addTo(map);

        // Add click events for center marker
        centerMarker.getElement().addEventListener('click', () => {
          // Close any other open popups first
          document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());
          centerPopup.setLngLat([centerProperty.longitude, centerProperty.latitude]).addTo(map);
        });

        // Clear any existing nearby property markers first
        if (map._nearbyMarkers) {
          map._nearbyMarkers.forEach(marker => marker.remove());
        }
        map._nearbyMarkers = [];

        // Add nearby property markers (blue)
        nearbyProperties.forEach((property) => {
          console.log('🏠 Property data for popup:', {
            id: property.id,
            address_full: property.address_full,
            address_street: property.address_street,
            units_count: property.units_count,
            assessed_value: property.assessed_value,
            latitude: property.latitude,
            longitude: property.longitude
          });
          
          const streetViewUrl = `https://www.google.com/maps?q=${encodeURIComponent(property.address_full || property.address_street || '')}&layer=c&cbll=${property.latitude},${property.longitude}&cbp=12,0,0,0,5&z=17`;
          
          const popup = new mapboxgl.Popup({ 
            closeButton: false, 
            closeOnClick: false,
            closeOnMove: false,
            offset: 25
          }).setHTML(`
            <div class="p-2">
              <p class="font-bold text-sm text-gray-900 mb-1">${(property.address_street || property.address_full || 'Address not available').split(',')[0]}</p>
              <p class="text-xs text-gray-600 mb-2">${property.units_count || 'N/A'} units • $${property.assessed_value ? (property.assessed_value / 1000000).toFixed(2) : 'N/A'}M</p>
              <a href="${streetViewUrl}" target="_blank" class="text-xs text-blue-600 hover:text-blue-800" style="text-decoration: none;">Street View →</a>
            </div>
          `);

          const marker = new mapboxgl.Marker({ color: '#3b82f6' })
            .setLngLat([property.longitude, property.latitude])
            .addTo(map);

          // Store marker reference for cleanup
          if (!map._nearbyMarkers) map._nearbyMarkers = [];
          map._nearbyMarkers.push(marker);

          // Add click events for popup (single click handler)
          marker.getElement().addEventListener('click', () => {
            // Close any other open popups first
            document.querySelectorAll('.mapboxgl-popup').forEach(popup => popup.remove());
            popup.setLngLat([property.longitude, property.latitude]).addTo(map);
          });
        });

      });
    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setMapLoaded(true); // Show fallback UI
    }
  }, [centerProperty, nearbyProperties, searchRadius]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handlePropertyClick = (property: any) => {
    setSelectedProperty(property);
  };

  const handleCloseModal = () => {
    setSelectedProperty(null);
  };

  const togglePropertyForPrint = (propertyId: string) => {
    setSelectedForPrint(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handlePrintToPDF = () => {
    if (selectedForPrint.length === 0) {
      showWarning('Please select at least one property to print', 'No Selection');
      return;
    }
    
    // Get selected properties data
    const selectedProperties = nearbyProperties.filter(prop => 
      selectedForPrint.includes(prop.id)
    );
    
    // Include center property if selected
    const allSelectedProperties = selectedForPrint.includes('center') && centerProperty 
      ? [{ ...centerProperty, isCenter: true }, ...selectedProperties]
      : selectedProperties;
    
    // Create print content
    const printContent = `
      <html>
        <head>
          <title>Property Roadtrip Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .property { margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            .property.target { border-color: #ef4444; background-color: #fef2f2; }
            .property-address { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .property-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            @media print { .property-details { grid-template-columns: 1fr 1fr 1fr; } }
            .detail-item { margin-bottom: 8px; }
            .detail-label { font-weight: bold; color: #666; }
            .target-badge { background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Property Roadtrip Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p>${allSelectedProperties.length} Properties Selected</p>
          </div>
          ${allSelectedProperties.map(prop => `
            <div class="property ${prop.isCenter ? 'target' : ''}">
              <div class="property-address">
                ${(prop.address_street || prop.address_full || 'Address not available').split(',')[0]}
                ${prop.isCenter ? '<span class="target-badge">TARGET PROPERTY</span>' : ''}
              </div>
              <div class="property-details">
                <div class="detail-item">
                  <span class="detail-label">Units:</span> ${prop.units_count || 'N/A'}
                </div>
                <div class="detail-item">
                  <span class="detail-label">Assessed Value:</span> $${prop.assessed_value ? (prop.assessed_value / 1000000).toFixed(2) : 'N/A'}M
                </div>
                <div class="detail-item">
                  <span class="detail-label">Estimated Value:</span> $${prop.estimated_value ? (prop.estimated_value / 1000000).toFixed(2) : 'N/A'}M
                </div>
                <div class="detail-item">
                  <span class="detail-label">Estimated Equity:</span> $${prop.estimated_equity ? (prop.estimated_equity / 1000000).toFixed(2) : 'N/A'}M
                </div>
                <div class="detail-item">
                  <span class="detail-label">Year Built:</span> ${prop.year_built || 'N/A'}
                </div>
                <div class="detail-item">
                  <span class="detail-label">Years Owned:</span> ${prop.years_owned || 'N/A'}
                </div>
                <div class="detail-item">
                  <span class="detail-label">Owner Name:</span> ${prop.owner_first_name || prop.owner_last_name ? `${prop.owner_first_name || ''} ${prop.owner_last_name || ''}`.trim() : 'N/A'}
                </div>
                <div class="detail-item">
                  <span class="detail-label">Owner Type:</span> ${
                    prop.out_of_state_absentee_owner ? 'Out-of-State Absentee' :
                    prop.in_state_absentee_owner ? 'In-State Absentee' :
                    prop.owner_occupied ? 'Owner Occupied' :
                    'N/A'
                  }
                </div>
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      
      // Close the print window after printing
      setTimeout(() => {
        printWindow.close();
      }, 1000); // Small delay to ensure print dialog has opened
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Property Roadtrip</h1>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">Loading Property Data</h2>
              <p className="text-gray-600">Fetching nearby properties...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Property Data</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                {/* Radius Selector */}
                <div className="mb-4">
                  <div className="flex items-end gap-3">
                    <div className="flex flex-col">
                      <label htmlFor="radius-select" className="text-sm font-medium text-gray-700 mb-2">
                        Search Radius
                      </label>
                      <select
                        id="radius-select"
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-20"
                      >
                        {[0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(miles => (
                          <option key={miles} value={miles}>
                            {miles}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex flex-col">
                      <label htmlFor="range-select" className="text-sm font-medium text-gray-700 mb-2">
                        Assd Range %
                      </label>
                      <select
                        id="range-select"
                        value={valueRangePercent}
                        onChange={(e) => setValueRangePercent(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-20"
                      >
                        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(percent => (
                          <option key={percent} value={percent}>
                            {percent}%
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={handleRadiusSearch}
                      disabled={isSearching}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Properties Found (max 50)</h2>
                    <p className="text-sm text-gray-600">{nearbyProperties.length} similar properties within {searchRadius} mile{searchRadius > 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={handlePrintToPDF}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Print selected properties to PDF"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {/* Target Property */}
                {centerProperty && (
                  <div 
                    className="p-4 border-b bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handlePropertyClick(centerProperty)}
                      >
                        <div className="flex items-center mb-1">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Target Property</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">{(centerProperty.address_street || centerProperty.address_full || 'Address not available').split(',')[0]}</p>
                        <div className="flex items-center text-xs text-gray-600 space-x-3">
                          <span>{centerProperty.units_count || 'N/A'} units</span>
                          <span>${centerProperty.assessed_value ? (centerProperty.assessed_value / 1000000).toFixed(2) : 'N/A'}M</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <input
                          type="checkbox"
                          checked={selectedForPrint.includes('center')}
                          onChange={() => togglePropertyForPrint('center')}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Nearby Properties */}
                {nearbyProperties.map((property) => (
                  <div 
                    key={property.id}
                    className="p-4 border-b hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handlePropertyClick(property)}
                      >
                        <div className="flex items-center mb-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                          <span className="text-xs text-gray-500">
                            {centerProperty && property.latitude && property.longitude && centerProperty.latitude && centerProperty.longitude
                              ? `${calculateDistance(centerProperty.latitude, centerProperty.longitude, property.latitude, property.longitude).toFixed(1)} miles away`
                              : 'Distance N/A'
                            }
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">{(property.address_street || property.address_full || 'Address not available').split(',')[0]}</p>
                        <div className="flex items-center text-xs text-gray-600 space-x-3">
                          <span>{property.units_count || 'N/A'} units</span>
                          <span>${property.assessed_value ? (property.assessed_value / 1000000).toFixed(2) : 'N/A'}M</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <input
                          type="checkbox"
                          checked={selectedForPrint.includes(property.id)}
                          onChange={() => togglePropertyForPrint(property.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border h-96 lg:h-[600px] relative">
              <div className="absolute top-4 left-4 z-10 bg-white px-3 py-2 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span>Target Property</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span>Similar Properties</span>
                  </div>
                </div>
              </div>
              
              <div className="relative w-full h-full">
                {!mapLoaded && (
                  <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading Mapbox map...</p>
                      {!mapboxgl.accessToken && (
                        <p className="text-red-500 text-sm mt-2">Mapbox token not configured</p>
                      )}
                    </div>
                  </div>
                )}
                <div 
                  ref={mapRef}
                  className="w-full h-full rounded-lg"
                  style={{ minHeight: '400px' }}
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Property Modal */}
      {selectedProperty && (
        <PropertyModal 
          property={selectedProperty}
          onClose={handleCloseModal}
        />
      )}
      
      {/* Alert Component */}
      {AlertComponent}
    </div>
  );
}

export default function RoadtripPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Loading Roadtrip</h2>
          <p className="text-gray-600">Preparing your property journey...</p>
        </div>
      </div>
    }>
      <RoadtripContent />
    </Suspense>
  );
}