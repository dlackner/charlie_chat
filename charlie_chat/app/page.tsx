'use client';

import { ClosingChat } from "@/components/ui/closing-chat";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMyPropertiesAccess } from "@/app/my-properties/components/useMyPropertiesAccess";
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
    if (!isLoading && user) {
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
      <ClosingChat />
      
      {/* Trial Decision Modal */}
      <TrialDecisionModal
        open={showTrialModal}
        onOpenChange={setShowTrialModal}
        daysLeftInGracePeriod={daysLeftInGracePeriod}
      />
    </>
  );
}
