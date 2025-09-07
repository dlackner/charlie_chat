'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// Set your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZGxhY2tuZXIiLCJhIjoiY21mYThxOGltMTdmMDJqbjFuNzNobmc1biJ9.8wvp5uSS8hT5BmhiyGuTMg';

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  units?: number;
  year_built?: number;
  assessed_total?: number;
  estimated_equity?: number;
  market_rent?: number;
  rent_per_sqft?: number;
  investment_flags?: {
    auction?: boolean;
    reo?: boolean;
    tax_lien?: boolean;
    pre_foreclosure?: boolean;
    distressed?: boolean;
    high_equity?: boolean;
    wholesale?: boolean;
    motivated_seller?: boolean;
  };
  skip_trace_completed?: boolean;
  hidden?: boolean;
}

interface RentData {
  id: string;
  msa_name: string;
  latitude: number;
  longitude: number;
  average_rent: number;
  yoy_change: number;
  market_rank: number;
  radius_miles: number;
  quintile: number;
}

interface MapboxMapComponentProps {
  properties: Property[];
  rentData: RentData[];
  showRentOverlay: boolean;
  hiddenPropertyIds: Set<string>;
  onHideProperty: (propertyId: string) => void;
  onShowAllProperties: () => void;
  selectedPropertyId?: string | null;
  onPropertySelect?: (propertyId: string | null) => void;
  onToggleRentOverlay: () => void;
}

const MAPBOX_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12'
};

const RENT_COLORS = {
  1: '#10b981', // Green - Under $1,000
  2: '#06b6d4', // Light Blue - $1,000-$1,399
  3: '#6b7280', // Gray - $1,400-$1,799
  4: '#fb923c', // Orange - $1,800-$2,399
  5: '#ef4444'  // Red - $2,400+
};

export default function MapboxMapComponent({
  properties,
  rentData,
  showRentOverlay,
  hiddenPropertyIds,
  onHideProperty,
  onShowAllProperties,
  selectedPropertyId,
  onPropertySelect,
  onToggleRentOverlay
}: MapboxMapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popups = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const [currentStyle, setCurrentStyle] = useState('streets');
  const [showClusters, setShowClusters] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true); // Enable by default
  const [heatmapType, setHeatmapType] = useState<'equity' | 'value'>('equity');
  const draw = useRef<MapboxDraw | null>(null);
  const [selectedArea, setSelectedArea] = useState<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Calculate center
    const visibleProperties = properties.filter(p => !hiddenPropertyIds.has(p.id));
    if (visibleProperties.length === 0) return;

    const avgLat = visibleProperties.reduce((sum, p) => sum + p.latitude, 0) / visibleProperties.length;
    const avgLng = visibleProperties.reduce((sum, p) => sum + p.longitude, 0) / visibleProperties.length;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLES.streets,
      center: [avgLng, avgLat],
      zoom: 10,
      pitch: 0,
      bearing: 0,
      maxBounds: [[-130, 24], [-65, 50]] // USA bounds
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Map loaded handler
    map.current.on('load', () => {
      if (!map.current) return;

      // Fit bounds to show all properties after map loads
      if (visibleProperties.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        visibleProperties.forEach(p => {
          bounds.extend([p.longitude, p.latitude]);
        });
        
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1000,
          maxZoom: 12 // Don't zoom in too close if there's only one property
        });
      }

      // Add property source for clustering
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: properties.filter(p => !hiddenPropertyIds.has(p.id)).map(property => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [property.longitude, property.latitude]
          },
          properties: {
            id: property.id,
            address: property.address,
            city: property.city,
            state: property.state,
            assessed_total: property.assessed_total,
            estimated_equity: property.estimated_equity
          }
        }))
      };

      map.current.addSource('properties', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Add cluster layers
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'properties',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            10,
            '#f1f075',
            25,
            '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            30,
            25,
            40
          ]
        }
      });

      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'properties',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      });

      // Add unclustered point layer
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#3b82f6',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Add click event for clusters
      map.current.on('click', 'clusters', (e) => {
        if (!map.current) return;
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current.getSource('properties') as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;

          const coordinates = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.current.easeTo({
            center: coordinates,
            zoom: zoom || 10
          });
        });
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add property markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current.clear();
    popups.current.clear();

    // Add markers for visible properties
    properties.forEach(property => {
      if (hiddenPropertyIds.has(property.id)) return;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'mapbox-custom-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = selectedPropertyId === property.id ? '#ef4444' : '#3b82f6';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.transition = 'box-shadow 0.2s ease, border 0.2s ease';
      
      // Add hover effect with just shadow and border changes
      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        el.style.border = '4px solid white';
        el.style.zIndex = '1000';
      });
      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.border = '3px solid white';
        el.style.zIndex = '1';
      });

      // Create popup content
      const popupHTML = `
        <div style="padding: 10px; max-width: 300px;">
          <h3 style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">
            ${property.address}
          </h3>
          <p style="margin: 5px 0; color: #666; font-size: 12px;">
            ${property.city}, ${property.state} ${property.zip}
          </p>
          ${property.units ? `<p style="margin: 5px 0; font-size: 12px;"><strong>Units:</strong> ${property.units}</p>` : ''}
          ${property.year_built ? `<p style="margin: 5px 0; font-size: 12px;"><strong>Year Built:</strong> ${property.year_built}</p>` : ''}
          ${property.assessed_total ? `<p style="margin: 5px 0; font-size: 12px;"><strong>Assessed Value:</strong> $${property.assessed_total.toLocaleString()}</p>` : ''}
          ${property.estimated_equity ? `<p style="margin: 5px 0; font-size: 12px;"><strong>Est. Equity:</strong> $${property.estimated_equity.toLocaleString()}</p>` : ''}
          ${property.market_rent ? `<p style="margin: 5px 0; font-size: 12px;"><strong>Market Rent:</strong> $${property.market_rent.toLocaleString()}</p>` : ''}
          
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
            ${property.investment_flags ? `
              <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                ${property.investment_flags.auction ? '<span style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Auction</span>' : ''}
                ${property.investment_flags.reo ? '<span style="background: #f97316; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">REO</span>' : ''}
                ${property.investment_flags.tax_lien ? '<span style="background: #eab308; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Tax Lien</span>' : ''}
                ${property.investment_flags.pre_foreclosure ? '<span style="background: #a855f7; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Pre-Foreclosure</span>' : ''}
                ${property.investment_flags.high_equity ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">High Equity</span>' : ''}
              </div>
            ` : ''}
            
            <div style="display: flex; gap: 10px; justify-content: space-between; align-items: center;">
              <a href="https://maps.google.com/?q=${encodeURIComponent(property.address + ', ' + property.city + ', ' + property.state)}" 
                 target="_blank" 
                 style="color: #3b82f6; text-decoration: none; font-size: 12px;">
                View on Google Maps →
              </a>
              <button onclick="window.hidePropertyFromMap && window.hidePropertyFromMap('${property.id}')" 
                      style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                Hide
              </button>
            </div>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(popupHTML);

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center'
      })
        .setLngLat([property.longitude, property.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Add click handler for selection
      el.addEventListener('click', () => {
        onPropertySelect?.(property.id);
        // Fly to property with smooth animation
        map.current?.flyTo({
          center: [property.longitude, property.latitude],
          zoom: 16,
          pitch: 0,
          bearing: 0,
          duration: 1500,
          essential: true
        });
      });

      markers.current.set(property.id, marker);
      popups.current.set(property.id, popup);
    });

    // Set up window function for hiding properties
    (window as any).hidePropertyFromMap = (propertyId: string) => {
      onHideProperty(propertyId);
    };

  }, [properties, hiddenPropertyIds, selectedPropertyId, onPropertySelect, onHideProperty]);

  // Add rent overlay
  useEffect(() => {
    if (!map.current) return;

    const addRentOverlay = () => {
      if (!map.current) return;
      
      const sourceId = 'rent-overlay';
      const layerId = 'rent-overlay-layer';
      const layerIdBorder = 'rent-overlay-border';

      // Remove existing layers and source
      if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
      if (map.current.getLayer(layerIdBorder)) map.current.removeLayer(layerIdBorder);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

      if (!showRentOverlay || !rentData.length) return;

    // Create GeoJSON for rent data
    const rentGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: rentData.map(rent => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [rent.longitude, rent.latitude]
        },
        properties: {
          ...rent,
          color: RENT_COLORS[rent.quintile as keyof typeof RENT_COLORS] || '#6b7280'
        }
      }))
    };

    // Add source
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: rentGeoJSON
    });

    // Add fill layer
    map.current.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, ['*', ['get', 'radius_miles'], 0.5],
          12, ['*', ['get', 'radius_miles'], 2],
          16, ['*', ['get', 'radius_miles'], 8]
        ],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.3
      }
    });

    // Add border layer
    map.current.addLayer({
      id: layerIdBorder,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, ['*', ['get', 'radius_miles'], 0.5],
          12, ['*', ['get', 'radius_miles'], 2],
          16, ['*', ['get', 'radius_miles'], 8]
        ],
        'circle-color': 'transparent',
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-opacity': 0.8
      }
    });

    // Add popup on click
    map.current.on('click', layerId, (e) => {
      if (!map.current || !e.features?.[0]) return;
      
      const properties = e.features[0].properties;
      if (!properties) return;
      
      const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div style="padding: 10px;">
            <h3 style="margin: 0 0 10px 0; font-weight: bold;">${properties.msa_name || 'Unknown'}</h3>
            <p style="margin: 5px 0;"><strong>Avg Rent:</strong> $${properties.average_rent?.toLocaleString() || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>YoY Change:</strong> ${properties.yoy_change ? properties.yoy_change.toFixed(1) + '%' : 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Market Rank:</strong> #${properties.market_rank || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Radius:</strong> ${properties.radius_miles ? properties.radius_miles.toFixed(1) + ' miles' : 'N/A'}</p>
          </div>
        `)
        .addTo(map.current);
    });

      // Change cursor on hover
      map.current.on('mouseenter', layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    };

    // If map style is already loaded, add the overlay immediately
    if (map.current.isStyleLoaded()) {
      addRentOverlay();
    } else {
      // Otherwise wait for the style to load
      map.current.once('style.load', addRentOverlay);
    }

    // Clean up event listener on unmount
    return () => {
      if (map.current) {
        map.current.off('style.load', addRentOverlay);
      }
    };
  }, [showRentOverlay, rentData]);

  // Add heat map visualization
  useEffect(() => {
    if (!map.current) return;

    const addHeatmap = () => {
      if (!map.current) return;
      
      const sourceId = 'property-heatmap';
      const layerId = 'heatmap-layer';

      // Remove existing layer and source
      if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

      if (!showHeatmap || properties.length === 0) return;

    // Create GeoJSON for heatmap with better normalization
    const heatmapData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: properties.filter(p => !hiddenPropertyIds.has(p.id)).map(property => {
        const value = heatmapType === 'equity' 
          ? property.estimated_equity || 0 
          : property.assessed_total || 0;
        
        // Better normalization for weight with more contrast
        const normalizedWeight = heatmapType === 'equity'
          ? Math.min(Math.max(value / 100000, 0.1), 1) // Equity: 0-100k range, min 0.1
          : Math.min(Math.max(value / 300000, 0.1), 1); // Value: 0-300k range, min 0.1
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [property.longitude, property.latitude]
          },
          properties: {
            weight: normalizedWeight,
            value: value
          }
        };
      })
    };

    // Add source
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: heatmapData
    });

    // Add heatmap layer with much better visibility
    // Add as one of the first layers so it's definitely below markers
    const layers = map.current.getStyle().layers || [];
    // Find a road layer to add above (so heat map is below roads but above base)
    const roadLayerId = layers.find(
      layer => layer.id.includes('road') || layer.id.includes('street')
    )?.id;
    
    map.current.addLayer({
      id: layerId,
      type: 'heatmap',
      source: sourceId,
      paint: {
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 1,
          10, 1.5,
          14, 2,
          18, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.1, 'rgba(0,255,0,0.3)',
          0.2, 'rgba(0,255,100,0.4)',
          0.3, 'rgba(0,255,200,0.5)',
          0.4, 'rgba(0,200,255,0.6)',
          0.5, 'rgba(0,100,255,0.7)',
          0.6, 'rgba(100,0,255,0.8)',
          0.7, 'rgba(200,0,255,0.9)',
          0.8, 'rgba(255,0,200,0.95)',
          0.9, 'rgba(255,0,100,1)',
          1, 'rgba(255,0,0,1)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 30,
          8, 40,
          10, 50,
          12, 60,
          14, 80,
          16, 100
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 0.9,
          10, 0.8,
          14, 0.7,
          18, 0.6
        ]
      }
    }, roadLayerId); // Add above road layer if found

      console.log(`Heatmap added with ${heatmapData.features.length} properties, type: ${heatmapType}`);
    };

    // If map style is already loaded, add the heatmap immediately
    if (map.current.isStyleLoaded()) {
      addHeatmap();
    } else {
      // Otherwise wait for the style to load
      map.current.once('style.load', addHeatmap);
    }

    // Clean up event listener on unmount
    return () => {
      if (map.current) {
        map.current.off('style.load', addHeatmap);
      }
    };
  }, [showHeatmap, heatmapType, properties, hiddenPropertyIds]);

  // Initialize drawing tools
  useEffect(() => {
    if (!map.current) return;

    // Initialize MapboxDraw
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
      defaultMode: 'simple_select'
    });

    map.current.addControl(draw.current, 'top-right');

    // Handle area selection
    const handleCreate = (e: any) => {
      const data = draw.current?.getAll();
      if (data && data.features.length > 0) {
        const feature = data.features[0];
        setSelectedArea(feature);
        
        // Check if it's a polygon
        if (feature.geometry.type === 'Polygon') {
          // Calculate properties within the selected area
          const propertiesInArea = properties.filter(property => {
            if (hiddenPropertyIds.has(property.id)) return false;
            
            const point = turf.point([property.longitude, property.latitude]);
            const polygon = feature as GeoJSON.Feature<GeoJSON.Polygon>;
            return turf.booleanPointInPolygon(point, polygon);
          });

          console.log(`Found ${propertiesInArea.length} properties in selected area`);
          
          // You can add a callback here to handle the selected properties
          // onPropertiesSelected?.(propertiesInArea);
        }
      }
    };

    const handleDelete = () => {
      setSelectedArea(null);
    };

    map.current.on('draw.create', handleCreate);
    map.current.on('draw.update', handleCreate);
    map.current.on('draw.delete', handleDelete);

    return () => {
      if (map.current && draw.current) {
        map.current.off('draw.create', handleCreate);
        map.current.off('draw.update', handleCreate);
        map.current.off('draw.delete', handleDelete);
        map.current.removeControl(draw.current);
      }
    };
  }, [properties, hiddenPropertyIds]);

  // Handle style changes
  const handleStyleChange = (style: string) => {
    if (!map.current) return;
    setCurrentStyle(style);
    map.current.setStyle(MAPBOX_STYLES[style as keyof typeof MAPBOX_STYLES]);
  };


  // Fit bounds to show all properties
  const fitBounds = () => {
    if (!map.current) return;
    
    const visibleProperties = properties.filter(p => !hiddenPropertyIds.has(p.id));
    if (visibleProperties.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    visibleProperties.forEach(p => {
      bounds.extend([p.longitude, p.latitude]);
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000
    });
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Custom Controls Panel */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
        {/* Compact Style Switcher - Streets and Satellite only */}
        <div>
          <select
            value={currentStyle}
            onChange={(e) => handleStyleChange(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white"
          >
            <option value="streets">Streets</option>
            <option value="satellite">Satellite</option>
          </select>
        </div>

        {/* Toggle Controls */}
        <div className="space-y-2 pt-2 border-t">
          <button
            onClick={onToggleRentOverlay}
            className={`w-full px-2 py-1 text-xs rounded transition-colors ${
              showRentOverlay ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Rent: {showRentOverlay ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`w-full px-2 py-1 text-xs rounded transition-colors ${
              showHeatmap ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Heat: {showHeatmap ? 'ON' : 'OFF'}
          </button>

          {showHeatmap && (
            <select
              value={heatmapType}
              onChange={(e) => setHeatmapType(e.target.value as 'equity' | 'value')}
              className="w-full px-2 py-1 text-xs rounded border border-gray-300"
            >
              <option value="equity">Equity</option>
              <option value="value">Value</option>
            </select>
          )}

          <button
            onClick={fitBounds}
            className="w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Fit All
          </button>

          {hiddenPropertyIds.size > 0 && (
            <button
              onClick={onShowAllProperties}
              className="w-full px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            >
              Show ({hiddenPropertyIds.size})
            </button>
          )}
        </div>

        {/* Compact Rent Legend */}
        {showRentOverlay && (
          <div className="pt-2 border-t">
            <label className="block text-[10px] font-semibold text-gray-700 mb-1">Rent</label>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px]">&lt;$1k</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                <span className="text-[10px]">$1-1.4k</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <span className="text-[10px]">$1.4-1.8k</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                <span className="text-[10px]">$1.8-2.4k</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[10px]">$2.4k+</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Property Count Badge */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg px-2 py-1">
        <p className="text-xs font-semibold">
          {properties.filter(p => !hiddenPropertyIds.has(p.id)).length} Props
        </p>
      </div>
    </div>
  );
}