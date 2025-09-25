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
          {/* Modern Tooltip */}
          <div className="relative bg-gray-900 rounded-lg shadow-lg p-3 max-w-sm">
            {/* Arrow pointing to the element */}
            <div className={`absolute left-4 w-2 h-2 bg-gray-900 transform rotate-45 ${
              showAbove 
                ? 'top-full -mt-1' 
                : '-top-1'
            }`}></div>
            
            {/* Message Content */}
            <div className="text-sm text-white leading-relaxed">
              {message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};