'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, ExternalLink, Bot, ChevronDown, ChevronUp, Zap, Phone, Mail, User, Calculator } from 'lucide-react';
import { StreetViewImage } from '@/components/ui/StreetViewImage';
import { PropertyInfoSections } from '@/components/property-details/PropertyInfoSections';
import { AIInvestmentAnalysis } from '@/components/property-details/AIInvestmentAnalysis';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [property, setProperty] = useState<any>(null);
  
  // Determine if we're in DISCOVER or ENGAGE context
  const isEngageContext = searchParams.get('context') === 'engage' || 
                         (typeof window !== 'undefined' && document.referrer.includes('/engage'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStreetView, setShowStreetView] = useState(false);
  const [isSkipTraceExpanded, setIsSkipTraceExpanded] = useState(false);
  const [isSkipTracing, setIsSkipTracing] = useState(false);
  const [skipTraceData, setSkipTraceData] = useState<any>(null);

  // Fetch property data when component mounts
  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!params.id) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/realestateapi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: params.id, // Search by specific property ID
            propertyType: "MFR", // Only multifamily properties
            size: 1,
            obfuscate: false,
            summary: false
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch property data');
        }

        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          const foundProperty = data.data[0];
          console.log('Property data received:', foundProperty);
          console.log('Property fields available:', Object.keys(foundProperty));
          setProperty(foundProperty);
        } else {
          console.log('No property data found. API response:', data);
          setError('Property not found');
        }
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyData();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleBackToSearch = () => {
    // Check if we have a back URL parameter
    const backUrl = searchParams.get('back');
    if (backUrl) {
      try {
        const decodedUrl = decodeURIComponent(backUrl);
        window.location.href = decodedUrl;
      } catch (error) {
        console.error('Error decoding back URL:', error);
        router.push('/discover');
      }
    } else {
      // Fallback to discover page if no back parameter
      router.push('/discover');
    }
  };

  const openStreetView = () => {
    const address = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
    const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&parameters&pano&viewpoint&heading&pitch&fov&cbll&layer=c&z=18&q=${encodeURIComponent(address)}`;
    window.open(streetViewUrl, '_blank');
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


  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading property details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <ExternalLink className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {error || 'Property not found'}
              </h2>
              <p className="text-gray-600 mb-4">
                The property you're looking for could not be loaded.
              </p>
              <button
                onClick={handleBackToSearch}
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBackToSearch}
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
              {property.address_street || property.address_full}, {property.address_city}, {property.address_state} {property.address_zip}
            </h1>
          </div>
          
          {/* Large Property Image */}
          <div className="w-full h-96 relative overflow-hidden">
            <StreetViewImage
              address={`${property.address_street || property.address_full}, ${property.address_city}, ${property.address_state} ${property.address_zip}`}
              latitude={property.latitude}
              longitude={property.longitude}
              className="w-full h-full"
              width={1200}
              height={384}
            />
          </div>
        </div>

        {/* AI Investment Analysis Component */}
        <AIInvestmentAnalysis 
          property={property} 
          isEngageContext={isEngageContext} 
        />

        {/* Skip Trace Section - Full Width - Only show in ENGAGE context */}
        {isEngageContext && (
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
        )}

        <PropertyInfoSections property={property} />
      </div>
    </div>
  );
}