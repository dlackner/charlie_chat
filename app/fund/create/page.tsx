'use client';

import { useState, useEffect, Suspense } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StandardModalWithActions } from '@/components/shared/StandardModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { generate10YearCashFlowReport } from '@/app/offer-analyzer/cash-flow-report';
import { 
  Building, 
  TrendingUp,
  FileText,
  Plus,
  ArrowLeft
} from 'lucide-react';

interface Property {
  property_id: string;
  address: string;
  city: string;
  state: string;
  units_count: number;
  favorite_status: string;
  year_built?: number;
  estimated_value?: number;
  assessed_value?: number;
}

interface OfferScenario {
  id: string;
  offer_name: string;
  offer_data: {
    purchasePrice?: number;
    projected_irr?: string;
    [key: string]: any;
  };
}

const INVESTMENT_SENTIMENTS = [
  {
    value: 'conservative',
    label: 'Conservative',
    description: 'Data-focused, risk-aware presentation emphasizing thorough due diligence and conservative assumptions. Highlights potential challenges and market risks alongside opportunities.',
    angle: -90, // Far left
    color: '#dbeafe' // blue-100
  },
  {
    value: 'measured',
    label: 'Measured',
    description: 'Balanced analysis presenting both upside potential and downside risks. Professional tone with realistic projections and acknowledgment of market uncertainties.',
    angle: -45, // Left
    color: '#bfdbfe' // blue-200
  },
  {
    value: 'confident',
    label: 'Confident',
    description: 'Strong conviction in the opportunity with solid data backing. Emphasizes competitive advantages and growth potential while maintaining credible assumptions.',
    angle: 0, // Center
    color: '#93c5fd' // blue-300
  },
  {
    value: 'bullish',
    label: 'Bullish',
    description: 'Optimistic presentation focusing on high-growth scenarios and exceptional returns. Emphasizes market tailwinds and property upside with aggressive but achievable projections.',
    angle: 45, // Right
    color: '#60a5fa' // blue-400
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: 'Maximum enthusiasm with bold claims about exceptional returns and limited downside. Heavy emphasis on urgency, scarcity, and transformational opportunity potential.',
    angle: 90, // Far right
    color: '#3b82f6' // blue-500
  }
];

function CreateSubmissionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, supabase, isLoading: authLoading } = useAuth();
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showOfferPrompt, setShowOfferPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedSentiment, setSelectedSentiment] = useState<string>('measured');
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null);

  // Real data states
  const [engagedProperties, setEngagedProperties] = useState<Property[]>([]);
  const [offerScenarios, setOfferScenarios] = useState<Record<string, OfferScenario[]>>({});

  // Restore state from URL parameters on page load
  useEffect(() => {
    const propertyParam = searchParams?.get('property');
    const offerParam = searchParams?.get('offer');
    
    if (propertyParam) {
      setSelectedPropertyId(propertyParam);
      // Fetch offer scenarios for this property
      fetchOfferScenarios(propertyParam);
    }
    
    if (offerParam) {
      setSelectedOfferId(offerParam);
    }
  }, [searchParams]);

  // Fetch engaged/LOI properties
  useEffect(() => {
    const fetchEngagedProperties = async () => {
      try {
        if (!user || !supabase) return;

        console.log('Current user ID:', user.id);

        const { data, error } = await supabase
          .from('user_favorites')
          .select(`
            property_id,
            favorite_status,
            saved_properties (
              address_street,
              address_city,
              address_state,
              units_count,
              year_built,
              estimated_value,
              assessed_value
            )
          `)
          .eq('user_id', user.id)
          .in('favorite_status', ['Engaged', 'LOI Sent']);

        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }

        console.log('Favorites query result:', data);
        console.log('Query was:', {
          table: 'user_favorites',
          user_id: user.id,
          filter: 'favorite_status IN (Engaged, LOI Sent)'
        });

        const formattedProperties: Property[] = data?.map(item => ({
          property_id: item.property_id,
          address: (item.saved_properties as any)?.address_street || '',
          city: (item.saved_properties as any)?.address_city || '',
          state: (item.saved_properties as any)?.address_state || '',
          units_count: (item.saved_properties as any)?.units_count || 0,
          favorite_status: item.favorite_status,
          year_built: (item.saved_properties as any)?.year_built,
          estimated_value: (item.saved_properties as any)?.estimated_value,
          assessed_value: (item.saved_properties as any)?.assessed_value
        })) || [];

        setEngagedProperties(formattedProperties);
      } catch (err) {
        console.error('Error fetching engaged properties:', err);
        setError('Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    fetchEngagedProperties();
  }, [user, supabase]);

  // Fetch offer scenarios for a property
  const fetchOfferScenarios = async (propertyId: string) => {
    try {
      if (!user || !supabase) return;

      setLoadingOffers(true);
      const { data, error } = await supabase
        .from('offer_scenarios')
        .select('id, offer_name, offer_data')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      setOfferScenarios(prev => ({
        ...prev,
        [propertyId]: data || []
      }));
    } catch (err) {
      console.error('Error fetching offer scenarios:', err);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Handle property selection
  const handlePropertySelection = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedOfferId(null);
    setShowOfferPrompt(false); // Reset first
    
    // Fetch offer scenarios for this property
    fetchOfferScenarios(propertyId);
  };

  // Update offer prompt when scenarios change
  useEffect(() => {
    if (selectedPropertyId && !loadingOffers) {
      const hasOffers = offerScenarios[selectedPropertyId] && offerScenarios[selectedPropertyId].length > 0;
      setShowOfferPrompt(!hasOffers);
    }
  }, [selectedPropertyId, offerScenarios, loadingOffers]);

  // Handle 10-Year Cash Flow report generation
  const handleGenerate10YearCashFlow = async () => {
    if (!selectedPropertyId || !selectedOfferId) return;

    try {
      // Get the selected offer scenario data
      const selectedOffer = offerScenarios[selectedPropertyId]?.find(offer => offer.id === selectedOfferId);
      if (!selectedOffer || !selectedOffer.offer_data) {
        alert('No pricing data found for this offer.');
        return;
      }

      const offerData = selectedOffer.offer_data;

      // Get user profile for report branding
      const profileResponse = await fetch('/api/profile');
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const profileData = await profileResponse.json();

      // Get property details
      const selectedProperty = engagedProperties.find(prop => prop.property_id === selectedPropertyId);
      
      // Extract pre-calculated metrics from offer data to ensure consistency
      // Helper function to parse percentage fields (removes % and converts to number)
      const parsePercentage = (value: string | number | undefined) => {
        if (typeof value === 'string') {
          return parseFloat(value.replace('%', ''));
        }
        return typeof value === 'number' ? value : undefined;
      };
      
      const preCalculatedMetrics = {
        cashOnCashReturn: offerData.cash_on_cash_return ? parsePercentage(offerData.cash_on_cash_return) : undefined,
        capRate: offerData.cap_rate_year_1 ? parsePercentage(offerData.cap_rate_year_1) : undefined,
        debtServiceCoverageRatio: offerData.debt_service_coverage_ratio ? parseFloat(offerData.debt_service_coverage_ratio) : undefined,
        expenseRatio: offerData.expense_ratio_year_1 ? parsePercentage(offerData.expense_ratio_year_1) : undefined,
        projectedIRR: offerData.projected_irr ? parsePercentage(offerData.projected_irr) : undefined,
        totalROI: offerData.roi_at_horizon ? parsePercentage(offerData.roi_at_horizon) : undefined,
        projectedEquity: offerData.projected_equity_at_horizon ? parseFloat(offerData.projected_equity_at_horizon) : undefined,
        netOperatingIncome: offerData.net_operating_income ? parseFloat(offerData.net_operating_income) : undefined,
        cashFlowBeforeTax: offerData.cash_flow_before_tax ? parseFloat(offerData.cash_flow_before_tax) : undefined
      };

      // Filter out undefined values
      const validPreCalculatedMetrics = Object.fromEntries(
        Object.entries(preCalculatedMetrics).filter(([_, value]) => value !== undefined)
      );

      // Generate the cash flow report
      await generate10YearCashFlowReport({
        // Property address
        propertyStreet: selectedProperty?.address || 'Property Address',
        propertyCity: selectedProperty?.city || '',
        propertyState: selectedProperty?.state || '',
        
        // Financial parameters from saved offer data
        purchasePrice: typeof offerData.purchasePrice === 'number' ? offerData.purchasePrice : parseFloat(String(offerData.purchasePrice || 0)) || 0,
        downPaymentPercentage: parseFloat(offerData.downPaymentPercentage) || 20,
        interestRate: parseFloat(offerData.interestRate) || 7.0,
        loanStructure: offerData.loanStructure || 'amortizing',
        amortizationPeriodYears: parseInt(offerData.amortizationPeriodYears) || 30,
        interestOnlyPeriodYears: parseInt(offerData.interestOnlyPeriodYears) || 0,
        closingCostsPercentage: parseFloat(offerData.closingCostsPercentage) || 3,
        dispositionCapRate: parseFloat(offerData.dispositionCapRate) || 6,
        
        // Property details
        numUnits: parseInt(offerData.numUnits) || selectedProperty?.units_count || 1,
        avgMonthlyRentPerUnit: parseFloat(offerData.avgMonthlyRentPerUnit) || 0,
        vacancyRate: parseFloat(offerData.vacancyRate) || 5,
        annualRentalGrowthRate: parseFloat(offerData.annualRentalGrowthRate) || 3,
        otherIncomeAnnual: parseFloat(offerData.otherIncomeAnnual) || 0,
        incomeReductionsAnnual: parseFloat(offerData.incomeReductionsAnnual) || 0,
        
        // Operating expenses
        propertyTaxes: parseFloat(offerData.propertyTaxes) || 0,
        insurance: parseFloat(offerData.insurance) || 0,
        propertyManagementFeePercentage: parseFloat(offerData.propertyManagementFeePercentage) || 8,
        maintenanceRepairsAnnual: parseFloat(offerData.maintenanceRepairsAnnual) || 0,
        utilitiesAnnual: parseFloat(offerData.utilitiesAnnual) || 0,
        contractServicesAnnual: parseFloat(offerData.contractServicesAnnual) || 0,
        payrollAnnual: parseFloat(offerData.payrollAnnual) || 0,
        marketingAnnual: parseFloat(offerData.marketingAnnual) || 0,
        gAndAAnnual: parseFloat(offerData.gAndAAnnual) || 0,
        otherExpensesAnnual: parseFloat(offerData.otherExpensesAnnual) || 0,
        expenseGrowthRate: parseFloat(offerData.expenseGrowthRate) || 3,
        
        // Operating expense mode (crucial for matching calculations)
        usePercentageMode: offerData.usePercentageMode || false,
        operatingExpensePercentage: parseFloat(offerData.operatingExpensePercentage) || 0,
        
        // Capital reserves
        capitalReservePerUnitAnnual: parseFloat(offerData.capitalReservePerUnitAnnual) || 300,
        holdingPeriodYears: parseInt(offerData.holdingPeriodYears) || 10,
        
        // Pre-calculated metrics to ensure consistency with offer analyzer
        preCalculatedMetrics: Object.keys(validPreCalculatedMetrics).length > 0 ? validPreCalculatedMetrics : undefined,
        
        // Report branding
        userName: profileData.name || 'User',
        userEmail: profileData.email || '',
        userPhone: profileData.phone || '',
        reportTitle: `${selectedOffer.offer_name} - 10-Year Cash Flow Analysis`
      });

    } catch (error) {
      console.error('Error generating cash flow report:', error);
      alert('Failed to generate cash flow report. Please try again.');
    }
  };

  // Handle submission
  const handleSubmission = async () => {
    if (!selectedPropertyId || !selectedOfferId) return;

    setIsSubmitting(true);
    try {
      if (!user || !supabase) throw new Error('User not authenticated');

      // Get deal summary from modal form
      const dealSummaryElement = document.querySelector('textarea[placeholder*="Describe the investment"]') as HTMLTextAreaElement;
      const dealSummary = dealSummaryElement?.value || '';

      if (!dealSummary.trim()) {
        alert('Please enter a deal summary');
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          property_id: selectedPropertyId,
          offer_scenario_id: selectedOfferId,
          deal_summary: dealSummary,
          partnership_type: 'Limited Partner',
          investment_sentiment: selectedSentiment,
          status: 'active',
          is_public: true
        })
        .select()
        .single();

      if (error) throw error;

      // Generate and upload the 10-year cash flow PDF
      try {
        // Get the selected offer scenario data
        const selectedOffer = offerScenarios[selectedPropertyId]?.find(offer => offer.id === selectedOfferId);
        if (selectedOffer && selectedOffer.offer_data) {
          const offerData = selectedOffer.offer_data;

          // Get user profile for report branding
          const profileResponse = await fetch('/api/profile');
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();

            // Get property details
            const selectedProperty = engagedProperties.find(prop => prop.property_id === selectedPropertyId);
            
            // Extract pre-calculated metrics from offer data to ensure consistency
            const parsePercentage = (value: string | number | undefined) => {
              if (typeof value === 'string') {
                return parseFloat(value.replace('%', ''));
              }
              return typeof value === 'number' ? value : undefined;
            };
            
            const preCalculatedMetrics = {
              cashOnCashReturn: offerData.cash_on_cash_return ? parsePercentage(offerData.cash_on_cash_return) : undefined,
              capRate: offerData.cap_rate_year_1 ? parsePercentage(offerData.cap_rate_year_1) : undefined,
              debtServiceCoverageRatio: offerData.debt_service_coverage_ratio ? parseFloat(offerData.debt_service_coverage_ratio) : undefined,
              expenseRatio: offerData.expense_ratio_year_1 ? parsePercentage(offerData.expense_ratio_year_1) : undefined,
              projectedIRR: offerData.projected_irr ? parsePercentage(offerData.projected_irr) : undefined,
              totalROI: offerData.roi_at_horizon ? parsePercentage(offerData.roi_at_horizon) : undefined,
              projectedEquity: offerData.projected_equity_at_horizon ? parseFloat(offerData.projected_equity_at_horizon) : undefined,
              netOperatingIncome: offerData.net_operating_income ? parseFloat(offerData.net_operating_income) : undefined,
              cashFlowBeforeTax: offerData.cash_flow_before_tax ? parseFloat(offerData.cash_flow_before_tax) : undefined
            };

            // Filter out undefined values
            const validPreCalculatedMetrics = Object.fromEntries(
              Object.entries(preCalculatedMetrics).filter(([_, value]) => value !== undefined)
            );

            // Generate the cash flow report as a blob
            const pdfBlob = await generate10YearCashFlowReport({
              // Property address
              propertyStreet: selectedProperty?.address || 'Property Address',
              propertyCity: selectedProperty?.city || '',
              propertyState: selectedProperty?.state || '',
              
              // Financial parameters from saved offer data
              purchasePrice: typeof offerData.purchasePrice === 'number' ? offerData.purchasePrice : parseFloat(String(offerData.purchasePrice || 0)) || 0,
              downPaymentPercentage: parseFloat(offerData.downPaymentPercentage) || 20,
              interestRate: parseFloat(offerData.interestRate) || 7.0,
              loanStructure: offerData.loanStructure || 'amortizing',
              amortizationPeriodYears: parseInt(offerData.amortizationPeriodYears) || 30,
              interestOnlyPeriodYears: parseInt(offerData.interestOnlyPeriodYears) || 0,
              closingCostsPercentage: parseFloat(offerData.closingCostsPercentage) || 3,
              dispositionCapRate: parseFloat(offerData.dispositionCapRate) || 6,
              
              // Property details
              numUnits: parseInt(offerData.numUnits) || selectedProperty?.units_count || 1,
              avgMonthlyRentPerUnit: parseFloat(offerData.avgMonthlyRentPerUnit) || 0,
              vacancyRate: parseFloat(offerData.vacancyRate) || 5,
              annualRentalGrowthRate: parseFloat(offerData.annualRentalGrowthRate) || 3,
              otherIncomeAnnual: parseFloat(offerData.otherIncomeAnnual) || 0,
              incomeReductionsAnnual: parseFloat(offerData.incomeReductionsAnnual) || 0,
              
              // Operating expenses
              propertyTaxes: parseFloat(offerData.propertyTaxes) || 0,
              insurance: parseFloat(offerData.insurance) || 0,
              propertyManagementFeePercentage: parseFloat(offerData.propertyManagementFeePercentage) || 8,
              maintenanceRepairsAnnual: parseFloat(offerData.maintenanceRepairsAnnual) || 0,
              utilitiesAnnual: parseFloat(offerData.utilitiesAnnual) || 0,
              contractServicesAnnual: parseFloat(offerData.contractServicesAnnual) || 0,
              payrollAnnual: parseFloat(offerData.payrollAnnual) || 0,
              marketingAnnual: parseFloat(offerData.marketingAnnual) || 0,
              gAndAAnnual: parseFloat(offerData.gAndAAnnual) || 0,
              otherExpensesAnnual: parseFloat(offerData.otherExpensesAnnual) || 0,
              expenseGrowthRate: parseFloat(offerData.expenseGrowthRate) || 3,
              
              // Operating expense mode
              usePercentageMode: offerData.usePercentageMode || false,
              operatingExpensePercentage: parseFloat(offerData.operatingExpensePercentage) || 0,
              
              // Capital reserves
              capitalReservePerUnitAnnual: parseFloat(offerData.capitalReservePerUnitAnnual) || 300,
              holdingPeriodYears: parseInt(offerData.holdingPeriodYears) || 10,
              
              // Pre-calculated metrics to ensure consistency with offer analyzer
              preCalculatedMetrics: Object.keys(validPreCalculatedMetrics).length > 0 ? validPreCalculatedMetrics : undefined,
              
              // Report branding
              userName: profileData.name || 'User',
              userEmail: profileData.email || '',
              userPhone: profileData.phone || '',
              reportTitle: `${selectedOffer.offer_name} - 10-Year Cash Flow Analysis`,
              
              // Return blob instead of downloading
              returnBlob: true
            });

            if (pdfBlob) {
              // Upload the PDF to Supabase storage
              const formData = new FormData();
              formData.append('file', pdfBlob as Blob, 'cash-flow-report.pdf');
              formData.append('submissionId', data.id);
              formData.append('fileType', 'cash_flow');

              const uploadResponse = await fetch('/api/submissions/upload-pdf', {
                method: 'POST',
                body: formData
              });

              if (!uploadResponse.ok) {
                console.error('Failed to upload cash flow PDF');
              }
            }
          }
        }
      } catch (pdfError) {
        console.error('Error generating/uploading cash flow PDF:', pdfError);
        // Don't fail the submission if PDF generation fails
      }

      setShowSubmissionModal(false);
      
      // Redirect to browse page with success message
      router.push(`/fund/browse?success=created&id=${data.id}`);
      
    } catch (err) {
      console.error('Error creating submission:', err);
      alert('Failed to create submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get selected property
  const getSelectedProperty = () => {
    return engagedProperties.find(p => p.property_id === selectedPropertyId);
  };

  // Helper function to get selected offer
  const getSelectedOffer = () => {
    if (!selectedPropertyId || !selectedOfferId) return null;
    return offerScenarios[selectedPropertyId]?.find(o => o.id === selectedOfferId);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading || authLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Submission</h1>
            <p className="text-gray-600">
              Share your investment opportunity with potential capital partners
            </p>
          </div>

          {/* Create Submission Form */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            
            {/* Step 1: Property Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Property (Engaged or LOI Sent only)
              </label>
              {engagedProperties.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    No properties with "Engaged" or "LOI Sent" status found. 
                    Please add properties to your favorites and update their status first.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedPropertyId || ''}
                  onChange={(e) => handlePropertySelection(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3"
                >
                  <option value="">Choose a property...</option>
                  {engagedProperties.map(property => (
                    <option key={property.property_id} value={property.property_id}>
                      {property.address}, {property.city}, {property.state} - {property.units_count} units ({property.favorite_status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 2: Offer Scenario Selection */}
            {selectedPropertyId && offerScenarios[selectedPropertyId] && offerScenarios[selectedPropertyId].length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Pricing Scenario
                </label>
                <select
                  value={selectedOfferId || ''}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3"
                >
                  <option value="">Choose a pricing scenario...</option>
                  {offerScenarios[selectedPropertyId].map(offer => (
                    <option key={offer.id} value={offer.id}>
                      {offer.offer_name} - ${((offer.offer_data.purchasePrice || 0) / 1000000).toFixed(2)}M {offer.offer_data.projected_irr ? `(IRR: ${offer.offer_data.projected_irr})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Investment Sentiment Selection */}
            {selectedPropertyId && selectedOfferId && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Investment Presentation Style
                </label>
                <div className="relative bg-white border border-gray-200 rounded-lg p-8">
                  {/* Speedometer SVG */}
                  <div className="flex justify-center mb-4">
                    <svg width="384" height="240" viewBox="0 0 384 240" className="overflow-visible">
                      {/* Speedometer segments */}
                      {INVESTMENT_SENTIMENTS.map((sentiment, index) => {
                        const isSelected = selectedSentiment === sentiment.value;
                        const isHovered = hoveredSentiment === sentiment.value;
                        
                        // Calculate angles for flat-bottom speedometer (180 degrees total, 36 degrees per segment)
                        const startAngle = 180 + (index * 36);
                        const endAngle = startAngle + 36;
                        const startRad = (startAngle * Math.PI) / 180;
                        const endRad = (endAngle * Math.PI) / 180;
                        
                        const centerX = 192;
                        const centerY = 180;
                        const outerRadius = 120;
                        const innerRadius = 48;
                        
                        // Outer arc points
                        const x1Outer = centerX + outerRadius * Math.cos(startRad);
                        const y1Outer = centerY + outerRadius * Math.sin(startRad);
                        const x2Outer = centerX + outerRadius * Math.cos(endRad);
                        const y2Outer = centerY + outerRadius * Math.sin(endRad);
                        
                        // Inner arc points
                        const x1Inner = centerX + innerRadius * Math.cos(startRad);
                        const y1Inner = centerY + innerRadius * Math.sin(startRad);
                        const x2Inner = centerX + innerRadius * Math.cos(endRad);
                        const y2Inner = centerY + innerRadius * Math.sin(endRad);
                        
                        // Path for the segment
                        const pathData = [
                          `M ${x1Inner} ${y1Inner}`,
                          `L ${x1Outer} ${y1Outer}`,
                          `A ${outerRadius} ${outerRadius} 0 0 1 ${x2Outer} ${y2Outer}`,
                          `L ${x2Inner} ${y2Inner}`,
                          `A ${innerRadius} ${innerRadius} 0 0 0 ${x1Inner} ${y1Inner}`,
                          'Z'
                        ].join(' ');
                        
                        let fillColor = sentiment.color;
                        if (isSelected) {
                          fillColor = '#1d4ed8'; // Bright blue when selected
                        } else if (isHovered) {
                          fillColor = '#3b82f6'; // Medium blue when hovered
                        }
                        
                        return (
                          <g key={sentiment.value}>
                            <path
                              d={pathData}
                              fill={fillColor}
                              stroke="white"
                              strokeWidth="2"
                              className="cursor-pointer transition-all duration-200"
                              onClick={() => setSelectedSentiment(sentiment.value)}
                              onMouseEnter={() => setHoveredSentiment(sentiment.value)}
                              onMouseLeave={() => setHoveredSentiment(null)}
                            />
                            
                            {/* Speed marks */}
                            {[1, 2, 3, 4, 5].map((mark) => {
                              const markAngle = startAngle + (mark * 6); // 5 marks per segment
                              const markRad = (markAngle * Math.PI) / 180;
                              const markStartRadius = outerRadius - 10;
                              const markEndRadius = outerRadius;
                              
                              const markX1 = centerX + markStartRadius * Math.cos(markRad);
                              const markY1 = centerY + markStartRadius * Math.sin(markRad);
                              const markX2 = centerX + markEndRadius * Math.cos(markRad);
                              const markY2 = centerY + markEndRadius * Math.sin(markRad);
                              
                              return (
                                <line
                                  key={`mark-${index}-${mark}`}
                                  x1={markX1}
                                  y1={markY1}
                                  x2={markX2}
                                  y2={markY2}
                                  stroke="white"
                                  strokeWidth="1"
                                />
                              );
                            })}
                          </g>
                        );
                      })}
                      
                      {/* Arrow Needle */}
                      {(() => {
                        const currentSentiment = INVESTMENT_SENTIMENTS.find(s => s.value === selectedSentiment);
                        const currentIndex = INVESTMENT_SENTIMENTS.findIndex(s => s.value === selectedSentiment);
                        const needleAngle = 198 + (currentIndex * 36); // Center of selected segment
                        const needleRad = (needleAngle * Math.PI) / 180;
                        const centerX = 192;
                        const centerY = 180;
                        const needleLength = 96;
                        const needleX = centerX + needleLength * Math.cos(needleRad);
                        const needleY = centerY + needleLength * Math.sin(needleRad);
                        
                        // Calculate arrow head points
                        const arrowHeadLength = 18;
                        
                        // Left arrow head point
                        const leftAngle = needleRad - (Math.PI / 6);
                        const leftX = needleX - arrowHeadLength * Math.cos(leftAngle);
                        const leftY = needleY - arrowHeadLength * Math.sin(leftAngle);
                        
                        // Right arrow head point
                        const rightAngle = needleRad + (Math.PI / 6);
                        const rightX = needleX - arrowHeadLength * Math.cos(rightAngle);
                        const rightY = needleY - arrowHeadLength * Math.sin(rightAngle);
                        
                        // Arrow shaft end point (shorter than tip)
                        const shaftLength = needleLength - 10;
                        const shaftX = centerX + shaftLength * Math.cos(needleRad);
                        const shaftY = centerY + shaftLength * Math.sin(needleRad);
                        
                        return (
                          <g className="transition-all duration-500" style={{ transformOrigin: `${centerX}px ${centerY}px` }}>
                            {/* Arrow shaft */}
                            <line
                              x1={centerX}
                              y1={centerY}
                              x2={shaftX}
                              y2={shaftY}
                              stroke="#dc2626"
                              strokeWidth="5"
                              strokeLinecap="round"
                            />
                            
                            {/* Arrow head */}
                            <polygon
                              points={`${needleX},${needleY} ${leftX},${leftY} ${rightX},${rightY}`}
                              fill="#dc2626"
                              stroke="#dc2626"
                              strokeWidth="1"
                              strokeLinejoin="round"
                            />
                            
                            {/* Center hub */}
                            <circle
                              cx={centerX}
                              cy={centerY}
                              r="14"
                              fill="#dc2626"
                              stroke="white"
                              strokeWidth="2"
                            />
                            <circle
                              cx={centerX}
                              cy={centerY}
                              r="7"
                              fill="white"
                            />
                          </g>
                        );
                      })()}
                      
                    </svg>
                  </div>
                  
                  {/* Selected sentiment display */}
                  <div className="text-center">
                    {(() => {
                      const displaySentiment = hoveredSentiment 
                        ? INVESTMENT_SENTIMENTS.find(s => s.value === hoveredSentiment)
                        : INVESTMENT_SENTIMENTS.find(s => s.value === selectedSentiment);
                      
                      return displaySentiment ? (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {displaySentiment.label}
                          </h3>
                          <p className="text-sm text-gray-600 max-w-md mx-auto">
                            {displaySentiment.description}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* No Offers Alert */}
            {showOfferPrompt && selectedPropertyId && (!offerScenarios[selectedPropertyId] || offerScenarios[selectedPropertyId].length === 0) && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Financial Analysis Required</h3>
                    <p className="mt-2 text-sm text-yellow-700">
                      You must create a Financial Analysis prior to submitting your investment. Return to the Engage page, find your property, and create a Financial Analysis. Then return here to complete your submission.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Property Preview - Only show when property AND offer are selected */}
            {selectedPropertyId && selectedOfferId && (
              <>
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Property</h3>
                  {(() => {
                    const property = getSelectedProperty();
                    const offer = getSelectedOffer();
                    return property && offer ? (
                      <div className="flex gap-6">
                        <div className="w-48 h-32 bg-gray-300 rounded-lg flex items-center justify-center">
                          <Building className="h-12 w-12 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{property.address}</h4>
                          <p className="text-gray-600">{property.city}, {property.state}</p>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <span className="text-sm text-gray-500">Units:</span>
                              <span className="ml-2 font-medium">{property.units_count}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Year Built:</span>
                              <span className="ml-2 font-medium">{property.year_built || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Purchase Price:</span>
                              <span className="ml-2 font-medium text-green-600">{formatCurrency(offer.offer_data.purchasePrice || 0)}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Projected IRR:</span>
                              <span className="ml-2 font-medium text-blue-600">{offer.offer_data.projected_irr || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Auto-generated Reports Preview */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <button 
                    onClick={() => router.push(`/fund/property-profile?property=${selectedPropertyId}&offer=${selectedOfferId}&returnUrl=${encodeURIComponent(`/fund/create?property=${selectedPropertyId}&offer=${selectedOfferId}`)}`)}
                    className="bg-purple-50 rounded-lg p-4 text-center hover:bg-purple-100 transition-colors"
                  >
                    <Building className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Property Profile</h4>
                    <p className="text-sm text-gray-600">Detailed property data with images</p>
                  </button>
                  <button 
                    onClick={handleGenerate10YearCashFlow}
                    className="bg-green-50 rounded-lg p-4 text-center hover:bg-green-100 transition-colors"
                  >
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">10-Year Cash Flow</h4>
                    <p className="text-sm text-gray-600">PDF from offer analyzer</p>
                  </button>
                  <button 
                    onClick={() => window.open(`/fund/investment-analysis?property=${selectedPropertyId}&offer=${selectedOfferId}`, '_blank')}
                    className="bg-blue-50 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Investment Analysis</h4>
                    <p className="text-sm text-gray-600">AI-generated comprehensive report</p>
                  </button>
                </div>

                {/* Share Button */}
                <button
                  onClick={() => setShowSubmissionModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Submission
                </button>
              </>
            )}
          </div>
        </div>

        {/* Submission Modal */}
        <StandardModalWithActions
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          title="Create Investment Submission"
          primaryAction={{
            label: isSubmitting ? 'Creating...' : 'Create Submission',
            onClick: handleSubmission,
            disabled: isSubmitting
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setShowSubmissionModal(false)
          }}
        >
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deal Summary
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 resize-none"
                rows={3}
                placeholder="Describe the investment opportunity, key highlights, and what you're looking for in a partner..."
                defaultValue=""
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partnership Type
              </label>
              <select className="w-full border border-gray-300 rounded-lg p-3" defaultValue="Limited Partner">
                <option value="Limited Partner">Limited Partner</option>
              </select>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What will be included:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Property Profile - Complete property details with images and data</li>
                <li>• 10-Year Cash Flow - PDF from your selected offer scenario</li>
                <li>• Investment Analysis - AI-generated comprehensive investment report</li>
              </ul>
            </div>
          </div>
        </StandardModalWithActions>
      </div>
    </AuthGuard>
  );
}

export default function CreateSubmissionPage() {
  return (
    <Suspense fallback={
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading submission form...</p>
          </div>
        </div>
      </AuthGuard>
    }>
      <CreateSubmissionContent />
    </Suspense>
  );
}