'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, ExternalLink, Bot, ChevronDown, ChevronUp, Zap, Phone, Mail, User, Calculator } from 'lucide-react';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [showStreetView, setShowStreetView] = useState(false);
  const [isAIAnalysisExpanded, setIsAIAnalysisExpanded] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSkipTraceExpanded, setIsSkipTraceExpanded] = useState(false);
  const [isSkipTracing, setIsSkipTracing] = useState(false);
  const [skipTraceData, setSkipTraceData] = useState<any>(null);
  const [isAnalyzingInvestment, setIsAnalyzingInvestment] = useState(false);
  const [investmentAnalysis, setInvestmentAnalysis] = useState<any>(null);
  const [isInvestmentAnalysisExpanded, setIsInvestmentAnalysisExpanded] = useState(false);

  // Sample property data - in real app this would come from API based on params.id
  const property = {
    address: "96 Rhode Island Ave",
    city: "Newport",
    state: "RI",
    zip: "02840",
    propertyId: "199596975",
    classification: "High Equity, Seller Finance",
    units: 14,
    stories: 3,
    yearBuilt: 1900,
    lotSize: "30,000 sq ft",
    yearsOwned: "N/A",
    assessedValue: "$1,651,100",
    estimatedMarketValue: "$1,651,100",
    estimatedEquity: "$1,651,100",
    listingPrice: "Not listed",
    mortgageBalance: "$500,000",
    lender: "Peoples Fsb",
    mortgageMaturityDate: "N/A",
    lastSaleDate: "N/A",
    lastSaleAmount: "$0",
    armsLengthSale: "No",
    mlsActive: "No",
    mlsDaysOnMarket: "N/A",
    floodZone: "Yes",
    floodZoneDescription: "AREA OF MINIMAL FLOOD HAZARD",
    ownerName: "96 Rhode Island Rlty Llc",
    ownerAddress: "N/A",
    inStateAbsenteeOwner: "No",
    outOfStateAbsenteeOwner: "Yes",
    assumable: "No",
    reo: "No",
    auction: "No",
    taxLien: "No",
    preForeclosure: "No",
    privateLender: "No"
  };

  const handlePrint = () => {
    window.print();
  };

  const openStreetView = () => {
    const address = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
    const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&parameters&pano&viewpoint&heading&pitch&fov&cbll&layer=c&z=18&q=${encodeURIComponent(address)}`;
    window.open(streetViewUrl, '_blank');
  };

  const handleAnalyzeProperty = async () => {
    setIsAnalyzing(true);
    // TODO: This will call the AI service with property data
    // For now, simulate loading
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleSkipTrace = async () => {
    setIsSkipTracing(true);
    
    try {
      // TODO: Call skip trace API
      // For now, simulate loading and return sample data
      setTimeout(() => {
        setSkipTraceData({
          contacts: [
            {
              name: "John R. Smith",
              phone: "(401) 555-0123",
              email: "j.smith@email.com",
              relationship: "Owner"
            },
            {
              name: "Smith Family Trust",
              phone: "(401) 555-0124", 
              email: "trust@smithfamily.com",
              relationship: "Trust Entity"
            },
            {
              name: "Mary E. Smith",
              phone: "(401) 555-0125",
              email: "mary.smith@email.com",
              relationship: "Co-Owner"
            }
          ],
          traceDate: new Date().toLocaleDateString(),
          confidence: "High"
        });
        setIsSkipTracing(false);
        setIsSkipTraceExpanded(true);
      }, 1500);
    } catch (error) {
      console.error('Skip trace error:', error);
      setIsSkipTracing(false);
    }
  };

  const handleAnalyzeInvestment = async () => {
    setIsAnalyzingInvestment(true);
    
    try {
      // TODO: This will call the investment analysis API with property data
      // For now, simulate loading and return sample data
      setTimeout(() => {
        setInvestmentAnalysis({
          cashFlow: {
            projectedNOI: 124800,
            cashOnCash: 8.4,
            capRate: 7.6
          },
          investmentScore: 8.2,
          scoreDescription: "Strong Investment Potential",
          recommendation: "This 14-unit property presents a strong investment opportunity with high equity position and substantial cash flow potential.",
          analysisDate: new Date().toLocaleDateString()
        });
        setIsAnalyzingInvestment(false);
        setIsInvestmentAnalysisExpanded(true);
      }, 2000);
    } catch (error) {
      console.error('Investment analysis error:', error);
      setIsAnalyzingInvestment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center text-gray-600 hover:text-gray-700 font-medium"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </button>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {property.address}, {property.city}, {property.state} {property.zip}
            </h1>
          </div>
          
          {/* Large Property Image */}
          <div 
            onClick={openStreetView}
            className="w-full h-96 bg-gradient-to-br from-gray-200 to-gray-300 cursor-pointer hover:shadow-lg transition-shadow flex items-center justify-center relative overflow-hidden"
          >
            <div className="text-gray-600 text-center">
              <div className="w-20 h-20 mx-auto mb-3 bg-gray-400/30 rounded-lg flex items-center justify-center">
                <ExternalLink className="h-10 w-10" />
              </div>
              <div className="text-lg font-medium mb-1">Click for Street View</div>
              <div className="text-sm text-gray-500">Interactive street-level view of the property</div>
            </div>
          </div>
        </div>

        {/* Comprehensive AI Investment Analysis Section - Full Width */}
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
                  <p className="text-gray-600">Our AI is reviewing property fundamentals, market conditions, and offer scenarios</p>
                  <div className="mt-4">
                    <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto">
                      <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" style={{width: '70%'}}></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6">
                  {/* Investment Score & Overview */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-1">Investment Score</h3>
                        <p className="text-sm text-blue-700">Based on property fundamentals and market analysis</p>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-1">8.2</div>
                        <div className="text-sm text-blue-600 font-medium">Strong Investment</div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-blue-700">
                      <Calculator className="w-4 h-4 mr-2" />
                      <span>Analysis incorporates offer analyzer scenarios when available</span>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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
                          <span className="font-semibold">$124,800</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cash-on-Cash:</span>
                          <span className="font-semibold">8.4%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cap Rate:</span>
                          <span className="font-semibold">7.6%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Equity Position:</span>
                          <span className="font-semibold">$1.65M</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                        Property Features
                      </h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• 14 units generating rental income</li>
                        <li>• Historic property with character</li>
                        <li>• Newport market location</li>
                        <li>• Strong unit count for scaling</li>
                        <li>• Out-of-state owner opportunity</li>
                      </ul>
                    </div>
                    
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Risk Factors
                      </h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• 1900 construction age</li>
                        <li>• Flood zone insurance costs</li>
                        <li>• Management complexity (14 units)</li>
                        <li>• Historic preservation requirements</li>
                        <li>• Market research needed</li>
                      </ul>
                    </div>
                  </div>
                  
                  {/* AI Recommendation */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200 mb-6">
                    <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                      <Bot className="w-5 h-5 mr-2" />
                      AI Investment Recommendation
                    </h4>
                    <p className="text-purple-700 mb-4">
                      This 14-unit property presents a <strong>strong investment opportunity</strong> with compelling fundamentals. 
                      The high equity position ($1.65M) and substantial cash flow potential make it attractive for value-add strategies 
                      and long-term wealth building.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-purple-800 mb-2">Key Strengths:</h5>
                        <ul className="text-sm text-purple-700 space-y-1">
                          <li>• Excellent cash flow potential</li>
                          <li>• Significant equity cushion</li>
                          <li>• Newport market stability</li>
                          <li>• Motivated seller indicators</li>
                          <li>• Scalable unit count</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-purple-800 mb-2">Next Steps:</h5>
                        <ul className="text-sm text-purple-700 space-y-1">
                          <li>• Physical property inspection</li>
                          <li>• Flood insurance cost analysis</li>
                          <li>• Local rental market research</li>
                          <li>• Renovation budget planning</li>
                          <li>• Financing structure optimization</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer with Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-4">
                      <p className="text-xs text-gray-500">
                        Analysis completed at {new Date().toLocaleString()}
                      </p>
                      <div className="flex items-center text-xs text-green-600">
                        <Calculator className="w-3 h-3 mr-1" />
                        <span>Offer scenario data included</span>
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(`/offer-analyzer?address=${encodeURIComponent(property.address)}&city=${encodeURIComponent(property.city)}&state=${encodeURIComponent(property.state)}`, '_blank')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                    >
                      <Calculator className="w-3 h-3 mr-1" />
                      Open Offer Analyzer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Skip Trace Section - Full Width */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div 
            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsSkipTraceExpanded(!isSkipTraceExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg mr-3">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Skip Trace Results</h2>
                  <p className="text-sm text-gray-600">Contact information and owner details</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {!skipTraceData && !isSkipTracing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSkipTrace();
                    }}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all font-medium"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Run Skip Trace
                  </button>
                )}
                {isSkipTraceExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
          
          {isSkipTraceExpanded && (
            <div className="px-6 pb-6 border-t border-gray-100">
              {isSkipTracing ? (
                <div className="py-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-4 animate-pulse">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Running Skip Trace...</h3>
                  <p className="text-gray-600">Searching for contact information and owner details</p>
                  <div className="mt-4">
                    <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto">
                      <div className="h-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-full animate-pulse" style={{width: '70%'}}></div>
                    </div>
                  </div>
                </div>
              ) : skipTraceData ? (
                <div className="py-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                      <p className="text-sm text-gray-600">
                        Trace completed on {skipTraceData.traceDate} • Confidence: {skipTraceData.confidence}
                      </p>
                    </div>
                    <button
                      onClick={handleSkipTrace}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Refresh Data
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {skipTraceData.contacts.map((contact: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg mr-2">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{contact.name}</h4>
                              <p className="text-xs text-gray-500">{contact.relationship}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-2 text-gray-400" />
                            <a 
                              href={`tel:${contact.phone}`}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {contact.phone}
                            </a>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-2 text-gray-400" />
                            <a 
                              href={`mailto:${contact.email}`}
                              className="hover:text-blue-600 transition-colors truncate"
                            >
                              {contact.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-1 bg-blue-100 rounded">
                        <Zap className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Skip Trace Complete</h4>
                        <p className="text-sm text-blue-700">
                          Found {skipTraceData.contacts.length} contact records. All information is current as of the trace date.
                          Use this data to reach out to property owners for potential investment opportunities.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No skip trace data available</p>
                  <p className="text-sm text-gray-500">Click "Run Skip Trace" to search for contact information</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Property Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">PROPERTY OVERVIEW</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property ID:</span>
                  <span className="font-medium">{property.propertyId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Classification:</span>
                  <span className="font-medium">{property.classification}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Units:</span>
                  <span className="font-medium">{property.units}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stories:</span>
                  <span className="font-medium">{property.stories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Year Built:</span>
                  <span className="font-medium">{property.yearBuilt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lot Size:</span>
                  <span className="font-medium">{property.lotSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Years Owned:</span>
                  <span className="font-medium">{property.yearsOwned}</span>
                </div>
              </div>
            </div>

            {/* Valuation & Equity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">VALUATION & EQUITY</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Assessed Value:</span>
                  <span className="font-medium">{property.assessedValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Market Value:</span>
                  <span className="font-medium">{property.estimatedMarketValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Equity:</span>
                  <span className="font-medium text-green-600">{property.estimatedEquity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Listing Price:</span>
                  <span className="font-medium">{property.listingPrice}</span>
                </div>
              </div>
            </div>

            {/* Mortgage & Financing */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">MORTGAGE & FINANCING</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mortgage Balance:</span>
                  <span className="font-medium">{property.mortgageBalance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lender:</span>
                  <span className="font-medium">{property.lender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mortgage Maturity Date:</span>
                  <span className="font-medium">{property.mortgageMaturityDate}</span>
                </div>
              </div>
            </div>

            {/* Flood Zone Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">FLOOD ZONE INFORMATION</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Flood Zone:</span>
                  <span className="font-medium">{property.floodZone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flood Zone Description:</span>
                  <span className="font-medium">{property.floodZoneDescription}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Sales & Transaction History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">SALES & TRANSACTION HISTORY</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sale Date:</span>
                  <span className="font-medium">{property.lastSaleDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sale Amount:</span>
                  <span className="font-medium">{property.lastSaleAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Arms-Length Sale:</span>
                  <span className="font-medium">{property.armsLengthSale}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MLS Active:</span>
                  <span className="font-medium">{property.mlsActive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MLS Days on Market:</span>
                  <span className="font-medium">{property.mlsDaysOnMarket}</span>
                </div>
              </div>
            </div>

            {/* Ownership Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">OWNERSHIP DETAILS</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Owner Name:</span>
                  <span className="font-medium">{property.ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Owner Address:</span>
                  <span className="font-medium">{property.ownerAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In-State Absentee Owner:</span>
                  <span className="font-medium">{property.inStateAbsenteeOwner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Out-of-State Absentee Owner:</span>
                  <span className="font-medium text-orange-600">{property.outOfStateAbsenteeOwner}</span>
                </div>
              </div>
            </div>

            {/* Other Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">OTHER INFORMATION</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Assumable:</span>
                  <span className="font-medium">{property.assumable}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">REO:</span>
                  <span className="font-medium">{property.reo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Auction:</span>
                  <span className="font-medium">{property.auction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Lien:</span>
                  <span className="font-medium">{property.taxLien}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pre Foreclosure:</span>
                  <span className="font-medium">{property.preForeclosure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Private Lender:</span>
                  <span className="font-medium">{property.privateLender}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}