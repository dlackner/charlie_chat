'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface Submission {
  id: string;
  investment_analysis_html?: any;
  investment_analysis_html_updated_at?: string;
}

export default function InvestmentAnalysisViewPage() {
  const params = useParams();
  const submissionId = params?.id as string;
  const { supabase } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);

  // Fetch submission HTML data
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!submissionId || !supabase) return;

      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('id, investment_analysis_html, investment_analysis_html_updated_at')
          .eq('id', submissionId)
          .eq('is_public', true)
          .eq('status', 'active')
          .single();

        if (error) throw error;
        setSubmission(data);
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
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading investment analysis...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !submission?.investment_analysis_html?.html) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        {/* Render the stored HTML directly */}
        <div 
          dangerouslySetInnerHTML={{ 
            __html: submission.investment_analysis_html.html 
          }} 
        />
        
        {/* Optional: Add any additional styles if needed */}
        {submission.investment_analysis_html.styles && (
          <style dangerouslySetInnerHTML={{ 
            __html: submission.investment_analysis_html.styles 
          }} />
        )}
      </div>
    </AuthGuard>
  );
}