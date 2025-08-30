"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RecommendationsIconModalProps {
    onOpenRecommendations: () => void;
}

export const RecommendationsIconModal: React.FC<RecommendationsIconModalProps> = ({
    onOpenRecommendations
}) => {
    const { user, supabase } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [recommendationCount, setRecommendationCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user && supabase) {
            checkForRecommendations();
        }
    }, [user, supabase]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setShowModal(false);
            }
        };

        if (showModal) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showModal]);

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

    const handleIconClick = () => {
        setShowModal(true);
    };

    const handleDismiss = () => {
        setShowModal(false);
        // Keep the bell visible - don't call setIsVisible(false)
        // The bell should stay and keep bouncing until they actually review the recommendations
    };

    const handleViewRecommendations = () => {
        setShowModal(false);
        setIsVisible(false);
        onOpenRecommendations();
    };

    if (isLoading || !isVisible || recommendationCount === 0) {
        return null;
    }

    return (
        <div className="relative">
            {/* Animated Bell Icon */}
            <button
                onClick={handleIconClick}
                className="relative p-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
                <Bell 
                    size={24} 
                    className="animate-bounce"
                    style={{
                        animation: 'gentle-bounce 2s ease-in-out infinite'
                    }}
                />
            </button>

            {/* Small Modal - positioned relative to the bell */}
            {showModal && (
                <div className="absolute top-full -right-80 z-50 mt-2">
                    <div 
                        ref={modalRef}
                        className="relative bg-white rounded-lg shadow-xl border border-gray-200 p-6 w-80"
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>

                        {/* Content */}
                        <div className="pr-6">
                            <div className="flex items-center mb-3">
                                <Bell className="text-blue-600 mr-2" size={20} />
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Weekly Recommendations
                                </h3>
                            </div>
                            
                            <p className="text-gray-700 mb-4">
                                Your weekly recommendations are ready! Charlie found some properties matching your preferences.
                            </p>

                            <div className="flex space-x-3">
                                <button
                                    onClick={handleViewRecommendations}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Review
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Maybe later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Animation styles */}
            <style jsx>{`
                @keyframes gentle-bounce {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                    }
                    40% {
                        transform: translateY(-4px);
                    }
                    60% {
                        transform: translateY(-2px);
                    }
                }
            `}</style>
        </div>
    );
};