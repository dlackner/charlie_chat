// SkipTraceButton.tsx - Skip Trace Button Component

'use client';

import { useState } from 'react';
import type { SkipTraceButtonProps } from './types';
import { validateSkipTraceData, performSkipTrace } from './skipTraceService';
import { generateSkipTracePdf } from './skipTracePdfGenerator';

export const SkipTraceButton = ({ listing, userClass }: SkipTraceButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has permission
  const hasPermission = userClass === 'charlie_chat_pro' || userClass === 'cohort';

  // Validate if required data is available
  const validation = validateSkipTraceData(listing);
  const canPerformSkipTrace = hasPermission && validation.isValid;

  const handleSkipTrace = async () => {
    if (!canPerformSkipTrace) return;

    setIsLoading(true);
    setError(null);

    try {
      // Perform the skip trace
      const contactSummary = await performSkipTrace(listing);
      
      // Generate and download the PDF
      await generateSkipTracePdf(contactSummary);
      
    } catch (err) {
      console.error('Skip trace error:', err);
      
      // Handle different types of errors
      if (err instanceof Error) {
        if (err.message.includes('Missing required data')) {
          setError('Missing owner or property information');
        } else if (err.message.includes('API call failed')) {
          setError('Skip trace service temporarily unavailable');
        } else if (err.message.includes('Skip trace failed')) {
          setError('No contact information found for this owner');
        } else {
          setError('Failed to generate contact report');
        }
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

  // Render disabled button with tooltip if data is missing
  if (!validation.isValid) {
    return (
      <button
        disabled
        className="bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed opacity-50"
        title={`Missing required information: ${validation.missingFields.join(', ')}`}
      >
        Skip Trace 🔍
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleSkipTrace}
        disabled={isLoading}
        className={`
          px-4 py-2 rounded font-medium transition-all duration-150 ease-in-out
          transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500
          ${isLoading
            ? 'bg-gray-400 text-white cursor-wait opacity-75'
            : 'bg-black text-white hover:bg-gray-900 hover:scale-105 active:scale-90'
          }
        `}
      >
        {isLoading ? 'Searching...' : 'Skip Trace 🔍'}
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