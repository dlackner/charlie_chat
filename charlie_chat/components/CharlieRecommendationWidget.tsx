"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface CharlieRecommendationWidgetProps {
    hasRecommendations: boolean;
    onClick: () => void;
}

export const CharlieRecommendationWidget: React.FC<CharlieRecommendationWidgetProps> = ({
    hasRecommendations,
    onClick,
}) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (hasRecommendations) {
            setIsAnimating(true);
        }
    }, [hasRecommendations]);

    if (!hasRecommendations) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-40">
            <div className="relative">
                {/* Speech Bubble */}
                <div className="absolute bottom-16 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs animate-fade-in-up">
                    <div className="text-sm text-gray-800 font-medium">
                        I found some great properties for you!
                    </div>
                    {/* Speech bubble arrow */}
                    <div className="absolute bottom-[-8px] right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
                    <div className="absolute bottom-[-9px] right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-200"></div>
                </div>

                {/* Charlie Avatar */}
                <button
                    onClick={onClick}
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
                    
                    {/* Notification dot */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-xs text-white font-bold">!</span>
                    </div>
                </button>
            </div>

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