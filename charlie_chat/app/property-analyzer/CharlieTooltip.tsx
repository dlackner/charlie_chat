'use client';

import React, { useState } from 'react';

interface CharlieTooltipProps {
  message: string;
  children: React.ReactNode;
}

export const CharlieTooltip: React.FC<CharlieTooltipProps> = ({ message, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, 800); // 800ms delay
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  return (
    <div 
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div className="absolute z-50 left-0 top-full mt-2 pointer-events-none">
          {/* Speech Bubble */}
          <div className="relative bg-white border-2 border-orange-500 rounded-xl shadow-lg p-4 max-w-sm">
            {/* Arrow pointing up to the input */}
            <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-l-2 border-t-2 border-orange-500 transform rotate-45"></div>
            
            {/* Charlie's Avatar */}
            <div className="flex items-start space-x-3">
              <img
                src="/charlie.png"
                alt="Charlie"
                className="w-10 h-10 rounded-full shadow-md border-[0.5px] border-gray-300 flex-shrink-0"
              />
              
              {/* Message Content */}
              <div className="flex-1">
                <p className="text-sm text-gray-800 leading-relaxed font-medium">
                  {message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};