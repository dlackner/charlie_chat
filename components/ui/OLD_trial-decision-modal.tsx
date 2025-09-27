"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface TrialDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TrialDecisionModal({ 
  open, 
  onOpenChange
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
      // Update user to charlie_chat (free) status
      await supabase
        .from('profiles')
        .update({
          user_class: 'charlie_chat',
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
      <DialogContent className="sm:max-w-3xl max-w-[85vw]">
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
                  <DialogTitle className="text-2xl font-semibold text-gray-900">
                    It's Decision Time
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6">
              <p className="text-base text-gray-700 leading-relaxed">
                Your 7-day trial has expired! I hope you found some great properties in the process. 
                It's time to decide your next step. Let's not lose this momentum—keep building your multifamily business.
              </p>

              {/* Modern Comparison Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <div className="grid grid-cols-4 gap-0">
                    <div className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">Compare Features</div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-200">
                      <div className="text-xs font-semibold text-gray-900">Charlie Chat</div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-200">
                      <div className="text-xs font-semibold text-gray-900">Charlie Chat Plus</div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-200">
                      <div className="text-xs font-semibold text-gray-900">Charlie Chat Pro</div>
                    </div>
                  </div>
                </div>
                
                {/* Feature Rows */}
                <div className="divide-y divide-gray-100">
                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">AI Chat</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">Property Search</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">à la carte</span>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">250/month</span>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">250/month</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">Basic Analysis</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">My Favorite Properties</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">Mapping & Market Rents</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">Advanced Analytics</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">Marketing Tools</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">LOI Templates</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">Skip Tracing</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">Master Class Training</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-orange-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">Weekly Coaching Calls with Charles Dobens</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-orange-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-0 hover:bg-gray-50/50 transition-colors">
                    <div className="px-4 py-3 text-xs font-medium text-gray-900">Community Access</div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-gray-400"></div>
                      </div>
                    </div>
                    <div className="px-4 py-3 text-center border-l border-gray-100">
                      <div className="w-4 h-4 rounded-full bg-orange-500 mx-auto flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleSignUpNow}
                  disabled={isProcessing}
                  className="flex-1 bg-orange-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Sign Up Now"}
                </button>
                
                <button
                  onClick={handleCancelTrial}
                  disabled={isProcessing}
                  className="flex-1 bg-white text-gray-600 py-3 px-4 rounded-lg text-base border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Use Free Charlie Chat"}
                </button>
              </div>

              <p className="text-sm text-gray-500 text-center">
                If no choice is made, you'll automatically get free Charlie Chat access.
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
                  <DialogTitle className="text-2xl font-semibold text-gray-900">
                    Wait, are you sure?
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6">
              <p className="text-base text-gray-700 leading-relaxed">
                You'll still get free access to Charlie Chat! But you just got started building your multifamily business with me. 
                Why not give it a month with unlimited property searches and see what we can accomplish together?
              </p>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleKeepTrying}
                  disabled={isProcessing}
                  className="flex-1 bg-orange-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "OK... let's try it for a month"}
                </button>
                
                <button
                  onClick={handleConfirmCancel}
                  disabled={isProcessing}
                  className="flex-1 bg-white text-gray-600 py-3 px-4 rounded-lg text-base border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Yes, just free access"}
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}