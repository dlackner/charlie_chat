/*
 * CHARLIE2 V2 - Homepage
 * Clean V2 homepage that routes to new V2 pages
 * Replaces legacy chat interface with modern property platform UI
 */
'use client';

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMyPropertiesAccess } from "@/app/v2/my-properties/components/useMyPropertiesAccess";
import TrialDecisionModal from "@/components/ui/trial-decision-modal";

export default function Home() {
  const { user, isLoading, supabase } = useAuth();
  const router = useRouter();
  const [userClass, setUserClass] = useState<string | null>(null);
  const [showTrialModal, setShowTrialModal] = useState(false);
  
  // Get trial status information
  const { 
    isInGracePeriod,
    daysLeftInGracePeriod
  } = useMyPropertiesAccess();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Redirect non-logged-in users to v2 login page
        router.replace('/v2/login');
        return;
      }
      
      // Get user class from the user profile
      const fetchUserClass = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_class')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setUserClass(profile.user_class);
          
          // Redirect disabled users to pricing page
          if (profile.user_class === 'disabled') {
            router.replace('/pricing');
            return;
          }
        }
      };

      fetchUserClass();
    }
  }, [user, isLoading, router, supabase]);

  // Show trial decision modal when user is in grace period OR testing query param is present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showTrialModalParam = urlParams.get('showTrialModal');
    
    if (showTrialModalParam === 'true' || (userClass === 'trial' && isInGracePeriod)) {
      setShowTrialModal(true);
    }
  }, [userClass, isInGracePeriod]);

  // Show loading while checking user status
  if (isLoading || (user && userClass === null)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Don't render anything if user is disabled (redirect is in progress)
  if (userClass === 'disabled') {
    return null;
  }

  return (
    <>
      {/* V2 Homepage Content */}
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Charlie Chat V2
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your comprehensive real estate investment platform
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-3">Discover Properties</h3>
                <p className="text-gray-600 mb-4">Search and filter investment properties with advanced criteria</p>
                <button 
                  onClick={() => router.push('/v2/discover')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Start Searching
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-3">Property Analyzer</h3>
                <p className="text-gray-600 mb-4">Analyze investment potential with detailed financial metrics</p>
                <button 
                  onClick={() => router.push('/v2/property-analyzer')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                  Analyze Properties
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-3">My Properties</h3>
                <p className="text-gray-600 mb-4">Manage your saved properties and investment portfolio</p>
                <button 
                  onClick={() => router.push('/v2/my-properties')}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
                >
                  View Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trial Decision Modal */}
      <TrialDecisionModal
        open={showTrialModal}
        onOpenChange={setShowTrialModal}
        daysLeftInGracePeriod={daysLeftInGracePeriod}
      />
    </>
  );
}
