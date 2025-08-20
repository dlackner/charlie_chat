'use client';

import React, { useState, useRef } from 'react';

interface CharlieTooltipProps {
  message: string;
  children: React.ReactNode;
}

export const CharlieTooltip: React.FC<CharlieTooltipProps> = ({ message, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [showAbove, setShowAbove] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
      
      // Check if tooltip should appear above after it becomes visible
      setTimeout(() => {
        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // If tooltip bottom would be cut off by viewport, show above
          const wouldBeClipped = tooltipRect.bottom > viewportHeight - 20;
          setShowAbove(wouldBeClipped);
        }
      }, 10);
    }, 800); // 800ms delay
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
    setShowAbove(false);
  };

  return (
    <div 
      ref={containerRef}
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={`absolute z-50 left-0 pointer-events-none ${
            showAbove 
              ? 'bottom-full mb-2' 
              : 'top-full mt-2'
          }`}
        >
          {/* Speech Bubble */}
          <div className="relative bg-white border-2 border-orange-500 rounded-xl shadow-lg p-4 max-w-sm">
            {/* Arrow pointing to the element */}
            <div className={`absolute left-6 w-4 h-4 bg-white border-2 border-orange-500 transform rotate-45 ${
              showAbove 
                ? 'top-full -mt-2 border-t-0 border-l-0' 
                : '-top-2 border-b-0 border-r-0'
            }`}></div>
            
            {/* Charlie's Avatar */}
            <div className="flex items-start space-x-3">
              <img
                src="/charlie.png"
                alt="Charlie"
                className="w-10 h-10 rounded-full shadow-md border-[0.5px] border-gray-300 flex-shrink-0"
              />
              
              {/* Message Content */}
              <div className="flex-1">
                <div className="text-sm text-gray-800 leading-tight font-medium whitespace-pre-line">
                  {message}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};