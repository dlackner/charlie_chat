"use client";

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { StreetViewImage } from '@/components/ui/StreetViewImage';


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
}

export const WeeklyRecommendationsModalMMR: React.FC<WeeklyRecommendationsModalMMRProps> = ({
    isOpen,
    onClose,
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
    
    // Forced decision tracking
    const [propertyDecisions, setPropertyDecisions] = useState<{ [propertyId: string]: 'favorite' | 'not_interested' | null }>({});
    const [viewingStartTime, setViewingStartTime] = useState<number>(Date.now());
    const [cardFlips, setCardFlips] = useState<number>(0);
    
    // Learning progress tracking
    const [learningProgress, setLearningProgress] = useState<{
        totalDecisions: number;
        targetDecisions: number;
        progressPercentage: number;
        isComplete: boolean;
    } | null>(null);


    // Helper function to get Market1-5 key for a property location
    const getMarketKeyForProperty = async (city: string, state: string): Promise<string> => {
        if (!user || !supabase) return 'Market1';

        try {
            // Get user's markets from user_markets table
            const { data: userMarkets, error } = await supabase
                .from('user_markets')
                .select('market_key, market_type, city, state, zip')
                .eq('user_id', user.id);

            if (error || !userMarkets || userMarkets.length === 0) {
                return 'Market1';
            }

            // Find the market that matches this property's location
            const matchingMarket = userMarkets.find((market: any) => {
                if (market.market_type === 'city') {
                    return market.city?.toLowerCase() === city?.toLowerCase() && 
                           market.state?.toLowerCase() === state?.toLowerCase();
                }
                return false;
            });

            // Return the market's key, or default to first market or Market1
            return matchingMarket?.market_key || userMarkets[0]?.market_key || 'Market1';
        } catch (error) {
            console.error('Error getting market key for property:', error);
            return 'Market1';
        }
    };

    // Load recommendations when modal opens - but only once per session
    useEffect(() => {
        if (isOpen && user && recommendations.length === 0) {
            loadRecommendations();
            loadLearningProgress();
        }
    }, [isOpen, user]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            setCardSide('front');
            setError(null);
            setPropertyDecisions({});
            setViewingStartTime(Date.now());
            setCardFlips(0);
        }
    }, [isOpen]);
    
    // Track viewing time and reset when changing properties
    useEffect(() => {
        if (recommendations.length > 0 && recommendations[currentIndex]) {
            setViewingStartTime(Date.now());
            setCardFlips(0);
        }
    }, [currentIndex, recommendations]);

    const loadRecommendations = async () => {
        if (!user || !supabase) return;

        setLoading(true);
        setError(null);

        try {
            // Only load existing recommendations - never generate new ones
            // New recommendations should only come from cron job + edge functions
            const weekStart = getWeekStart(new Date());
            
            console.log('Loading existing recommendations for week:', weekStart);
            const existingRecs = await loadExistingRecommendations(weekStart);
            if (existingRecs && existingRecs.length > 0) {
                setRecommendations(existingRecs);
                setLoading(false);
                return;
            }

            // No existing recommendations found - show appropriate message
            setRecommendations([]);
            setError('No new recommendations available. Weekly recommendations are generated automatically each Monday morning.');

        } catch (err: any) {
            setError(err.message || 'Failed to load recommendations');
            console.error('Error loading recommendations:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadLearningProgress = async () => {
        if (!user || !supabase) return;

        try {
            // Get current user's total decisions from user_property_decisions table
            const { data, error } = await supabase
                .from('user_property_decisions')
                .select('id')
                .eq('user_id', user.id);

            if (error) {
                console.error('Error loading learning progress:', error);
                return;
            }

            const totalDecisions = data?.length || 0;
            const isComplete = totalDecisions >= 50; // Consider complete after 50 decisions
            
            // Dynamic learning target - check convergence every 10 decisions
            let targetDecisions: number;
            let progressPercentage: number;
            
            if (isComplete) {
                targetDecisions = totalDecisions; // Show as 100% complete
                progressPercentage = 100;
            } else {
                // Next checkpoint is the next multiple of 10
                targetDecisions = Math.max(10, Math.ceil(totalDecisions / 10) * 10);
                progressPercentage = Math.min(Math.round((totalDecisions / targetDecisions) * 100), 100);
            }

            setLearningProgress({
                totalDecisions,
                targetDecisions,
                progressPercentage,
                isComplete
            });

            console.log(`📊 Learning Progress: ${totalDecisions}/${targetDecisions} (${progressPercentage}%)`);
        } catch (error) {
            console.error('Error fetching learning progress:', error);
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
            .eq('status', 'pending')
            .gte('generated_at', weekStart)
            .order('saved_at', { ascending: true });

        if (error || !data || data.length === 0) return [];

        setBatchId(data[0].recommendation_batch_id);

        return data.map((item: any) => ({
            ...item.saved_properties,
            property_id: item.saved_properties.property_id,
            fit_score: item.fit_score || 0,
            diversity_score: item.diversity_score || 0,
            total_score: item.total_score || 0,
            selection_reasons: item.selection_reasons || []
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
            .eq('status', 'pending')
            .order('saved_at', { ascending: true });

        if (error || !data) {
            throw new Error('Failed to load recommendation details');
        }

        return data.map((item: any) => ({
            ...item.saved_properties,
            property_id: item.saved_properties.property_id,
            fit_score: item.fit_score || 0,
            diversity_score: item.diversity_score || 0,
            total_score: item.total_score || 0,
            selection_reasons: item.selection_reasons || []
        }));
    };

    const logPropertyDecision = async (propertyId: string, decision: 'favorite' | 'not_interested') => {
        if (!user || !supabase || !currentProperty) return;
        
        const timeSpent = Date.now() - viewingStartTime;
        
        // Find the specific property in the recommendations array
        const specificProperty = recommendations.find(rec => rec.property_id === propertyId);
        
        try {
            
            const { error } = await supabase
                .from('user_property_decisions')
                .insert({
                    user_id: user.id,
                    property_id: propertyId,
                    decision: decision,
                    recommendation_batch_id: batchId,
                    property_characteristics: {
                        units_count: currentProperty.units_count,
                        year_built: currentProperty.year_built,
                        assessed_value: currentProperty.assessed_value,
                        estimated_value: currentProperty.estimated_value,
                        estimated_equity: currentProperty.estimated_equity,
                        address_city: currentProperty.address_city,
                        address_state: currentProperty.address_state,
                        years_owned: currentProperty.years_owned,
                        out_of_state_absentee_owner: currentProperty.out_of_state_absentee_owner,
                        reo: currentProperty.reo,
                        tax_lien: currentProperty.tax_lien,
                        auction: currentProperty.auction,
                        pre_foreclosure: currentProperty.pre_foreclosure
                    },
                    market_key: await getMarketKeyForProperty(currentProperty.address_city || '', currentProperty.address_state || ''),
                    fit_score: specificProperty?.fit_score || currentProperty.fit_score,
                    decided_at: new Date().toISOString()
                });
                
            if (error) {
                console.error('Error logging decision:', error);
            } else {
                console.log(`✅ Logged ${decision} decision for property ${propertyId}`);
                
                // Increment total_decisions_made for this market
                try {
                    const marketKey = await getMarketKeyForProperty(currentProperty.address_city || '', currentProperty.address_state || '');
                    
                    // First get current count
                    const { data: marketData, error: fetchError } = await supabase
                        .from('user_markets')
                        .select('total_decisions_made')
                        .eq('user_id', user.id)
                        .eq('market_key', marketKey)
                        .single();

                    if (fetchError) {
                        console.error('Error fetching current decision count:', fetchError);
                        return;
                    }

                    // Increment and update
                    const currentCount = marketData?.total_decisions_made || 0;
                    const { error: updateError } = await supabase
                        .from('user_markets')
                        .update({ 
                            total_decisions_made: currentCount + 1,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', user.id)
                        .eq('market_key', marketKey);

                    if (updateError) {
                        console.error('Error updating market decision count:', updateError);
                    } else {
                        console.log(`📊 Incremented decision count for market ${marketKey}: ${currentCount} → ${currentCount + 1}`);
                    }
                } catch (marketUpdateError) {
                    console.error('Error incrementing market decision count:', marketUpdateError);
                }
            }
        } catch (error) {
            console.error('Error logging property decision:', error);
        }
    };

    const handleFavorite = (propertyId: string) => {
        // Only update local state - don't commit to database yet
        setPropertyDecisions(prev => ({ 
            ...prev, 
            [propertyId]: prev[propertyId] === 'favorite' ? null : 'favorite' 
        }));
        
        // Auto-advance to next property if not the last one
        if (currentIndex < recommendations.length - 1) {
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                setCardSide('front');
            }, 300); // Small delay for visual feedback
        }
    };

    const handleDismiss = (propertyId: string) => {
        // Only update local state - don't commit to database yet
        setPropertyDecisions(prev => ({ 
            ...prev, 
            [propertyId]: prev[propertyId] === 'not_interested' ? null : 'not_interested' 
        }));
        
        // Auto-advance to next property if not the last one
        if (currentIndex < recommendations.length - 1) {
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                setCardSide('front');
            }, 300); // Small delay for visual feedback
        }
    };

    const commitAllDecisions = async () => {
        if (!user || !supabase || !batchId) return;
        
        // Validate that ALL recommendations have decisions before proceeding
        const unreviewed = recommendations.filter(property => !propertyDecisions[property.property_id]);
        if (unreviewed.length > 0) {
            console.error('Cannot commit: Found unreviewed properties:', unreviewed);
            alert(`Please make a decision on all ${recommendations.length} properties before saving. ${unreviewed.length} properties still need your review.`);
            return;
        }
        
        console.log(`✅ Validation passed: All ${recommendations.length} properties have decisions`);
        
        // Store recommendations array before any state changes
        const propertiesToProcess = [...recommendations];
        
        try {
            // Process each property (all are guaranteed to have decisions)
            for (const property of propertiesToProcess) {
                const decision = propertyDecisions[property.property_id];
                
                // Update user_favorites status (remove batch ID restriction to handle multiple batches)
                if (decision === 'favorite') {
                    await supabase
                        .from('user_favorites')
                        .update({ status: 'active' })
                        .eq('user_id', user.id)
                        .eq('property_id', property.property_id)
                        .eq('status', 'pending'); // Only update pending recommendations
                } else if (decision === 'not_interested') {
                    await supabase
                        .from('user_favorites')
                        .update({ 
                            status: 'rejected',
                            is_active: false 
                        })
                        .eq('user_id', user.id)
                        .eq('property_id', property.property_id)
                        .eq('status', 'pending'); // Only update pending recommendations
                } else {
                    // This should never happen due to validation, but log it if it does
                    console.error('Unexpected: Property has no decision despite validation:', property.property_id, decision);
                }
                
                // Log the decision for learning (decision is guaranteed to exist due to validation)
                if (decision) {
                    await logPropertyDecision(property.property_id, decision);
                }
            }
            
            console.log(`✅ Committed ${Object.keys(propertyDecisions).length} decisions to database`);
            
            // Clear state after successful processing to ensure fresh data on next load
            setRecommendations([]);
            setPropertyDecisions({});
            
            // Update market convergence analysis after all decisions are committed
            try {
                const { updateMarketConvergence } = await import('@/lib/convergenceAnalysis');
                const convergenceData = await updateMarketConvergence(user.id, supabase);
                console.log('📊 Updated market convergence after weekly recommendations:', convergenceData);
            } catch (convergenceError) {
                console.error('Error updating market convergence (non-critical):', convergenceError);
                // Don't fail the whole operation if convergence update fails
            }
            
            // Close modal ONLY AFTER all database operations are complete
            onClose();
            
        } catch (error) {
            console.error('Error committing decisions:', error);
            // Could show a toast notification here instead of modal error
            // Still close the modal even if there's an error
            onClose();
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
        // Check if there are unsaved decisions
        if (Object.keys(propertyDecisions).length > 0) {
            // Could add a confirmation dialog here if needed
            // For now, just warn in console
            console.warn('User closed modal with unsaved decisions');
        }
        onClose();
    };


    const handleCardClick = () => {
        setCardSide(cardSide === 'front' ? 'back' : 'front');
        setCardFlips(prev => prev + 1);
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


    const getRelevanceStars = (score: number) => {
        const stars = Math.round((score / 100) * 5); // Convert 0-100 to 0-5 stars
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


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-[90vh] relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900">Your Weekly Picks</h2>
                        <div className="text-sm text-gray-600 mt-1">
                            {recommendations.length} personalized recommendations
                        </div>
                        
                        {/* Local Progress Tracking */}
                        {recommendations.length > 0 && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-blue-600">Review Progress</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${recommendations.length > 0 ? (Object.keys(propertyDecisions).length / recommendations.length) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {/* Confirm Decisions Button - only show when ALL properties have decisions */}
                        {recommendations.length > 0 && 
                         Object.keys(propertyDecisions).length === recommendations.length &&
                         recommendations.every(prop => propertyDecisions[prop.property_id]) && (
                            <div className="mt-3">
                                <button
                                    onClick={commitAllDecisions}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                                >
                                    {loading ? 'Saving...' : `Confirm All ${Object.keys(propertyDecisions).length} Decisions`}
                                </button>
                            </div>
                        )}
                        
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                        title="Close recommendations"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-hidden">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading your weekly recommendations...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <div className="text-gray-600 mb-4">{error}</div>
                            <p className="text-sm text-gray-500">
                                Check back later for new recommendations, or adjust your buy box settings to get more targeted results.
                            </p>
                        </div>
                    ) : recommendations.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600 mb-4">No recommendations available.</p>
                            <p className="text-sm text-gray-500">
                                Weekly recommendations are generated automatically each Monday morning based on your buy box criteria.
                            </p>
                        </div>
                    ) : currentProperty ? (
                        <>
                            {/* Property Counter */}
                            <div className="text-center mb-4">
                                <div className="text-sm text-gray-600">
                                    Property {currentIndex + 1} of {recommendations.length}
                                </div>
                            </div>

                            {/* MMR Score and Why Recommended */}
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-blue-900">Why this property:</span>
                                    <div className="flex items-center space-x-1">
                                        {getRelevanceStars(currentProperty.fit_score)}
                                        <span className="text-xs text-blue-700 ml-1">
                                            {Math.round(currentProperty.fit_score)}% match
                                        </span>
                                    </div>
                                </div>
                                {/* Fixed height container for consistent card size - exact height for 5 bullet points */}
                                <ul className="text-xs text-blue-800 space-y-1 h-[95px] flex flex-col justify-start overflow-hidden">
                                    {currentProperty.selection_reasons.slice(0, 5).map((reason, i) => (
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
                                        <div className="flex gap-4 mb-3">
                                            {/* Left side - Property details */}
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900 mb-1">
                                                    {currentProperty.address_street || currentProperty.address_full}
                                                </div>
                                                <div className="text-sm text-gray-600 mb-3">
                                                    {currentProperty.address_city}, {currentProperty.address_state} {currentProperty.address_zip}
                                                </div>

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
                                            </div>

                                            {/* Right side - Clickable Street View Image */}
                                            <div 
                                                className="w-32 flex-shrink-0" 
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <StreetViewImage
                                                    address={`${currentProperty.address_street || currentProperty.address_full}, ${currentProperty.address_city}, ${currentProperty.address_state}`}
                                                    className="h-[120px] w-full"
                                                    width={128}
                                                    height={120}
                                                />
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
                                                <div className="text-sm font-medium text-gray-900 mb-1">
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

                {/* Action Buttons with Navigation */}
                {currentProperty && (
                    <div className="border-t border-gray-200 p-2">
                        <div className="flex items-center justify-between mb-2">
                            {/* Previous Button */}
                            <button
                                onClick={() => navigateProperty('prev')}
                                disabled={currentIndex === 0}
                                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1"
                            >
                                <ChevronLeft size={16} />
                                <span className="text-xs">Previous</span>
                            </button>

                            {/* Decision Buttons */}
                            <div className="flex space-x-1.5">
                                <button
                                    onClick={() => handleFavorite(currentProperty.property_id)}
                                    className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                                        propertyDecisions[currentProperty.property_id] === 'favorite'
                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                            : 'bg-gray-500 text-white hover:bg-gray-600'
                                    }`}
                                >
                                    {propertyDecisions[currentProperty.property_id] === 'favorite' ? (
                                        <>
                                            <span>✓</span>
                                            <span>Favorited</span>
                                        </>
                                    ) : (
                                        <>
                                            <Heart size={16} />
                                            <span>Add to Favorites</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleDismiss(currentProperty.property_id)}
                                    className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                                        propertyDecisions[currentProperty.property_id] === 'not_interested'
                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                            : 'bg-gray-500 text-white hover:bg-gray-600'
                                    }`}
                                >
                                    {propertyDecisions[currentProperty.property_id] === 'not_interested' ? (
                                        <>
                                            <span>✓</span>
                                            <span>Not Interested</span>
                                        </>
                                    ) : (
                                        <>
                                            <X size={16} />
                                            <span>Not Interested</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Next Button */}
                            <button
                                onClick={() => navigateProperty('next')}
                                disabled={currentIndex === recommendations.length - 1}
                                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1"
                            >
                                <span className="text-xs">Next</span>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        
                    </div>
                )}
            </div>
        </div>
    );
};