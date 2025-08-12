"use client";

import { Heart } from "lucide-react";
import { PageSavedProperty as SavedProperty } from '../types';
import { PropertyCard } from './PropertyCard';

interface PropertyCardsViewProps {
    properties: SavedProperty[];
    totalPropertiesCount: number;
    searchTerm: string;
    selectedProperties: Set<string>;
    onToggleSelection: (propertyId: string) => void;
    onRemoveFromFavorites: (propertyId: string) => void;
    onStartSearching: () => void;
    onUpdateNotes?: (propertyId: string, notes: string) => void;
    onSkipTrace?: (propertyId: string, property: SavedProperty) => void;
    onSkipTraceError?: (propertyId: string, error: string) => void;
    canSkipTrace?: (property: SavedProperty) => boolean;
    isLoading: boolean;
}

export const PropertyCardsView: React.FC<PropertyCardsViewProps> = ({
    properties,
    totalPropertiesCount,
    searchTerm,
    selectedProperties,
    onToggleSelection,
    onRemoveFromFavorites,
    onStartSearching,
    onUpdateNotes,
    onSkipTrace,
    onSkipTraceError,
    canSkipTrace,
    isLoading
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (properties.length === 0) {
        const hasSearchFilter = searchTerm.trim().length > 0;
        const hasOtherProperties = totalPropertiesCount > 0;
        
        return (
            <div className="text-center py-12">
                <Heart size={48} className="mx-auto text-gray-400 mb-4" />
                {hasSearchFilter && hasOtherProperties ? (
                    <>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Match Your Search</h3>
                        <p className="text-gray-600 mb-6">
                            You have {totalPropertiesCount} saved {totalPropertiesCount === 1 ? 'property' : 'properties'}, but none match "{searchTerm}". 
                            Try clearing your search to see all properties.
                        </p>
                    </>
                ) : (
                    <>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Saved Yet</h3>
                        <p className="text-gray-600 mb-6">
                            Start building your investment portfolio by saving properties from your searches.
                        </p>
                        <button
                            onClick={onStartSearching}
                            className="text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-colors"
                            style={{ backgroundColor: '#1C599F' }}
                        >
                            Start Searching Properties
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-4">
            {properties.map((property) => (
                <PropertyCard
                    key={property.property_id}
                    property={property}
                    selectedProperties={selectedProperties}
                    onToggleSelection={onToggleSelection}
                    onRemoveFromFavorites={onRemoveFromFavorites}
                    onUpdateNotes={onUpdateNotes}
                    onSkipTrace={onSkipTrace}
                    onSkipTraceError={onSkipTraceError}
                    canSkipTrace={canSkipTrace}
                    displayMode="grid"
                    showStreetView={true}
                    showSelection={true}
                    showSkipTrace={true}
                    showRemoveFavorite={true}
                    clickable={true}
                />
            ))}
        </div>
    );
};