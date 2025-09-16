/*
 * CHARLIE2 V2 - MultifamilyOS Landing Page
 * Modern marketing landing page for MultifamilyOS branding
 * Part of the new V2 component architecture
 */
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, TrendingUp, FileText, Mail, DollarSign, Building, Users, Target, Zap, Globe, Brain, BarChart3, MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import TypewriterChatDemo from '@/components/ui/TypewriterChatDemo';

export default function LoginNewPage() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

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

  const carouselSlides = [
    {
      title: "Broker",
      subtitle: "Scout off-market opportunities that match your buy box",
      icon: <Target className="w-16 h-16 text-blue-600" />,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      title: "Marketing Assistant", 
      subtitle: "Generate personalized letters and emails to property owners",
      icon: <Mail className="w-16 h-16 text-green-600" />,
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      title: "MBA Analyst",
      subtitle: "Model offers, run scenarios, and produce financial statements", 
      icon: <BarChart3 className="w-16 h-16 text-purple-600" />,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      title: "Attorney",
      subtitle: "Draft LOIs and P&S agreements to accelerate negotiations",
      icon: <FileText className="w-16 h-16 text-orange-600" />,
      bgColor: "bg-orange-50", 
      borderColor: "border-orange-200"
    },
    {
      title: "Financing Advisor",
      subtitle: "Identify lenders and capital sources to get deals closed",
      icon: <DollarSign className="w-16 h-16 text-emerald-600" />,
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
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
      description: "Access a full team of real estate professionals—broker, analyst, attorney, marketer—all in one platform"
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

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button 
                onClick={() => document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Start Free Trial
              </button>
              <button 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-lg font-semibold rounded-xl transition-all duration-200"
              >
                See Pricing
              </button>
            </div>
          </div>

          {/* Carousel Section */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="relative">
              <div className={`${carouselSlides[currentSlide].bgColor} ${carouselSlides[currentSlide].borderColor} border-2 rounded-2xl p-12 text-center transition-all duration-500`}>
                <div className="flex justify-center mb-6">
                  {carouselSlides[currentSlide].icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {carouselSlides[currentSlide].title}
                </h3>
                <p className="text-lg text-gray-700">
                  {carouselSlides[currentSlide].subtitle}
                </p>
              </div>
              
              {/* Carousel Controls */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 p-3 rounded-full shadow-lg transition-all duration-200"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white hover:bg-gray-50 p-3 rounded-full shadow-lg transition-all duration-200"
              >
                <ChevronRight className="w-6 h-6 text-gray-600" />
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
          <div className="max-w-5xl mx-auto text-center mb-12">
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
                It's like having a full staff—broker, analyst, attorney, marketer, and financing advisor—working 24/7 to scale your pipeline and close deals faster.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Built-In AI Property Coach */}
      <div className="bg-gray-50 py-12">
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

          {/* Email Sign In Form */}
          <div className="max-w-md mx-auto">
            {otpSent ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                    <p className="text-green-800 font-medium">Check your email!</p>
                  </div>
                  <p className="text-green-700 text-sm">We sent you a verification code</p>
                </div>
                <input
                  type="text"
                  placeholder="Enter verification code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
                  disabled={isLoading}
                />
                <button
                  onClick={handleOtpVerify}
                  disabled={isLoading || !otp}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Start 7-Day Free Trial'}
                </button>
                <button
                  onClick={() => setOtpSent(false)}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm mt-2"
                >
                  ← Back to email
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  disabled={isLoading}
                />
                <button
                  onClick={handleEmailSignIn}
                  disabled={isLoading || !email}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                  {isLoading ? 'Sending...' : 'Start 7-Day Free Trial'}
                </button>
                <p className="text-sm text-gray-500">
                  Get started in 30 seconds • No commitment required
                </p>
              </div>
            )}
          </div>

          {/* Link to Full Pricing */}
          <div className="mt-8">
            <a href="/pricing" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View detailed pricing plans →
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
    </div>
  );
}