import React from 'react';
import { MarketTier, getPropertyCountStatus } from '@/lib/marketSizeUtil';

interface PropertyCountRangeIndicatorProps {
  propertyCount: number;
  marketTier: MarketTier;
  cityName?: string;
}

export const PropertyCountRangeIndicator: React.FC<PropertyCountRangeIndicatorProps> = ({
  propertyCount,
  marketTier,
  cityName
}) => {
  const status = getPropertyCountStatus(propertyCount, marketTier);
  
  // Calculate ranges based on market tier using systematic approach
  const getMidpoint = (tier: number) => {
    switch(tier) {
      case 1: return 700;   // Reduced from 3500 (80% reduction)
      case 2: return 300;   // Reduced from 1000 (70% reduction)  
      case 3: return 175;   // Reduced from 350 (50% reduction)
      case 4: return 75;    // Reduced from 150 (50% reduction)
      default: return 300;
    }
  };
  
  const midpoint = getMidpoint(marketTier.tier);
  const greenLower = Math.round(midpoint * 0.6);
  const greenUpper = Math.round(midpoint * 1.4);
  const blueLower = Math.round(greenLower * 0.8);
  const blueUpper = blueLower;  // Blue sections should be equal
  
  // Calculate blue section ranges to be equal in absolute terms
  const blueLeftRange = greenLower - blueLower;  // Size of left blue section
  
  const customRanges = {
    tooLowMax: blueLower - 1,           // Red: 0 to blue lower - 1
    blueLeftMin: blueLower,             // Blue left: blue lower to green lower - 1
    blueLeftMax: greenLower - 1,
    sweetSpotMin: greenLower,           // Green: green lower to green upper
    sweetSpotMax: greenUpper,
    blueRightMin: greenUpper + 1,       // Blue right: green upper + 1 to (green upper + same blue range)
    blueRightMax: greenUpper + blueLeftRange, // Make blue right same absolute size as blue left
    tooHighMin: greenUpper + blueLeftRange + 1, // Red: after blue right section
    maxScale: Math.round((greenUpper + blueLeftRange) * 1.3)  // Scale extends beyond blue right
  };
  
  // Use calculated max scale for this tier
  const maxRange = customRanges.maxScale;
  
  // Calculate widths using the calculated ranges
  const tooLowWidth = (customRanges.tooLowMax / maxRange) * 100;
  const goodWidth = ((customRanges.blueLeftMax - customRanges.blueLeftMin + 1) / maxRange) * 100;
  const sweetSpotWidth = ((customRanges.sweetSpotMax - customRanges.sweetSpotMin + 1) / maxRange) * 100;
  const goodWidth2 = ((customRanges.blueRightMax - customRanges.blueRightMin + 1) / maxRange) * 100;
  const tooHighWidth = ((maxRange - customRanges.tooHighMin + 1) / maxRange) * 100;
  
  // Property count position - clamp to bar boundaries for visibility
  let propertyPosition = (propertyCount / maxRange) * 100;
  
  // If off scale, position at the appropriate end but keep fully visible
  if (propertyPosition < 0) {
    propertyPosition = 2; // 2% from left edge to keep ball fully visible
  } else if (propertyPosition > 100) {
    propertyPosition = 98; // 2% from right edge to keep ball fully visible
  } else if (propertyPosition < 2) {
    propertyPosition = 2; // Ensure it's not cut off on the left
  } else if (propertyPosition > 98) {
    propertyPosition = 98; // Ensure it's not cut off on the right
  }
  
  return (
    <div className="w-full mt-3">
      {/* Vibrant Range Bar */}
      <div className="relative w-full h-6 bg-gray-100 rounded-lg overflow-hidden">
        {/* Too Low - Light Red/Pink */}
        <div 
          className="absolute top-0 left-0 h-full bg-red-300"
          style={{ width: `${tooLowWidth}%` }}
        />
        
        {/* Good (Left) - Light Blue */}
        <div 
          className="absolute top-0 h-full bg-blue-300"
          style={{ 
            left: `${tooLowWidth}%`, 
            width: `${goodWidth}%` 
          }}
        />
        
        {/* Sweet Spot - Green */}
        <div 
          className="absolute top-0 h-full bg-green-400"
          style={{ 
            left: `${tooLowWidth + goodWidth}%`, 
            width: `${sweetSpotWidth}%` 
          }}
        />
        
        {/* Good (Right) - Light Blue */}
        <div 
          className="absolute top-0 h-full bg-blue-300"
          style={{ 
            left: `${tooLowWidth + goodWidth + sweetSpotWidth}%`, 
            width: `${goodWidth2}%` 
          }}
        />
        
        {/* Too High - Light Red/Pink */}
        <div 
          className="absolute top-0 h-full bg-red-300"
          style={{ 
            left: `${tooLowWidth + goodWidth + sweetSpotWidth + goodWidth2}%`, 
            width: `${tooHighWidth}%` 
          }}
        />
        
        {/* Bouncing Blue Ball Indicator */}
        <div 
          className="absolute w-4 h-4 bg-blue-600 rounded-full z-20 animate-bounce shadow-lg border-2 border-white"
          style={{ 
            left: `${propertyPosition}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Property count label above the ball */}
        <div 
          className="absolute -top-8 transform -translate-x-1/2 text-xs font-bold text-blue-700 bg-white px-2 py-1 rounded-md shadow-lg border border-blue-200 z-30"
          style={{ left: `${propertyPosition}%` }}
        >
          {propertyCount.toLocaleString()}
        </div>
      </div>
      
      {/* Labels positioned to match color sections */}
      <div className="relative mt-1 mb-4 text-xs text-gray-600 h-4">
        <span className="absolute left-0">0</span>
        <span className="absolute" style={{left: `${tooLowWidth}%`, transform: 'translateX(-50%)'}}>{customRanges.blueLeftMin.toLocaleString()}</span>
        <span className="absolute" style={{left: `${tooLowWidth + goodWidth}%`, transform: 'translateX(-50%)'}}>{customRanges.sweetSpotMin.toLocaleString()}</span>
        <span className="absolute" style={{left: `${tooLowWidth + goodWidth + sweetSpotWidth}%`, transform: 'translateX(-50%)'}}>{customRanges.sweetSpotMax.toLocaleString()}</span>
        <span className="absolute" style={{left: `${tooLowWidth + goodWidth + sweetSpotWidth + goodWidth2}%`, transform: 'translateX(-50%)'}}>{customRanges.blueRightMax.toLocaleString()}</span>
        <span className="absolute right-0">{maxRange.toLocaleString()}</span>
      </div>
      
      {/* Status */}
      <div className="text-xs text-gray-600">
        {status.message}
      </div>
    </div>
  );
};