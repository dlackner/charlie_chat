/*
 * CHARLIE2 V2 - Capital Club Page
 * Exclusive investment club for multifamily real estate investors
 * Features enrollment modal and community metrics
 */
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StandardModalWithActions } from '@/components/shared/StandardModal';
import CapitalClubDetailsModal from '@/components/shared/CapitalClubDetailsModal';
import { Crown, Users, TrendingUp, Star, Shield, Zap, ExternalLink } from 'lucide-react';

export default function CapitalClubPage() {
  const { user, supabase } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSignInRequiredModal, setShowSignInRequiredModal] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch user enrollment status and club metrics
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !supabase) return;

      try {
        // Get user's enrollment status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('capital_club_enrolled')
          .eq('user_id', user.id)
          .single();

        if (!profileError && profile) {
          setIsEnrolled(profile.capital_club_enrolled || false);
        }

      } catch (error) {
        console.error('Error fetching Capital Club data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, supabase]);

  const handleEnroll = async () => {
    if (!user?.id || !supabase) return;

    setIsEnrolling(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          capital_club_enrolled: true,
          capital_club_enrolled_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setIsEnrolled(true);
      setShowEnrollModal(false);
      
      // Show success modal
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error enrolling in Capital Club:', error);
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error('Failed to enroll. Please try again.');
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Capital Club
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              An exclusive community of multifamily real estate investors connecting capital with opportunity.
            </p>
          </div>

          {/* Metrics Cards - Hidden for now */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{clubMembersCount}</div>
                  <div className="text-sm text-gray-500">Total Members</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Club Members</h3>
              <p className="text-gray-600 text-sm">
                Exclusive members actively participating in capital partnerships and deal flow.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">-</div>
                  <div className="text-sm text-gray-500">Community</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Members</h3>
              <p className="text-gray-600 text-sm">
                Extended network of investors and industry professionals.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Coming Soon
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Building className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">-</div>
                  <div className="text-sm text-gray-500">Properties</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Candidate Properties</h3>
              <p className="text-gray-600 text-sm">
                Pre-screened investment opportunities available to club members.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Coming Soon
                </span>
              </div>
            </div>
          </div> */}

          {/* Benefits Section */}
          <div className="mb-16 mt-16">
            {/* Access Level Cards */}
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Capital Club Access Levels
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {/* Core/Plus Members */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Core & Plus Members</h3>
                    <p className="text-sm text-gray-600">Investment Access</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700">Invest in deals originated by Professional & Cohort members</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700">Network with other investors</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700">Professional deal analysis and underwriting</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Cannot submit properties for funding</p>
                  </div>
                </div>
                <div className="mt-6 hidden">
                  <button
                    onClick={() => setShowDetailsModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg py-4 px-6 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
                  >
                    How does it work?
                    <ExternalLink className="h-5 w-5 ml-2" />
                  </button>
                </div>
              </div>

              {/* Pro/Cohort Members */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg p-8 border-2 border-purple-200">
                <div className="flex items-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mr-4">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Professional & Cohort Members</h3>
                    <p className="text-sm text-gray-600">Full Access</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700 font-semibold">Submit properties for Capital Club funding</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700">Act as Program Manager for your transactions</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700">Access investor database for capital raising</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700">Priority deal promotion to network</p>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => setShowDetailsModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg py-4 px-6 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
                  >
                    How does it work?
                    <ExternalLink className="h-5 w-5 ml-2" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* CTA Section */}
          {!(user && isEnrolled) && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
                <h2 className="text-3xl font-bold mb-4">Ready to Join?</h2>
                <p className="text-xl mb-8 opacity-90">
                  Become part of an exclusive community driving multifamily investment success.
                </p>
                <button
                  onClick={() => {
                    if (!user) {
                      // Show sign-in required modal
                      setShowSignInRequiredModal(true);
                    } else {
                      // Everyone can join - show enrollment modal
                      setShowEnrollModal(true);
                    }
                  }}
                  className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
                >
                  <Crown className="h-5 w-5 mr-2" />
                  Join the Capital Club
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Enrollment Modal */}
        <StandardModalWithActions
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          title="Join the Capital Club"
          primaryAction={{
            label: isEnrolling ? 'Joining...' : 'Join Now',
            onClick: handleEnroll,
            disabled: isEnrolling
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setShowEnrollModal(false)
          }}
        >
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Capital Club Membership</h3>
                <p className="text-gray-600">Exclusive access to multifamily investment opportunities</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Join our exclusive community of multifamily real estate investors and gain access to capital networks, 
              deal promotion, and expert resources to accelerate your investment success.
            </p>
            
            <p className="text-sm text-gray-600">
              By enrolling, you confirm that you are an active multifamily real estate investor and agree to 
              participate in the Capital Club community.
            </p>
          </div>
        </StandardModalWithActions>

        {/* Success Modal */}
        <StandardModalWithActions
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Welcome to the Capital Club!"
          primaryAction={{
            label: 'Got it',
            onClick: () => setShowSuccessModal(false),
          }}
        >
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
                <Crown className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Congratulations on Joining the Capital Club!
              </h3>
              
              <p className="text-gray-600">
                You're now part of an exclusive community of multifamily real estate investors. 
                We'll be contacting you soon with more details about the Capital Club, including 
                how to access our investor database, submit properties, and connect with other members.
              </p>
            </div>
          </div>
        </StandardModalWithActions>


        {/* Sign-In Required Modal */}
        <StandardModalWithActions
          isOpen={showSignInRequiredModal}
          onClose={() => setShowSignInRequiredModal(false)}
          title="Sign In Required"
          primaryAction={{
            label: 'Go to Home Page',
            onClick: () => {
              window.location.href = '/';
            },
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setShowSignInRequiredModal(false)
          }}
        >
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
                <Crown className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Please Sign In to Join
              </h3>
              
              <p className="text-gray-600">
                To join the Capital Club, please return to the home page, sign in to your account, and then return here to complete your enrollment.
              </p>
            </div>
          </div>
        </StandardModalWithActions>

        {/* Capital Club Details Modal */}
        <CapitalClubDetailsModal 
          isOpen={showDetailsModal} 
          onClose={() => setShowDetailsModal(false)} 
        />
      </div>
  );
}