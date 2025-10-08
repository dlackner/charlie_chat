'use client';

import { useState, useEffect, Suspense } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Building, 
  MapPin, 
  Heart,
  Eye,
  Filter,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';

interface Submission {
  id: string;
  property_id: string;
  deal_summary: string;
  partnership_type: string;
  created_at: string;
  view_count: number;
  interest_count: number;
  user_id: string;
  // Property details will be joined
  address?: string;
  city?: string;
  state?: string;
  units_count?: number;
  // Submitter details will be joined
  submitter_name?: string;
  submitter_email?: string;
}

function BrowseSubmissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, supabase, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Check for success message
  useEffect(() => {
    const success = searchParams?.get('success');
    if (success === 'created') {
      setShowSuccessMessage(true);
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [searchParams]);

  // Fetch submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            properties (address, city, state, units_count),
            profiles (full_name, email)
          `)
          .eq('is_public', true)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedSubmissions: Submission[] = data?.map(item => ({
          id: item.id,
          property_id: item.property_id,
          deal_summary: item.deal_summary,
          partnership_type: item.partnership_type,
          created_at: item.created_at,
          view_count: item.view_count,
          interest_count: item.interest_count,
          user_id: item.user_id,
          address: item.properties?.address,
          city: item.properties?.city,
          state: item.properties?.state,
          units_count: item.properties?.units_count,
          submitter_name: item.profiles?.full_name,
          submitter_email: item.profiles?.email
        })) || [];

        setSubmissions(formattedSubmissions);
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setError('Failed to load submissions');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [supabase]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Handle viewing a submission (increment view count)
  const handleViewSubmission = async (submissionId: string) => {
    try {
      // Increment view count
      await supabase
        .from('submissions')
        .update({ view_count: (submissions.find(s => s.id === submissionId)?.view_count || 0) + 1 })
        .eq('id', submissionId);

      // Navigate to submission details
      router.push(`/fund/browse/${submissionId}`);
    } catch (err) {
      console.error('Error updating view count:', err);
      // Still navigate even if view count update fails
      router.push(`/fund/browse/${submissionId}`);
    }
  };

  if (loading || authLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading submissions...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Investment Opportunities</h1>
                <p className="text-gray-600">
                  Discover multifamily investment opportunities from fellow investors
                </p>
              </div>
              <button
                onClick={() => router.push('/fund/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Submission
              </button>
            </div>
          </div>

          {/* Success Message */}
          {showSuccessMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <p className="text-green-800">
                  Your submission has been created successfully and is now available for investors to view.
                </p>
              </div>
            </div>
          )}

          {/* Browse Submissions */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Investment Opportunities</h2>
              <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions available yet</h3>
                <p className="text-gray-500 mb-6">
                  Be the first to share an investment opportunity with the community.
                </p>
                <button
                  onClick={() => router.push('/fund/create')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Submission
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {submissions.map((submission) => (
                  <div 
                    key={submission.id} 
                    className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewSubmission(submission.id)}
                  >
                    <div className="h-48 bg-gray-300 flex items-center justify-center">
                      <Building className="h-16 w-16 text-gray-500" />
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{submission.address}</h3>
                          <p className="text-sm text-gray-600 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {submission.city}, {submission.state}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">{submission.units_count} units</span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {submission.deal_summary}
                      </p>

                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {submission.partnership_type}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span>By {submission.submitter_name || 'Anonymous'}</span>
                        <span>{formatDate(submission.created_at)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Heart className="h-4 w-4 mr-1" />
                            {submission.interest_count}
                          </span>
                          <span className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {submission.view_count}
                          </span>
                        </div>
                        <span className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function BrowseSubmissionsPage() {
  return (
    <Suspense fallback={
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading submissions...</p>
          </div>
        </div>
      </AuthGuard>
    }>
      <BrowseSubmissionsContent />
    </Suspense>
  );
}