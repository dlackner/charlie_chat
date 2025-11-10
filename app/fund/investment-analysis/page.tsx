'use client';

import { useState, useEffect, Suspense } from 'react';
import { ArrowLeft, Edit, FileText, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { StandardModalWithActions } from '@/components/shared/StandardModal';

interface Property {
  property_id: string;
  address_street: string;
  address_full?: string;
  address_city: string;
  address_state: string;
  address_zip?: string;
  latitude?: number;
  longitude?: number;
  units_count?: number;
  year_built?: number;
  assessed_value?: number;
  estimated_value?: number;
  estimated_equity?: number;
  listing_price?: number;
  mortgage_balance?: number;
  lender_name?: string;
  flood_zone?: boolean;
  flood_zone_description?: string;
  last_sale_date?: string;
  last_sale_amount?: number;
  owner_first_name?: string;
  owner_last_name?: string;
  out_of_state_absentee_owner?: boolean;
  in_state_absentee_owner?: boolean;
}

interface OfferScenario {
  id: string;
  offer_name: string;
  offer_data: {
    purchasePrice?: number;
    downPayment?: number;
    renovationBudget?: number;
    projected_irr?: string;
    projected_cash_on_cash?: string;
    projected_cap_rate?: string;
    projected_equity_at_horizon?: number;
    [key: string]: any;
  };
}

interface Submission {
  id: string;
  investment_sentiment: string;
  deal_summary: string;
  partnership_type: string;
}

interface AnalysisSection {
  title: string;
  content: string;
  editable: boolean;
}

function InvestmentAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams?.get('property');
  const offerId = searchParams?.get('offer');
  const submissionId = searchParams?.get('submission');
  const sentimentParam = searchParams?.get('sentiment');
  
  const { supabase, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [offerScenario, setOfferScenario] = useState<OfferScenario | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [analysisSections, setAnalysisSections] = useState<AnalysisSection[]>([]);
  // PDF blob is now handled directly in localStorage

  // This useEffect is no longer needed as we store the PDF immediately after generation
  
  // Edit modal state
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Check for saved HTML in localStorage on component mount
  useEffect(() => {
    const savedHtml = localStorage.getItem('investmentAnalysisHtmlSnapshot');
    if (savedHtml) {
      try {
        const parsedHtml = JSON.parse(savedHtml);
        if (parsedHtml.sections) {
          // Convert saved sections back to AnalysisSection format
          const restoredSections: AnalysisSection[] = parsedHtml.sections.map((section: any) => ({
            title: section.title,
            content: section.content,
            editable: true
          }));
          setAnalysisSections(restoredSections);
        }
      } catch (error) {
        console.error('Error parsing saved HTML:', error);
      }
    }
  }, []);

  // Prevent navigation during generation
  useEffect(() => {
    if (generating) {
      // Prevent browser back/forward navigation
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        return false;
      };

      // Prevent tab/window closing
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Analysis generation in progress. Are you sure you want to leave?';
        return 'Analysis generation in progress. Are you sure you want to leave?';
      };

      // Add event listeners
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Push initial state to prevent back navigation
      window.history.pushState(null, '', window.location.href);

      // Cleanup
      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [generating]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!propertyId || !offerId || !supabase) return;

      try {
        // Fetch property data
        const { data: propertyData, error: propertyError } = await supabase
          .from('saved_properties')
          .select('*')
          .eq('property_id', propertyId)
          .single();

        if (propertyError) throw propertyError;
        setProperty(propertyData);

        // Fetch offer scenario
        const { data: offerData, error: offerError } = await supabase
          .from('offer_scenarios')
          .select('*')
          .eq('id', offerId)
          .single();

        if (offerError) throw offerError;
        setOfferScenario(offerData);

        // Fetch submission if provided
        if (submissionId) {
          const { data: submissionData, error: submissionError } = await supabase
            .from('submissions')
            .select('id, investment_sentiment, deal_summary, partnership_type')
            .eq('id', submissionId)
            .single();

          if (submissionError) throw submissionError;
          setSubmission(submissionData);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load investment data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [propertyId, offerId, submissionId, supabase]);

  // Generate AI analysis
  const generateAnalysis = async () => {
    if (!property || !offerScenario) return;

    const sentimentToUse = submission?.investment_sentiment || sentimentParam || 'confident';

    setGenerating(true);
    try {
      const response = await fetch('/api/comprehensive-investment-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property,
          offerScenario,
          investment_sentiment: sentimentToUse,
          deal_summary: submission?.deal_summary || '',
        }),
      }).catch(err => {
        console.error('Failed to generate investment analysis:', err);
        throw err;
      });

      if (!response.ok) throw new Error('Failed to generate analysis');

      const analysisData = await response.json();
      
      // Structure the analysis into editable sections
      const sections: AnalysisSection[] = [
        {
          title: 'Executive Summary',
          content: analysisData.executive_summary || '',
          editable: true
        },
        {
          title: 'Property Overview',
          content: analysisData.property_overview || '',
          editable: true
        },
        {
          title: 'Market Analysis',
          content: analysisData.market_analysis || '',
          editable: true
        },
        {
          title: 'Financial Analysis',
          content: analysisData.financial_analysis || '',
          editable: true
        },
        {
          title: 'Investment Strategy',
          content: analysisData.investment_strategy || '',
          editable: true
        },
        {
          title: 'Risk Assessment',
          content: analysisData.risk_assessment || '',
          editable: true
        },
        {
          title: 'Investment Recommendation',
          content: analysisData.recommendation || '',
          editable: true
        }
      ];

      setAnalysisSections(sections);
      
      // Save initial HTML snapshot after DOM updates
      setTimeout(() => {
        saveHtmlSnapshot(sections);
      }, 500);
      
      // Immediately store the sentiment that was used for this analysis
      const usedSentiment = submission?.investment_sentiment || sentimentParam || 'confident';
      localStorage.setItem('lastUsedSentiment', usedSentiment);
      
    } catch (err) {
      console.error('Error generating analysis:', err);
      setError('Failed to generate investment analysis');
    } finally {
      setGenerating(false);
    }
  };

  // Handle section editing
  const handleEditSection = (index: number) => {
    setEditingSection(index);
    setEditContent(analysisSections[index].content);
  };

  const saveHtmlSnapshot = async (sections: typeof analysisSections) => {
    
    try {
      // Get the main content element and clone it
      const contentElement = document.querySelector('.investment-analysis-content');
      
      if (!contentElement) {
        console.error('❌ No content element found with class .investment-analysis-content');
        return;
      }
      
      const clonedElement = contentElement.cloneNode(true) as HTMLElement;
      
      // Remove all edit buttons from the cloned element
      const editButtons = clonedElement.querySelectorAll('[data-edit-button]');
      editButtons.forEach(button => button.remove());
      
      // Also remove any elements with "Edit" text or edit icons
      const elementsWithEdit = clonedElement.querySelectorAll('button, .edit-section, [class*="edit"]');
      elementsWithEdit.forEach(element => {
        if (element.textContent?.includes('Edit') || element.querySelector('[data-lucide="edit"]')) {
          element.remove();
        }
      });
      
      // Add property address to Executive Summary header if we have property info
      if (property) {
        const headers = Array.from(clonedElement.querySelectorAll('h2'));
        const executiveSummaryHeader = headers.find(header => 
          header.textContent?.includes('Executive Summary')
        );
        
        if (executiveSummaryHeader && executiveSummaryHeader.parentNode) {
          const address = `${property.address_street}, ${property.address_city}, ${property.address_state}`;
          const addressElement = document.createElement('p');
          addressElement.className = 'text-sm text-white opacity-90 mt-1 pr-12';
          addressElement.textContent = address;
          executiveSummaryHeader.parentNode.insertBefore(addressElement, executiveSummaryHeader.nextSibling);
        }
      }
      
      // Create the HTML snapshot object
      const htmlSnapshot = {
        html: clonedElement.outerHTML,
        timestamp: new Date().toISOString(),
        sections: sections.map(section => ({
          title: section.title,
          content: section.content
        }))
      };
      
      // If we have a submissionId, save directly to database
      if (submissionId && supabase) {
        
        const { error } = await supabase
          .from('submissions')
          .update({
            investment_analysis_html: htmlSnapshot,
            investment_analysis_html_updated_at: new Date().toISOString()
          })
          .eq('id', submissionId);
        
        if (error) {
          console.error('❌ Error saving HTML snapshot to database:', error);
        }
      } else {
        // No submissionId yet - store in localStorage for later use when submission is created
        localStorage.setItem('investmentAnalysisHtmlSnapshot', JSON.stringify(htmlSnapshot));
      }
    } catch (error) {
      console.error('❌ Error creating HTML snapshot:', error);
    }
  };

  const handleSaveEdit = async () => {
    if (editingSection === null) return;
    
    setSavingEdit(true);
    try {
      // Update the section content
      const updatedSections = [...analysisSections];
      updatedSections[editingSection].content = editContent;
      setAnalysisSections(updatedSections);
      
      // Close modal
      setEditingSection(null);
      setEditContent('');
      
      // Save HTML snapshot after a brief delay to ensure DOM is updated
      setTimeout(() => {
        saveHtmlSnapshot(updatedSections);
      }, 100);
      
    } catch (err) {
      console.error('Error saving edit:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditContent('');
  };

  // Helper function to capitalize sentiment
  const capitalizeSentiment = (sentiment: string) => {
    return sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  };




  if (loading || authLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading investment data...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !property || !offerScenario) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Investment data not found'}</p>
            <button 
              onClick={() => router.back()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => {
                if (!generating) {
                  router.push(`/fund/create?property=${propertyId}&offer=${offerId}`);
                }
              }}
              disabled={generating}
              className={`flex items-center font-medium mb-4 ${
                generating 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-600 hover:text-blue-700 cursor-pointer'
              }`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Investment Analysis</h1>
                <p className="text-gray-600">
                  {property.address_street}, {property.address_city}, {property.address_state}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {analysisSections.length === 0 ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-xl border border-blue-100">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl"></div>
                <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl"></div>
              </div>
              
              <div className="relative p-12 text-center">
                {/* Icon with gradient background */}
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg mx-auto mb-8">
                  <FileText className="h-12 w-12 text-white" />
                </div>
                
                {/* Main heading */}
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Ready to Generate Your
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Investment Analysis</span>
                </h3>
                
                {/* Description */}
                <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
                  This will create a comprehensive investment report tailored to your property and investment goals. 
                  You'll have full editing control throughout the process.
                </p>
                
                
                {/* Property Details Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/30 max-w-md mx-auto">
                  <div className="grid grid-cols-1 gap-3 text-left mb-6">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-600">Investment Sentiment:</span>
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                        {capitalizeSentiment(submission?.investment_sentiment || sentimentParam || 'confident')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-600">Property:</span>
                      <span className="font-semibold text-gray-900 text-right">{property.address_street}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-600">Purchase Price:</span>
                      <span className="font-semibold text-gray-900">${offerScenario.offer_data.purchasePrice?.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Generate Analysis Button */}
                  <button
                    onClick={generateAnalysis}
                    disabled={generating}
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating Analysis...
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5 mr-2" />
                        Generate Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 investment-analysis-content">
              {analysisSections.map((section, index) => {
                // Define colors for each section
                const sectionColors = [
                  'bg-gradient-to-r from-blue-600 to-blue-700', // Executive Summary
                  'bg-gradient-to-r from-blue-600 to-blue-700', // Property Overview
                  'bg-gradient-to-r from-blue-600 to-blue-700', // Market Analysis
                  'bg-gradient-to-r from-blue-600 to-blue-700', // Financial Analysis
                  'bg-gradient-to-r from-blue-600 to-blue-700', // Investment Strategy
                  'bg-gradient-to-r from-blue-600 to-blue-700', // Risk Assessment
                  'bg-gradient-to-r from-blue-600 to-blue-700', // Investment Recommendation
                ];
                
                const sectionColor = sectionColors[index] || 'bg-gradient-to-r from-gray-600 to-gray-700';
                
                return (
                  <div key={index} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className={`${sectionColor} px-8 py-4`}>
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                        {section.editable && (
                          <button
                            data-edit-button
                            onClick={() => handleEditSection(index)}
                            className="inline-flex items-center px-3 py-1 text-sm bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="prose max-w-none">
                        {section.content.split('\n').map((paragraph, pIndex) => (
                          <p key={pIndex} className="mb-4 last:mb-0">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <StandardModalWithActions
          isOpen={editingSection !== null}
          onClose={handleCancelEdit}
          title={`Edit ${analysisSections[editingSection || 0]?.title}`}
          primaryAction={{
            label: savingEdit ? 'Saving...' : 'Save Changes',
            onClick: handleSaveEdit,
            disabled: savingEdit
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: handleCancelEdit
          }}
        >
          <div className="p-6">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-64 border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Edit section content..."
            />
            <p className="text-sm text-gray-500 mt-2">
              Use line breaks to separate paragraphs. Keep content concise and professional.
            </p>
          </div>
        </StandardModalWithActions>

        {/* Loading Modal */}
        <StandardModalWithActions
          isOpen={generating}
          onClose={() => {}} // Prevent closing while generating
          title=""
          showCloseButton={false}
        >
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Generating Your Investment Analysis
            </h3>
            <p className="text-gray-600">
              Be patient. This analysis may take up to 60 seconds to complete.
            </p>
          </div>
        </StandardModalWithActions>
      </div>
    </AuthGuard>
  );
}

export default function InvestmentAnalysisPage() {
  return (
    <Suspense fallback={
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading investment analysis...</p>
          </div>
        </div>
      </AuthGuard>
    }>
      <InvestmentAnalysisContent />
    </Suspense>
  );
}