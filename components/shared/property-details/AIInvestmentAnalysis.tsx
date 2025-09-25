/*
 * CHARLIE2 V2 - AI Investment Analysis Component
 * OpenAI-powered property investment analysis with comprehensive metrics
 * Features: Fixed API endpoint, working analysis, detailed reporting
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { hasAccess } from '@/lib/v2/accessControl';
import type { UserClass } from '@/lib/v2/accessControl';
import { StandardModalWithActions } from '@/components/shared/StandardModal';

interface PropertyData {
  id?: string;
  property_id?: string;
  address_street?: string;
  address_full?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  units_count?: number;
  year_built?: number;
  assessed_value?: string;
  latitude?: number;
  longitude?: number;
}

interface AnalysisResult {
  financialStrength: {
    projectedNOI: number;
    cashOnCash: number;
    capRate: number;
    equityPosition: string;
    marketRent?: string;
    notes: string[];
  };
  propertyFeatures: {
    highlights: string[];
    marketPosition: string;
    notes: string[];
  };
  riskFactors: {
    risks: string[];
    severity: 'low' | 'medium' | 'high';
    notes: string[];
  };
  narrative: {
    marketOverview: string;
    charliesTake: string;
    strategy: string[];
    verdict: {
      decision: 'PURSUE' | 'CONSIDER' | 'PASS';
      reasoning: string;
    };
  };
  confidence: 'low' | 'medium' | 'high';
  analysisDate: string;
}

interface AIInvestmentAnalysisProps {
  property: PropertyData;
  isEngageContext: boolean;
  userClass?: string | null;
}

export function AIInvestmentAnalysis({ property, isEngageContext, userClass }: AIInvestmentAnalysisProps) {
  const router = useRouter();
  const [isAIAnalysisExpanded, setIsAIAnalysisExpanded] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [investmentAnalysis, setInvestmentAnalysis] = useState<AnalysisResult | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleAnalyzeProperty = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Prepare property data for analysis
      const propertyData = {
        address: property.address_street || property.address_full,
        city: property.address_city,
        state: property.address_state,
        zip: property.address_zip,
        units: property.units_count || 1,
        yearBuilt: property.year_built || 1950,
        assessedValue: property.assessed_value || 'Unknown',
        estimatedValue: (property as any).estimated_value,
        latitude: property.latitude,
        longitude: property.longitude
      };


      const response = await fetch('/api/analyze-investment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(propertyData)
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const analysisResult = await response.json();
      
      setInvestmentAnalysis(analysisResult);
      setIsAIAnalysisExpanded(true);
      
      // Show upgrade modal immediately for core users
      if (!hasAccess(userClass as UserClass, 'discover_investment_analysis')) {
        setShowUpgradeModal(true);
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError('Failed to analyze property. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsAIAnalysisExpanded(!isAIAnalysisExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Investment Analysis</h2>
              <p className="text-sm text-gray-600">Comprehensive property analysis powered by artificial intelligence</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!isAnalyzing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnalyzeProperty();
                }}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium"
              >
                <Bot className="h-4 w-4 mr-2" />
                Analyze Investment
              </button>
            )}
            {isAIAnalysisExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      {isAIAnalysisExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {isAnalyzing ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 animate-pulse">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Investment Potential...</h3>
              <p className="text-gray-600">Gathering current market data and analyzing property fundamentals</p>
              <div className="mt-4">
                <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto">
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
              </div>
            </div>
          ) : analysisError ? (
            <div className="py-8 text-center">
              <div className="text-red-600 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Failed</h3>
              <p className="text-gray-600 mb-4">{analysisError}</p>
              <button
                onClick={handleAnalyzeProperty}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Try Again
              </button>
            </div>
          ) : investmentAnalysis ? (
            <div className="py-6">
              {/* Investment Score & Overview - Only show in ENGAGE context */}
              {isEngageContext && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 mb-1">Investment Analysis Complete</h3>
                      <p className="text-sm text-blue-700">Based on current market data</p>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-blue-600 font-medium capitalize">{investmentAnalysis.confidence} Confidence</div>
                      <div className="text-xs text-blue-500">{investmentAnalysis.analysisDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-blue-700">
                    <Calculator className="w-4 h-4 mr-2" />
                    <span>Analysis powered by real-time market data</span>
                  </div>
                </div>
              )}

              {/* Key Metrics Grid - Access Controlled */}
              <div className={`relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 ${
                !hasAccess(userClass as UserClass, 'discover_investment_analysis') ? 'overflow-hidden' : ''
              }`}>
                {/* Financial Strength */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Financial Strength
                  </h4>
                  <div className="space-y-2 text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>Projected NOI:</span>
                      <span className="font-semibold">${investmentAnalysis.financialStrength.projectedNOI.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cash-on-Cash:</span>
                      <span className="font-semibold">{investmentAnalysis.financialStrength.cashOnCash}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cap Rate:</span>
                      <span className="font-semibold">{investmentAnalysis.financialStrength.capRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Equity Position:</span>
                      <span className="font-semibold">{investmentAnalysis.financialStrength.equityPosition}</span>
                    </div>
                  </div>
                  {investmentAnalysis.financialStrength.notes.filter(note => 
                    !note.toLowerCase().includes('rent estimate') && !note.toLowerCase().includes('average rent')
                  ).length > 0 && (
                    <div className="mt-3 pt-2 border-t border-green-200">
                      {investmentAnalysis.financialStrength.notes
                        .filter(note => !note.toLowerCase().includes('rent estimate') && !note.toLowerCase().includes('average rent'))
                        .map((note: string, i: number) => (
                        <div key={i} className="text-xs text-green-600 leading-relaxed mb-1 whitespace-normal break-words">• {note}</div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Property Features */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                    Property Features
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {investmentAnalysis.propertyFeatures.highlights.map((highlight: string, i: number) => (
                      <li key={i}>• {highlight.replace(/^[-–—]\s*/, '').trim()}</li>
                    ))}
                  </ul>
                  {investmentAnalysis.propertyFeatures.marketPosition && (
                    <div className="mt-2 text-xs text-blue-600">
                      {investmentAnalysis.propertyFeatures.marketPosition}
                    </div>
                  )}
                  {investmentAnalysis.propertyFeatures.notes.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-blue-200">
                      {investmentAnalysis.propertyFeatures.notes.map((note: string, i: number) => (
                        <div key={i} className="text-xs text-blue-600 leading-relaxed mb-1 whitespace-normal break-words">• {note}</div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Risk Factors */}
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Risk Factors
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {investmentAnalysis.riskFactors.risks.map((risk: string, i: number) => (
                      <li key={i}>• {risk.replace(/^[-–—]\s*/, '').trim()}</li>
                    ))}
                  </ul>
                  <div className="mt-2 text-xs text-yellow-600 capitalize">
                    Risk Level: {investmentAnalysis.riskFactors.severity}
                  </div>
                  {investmentAnalysis.riskFactors.notes.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-yellow-200">
                      {investmentAnalysis.riskFactors.notes.map((note: string, i: number) => (
                        <div key={i} className="text-xs text-yellow-600 leading-relaxed mb-1 whitespace-normal break-words">• {note}</div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Blur overlay for core users on summary cards - uniform blur across entire content */}
                {!hasAccess(userClass as UserClass, 'discover_investment_analysis') && (
                  <div 
                    className="absolute inset-0 cursor-pointer"
                    style={{
                      backdropFilter: 'blur(4px)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }}
                    onClick={() => setShowUpgradeModal(true)}
                  />
                )}
              </div>

              {/* Detailed Analysis Section - Access Controlled */}
              <div className={`relative ${
                !hasAccess(userClass as UserClass, 'discover_investment_analysis') ? 'overflow-hidden' : ''
              }`}>
                {/* Investment Analysis Narrative */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="p-1.5 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg mr-3">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  Investor Analysis
                </h4>
                
                {/* Market Overview */}
                <div className="mb-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h5 className="font-medium text-blue-800 mb-2 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Market Overview - {property.address_city}, {property.address_state}
                  </h5>
                  <p className="text-blue-700 text-sm leading-relaxed">
                    {investmentAnalysis.narrative.marketOverview}
                  </p>
                </div>

                {/* Investment Outlook */}
                <div className="mb-4">
                  <h5 className="font-medium text-gray-800 mb-2 text-sm">Investment Outlook:</h5>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {investmentAnalysis.narrative.charliesTake}
                  </p>
                </div>

                {/* Strategy */}
                <div className="mb-4">
                  <h5 className="font-medium text-gray-800 mb-2 text-sm">Strategy:</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {investmentAnalysis.narrative.strategy.map((item: string, i: number) => (
                      <li key={i} className="flex items-start">
                        <span className="text-blue-500 mr-2 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Verdict */}
                <div className="pt-3 border-t border-gray-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-800 text-sm">Verdict:</h5>
                      <p className="text-sm text-gray-700 mt-1">
                        {investmentAnalysis.narrative.verdict.reasoning}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        investmentAnalysis.narrative.verdict.decision === 'PURSUE' 
                          ? 'bg-green-100 text-green-800' 
                          : investmentAnalysis.narrative.verdict.decision === 'CONSIDER'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {investmentAnalysis.narrative.verdict.decision}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Recommendation - Only show in ENGAGE context */}
              {isEngageContext && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200 mb-6">
                  <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                    <Bot className="w-5 h-5 mr-2" />
                    AI Investment Recommendation
                  </h4>
                  <p className="text-purple-700 mb-4">
                    This property analysis is based on current market data and shows <strong>investment potential</strong> with the metrics above. 
                    The analysis incorporates real-time market conditions and property fundamentals.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-purple-800 mb-2">Key Insights:</h5>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Market data shows current trends</li>
                        <li>• Financial metrics calculated from property data</li>
                        <li>• Risk assessment based on location and age</li>
                        <li>• Confidence level: {investmentAnalysis.confidence}</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-purple-800 mb-2">Next Steps:</h5>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Physical property inspection</li>
                        <li>• Local market research verification</li>
                        <li>• Detailed financial analysis</li>
                        <li>• Professional property assessment</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
                {/* Blur overlay for core users */}
                {!hasAccess(userClass as UserClass, 'discover_investment_analysis') && (
                  <div 
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => setShowUpgradeModal(true)}
                    style={{
                      backdropFilter: 'blur(4px)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }}
                  />
                )}
              </div>
              
              {/* Footer with Actions - Only show in ENGAGE context */}
              {isEngageContext && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <p className="text-xs text-gray-500">
                      Analysis completed at {investmentAnalysis.analysisDate}
                    </p>
                    <div className="flex items-center text-xs text-green-600">
                      <Calculator className="w-3 h-3 mr-1" />
                      <span>Powered by MultifamilyOS.ai</span>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(`/offer-analyzer?address=${encodeURIComponent(property.address_street || property.address_full || '')}&city=${encodeURIComponent(property.address_city)}&state=${encodeURIComponent(property.address_state)}&id=${encodeURIComponent(property.property_id || '')}`, '_blank')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                  >
                    <Calculator className="w-3 h-3 mr-1" />
                    Open Offer Analyzer
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No investment analysis available</p>
              <p className="text-sm text-gray-500">Click "Analyze Investment" to get current market data and insights</p>
            </div>
          )}
        </div>
      )}
      
      {/* Upgrade Modal */}
      <StandardModalWithActions
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade Required"
        showCloseButton={true}
        primaryAction={{
          label: "View Plans",
          onClick: () => {
            setShowUpgradeModal(false);
            router.push('/pricing');
          }
        }}
        secondaryAction={{
          label: "Maybe Later",
          onClick: () => setShowUpgradeModal(false)
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Calculator className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Investment Analysis</h3>
              <p className="text-gray-600">Get detailed property insights and recommendations</p>
            </div>
          </div>
          <p className="text-gray-700">
            Upgrade your plan to get an AI property analysis and recommendation. 
            Choose from our Plus or Pro plans to unlock this feature and many more!
          </p>
        </div>
      </StandardModalWithActions>
    </div>
  );
}