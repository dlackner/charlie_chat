'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StandardModalWithActions } from '@/components/shared/StandardModal';
import { 
  Crown, 
  Users, 
  Building, 
  MapPin, 
  DollarSign, 
  Calendar,
  Heart,
  MessageCircle,
  Download,
  Filter,
  Mail,
  Star,
  TrendingUp,
  FileText,
  Eye,
  Plus
} from 'lucide-react';

export default function CapitalClubMockupPage() {
  const [activeSection, setActiveSection] = useState<'create' | 'browse' | 'detail'>('browse');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showOfferPrompt, setShowOfferPrompt] = useState(false);

  // Mock data
  const mockProperty = {
    id: '12345',
    address: '432 Elm Street',
    city: 'Atlanta',
    state: 'GA',
    units: 24,
    year_built: 1995,
    estimated_value: 2850000,
    assessed_value: 2600000,
    image: '/api/placeholder/400/300'
  };

  // Mock favorites with Engaged or LOI Sent status
  const mockFavorites = [
    {
      property_id: '12345',
      address: '432 Elm Street',
      city: 'Atlanta',
      state: 'GA',
      units: 24,
      favorite_status: 'Engaged',
      year_built: 1995,
      estimated_value: 2850000,
      assessed_value: 2600000
    },
    {
      property_id: '67890',
      address: '789 Oak Lane',
      city: 'Charlotte',
      state: 'NC', 
      units: 36,
      favorite_status: 'LOI Sent',
      year_built: 2005,
      estimated_value: 4200000,
      assessed_value: 3900000
    },
    {
      property_id: '11111',
      address: '123 Pine Road',
      city: 'Nashville',
      state: 'TN',
      units: 18,
      favorite_status: 'Engaged',
      year_built: 2010,
      estimated_value: 1950000,
      assessed_value: 1800000
    }
  ];

  // Mock offer scenarios for selected property
  const mockOfferScenarios = {
    '12345': [
      {
        offer_id: 'offer-1',
        name: 'Base Case - 5% Renovation',
        is_active: true,
        purchase_price: 2850000,
        renovation_budget: 142500,
        projected_irr: '18.5%'
      },
      {
        offer_id: 'offer-2',
        name: 'Value Add - Full Renovation',
        is_active: true,
        purchase_price: 2850000,
        renovation_budget: 450000,
        projected_irr: '22.3%'
      }
    ],
    '67890': [
      {
        offer_id: 'offer-3',
        name: 'Conservative Approach',
        is_active: true,
        purchase_price: 4200000,
        renovation_budget: 200000,
        projected_irr: '15.2%'
      }
    ],
    '11111': [] // No offers yet
  };

  const mockSubmissions = [
    {
      id: 1,
      property: {
        address: '432 Elm Street',
        city: 'Atlanta',
        state: 'GA',
        units: 24,
        image: '/api/placeholder/300/200'
      },
      submitter: {
        name: 'Sarah Johnson',
        email: 'sarah@multifamilyinvest.com'
      },
      dealSummary: 'Value-add opportunity in growing Atlanta market. Building needs moderate renovations with strong upside potential.',
      askingPrice: 2850000,
      partnership: 'LP Investment',
      submittedAt: '2024-09-28',
      interestCount: 7,
      commentCount: 3
    },
    {
      id: 2,
      property: {
        address: '1847 Maple Avenue',
        city: 'Nashville',
        state: 'TN',
        units: 36,
        image: '/api/placeholder/300/200'
      },
      submitter: {
        name: 'Mike Rodriguez',
        email: 'mrodriguez@capitalgroup.com'
      },
      dealSummary: 'Fully renovated property in hot Nashville market. Immediate cash flow with minimal capex needs.',
      askingPrice: 4200000,
      partnership: 'Joint Venture',
      submittedAt: '2024-09-25',
      interestCount: 12,
      commentCount: 8
    },
    {
      id: 3,
      property: {
        address: '759 Oak Drive',
        city: 'Charlotte',
        state: 'NC',
        units: 18,
        image: '/api/placeholder/300/200'
      },
      submitter: {
        name: 'David Chen',
        email: 'dchen@southeastdev.com'
      },
      dealSummary: 'Ground-up development opportunity. Permits approved, construction ready to begin.',
      askingPrice: 1950000,
      partnership: 'Development Partner',
      submittedAt: '2024-09-20',
      interestCount: 5,
      commentCount: 2
    }
  ];

  const mockComments = [
    {
      id: 1,
      user: 'Jennifer Lopez',
      email: 'jlopez@realtypartners.com',
      comment: 'Great location! What\'s the current occupancy rate?',
      timestamp: '2024-09-29 10:30 AM'
    },
    {
      id: 2,
      user: 'Robert Kim',
      email: 'rkim@atlantafunds.com',
      comment: 'We\'re interested in the renovation scope. Can you share more details on the capex requirements?',
      timestamp: '2024-09-29 2:15 PM'
    },
    {
      id: 3,
      user: 'Maria Santos',
      email: 'msantos@growthcap.com',
      comment: 'This fits our investment criteria perfectly. Would love to discuss further.',
      timestamp: '2024-09-30 9:45 AM'
    }
  ];

  const handleSubmission = async () => {
    setIsSubmitting(true);
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setShowSubmissionModal(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Capital Club</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                MOCKUP
              </span>
            </div>
            <p className="text-gray-600">
              Share investment opportunities and connect with capital partners
            </p>
          </div>

          {/* Section Navigation */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveSection('create')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSection === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              1. Create Submission
            </button>
            <button
              onClick={() => setActiveSection('browse')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSection === 'browse'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              2. Browse Opportunities
            </button>
            <button
              onClick={() => setActiveSection('detail')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSection === 'detail'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              3. Submission Details
            </button>
          </div>

          {/* Section 1: Create Submission */}
          {activeSection === 'create' && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Submission</h2>
              
              {/* Step 1: Property Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Property (Engaged or LOI Sent only)
                </label>
                <select
                  value={selectedPropertyId || ''}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setSelectedOfferId(null);
                    // Check if property has offers
                    const offers = mockOfferScenarios[e.target.value] || [];
                    if (offers.length === 0) {
                      setShowOfferPrompt(true);
                    }
                  }}
                  className="max-w-2xl border border-gray-300 rounded-lg p-3"
                >
                  <option value="">Choose a property...</option>
                  {mockFavorites.map(property => (
                    <option key={property.property_id} value={property.property_id}>
                      {property.address}, {property.city}, {property.state} - {property.units} units ({property.favorite_status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Offer Scenario Selection */}
              {selectedPropertyId && (mockOfferScenarios[selectedPropertyId]?.length > 0) && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Offer Scenario
                  </label>
                  <select
                    value={selectedOfferId || ''}
                    onChange={(e) => setSelectedOfferId(e.target.value)}
                    className="max-w-2xl border border-gray-300 rounded-lg p-3"
                  >
                    <option value="">Choose an offer scenario...</option>
                    {mockOfferScenarios[selectedPropertyId].map(offer => (
                      <option key={offer.offer_id} value={offer.offer_id}>
                        {offer.name} - ${(offer.purchase_price / 1000000).toFixed(2)}M (IRR: {offer.projected_irr})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* No Offers Alert */}
              {showOfferPrompt && selectedPropertyId && (mockOfferScenarios[selectedPropertyId]?.length === 0) && (
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
                        You must create a Financial Analysis prior to submitting your investment to the Capital Club. Return to the Engage page, find your property, and create a Financial Analysis. Then return here to complete your submission.
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
                      const property = mockFavorites.find(p => p.property_id === selectedPropertyId);
                      const offer = mockOfferScenarios[selectedPropertyId]?.find(o => o.offer_id === selectedOfferId);
                      return property ? (
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
                                <span className="ml-2 font-medium">{property.units}</span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Year Built:</span>
                                <span className="ml-2 font-medium">{property.year_built}</span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Purchase Price:</span>
                                <span className="ml-2 font-medium text-green-600">${offer?.purchase_price.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Projected IRR:</span>
                                <span className="ml-2 font-medium text-blue-600">{offer?.projected_irr}</span>
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
                      onClick={() => window.open('/capital-club-mockup/property-profile', '_blank')}
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
                      onClick={() => window.open('/capital-club-mockup/investment-analysis', '_blank')}
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
                    Share with Capital Club
                  </button>
                </>
              )}
            </div>
          )}

          {/* Section 2: Browse Opportunities */}
          {activeSection === 'browse' && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Browse Opportunities</h2>
                <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockSubmissions.map((submission) => (
                  <div key={submission.id} className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-48 bg-gray-300 flex items-center justify-center">
                      <Building className="h-16 w-16 text-gray-500" />
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{submission.property.address}</h3>
                          <p className="text-sm text-gray-600 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {submission.property.city}, {submission.property.state}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">{submission.property.units} units</span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {submission.dealSummary}
                      </p>

                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm">
                          <span className="text-gray-500">Asking:</span>
                          <span className="ml-1 font-semibold text-green-600">
                            ${(submission.askingPrice / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {submission.partnership}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span>By {submission.submitter.name}</span>
                        <span>{submission.submittedAt}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Heart className="h-4 w-4 mr-1" />
                            {submission.interestCount}
                          </span>
                          <span className="flex items-center">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            {submission.commentCount}
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveSection('detail')}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Submission Detail */}
          {activeSection === 'detail' && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Content */}
                <div className="lg:col-span-2">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">432 Elm Street</h2>
                    <p className="text-gray-600 flex items-center mb-4">
                      <MapPin className="h-4 w-4 mr-1" />
                      Atlanta, GA • 24 Units • Built 1995
                    </p>
                    <div className="h-64 bg-gray-300 rounded-lg flex items-center justify-center mb-6">
                      <Building className="h-24 w-24 text-gray-500" />
                    </div>
                  </div>

                  {/* Deal Summary */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Deal Summary</h3>
                    <p className="text-gray-700 mb-4">
                      Value-add opportunity in growing Atlanta market. Building needs moderate renovations with strong upside potential. 
                      Current rents are below market, providing immediate opportunity to increase NOI through targeted improvements.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Asking Price</span>
                          <span className="font-semibold text-green-600">$2.85M</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Partnership Type</span>
                          <span className="font-semibold">LP Investment</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reports */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports & Analysis</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <button 
                        onClick={() => window.open('/capital-club-mockup/property-profile', '_blank')}
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
                        onClick={() => window.open('/capital-club-mockup/investment-analysis', '_blank')}
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

                  {/* Comments */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Discussion</h3>
                    <div className="space-y-4 mb-6">
                      {mockComments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{comment.user}</span>
                            <span className="text-sm text-gray-500">{comment.timestamp}</span>
                          </div>
                          <p className="text-gray-700 mb-2">{comment.comment}</p>
                          <button className="text-blue-600 hover:text-blue-700 text-sm">
                            Reply
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <textarea
                        placeholder="Add a comment..."
                        className="w-full bg-white border border-gray-200 rounded-lg p-3 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end mt-3">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          Post Comment
                        </button>
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
                        <span className="text-white font-semibold text-lg">SJ</span>
                      </div>
                      <h4 className="font-semibold text-gray-900">Sarah Johnson</h4>
                      <p className="text-sm text-gray-600 mb-4">Multifamily Investment Group</p>
                      <a
                        href="mailto:sarah@multifamilyinvest.com"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Contact
                      </a>
                    </div>
                  </div>

                  {/* Interest Tracking */}
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Interest Level</h3>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-blue-600 mb-1">7</div>
                      <div className="text-sm text-gray-600">investors interested</div>
                    </div>
                    <button className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors mb-3">
                      <Heart className="h-4 w-4 mr-2 inline" />
                      Express Interest
                    </button>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>• Jennifer Lopez</div>
                      <div>• Robert Kim</div>
                      <div>• Maria Santos</div>
                      <div>• +4 others</div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Posted</span>
                        <span className="font-medium">3 days ago</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Views</span>
                        <span className="font-medium">42</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Downloads</span>
                        <span className="font-medium">8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Submission Modal */}
        <StandardModalWithActions
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          title="Share with Capital Club"
          primaryAction={{
            label: isSubmitting ? 'Submitting...' : 'Submit to Capital Club',
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
                defaultValue="Value-add opportunity in growing Atlanta market. Building needs moderate renovations with strong upside potential."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asking Price
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="$2,850,000"
                  defaultValue="$2,850,000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partnership Type
                </label>
                <select className="w-full border border-gray-300 rounded-lg p-3">
                  <option>LP Investment</option>
                  <option>Joint Venture</option>
                  <option>Development Partner</option>
                  <option>Equity Partner</option>
                </select>
              </div>
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