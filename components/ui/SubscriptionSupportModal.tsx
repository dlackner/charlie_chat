'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';

const SubscriptionSupportModal = () => {
  const { user, supabase } = useAuth();
  const { showSubscriptionSupport, setShowSubscriptionSupport } = useModal();
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{first_name?: string, last_name?: string} | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch user profile when user is available
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && supabase) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("user_id", user.id)
            .single();

          if (!error && data) {
            setUserProfile(data);
          }
        } catch (error) {
          console.log('Could not fetch user profile for subscription modal:', error);
        }
      }
    };

    fetchUserProfile();
  }, [user, supabase]);

  // Handle click outside to close modal
  useEffect(() => {
    if (!showSubscriptionSupport) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't close if clicking inside the modal
      if (modalRef.current?.contains(target)) {
        return;
      }
      
      // Don't close if clicking on input/textarea elements anywhere
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Close the modal for clicks outside
      setShowSubscriptionSupport(false);
    };

    // Add a delay to prevent immediate closing when modal opens
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 200);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSubscriptionSupport, setShowSubscriptionSupport]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      setIsLoading(true);
      try {
        // Prepend subscription context to the message
        const subscriptionMessage = `SUBSCRIPTION SUPPORT REQUEST: ${message.trim()}`;
        
        const response = await fetch('https://fgdonkzncrncxnunljev.supabase.co/functions/v1/contact-form', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: subscriptionMessage,
            userEmail: user?.email || 'anonymous@charlieus.ai',
            userName: userProfile?.first_name && userProfile?.last_name 
              ? `${userProfile.first_name} ${userProfile.last_name}` 
              : null
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setIsSubmitted(true);
          setMessage('');
          
          setTimeout(() => {
            setIsSubmitted(false);
            setShowSubscriptionSupport(false);
          }, 3000);
        } else {
          console.error('Function returned error:', result);
          alert(`Failed to send message: ${result.error || 'Please try again.'}`);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        
        if (error instanceof Error && error.message.includes('failed to fetch')) {
          alert('Network error - please check your connection and try again.');
        } else if (error instanceof Error && error.message.includes('CORS')) {
          alert('CORS error - please contact support.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!showSubscriptionSupport) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 w-full max-w-md"
      >
        {/* Close Button */}
        <button
          onClick={() => setShowSubscriptionSupport(false)}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-6 text-white bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3 mb-3">
            {/* MFOS AI Logo */}
            <div className="w-10 h-8 flex items-center justify-center">
              <Image
                src="/MFOS AI Logo.png"
                alt="MFOS AI Logo"
                width={40}
                height={32}
                className="object-contain"
              />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-1">Subscription Support</h3>
          <p className="text-blue-100 opacity-90">Need help with canceling, downgrading, or changing your subscription?</p>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {!isSubmitted ? (
            /* Message Form */
            <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">Tell us what you need</h4>
                <div className="space-y-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Please describe what you'd like to do with your subscription..."
                    className="w-full px-3 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
                    style={{
                      ['--tw-ring-color' as any]: '#2563eb'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                    rows={3}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isLoading}
                    className="w-full px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400"
                  >
                    <Send size={16} />
                    {isLoading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </div>
          ) : (
            /* Success Message */
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-green-600 text-2xl mb-2">✓</div>
              <h4 className="font-medium text-green-900 mb-1">Request Sent!</h4>
              <p className="text-sm text-green-700">
                We've received your subscription request and will respond within a few hours on weekdays to help you with your account changes.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded"></div>
              <span>MultifamilyOS Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSupportModal;