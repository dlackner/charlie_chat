'use client';

import { useState } from 'react';
import { StandardModal } from '@/components/shared/StandardModal';

interface DirectCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, planType: 'monthly' | 'annual') => void;
  selectedPlan: 'plus' | 'pro';
  initialPlanType: 'monthly' | 'annual';
  isLoading?: boolean;
}

export default function DirectCheckoutModal({
  isOpen,
  onClose,
  onSubmit,
  selectedPlan,
  initialPlanType,
  isLoading = false
}: DirectCheckoutModalProps) {
  const [email, setEmail] = useState('');
  const [planType, setPlanType] = useState<'monthly' | 'annual'>(initialPlanType);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    onSubmit(email, planType);
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setPlanType(initialPlanType);
      setError('');
      onClose();
    }
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Get Access to MultifamilyOS"
      size="md"
      showCloseButton={!isLoading}
    >
      <div className="p-6">
        <div className="mb-6">
          <p className="text-gray-600">
            Enter your email address to get access to the MultifamilyOS
          </p>
        </div>

        {/* Billing Frequency Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Billing Frequency
          </label>
          <div className="flex rounded-lg border border-gray-300 p-1">
            <button
              type="button"
              onClick={() => setPlanType('monthly')}
              disabled={isLoading}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                planType === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPlanType('annual')}
              disabled={isLoading}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                planType === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isLoading}
            />
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            {!isLoading && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Continue to Checkout</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </StandardModal>
  );
}