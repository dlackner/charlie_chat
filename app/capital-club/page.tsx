/*
 * CHARLIE2 V2 - Capital Club Page
 * Exclusive investment club for multifamily real estate investors
 * Features enrollment modal and community metrics
 */
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StandardModalWithActions } from '@/components/shared/StandardModal';
import { Crown, Users, Building, TrendingUp, Star, Shield, Zap } from 'lucide-react';

export default function CapitalClubPage() {
  const { user, supabase } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [clubMembersCount, setClubMembersCount] = useState(0);
  const [userClass, setUserClass] = useState<string>('trial');

  // Fetch user enrollment status and club metrics
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !supabase) return;

      try {
        // Get user's enrollment status and user class
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('capital_club_enrolled, user_class')
          .eq('user_id', user.id)
          .single();

        if (!profileError && profile) {
          setIsEnrolled(profile.capital_club_enrolled || false);
          setUserClass(profile.user_class || 'trial');
        }

        // Get count of enrolled club members
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('capital_club_enrolled', true);

        if (!countError) {
          setClubMembersCount(count || 0);
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
      setClubMembersCount(prev => prev + 1);
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
    <AuthGuard>
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
            
            {isEnrolled ? (
              <div className="inline-flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-full font-medium">
                <Crown className="h-5 w-5 mr-2" />
                Club Member
              </div>
            ) : (
              <button
                onClick={() => {
                  // Check if user is eligible (plus, pro, or cohort)
                  const eligibleClasses = ['plus', 'pro', 'cohort'];
                  if (eligibleClasses.includes(userClass)) {
                    setShowEnrollModal(true);
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Crown className="h-5 w-5 mr-2" />
                Join the Capital Club
              </button>
            )}
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
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-16 mt-16">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Exclusive Member Benefits
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Investor Database</h3>
                <p className="text-gray-600">
                  Access our comprehensive investor database for your deals and build lasting capital partnerships.
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Deal Promotion</h3>
                <p className="text-gray-600">
                  Promote your next multifamily property to our exclusive network of qualified investors.
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Capital Access</h3>
                <p className="text-gray-600">
                  Get help accessing capital when you're in the middle of a money raise for your projects.
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mb-4">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Mortgage Qualification</h3>
                <p className="text-gray-600">
                  Access to key principals who can help you qualify for multifamily mortgages and financing.
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mb-4">
                  <Star className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Database Building</h3>
                <p className="text-gray-600">
                  Build your investor database from zero to hero using our proven marketing campaigns and webinars.
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-4">
                  <Crown className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Exclusive Network</h3>
                <p className="text-gray-600">
                  Member-only access to our curated network of investors, lenders, and industry professionals.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          {!isEnrolled && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
                <h2 className="text-3xl font-bold mb-4">Ready to Join?</h2>
                <p className="text-xl mb-8 opacity-90">
                  Become part of an exclusive community driving multifamily investment success.
                </p>
                <button
                  onClick={() => {
                    // Check if user is eligible (plus, pro, or cohort)
                    const eligibleClasses = ['plus', 'pro', 'cohort'];
                    if (eligibleClasses.includes(userClass)) {
                      setShowEnrollModal(true);
                    } else {
                      setShowUpgradeModal(true);
                    }
                  }}
                  className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
                >
                  <Crown className="h-5 w-5 mr-2" />
                  Enroll in Capital Club
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
            label: isEnrolling ? 'Enrolling...' : 'Enroll Now',
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
              participate professionally in the Capital Club community.
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
              
              <p className="text-gray-600 mt-4">
                Your Capital Club welcome packet will be sent to you in the coming months with 
                exclusive member resources and opportunities.
              </p>
            </div>
          </div>
        </StandardModalWithActions>

        {/* Upgrade Required Modal */}
        <StandardModalWithActions
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title="Capital Club Membership"
          primaryAction={{
            label: 'Understood',
            onClick: () => setShowUpgradeModal(false),
          }}
        >
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
                <Crown className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Thank You for Your Interest!
              </h3>
              
              <p className="text-gray-600 mb-6">
                We appreciate your interest in the Capital Club. The Capital Club is currently available 
                exclusively to our Plus, Professional, and Cohort members.
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 w-full">
                <p className="text-blue-700 text-sm font-medium mb-2">
                  Eligible Membership Levels:
                </p>
                <ul className="text-blue-600 text-sm space-y-1">
                  <li>• MultifamilyOS Plus</li>
                  <li>• MultifamilyOS Professional</li>
                  <li>• Cohort Members</li>
                </ul>
              </div>
              
              <p className="text-gray-500 text-sm mt-4">
                Please consider upgrading your membership to access the Capital Club and connect with 
                our exclusive community of multifamily investors.
              </p>
            </div>
          </div>
        </StandardModalWithActions>
      </div>
    </AuthGuard>
  );
}