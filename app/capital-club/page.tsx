"use client";

import { Crown, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function CapitalClub() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/capital-club-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          source: 'Capital Club',
          lead_type: 'capital_club_investor',
          page_url: '/capital-club',
          timestamp: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Open external URL in new tab/window
        if (data.redirectUrl) {
          window.open(data.redirectUrl, '_blank');
        }
      } else {
        setSubmitError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex flex-col items-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Capital Club
              </h1>
              <p className="text-2xl text-blue-600 font-semibold">
                Invest in professionally sourced multifamily opportunities.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Access to Real Deals Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Access to Real Deals, Not Listings</h2>
          <div className="text-lg text-gray-700 space-y-4">
            <p>
              As a Capital Club investor, you gain access to professionally sourced, pre-analyzed multifamily deals that originate from experienced operators using the MultifamilyOS™.
            </p>
            <p>
              Each property is identified and vetted using standardized criteria before it ever reaches the Club — giving you a consistent, data-driven foundation for every opportunity you review.
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-2 bg-blue-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Join the Capital Club</h3>
                <p className="text-gray-600 text-sm">
                  Become part of an exclusive private investor community built on collaboration, transparency, and shared success.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-2 bg-green-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Review Vetted Opportunities</h3>
                <p className="text-gray-600 text-sm">
                  Each deal presented to you has been analyzed in MultifamilyOS and reviewed by the Club's evaluation team. You'll receive clear pro forma summaries, assumptions, and financial forecasts.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-2 bg-purple-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Vote and Invest</h3>
                <p className="text-gray-600 text-sm">
                  When a deal is presented, members vote whether to fund it. If approved, investors commit capital to complete the equity stack.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-2 bg-orange-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Participate in Ownership</h3>
                <p className="text-gray-600 text-sm">
                  Once funded, you become part of the ownership group. Unlike a passive LP model, Capital Club members are actively involved in oversight, strategy, and performance decisions.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Investment Parameters Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Typical Investment Parameters</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Top Row - Blue */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-blue-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-blue-600 mb-2">$20,000</div>
              <div className="text-gray-600 font-medium">Minimum Investment</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-blue-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-blue-600 mb-2">5–7 years</div>
              <div className="text-gray-600 font-medium">Hold Period</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-blue-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-blue-600 mb-2">3%</div>
              <div className="text-gray-600 font-medium">Deposit Fee</div>
            </div>

            {/* Second Row - Green */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-green-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-green-600 mb-2">14–18%</div>
              <div className="text-gray-600 font-medium">Target IRR</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-green-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-green-600 mb-2">7–9%</div>
              <div className="text-gray-600 font-medium">Cash-on-Cash Return</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-green-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-green-600 mb-2">8%</div>
              <div className="text-gray-600 font-medium">Preferred Return (quarterly)</div>
            </div>

          </div>
        </div>

        {/* What You Gain Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">What You Gain as an Investor</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <span className="font-semibold">Access to Curated Opportunities</span> — sourced and analyzed by experienced professionals
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <span className="font-semibold">Transparency</span> — every deal is presented with consistent data and structure
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <span className="font-semibold">Active Ownership</span> — contribute to decisions, not just distributions
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <span className="font-semibold">Diversified Deal Flow</span> — access multiple markets through one community
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <span className="font-semibold">Network of Experts</span> — learn from operators, lenders, and peers
              </div>
            </div>
          </div>
        </div>

        {/* Join the Club Form Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">You bring the capital.</h2>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">We bring the opportunities.</h2>
            <p className="text-lg text-blue-100">Click the button below and you will be redirected to the MultifamilyOS Club page<br />where you can review details about the club and investment options.</p>
          </div>
          
          <div className="max-w-md mx-auto">
            <button
              onClick={() => window.open('https://www.fractional.app/p/MultifamilyOSclub', '_blank')}
              className="w-full px-8 py-4 bg-white text-blue-600 font-semibold text-lg rounded-xl hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center"
            >
              <Crown className="h-5 w-5 mr-2" />
              Join the Capital Club
            </button>
          </div>

          {/* COMMENTED OUT - Original form in case we want to revert back later
          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-blue-100 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-blue-100 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  placeholder="Smith"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                placeholder="john@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-blue-100 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                placeholder="(555) 123-4567"
              />
            </div>
            
            {submitError && (
              <div className="text-red-200 text-sm text-center bg-red-500/20 p-3 rounded-lg">
                {submitError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-8 py-4 bg-white text-blue-600 font-semibold text-lg rounded-xl hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5 mr-2" />
                  Join the Capital Club
                </>
              )}
            </button>
          </form>
          */}
        </div>

      </div>
    </div>
  );
}