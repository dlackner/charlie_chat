"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, ExternalLink } from 'lucide-react';
import { Listing } from '@/components/ui/listingTypes';
import { getRentalData, getRentalRateForCity, getYoyChangeForCity } from '@/lib/rentalData';

interface Market {
    name: string;
    msa_name?: string;
    properties: Listing[];
}

interface WeeklyRecommendationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    markets: Market[];
    onFavoriteProperty: (propertyId: string) => void;
    onDismissProperty: (propertyId: string) => void;
}

export const WeeklyRecommendationsModal: React.FC<WeeklyRecommendationsModalProps> = ({
    isOpen,
    onClose,
    markets,
    onFavoriteProperty,
    onDismissProperty,
}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [propertyIndex, setPropertyIndex] = useState<{ [key: number]: number }>({});
    const [dismissedProperties, setDismissedProperties] = useState<Set<string>>(new Set());
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackReason, setFeedbackReason] = useState('');
    const [cardSides, setCardSides] = useState<{ [key: string]: 'front' | 'back' }>({});
    const [loadingStates, setLoadingStates] = useState<{ [key: string]: 'favoriting' | 'dismissing' | null }>({});
    const [actionConfirmations, setActionConfirmations] = useState<{ [key: string]: 'favorited' | 'dismissed' | null }>({});
    const [rentalData, setRentalData] = useState<{ [cityState: string]: { monthlyRate: number; yoyChange: string; } }>({});

    // Initialize property indices for each tab
    useEffect(() => {
        if (markets.length > 0) {
            const initialIndices: { [key: number]: number } = {};
            markets.forEach((_, index) => {
                initialIndices[index] = 0;
            });
            setPropertyIndex(initialIndices);
        }
    }, [markets]);

    // Load rental data when modal opens
    useEffect(() => {
        if (isOpen) {
            getRentalData().then(setRentalData);
        }
    }, [isOpen]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(0);
            setDismissedProperties(new Set());
            setShowFeedback(false);
            setFeedbackReason('');
            setCardSides({});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const currentMarket = markets[activeTab];
    const currentPropertyIndex = propertyIndex[activeTab] || 0;
    const currentProperty = currentMarket?.properties[currentPropertyIndex];

    const handleClose = () => {
        if (dismissedProperties.size > 0) {
            setShowFeedback(true);
        } else {
            onClose();
        }
    };

    const handleFeedbackSubmit = () => {
        // Handle feedback submission here
        console.log('Feedback reason:', feedbackReason);
        onClose();
    };

    const handleDismiss = async (propertyId: string) => {
        // Set loading state
        setLoadingStates(prev => ({ ...prev, [propertyId]: 'dismissing' }));
        
        try {
            setDismissedProperties(prev => new Set(prev).add(propertyId));
            onDismissProperty(propertyId);
            
            // Show confirmation
            setActionConfirmations(prev => ({ ...prev, [propertyId]: 'dismissed' }));
            
            // Move to next property after a brief delay
            setTimeout(() => {
                const currentMarketIndex = activeTab;
                const currentIndex = propertyIndex[currentMarketIndex] || 0;
                const marketProperties = markets[currentMarketIndex].properties;
                
                if (currentIndex < marketProperties.length - 1) {
                    setPropertyIndex(prev => ({
                        ...prev,
                        [currentMarketIndex]: currentIndex + 1
                    }));
                }
                
                // Clear states
                setLoadingStates(prev => ({ ...prev, [propertyId]: null }));
                setActionConfirmations(prev => ({ ...prev, [propertyId]: null }));
            }, 1500);
        } catch (error) {
            console.error('Error dismissing property:', error);
            setLoadingStates(prev => ({ ...prev, [propertyId]: null }));
        }
    };

    const handleFavorite = async (propertyId: string) => {
        // Set loading state
        setLoadingStates(prev => ({ ...prev, [propertyId]: 'favoriting' }));
        
        try {
            onFavoriteProperty(propertyId);
            
            // Show confirmation
            setActionConfirmations(prev => ({ ...prev, [propertyId]: 'favorited' }));
            
            // Move to next property after a brief delay
            setTimeout(() => {
                const currentMarketIndex = activeTab;
                const currentIndex = propertyIndex[currentMarketIndex] || 0;
                const marketProperties = markets[currentMarketIndex].properties;
                
                if (currentIndex < marketProperties.length - 1) {
                    setPropertyIndex(prev => ({
                        ...prev,
                        [currentMarketIndex]: currentIndex + 1
                    }));
                }
                
                // Clear states
                setLoadingStates(prev => ({ ...prev, [propertyId]: null }));
                setActionConfirmations(prev => ({ ...prev, [propertyId]: null }));
            }, 1500);
        } catch (error) {
            console.error('Error favoriting property:', error);
            setLoadingStates(prev => ({ ...prev, [propertyId]: null }));
        }
    };

    const navigateProperty = (direction: 'prev' | 'next') => {
        const currentIndex = propertyIndex[activeTab] || 0;
        const maxIndex = currentMarket.properties.length - 1;
        
        let newIndex = currentIndex;
        if (direction === 'prev' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (direction === 'next' && currentIndex < maxIndex) {
            newIndex = currentIndex + 1;
        }
        
        setPropertyIndex(prev => ({
            ...prev,
            [activeTab]: newIndex
        }));
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
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

    const handleCardClick = (propertyId: string, event: React.MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('button')) {
            return;
        }

        setCardSides(prev => {
            const currentSide = prev[propertyId] || 'front';
            const nextSide = currentSide === 'front' ? 'back' : 'front';
            return { ...prev, [propertyId]: nextSide };
        });
    };

    const getGoogleMapsLink = (property: Listing): string => {
        const address = property.address_street || property.address_full || property.address?.address || '';
        const city = property.address_city || property.address?.city || '';
        const state = property.address_state || property.address?.state || '';
        const fullAddress = `${address}, ${city}, ${state}`.trim();
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    };

    // Feedback modal
    if (showFeedback) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">Help us improve your recommendations</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        In general, what made some properties less appealing?
                    </p>
                    <select
                        value={feedbackReason}
                        onChange={(e) => setFeedbackReason(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md mb-4"
                    >
                        <option value="">Select a reason (optional)</option>
                        <option value="too-expensive">Too expensive</option>
                        <option value="wrong-location">Wrong location/area</option>
                        <option value="wrong-units">Too many/few units</option>
                        <option value="condition-concerns">Property condition concerns</option>
                        <option value="other">Other</option>
                    </select>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={handleFeedbackSubmit}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Skip
                        </button>
                        <button
                            onClick={handleFeedbackSubmit}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Your Weekly Recommendations</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex overflow-x-auto">
                        {markets.map((market, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveTab(index)}
                                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                                    activeTab === index
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {market.name} ({market.properties.length})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {currentMarket && currentProperty ? (
                        <>
                            {/* Property Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={() => navigateProperty('prev')}
                                    disabled={currentPropertyIndex === 0}
                                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={20} />
                                    <span>Previous</span>
                                </button>
                                
                                <span className="text-sm text-gray-600">
                                    Property {currentPropertyIndex + 1} of {currentMarket.properties.length}
                                </span>
                                
                                <button
                                    onClick={() => navigateProperty('next')}
                                    disabled={currentPropertyIndex === currentMarket.properties.length - 1}
                                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {/* Property Card with Front/Back Views */}
                            <div 
                                className="bg-white rounded-lg border border-gray-200 p-3 mb-4 cursor-pointer hover:border-gray-300 transition-colors relative"
                                onClick={(e) => handleCardClick(currentProperty.id, e)}
                                style={{ minHeight: '180px' }}
                            >
                                {/* FRONT SIDE */}
                                {(cardSides[currentProperty.id] || 'front') === 'front' && (
                                    <>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="text-lg font-medium text-gray-900 mb-1">
                                                    {currentProperty.address_street || currentProperty.address_full || currentProperty.address?.address}
                                                </div>
                                            </div>
                                            
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDismiss(currentProperty.id);
                                                }}
                                                className="text-gray-400 hover:text-gray-600 ml-4"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* Two column layout for front side */}
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            {/* Left column - Basic property info */}
                                            <div className="space-y-1 text-xs text-gray-600">
                                                <div className="flex">
                                                    <span>Units:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.units_count || 'N/A'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Built:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.year_built ? `${currentProperty.year_built} (${calculateAge(currentProperty.year_built)} years old)` : 'N/A'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Assessed:&nbsp;</span>
                                                    <span className="font-medium text-green-600">{formatCurrency(currentProperty.assessed_value)}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Est. Equity:&nbsp;</span>
                                                    <span className="font-medium text-blue-600">{formatCurrency(currentProperty.estimated_equity)}</span>
                                                </div>
                                            </div>

                                            {/* Right column - Market data */}
                                            <div className="space-y-1 text-xs text-gray-600">
                                                <div className="flex">
                                                    <span>Average Rent:&nbsp;</span>
                                                    <span className="font-medium text-green-600">
                                                        {getRentalRateForCity(
                                                            currentProperty.address_city || '', 
                                                            currentProperty.address_state || '', 
                                                            rentalData
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex">
                                                    <span>YoY Change:&nbsp;</span>
                                                    <span className="font-medium">
                                                        {getRentalRateForCity(
                                                            currentProperty.address_city || '', 
                                                            currentProperty.address_state || '', 
                                                            rentalData
                                                        ) !== "None available" ? getYoyChangeForCity(
                                                            currentProperty.address_city || '', 
                                                            currentProperty.address_state || '', 
                                                            rentalData
                                                        ) : ""}
                                                    </span>
                                                </div>
                                                <div className="flex items-center mt-1">
                                                    <a 
                                                        href={getGoogleMapsLink(currentProperty)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 flex items-center text-xs"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink size={10} className="mr-1" />
                                                        View on Google Maps
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Page indicator dots for front side */}
                                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                        </div>
                                    </>
                                )}

                                {/* BACK SIDE */}
                                {cardSides[currentProperty.id] === 'back' && (
                                    <>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="text-lg font-medium text-gray-900 mb-1">
                                                    Property Details
                                                </div>
                                            </div>
                                            
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDismiss(currentProperty.id);
                                                }}
                                                className="text-gray-400 hover:text-gray-600 ml-4"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* Two column layout for back side */}
                                        <div className="grid grid-cols-2 gap-4 mb-2">
                                            {/* Left column - Ownership details */}
                                            <div className="space-y-1 text-xs text-gray-600">
                                                <div className="flex">
                                                    <span>Last Sale:&nbsp;</span>
                                                    <span className="font-medium">{formatDate(currentProperty.last_sale_date || '')}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Years Owned:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.years_owned || 'N/A'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Out-of-State-Owner:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.out_of_state_absentee_owner ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Last Sale Amount:&nbsp;</span>
                                                    <span className="font-medium">{formatCurrency(currentProperty.last_sale_amount || currentProperty.assessed_value)}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>MLS Active:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.mls_active ? 'Yes' : 'No'}</span>
                                                </div>
                                            </div>

                                            {/* Right column - Distress indicators */}
                                            <div className="space-y-1 text-xs text-gray-600">
                                                <div className="flex">
                                                    <span>REO:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.reo ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Tax Lien:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.tax_lien ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Auction:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.auction ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Pre-Foreclosure:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.pre_foreclosure ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span className="whitespace-nowrap">Flood Zone:&nbsp;</span>
                                                    <span className="font-medium">
                                                        {currentProperty.flood_zone ? 'Yes' : 'No'}
                                                        {currentProperty.flood_zone_description && `; ${currentProperty.flood_zone_description}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Page indicator dots for back side */}
                                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-600">No properties available for this market.</p>
                        </div>
                    )}
                </div>

                {/* Action Buttons at bottom of modal */}
                {currentProperty && (
                    <div className="border-t border-gray-200 p-2 flex justify-center space-x-1.5">
                        <button
                            onClick={() => handleFavorite(currentProperty.id)}
                            disabled={loadingStates[currentProperty.id] === 'favoriting'}
                            className={`flex items-center space-x-0.5 px-2 py-1 rounded text-xs transition-all duration-200 transform ${
                                actionConfirmations[currentProperty.id] === 'favorited'
                                    ? 'bg-green-500 text-white scale-105'
                                    : loadingStates[currentProperty.id] === 'favoriting'
                                    ? 'bg-orange-500 text-white scale-110'
                                    : 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-105'
                            }`}
                        >
                            {actionConfirmations[currentProperty.id] === 'favorited' ? (
                                <>
                                    <span>✓</span>
                                    <span>Added!</span>
                                </>
                            ) : (
                                <>
                                    <Heart size={12} />
                                    <span>Add to Favorites</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => handleDismiss(currentProperty.id)}
                            disabled={loadingStates[currentProperty.id] === 'dismissing'}
                            className={`flex items-center space-x-0.5 px-2 py-1 rounded text-xs transition-all duration-200 transform ${
                                actionConfirmations[currentProperty.id] === 'dismissed'
                                    ? 'bg-green-500 text-white scale-105'
                                    : loadingStates[currentProperty.id] === 'dismissing'
                                    ? 'bg-gray-500 text-white scale-110'
                                    : 'bg-gray-500 text-white hover:bg-gray-600 hover:scale-105'
                            }`}
                        >
                            {actionConfirmations[currentProperty.id] === 'dismissed' ? (
                                <>
                                    <span>✓</span>
                                    <span>Dismissed!</span>
                                </>
                            ) : (
                                <>
                                    <X size={12} />
                                    <span>Not Interested</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};