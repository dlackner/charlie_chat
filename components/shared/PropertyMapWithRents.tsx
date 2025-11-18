/*
 * CHARLIE2 V2 - Property Map with Rental Data Overlay
 * Wrapper component that adds rental data functionality to PropertyMap
 * Features: Toggle button, legend, rental data loading and display
 * Used by discover and engage pages
 */
'use client';

import { useState, useEffect } from 'react';
import PropertyMap from './PropertyMap';
import { ProcessedRentData, RentDataProcessor } from '@/lib/v2/rentDataProcessor';

interface PropertyMapWithRentsProps {
  properties: any[];
  className?: string;
  context?: 'discover' | 'engage' | 'buybox';
  currentViewMode?: string;
  isShowingFavorites?: boolean;
  searchQuery?: string;
  hasSearched?: boolean;
  // Engage page filter states
  selectedMarkets?: string[];
  selectedStatuses?: string[];
  selectedSource?: string;
  selectedPipelineStage?: string;
}

export default function PropertyMapWithRents(props: PropertyMapWithRentsProps) {
  const [showRentOverlay, setShowRentOverlay] = useState(true);
  const [rentData, setRentData] = useState<ProcessedRentData[]>([]);
  const [isLoadingRentData, setIsLoadingRentData] = useState(true);

  // Load rental data from CSV file on component mount (same as legacy version)
  useEffect(() => {
    const loadRentData = async () => {
      try {
        setIsLoadingRentData(true);
        
        // Fetch rental data from CSV file (same as legacy my-properties)
        const response = await fetch('/Monthly Rental Rates.csv?v=3');
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        // Use same RentDataProcessor as legacy version
        const processor = new RentDataProcessor(csvText);
        const processedData = processor.processRentData();
        
        setRentData(processedData);
      } catch (error) {
        console.error('Error loading rent data:', error);
        setRentData([]);
      } finally {
        setIsLoadingRentData(false);
      }
    };

    loadRentData();
  }, []);

  return (
    <div className={`relative ${props.className}`}>
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] space-y-2">
        {rentData.length > 0 && (
          <button
            onClick={() => setShowRentOverlay(!showRentOverlay)}
            className={`px-4 py-2 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 transition-all duration-300 ${showRentOverlay
              ? 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700'
              : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
              }`}
          >
            {showRentOverlay ? 'Hide Rents' : 'Show Rents'}
          </button>
        )}
      </div>

      {/* Rental Data Legend */}
      {showRentOverlay && !isLoadingRentData && rentData.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Average Rent (Market Segments)</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
              <span className="text-xs text-gray-600">Q1: Very Low Cost (Under $1,000)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0EA5E9' }}></div>
              <span className="text-xs text-gray-600">Q2: Low Cost ($1,000-$1,399)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6B7280' }}></div>
              <span className="text-xs text-gray-600">Q3: Moderate Cost ($1,400-$1,799)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
              <span className="text-xs text-gray-600">Q4: High Cost ($1,800-$2,399)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DC2626' }}></div>
              <span className="text-xs text-gray-600">Q5: Very High Cost ($2,400+)</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
            Rental data available for {rentData.length} MSAs
          </div>
        </div>
      )}

      {/* Loading overlay for rent data */}
      {isLoadingRentData && (
        <div className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading rental data...</span>
          </div>
        </div>
      )}

      {/* Property Map */}
      <PropertyMap
        {...props}
        rentData={rentData}
        showRentOverlay={showRentOverlay}
        className="h-full w-full"
      />
    </div>
  );
}