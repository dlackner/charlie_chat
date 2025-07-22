"use client";

import { PageSavedProperty as SavedProperty } from '../types';
import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo } from 'react';
import { Heart, CheckSquare, Square, Info, DollarSign } from "lucide-react";
import { ProcessedRentData, getRentColorQuintiles } from './rentDataProcessor';

// Dynamically import the map component to avoid SSR issues
const DynamicMap = dynamic(() => import('./DynamicMapComponent'), {
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
    const [showRentOverlay, setShowRentOverlay] = useState(false);

    console.log('PropertyMapView received props.properties:', props.properties.length);
    console.log('Properties:', props.properties);

    // Type guard function
    const hasValidCoordinates = (p: SavedProperty): p is SavedProperty & { latitude: number; longitude: number } => {
        return typeof p.latitude === 'number' && typeof p.longitude === 'number';
    };

    const visibleProperties = props.properties
        .filter(hasValidCoordinates)
        .filter(p => !hiddenProperties.has(p.property_id));

    console.log('Visible properties after filtering:', visibleProperties.length);

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

    return (
        <div className="h-[600px] relative">
            {/* Map Controls */}
            <div className="absolute top-4 left-4 z-[1000] space-y-2">
                {hiddenProperties.size > 0 && (
                    <button
                        onClick={showAllProperties}
                        className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 block w-full"
                    >
                        Show All Properties ({hiddenProperties.size} hidden)
                    </button>
                )}

                {props.rentData && props.rentData.length > 0 && (
                    <button
                        onClick={() => setShowRentOverlay(!showRentOverlay)}
                        className={`px-3 py-2 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 transition-colors ${showRentOverlay
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <DollarSign size={14} />
                        {showRentOverlay ? 'Hide' : 'Show'} Rent Data
                    </button>
                )}
            </div>

            {/* Fixed Market-Based Quintile Legend */}
            {showRentOverlay && (
                <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Average Rent (Market Segments)</h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
                            <span className="text-xs text-gray-600">Q1: Very Low Cost (Under $1,000)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0EA5E9' }}></div>
                            <span className="text-xs text-gray-600">Q2: Low Cost ($1,000-$1,399)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6B7280' }}></div>
                            <span className="text-xs text-gray-600">Q3: Moderate Cost ($1,400-$1,799)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
                            <span className="text-xs text-gray-600">Q4: High Cost ($1,800-$2,399)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DC2626' }}></div>
                            <span className="text-xs text-gray-600">Q5: Very High Cost ($2,400+)</span>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                        Rental data available for 489 MSAs
                    </div>
                </div>
            )}

            <DynamicMap
                properties={propertiesWithRentData}
                selectedProperties={props.selectedProperties}
                onToggleSelection={props.onToggleSelection}
                hideProperty={hideProperty}
                showRentOverlay={showRentOverlay}
                rentData={props.rentData}
                getRentColor={getRentColor}
            />
        </div>
    );
};