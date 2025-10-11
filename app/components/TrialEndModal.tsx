/*
 * CHARLIE2 V2 - Trial End Modal
 * Modal shown at the end of 7-day trial period
 * Updated with MultifamilyOS.ai branding and simplified flow
 * Takes users directly to pricing page without "Maybe Later" option
 * Part of the new V2 application architecture
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface TrialEndModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TrialEndModal({ 
  open, 
  onOpenChange
}: TrialEndModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleCheckItOut = async () => {
    setIsProcessing(true);
    
    // Redirect to V2 pricing page
    router.push('/pricing');
    
    onOpenChange(false);
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[90vw] p-0" aria-describedby="trial-end-description">
        <DialogTitle className="sr-only">Trial Complete</DialogTitle>
        <div className="bg-white rounded-lg p-6 space-y-4">
          {/* Header with MultifamilyOS logo */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Trial Complete!
              </h2>
              <p id="trial-end-description" className="text-gray-700 leading-relaxed">
                Your 7-day trial with MultifamilyOS has ended. Ready to continue building your multifamily portfolio with unlimited access?
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleCheckItOut}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? "Loading..." : "View Pricing"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}