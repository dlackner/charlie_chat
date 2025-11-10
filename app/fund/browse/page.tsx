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
  offer_scenario_id?: string;
  // Property details will be joined
  address?: string;
  city?: string;
  state?: string;
  units_count?: number;
  // Submitter details will be joined
  submitter_name?: string;
  submitter_email?: string;
  // Offer scenario metrics
  cap_rate?: string;
  dcr?: string;
  cash_on_cash_return?: string;
  irr?: string;
  purchase_price?: number;
}

function BrowseSubmissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, supabase, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [partnershipTypeFilter, setPartnershipTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string}[]>([]);
  const [availablePartnershipTypes, setAvailablePartnershipTypes] = useState<string[]>([]);

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
        // First get submissions
        const { data, error } = await supabase
          .from('submissions')
          .select('id, property_id, deal_summary, partnership_type, created_at, view_count, interest_count, user_id, offer_scenario_id')
          .eq('is_public', true)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Then fetch property and profile details for each submission
        const formattedSubmissions: Submission[] = await Promise.all(
          (data || []).map(async (item) => {
            // Get property details
            const { data: propertyData } = await supabase
              .from('saved_properties')
              .select('address_street, address_full, address_city, address_state, units_count')
              .eq('property_id', item.property_id)
              .single();

            // Get profile details
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', item.user_id)
              .single();

            // Get offer scenario details if available
            let offerData = null;
            if (item.offer_scenario_id) {
              const { data: offerScenarioData } = await supabase
                .from('offer_scenarios')
                .select('offer_data')
                .eq('id', item.offer_scenario_id)
                .single();
              
              offerData = offerScenarioData?.offer_data;
            }

            return {
              id: item.id,
              property_id: item.property_id,
              deal_summary: item.deal_summary,
              partnership_type: item.partnership_type,
              created_at: item.created_at,
              view_count: item.view_count,
              interest_count: item.interest_count,
              user_id: item.user_id,
              offer_scenario_id: item.offer_scenario_id,
              address: propertyData?.address_street || propertyData?.address_full,
              city: propertyData?.address_city,
              state: propertyData?.address_state,
              units_count: propertyData?.units_count,
              submitter_name: profileData?.full_name,
              submitter_email: profileData?.email,
              // Extract metrics from offer_data
              cap_rate: offerData?.dispositionCapRate ? `${offerData.dispositionCapRate}%` : undefined,
              dcr: offerData?.debt_service_coverage_ratio || undefined,
              cash_on_cash_return: offerData?.cash_on_cash_return || undefined,
              irr: offerData?.projected_irr || undefined,
              purchase_price: offerData?.purchasePrice || undefined
            };
          })
        );

        setSubmissions(formattedSubmissions);
        setFilteredSubmissions(formattedSubmissions);
        
        // Extract unique partnership types and users for filters
        const uniquePartnershipTypes = [...new Set(formattedSubmissions.map(s => s.partnership_type))].filter(Boolean);
        const uniqueUsers = [...new Map(
          formattedSubmissions
            .filter(s => s.submitter_name)
            .map(s => [s.user_id, { id: s.user_id, name: s.submitter_name! }])
        ).values()];
        
        setAvailablePartnershipTypes(uniquePartnershipTypes);
        setAvailableUsers(uniqueUsers);
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setError('Failed to load submissions');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [supabase]);

  // Filter submissions when filters change
  useEffect(() => {
    let filtered = submissions;
    
    if (partnershipTypeFilter) {
      filtered = filtered.filter(s => s.partnership_type === partnershipTypeFilter);
    }
    
    if (userFilter) {
      filtered = filtered.filter(s => s.user_id === userFilter);
    }
    
    setFilteredSubmissions(filtered);
  }, [submissions, partnershipTypeFilter, userFilter]);

  // Clear filters
  const clearFilters = () => {
    setPartnershipTypeFilter('');
    setUserFilter('');
  };

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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Investment Opportunities</h1>
                <p className="text-gray-600">
                  Discover multifamily investment opportunities from fellow investors
                </p>
              </div>
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
              <div className="flex items-center gap-4">
                {(partnershipTypeFilter || userFilter) && (
                  <span className="text-sm text-gray-600">
                    {filteredSubmissions.length} of {submissions.length} results
                  </span>
                )}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                    showFilters || partnershipTypeFilter || userFilter
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            {showFilters && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Partnership Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Partnership Type
                    </label>
                    <select
                      value={partnershipTypeFilter}
                      onChange={(e) => setPartnershipTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Types</option>
                      {availablePartnershipTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* User Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Submitted By
                    </label>
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Users</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      disabled={!partnershipTypeFilter && !userFilter}
                      className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            )}

            {filteredSubmissions.length === 0 && submissions.length > 0 ? (
              <div className="text-center py-12">
                <Filter className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your filters to see more opportunities.
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : submissions.length === 0 ? (
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
                {filteredSubmissions.map((submission) => (
                  <div 
                    key={submission.id} 
                    className="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200"
                    onClick={() => handleViewSubmission(submission.id)}
                  >
                    <div className="h-48 bg-gray-200 relative">
                      <img 
                        src={`https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(submission.address + ', ' + submission.city + ', ' + submission.state)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                        alt={submission.address}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          const icon = document.createElement('div');
                          icon.innerHTML = '<svg class="h-16 w-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" /></svg>';
                          e.currentTarget.parentElement?.appendChild(icon.firstChild as Node);
                        }}
                      />
                    </div>
                    
                    <div className="p-6">
                      {/* Property Header */}
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{submission.address}</h3>
                            <p className="text-sm text-gray-600 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {submission.city}, {submission.state} • {submission.units_count} units
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Financial Highlights Section */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg mb-4 overflow-hidden">
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

                      {/* Submitter Info */}
                      <div className="text-sm text-gray-600 mb-4">
                        <span>By {submission.submitter_name || 'Anonymous'}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(submission.created_at)}</span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center text-sm text-gray-500">
                            <Heart className="h-4 w-4 mr-1" />
                            {submission.interest_count}
                          </span>
                          <span className="flex items-center text-sm text-gray-500">
                            <Eye className="h-4 w-4 mr-1" />
                            {submission.view_count}
                          </span>
                        </div>
                        <span className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
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