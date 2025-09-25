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
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
      <DialogContent className="sm:max-w-md max-w-[90vw] p-0">
        <div className="bg-white rounded-lg p-6 space-y-4">
          {/* Header with Charlie's image */}
          <div className="flex items-start gap-4">
            <img 
              src="/charlie.png" 
              alt="Charlie Dobens" 
              className="w-12 h-12 rounded-full flex-shrink-0"
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Hi There!
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Your 7-day trial with MultifamilyOS.ai has ended. Ready to continue building your multifamily portfolio with unlimited access?
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleCheckItOut}
              disabled={isProcessing}
              className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? "Loading..." : "Check It Out"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}