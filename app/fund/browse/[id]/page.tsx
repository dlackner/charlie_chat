'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { 
  Building, 
  MapPin, 
  Heart,
  Eye,
  Mail,
  Download,
  ArrowLeft,
  TrendingUp,
  FileText
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
  offer_scenario_id: string;
  // Property details will be joined
  address?: string;
  city?: string;
  state?: string;
  units_count?: number;
  // Submitter details will be joined
  submitter_name?: string;
  submitter_email?: string;
}

export default function SubmissionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params?.id as string;
  const { user, supabase, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);

  // Fetch submission details
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!submissionId || !supabase) return;

      try {
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            properties (address, city, state, units_count),
            profiles (full_name, email)
          `)
          .eq('id', submissionId)
          .eq('is_public', true)
          .eq('status', 'active')
          .single();

        if (error) throw error;

        const formattedSubmission: Submission = {
          id: data.id,
          property_id: data.property_id,
          deal_summary: data.deal_summary,
          partnership_type: data.partnership_type,
          created_at: data.created_at,
          view_count: data.view_count,
          interest_count: data.interest_count,
          user_id: data.user_id,
          offer_scenario_id: data.offer_scenario_id,
          address: data.properties?.address,
          city: data.properties?.city,
          state: data.properties?.state,
          units_count: data.properties?.units_count,
          submitter_name: data.profiles?.full_name,
          submitter_email: data.profiles?.email
        };

        setSubmission(formattedSubmission);

        // Check if current user has expressed interest
        if (user) {
          const { data: interestData } = await supabase
            .from('submission_interests')
            .select('id')
            .eq('submission_id', submissionId)
            .eq('user_id', user.id)
            .single();
          
          setHasExpressedInterest(!!interestData);
        }

      } catch (err) {
        console.error('Error fetching submission:', err);
        setError('Failed to load submission details');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId, supabase, user]);

  // Handle expressing interest
  const handleExpressInterest = async () => {
    try {
      if (!user || !supabase) {
        alert('Please sign in to express interest');
        return;
      }

      if (!submission) return;

      if (hasExpressedInterest) {
        // Remove interest
        await supabase
          .from('submission_interests')
          .delete()
          .eq('submission_id', submissionId)
          .eq('user_id', user.id);

        // Decrement interest count
        await supabase
          .from('submissions')
          .update({ interest_count: Math.max(0, submission.interest_count - 1) })
          .eq('id', submissionId);

        setHasExpressedInterest(false);
        setSubmission(prev => prev ? { ...prev, interest_count: Math.max(0, prev.interest_count - 1) } : null);
      } else {
        // Add interest
        await supabase
          .from('submission_interests')
          .insert({
            submission_id: submissionId,
            user_id: user.id
          });

        // Increment interest count
        await supabase
          .from('submissions')
          .update({ interest_count: submission.interest_count + 1 })
          .eq('id', submissionId);

        setHasExpressedInterest(true);
        setSubmission(prev => prev ? { ...prev, interest_count: prev.interest_count + 1 } : null);
      }
    } catch (err) {
      console.error('Error expressing interest:', err);
      alert('Failed to update interest. Please try again.');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading || authLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading submission details...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !submission) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Submission not found'}</p>
            <button 
              onClick={() => router.push('/fund/browse')} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Browse
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
              onClick={() => router.push('/fund/browse')}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Browse
            </button>
          </div>

          {/* Submission Details */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main Content */}
              <div className="lg:col-span-2">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{submission.address}</h1>
                  <p className="text-gray-600 flex items-center mb-4">
                    <MapPin className="h-4 w-4 mr-1" />
                    {submission.city}, {submission.state} • {submission.units_count} Units
                  </p>
                  <div className="h-64 bg-gray-300 rounded-lg flex items-center justify-center mb-6">
                    <Building className="h-24 w-24 text-gray-500" />
                  </div>
                </div>

                {/* Deal Summary */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Deal Summary</h2>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                    {submission.deal_summary}
                  </p>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Partnership Type</span>
                        <span className="font-semibold">{submission.partnership_type}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reports */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Reports & Analysis</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => window.open(`/fund/property-profile?property=${submission.property_id}`, '_blank')}
                      className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-purple-600 mr-3" />
                        <div className="text-left">
                          <span className="font-medium block">Property Profile</span>
                          <span className="text-sm text-gray-600">Complete property details with images</span>
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-purple-600" />
                    </button>
                    <button className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                      <div className="flex items-center">
                        <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                        <div className="text-left">
                          <span className="font-medium block">10-Year Cash Flow</span>
                          <span className="text-sm text-gray-600">PDF projection from offer analyzer</span>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-green-600" />
                    </button>
                    <button 
                      onClick={() => window.open(`/fund/investment-analysis?property=${submission.property_id}&offer=${submission.offer_scenario_id}`, '_blank')}
                      className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-blue-600 mr-3" />
                        <div className="text-left">
                          <span className="font-medium block">Investment Analysis</span>
                          <span className="text-sm text-gray-600">AI-generated comprehensive report</span>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Submitter Info */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Submitted By</h3>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-semibold text-lg">
                        {submission.submitter_name ? 
                          submission.submitter_name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                          'U'
                        }
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{submission.submitter_name || 'Anonymous'}</h4>
                    <p className="text-sm text-gray-600 mb-4">Investor</p>
                    {submission.submitter_email && (
                      <a
                        href={`mailto:${submission.submitter_email}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Contact
                      </a>
                    )}
                  </div>
                </div>

                {/* Interest Tracking */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Interest Level</h3>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{submission.interest_count}</div>
                    <div className="text-sm text-gray-600">investors interested</div>
                  </div>
                  <button 
                    onClick={handleExpressInterest}
                    className={`w-full px-4 py-2 rounded-lg transition-colors mb-3 ${
                      hasExpressedInterest 
                        ? 'bg-gray-500 text-white hover:bg-gray-600' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    <Heart className={`h-4 w-4 mr-2 inline ${hasExpressedInterest ? 'fill-current' : ''}`} />
                    {hasExpressedInterest ? 'Interest Expressed' : 'Express Interest'}
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Posted</span>
                      <span className="font-medium">{formatDate(submission.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Views</span>
                      <span className="font-medium">{submission.view_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interested</span>
                      <span className="font-medium">{submission.interest_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}