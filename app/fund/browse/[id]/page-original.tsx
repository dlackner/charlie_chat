'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  Printer
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
}

export default function SubmissionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = params?.id as string;
  const { user, supabase, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [showInvestmentAnalysis, setShowInvestmentAnalysis] = useState(false);

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
          purchase_price: offerData?.purchasePrice || undefined
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
        console.error('Submission ID:', submissionId);
        console.error('Error details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load submission details');
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
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg mb-6 overflow-hidden">
                  {/* Highlights Header Band */}
                  <div className="bg-blue-600 px-4 py-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Highlights</h4>
                  </div>
                  
                  {/* Metrics Grid */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Capital Structure</p>
                      <p className="text-base font-semibold text-gray-900">{submission.partnership_type}</p>
                    </div>
                    {submission.purchase_price && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Purchase Price</p>
                        <p className="text-base font-semibold text-gray-900">
                          ${(submission.purchase_price / 1000000).toFixed(2)}M
                        </p>
                      </div>
                    )}
                    {submission.cash_on_cash_return && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Cash on Cash</p>
                        <p className="text-base font-semibold text-gray-900">{submission.cash_on_cash_return}</p>
                      </div>
                    )}
                    {submission.irr && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">IRR</p>
                        <p className="text-base font-semibold text-gray-900">{submission.irr}</p>
                      </div>
                    )}
                    {submission.cap_rate && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Cap Rate</p>
                        <p className="text-base font-semibold text-gray-900">{submission.cap_rate}</p>
                      </div>
                    )}
                    {submission.dcr && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">DCR</p>
                        <p className="text-base font-semibold text-gray-900">{submission.dcr}</p>
                      </div>
                    )}
                    </div>
                  </div>
                </div>


                {/* Reports & Analysis */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg mb-8 overflow-hidden">
                  {/* Reports Header Band */}
                  <div className="bg-green-600 px-4 py-2">
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Reports & Analysis</h2>
                  </div>
                  
                  {/* Reports Content */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 gap-4">
                    {/* Property Profile */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => router.push(`/fund/property-profile?property=${submission.property_id}&offer=${submission.offer_scenario_id}&returnUrl=/fund/browse/${submissionId}`)}
                        className="flex-1 flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <div className="flex items-center">
                          <div className="text-left">
                            <span className="font-medium block">Property Profile</span>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-purple-600" />
                      </button>
                      <button 
                        onClick={() => window.open(`/fund/property-profile-print?property=${submission.property_id}&offer=${submission.offer_scenario_id}`, '_blank')}
                        className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        title="Print Property Profile"
                      >
                        <Printer className="h-4 w-4 text-purple-600" />
                      </button>
                    </div>

                    {/* 10-Year Cash Flow */}
                    <button 
                      onClick={handleGenerate10YearCashFlow}
                      className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="text-left">
                          <span className="font-medium block">10-Year Cash Flow</span>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-green-600" />
                    </button>

                    {/* Investment Analysis */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          if (submission.investment_analysis_html?.html) {
                            // Toggle inline display
                            setShowInvestmentAnalysis(!showInvestmentAnalysis);
                          } else {
                            alert('No investment analysis available for this submission.');
                          }
                        }}
                        className="flex-1 flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center">
                          <div className="text-left">
                            <span className="font-medium block">
                              {submission.investment_analysis_html?.html ? 
                                (showInvestmentAnalysis ? 'Hide Investment Analysis' : 'Show Investment Analysis') :
                                'Investment Analysis'
                              }
                            </span>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-blue-600" />
                      </button>
                      {submission.investment_analysis_html?.html && (
                        <button 
                          onClick={() => window.open(`/fund/investment-analysis-print-view/${submissionId}`, '_blank')}
                          className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Print Investment Analysis"
                        >
                          <Printer className="h-4 w-4 text-blue-600" />
                        </button>
                      )}
                    </div>
                    </div>
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
                    <div className="text-sm text-gray-600">Investors interested</div>
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
    </AuthGuard>
  );
}