// SkipTraceButton.tsx - Skip Trace Button Component

'use client';

import { useState } from 'react';
import type { SkipTraceButtonProps } from './types';
import { validateSkipTraceData, getContactSummaryForPdf } from './skipTraceService';
import { generateSkipTracePdf } from './skipTracePdfGenerator';

export const SkipTraceButton = ({ listing, userClass }: SkipTraceButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has permission
  const hasPermission = userClass === 'charlie_chat_pro' || userClass === 'cohort';

  // Validate if required data is available for full skip trace
  const validation = validateSkipTraceData(listing);
  
  // Check if we have minimum data needed for PDF generation (owner name OR property address)
  const hasMinimumData = (listing.owner1FirstName?.trim() || listing.owner1LastName?.trim() || listing.address?.address?.trim());

  const handleSkipTrace = async () => {
    if (!hasPermission || !hasMinimumData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use the new function that handles incomplete data gracefully
      const contactSummary = await getContactSummaryForPdf(listing);
      
      // Generate and download the PDF
      await generateSkipTracePdf(contactSummary);
      
    } catch (err) {
      console.error('Skip trace error:', err);
      
      // Handle different types of errors
      if (err instanceof Error) {
        setError('Failed to generate contact report');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render button if user doesn't have permission
  if (!hasPermission) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleSkipTrace}
        disabled={isLoading || !hasMinimumData}
        className={`
          px-4 py-2 rounded font-medium transition-all duration-150 ease-in-out
          transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500
          ${isLoading || !hasMinimumData
            ? 'bg-gray-400 text-white cursor-not-allowed opacity-50'
            : 'bg-black text-white hover:bg-gray-900 hover:scale-105 active:scale-90'
          }
        `}
        title={
          !hasMinimumData
            ? 'Missing owner name and property address'
            : 'Generate skip trace report'
        }
      >
        {isLoading 
          ? 'Generating...' 
          : 'Skip Trace 🔍'
        }
      </button>
      
      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm whitespace-nowrap z-10">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700 font-bold"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};