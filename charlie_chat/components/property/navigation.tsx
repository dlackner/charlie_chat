// navigation.tsx - Property Modal Navigation Component

'use client';

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PropertyNavigationProps {
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export const PropertyNavigation = ({
  onPrev,
  onNext,
  canGoPrev,
  canGoNext
}: PropertyNavigationProps) => {
  return (
    <>
      {/* Previous Button */}
      <button 
        onClick={onPrev} 
        disabled={!canGoPrev} 
        className={`
          absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors
          ${canGoPrev 
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Next Button */}
      <button 
        onClick={onNext} 
        disabled={!canGoNext} 
        className={`
          absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors
          ${canGoNext 
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </>
  );
};