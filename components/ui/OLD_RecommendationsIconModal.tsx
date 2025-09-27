"use client";

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RecommendationsIconModalProps {
    onOpenRecommendations: () => void;
    onRecommendationsModalClosed?: () => void;
}

export interface RecommendationsIconModalRef {
    recheckRecommendations: () => Promise<void>;
}

export const RecommendationsIconModal = forwardRef<RecommendationsIconModalRef, RecommendationsIconModalProps>(({
    onOpenRecommendations,
    onRecommendationsModalClosed
}, ref) => {
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
            
            // Auto-open the modal if there are recommendations
            if (count > 0) {
                setShowModal(true);
            }
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
        // Keep the bell visible - it will disappear when recommendations are actually completed
        onOpenRecommendations();
    };

    // Function to re-check recommendations status (can be called externally)
    const recheckRecommendations = async () => {
        await checkForRecommendations();
    };

    // Expose the recheck function via ref
    useImperativeHandle(ref, () => ({
        recheckRecommendations
    }), []);

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
                            <div className="flex items-start gap-3 mb-2">
                                <img
                                    src="/charlie.png"
                                    alt="Charlie"
                                    className="w-10 h-10 rounded-full shadow-md border flex-shrink-0"
                                />
                                <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                                    Your Weekly Buy Box Opportunities Are Ready
                                </h3>
                            </div>
                            
                            <div className="mb-4">
                                <p className="text-gray-700 text-sm">
                                    I completed my analysis over the weekend and identified <strong>{recommendationCount}</strong> multifamily properties that align with your investment criteria. These recommendations are based on your preferences and market activity in your target areas. They'll get better and better every week.
                                </p>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={handleViewRecommendations}
                                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors duration-150 font-medium text-sm"
                                >
                                    Review Now
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-800 rounded-lg font-medium transition-colors duration-150 hover:bg-gray-50 text-sm"
                                >
                                    Review Later
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
});

RecommendationsIconModal.displayName = 'RecommendationsIconModal';