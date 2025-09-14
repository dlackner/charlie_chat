'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function V2HomePage() {
  const { user, supabase } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/discover`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
    }
    setIsLoading(false);
  };

  // Redirect authenticated users to discover
  useEffect(() => {
    if (user) {
      router.push('/discover');
    }
  }, [user, router]);

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Exact replica of current design */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Exact match */}
            <div className="flex items-center">
              <img src="/api/placeholder/32/32" alt="Logo" className="h-8 w-8 mr-3" />
              <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                MULTIFAMILY<br />INVESTING ACADEMY
              </div>
            </div>

            {/* Navigation Menu - Your new V2 structure */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center">
                📊 DASHBOARD
              </Link>
              <Link href="/discover" className="text-gray-600 hover:text-gray-900 flex items-center">
                🔍 DISCOVER
              </Link>
              <Link href="/engage" className="text-gray-600 hover:text-gray-900 flex items-center">
                👥 ENGAGE
              </Link>
              <Link href="/ai-coach" className="text-gray-600 hover:text-gray-900 flex items-center">
                🤖 AI COACH
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 flex items-center">
                💰 PRICING
              </Link>
              <Link href="/account" className="text-gray-600 hover:text-gray-900 flex items-center">
                👤 ACCOUNT
              </Link>
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Login
              </button>
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Sign Up'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Exact replica */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        {/* Profile Image */}
        <div className="mb-8">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format"
            alt="Charles Dobens"
            className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-white shadow-lg"
          />
        </div>
        
        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Let's find your next <span className="text-orange-500">great</span>
          <br />
          <span className="text-orange-500">multifamily investment</span>
        </h1>
        
        {/* Description */}
        <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
          With Charlie Chat, you can search our database of every multifamily property in the
          United States, use AI to identify the best ones, conduct rigorous investment
          analyses, generate marketing letters and LOI's, and track your favorites every step
          of the way. I'm here to help you make smarter real estate investment decisions.
        </p>
        
        {/* Signature */}
        <p className="text-right text-gray-500 italic mb-12 max-w-3xl mx-auto">
          – Charles Dobens
        </p>

        {/* Second Section Header */}
        <h2 className="text-3xl font-bold text-gray-900 mb-12">
          Energize your investment decisions with AI
        </h2>

        {/* Chat Input Area - Replica of current design */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm max-w-2xl mx-auto mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-left text-gray-500">
              The owner rejected my first offer. Give me some suggestions on how to improve the offer without giving up leverage.
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Responsibly into capital integration, automation, and AI applications down the road.
          </p>
        </div>

        {/* Sign up CTA */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Signing up...' : 'Get Started Free'}
        </button>
      </main>
    </div>
  );
}