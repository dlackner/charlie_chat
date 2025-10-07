'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StandardModalWithActions } from '@/components/shared/StandardModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  TrendingUp,
  FileText,
  Plus,
  ArrowLeft
} from 'lucide-react';

interface Property {
  property_id: string;
  address: string;
  city: string;
  state: string;
  units_count: number;
  favorite_status: string;
  year_built?: number;
  estimated_value?: number;
  assessed_value?: number;
}

interface OfferScenario {
  id: string;
  offer_name: string;
  offer_data: {
    purchasePrice?: number;
    projected_irr?: string;
    [key: string]: any;
  };
}

export default function CreateSubmissionPage() {
  const router = useRouter();
  const { user, supabase, isLoading: authLoading } = useAuth();
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showOfferPrompt, setShowOfferPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real data states
  const [engagedProperties, setEngagedProperties] = useState<Property[]>([]);
  const [offerScenarios, setOfferScenarios] = useState<Record<string, OfferScenario[]>>({});

  // Fetch engaged/LOI properties
  useEffect(() => {
    const fetchEngagedProperties = async () => {
      try {
        if (!user || !supabase) return;

        console.log('Current user ID:', user.id);

        const { data, error } = await supabase
          .from('user_favorites')
          .select(`
            property_id,
            favorite_status,
            saved_properties (
              address_street,
              address_city,
              address_state,
              units_count,
              year_built,
              estimated_value,
              assessed_value
            )
          `)
          .eq('user_id', user.id)
          .in('favorite_status', ['Engaged', 'LOI Sent']);

        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }

        console.log('Favorites query result:', data);
        console.log('Query was:', {
          table: 'user_favorites',
          user_id: user.id,
          filter: 'favorite_status IN (Engaged, LOI Sent)'
        });

        const formattedProperties: Property[] = data?.map(item => ({
          property_id: item.property_id,
          address: item.saved_properties?.address_street || '',
          city: item.saved_properties?.address_city || '',
          state: item.saved_properties?.address_state || '',
          units_count: item.saved_properties?.units_count || 0,
          favorite_status: item.favorite_status,
          year_built: item.saved_properties?.year_built,
          estimated_value: item.saved_properties?.estimated_value,
          assessed_value: item.saved_properties?.assessed_value
        })) || [];

        setEngagedProperties(formattedProperties);
      } catch (err) {
        console.error('Error fetching engaged properties:', err);
        setError('Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    fetchEngagedProperties();
  }, [user, supabase]);

  // Fetch offer scenarios for a property
  const fetchOfferScenarios = async (propertyId: string) => {
    try {
      if (!user || !supabase) return;

      const { data, error } = await supabase
        .from('offer_scenarios')
        .select('id, offer_name, offer_data')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      setOfferScenarios(prev => ({
        ...prev,
        [propertyId]: data || []
      }));
    } catch (err) {
      console.error('Error fetching offer scenarios:', err);
    }
  };

  // Handle property selection
  const handlePropertySelection = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedOfferId(null);
    
    // Fetch offer scenarios for this property
    fetchOfferScenarios(propertyId);
    
    // Check if property has offers
    if (!offerScenarios[propertyId] || offerScenarios[propertyId].length === 0) {
      setShowOfferPrompt(true);
    } else {
      setShowOfferPrompt(false);
    }
  };

  // Handle submission
  const handleSubmission = async () => {
    if (!selectedPropertyId || !selectedOfferId) return;

    setIsSubmitting(true);
    try {
      if (!user || !supabase) throw new Error('User not authenticated');

      // Get deal summary from modal form
      const dealSummaryElement = document.querySelector('textarea[placeholder*="Describe the investment"]') as HTMLTextAreaElement;
      const dealSummary = dealSummaryElement?.value || '';

      if (!dealSummary.trim()) {
        alert('Please enter a deal summary');
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          property_id: selectedPropertyId,
          offer_scenario_id: selectedOfferId,
          deal_summary: dealSummary,
          partnership_type: 'Limited Partner',
          status: 'active',
          is_public: true
        })
        .select()
        .single();

      if (error) throw error;

      setShowSubmissionModal(false);
      
      // Redirect to browse page with success message
      router.push(`/fund/browse?success=created&id=${data.id}`);
      
    } catch (err) {
      console.error('Error creating submission:', err);
      alert('Failed to create submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get selected property
  const getSelectedProperty = () => {
    return engagedProperties.find(p => p.property_id === selectedPropertyId);
  };

  // Helper function to get selected offer
  const getSelectedOffer = () => {
    if (!selectedPropertyId || !selectedOfferId) return null;
    return offerScenarios[selectedPropertyId]?.find(o => o.id === selectedOfferId);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading || authLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Submission</h1>
            <p className="text-gray-600">
              Share your investment opportunity with potential capital partners
            </p>
          </div>

          {/* Create Submission Form */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            
            {/* Step 1: Property Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Property (Engaged or LOI Sent only)
              </label>
              {engagedProperties.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    No properties with "Engaged" or "LOI Sent" status found. 
                    Please add properties to your favorites and update their status first.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedPropertyId || ''}
                  onChange={(e) => handlePropertySelection(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3"
                >
                  <option value="">Choose a property...</option>
                  {engagedProperties.map(property => (
                    <option key={property.property_id} value={property.property_id}>
                      {property.address}, {property.city}, {property.state} - {property.units_count} units ({property.favorite_status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 2: Offer Scenario Selection */}
            {selectedPropertyId && offerScenarios[selectedPropertyId] && offerScenarios[selectedPropertyId].length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Offer Scenario
                </label>
                <select
                  value={selectedOfferId || ''}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3"
                >
                  <option value="">Choose an offer scenario...</option>
                  {offerScenarios[selectedPropertyId].map(offer => (
                    <option key={offer.id} value={offer.id}>
                      {offer.offer_name} - ${((offer.offer_data.purchasePrice || 0) / 1000000).toFixed(2)}M {offer.offer_data.projected_irr ? `(IRR: ${offer.offer_data.projected_irr})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* No Offers Alert */}
            {showOfferPrompt && selectedPropertyId && (!offerScenarios[selectedPropertyId] || offerScenarios[selectedPropertyId].length === 0) && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Financial Analysis Required</h3>
                    <p className="mt-2 text-sm text-yellow-700">
                      You must create a Financial Analysis prior to submitting your investment. Return to the Engage page, find your property, and create a Financial Analysis. Then return here to complete your submission.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Property Preview - Only show when property AND offer are selected */}
            {selectedPropertyId && selectedOfferId && (
              <>
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Property</h3>
                  {(() => {
                    const property = getSelectedProperty();
                    const offer = getSelectedOffer();
                    return property && offer ? (
                      <div className="flex gap-6">
                        <div className="w-48 h-32 bg-gray-300 rounded-lg flex items-center justify-center">
                          <Building className="h-12 w-12 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{property.address}</h4>
                          <p className="text-gray-600">{property.city}, {property.state}</p>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <span className="text-sm text-gray-500">Units:</span>
                              <span className="ml-2 font-medium">{property.units_count}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Year Built:</span>
                              <span className="ml-2 font-medium">{property.year_built || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Purchase Price:</span>
                              <span className="ml-2 font-medium text-green-600">{formatCurrency(offer.offer_data.purchasePrice || 0)}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Projected IRR:</span>
                              <span className="ml-2 font-medium text-blue-600">{offer.offer_data.projected_irr || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Auto-generated Reports Preview */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <button 
                    onClick={() => window.open(`/fund/property-profile?property=${selectedPropertyId}`, '_blank')}
                    className="bg-purple-50 rounded-lg p-4 text-center hover:bg-purple-100 transition-colors"
                  >
                    <Building className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Property Profile</h4>
                    <p className="text-sm text-gray-600">Detailed property data with images</p>
                  </button>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">10-Year Cash Flow</h4>
                    <p className="text-sm text-gray-600">PDF from offer analyzer</p>
                  </div>
                  <button 
                    onClick={() => window.open(`/fund/investment-analysis?property=${selectedPropertyId}&offer=${selectedOfferId}`, '_blank')}
                    className="bg-blue-50 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Investment Analysis</h4>
                    <p className="text-sm text-gray-600">AI-generated comprehensive report</p>
                  </button>
                </div>

                {/* Share Button */}
                <button
                  onClick={() => setShowSubmissionModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Submission
                </button>
              </>
            )}
          </div>
        </div>

        {/* Submission Modal */}
        <StandardModalWithActions
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          title="Create Investment Submission"
          primaryAction={{
            label: isSubmitting ? 'Creating...' : 'Create Submission',
            onClick: handleSubmission,
            disabled: isSubmitting
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setShowSubmissionModal(false)
          }}
        >
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deal Summary
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 resize-none"
                rows={3}
                placeholder="Describe the investment opportunity, key highlights, and what you're looking for in a partner..."
                defaultValue=""
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partnership Type
              </label>
              <select className="w-full border border-gray-300 rounded-lg p-3" defaultValue="Limited Partner">
                <option value="Limited Partner">Limited Partner</option>
              </select>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What will be included:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Property Profile - Complete property details with images and data</li>
                <li>• 10-Year Cash Flow - PDF from your selected offer scenario</li>
                <li>• Investment Analysis - AI-generated comprehensive investment report</li>
              </ul>
            </div>
          </div>
        </StandardModalWithActions>
      </div>
    </AuthGuard>
  );
}