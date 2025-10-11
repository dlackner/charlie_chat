import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckSquare, Square } from "lucide-react";
import 'leaflet/dist/leaflet.css';
import { MappableSavedProperty as SavedProperty } from '../types';


interface DynamicMapComponentProps {
    properties: any[];
    selectedProperties: Set<string>;
    onToggleSelection: (propertyId: string) => void;
    hideProperty: (propertyId: string) => void;
    showRentOverlay?: boolean;
    rentData?: any[];
    getRentColor?: (rent: number) => string;
}

const DynamicMapComponent: React.FC<DynamicMapComponentProps> = ({
    properties,
    selectedProperties,
    onToggleSelection,
    hideProperty,
    showRentOverlay = false,
    rentData = [],
    getRentColor
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const rentMarkersRef = useRef<any[]>([]);
    const hasInitializedBounds = useRef(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapId] = useState(() => `map-${Date.now()}-${Math.random().toString(36)}`);

    const initializeMap = useCallback(async () => {
        if (!mapRef.current || mapInstanceRef.current) return;

        try {
            const L = (await import('leaflet')).default;

            // Fix default markers
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });

            // Calculate center
            const centerLat = properties.length > 0
                ? properties.reduce((sum, p) => sum + p.latitude, 0) / properties.length
                : 40.4406;
            const centerLng = properties.length > 0
                ? properties.reduce((sum, p) => sum + p.longitude, 0) / properties.length
                : -79.9959;

            // Create map instance
            mapInstanceRef.current = L.map(mapRef.current, {
                center: [centerLat, centerLng],
                zoom: 11,
                zoomControl: true,
                attributionControl: true
            });

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);

            setIsMapReady(true);

            // Fit bounds to show all properties after map is initialized
            if (properties.length > 0) {
                const validProperties = properties.filter(p => p.latitude && p.longitude);

                if (validProperties.length === 1) {
                    mapInstanceRef.current.setView(
                        [validProperties[0].latitude, validProperties[0].longitude],
                        13
                    );
                } else if (validProperties.length > 1) {
                    const bounds = L.latLngBounds(
                        validProperties.map(p => [p.latitude, p.longitude])
                    );
                    mapInstanceRef.current.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 15
                    });
                }
            }
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }, [properties]);

    // Update rent overlay when showRentOverlay or rentData changes
    useEffect(() => {
        if (!isMapReady || !mapInstanceRef.current) return;

        const updateRentOverlay = async () => {
            try {
                const L = (await import('leaflet')).default;

                // Clear existing rent overlay markers
                rentMarkersRef.current.forEach(marker => {
                    if (marker && mapInstanceRef.current) {
                        mapInstanceRef.current.removeLayer(marker);
                    }
                });
                rentMarkersRef.current = [];

                // Add rent overlay if enabled
                if (showRentOverlay && rentData.length > 0) {

                    rentData.forEach(metro => {
                        if (!metro.latitude || !metro.longitude || !metro.averageRent) return;


                        // Convert miles to meters (1 mile = 1609.34 meters)
                        const msaRadiusMiles = metro.radius || 25;
                        const msaRadiusMeters = msaRadiusMiles * 1609.34;

                        // Create colored circle for each metro area with geographic radius
                        const color = getRentColor ? getRentColor(metro.averageRent) : '#3B82F6';

                        const circle = L.circle([metro.latitude, metro.longitude], {
                            radius: msaRadiusMeters,
                            fillColor: color,
                            color: '#ffffff',
                            weight: 3,
                            opacity: 1,
                            fillOpacity: 0.3
                        });

                        // Add popup with rent information
                        circle.bindPopup(`
                            <div style="padding: 8px;">
                                <div style="font-weight: 600; margin-bottom: 4px;">
                                    ${metro.RegionName}
                                </div>
                                <div style="font-size: 14px; color: #059669; font-weight: 500;">
                                    Average Rent: $${Math.round(metro.averageRent).toLocaleString()}/month
                                </div>
                                ${metro.yoyPercent ? `
                                    <div style="font-size: 12px; color: ${metro.yoyPercent >= 0 ? '#059669' : '#DC2626'}; font-weight: 500;">
                                        YoY Change: ${metro.yoyPercent > 0 ? '+' : ''}${metro.yoyPercent.toFixed(1)}%
                                    </div>
                                ` : ''}
                                <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
                                    Market Rank: #${metro.sizeRank}
                                </div>
                                <div style="font-size: 12px; color: #6B7280;">
                                    MSA Radius: ${metro.radius || 25} miles
                                </div>
                            </div>
                        `);

                        if (mapInstanceRef.current) {
                            circle.addTo(mapInstanceRef.current);
                        }
                        rentMarkersRef.current.push(circle);
                    });
                }
            } catch (error) {
                console.error('Error updating rent overlay:', error);
            }
        };

        updateRentOverlay();
    }, [isMapReady, showRentOverlay, rentData, getRentColor]);

    // Initialize map only once when component mounts
    useEffect(() => {
        if (typeof window !== 'undefined') {
            initializeMap();
        }

        return () => {
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {
                    // Ignore cleanup errors
                }
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Update markers when properties change
    useEffect(() => {
        if (!isMapReady || !mapInstanceRef.current) return;

        const updateMarkers = async () => {
            try {
                const L = (await import('leaflet')).default;


                // Clear existing markers
                markersRef.current.forEach(marker => {
                    mapInstanceRef.current.removeLayer(marker);
                });
                markersRef.current = [];

                // Add new markers
                properties.forEach((property, index) => {
                    if (!property.latitude || !property.longitude) {
                        return;
                    }

                    const marker = L.marker([property.latitude, property.longitude]);

                    // Add tooltip (hover)
                    marker.bindTooltip(`
    <div style="font-size: 14px;">
        ${property.address_full}<br>
        ${property.address_city}, ${property.address_state}
    </div>
`, { permanent: false, direction: 'top' });

                    // Add popup (click) - restored to original styling with market rent data
                    const hasSkipTrace = !!property.skipTraceData;
                    const popupContent = createPopupContent(property, hasSkipTrace);
                    marker.bindPopup(popupContent, { maxWidth: 320, minWidth: 300 });

                    marker.addTo(mapInstanceRef.current);
                    markersRef.current.push(marker);
                });

                // Fit bounds after adding all markers - only on initial load
                if (markersRef.current.length > 0 && !hasInitializedBounds.current) {
                    const group = L.featureGroup(markersRef.current);
                    mapInstanceRef.current.fitBounds(group.getBounds(), {
                        padding: [50, 50],
                        maxZoom: 15
                    });
                    hasInitializedBounds.current = true;
                }
            } catch (error) {
                console.error('Error updating markers:', error);
            }
        };

        updateMarkers();
    }, [properties, selectedProperties, isMapReady]);

    const calculateAge = (yearBuilt: number) => {
        return new Date().getFullYear() - yearBuilt;
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getInvestmentFlags = (property: SavedProperty) => {
        const flags = [];
        if (property.auction) flags.push('Auction');
        if (property.reo) flags.push('REO');
        if (property.pre_foreclosure) flags.push('Pre-Foreclosure');
        if (property.private_lender) flags.push('Private Lender');
        if (property.out_of_state_absentee_owner) flags.push('Absentee Owner');
        return flags;
    };

    const createPopupContent = (property: SavedProperty, hasSkipTrace: boolean) => {
        const investmentFlags = getInvestmentFlags(property);

        return `
            <div style="padding: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 500; color: #111827;">
                            ${property.address_full}
                        </div>
                        <div style="font-size: 12px; color: #6B7280;">
                            ${property.address_city}, ${property.address_state}
                        </div>
                        <div style="margin-top: 4px;">
                           <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address_full + ', ' + property.address_city + ', ' + property.address_state)}"
                               target="_blank" 
                               style="display: inline-flex; align-items: center; font-size: 11px; color: #2563EB; text-decoration: none; margin-top: 2px;"
                               title="View Property">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 3px;">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                </svg>
                                View Property
                            </a>
                        </div>
                    </div>
                    <button onclick="window.hideProperty?.('${property.property_id}')" 
                            style="margin-left: 8px; color: #EF4444; background: none; border: none; cursor: pointer;" 
                            title="Hide from map">
                        ✕
                    </button>
                </div>
                
                
                <div style="font-size: 12px; color: #6B7280; margin-bottom: 12px;">
                    <div>Units: <span style="font-weight: 500;">${property.units_count}</span></div>
                    <div>Built: <span style="font-weight: 500;">${property.year_built} (${calculateAge(property.year_built)} years old)</span></div>
                    <div>Assessed: <span style="font-weight: 500; color: #059669;">${formatCurrency(property.assessed_value)}</span></div>
                    <div>Est. Equity: <span style="font-weight: 500; color: #2563EB;">${formatCurrency(property.estimated_equity)}</span></div>
                    ${(property as any).marketRent ? `<div>Market Rent: <span style="font-weight: 500; color: #059669;">$${Math.round((property as any).marketRent).toLocaleString()}/month</span></div>` : ''}
                </div>
                
                ${investmentFlags.length > 0 ? `
                    <div style="margin-bottom: 8px;">
                        ${investmentFlags.map(flag => `
                            <span style="display: inline-block; padding: 2px 4px; font-size: 12px; background: #FED7AA; color: #9A3412; border-radius: 4px; margin-right: 4px;">
                                ${flag}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div style="padding-top: 8px; border-top: 1px solid #E5E7EB;">
                    ${hasSkipTrace ? '<span style="font-size: 12px; color: #2563EB; font-weight: 500;">Skip Traced</span>' : ''}
                </div>
            </div>
        `;
    };

    // Expose functions to window for popup callbacks
    useEffect(() => {
        (window as any).hideProperty = hideProperty;
        return () => {
            delete (window as any).hideProperty;
        };
    }, [hideProperty]);

    return (
        <div
            ref={mapRef}
            key={mapId}
            style={{ height: '100%', width: '100%' }}
        />
    );
};

export default DynamicMapComponent;