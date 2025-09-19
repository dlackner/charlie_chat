/*
 * CHARLIE2 V2 - Recommendations Header Notification Component
 * Compact notification banner for new weekly property recommendations
 * Integrates with main navigation header for user awareness
 * Part of the new V2 application architecture
 */
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RecommendationsHeaderNotificationProps {
    onOpenRecommendations: () => void;
}

export const RecommendationsHeaderNotification: React.FC<RecommendationsHeaderNotificationProps> = ({
    onOpenRecommendations
}) => {
    const { user, supabase } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [recommendationCount, setRecommendationCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user && supabase) {
            checkForRecommendations();
        }
    }, [user, supabase]);

    const checkForRecommendations = async () => {
        if (!user || !supabase) return;

        try {
            // Check for pending recommendations
            const { data, error } = await supabase
                .from('user_favorites')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .eq('recommendation_type', 'algorithm');

            if (error) {
                console.error('Error checking recommendations:', error);
                return;
            }

            const count = data?.length || 0;
            setRecommendationCount(count);
            setIsVisible(count > 0);
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(false);
    };

    const handleViewRecommendations = () => {
        setIsVisible(false);
        onOpenRecommendations();
    };

    if (isLoading || !isVisible || recommendationCount === 0) {
        return null;
    }

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 shadow-sm">
            <div className="flex items-center space-x-3">
                <div className="flex-1">
                    <p className="text-sm text-blue-900 font-medium">
                        Your weekly recommendations are ready
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleViewRecommendations}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                        Review
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
};