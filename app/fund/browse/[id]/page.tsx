'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAlert } from '@/components/shared/AlertModal';
import { generate10YearCashFlowReport } from '@/app/offer-analyzer/cash-flow-report';
import { 
  Building, 
  MapPin, 
  Heart,
  Eye,
  Mail,
  Download,
  ArrowLeft,
  TrendingUp,
  FileText,
  Printer,
  MessageCircle,
  Send,
  Reply,
  Edit2,
  Trash2,
  Copy
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
  cash_flow_pdf_url?: string;
  external_file_url?: string;
  investment_analysis_html?: any; // JSONB
  investment_analysis_html_updated_at?: string;
  // Financial metrics
  purchase_price?: number;
  cash_on_cash_return?: string;
  irr?: string;
  cap_rate?: string;
  dcr?: string;
  // Property details will be joined
  address?: string;
  city?: string;
  state?: string;
  units_count?: number;
  // Submitter details will be joined
  submitter_name?: string;
  submitter_email?: string;
  // Offer scenario data
  offer_data?: any;
}

interface Comment {
  id: string;
  comment_text: string;
  reply_to_comment_id: string | null;
  reply_context_snippet: string | null;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  user_id: string;
  user_name: string;
  replies: Comment[];
}

interface InterestedInvestor {
  id: string;
  name: string;
  email: string;
  expressed_at: string;
}

export default function SubmissionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = params?.id as string;
  const { user, supabase, isLoading: authLoading } = useAuth();
  const { showDelete, AlertComponent } = useAlert();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [showInvestmentAnalysis, setShowInvestmentAnalysis] = useState(false);
  const [interestedInvestors, setInterestedInvestors] = useState<InterestedInvestor[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [pricingVariations, setPricingVariations] = useState<any[]>([]);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  
  // Comment state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Fetch submission details
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!submissionId || !supabase) return;

      try {

        // First, let's get just the submission without joins
        const { data: rawSubmission, error: rawError } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', submissionId)
          .single();


        // Try to get the property separately
        if (rawSubmission?.property_id) {
          const { data: propertyCheck, error: propError } = await supabase
            .from('saved_properties')
            .select('property_id, address_street')
            .eq('property_id', rawSubmission.property_id)
            .single();
          
        }

        // Get submission with saved_properties join only
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            saved_properties (address_street, address_full, address_city, address_state, units_count)
          `)
          .eq('id', submissionId)
          .eq('is_public', true)
          .eq('status', 'active')
          .single();


        if (error) {
          console.error('Supabase error details:', error);
          throw error;
        }

        if (!data) {
          throw new Error(`No submission found with ID ${submissionId} that is public and active`);
        }

        // Separately fetch profile data
        let profileData = null;
        if (data.user_id) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', data.user_id)
            .single();
          
          profileData = profile;
        }

        // Fetch offer scenario details if available
        let offerData = null;
        if (data.offer_scenario_id) {
          const { data: offerScenarioData } = await supabase
            .from('offer_scenarios')
            .select('offer_data')
            .eq('id', data.offer_scenario_id)
            .single();
          
          offerData = offerScenarioData?.offer_data;
        }

        // Combine the data
        data.profiles = profileData;

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
          cash_flow_pdf_url: data.cash_flow_pdf_url,
          external_file_url: data.external_file_url,
          investment_analysis_html: data.investment_analysis_html,
          investment_analysis_html_updated_at: data.investment_analysis_html_updated_at,
          address: data.saved_properties?.address_street || data.saved_properties?.address_full,
          city: data.saved_properties?.address_city,
          state: data.saved_properties?.address_state,
          units_count: data.saved_properties?.units_count,
          submitter_name: data.profiles?.full_name,
          submitter_email: data.profiles?.email,
          // Extract metrics from offer_data
          cap_rate: offerData?.dispositionCapRate ? `${offerData.dispositionCapRate}%` : undefined,
          dcr: offerData?.debt_service_coverage_ratio || undefined,
          cash_on_cash_return: offerData?.cash_on_cash_return || undefined,
          irr: offerData?.projected_irr || undefined,
          purchase_price: offerData?.purchasePrice || undefined,
          offer_data: offerData
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

        // Fetch interested investors for hover tooltip
        await fetchInterestedInvestors();

      } catch (err) {
        console.error('Error fetching submission:', err);
        console.error('Submission ID:', submissionId);
        console.error('Error details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load submission details');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId, supabase, user]);

  // Fetch pricing variations
  const fetchPricingVariations = async () => {
    if (!submissionId) return;

    try {
      console.log('Fetching pricing variations for submissionId:', submissionId);
      const response = await fetch(`/api/pricing-variations?submissionId=${submissionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Pricing variations data:', data);
        setPricingVariations(data.variations || []);
      } else {
        console.error('Failed to fetch pricing variations, status:', response.status);
        setPricingVariations([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Error fetching pricing variations:', error);
      setPricingVariations([]); // Set empty array on error
    }
  };

  // Fetch interested users for tooltip
  const fetchInterestedInvestors = async () => {
    if (!submissionId || !supabase) return;

    try {
      // First get the submission interests
      const { data: interests, error } = await supabase
        .from('submission_interests')
        .select('id, created_at, user_id')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching submission interests:', error);
        return;
      }

      if (!interests || interests.length === 0) {
        setInterestedInvestors([]);
        return;
      }

      // Get unique user IDs
      const userIds = interests.map(i => i.user_id);

      // Fetch all profiles at once
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, full_name')
        .in('user_id', userIds);

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
      }

      // Map interests to investors with profile data
      const investors: InterestedInvestor[] = interests.map((interest) => {
        const profile = profiles?.find(p => p.user_id === interest.user_id);
        let name = 'Anonymous User';
        
        if (profile) {
          if (profile.full_name) {
            name = profile.full_name.trim();
          } else if (profile.first_name || profile.last_name) {
            name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          }
        }

        return {
          id: interest.id,
          name: name || 'Anonymous User',
          email: '',
          expressed_at: interest.created_at
        };
      });

      setInterestedInvestors(investors);
    } catch (err) {
      console.error('Error fetching interested users:', err);
    }
  };

  // Fetch comments
  const fetchComments = async () => {
    if (!submissionId || !supabase) return;
    
    setCommentsLoading(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch comments:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Load comments when submission loads
  useEffect(() => {
    if (submission) {
      fetchComments();
    }
  }, [submission]);

  // Create new comment
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || !submissionId) return;

    try {
      const response = await fetch(`/api/submissions/${submissionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment_text: newComment.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [data.comment, ...prev]);
        setNewComment('');
      } else {
        const errorData = await response.json();
        if (errorData.error?.includes('Profile incomplete')) {
          alert('Please complete your profile with your first and last name before commenting. You can update your profile in Account settings.');
        } else {
          alert(errorData.error || 'Failed to post comment');
        }
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    }
  };

  // Submit reply
  const handleSubmitReply = async (parentCommentId: string, parentText: string) => {
    if (!replyText.trim() || !user || !submissionId) return;

    try {
      const response = await fetch(`/api/submissions/${submissionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment_text: replyText.trim(),
          reply_to_comment_id: parentCommentId,
          reply_context_snippet: parentText.length > 100 ? parentText.substring(0, 97) + '...' : parentText,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add reply to the parent comment
        setComments(prev => 
          prev.map(comment => 
            comment.id === parentCommentId 
              ? { ...comment, replies: [...comment.replies, data.comment] }
              : comment
          )
        );
        setReplyText('');
        setReplyingTo(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Failed to post reply');
    }
  };

  // Edit comment
  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment_text: editText.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update comment in state
        setComments(prev => 
          prev.map(comment => {
            if (comment.id === commentId) {
              return data.comment;
            }
            // Check replies
            if (comment.replies.some(reply => reply.id === commentId)) {
              return {
                ...comment,
                replies: comment.replies.map(reply => 
                  reply.id === commentId ? data.comment : reply
                )
              };
            }
            return comment;
          })
        );
        setEditingComment(null);
        setEditText('');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to edit comment');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      alert('Failed to edit comment');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    showDelete(
      'Are you sure you want to delete this comment? This action cannot be undone.',
      async () => {

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove comment from state
        setComments(prev => 
          prev.filter(comment => {
            if (comment.id === commentId) return false;
            // Filter out replies too
            comment.replies = comment.replies.filter(reply => reply.id !== commentId);
            return true;
          })
        );
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
      }
    );
  };

  // Format date for comments
  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

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
        // Refresh the interested investors list
        await fetchInterestedInvestors();
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
        // Refresh the interested investors list
        await fetchInterestedInvestors();
      }
    } catch (err) {
      console.error('Error expressing interest:', err);
      alert('Failed to update interest. Please try again.');
    }
  };

  // Handle 10-Year Cash Flow report generation
  const handleGenerate10YearCashFlow = async () => {
    
    if (!submission) return;

    // Check if PDF exists - if so, just open it
    if (submission.cash_flow_pdf_url) {
      window.open(submission.cash_flow_pdf_url, '_blank');
    } else {
      alert('No cash flow report available for this submission.');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Fetch pricing variations when component loads
  useEffect(() => {
    fetchPricingVariations();
  }, [submissionId]);

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
              onClick={() => {
                const source = searchParams?.get('source');
                if (source === 'manage') {
                  router.push('/fund/create');
                } else {
                  router.push('/fund/browse');
                }
              }} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back
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
              onClick={() => {
                const source = searchParams?.get('source');
                if (source === 'manage') {
                  router.push('/fund/create');
                } else {
                  router.push('/fund/browse');
                }
              }}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
                  <div 
                    className="h-64 bg-gray-200 relative mb-6 cursor-pointer"
                    onClick={() => {
                      const fullAddress = `${submission.address}, ${submission.city}, ${submission.state}`;
                      const encodedAddress = encodeURIComponent(fullAddress);
                      const streetViewUrl = `https://www.google.com/maps/place/${encodedAddress}`;
                      window.open(streetViewUrl, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <img 
                      src={`https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(submission.address + ', ' + submission.city + ', ' + submission.state)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                      alt={submission.address}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                        const icon = document.createElement('div');
                        icon.innerHTML = '<svg class="h-24 w-24 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" /></svg>';
                        e.currentTarget.parentElement?.appendChild(icon.firstChild as Node);
                      }}
                    />
                  </div>
                </div>

                {/* Financial Highlights Section */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-lg mb-6 overflow-hidden">
                  {/* Highlights Header Band */}
                  <div className="bg-blue-600 px-6 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-white tracking-wide">HIGHLIGHTS</h4>
                  </div>
                  
                  {/* Metrics Grid */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Submitted By</p>
                      <p className="text-lg font-semibold text-gray-900">{submission.submitter_name || 'Anonymous'}</p>
                      {submission.submitter_email && (
                        <p className="text-sm text-blue-600 mt-1">{submission.submitter_email}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Capital Structure</p>
                      <p className="text-lg font-semibold text-gray-900">{submission.partnership_type}</p>
                    </div>
                    {submission.purchase_price && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Purchase Price</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ${(submission.purchase_price / 1000000).toFixed(2)}M
                        </p>
                      </div>
                    )}
                    {submission.cash_on_cash_return && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Cash on Cash</p>
                        <p className="text-lg font-semibold text-gray-900">{submission.cash_on_cash_return}</p>
                      </div>
                    )}
                    {submission.irr && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">IRR</p>
                        <p className="text-lg font-semibold text-gray-900">{submission.irr}</p>
                      </div>
                    )}
                    {submission.cap_rate && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Cap Rate</p>
                        <p className="text-lg font-semibold text-gray-900">{submission.cap_rate}</p>
                      </div>
                    )}
                    {submission.dcr && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">DCR</p>
                        <p className="text-lg font-semibold text-gray-900">{submission.dcr}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Submitted</p>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(submission.created_at)}</p>
                    </div>
                    </div>
                  </div>
                </div>


                {/* Reports & Analysis */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-lg mb-8 overflow-hidden">
                  {/* Reports Header Band */}
                  <div className="bg-blue-600 px-6 py-3 border-b border-gray-200">
                    <h2 className="text-sm font-medium text-white tracking-wide">REPORTS & ANALYSIS</h2>
                  </div>
                  
                  {/* Reports Content */}
                  <div className="p-6">
                    {/* Investment Thesis */}
                    {submission.deal_summary && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Investment Thesis</h3>
                        <div className="group bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 cursor-pointer">
                          <div className="text-sm text-gray-700 line-clamp-3 group-hover:line-clamp-none transition-all duration-200">
                            {submission.deal_summary}
                          </div>
                          <div className="text-xs text-gray-500 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            Hover to expand full text
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Report Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                      {/* Property Profile */}
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="border-l-4 border-purple-500 pl-2 mb-4">
                          <div className="text-base font-bold text-gray-900">Property Profile</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => router.push(`/fund/property-profile?property=${submission.property_id}&offer=${submission.offer_scenario_id}&returnUrl=/fund/browse/${submissionId}`)}
                            className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => window.open(`/fund/property-profile-print?property=${submission.property_id}&offer=${submission.offer_scenario_id}`, '_blank')}
                            className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                            title="Print Property Profile"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* 10-Year Cash Flow */}
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="border-l-4 border-green-500 pl-2 mb-4">
                          <div className="text-base font-bold text-gray-900">Cash<br />Flow</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleGenerate10YearCashFlow}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            View
                          </button>
                          <button 
                            onClick={handleGenerate10YearCashFlow}
                            className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                            title="Print 10-Year Cash Flow"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Pricing Scenario */}
                      {submission.offer_scenario_id && (
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="border-l-4 border-orange-500 pl-2 mb-4">
                            <div className="text-base font-bold text-gray-900">Pricing Scenario</div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => router.push(`/fund/pricing-scenario-view/${submission.offer_scenario_id}`)}
                              className="flex-1 px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                            >
                              View
                            </button>
                            <button 
                              onClick={() => window.open(`/fund/pricing-scenario-view/${submission.offer_scenario_id}?print=true`, '_blank')}
                              className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                              title="Print Pricing Scenario"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Investment Analysis */}
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="border-l-4 border-blue-500 pl-2 mb-4">
                          <div className="text-base font-bold text-gray-900">Investment Analysis</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (submission.investment_analysis_html?.html) {
                                setShowInvestmentAnalysis(!showInvestmentAnalysis);
                              } else {
                                alert('No investment analysis available for this submission.');
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            {submission.investment_analysis_html?.html ? 
                              (showInvestmentAnalysis ? 'Hide' : 'Show') :
                              'View'
                            }
                          </button>
                          {submission.investment_analysis_html?.html && (
                            <button 
                              onClick={() => window.open(`/fund/investment-analysis-print-view/${submissionId}`, '_blank')}
                              className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                              title="Print Investment Analysis"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Other Files */}
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="border-l-4 border-teal-500 pl-2 mb-4">
                          <div className="text-base font-bold text-gray-900">Other Files</div>
                        </div>
                        <div className="flex gap-2">
                          {submission.external_file_url ? (
                            <button 
                              onClick={() => {
                                let url = submission.external_file_url!;
                                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                  url = 'https://' + url;
                                }
                                window.open(url, '_blank');
                              }}
                              className="flex-1 px-3 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors"
                            >
                              View
                            </button>
                          ) : (
                            <div className="flex-1 px-3 py-2 bg-gray-300 text-gray-500 text-sm rounded cursor-not-allowed">
                              No files
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing Sandbox Row */}
                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-md font-medium text-gray-800">Pricing Sandbox</h4>
                          <p className="text-xs text-gray-500 mt-1">Community scenarios and experiments</p>
                        </div>
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">{pricingVariations.length} Scenarios</span>
                      </div>
                      
                      {/* Scrollable Scenarios Gallery */}
                      <div className="relative">
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          
                          {/* Create New Scenario */}
                          <div className="flex-shrink-0 w-64 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 shadow-sm border-2 border-dashed border-amber-200 hover:border-amber-300 transition-colors">
                            <div className="border-l-4 border-amber-500 pl-2 mb-4">
                              <div className="text-sm font-bold text-gray-900">Create Scenario</div>
                              <div className="text-xs text-gray-500">Modify the original assumptions to reflect your recommendations</div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={async () => {
                                  try {
                                    // Create new pricing variation with copied data from original submission
                                    const response = await fetch('/api/pricing-variations', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        submissionId,
                                        analysisName: `Scenario - ${new Date().toLocaleDateString()}`,
                                        description: 'Alternative pricing scenario based on original submission',
                                        scenarioData: submission.offer_data,
                                        copyFromOriginal: true
                                      })
                                    });

                                    const data = await response.json();
                                    if (response.ok) {
                                      // Redirect to offer analyzer with the new variation ID
                                      router.push(`/offer-analyzer?variationId=${data.variation.id}&submissionId=${submissionId}`);
                                    } else {
                                      console.error('Failed to create pricing variation:', data.error);
                                      alert('Failed to create scenario. Please try again.');
                                    }
                                  } catch (error) {
                                    console.error('Error creating pricing variation:', error);
                                    alert('Failed to create scenario. Please try again.');
                                  }
                                }}
                                className="flex-1 px-3 py-2 bg-amber-500 text-white text-sm rounded hover:bg-amber-600 transition-colors font-medium"
                              >
                                New Scenario
                              </button>
                            </div>
                          </div>

                          {/* Real scenarios from database */}
                          {pricingVariations.map((variation, index) => (
                            <div key={variation.id} className="flex-shrink-0 w-64 bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                              <div className="relative">
                                <div 
                                  className={`border-l-4 pl-2 mb-4 ${
                                    index % 8 === 0 ? 'border-indigo-500' :
                                    index % 8 === 1 ? 'border-rose-500' :
                                    index % 8 === 2 ? 'border-emerald-500' :
                                    index % 8 === 3 ? 'border-purple-500' :
                                    index % 8 === 4 ? 'border-cyan-500' :
                                    index % 8 === 5 ? 'border-pink-500' :
                                    index % 8 === 6 ? 'border-orange-500' : 'border-teal-500'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="text-sm font-bold text-gray-900">
                                      {variation.profiles?.first_name || 'Unknown'} {variation.profiles?.last_name || 'User'}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {/* Copy button - visible to all users */}
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            const response = await fetch(`/api/pricing-variations`, {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                submissionId: submissionId,
                                                analysisName: `Copy of ${variation.analysis_name}`,
                                                description: `Copy of ${variation.description || 'scenario'}`,
                                                scenarioData: variation.scenario_data,
                                                copyFromOriginal: true
                                              })
                                            });
                                            
                                            if (response.ok) {
                                              // Refresh pricing variations to show the new copy
                                              fetchPricingVariations();
                                            } else {
                                              console.error('Failed to copy scenario');
                                              alert('Failed to copy scenario. Please try again.');
                                            }
                                          } catch (error) {
                                            console.error('Error copying scenario:', error);
                                            alert('Failed to copy scenario. Please try again.');
                                          }
                                        }}
                                        className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                                        title="Copy scenario"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </button>
                                      
                                      {/* Delete button - only for owners */}
                                      {user?.id === variation.user_id && (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              const response = await fetch(`/api/pricing-variations/${variation.id}`, {
                                                method: 'DELETE'
                                              });
                                              
                                              if (response.ok) {
                                                // Remove from local state
                                                setPricingVariations(prev => prev.filter(v => v.id !== variation.id));
                                              } else {
                                                console.error('Failed to delete scenario');
                                              }
                                            } catch (error) {
                                              console.error('Error deleting scenario:', error);
                                            }
                                          }}
                                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                          title="Delete scenario"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div 
                                    className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 h-8 overflow-hidden"
                                    onClick={() => setExpandedScenario(expandedScenario === variation.id ? null : variation.id)}
                                  >
                                    {expandedScenario === variation.id 
                                      ? variation.description || 'No description provided'
                                      : `${(variation.description || 'Custom scenario analysis').substring(0, 50)}... (click to expand)`
                                    }
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    // Pass the variation ID instead of the entire data
                                    router.push(`/offer-analyzer?variationId=${variation.id}&submissionId=${submissionId}&readOnly=true`);
                                  }}
                                  className={`flex-1 px-3 py-2 text-white text-sm rounded transition-colors ${
                                    index % 8 === 0 ? 'bg-indigo-600 hover:bg-indigo-700' :
                                    index % 8 === 1 ? 'bg-rose-600 hover:bg-rose-700' :
                                    index % 8 === 2 ? 'bg-emerald-600 hover:bg-emerald-700' :
                                    index % 8 === 3 ? 'bg-purple-600 hover:bg-purple-700' :
                                    index % 8 === 4 ? 'bg-cyan-600 hover:bg-cyan-700' :
                                    index % 8 === 5 ? 'bg-pink-600 hover:bg-pink-700' :
                                    index % 8 === 6 ? 'bg-orange-600 hover:bg-orange-700' : 'bg-teal-600 hover:bg-teal-700'
                                  }`}
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Show placeholder only when no scenarios exist */}
                          {pricingVariations.length === 0 && (
                            <div className="flex-shrink-0 w-64 bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-200 flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <div className="text-sm mb-2">No scenarios yet</div>
                                <div className="text-xs">Be the first to create a scenario</div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>

                      {/* Info Footer */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 text-center">
{pricingVariations.length} community scenarios • {pricingVariations.length === 0 ? 'Create the first scenario for this property' : 'Scroll horizontally to view all scenarios'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Interest & Views */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Interest Level</h3>
                      <div className="relative inline-block">
                        <div 
                          className="text-3xl font-bold text-blue-600 mb-1"
                          onMouseEnter={() => setShowTooltip(true)}
                          onMouseLeave={() => setShowTooltip(false)}
                        >
                          {submission.interest_count}
                        </div>
                        {showTooltip && interestedInvestors.length > 0 && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-700 whitespace-nowrap z-50">
                            {interestedInvestors.map((investor, index) => (
                              <div key={investor.id} className={index > 0 ? 'mt-1' : ''}>
                                {investor.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Interested</div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Views</h3>
                      <div className="text-3xl font-bold text-green-600 mb-1">{submission.view_count}</div>
                      <div className="text-sm text-gray-600">Property views</div>
                    </div>
                  </div>
                  <button 
                    onClick={handleExpressInterest}
                    className={`w-full px-4 py-2 rounded-lg transition-colors mt-4 ${
                      hasExpressedInterest 
                        ? 'bg-gray-500 text-white hover:bg-gray-600' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    <Heart className={`h-4 w-4 mr-2 inline ${hasExpressedInterest ? 'fill-current' : ''}`} />
                    {hasExpressedInterest ? 'Remove Interest' : 'Express Interest'}
                  </button>
                </div>

                {/* Comments Section */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <MessageCircle className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Discussion ({comments.length})
                    </h3>
                  </div>

                  {/* New Comment Form */}
                  {user ? (
                    <div className="mb-6">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts about this property..."
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        maxLength={500}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {newComment.length}/500 characters
                        </span>
                        <button
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim()}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Comment
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-blue-700">Please sign in to join the discussion</p>
                    </div>
                  )}

                  {/* Comments List */}
                  <div className="h-150 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                    {commentsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No comments yet. Be the first to share your thoughts!</p>
                      </div>
                    ) : (
                      <div className="space-y-4 p-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                            {/* Main Comment */}
                            <div className="mb-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-white text-xs font-semibold">
                                      {comment.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-900">{comment.user_name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {formatCommentDate(comment.created_at)}
                                      {comment.is_edited && ' (edited)'}
                                    </span>
                                  </div>
                                </div>
                                {user?.id === comment.user_id && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => {
                                        setEditingComment(comment.id);
                                        setEditText(comment.comment_text);
                                      }}
                                      className="p-1 text-gray-400 hover:text-blue-600"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="p-1 text-gray-400 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {editingComment === comment.id ? (
                                <div className="ml-11">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={2}
                                    maxLength={500}
                                  />
                                  <div className="flex justify-end space-x-2 mt-2">
                                    <button
                                      onClick={() => {
                                        setEditingComment(null);
                                        setEditText('');
                                      }}
                                      className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleEditComment(comment.id)}
                                      disabled={!editText.trim()}
                                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-gray-800 ml-11 text-sm">{comment.comment_text}</p>
                                  {user && (
                                    <button
                                      onClick={() => setReplyingTo(comment.id)}
                                      className="ml-11 mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center"
                                    >
                                      <Reply className="h-3 w-3 mr-1" />
                                      Reply
                                    </button>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Reply Form */}
                            {replyingTo === comment.id && (
                              <div className="ml-11 mb-3">
                                <div className="bg-gray-100 p-2 rounded text-xs text-gray-600 mb-2">
                                  Replying to: "{comment.comment_text.length > 50 ? comment.comment_text.substring(0, 50) + '...' : comment.comment_text}"
                                </div>
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write your reply..."
                                  className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  rows={2}
                                  maxLength={500}
                                />
                                <div className="flex justify-end space-x-2 mt-2">
                                  <button
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                    }}
                                    className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSubmitReply(comment.id, comment.comment_text)}
                                    disabled={!replyText.trim()}
                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Replies */}
                            {comment.replies.length > 0 && (
                              <div className="ml-11 space-y-3">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="border-l-2 border-gray-200 pl-4">
                                    <div className="flex items-start justify-between mb-1">
                                      <div className="flex items-center">
                                        <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center mr-2">
                                          <span className="text-white text-xs font-semibold">
                                            {reply.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-900 text-sm">{reply.user_name}</span>
                                          <span className="text-xs text-gray-500 ml-2">
                                            {formatCommentDate(reply.created_at)}
                                            {reply.is_edited && ' (edited)'}
                                          </span>
                                        </div>
                                      </div>
                                      {user?.id === reply.user_id && (
                                        <div className="flex space-x-1">
                                          <button
                                            onClick={() => {
                                              setEditingComment(reply.id);
                                              setEditText(reply.comment_text);
                                            }}
                                            className="p-1 text-gray-400 hover:text-blue-600"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteComment(reply.id)}
                                            className="p-1 text-gray-400 hover:text-red-600"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {reply.reply_context_snippet && (
                                      <div className="text-xs text-gray-500 italic ml-8 mb-1">
                                        "{reply.reply_context_snippet}"
                                      </div>
                                    )}
                                    
                                    {editingComment === reply.id ? (
                                      <div className="ml-8">
                                        <textarea
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          rows={2}
                                          maxLength={500}
                                        />
                                        <div className="flex justify-end space-x-2 mt-2">
                                          <button
                                            onClick={() => {
                                              setEditingComment(null);
                                              setEditText('');
                                            }}
                                            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleEditComment(reply.id)}
                                            disabled={!editText.trim()}
                                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-gray-800 ml-8 text-sm">{reply.comment_text}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Investment Analysis */}
          {showInvestmentAnalysis && submission?.investment_analysis_html?.html && (
            <div className="mt-12 bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <h2 className="text-xl font-semibold text-white">Investment Analysis</h2>
                    <p className="text-sm text-white opacity-90 mt-1">
                      {submission.address}, {submission.city}, {submission.state}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInvestmentAnalysis(false)}
                    className="text-white hover:text-gray-200 transition-colors flex-shrink-0"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <style jsx>{`
                  .investment-analysis-inline .min-h-screen {
                    min-height: auto !important;
                  }
                  .investment-analysis-inline .bg-gray-50 {
                    background-color: transparent !important;
                  }
                  .investment-analysis-inline .max-w-4xl {
                    max-width: none !important;
                  }
                  .investment-analysis-inline .mx-auto {
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                  }
                  .investment-analysis-inline .px-4,
                  .investment-analysis-inline .px-6,
                  .investment-analysis-inline .px-8 {
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                  }
                  .investment-analysis-inline nav,
                  .investment-analysis-inline header,
                  .investment-analysis-inline [class*="shadow-sm"][class*="border-b"] {
                    display: none !important;
                  }
                `}</style>
                <div 
                  className="investment-analysis-inline"
                  dangerouslySetInnerHTML={{ 
                    __html: submission.investment_analysis_html.html
                  }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {AlertComponent}
    </AuthGuard>
  );
}