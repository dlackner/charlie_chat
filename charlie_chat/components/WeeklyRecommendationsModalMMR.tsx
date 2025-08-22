"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, ExternalLink, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

// Enhanced interfaces for MMR integration
interface MMRProperty {
    property_id: string;
    fit_score: number;
    diversity_score: number;
    total_score: number;
    selection_reasons: string[];
    // Property details from saved_properties
    address_street?: string;
    address_full?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    units_count?: number;
    year_built?: number;
    assessed_value?: number;
    estimated_value?: number;
    estimated_equity?: number;
    last_sale_date?: string;
    last_sale_amount?: number;
    years_owned?: number;
    out_of_state_absentee_owner?: boolean;
    mls_active?: boolean;
    reo?: boolean;
    tax_lien?: boolean;
    auction?: boolean;
    pre_foreclosure?: boolean;
    flood_zone?: boolean;
    flood_zone_description?: string;
}

interface RecommendationBatch {
    batch_id: string;
    user_id: string;
    week_start: string;
    lambda: number;
    total_candidates: number;
    recommendations: MMRProperty[];
}

interface WeeklyRecommendationsModalMMRProps {
    isOpen: boolean;
    onClose: () => void;
    forceRefresh?: boolean;
}

export const WeeklyRecommendationsModalMMR: React.FC<WeeklyRecommendationsModalMMRProps> = ({
    isOpen,
    onClose,
    forceRefresh = false,
}) => {
    const { user, supabase } = useAuth();
    const [recommendations, setRecommendations] = useState<MMRProperty[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [batchId, setBatchId] = useState<string | null>(null);
    const [lambda, setLambda] = useState(0.7);
    const [totalCandidates, setTotalCandidates] = useState(0);
    
    // UI state
    const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
    const [loadingStates, setLoadingStates] = useState<{ [key: string]: 'favoriting' | 'dismissing' | null }>({});
    const [actionConfirmations, setActionConfirmations] = useState<{ [key: string]: 'favorited' | 'dismissed' | null }>({});
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackReason, setFeedbackReason] = useState('');
    const [dismissedCount, setDismissedCount] = useState(0);

    // Load recommendations when modal opens
    useEffect(() => {
        if (isOpen && user) {
            loadRecommendations();
        }
    }, [isOpen, user, forceRefresh]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            setCardSide('front');
            setError(null);
            setActionConfirmations({});
            setLoadingStates({});
            setDismissedCount(0);
            setShowFeedback(false);
        }
    }, [isOpen]);

    const loadRecommendations = async () => {
        if (!user || !supabase) return;

        setLoading(true);
        setError(null);

        try {
            // First, try to get existing recommendations from this week
            const weekStart = getWeekStart(new Date());
            
            if (!forceRefresh) {
                const existingRecs = await loadExistingRecommendations(weekStart);
                if (existingRecs && existingRecs.length > 0) {
                    setRecommendations(existingRecs);
                    setLoading(false);
                    return;
                }
            }

            // Generate new recommendations using Edge Function
            const { data: functionResponse, error: functionError } = await supabase.functions.invoke('generate-recommendations', {
                body: { 
                    userId: user.id,
                    forceRefresh 
                }
            });

            if (functionError) {
                throw new Error(functionError.message);
            }

            if (!functionResponse.success) {
                throw new Error(functionResponse.error || 'Failed to generate recommendations');
            }

            // Set metadata
            setBatchId(functionResponse.batchId);
            setLambda(functionResponse.lambda);
            setTotalCandidates(functionResponse.totalCandidates);

            if (functionResponse.recommendationCount === 0) {
                setRecommendations([]);
                setError('No properties found matching your criteria. Consider expanding your buy box.');
                return;
            }

            // Load the full recommendation data
            const fullRecs = await loadRecommendationsByBatchId(functionResponse.batchId);
            setRecommendations(fullRecs);

        } catch (err: any) {
            setError(err.message || 'Failed to load recommendations');
            console.error('Error loading recommendations:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadExistingRecommendations = async (weekStart: string): Promise<MMRProperty[]> => {
        if (!user || !supabase) return [];

        const { data, error } = await supabase
            .from('user_favorites')
            .select(`
                recommendation_batch_id,
                fit_score,
                diversity_score,
                total_score,
                selection_reasons,
                saved_properties!inner (*)
            `)
            .eq('user_id', user.id)
            .eq('recommendation_type', 'algorithm')
            .eq('is_active', true)
            .gte('generated_at', weekStart)
            .order('saved_at', { ascending: true });

        if (error || !data || data.length === 0) return [];

        setBatchId(data[0].recommendation_batch_id);

        return data.map((item: any) => ({
            property_id: item.saved_properties.property_id,
            fit_score: item.fit_score || 0,
            diversity_score: item.diversity_score || 0,
            total_score: item.total_score || 0,
            selection_reasons: item.selection_reasons || [],
            ...item.saved_properties
        }));
    };

    const loadRecommendationsByBatchId = async (batchId: string): Promise<MMRProperty[]> => {
        if (!user || !supabase) return [];

        const { data, error } = await supabase
            .from('user_favorites')
            .select(`
                fit_score,
                diversity_score,
                total_score,
                selection_reasons,
                saved_properties!inner (*)
            `)
            .eq('recommendation_batch_id', batchId)
            .eq('is_active', true)
            .order('saved_at', { ascending: true });

        if (error || !data) {
            throw new Error('Failed to load recommendation details');
        }

        return data.map((item: any) => ({
            property_id: item.saved_properties.property_id,
            fit_score: item.fit_score || 0,
            diversity_score: item.diversity_score || 0,
            total_score: item.total_score || 0,
            selection_reasons: item.selection_reasons || [],
            ...item.saved_properties
        }));
    };

    const handleFavorite = async (propertyId: string) => {
        if (!user || !supabase || !batchId) return;

        setLoadingStates(prev => ({ ...prev, [propertyId]: 'favoriting' }));
        
        try {
            // The property is already in user_favorites from the recommendation generation
            // We just need to log the interaction
            await logInteraction(propertyId, 'save');
            
            setActionConfirmations(prev => ({ ...prev, [propertyId]: 'favorited' }));
            
            // Move to next property after a brief delay
            setTimeout(() => {
                if (currentIndex < recommendations.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                    setCardSide('front');
                }
                
                setLoadingStates(prev => ({ ...prev, [propertyId]: null }));
                setActionConfirmations(prev => ({ ...prev, [propertyId]: null }));
            }, 1500);
        } catch (error) {
            console.error('Error favoriting property:', error);
            setLoadingStates(prev => ({ ...prev, [propertyId]: null }));
        }
    };

    const handleDismiss = async (propertyId: string) => {
        if (!user || !supabase || !batchId) return;

        setLoadingStates(prev => ({ ...prev, [propertyId]: 'dismissing' }));
        
        try {
            // Mark as inactive in user_favorites
            await supabase
                .from('user_favorites')
                .update({ is_active: false })
                .eq('user_id', user.id)
                .eq('property_id', propertyId)
                .eq('recommendation_batch_id', batchId);

            await logInteraction(propertyId, 'remove');
            
            setActionConfirmations(prev => ({ ...prev, [propertyId]: 'dismissed' }));
            setDismissedCount(prev => prev + 1);
            
            // Move to next property after a brief delay
            setTimeout(() => {
                if (currentIndex < recommendations.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                    setCardSide('front');
                }
                
                setLoadingStates(prev => ({ ...prev, [propertyId]: null }));
                setActionConfirmations(prev => ({ ...prev, [propertyId]: null }));
            }, 1500);
        } catch (error) {
            console.error('Error dismissing property:', error);
            setLoadingStates(prev => ({ ...prev, [propertyId]: null }));
        }
    };

    const logInteraction = async (propertyId: string, actionType: string) => {
        if (!user || !batchId) return;

        try {
            // Log interaction for learning (this could be expanded into its own Edge Function)
            console.log(`User ${user.id} performed ${actionType} on property ${propertyId} from batch ${batchId}`);
            
            // TODO: Implement interaction logging Edge Function
            // await supabase.functions.invoke('log-interaction', {
            //     body: {
            //         userId: user.id,
            //         propertyId,
            //         batchId,
            //         actionType,
            //         position: currentIndex
            //     }
            // });
        } catch (error) {
            console.error('Error logging interaction:', error);
        }
    };

    const navigateProperty = (direction: 'prev' | 'next') => {
        let newIndex = currentIndex;
        if (direction === 'prev' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (direction === 'next' && currentIndex < recommendations.length - 1) {
            newIndex = currentIndex + 1;
        }
        
        if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
            setCardSide('front');
        }
    };

    const handleClose = () => {
        if (dismissedCount > 2) {
            setShowFeedback(true);
        } else {
            onClose();
        }
    };

    const handleFeedbackSubmit = () => {
        // TODO: Send feedback to improve recommendations
        console.log('Feedback reason:', feedbackReason);
        onClose();
    };

    const handleCardClick = () => {
        setCardSide(cardSide === 'front' ? 'back' : 'front');
    };

    // Helper functions
    const getWeekStart = (date: Date): string => {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
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

    const getGoogleMapsLink = (property: MMRProperty): string => {
        const address = property.address_street || property.address_full || '';
        const city = property.address_city || '';
        const state = property.address_state || '';
        const fullAddress = `${address}, ${city}, ${state}`.trim();
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    };

    const getRelevanceStars = (score: number) => {
        const stars = Math.round(score * 5);
        return Array.from({ length: 5 }, (_, i) => (
            <Star 
                key={i} 
                size={12} 
                className={i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'} 
            />
        ));
    };

    if (!isOpen) return null;

    const currentProperty = recommendations[currentIndex];

    // Feedback modal
    if (showFeedback) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">Help us improve your recommendations</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        What made some properties less appealing?
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
                        <option value="not-diverse-enough">Too similar properties</option>
                        <option value="too-diverse">Properties too different from my interests</option>
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
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Your Weekly Picks</h2>
                        <div className="text-sm text-gray-600 mt-1">
                            {recommendations.length} properties • λ={lambda.toFixed(2)} • {totalCandidates} candidates screened
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Generating your personalized recommendations...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-red-600 mb-4">{error}</p>
                            <button
                                onClick={() => loadRecommendations()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : recommendations.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600 mb-4">No recommendations available.</p>
                            <button
                                onClick={() => loadRecommendations()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Generate Recommendations
                            </button>
                        </div>
                    ) : currentProperty ? (
                        <>
                            {/* Property Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={() => navigateProperty('prev')}
                                    disabled={currentIndex === 0}
                                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={20} />
                                    <span>Previous</span>
                                </button>
                                
                                <span className="text-sm text-gray-600">
                                    Property {currentIndex + 1} of {recommendations.length}
                                </span>
                                
                                <button
                                    onClick={() => navigateProperty('next')}
                                    disabled={currentIndex === recommendations.length - 1}
                                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {/* MMR Score and Why Recommended */}
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-blue-900">Why this property:</span>
                                    <div className="flex items-center space-x-1">
                                        {getRelevanceStars(currentProperty.fit_score)}
                                        <span className="text-xs text-blue-700 ml-1">
                                            {Math.round(currentProperty.fit_score * 100)}% match
                                        </span>
                                    </div>
                                </div>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    {currentProperty.selection_reasons.map((reason, i) => (
                                        <li key={i} className="flex items-start">
                                            <span className="text-blue-600 mr-2">•</span>
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Property Card - same structure as your existing modal */}
                            <div 
                                className="bg-white rounded-lg border border-gray-200 p-3 mb-4 cursor-pointer hover:border-gray-300 transition-colors relative"
                                onClick={handleCardClick}
                                style={{ minHeight: '180px' }}
                            >
                                {/* Front and back content same as your existing modal */}
                                {cardSide === 'front' ? (
                                    <>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="text-lg font-medium text-gray-900 mb-1">
                                                    {currentProperty.address_street || currentProperty.address_full}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {currentProperty.address_city}, {currentProperty.address_state} {currentProperty.address_zip}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div className="space-y-1 text-xs text-gray-600">
                                                <div className="flex">
                                                    <span>Units:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.units_count || 'N/A'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Built:&nbsp;</span>
                                                    <span className="font-medium">
                                                        {currentProperty.year_built ? `${currentProperty.year_built} (${calculateAge(currentProperty.year_built)} years old)` : 'N/A'}
                                                    </span>
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

                                            <div className="space-y-1 text-xs text-gray-600">
                                                <div className="flex items-center">
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

                                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="text-lg font-medium text-gray-900 mb-1">
                                                    Property Details
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-2">
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
                                                    <span>Out-of-State Owner:&nbsp;</span>
                                                    <span className="font-medium">{currentProperty.out_of_state_absentee_owner ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div className="flex">
                                                    <span>Last Sale Amount:&nbsp;</span>
                                                    <span className="font-medium">{formatCurrency(currentProperty.last_sale_amount)}</span>
                                                </div>
                                            </div>

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
                                            </div>
                                        </div>

                                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Action Buttons */}
                {currentProperty && (
                    <div className="border-t border-gray-200 p-2 flex justify-center space-x-1.5">
                        <button
                            onClick={() => handleFavorite(currentProperty.property_id)}
                            disabled={loadingStates[currentProperty.property_id] === 'favoriting'}
                            className={`flex items-center space-x-0.5 px-2 py-1 rounded text-xs transition-all duration-200 transform ${
                                actionConfirmations[currentProperty.property_id] === 'favorited'
                                    ? 'bg-green-500 text-white scale-105'
                                    : loadingStates[currentProperty.property_id] === 'favoriting'
                                    ? 'bg-orange-500 text-white scale-110'
                                    : 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-105'
                            }`}
                        >
                            {actionConfirmations[currentProperty.property_id] === 'favorited' ? (
                                <>
                                    <span>✓</span>
                                    <span>Added!</span>
                                </>
                            ) : (
                                <>
                                    <Heart size={12} />
                                    <span>Add to Pipeline</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => handleDismiss(currentProperty.property_id)}
                            disabled={loadingStates[currentProperty.property_id] === 'dismissing'}
                            className={`flex items-center space-x-0.5 px-2 py-1 rounded text-xs transition-all duration-200 transform ${
                                actionConfirmations[currentProperty.property_id] === 'dismissed'
                                    ? 'bg-green-500 text-white scale-105'
                                    : loadingStates[currentProperty.property_id] === 'dismissing'
                                    ? 'bg-gray-500 text-white scale-110'
                                    : 'bg-gray-500 text-white hover:bg-gray-600 hover:scale-105'
                            }`}
                        >
                            {actionConfirmations[currentProperty.property_id] === 'dismissed' ? (
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