/*
 * CHARLIE2 V2 - Login Page
 * Clean authentication flow with magic link support
 * Part of the new V2 application architecture
 */
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import FeaturesShowcase from '@/components/ui/FeaturesShowcase';
import TypewriterChatDemo from '@/components/ui/TypewriterChatDemo';

export default function LoginPage() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailSignIn = async () => {
    if (!email) return;
    
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });
    
    if (error) {
      console.error('Sign in error:', error);
    } else {
      setOtpSent(true);
    }
    setIsLoading(false);
  };

  const handleOtpVerify = async () => {
    if (!email || !otp) return;
    
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    });
    
    if (error) {
      console.error('OTP verification error:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content - Canva Style */}
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          {/* Charlie Image */}
          <div className="mb-8">
            <img
              src="/charlie.png"
              alt="Charlie"
              className="w-32 h-32 mx-auto rounded-full shadow-lg border-4 border-white"
            />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-light text-gray-900 mb-4">
            Let's find your next <span className="text-orange-500">great multifamily investment</span>
          </h1>
          
          <div className="mb-16 max-w-2xl mx-auto">
            <p className="text-lg text-gray-900 mb-4">
              With Charlie Chat, you can search our database of every multifamily property in the United States, use AI to identify the best ones, conduct rigorous investment analyses, generate marketing letters and LOI's, and track your favorites every step of the way. I'm here to help you make smarter real estate investment decisions.
            </p>
            <p className="text-right text-gray-800 italic">
              -- Charles Dobens
            </p>
          </div>

          {/* Email Sign In Form */}
          <div className="max-w-md mx-auto mb-8">
            {otpSent ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <p className="text-green-800">Check your email for the verification code!</p>
                </div>
                <input
                  type="text"
                  placeholder="Enter verification code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center"
                  disabled={isLoading}
                />
                <button
                  onClick={handleOtpVerify}
                  disabled={isLoading || !otp}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  onClick={() => setOtpSent(false)}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm"
                >
                  Back to email
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleEmailSignIn}
                  disabled={isLoading || !email}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Chat Demo */}
      <div className="px-6 pb-8">
        <TypewriterChatDemo />
      </div>

      {/* Features Showcase */}
      <FeaturesShowcase />
    </div>
  );
}