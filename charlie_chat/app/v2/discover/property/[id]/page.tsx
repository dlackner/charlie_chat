/*
 * CHARLIE2 V2 - Property Detail Page
 * Comprehensive property details with AI investment analysis
 * Features: Fixed navigation, working AI analysis, clean UI
 * TODO: Move to app/v2/discover/property/[id]/ for proper V2 organization
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, ExternalLink, ChevronDown, ChevronUp, Zap, Phone, Mail, User } from 'lucide-react';
import { StreetViewImage } from '@/components/ui/StreetViewImage';
import { PropertyInfoSections } from '@/components/v2/property-details/PropertyInfoSections';
import { AIInvestmentAnalysis } from '@/components/v2/property-details/AIInvestmentAnalysis';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  
  // Determine if we're in DISCOVER, ENGAGE, or BUYBOX context
  const context = searchParams.get('context');
  const isEngageContext = context === 'engage' || 
                         (typeof window !== 'undefined' && document.referrer.includes('/engage'));
  const isBuyboxContext = context === 'buybox' || 
                         (typeof window !== 'undefined' && document.referrer.includes('/buybox'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSkipTraceExpanded, setIsSkipTraceExpanded] = useState(false);
  const [isSkipTracing, setIsSkipTracing] = useState(false);
  const [skipTraceData, setSkipTraceData] = useState<any>(null);

  // Fetch user class
  useEffect(() => {
    if (user?.id && !userClass) {
      const fetchUserClass = async () => {
        try {
          const supabase = createSupabaseBrowserClient();
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_class')
            .eq('user_id', user.id)
            .single();
            
          if (profile?.user_class) {
            setUserClass(profile.user_class);
          }
        } catch (error) {
          console.error('Error fetching user class:', error);
        }
      };
      
      fetchUserClass();
    }
  }, [user?.id, userClass]);

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

          // Check for existing skip trace data in saved_properties table if in ENGAGE context
          console.log('🔍 isEngageContext:', isEngageContext);
          console.log('🔍 context from URL:', context);
          if (isEngageContext) {
            console.log('🔍 Checking for existing skip trace data for property_id:', foundProperty.id);
            const supabase = createSupabaseBrowserClient();
            const { data: savedProperty, error: savedError } = await supabase
              .from('saved_properties')
              .select('skip_trace_data, last_skip_trace')
              .eq('property_id', foundProperty.id)
              .single();

            console.log('🔍 Database query result:', { savedProperty, savedError });
            if (!savedError && savedProperty?.skip_trace_data) {
              console.log('✅ Found existing skip trace data:', savedProperty.skip_trace_data);
              setSkipTraceData(savedProperty.skip_trace_data);
            } else {
              console.log('❌ No skip trace data found or error occurred');
            }
          } else {
            console.log('🔍 Skipping skip trace check - not in engage context');
          }
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
        // Fallback based on context
        if (isEngageContext) {
          router.push('/v2/engage');
        } else if (isBuyboxContext) {
          router.push('/v2/discover/buybox');
        } else {
          router.push('/v2/discover');
        }
      }
    } else {
      // Fallback based on context if no back parameter
      if (isEngageContext) {
        router.push('/v2/engage');
      } else if (isBuyboxContext) {
        router.push('/v2/discover/buybox');
      } else {
        router.push('/v2/discover');
      }
    }
  };

  const handleSkipTrace = async () => {
    if (!property) return;
    
    setIsSkipTracing(true);
    
    try {
      // Step 1: Prepare skip trace request using property's owner mailing address
      const skipTraceRequest = {
        address: property.mail_address_street || property.address_street || '',
        city: property.mail_address_city || property.address_city || '',
        state: property.mail_address_state || property.address_state || '',
        zip: property.mail_address_zip || property.address_zip || '',
        first_name: property.owner_first_name || '',
        last_name: property.owner_last_name || ''
      };

      // Validate required fields
      if (!skipTraceRequest.address || !skipTraceRequest.city || !skipTraceRequest.state) {
        throw new Error('Insufficient address information for skip trace');
      }

      console.log('Skip trace request:', skipTraceRequest);

      // Step 2: Call the skip trace API
      const response = await fetch('/api/skiptrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skipTraceRequest)
      });

      const apiData = await response.json();

      if (!response.ok) {
        // Handle specific "property not found" error without throwing
        if (apiData.message && apiData.message.includes('Unable to locate valid property')) {
          // Update database to record failed skip trace attempt
          try {
            const supabase = createSupabaseBrowserClient();
            await supabase
              .from('saved_properties')
              .update({
                last_skip_trace: new Date().toISOString()
              })
              .eq('property_id', property.id);
          } catch (dbError) {
            console.error('Failed to update skip trace timestamp:', dbError);
          }
          
          setSkipTraceData({
            error: 'No skip trace data available - property address not found in database',
            contacts: [],
            confidence: 'Failed',
            traceDate: new Date().toLocaleDateString()
          });
          setIsSkipTraceExpanded(true);
          setIsSkipTracing(false);
          return;
        }
        throw new Error(apiData.message || apiData.error || 'Skip trace failed');
      }

      console.log('Skip trace API response:', apiData);

      // Step 3: Process the API response into display format
      let processedData = null;
      
      if (apiData.match && apiData.output && apiData.output.identity) {
        const identity = apiData.output.identity;
        const demographics = apiData.output.demographics || {};
        
        // Extract connected phones
        const phones = (identity.phones || [])
          .filter((p: any) => p.isConnected)
          .slice(0, 3); // Limit to first 3 connected phones
        
        // Extract emails  
        const emails = identity.emails || [];
        
        // Create contacts array for display
        const contacts = [];
        
        // Primary contact with owner info
        contacts.push({
          name: `${property.owner_first_name || ''} ${property.owner_last_name || ''}`.trim() || 'Property Owner',
          phone: phones[0]?.phoneDisplay || phones[0]?.phone || '',
          email: emails[0]?.email || '',
          relationship: 'Owner',
          phoneType: phones[0]?.phoneType || '',
          doNotCall: phones[0]?.doNotCall || false
        });

        // Additional phone numbers as separate contacts
        phones.slice(1).forEach((phone: any, index: number) => {
          contacts.push({
            name: `${property.owner_first_name || ''} ${property.owner_last_name || ''}`.trim() || 'Property Owner',
            phone: phone.phoneDisplay || phone.phone || '',
            email: '',
            relationship: `Additional Phone ${index + 2}`,
            phoneType: phone.phoneType || '',
            doNotCall: phone.doNotCall || false
          });
        });

        processedData = {
          contacts: contacts.filter(c => c.phone || c.email), // Only include contacts with phone or email
          confidence: apiData.match ? 'High' : 'Low',
          traceDate: new Date().toLocaleDateString(),
          demographics: {
            age: demographics.age,
            gender: demographics.gender,
            occupation: demographics.jobs?.[0]?.display
          },
          currentAddress: identity.address?.formattedAddress,
          addressHistory: identity.addressHistory || []
        };
      }

      // Step 4: Store results in saved_properties table
      if (processedData) {
        try {
          const supabase = createSupabaseBrowserClient();
          const { error: updateError } = await supabase
            .from('saved_properties')
            .update({
              skip_trace_data: processedData,
              last_skip_trace: new Date().toISOString()
            })
            .eq('property_id', property.id);

          if (updateError) {
            console.warn('Failed to save skip trace data to database:', updateError.message);
          } else {
            console.log('Skip trace data saved successfully to database');
          }
        } catch (dbError) {
          console.error('Database update error:', dbError);
        }
      }

      setSkipTraceData(processedData);
      setIsSkipTraceExpanded(true);

    } catch (error) {
      
      let errorMessage = 'Skip trace failed';
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        // Handle various error types with user-friendly messages
        if (errorText.includes('unable to locate valid property') || 
            errorText.includes('address(es) provided') ||
            errorText.includes('property from address')) {
          errorMessage = 'No skip trace data available - property address not found in database';
        } else if (errorText.includes('insufficient address information')) {
          errorMessage = 'Skip trace requires complete owner mailing address information';
        } else if (errorText.includes('po box')) {
          errorMessage = 'Skip trace not available for PO Box addresses - need a physical mailing address';
        } else if (errorText.includes('network') || errorText.includes('timeout')) {
          errorMessage = 'Network error - please check your connection and try again';
        } else if (errorText.includes('service temporarily unavailable')) {
          errorMessage = 'Skip trace service temporarily unavailable - please try again later';
        } else {
          errorMessage = error.message;
        }
      }
      
      setSkipTraceData({
        error: errorMessage,
        contacts: [],
        confidence: 'Failed',
        traceDate: new Date().toLocaleDateString()
      });
      setIsSkipTraceExpanded(true);
    } finally {
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
                Back
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
                Back
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
          userClass={userClass}
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
                    {skipTraceData.error ? (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                          <Zap className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Skip Trace Failed</h3>
                        <p className="text-sm text-gray-600 max-w-md mx-auto">
                          {skipTraceData.error}
                        </p>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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