'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Submission {
  id: string;
  investment_analysis_html?: any;
  investment_analysis_html_updated_at?: string;
  property_id?: string;
  saved_properties?: {
    address_street: string;
    address_city: string;
    address_state: string;
  };
}

export default function InvestmentAnalysisPrintViewPage() {
  const params = useParams();
  const submissionId = params?.id as string;
  const { supabase } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);

  // Helper function to add property address to Executive Summary header
  const addPropertyAddressToHTML = (html: string, propertyInfo?: any) => {
    if (!propertyInfo || !html) return html;
    
    const address = `${propertyInfo.address_street}, ${propertyInfo.address_city}, ${propertyInfo.address_state}`;
    
    // Find the Executive Summary header and add the address
    return html.replace(
      /<h2 className="text-xl font-semibold text-white">Executive Summary<\/h2>/g,
      `<h2 class="text-xl font-semibold text-white">Executive Summary</h2>
       <p class="text-sm text-white opacity-90 mt-1">${address}</p>`
    );
  };

  // Fetch submission HTML data
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!submissionId || !supabase) return;

      try {
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            id, 
            investment_analysis_html, 
            investment_analysis_html_updated_at,
            property_id,
            saved_properties (
              address_street,
              address_city, 
              address_state
            )
          `)
          .eq('id', submissionId)
          .eq('is_public', true)
          .eq('status', 'active')
          .single();

        if (error) throw error;
        
        // Fix the saved_properties array issue
        const formattedData = {
          ...data,
          saved_properties: Array.isArray(data.saved_properties) ? data.saved_properties[0] : data.saved_properties
        };
        
        setSubmission(formattedData);
      } catch (err) {
        console.error('Error fetching submission:', err);
        setError('Failed to load investment analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId, supabase]);


  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading investment analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !submission?.investment_analysis_html?.html) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Investment analysis not available'}</p>
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-content {
            margin: 0 !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
        
        @media screen {
          .print-content {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 40px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }

        /* Clean up the HTML content for printing */
        .investment-analysis-print .min-h-screen {
          min-height: auto !important;
        }
        .investment-analysis-print .bg-gray-50 {
          background-color: transparent !important;
        }
        .investment-analysis-print .max-w-4xl {
          max-width: none !important;
        }
        .investment-analysis-print .mx-auto {
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        .investment-analysis-print .px-4,
        .investment-analysis-print .px-6,
        .investment-analysis-print .px-8 {
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .investment-analysis-print .py-8 {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .investment-analysis-print nav,
        .investment-analysis-print header,
        .investment-analysis-print [class*="shadow-sm"][class*="border-b"],
        .investment-analysis-print button {
          display: none !important;
        }
      `}</style>

      <div className="min-h-screen bg-gray-100">
        {/* Screen-only controls */}
        <div className="no-print bg-white shadow-sm border-b p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Investment Analysis - Print View</h1>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Print
              </button>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Print content */}
        <div className="print-content">
          <div 
            className="investment-analysis-print"
            dangerouslySetInnerHTML={{ 
              __html: addPropertyAddressToHTML(submission.investment_analysis_html.html, submission.saved_properties)
            }} 
          />
        </div>
      </div>
    </>
  );
}