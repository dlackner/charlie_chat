"use client";

import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { CreditCard, Calendar, CheckCircle, ArrowRight, HelpCircle, Shield, X } from "lucide-react";
import { Dialog } from "@headlessui/react";

// Product ID to plan name mapping
const PRODUCT_NAMES: { [key: string]: string } = {
  // Charlie Chat Plans
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT!]: "Charlie Chat",
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRODUCT!]: "Charlie Chat",
  
  // Charlie Chat Plus Plans  
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_MONTHLY_PRODUCT!]: "Charlie Chat Plus",
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_ANNUAL_PRODUCT!]: "Charlie Chat Plus",
  
  // Charlie Chat Pro Plans
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRODUCT!]: "Charlie Chat Professional", 
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRODUCT!]: "Charlie Chat Professional",
  
  // Credit Packs
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_25_PACK_PRODUCT!]: "25 Credit Pack",
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_50_PACK_PRODUCT!]: "50 Credit Pack", 
  [process.env.NEXT_PUBLIC_CHARLIE_CHAT_100_PACK_PRODUCT!]: "100 Credit Pack",
};

interface Subscription {
  stripe_price_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  ended_at: string | null;
  metadata: {
    plan?: string;
    userId?: string;
    productId?: string;
    product_id?: string;
    stripe_customer_id?: string;
  };
}

interface CreditPurchase {
  id: number;
  purchased_at: string;
  credit_amount: number;
  stripe_price_id: string;
  status: string;
  metadata: any;
}

interface PaymentMethod {
  id: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  funding: string;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { user: currentUser, supabase } = useAuth();
  const { setShowSubscriptionSupport } = useModal();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [creditPurchases, setCreditPurchases] = useState<CreditPurchase[]>([]);
  const [billingAmount, setBillingAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load subscription data when modal opens
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isOpen || !currentUser || !supabase) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, ended_at, metadata')
          .eq('user_id', currentUser.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setSubscription(data);
        
        if (data?.stripe_price_id) {
          fetchBillingAmount(data.stripe_price_id);
        }

        const customerId = data?.metadata?.stripe_customer_id;
        if (customerId) {
          fetchPaymentMethod(customerId);
        }

        if (!data) {
          fetchCreditPurchases();
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError('Failed to load subscription information');
      } finally {
        setLoading(false);
      }
    };

    const fetchBillingAmount = async (priceId: string) => {
      try {
        const response = await fetch(`/api/stripe/price?priceId=${priceId}`);
        const data = await response.json();
        
        if (data.success) {
          setBillingAmount(data.amount);
        }
      } catch (err) {
        console.error('Error fetching billing amount:', err);
      }
    };

    const fetchPaymentMethod = async (customerId: string) => {
      try {
        const response = await fetch(`/api/stripe/payment-method?customerId=${customerId}`);
        const data = await response.json();
        
        if (data.success && data.hasPaymentMethod) {
          setPaymentMethod(data.paymentMethod);
        }
      } catch (err) {
        console.error('Error fetching payment method:', err);
      }
    };

    const fetchCreditPurchases = async () => {
      if (!currentUser) return;
      
      try {
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        const { data, error } = await supabase
          .from('credit_purchases')
          .select('id, purchased_at, credit_amount, stripe_price_id, status, metadata, stripe_customer_id')
          .eq('user_id', currentUser.id)
          .gte('purchased_at', twoMonthsAgo.toISOString())
          .order('purchased_at', { ascending: false });

        if (error) {
          throw error;
        }

        setCreditPurchases(data || []);

        if (data && data.length > 0 && data[0].stripe_customer_id && !subscription) {
          fetchPaymentMethod(data[0].stripe_customer_id);
        }
      } catch (err) {
        console.error('Error fetching credit purchases:', err);
      }
    };

    fetchSubscription();
  }, [isOpen, currentUser, supabase]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSubscription(null);
      setCreditPurchases([]);
      setBillingAmount(null);
      setPaymentMethod(null);
      setError(null);
    }
  }, [isOpen]);

  const getSubscriptionInfo = (sub: Subscription) => {
    const productId = sub.metadata?.productId || sub.metadata?.product_id;
    const planName = PRODUCT_NAMES[productId!] || "Unknown Plan";
    const billingCycle = sub.metadata?.plan === "annual" ? "Annual" : "Monthly";
    
    return {
      planName,
      billingCycle,
      amount: billingAmount,
      status: sub.status,
      nextBilling: new Date(sub.current_period_end).toLocaleDateString(),
      startDate: new Date(sub.current_period_start).toLocaleDateString(),
    };
  };

  const handleUpgrade = () => {
    onClose();
    window.open('/pricing', '_blank');
  };

  const handleGetHelp = () => {
    onClose(); // Close subscription modal first
    setShowSubscriptionSupport(true);
  };

  if (!currentUser) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <div className="text-center">
              <Dialog.Title className="text-2xl font-semibold text-gray-900 mb-4">
                Please log in
              </Dialog.Title>
              <p className="text-gray-600 mb-6">You need to be logged in to view your subscription.</p>
              <button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <CreditCard size={24} className="mr-3 text-blue-600" />
              <div>
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  Subscription Management
                </Dialog.Title>
                <p className="text-sm text-gray-600">Manage your Charlie Chat subscription</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {error ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-red-600 mb-4">Error</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading subscription information...</p>
              </div>
            ) : (
              <div>
                {subscription ? (
                  <div>
                    {(() => {
                      const info = getSubscriptionInfo(subscription);
                      return (
                        <div className="space-y-6">
                          {/* Current Plan */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <CreditCard className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <h2 className="text-xl font-semibold text-gray-900">{info.planName}</h2>
                                <p className="text-gray-600">{info.billingCycle} billing</p>
                                {info.amount && info.amount > 0 && (
                                  <p className="text-lg font-semibold text-gray-900">${info.amount}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              <span className="text-sm font-medium text-green-600 capitalize">{info.status}</span>
                            </div>
                          </div>

                          {/* Billing Information */}
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm font-medium">Started</span>
                              </div>
                              <p className="text-gray-900">{info.startDate}</p>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm font-medium">Next billing</span>
                              </div>
                              <p className="text-gray-900">{info.nextBilling}</p>
                            </div>
                          </div>

                          {/* Payment Method */}
                          {paymentMethod && (
                            <div className="pt-4 border-t border-gray-200">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Shield className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Payment Method</p>
                                  <p className="text-sm text-gray-600">
                                    {paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)} •••• {paymentMethod.last4} • Expires {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="pt-4 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={handleUpgrade}
                                className="flex items-center justify-center space-x-2 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                              >
                                <ArrowRight className="w-4 h-4" />
                                <span>Upgrade Plan</span>
                              </button>
                              
                              <button
                                onClick={handleGetHelp}
                                className="flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <HelpCircle className="w-4 h-4" />
                                <span>Cancel or Downgrade</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* No Active Subscription */
                  <div>
                    <div className="text-center py-6">
                      <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <CreditCard className="w-8 h-8 text-gray-500" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Charlie Chat (Free)</h2>
                      <p className="text-gray-600 mb-6">You're currently on the free plan</p>
                      <button
                        onClick={handleUpgrade}
                        className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                      >
                        Upgrade Now
                      </button>
                    </div>

                    {/* Recent Credit Purchases */}
                    {creditPurchases.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Credit Purchases</h3>
                        <div className="space-y-3">
                          {creditPurchases.map((purchase) => (
                            <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                  <CreditCard className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{purchase.credit_amount} Credits</p>
                                  <p className="text-sm text-gray-600">{new Date(purchase.purchased_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  purchase.status === 'completed' || purchase.status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {purchase.status === 'completed' || purchase.status === 'paid' ? 'Completed' : purchase.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Method for Credit Pack Users */}
                    {paymentMethod && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Shield className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Payment Method on File</p>
                            <p className="text-sm text-gray-600">
                              {paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)} •••• {paymentMethod.last4} • Expires {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};