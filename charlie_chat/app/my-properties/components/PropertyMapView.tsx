"use client";

import { PageSavedProperty as SavedProperty } from '../types';
import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo } from 'react';
import { Heart, CheckSquare, Square, Info, DollarSign } from "lucide-react";
import { ProcessedRentData, getRentColorQuintiles } from './rentDataProcessor';

// Dynamically import the Mapbox component to avoid SSR issues
const MapboxMap = dynamic(() => import('./MapboxMapComponent'), {
    ssr: false,
    loading: () => (
        <div className="h-[600px] bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    )
});

interface PropertyMapViewProps {
    properties: SavedProperty[];
    selectedProperties: Set<string>;
    onToggleSelection: (propertyId: string) => void;
    onRemoveFromFavorites: (propertyId: string) => void;
    onStartSearching: () => void;
    onUpdateNotes?: (propertyId: string, notes: string) => void;
    onSkipTrace?: (propertyId: string, property: SavedProperty) => void;
    isLoading: boolean;
    rentData?: ProcessedRentData[];
}

export const PropertyMapView: React.FC<PropertyMapViewProps> = (props) => {
    const [hiddenProperties, setHiddenProperties] = useState<Set<string>>(new Set());
    const [showRentOverlay, setShowRentOverlay] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);


    // Type guard function
    const hasValidCoordinates = (p: SavedProperty): p is SavedProperty & { latitude: number; longitude: number } => {
        return typeof p.latitude === 'number' && typeof p.longitude === 'number';
    };

    const visibleProperties = props.properties
        .filter(hasValidCoordinates)
        .filter(p => !hiddenProperties.has(p.property_id));


    // Calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Enhanced properties with rent data
const propertiesWithRentData = useMemo(() => {
    if (!props.rentData || props.rentData.length === 0) return visibleProperties;

    return visibleProperties.map(property => {
        // Find the closest metro area with rent data
        let closestMetro: ProcessedRentData | null = null;
        let minDistance = Infinity;

        for (const metro of props.rentData!) {
            if (metro.latitude && metro.longitude) {
                const distance = calculateDistance(
                    property.latitude,
                    property.longitude,
                    metro.latitude,
                    metro.longitude
                );
                const searchRadius = metro.radius || 25;
                if (distance < minDistance && distance <= searchRadius) {
                    minDistance = distance;
                    closestMetro = metro;
                }
            }
        }

        return {
            ...property,
            nearestMetro: closestMetro,
            distanceToMetro: closestMetro ? minDistance : null,
            marketRent: closestMetro ? closestMetro.averageRent : null
        };
    });
}, [visibleProperties, props.rentData]);

    const hideProperty = (propertyId: string) => {
        setHiddenProperties(prev => new Set([...prev, propertyId]));
    };

    const showAllProperties = () => {
        setHiddenProperties(new Set());
    };

    const handlePropertySelect = (propertyId: string | null) => {
        setSelectedPropertyId(propertyId);
    };

    const toggleRentOverlay = () => {
        setShowRentOverlay(prev => !prev);
    };

    // Get rent statistics with quintile breakpoints
    const rentStats = useMemo(() => {
        if (!props.rentData) return null;
        const rents = props.rentData.map(d => d.averageRent).filter(r => r > 0);
        const sorted = rents.sort((a, b) => a - b);

        const calculatePercentile = (sortedArray: number[], percentile: number): number => {
            const index = (percentile / 100) * (sortedArray.length - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index % 1;

            if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
            return Math.round(sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight);
        };

        return {
            min: Math.min(...rents),
            max: Math.max(...rents),
            avg: rents.reduce((a, b) => a + b, 0) / rents.length,
            median: sorted[Math.floor(sorted.length / 2)],
            quintileBreakpoints: {
                p20: calculatePercentile(sorted, 20),
                p40: calculatePercentile(sorted, 40),
                p60: calculatePercentile(sorted, 60),
                p80: calculatePercentile(sorted, 80)
            }
        };
    }, [props.rentData]);

    // Get rent color based on fixed quintiles (no longer needs stats)
    const getRentColor = (rent: number): string => {
        return getRentColorQuintiles(rent);
    };

    if (props.isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (props.properties.length === 0) {
        return (
            <div className="text-center py-12">
                <Heart size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Saved Yet</h3>
                <p className="text-gray-600 mb-6">
                    Start building your investment portfolio by saving properties from your searches.
                </p>
                <button
                    onClick={props.onStartSearching}
                    className="text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-colors"
                    style={{ backgroundColor: '#1C599F' }}
                >
                    Start Searching Properties
                </button>
            </div>
        );
    }

    // Transform properties to match Mapbox component format
    const mapboxProperties = propertiesWithRentData.map(p => ({
        id: p.property_id,
        address: p.address_full || p.address_street || '',
        city: p.address_city,
        state: p.address_state,
        zip: p.address_zip || '',
        latitude: p.latitude,
        longitude: p.longitude,
        units: p.units_count,
        year_built: p.year_built,
        assessed_total: p.assessed_value,
        estimated_equity: p.estimated_equity,
        market_rent: (p as any).marketRent || null,
        investment_flags: {
            auction: p.auction,
            reo: p.reo,
            tax_lien: p.tax_lien,
            pre_foreclosure: p.pre_foreclosure,
            distressed: false,
            high_equity: p.estimated_equity > 100000,
            wholesale: false,
            motivated_seller: p.out_of_state_absentee_owner
        },
        skip_trace_completed: !!p.last_skip_trace,
        hidden: false
    }));

    // Transform rent data to match Mapbox component format
    const mapboxRentData = props.rentData?.map((r, index) => {
        // Calculate quintile based on rent amount
        let quintile = 5;
        if (r.averageRent < 1000) quintile = 1;
        else if (r.averageRent < 1400) quintile = 2;
        else if (r.averageRent < 1800) quintile = 3;
        else if (r.averageRent < 2400) quintile = 4;
        
        return {
            id: `rent-${index}`,
            msa_name: r.RegionName,
            latitude: r.latitude || 0,
            longitude: r.longitude || 0,
            average_rent: r.averageRent,
            yoy_change: typeof r.yoyPercent === 'number' ? r.yoyPercent : parseFloat(r.yoyPercent as string) || 0,
            market_rank: r.sizeRank,
            radius_miles: r.radius || 25,
            quintile: quintile
        };
    }) || [];

    return (
        <div className="h-[600px] relative">
            <MapboxMap
                properties={mapboxProperties}
                rentData={mapboxRentData}
                showRentOverlay={showRentOverlay}
                hiddenPropertyIds={hiddenProperties}
                onHideProperty={hideProperty}
                onShowAllProperties={showAllProperties}
                selectedPropertyId={selectedPropertyId}
                onPropertySelect={handlePropertySelect}
                onToggleRentOverlay={toggleRentOverlay}
            />
        </div>
    );
};