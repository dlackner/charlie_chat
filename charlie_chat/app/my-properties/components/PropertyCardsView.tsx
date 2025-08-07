"use client";

import { Heart, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { performSkipTrace } from './skipTraceIntegration';
import { PageSavedProperty as SavedProperty } from '../types';


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
    const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
    const [cardSides, setCardSides] = useState<{ [key: string]: 'front' | 'back' | 'contact' }>({});
    const [notesModalOpen, setNotesModalOpen] = useState<string | null>(null);
    const [localNotes, setLocalNotes] = useState<{ [key: string]: string }>({});
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

    // Helper function to get skip trace button state
    const getSkipTraceButtonState = (property: SavedProperty) => {
        const hasData = !!property.skipTraceData;
        const hasBeenAttempted = !!property.last_skip_trace;
        const canTrace = canSkipTrace ? canSkipTrace(property) : true;
        
        
        if (hasData) {
            // Has data - show "Skip Traced", allow re-run if >6 months
            return { 
                text: 'Skip Traced', 
                disabled: !canTrace,
                icon: 'checked'
            };
        } else if (hasBeenAttempted && !canTrace) {
            // Was attempted but no data found, and within 6 months
            return { 
                text: 'No Skip Trace Data Found', 
                disabled: true,
                icon: 'disabled'
            };
        } else {
            // Never attempted OR >6 months old attempt
            return { 
                text: 'Skip Trace', 
                disabled: false,
                icon: 'unchecked'
            };
        }
    };

    const calculateAge = (yearBuilt: number) => {
        return new Date().getFullYear() - yearBuilt;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const handleCardClick = (propertyId: string, event: React.MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('button')) {
            return;
        }

        setCardSides(prev => {
            const currentSide = prev[propertyId] || 'front';
            let nextSide: 'front' | 'back' | 'contact';

            // Cycle through sides: front -> back -> contact -> front
            switch (currentSide) {
                case 'front':
                    nextSide = 'back';
                    break;
                case 'back':
                    // Only go to contact side if skip trace data exists
                    const property = properties.find(p => p.property_id === propertyId);
                    nextSide = property?.skipTraceData ? 'contact' : 'front';
                    break;
                case 'contact':
                    nextSide = 'front';
                    break;
                default:
                    nextSide = 'front';
            }

            return { ...prev, [propertyId]: nextSide };
        });
    };

    const getInvestmentFlags = (property: SavedProperty) => {
        const flags = [];
        if (property.auction) flags.push('Auction');
        if (property.reo) flags.push('REO');
        if (property.tax_lien) flags.push('Tax Lien');
        if (property.pre_foreclosure) flags.push('Pre-Foreclosure');
        if (property.private_lender) flags.push('Private Lender');
        if (property.out_of_state_absentee_owner) flags.push('Absentee Owner');
        return flags;
    };

    const handleNotesChange = (propertyId: string, notes: string) => {
        setLocalNotes(prev => ({ ...prev, [propertyId]: notes }));
    };

    const saveNotes = (propertyId: string) => {
        const notes = getCurrentNotes({ property_id: propertyId } as SavedProperty);
        if (onUpdateNotes) {
            onUpdateNotes(propertyId, notes);
        }
        setNotesModalOpen(null);
    };

    const getCurrentNotes = (property: SavedProperty) => {
        return localNotes[property.property_id] !== undefined
            ? localNotes[property.property_id]
            : property.notes || '';
    };

    const truncateNotes = (notes: string, maxLength: number = 40) => {
        if (!notes) return '';
        return notes.length > maxLength ? notes.substring(0, maxLength) + '...' : notes;
    };

    // Handle showing confirmation tooltip
    const handleShowRemoveConfirm = (propertyId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setConfirmRemove(propertyId);
    };

    // Handle confirming removal
    const handleConfirmRemove = (propertyId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        onRemoveFromFavorites(propertyId);
        setConfirmRemove(null);
    };

    // Handle canceling removal
    const handleCancelRemove = (event: React.MouseEvent) => {
        event.stopPropagation();
        setConfirmRemove(null);
    };

    // Handle skip trace button click
    const handleSkipTrace = async (propertyId: string, property: SavedProperty, event: React.MouseEvent) => {
        event.stopPropagation();

        try {
            const skipData = await performSkipTrace(property);

            // Update local card view to show contact side
            setCardSides(prev => ({
                ...prev,
                [propertyId]: 'contact'
            }));

            // Notify parent component if callback exists
            if (onSkipTrace) {
                onSkipTrace(propertyId, property);
            }

} catch (err: any) {
    let friendlyMessage = 'Skip trace failed - please try again';
    
    if (err?.message) {
        const errorText = err.message.toLowerCase();
        
        if (errorText.includes('unable to locate valid property') || 
            errorText.includes('address(es) provided')) {
            friendlyMessage = 'No skip trace data available - property address not found in database';
        } else if (errorText.includes('no phones found') || 
                   errorText.includes('no contact information')) {
            friendlyMessage = 'No contact information available for this owner';
        } else if (errorText.includes('skip‑trace failed') || 
                   errorText.includes('proxy error')) {
            friendlyMessage = 'Skip trace service temporarily unavailable - please try again later';
        } else {
            friendlyMessage = err.message;
        }
    }
    
    // Call parent's error handler to update database and state
    if (onSkipTraceError) {
        onSkipTraceError(propertyId, friendlyMessage);
    } else {
        // Fallback if no error handler provided
        console.error('Skip trace failed:', friendlyMessage);
        alert(friendlyMessage);
    }
}
    };

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
        <>
            <div className="grid grid-cols-3 gap-4">
                {properties.map((property) => {
                    const currentSide = cardSides[property.property_id] || 'front';
                    const isSelected = selectedProperties.has(property.property_id);
                    const showingConfirm = confirmRemove === property.property_id;
                    const investmentFlags = getInvestmentFlags(property);
                    const hasSkipTrace = !!property.skipTraceData;

                    return (
                        <div
                            key={property.property_id}
                            className={`relative bg-white rounded-lg border shadow-sm cursor-pointer transition-all ${isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : hasSkipTrace
                                    ? 'border-3 border-blue-400'  // Blue border for skip traced
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                            style={{
                                minHeight: '200px'
                            }}
                            onClick={(e) => handleCardClick(property.property_id, e)}
                        >
                            {/* FRONT SIDE */}
                            {currentSide === 'front' && (
                                <div className="p-3">
                                    <div className="flex gap-3">
                                        {/* Left side - Property details */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        <div className="truncate">
                                                            {property.address_street || (property.address_full ? property.address_full.split(',')[0]?.trim() : '')}
                                                        </div>
                                                        <div className="text-xs text-gray-600 truncate">
                                                            {[property.address_city, property.address_state, property.address_zip].filter(Boolean).join(', ')}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Heart icon with tooltip confirmation */}
                                                <div className="relative ml-2 flex-shrink-0">
                                                    {!showingConfirm ? (
                                                        <button
                                                            onClick={(e) => handleShowRemoveConfirm(property.property_id, e)}
                                                            className="p-1"
                                                            title="Remove from favorites"
                                                        >
                                                            <Heart size={14} className="text-red-500 fill-current" />
                                                        </button>
                                                    ) : (
                                                        <div className="absolute right-0 top-0 bg-white border border-gray-300 rounded-lg shadow-lg px-2 py-1 z-10 whitespace-nowrap">
                                                            <span className="text-xs text-gray-700 mr-2">Remove?</span>
                                                            <button
                                                                onClick={(e) => handleConfirmRemove(property.property_id, e)}
                                                                className="text-xs bg-red-600 text-white px-2 py-1 rounded mr-1 hover:bg-red-700"
                                                            >
                                                                Yes
                                                            </button>
                                                            <button
                                                                onClick={handleCancelRemove}
                                                                className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1 text-xs text-gray-600 mb-3">
                                                <div className="flex">
                                                    <span>Units:&nbsp;</span>
                                                    <span className="font-medium">{property.units_count}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Built:&nbsp;</span>
                                                    <span className="font-medium">{property.year_built} ({calculateAge(property.year_built)} years old)</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Assessed:&nbsp;</span>
                                                    <span className="font-medium text-green-600">{formatCurrency(property.assessed_value)}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Est. Equity:&nbsp;</span>
                                                    <span className="font-medium text-blue-600">{formatCurrency(property.estimated_equity)}</span>
                                                </div>
                                            </div>

                                            {/* Investment flags with consistent spacing */}
                                            <div className="mb-2 min-h-[24px]">
                                                {investmentFlags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {investmentFlags.map(flag => (
                                                            <span
                                                                key={flag}
                                                                className="inline-block px-1 py-0.5 text-xs rounded bg-orange-100 text-orange-800"
                                                            >
                                                                {flag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Fixed position select and skip trace buttons */}
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleSelection(property.property_id);
                                                    }}
                                                    className="flex items-center space-x-1"
                                                    title="Select"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare size={20} className="text-blue-600" />
                                                    ) : (
                                                        <Square size={20} className="text-gray-400" />
                                                    )}
                                                    <span className="text-xs text-gray-600">Select</span>
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        const buttonState = getSkipTraceButtonState(property);
                                                        if (!buttonState.disabled) {
                                                            handleSkipTrace(property.property_id, property, e);
                                                        }
                                                    }}
                                                    className={`flex items-center space-x-1 ${getSkipTraceButtonState(property).disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    title="Skip Trace"
                                                    disabled={getSkipTraceButtonState(property).disabled}
                                                >
                                                    {(() => {
                                                        const buttonState = getSkipTraceButtonState(property);
                                                        switch (buttonState.icon) {
                                                            case 'checked':
                                                                return <CheckSquare size={20} className="text-blue-600" />;
                                                            case 'disabled':
                                                                return null; // No icon for "No Skip Trace Data Found"
                                                            case 'unchecked':
                                                            default:
                                                                return <Square size={20} className="text-gray-400" />;
                                                        }
                                                    })()}
                                                    <span className="text-xs text-gray-600">{getSkipTraceButtonState(property).text}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Right side - Notes */}
                                        <div className="w-32 flex-shrink-0 min-w-0">
                                            <div className="bg-gray-50 rounded border p-2 h-[120px] relative">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-gray-700 truncate">Notes</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setNotesModalOpen(property.property_id);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600 ml-1"
                                                        title="Open notes editor"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setNotesModalOpen(property.property_id);
                                                    }}
                                                    className="text-xs text-gray-600 cursor-pointer h-20 overflow-hidden"
                                                >
                                                    {getCurrentNotes(property) ? (
                                                        <span>{truncateNotes(getCurrentNotes(property))}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Click to add notes...</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BACK SIDE */}
                            {currentSide === 'back' && (
                                <div className="p-3">
                                    <div className="mb-3">
                                        <h4 className="text-xs font-medium text-gray-800 mb-1">Current Ownership</h4>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                                            <div className="flex">
                                                <span>Last Sale:&nbsp;</span>
                                                <span className="font-medium">{formatDate(property.last_sale_date)}</span>
                                            </div>
                                            <div className="flex">
                                                <span>Years Owned:&nbsp;</span>
                                                <span className="font-medium">{property.years_owned}</span>
                                            </div>
                                            <div className="flex">
                                                <span>Out-of-State Owner:&nbsp;</span>
                                                <span className="font-medium">{property.out_of_state_absentee_owner ? 'Yes' : 'No'}</span>
                                            </div>
                                            <div className="flex">
                                                <span>Last Sale Amount:&nbsp;</span>
                                                <span className="font-medium">{formatCurrency(property.assessed_value)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <h4 className="text-xs font-medium text-gray-800 mb-1">Property Flags</h4>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                                            <div className="flex">
                                                <span>Assumable:&nbsp;</span>
                                                <span className="font-medium">No</span>
                                            </div>
                                            <div className="flex">
                                                <span>REO:&nbsp;</span>
                                                <span className="font-medium">{property.reo ? 'Yes' : 'No'}</span>
                                            </div>
                                            <div className="flex">
                                                <span>Auction:&nbsp;</span>
                                                <span className="font-medium">{property.auction ? 'Yes' : 'No'}</span>
                                            </div>
                                            <div className="flex">
                                                <span>Tax Lien:&nbsp;</span>
                                                <span className="font-medium">{property.tax_lien ? 'Yes' : 'No'}</span>
                                            </div>
                                            <div className="flex">
                                                <span>Pre-Foreclosure:&nbsp;</span>
                                                <span className="font-medium">{property.pre_foreclosure ? 'Yes' : 'No'}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* CONTACT SIDE */}
                            {currentSide === 'contact' && hasSkipTrace && (
                                <div className="p-3">
                                    <h4 className="text-xs font-medium text-gray-800 mb-2 text-center">
                                        Skip Trace Results
                                    </h4>

                                    {/* Name and Age on same line */}
                                    <div className="text-xs text-gray-600 mb-2">
                                        <span className="font-medium">Name:&nbsp;</span>
                                        {property.skipTraceData?.name}
                                        {property.skipTraceData?.age && (
                                            <span>&nbsp;• Age: {property.skipTraceData.age}</span>
                                        )}
                                    </div>

                                    {/* Phones - more compact */}
                                    {(property.skipTraceData?.phone1Label || property.skipTraceData?.phone2Label) && (
                                        <div className="mb-2 text-xs text-gray-600">
                                            <span className="font-medium">Phones:</span>
                                            {property.skipTraceData?.phone1Label && (
                                                <div className="text-xs">{property.skipTraceData.phone1Label}</div>
                                            )}
                                            {property.skipTraceData?.phone2Label && (
                                                <div className="text-xs">{property.skipTraceData.phone2Label}</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Email */}
                                    {property.skipTraceData?.email && (
                                        <div className="mb-2 text-xs text-gray-600">
                                            <span className="font-medium">Email:&nbsp;</span>
                                            <span className="font-medium">{property.skipTraceData.email}</span>
                                        </div>
                                    )}

                                    {/* Address */}
                                    {property.skipTraceData?.currentAddress && (
                                        <div className="mb-2 text-xs text-gray-600">
                                            <span className="font-medium">Current Address:&nbsp;</span>
                                            <span className="font-medium">{property.skipTraceData.currentAddress}</span>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Notes Modal */}
                {notesModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Property Notes</h3>
                                <button
                                    onClick={() => setNotesModalOpen(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <textarea
                                value={getCurrentNotes(properties.find(p => p.property_id === notesModalOpen) || {} as SavedProperty)}
                                onChange={(e) => handleNotesChange(notesModalOpen, e.target.value)}
                                placeholder="Add your thoughts about this property..."
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                autoFocus
                            />

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setNotesModalOpen(null)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => saveNotes(notesModalOpen)}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Notes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};