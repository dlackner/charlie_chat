/*
 * CHARLIE2 V2 - MultifamilyOS Landing Page with Signup Integration
 * Modern marketing landing page with integrated signup functionality and trial flow
 * Features: Passwordless auth, email capture, affiliate tracking, V2 dashboard redirect
 * Part of the new V2 component architecture
 */
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, TrendingUp, FileText, Mail, DollarSign, Building, Users, Target, Zap, Globe, Brain, BarChart3, MessageSquare, Calendar, CheckCircle, X } from 'lucide-react';
import Image from 'next/image';
import { Dialog } from '@headlessui/react';
import TypewriterChatDemo from '@/components/ui/TypewriterChatDemo';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function Home() {
  const { } = useAuth();
  const [email, setEmail] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Signup states
  const [signupEmail, setSignupEmail] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLinkSent, setSignupLinkSent] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showTopEmailForm, setShowTopEmailForm] = useState(false);

  // Sign-in modal states
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signinEmail, setSigninEmail] = useState('');
  const [signinOtp, setSigninOtp] = useState('');
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinOtpSent, setSigninOtpSent] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const supabaseClient = createSupabaseBrowserClient();



  // Check if user already exists
  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();
      
      return !!profile;
    } catch {
      return false;
    }
  };

  // New signup logic that handles both new and existing users
  const handleSignUp = async (emailToUse: string) => {
    setSignupError(null);
    setIsSigningUp(true);

    // First check if user already exists
    const userExists = await checkUserExists(emailToUse);

    if (userExists) {
      // Existing user - redirect to sign in modal with email pre-filled
      setIsSigningUp(false);
      setSigninEmail(emailToUse);
      setShowSignInModal(true);
      return;
    } else {
      // New user - send magic link
      const { error: signUpError } = await supabaseClient.auth.signInWithOtp({
        email: emailToUse,
        options: {
          shouldCreateUser: true, // Creates user if they don't exist
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        setSignupError(signUpError.message);
      } else {
        setSignupLinkSent(true); // Show magic link message
        
        // Add affiliate tracking
        if (typeof window !== 'undefined' && (window as any).gr) {
          (window as any).gr('track', 'conversion', { email: emailToUse });
        }
      }
    }
    setIsSigningUp(false);
  };

  // Top button signup handler - shows email form first
  const handleTopSignup = () => {
    setShowTopEmailForm(true);
  };

  // Top email form submission
  const handleTopEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupEmail) {
      await handleSignUp(signupEmail);
    }
  };

  // Bottom form signup handler - email already captured
  const handleBottomSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      await handleSignUp(email);
    }
  };

  // Sign-in handlers (6-digit code flow for existing users)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigninError(null);

    if (!signinOtpSent) {
      // Step 1: Send OTP to email for existing users
      setIsSigningIn(true);
      const { error: signInError } = await supabaseClient.auth.signInWithOtp({
        email: signinEmail,
        options: {
          shouldCreateUser: false // Existing users only
        }
      });

      if (signInError) {
        setSigninError(signInError.message);
      } else {
        setSigninOtpSent(true);
      }
      setIsSigningIn(false);
    } else {
      // Step 2: Verify OTP
      setIsSigningIn(true);
      const { error: verifyError } = await supabaseClient.auth.verifyOtp({
        email: signinEmail,
        token: signinOtp,
        type: 'email',
      });

      if (verifyError) {
        setSigninError(verifyError.message);
      } else {
        // Success - check if trial user should go to onboarding
        closeSignInModal();
        
        // Get user profile to check if they're a recent trial user
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('user_class, created_at')
            .eq('user_id', session.user.id)
            .single();
            
          // ALL trial users go to onboarding (no time restriction)
          if (profile?.user_class === 'trial') {
            window.location.href = '/dashboard/onboarding';
            return;
          }
        }
        
        // Default redirect to headlines for all other users
        window.location.href = '/dashboard/headlines';
      }
      setIsSigningIn(false);
    }
  };

  // Reset sign-in modal state when closing
  const closeSignInModal = () => {
    setShowSignInModal(false);
    setSigninEmail('');
    setSigninOtp('');
    setSigninOtpSent(false);
    setSigninError(null);
  };

  const carouselSlides = [
    {
      title: "Acquisitions Director",
      subtitle: "Scout off-market opportunities that match your buy box",
      icon: <Target className="w-16 h-16 text-blue-600" />,
      image: "/feature-images/broker.png"
    },
    {
      title: "Marketing Assistant", 
      subtitle: "Generate personalized letters and emails to property owners",
      icon: <Mail className="w-16 h-16 text-blue-600" />,
      image: "/feature-images/marketing_assistant.png"
    },
    {
      title: "MBA Analyst",
      subtitle: "Model offers, run scenarios, and produce financial statements", 
      icon: <BarChart3 className="w-16 h-16 text-blue-600" />,
      image: "/feature-images/MBA_analyst.png"
    },
    {
      title: "Attorney",
      subtitle: "Draft LOIs and P&S agreements to accelerate negotiations",
      icon: <FileText className="w-16 h-16 text-blue-600" />,
      image: "/feature-images/Attorney.png"
    },
    {
      title: "Financing Advisor",
      subtitle: "Identify capital sources to fund your investment pipeline",
      icon: <DollarSign className="w-16 h-16 text-blue-600" />,
      image: "/feature-images/Financing_advisor.png"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const capabilities = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Unlimited Property Search",
      description: "Search every multifamily property in the U.S. with advanced filters"
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Powered Analysis", 
      description: "Evaluate cap rates, IRR, DSCR, and more in seconds"
    },
    {
      icon: <Building className="w-6 h-6" />,
      title: "Deal Management Tools",
      description: "Save searches, track favorites, set reminders, and store notes"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Outreach Automation",
      description: "Generate engaging letters and email campaigns that peak owner interest"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Document Creation",
      description: "Streamline the production of LOIs and P&S agreements"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Expert AI Advisor",
      description: "Get instant answers to complex investment questions from your personal AI coach"
    }
  ];

  const benefits = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Expert Team Built-In",
      description: "Access a full team of real estate professionals—acquisitions director, analyst, attorney, marketer—all in one platform"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Integration", 
      description: "One unified system for sourcing, analysis, marketing, legal, and financing"
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Intelligence",
      description: "AI designed specifically for multifamily investing"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Scale",
      description: "Handle 10x more deal flow without any staff"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Efficiency",
      description: "Move from sourcing to closing in days, not months"
    },
    {
      icon: <Building className="w-6 h-6" />,
      title: "Flexible Pricing",
      description: "Start free and scale to pro—designed for everyone from new investors to experienced pros"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              The AI Operating System for{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Multifamily Investing
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Run your investment business like a $10M+ fund—without the overhead.
            </p>

            {/* Error message display */}
            {signupError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl max-w-md mx-auto">
                <p className="text-red-600 text-center">{signupError}</p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {!showTopEmailForm && !signupLinkSent ? (
                <>
                  <button 
                    onClick={handleTopSignup}
                    className="flex-1 sm:flex-none sm:min-w-[180px] px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Start Free Trial
                  </button>
                  <button 
                    onClick={() => setShowSignInModal(true)}
                    className="flex-1 sm:flex-none sm:min-w-[180px] px-8 py-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-lg font-semibold rounded-xl transition-all duration-200"
                  >
                    Sign In
                  </button>
                </>
              ) : showTopEmailForm && !signupLinkSent ? (
                <form onSubmit={handleTopEmailSubmit} className="flex flex-col sm:flex-row gap-4 items-center">
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="px-4 py-3 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSigningUp}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
                  >
                    {isSigningUp ? 'Sending...' : 'Start Trial'}
                  </button>
                </form>
              ) : (
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-600 font-medium mb-4">
                    Check your email for the confirmation link!
                  </p>
                  <p className="text-sm text-gray-600">
                    We've sent a login link to <strong>{signupEmail}</strong>. Click the link in your email to complete your registration and start your 7-day free trial.
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
                    Didn't receive the email? Check your spam folder.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Carousel Section */}
          <div className="max-w-6xl mx-auto mb-20 px-4">
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-500">
                <div className="flex justify-center">
                  {carouselSlides[currentSlide].image ? (
                    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px]">
                      <Image
                        src={carouselSlides[currentSlide].image}
                        alt={carouselSlides[currentSlide].title}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    carouselSlides[currentSlide].icon
                  )}
                </div>
              </div>
              
              {/* Carousel Controls - Positioned outside image area */}
              <button
                onClick={prevSlide}
                className="absolute left-2 lg:-left-16 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 p-2 lg:p-3 rounded-full shadow-lg transition-all duration-200 z-10"
              >
                <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 lg:-right-16 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 p-2 lg:p-3 rounded-full shadow-lg transition-all duration-200 z-10"
              >
                <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" />
              </button>
              
              {/* Carousel Indicators */}
              <div className="flex justify-center mt-6 space-x-2">
                {carouselSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="max-w-5xl mx-auto text-center mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              Transform Into a Full-Spectrum Investment Firm
            </h2>
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p>
                <strong>MultifamilyOS</strong> transforms individual investors into full-spectrum investment firms by providing an AI-powered team that never sleeps.
              </p>
              <p>
                Instead of juggling fragmented tools, emails, and spreadsheets, you get one intelligent platform that scouts properties, analyzes deals, generates documents, engages owners, and helps you secure financing.
              </p>
              <p>
                It's like having a full staff—property agent, analyst, attorney, marketer, and financing advisor—working 24/7 to scale your pipeline and close deals faster.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Built-In AI Property Coach */}
      <div className="bg-gray-50 pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built-In AI Property Coach
            </h2>
            <p className="text-xl text-gray-600">
              Get instant, expert-level insights on any multifamily investment question
            </p>
          </div>
          
          <TypewriterChatDemo />
        </div>
      </div>

      {/* Platform Capabilities */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Platform Capabilities
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to find, analyze, and close multifamily deals
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {capabilities.map((capability, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg mr-4">
                    {capability.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {capability.title}
                  </h3>
                </div>
                <p className="text-gray-600">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why MultifamilyOS */}
      <div className="bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why MultifamilyOS?
            </h2>
            <p className="text-xl text-gray-300">
              Built specifically for the modern multifamily investor
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200">
                <div className="flex flex-col items-start">
                  <div className="p-3 bg-blue-100 rounded-lg mb-4">
                    <div className="text-blue-600">
                      {benefit.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sign Up Section */}
      <div id="signup-form" className="bg-white py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Investment Business?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            The future of multifamily deal-making runs on MultifamilyOS.ai
          </p>

          {/* Trial Value Proposition */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">7-Day Free Trial</h3>
              <div className="text-4xl font-bold text-blue-600 mb-2">$0</div>
              <p className="text-gray-600">Full access • No credit card required</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span>Full platform access</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span>Unlimited property searches</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span>AI-powered analysis</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span>Document generation</span>
              </div>
            </div>
          </div>

          {/* Email Sign Up Form */}
          <div className="max-w-md mx-auto">
            {!signupLinkSent ? (
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  disabled={isSigningUp}
                />
                <button
                  onClick={handleBottomSignup}
                  disabled={isSigningUp || !email}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 mb-3"
                >
                  {isSigningUp ? 'Sending...' : 'Start 7-Day Free Trial'}
                </button>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Already have an account?</p>
                  <button 
                    onClick={() => setShowSignInModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Sign in here →
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Get started in 30 seconds • No commitment required
                </p>
              </div>
            ) : (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium text-green-800 mb-1">Check Your Email</h3>
                <p className="text-green-600 text-sm">
                  A confirmation link has been sent to <strong>{email}</strong>. 
                  Click the link to complete your registration and start your 7-day free trial.
                </p>
                <p className="text-xs text-gray-500 mt-3">
                  Didn't receive the email? Check your spam folder.
                </p>
              </div>
            )}
          </div>

          {/* Link to Full Pricing */}
          <div className="mt-8">
            <a href="/pricing" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View pricing plans and product comparisons →
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-2xl font-bold text-white mb-4">MultifamilyOS</div>
          <p className="text-gray-400">
            The AI Operating System for Multifamily Investing
          </p>
        </div>
      </div>

      {/* Sign In Modal */}
      <Dialog open={showSignInModal} onClose={closeSignInModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Sign in to your account</h2>
              <button
                onClick={closeSignInModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSignIn} className="space-y-4">
              {!signinOtpSent ? (
                // Email input step
                <div>
                  <label htmlFor="signin-email" className="block text-sm font-medium text-gray-600 mb-2">
                    Email Address
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    value={signinEmail}
                    onChange={(e) => setSigninEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>
              ) : (
                // OTP input step
                <div>
                  <p className="text-sm text-gray-700 mb-4">
                    A login code has been sent to <strong>{signinEmail}</strong>.
                  </p>
                  <label htmlFor="signin-otp" className="block text-sm font-medium text-gray-600 mb-2">
                    6-Digit Code
                  </label>
                  <input
                    id="signin-otp"
                    type="text"
                    value={signinOtp}
                    onChange={(e) => setSigninOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
              )}

              {signinError && <p className="text-red-600 text-sm text-center">{signinError}</p>}
              
              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50"
              >
                {isSigningIn ? 'Processing...' : (!signinOtpSent ? "Send Login Code" : "Verify Code")}
              </button>
              
              {signinOtpSent && (
                <button
                  type="button"
                  onClick={() => {
                    setSigninOtpSent(false);
                    setSigninOtp('');
                    setSigninError(null);
                  }}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm mt-2"
                >
                  ← Back to email
                </button>
              )}
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
