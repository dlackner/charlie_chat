"use client";

import React, { useState, useEffect } from 'react';
import { X, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RecommendationsNotificationProps {
    onOpenRecommendations: () => void;
}

export const RecommendationsNotification: React.FC<RecommendationsNotificationProps> = ({
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

    const handleDismiss = () => {
        setIsVisible(false);
        // Could also mark as "dismissed for now" in database if needed
    };

    const handleViewRecommendations = () => {
        setIsVisible(false);
        onOpenRecommendations();
    };

    if (isLoading || !isVisible || recommendationCount === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <Heart className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-blue-900">
                            🏡 Your personalized recommendations are ready!
                        </h3>
                        <p className="text-sm text-blue-700 mt-1">
                            Charlie found {recommendationCount} {recommendationCount === 1 ? 'property' : 'properties'} matching your preferences
                        </p>
                        <div className="mt-3 flex items-center space-x-3">
                            <button
                                onClick={handleViewRecommendations}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                Review Properties →
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
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};