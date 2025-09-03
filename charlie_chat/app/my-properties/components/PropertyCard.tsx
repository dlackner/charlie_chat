import React, { useState } from 'react';
import { Heart, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { PageSavedProperty as SavedProperty } from '../types';
import { FavoriteStatus, STATUS_OPTIONS } from '../constants';
import { StreetViewImage } from '../../../components/ui/StreetViewImage';

export interface PropertyCardProps {
    property: SavedProperty;
    selectedProperties: Set<string>;
    onToggleSelection: (propertyId: string) => void;
    onRemoveFromFavorites: (propertyId: string) => void;
    onUpdateNotes?: (propertyId: string, notes: string) => void;
    onSkipTrace?: (propertyId: string, property: SavedProperty) => void;
    canSkipTrace?: (property: SavedProperty) => boolean;
    onSkipTraceError?: (propertyId: string, error: string) => void;
    onStatusChange?: (propertyId: string, status: FavoriteStatus | null) => void;
    openStatusDropdown?: string | null;
    onStatusDropdownToggle?: (propertyId: string, isOpen: boolean) => void;
    
    // Market assignment
    onMarketChange?: (propertyId: string, marketKey: string | null) => void;
    userMarkets?: Array<{ market_key: string; market_name: string }>;
    openMarketDropdown?: string | null;
    onMarketDropdownToggle?: (propertyId: string, isOpen: boolean) => void;
    
    // Display configuration
    displayMode?: 'grid' | 'modal' | 'list';
    showStreetView?: boolean;
    showSelection?: boolean;
    showSkipTrace?: boolean;
    showRemoveFavorite?: boolean;
    className?: string;
    
    // Card behavior
    clickable?: boolean;
    onCardClick?: (property: SavedProperty) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    selectedProperties,
    onToggleSelection,
    onRemoveFromFavorites,
    onUpdateNotes,
    onSkipTrace,
    canSkipTrace,
    onSkipTraceError,
    onStatusChange,
    openStatusDropdown,
    onStatusDropdownToggle,
    onMarketChange,
    userMarkets = [],
    openMarketDropdown,
    onMarketDropdownToggle,
    displayMode = 'grid',
    showStreetView = true,
    showSelection = true,
    showSkipTrace = true,
    showRemoveFavorite = true,
    className = '',
    clickable = true,
    onCardClick
}) => {
    const [cardSide, setCardSide] = useState<'front' | 'back' | 'contact'>('front');
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    const [localNotes, setLocalNotes] = useState(property.notes || '');
    const [confirmRemove, setConfirmRemove] = useState(false);

    // Helper functions
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

    const getSkipTraceButtonState = () => {
        const hasData = !!property.skipTraceData;
        const hasBeenAttempted = !!property.last_skip_trace;
        const canTrace = canSkipTrace ? canSkipTrace(property) : true;
        
        if (hasData) {
            return { 
                text: 'Skip Traced', 
                disabled: !canTrace,
                icon: 'checked'
            };
        } else if (hasBeenAttempted && !canTrace) {
            return { 
                text: 'No Data Found', 
                disabled: true,
                icon: 'disabled'
            };
        } else {
            return { 
                text: 'Skip Trace', 
                disabled: false,
                icon: 'unchecked'
            };
        }
    };

    const handleSkipTrace = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSkipTrace || !canSkipTrace || !canSkipTrace(property)) return;
        
        try {
            onSkipTrace(property.property_id, property);
        } catch (error: any) {
            const friendlyMessage = error?.message || 'Skip trace failed - please try again';
            if (onSkipTraceError) {
                onSkipTraceError(property.property_id, friendlyMessage);
            }
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        
        if (clickable && onCardClick) {
            onCardClick(property);
        } else if (cardSide === 'front') {
            setCardSide('back');
        } else if (cardSide === 'back') {
            // If has skip trace data, go to contact page, otherwise go back to front
            setCardSide(hasSkipTrace ? 'contact' : 'front');
        } else {
            // From contact page, go back to front
            setCardSide('front');
        }
    };

    const handleShowRemoveConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmRemove(true);
    };

    const handleConfirmRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemoveFromFavorites(property.property_id);
        setConfirmRemove(false);
    };

    const handleCancelRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmRemove(false);
    };

    const handleNotesUpdate = () => {
        if (onUpdateNotes) {
            onUpdateNotes(property.property_id, localNotes);
        }
        setNotesModalOpen(false);
    };

    const handleStatusChange = (status: FavoriteStatus | null) => {
        if (onStatusChange) {
            onStatusChange(property.property_id, status);
        }
        if (onStatusDropdownToggle) {
            onStatusDropdownToggle(property.property_id, false);
        }
    };

    const handleMarketChange = (marketKey: string | null) => {
        if (onMarketChange) {
            onMarketChange(property.property_id, marketKey);
        }
        if (onMarketDropdownToggle) {
            onMarketDropdownToggle(property.property_id, false);
        }
    };

    const getStatusDisplay = () => {
        if (!property.favorite_status) {
            return 'Set Status';
        }
        const option = STATUS_OPTIONS.find(opt => opt.value === property.favorite_status);
        return option?.label || property.favorite_status;
    };

    const getMarketDisplay = () => {
        if (!property.market_key) {
            return 'Set Market';
        }
        const market = userMarkets.find(m => m.market_key === property.market_key);
        return market?.market_name || property.market_key;
    };

    // Component state
    const isSelected = selectedProperties.has(property.property_id);
    const hasSkipTrace = !!property.skipTraceData;
    const investmentFlags = getInvestmentFlags(property);
    const skipTraceState = getSkipTraceButtonState();
    const isStatusDropdownOpen = openStatusDropdown === property.property_id;
    const isMarketDropdownOpen = openMarketDropdown === property.property_id;

    // Base card styles
    const cardStyles = `
        relative bg-white rounded-lg border shadow-sm transition-all
        ${isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : hasSkipTrace 
                ? 'border-3 border-blue-400' 
                : 'border-gray-200 hover:border-gray-300'
        }
        ${clickable ? 'cursor-pointer' : ''}
        ${className}
    `;

    const containerHeight = displayMode === 'modal' ? 'auto' : 'min-h-[200px]';

    return (
        <div 
            className={cardStyles}
            style={{ [containerHeight.split('-')[0]]: containerHeight.split('-')[1] }}
            onClick={handleCardClick}
            data-property-id={property.property_id}
        >
            {/* FRONT SIDE */}
            {cardSide === 'front' && (
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

                                {/* Heart icon with recommendation type indicator and tooltip confirmation */}
                                {showRemoveFavorite && (
                                    <div className="relative ml-2 flex-shrink-0">
                                        {!confirmRemove ? (
                                            <button
                                                onClick={handleShowRemoveConfirm}
                                                className="p-1 relative"
                                                title={`Remove from favorites${property.recommendation_type ? ` (${property.recommendation_type === 'manual' ? 'Manually added' : 'Algorithm recommendation'})` : ''}`}
                                            >
                                                <div className="relative inline-block">
                                                    <Heart size={18} className="text-red-500 fill-current" />
                                                    {/* Recommendation type indicator inside heart */}
                                                    {property.recommendation_type && (
                                                        <span 
                                                            className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white -mt-0.5"
                                                        >
                                                            {property.recommendation_type === 'manual' ? 'M' : 'A'}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="absolute right-0 top-0 bg-white border border-gray-300 rounded-lg shadow-lg px-2 py-1 z-10 whitespace-nowrap">
                                                <span className="text-xs text-gray-700 mr-2">Remove?</span>
                                                <button
                                                    onClick={handleConfirmRemove}
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
                                )}
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

                            {/* Investment flags */}
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

                            {/* Action buttons - Single row: checkbox, status, market */}
                            <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    {/* Selection checkbox */}
                                    {showSelection && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleSelection(property.property_id);
                                            }}
                                            className="flex items-center"
                                            title="Select"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={18} className="text-blue-600" />
                                            ) : (
                                                <Square size={18} className="text-gray-400" />
                                            )}
                                        </button>
                                    )}

                                    {/* Status dropdown */}
                                    <div className="relative flex-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onStatusDropdownToggle) {
                                                    onStatusDropdownToggle(property.property_id, !isStatusDropdownOpen);
                                                }
                                            }}
                                            className="w-full flex items-center justify-between px-2 py-1 text-xs rounded transition-colors bg-gray-100 hover:bg-gray-200"
                                            title="Change status"
                                        >
                                            <span className="text-gray-700 truncate">{getStatusDisplay()}</span>
                                            <ChevronDown size={12} className="text-gray-500 flex-shrink-0 ml-1" />
                                        </button>

                                        {isStatusDropdownOpen && (
                                            <div className="absolute bottom-full left-0 mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                                <div className="py-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStatusChange(null);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Clear Status
                                                    </button>
                                                    <div className="border-t border-gray-200"></div>
                                                    {STATUS_OPTIONS.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStatusChange(option.value);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                                                property.favorite_status === option.value 
                                                                    ? 'bg-blue-50 text-blue-700' 
                                                                    : 'text-gray-700'
                                                            }`}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Market dropdown */}
                                    {onMarketChange && userMarkets.length > 0 && (
                                        <div className="relative flex-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onMarketDropdownToggle) {
                                                        onMarketDropdownToggle(property.property_id, !isMarketDropdownOpen);
                                                    }
                                                }}
                                                className="w-full flex items-center justify-between px-2 py-1 text-xs rounded transition-colors bg-gray-100 hover:bg-gray-200"
                                                title="Change market assignment"
                                            >
                                                <span className="text-gray-700 truncate">{getMarketDisplay()}</span>
                                                <ChevronDown size={12} className="text-gray-500 flex-shrink-0 ml-1" />
                                            </button>

                                            {isMarketDropdownOpen && (
                                                <div className="absolute bottom-full left-0 mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                                    <div className="py-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarketChange(null);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                        >
                                                            Clear Market
                                                        </button>
                                                        <div className="border-t border-gray-200"></div>
                                                        {userMarkets.map((market) => (
                                                            <button
                                                                key={market.market_key}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarketChange(market.market_key);
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                                                    property.market_key === market.market_key 
                                                                        ? 'bg-blue-50 text-blue-700' 
                                                                        : 'text-gray-700'
                                                                }`}
                                                            >
                                                                {market.market_name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right side - Street View */}
                        {showStreetView && (
                            <div className="w-32 flex-shrink-0 min-w-0">
                                <StreetViewImage
                                    address={`${property.address_street || property.address_full}, ${property.address_city}, ${property.address_state}`}
                                    latitude={property.latitude}
                                    longitude={property.longitude}
                                    className="h-[120px]"
                                    width={300}
                                    height={200}
                                />
                                {/* Skip trace button below image - with extra spacing for street view message */}
                                {showSkipTrace && onSkipTrace && (
                                    <button
                                        onClick={handleSkipTrace}
                                        disabled={skipTraceState.disabled}
                                        className="w-full mt-6 flex items-center justify-center space-x-1 px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200"
                                        title={skipTraceState.text}
                                    >
                                        {(() => {
                                            switch (skipTraceState.icon) {
                                                case 'checked':
                                                    return <CheckSquare size={12} className="text-green-600" />;
                                                case 'disabled':
                                                    return <Square size={12} className="text-gray-400" />;
                                                default:
                                                    return <Square size={12} className="text-blue-600" />;
                                            }
                                        })()}
                                        <span className="text-xs text-gray-600 whitespace-nowrap">{skipTraceState.text}</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* BACK SIDE - Property Details */}
            {cardSide === 'back' && (
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
                                <span>Auction:&nbsp;</span>
                                <span className="font-medium">{property.auction ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex">
                                <span>REO:&nbsp;</span>
                                <span className="font-medium">{property.reo ? 'Yes' : 'No'}</span>
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

                    {/* Notes section */}
                    <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-800 mb-1">Notes</h4>
                        <div 
                            className="text-xs text-gray-600 min-h-[40px] p-2 border border-gray-200 rounded cursor-pointer hover:border-gray-300"
                            onClick={(e) => {
                                e.stopPropagation();
                                setNotesModalOpen(true);
                            }}
                        >
                            {property.notes ? (
                                <div className="break-words">{property.notes}</div>
                            ) : (
                                <div className="italic text-gray-400">Add your notes and reminders here</div>
                            )}
                        </div>
                    </div>

                </div>
            )}

            {/* CONTACT/SKIP TRACE SIDE */}
            {cardSide === 'contact' && hasSkipTrace && (
                <div className="p-3">
                    <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-800 mb-2">Skip Trace Results</h4>
                        <div className="space-y-2 text-xs text-gray-600">
                            <div className="flex">
                                <span>Name:&nbsp;</span>
                                <span className="font-medium">{property.skipTraceData?.name || 'N/A'}</span>
                                {property.skipTraceData?.age && (
                                    <>
                                        <span>&nbsp;•&nbsp;Age:&nbsp;</span>
                                        <span className="font-medium">{property.skipTraceData.age}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-800 mb-2">Phones:</h4>
                        <div className="space-y-1 text-xs text-gray-600">
                            {property.skipTraceData?.phone1 && (
                                <div className="flex items-center">
                                    <span className="font-medium">{property.skipTraceData.phone1}</span>
                                    <span className="ml-1">• landline</span>
                                    {property.skipTraceData.phone1DNC && (
                                        <span className="ml-1 text-red-500">(DNC)</span>
                                    )}
                                </div>
                            )}
                            {property.skipTraceData?.phone2 && (
                                <div className="flex items-center">
                                    <span className="font-medium">{property.skipTraceData.phone2}</span>
                                    <span className="ml-1">• landline</span>
                                    {property.skipTraceData.phone2DNC && (
                                        <span className="ml-1 text-red-500">(DNC)</span>
                                    )}
                                </div>
                            )}
                            {!property.skipTraceData?.phone1 && !property.skipTraceData?.phone2 && (
                                <div className="text-gray-400 italic">No phone numbers found</div>
                            )}
                        </div>
                    </div>

                    {property.skipTraceData?.email && (
                        <div className="mb-3">
                            <span className="text-xs font-medium text-gray-800">Email: </span>
                            <span className="text-xs text-gray-600 font-medium">
                                {property.skipTraceData.email}
                            </span>
                        </div>
                    )}

                    {property.skipTraceData?.currentAddress && (
                        <div className="mb-3">
                            <span className="text-xs font-medium text-gray-800">Current Address: </span>
                            <span className="text-xs text-gray-600 font-medium">
                                {property.skipTraceData.currentAddress}
                            </span>
                        </div>
                    )}

                </div>
            )}

            {/* Notes Modal */}
            {notesModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setNotesModalOpen(false)}>
                    <div className="bg-white rounded-lg p-4 w-[500px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-medium mb-2">Property Notes</h3>
                        <p className="text-sm text-gray-500 mb-3">
                            Add reminders by including dates in your notes (e.g., "@12/25/24 call seller")
                        </p>
                        <textarea
                            value={localNotes}
                            onChange={(e) => setLocalNotes(e.target.value)}
                            placeholder="Add your notes about this property..."
                            className="w-full h-32 p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setNotesModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleNotesUpdate}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};