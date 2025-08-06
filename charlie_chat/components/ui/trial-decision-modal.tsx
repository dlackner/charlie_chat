"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface TrialDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysLeftInGracePeriod: number | null;
}

export default function TrialDecisionModal({ 
  open, 
  onOpenChange, 
  daysLeftInGracePeriod 
}: TrialDecisionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const router = useRouter();
  const { user: currentUser, supabase } = useAuth();

  const handleSignUpNow = async () => {
    setIsProcessing(true);
    
    // Check if user has stored payment method (affiliate user)
    const { data: profile } = await supabase
      .from('profiles')
      .select('affiliate_sale, stripe_customer_id')
      .eq('user_id', currentUser?.id)
      .single();

    if (profile?.affiliate_sale && profile?.stripe_customer_id) {
      // Affiliate user - redirect to pricing page for instant checkout
      router.push('/pricing?auto_select=true');
    } else {
      // Regular user - redirect to pricing page
      router.push('/pricing');
    }
    
    onOpenChange(false);
    setIsProcessing(false);
  };

  const handleCancelTrial = () => {
    setShowCancelConfirmation(true);
  };

  const handleConfirmCancel = async () => {
    setIsProcessing(true);
    
    try {
      // Update user to disabled status
      await supabase
        .from('profiles')
        .update({
          user_class: 'disabled',
          trial_cancelled_at: new Date().toISOString()
        })
        .eq('user_id', currentUser?.id);

      // Redirect to home page
      router.push('/');
      onOpenChange(false);
    } catch (error) {
      console.error('Error cancelling trial:', error);
    }
    
    setIsProcessing(false);
  };

  const handleKeepTrying = async () => {
    setIsProcessing(true);
    
    // Check if user has stored payment method (affiliate user)
    const { data: profile } = await supabase
      .from('profiles')
      .select('affiliate_sale, stripe_customer_id')
      .eq('user_id', currentUser?.id)
      .single();

    if (profile?.affiliate_sale && profile?.stripe_customer_id) {
      // Affiliate user - redirect to pricing page for instant checkout
      router.push('/pricing?auto_select=true');
    } else {
      // Regular user - redirect to pricing page
      router.push('/pricing');
    }
    
    onOpenChange(false);
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!showCancelConfirmation ? (
          // Main decision modal
          <>
            <DialogHeader className="space-y-4">
              <div className="flex items-start gap-4">
                <img 
                  src="/charlie.png" 
                  alt="Charlie Dobens" 
                  className="w-12 h-12 rounded-full flex-shrink-0"
                />
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⏰</span>
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    It's Decision Time
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                Congratulations! You used up all of your trial credits. I hope you found some great properties in the process. 
                You now have 3 days to decide your next step. Let's not lose this momentum—keep building your multifamily business.
              </p>

              {/* Comprehensive Comparison Table */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="grid grid-cols-12 gap-1 text-[10px] font-medium text-gray-600 pb-1 border-b border-gray-200">
                  <div className="col-span-6"></div>
                  <div className="col-span-3 text-center">Charlie Chat</div>
                  <div className="col-span-3 text-center">Charlie Chat Pro</div>
                </div>
                
                <div className="space-y-0 text-[10px]">
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">AI Chat</div>
                    <div className="col-span-3 text-center">✓</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">Property Search</div>
                    <div className="col-span-3 text-center text-gray-500 text-[9px]">à la carte</div>
                    <div className="col-span-3 text-center text-gray-500 text-[9px]">250/month</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">Basic Analysis</div>
                    <div className="col-span-3 text-center">✓</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">My Favorite Properties</div>
                    <div className="col-span-3 text-center">—</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">Mapping & Market Rents</div>
                    <div className="col-span-3 text-center">—</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">Advanced Analytics</div>
                    <div className="col-span-3 text-center">—</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">Marketing Tools</div>
                    <div className="col-span-3 text-center">—</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">LOI Templates</div>
                    <div className="col-span-3 text-center">—</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">Skip Tracing</div>
                    <div className="col-span-3 text-center">—</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">Master Class Training</div>
                    <div className="col-span-3 text-center">—</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">Weekly Coaching Calls</div>
                    <div className="col-span-3 text-center">—</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  <div className="grid grid-cols-12 gap-1 py-0.5">
                    <div className="col-span-6 text-gray-700">Community Access</div>
                    <div className="col-span-3 text-center">—</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleSignUpNow}
                  disabled={isProcessing}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Sign Up Now"}
                </button>
                
                <button
                  onClick={handleCancelTrial}
                  disabled={isProcessing}
                  className="w-full bg-white text-gray-600 py-2 px-3 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Cancel Trial"}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                If no choice is made, we'll automatically cancel your subscription in 3 days.
              </p>
            </div>
          </>
        ) : (
          // Cancel confirmation modal
          <>
            <DialogHeader className="space-y-4">
              <div className="flex items-start gap-4">
                <img 
                  src="/charlie.png" 
                  alt="Charlie Dobens" 
                  className="w-12 h-12 rounded-full flex-shrink-0"
                />
                <div className="flex items-center gap-2">
                  <span className="text-2xl">😔</span>
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Wait, are you sure?
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                Are you sure you want to go? You just got started building your multifamily business with me! 
                Why not give it a month and see what we can accomplish together?
              </p>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleKeepTrying}
                  disabled={isProcessing}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "OK... let's try it for a month"}
                </button>
                
                <button
                  onClick={handleConfirmCancel}
                  disabled={isProcessing}
                  className="w-full bg-white text-gray-600 py-2 px-3 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Yes I'm sure"}
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}