"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

interface CharlieRecommendationWidgetMMRProps {
    onOpenRecommendations: () => void;
    checkInterval?: number; // minutes between checks (default: 60)
}

export const CharlieRecommendationWidgetMMR: React.FC<CharlieRecommendationWidgetMMRProps> = ({
    onOpenRecommendations,
    checkInterval = 60,
}) => {
    const { user, supabase } = useAuth();
    const [hasNewRecommendations, setHasNewRecommendations] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [recommendationCount, setRecommendationCount] = useState(0);
    const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Check for new recommendations on mount and periodically
    useEffect(() => {
        if (user && supabase) {
            checkForNewRecommendations();
            
            // Set up periodic checking
            const interval = setInterval(checkForNewRecommendations, checkInterval * 60 * 1000);
            
            return () => clearInterval(interval);
        }
    }, [user, supabase, checkInterval]);

    // Listen for real-time updates to user_favorites table
    useEffect(() => {
        if (user && supabase) {
            const subscription = supabase
                .channel('recommendation_updates')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_favorites',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    // Check if this is a new algorithm recommendation
                    if (payload.new.recommendation_type === 'algorithm') {
                        handleNewRecommendationDetected();
                    }
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [user, supabase]);

    const checkForNewRecommendations = async () => {
        if (!user || !supabase) return;

        try {
            // First check if user has weekly recommendations enabled
            const { data: userPrefs } = await supabase
                .from('user_buy_box_preferences')
                .select('weekly_recommendations_enabled, target_markets')
                .eq('user_id', user.id)
                .single();

            if (!userPrefs?.weekly_recommendations_enabled) {
                setIsVisible(false);
                return;
            }

            // Check if user has target markets set up
            if (!userPrefs.target_markets || userPrefs.target_markets.length === 0) {
                setIsVisible(false);
                return;
            }

            const weekStart = getWeekStart(new Date());
            
            // Check for new algorithm recommendations this week
            const { data: recommendations, error } = await supabase
                .from('user_favorites')
                .select('id, generated_at, recommendation_batch_id')
                .eq('user_id', user.id)
                .eq('recommendation_type', 'algorithm')
                .eq('is_active', true)
                .gte('generated_at', weekStart)
                .order('generated_at', { ascending: false });

            if (error) {
                console.error('Error checking recommendations:', error);
                return;
            }

            setLastCheckTime(new Date());

            if (recommendations && recommendations.length > 0) {
                const latestBatch = recommendations[0];
                const batchRecommendations = recommendations.filter(
                    r => r.recommendation_batch_id === latestBatch.recommendation_batch_id
                );
                
                setRecommendationCount(batchRecommendations.length);
                
                // Check if these are truly "new" (generated recently)
                const generatedTime = new Date(latestBatch.generated_at);
                const now = new Date();
                const hoursSinceGenerated = (now.getTime() - generatedTime.getTime()) / (1000 * 60 * 60);
                
                // Consider recommendations "new" if generated within last 24 hours
                if (hoursSinceGenerated <= 24) {
                    setHasNewRecommendations(true);
                    setIsVisible(true);
                    
                    // Check if user hasn't seen them yet (could track last interaction)
                    const hasInteracted = await checkIfUserInteracted(latestBatch.recommendation_batch_id);
                    if (!hasInteracted) {
                        setIsAnimating(true);
                    }
                } else {
                    setHasNewRecommendations(false);
                    setIsVisible(false);
                }
            } else {
                // No recommendations this week - maybe generate some?
                await maybeGenerateRecommendations();
            }

        } catch (error) {
            console.error('Error in checkForNewRecommendations:', error);
        }
    };

    const checkIfUserInteracted = async (batchId: string): Promise<boolean> => {
        if (!user || !supabase) return false;

        // Simple check: see if any recommendations from this batch have been marked inactive
        // or if we have interaction logs (when implemented)
        const { data } = await supabase
            .from('user_favorites')
            .select('is_active')
            .eq('user_id', user.id)
            .eq('recommendation_batch_id', batchId)
            .eq('is_active', false)
            .limit(1);

        return !!(data && data.length > 0);
    };

    const maybeGenerateRecommendations = async () => {
        if (!user || !supabase) return;

        try {
            // Don't auto-generate too frequently - check if we tried recently
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);

            // Simple throttling - could be more sophisticated
            if (lastCheckTime && lastCheckTime > oneHourAgo) {
                return;
            }

            // Attempt to generate recommendations
            const { data: functionResponse } = await supabase.functions.invoke('generate-recommendations', {
                body: { 
                    userId: user.id,
                    forceRefresh: false 
                }
            });

            if (functionResponse?.success && functionResponse.recommendationCount > 0) {
                handleNewRecommendationDetected();
            }

        } catch (error) {
            // Silently fail - this is a background operation
            console.log('Background recommendation generation failed:', error);
        }
    };

    const handleNewRecommendationDetected = () => {
        setHasNewRecommendations(true);
        setIsVisible(true);
        setIsAnimating(true);
        
        // Re-check the actual count
        setTimeout(() => {
            checkForNewRecommendations();
        }, 1000);
    };

    const handleWidgetClick = () => {
        setIsAnimating(false);
        setHasNewRecommendations(false);
        onOpenRecommendations();
    };

    const getWeekStart = (date: Date): string => {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    };

    const getBubbleMessage = () => {
        if (recommendationCount === 0) {
            return "Ready to find your next deal?";
        }
        
        if (recommendationCount === 1) {
            return "I found a great property for you!";
        }
        
        return `I found ${recommendationCount} great properties for you!`;
    };

    // Don't render if not visible
    if (!isVisible || !user) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-40">
            <div className="relative">
                {/* Speech Bubble */}
                <div className="absolute bottom-16 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs animate-fade-in-up">
                    <div className="text-sm text-gray-800 font-medium">
                        {getBubbleMessage()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                        Tap to view your weekly picks
                    </div>
                    {/* Speech bubble arrow */}
                    <div className="absolute bottom-[-8px] right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
                    <div className="absolute bottom-[-9px] right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-200"></div>
                </div>

                {/* Charlie Avatar */}
                <button
                    onClick={handleWidgetClick}
                    className={`relative w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg hover:scale-110 transition-all duration-200 ${
                        isAnimating ? 'animate-bounce' : ''
                    }`}
                    style={{
                        animation: isAnimating ? 'gentle-bounce 2s ease-in-out infinite' : 'none'
                    }}
                >
                    <Image
                        src="/charlie.png"
                        alt="Charlie AI Assistant"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                    />
                    
                    {/* Notification badge */}
                    {hasNewRecommendations && recommendationCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-white font-bold">
                                {recommendationCount > 9 ? '9+' : recommendationCount}
                            </span>
                        </div>
                    )}
                    
                    {/* Pulse animation for new recommendations */}
                    {isAnimating && (
                        <div className="absolute inset-0 rounded-full border-4 border-orange-400 animate-ping"></div>
                    )}
                </button>
            </div>

            {/* Status indicator for debugging */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-[-40px] right-0 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
                    Last check: {lastCheckTime?.toLocaleTimeString() || 'Never'}
                </div>
            )}

            <style jsx>{`
                @keyframes gentle-bounce {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                    }
                    40% {
                        transform: translateY(-10px);
                    }
                    60% {
                        transform: translateY(-5px);
                    }
                }
                
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};