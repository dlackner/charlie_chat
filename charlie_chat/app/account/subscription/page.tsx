'use client';

import { useState } from 'react';
import { CreditCard, Calendar, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';

export default function SubscriptionPage() {
  const [showCancelModal, setShowCancelModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
              <p className="text-gray-600">Manage your Charlie Chat subscription</p>
            </div>
          </div>
        </div>

        {/* Current Subscription */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <CreditCard className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Charlie Chat</h3>
                <p className="text-gray-600">Monthly billing</p>
                <p className="text-xl font-bold text-gray-900">$20</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              <span>Active</span>
            </div>
          </div>

          {/* Billing Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">Started</div>
                <div className="text-gray-600">6/25/2025</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">Next billing</div>
                <div className="text-gray-600">7/25/2025</div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t border-gray-200 pt-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Payment Method</div>
                <div className="text-gray-600">Amex •••• 1002 • Expires 10/2025</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors">
              <ArrowRight className="h-4 w-4 mr-2" />
              Upgrade Plan
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Cancel or Downgrade
            </button>
          </div>
        </div>

        {/* Subscription Features */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Plan Features</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-gray-700">Unlimited property searches</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-gray-700">AI-powered deal analysis</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-gray-700">Weekly personalized recommendations</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-gray-700">Pipeline management tools</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-gray-700">Community insights</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-gray-700">Priority customer support</span>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Billing</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div>
                <div className="font-medium text-gray-900">July 2025</div>
                <div className="text-sm text-gray-600">Charged on 6/25/2025</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">$20.00</div>
                <div className="text-sm text-green-600">Paid</div>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div>
                <div className="font-medium text-gray-900">June 2025</div>
                <div className="text-sm text-gray-600">Charged on 5/25/2025</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">$20.00</div>
                <div className="text-sm text-green-600">Paid</div>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div>
                <div className="font-medium text-gray-900">May 2025</div>
                <div className="text-sm text-gray-600">Charged on 4/25/2025</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">$20.00</div>
                <div className="text-sm text-green-600">Paid</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Subscription Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Cancel Subscription</h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to cancel your Charlie Chat subscription? You'll lose access to:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• AI-powered property analysis</li>
                  <li>• Weekly personalized recommendations</li>
                  <li>• Pipeline management tools</li>
                  <li>• Community insights</li>
                </ul>
                <p className="text-sm text-gray-500 mt-4">
                  Your subscription will remain active until 7/25/2025.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Keep Subscription
                </button>
                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}