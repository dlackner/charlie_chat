/*
 * Detailed Operating System Process Flow Component
 * Saved from home page - complete 6-step process with detailed cards
 * Can be used on a dedicated "How It Works" or "Process" page
 */
'use client';

import { UserPlus, Search, MessageSquare, CreditCard, Monitor, Brain } from 'lucide-react';

export default function DetailedProcessFlow() {
  return (
    <div className="bg-gray-900 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            The First True Operating System for Multifamily Real Estate
          </h2>
          <p className="text-xl text-gray-300 mb-6">
            From deal discovery to portfolio optimization, MultiFamilyOS provides an integrated platform that guides you through every step of the real estate lifecycle.
          </p>
          <p className="text-lg text-gray-400 max-w-4xl mx-auto">
            Just like your computer's operating system manages all applications and processes, MultiFamilyOS orchestrates every aspect of your multifamily business through one unified platform. Each module seamlessly connects to the next, creating an intelligent, automated workflow that scales with your portfolio.
          </p>
        </div>
        
        {/* Process Flow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* ONBOARD */}
          <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200">
            <div className="flex flex-col items-start">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 rounded-lg mr-4">
                  <UserPlus className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-600 uppercase tracking-wide">STEP 1</div>
                  <h3 className="text-xl font-semibold text-gray-900">ONBOARD</h3>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                System initialization: Set up your portfolio, configure data sources, and initialize your multifamily operating environment. Like booting up your OS, this is where everything begins.
              </p>
            </div>
          </div>

          {/* DISCOVER */}
          <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200">
            <div className="flex flex-col items-start">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 rounded-lg mr-4">
                  <Search className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-green-600 uppercase tracking-wide">STEP 2</div>
                  <h3 className="text-xl font-semibold text-gray-900">DISCOVER</h3>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Market intelligence engine: Leverage AI-powered market analysis to identify opportunities, analyze deals, and discover high-potential properties across target markets.
              </p>
            </div>
          </div>

          {/* ENGAGE */}
          <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200">
            <div className="flex flex-col items-start">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 rounded-lg mr-4">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-600 uppercase tracking-wide">STEP 3</div>
                  <h3 className="text-xl font-semibold text-gray-900">ENGAGE</h3>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Communication & marketing hub: Manage leads, automate prospect communication, coordinate with stakeholders, and execute marketing campaigns from a unified interface.
              </p>
            </div>
          </div>

          {/* FUND */}
          <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200">
            <div className="flex flex-col items-start">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-orange-100 rounded-lg mr-4">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-orange-600 uppercase tracking-wide">STEP 4</div>
                  <h3 className="text-xl font-semibold text-gray-900">FUND</h3>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Financial processing center: Streamline underwriting, secure financing, manage investor relations, and process all financial transactions through integrated tools.
              </p>
            </div>
          </div>

          {/* MANAGE */}
          <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 ring-2 ring-blue-500">
            <div className="flex flex-col items-start">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-500 rounded-lg mr-4">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-600 uppercase tracking-wide">CORE HUB</div>
                  <h3 className="text-xl font-semibold text-gray-900">MANAGE</h3>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Operations control panel: Monitor portfolio performance, track KPIs, oversee day-to-day operations, and maintain complete visibility across all assets.
              </p>
            </div>
          </div>

          {/* COACH */}
          <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200">
            <div className="flex flex-col items-start">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-indigo-100 rounded-lg mr-4">
                  <Brain className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-indigo-600 uppercase tracking-wide">STEP 6</div>
                  <h3 className="text-xl font-semibold text-gray-900">COACH</h3>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                AI optimization assistant: Continuous AI-powered guidance, recommendations, and strategic insights to optimize performance and maximize returns.
              </p>
            </div>
          </div>
        </div>

        {/* Key Messaging */}
        <div className="text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-white mb-2">One Platform. Complete Control.</h4>
              <p className="text-gray-400 text-sm">Everything connected in one cohesive system</p>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-semibold text-white mb-2">Your Multifamily Business, Systematized.</h4>
              <p className="text-gray-400 text-sm">Intelligent workflow that scales with your portfolio</p>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-semibold text-white mb-2">From Onboarding to AI Coaching.</h4>
              <p className="text-gray-400 text-sm">Every step of the lifecycle, fully integrated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}