"use client";

import { PageSavedProperty as SavedProperty } from '../types';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Heart, CheckSquare, Square } from "lucide-react";

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
}

export const PropertyMapView: React.FC<PropertyMapViewProps> = (props) => {
    const [hiddenProperties, setHiddenProperties] = useState<Set<string>>(new Set());

    console.log('PropertyMapView received props.properties:', props.properties.length);
    console.log('Properties:', props.properties);

      // Or create a type guard function:
    const hasValidCoordinates = (p: SavedProperty): p is SavedProperty & { latitude: number; longitude: number } => {
        return typeof p.latitude === 'number' && typeof p.longitude === 'number';
    };

    const visibleProperties = props.properties
        .filter(hasValidCoordinates)
        .filter(p => !hiddenProperties.has(p.property_id));
    console.log('Visible properties after filtering:', visibleProperties.length);

    const hideProperty = (propertyId: string) => {
        setHiddenProperties(prev => new Set([...prev, propertyId]));
    };

    const showAllProperties = () => {
        setHiddenProperties(new Set());
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
            {hiddenProperties.size > 0 && (
                <div className="absolute top-4 left-4 z-[1000]">
                    <button
                        onClick={showAllProperties}
                        className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Show All Properties ({hiddenProperties.size} hidden)
                    </button>
                </div>
            )}

            <DynamicMap
                properties={visibleProperties}
                selectedProperties={props.selectedProperties}
                onToggleSelection={props.onToggleSelection}
                hideProperty={hideProperty}
            />
        </div>
    );
};