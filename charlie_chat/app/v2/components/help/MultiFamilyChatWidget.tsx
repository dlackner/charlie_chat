/*
 * CHARLIE2 V2 - Customer Support Help Widget
 * Interactive help widget for customer support inquiries
 * Positioned as dropdown from header navigation
 * Part of the new V2 application architecture
 */

'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';

const MultiFamilyChatWidget = () => {
  const { user, supabase } = useAuth();
  const { showHelpWidget, setShowHelpWidget } = useModal();
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{first_name?: string, last_name?: string} | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

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
          console.log('Could not fetch user profile for chat widget:', error);
        }
      }
    };

    fetchUserProfile();
  }, [user, supabase]);

  // Handle click outside to close widget
  useEffect(() => {
    if (!showHelpWidget) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't close if clicking inside the widget
      if (widgetRef.current?.contains(target)) {
        return;
      }
      
      // Don't close if clicking on input/textarea elements anywhere
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Close the widget for clicks outside
      setShowHelpWidget(false);
    };

    // Add a delay to prevent immediate closing when widget opens
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 200);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showHelpWidget, setShowHelpWidget]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      setIsLoading(true);
      try {
        // Prepend customer support context to the message
        const customerSupportMessage = `CUSTOMER SUPPORT REQUEST: ${message.trim()}`;
        
        const response = await fetch('https://fgdonkzncrncxnunljev.supabase.co/functions/v1/contact-form', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: customerSupportMessage,
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

  // FAQ items (hidden for now as requested)
  const faqItems = [
    "Getting started with property analysis",
    "Understanding investment metrics", 
    "Property search best practices",
    "Account and billing questions"
  ];

  return (
    <>
      {/* Help Button - Integrated into V2 header */}
      <div className="relative" ref={widgetRef}>
        <button
          onClick={() => setShowHelpWidget(!showHelpWidget)}
          className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          HELP
        </button>

        {/* Chat Widget */}
        {showHelpWidget && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 z-50">
          {/* Close Button */}
          <button
            onClick={() => setShowHelpWidget(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
          >
            <X size={20} />
          </button>
          
          {/* Header */}
          <div className="p-6 text-white bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center gap-3 mb-3">
              {/* MultifamilyOS Building icon */}
              <div className="w-8 h-6 flex items-center justify-center">
                <svg viewBox="0 0 100 60" className="w-full h-full">
                  {/* Left building (blue accent) */}
                  <polygon points="0,60 0,15 15,0 25,10 25,60" fill="#3B82F6" />
                  <rect x="5" y="20" width="3" height="3" fill="white" opacity="0.8" />
                  <rect x="5" y="28" width="3" height="3" fill="white" opacity="0.8" />
                  <rect x="5" y="36" width="3" height="3" fill="white" opacity="0.8" />
                  <rect x="12" y="25" width="3" height="3" fill="white" opacity="0.8" />
                  <rect x="12" y="33" width="3" height="3" fill="white" opacity="0.8" />
                  <rect x="18" y="30" width="3" height="3" fill="white" opacity="0.8" />
                  
                  {/* Right building (darker blue) */}
                  <rect x="25" y="10" width="50" height="50" fill="#1E40AF" />
                  <rect x="30" y="18" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="38" y="18" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="46" y="18" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="54" y="18" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="62" y="18" width="4" height="4" fill="white" opacity="0.8" />
                  
                  <rect x="30" y="28" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="38" y="28" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="46" y="28" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="54" y="28" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="62" y="28" width="4" height="4" fill="white" opacity="0.8" />
                  
                  <rect x="30" y="38" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="38" y="38" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="46" y="38" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="54" y="38" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="62" y="38" width="4" height="4" fill="white" opacity="0.8" />
                  
                  <rect x="30" y="48" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="38" y="48" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="46" y="48" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="54" y="48" width="4" height="4" fill="white" opacity="0.8" />
                  <rect x="62" y="48" width="4" height="4" fill="white" opacity="0.8" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-1">What's on your mind?</h3>
            <p className="text-blue-100 opacity-90">We're here to help with your real estate investing questions.</p>
          </div>

          {/* Content */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {!isSubmitted ? (
              /* Message Form */
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">Send us a message</h4>
                <div className="space-y-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pass along your questions and input."
                    className="w-full px-3 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                    rows={3}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isLoading}
                    className={`w-full px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      message.trim() && !isLoading
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                  >
                    <Send size={16} />
                    {isLoading ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            ) : (
              /* Success Message */
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-green-600 text-2xl mb-2">✓</div>
                <h4 className="font-medium text-green-900 mb-1">Message Sent!</h4>
                <p className="text-sm text-green-700">
                  Thanks for reaching out. We'll respond to you as soon as possible, usually within a few hours on weekdays.
                </p>
              </div>
            )}

            {/* FAQ Section - Hidden but keeping structure for later */}
            <div className="hidden space-y-2 mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Quick Help</h4>
              {faqItems.map((item, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-blue-200 transition-colors text-sm group"
                  onClick={() => {
                    // FAQ functionality placeholder
                  }}
                >
                  <span className="text-gray-700 group-hover:text-blue-600">{item}</span>
                  <span className="float-right text-blue-500 group-hover:text-blue-600">›</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-4">
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <span>MultifamilyOS Support</span>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MultiFamilyChatWidget;