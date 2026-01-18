'use client';

import { useState, useEffect, Suspense } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StandardModalWithActions } from '@/components/shared/StandardModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { generate10YearCashFlowReport } from '@/app/offer-analyzer/cash-flow-report';
import { 
  Plus,
  CheckCircle,
  AlertCircle,
  Trash2
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

interface UserSubmission {
  id: string;
  property_id: string;
  deal_summary: string;
  partnership_type: string;
  created_at: string;
  status: string;
  is_public: boolean;
  view_count: number;
  interest_count: number;
  // Property details from join
  address?: string;
  city?: string;
  state?: string;
  units_count?: number;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showOfferPrompt, setShowOfferPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedSentiment, setSelectedSentiment] = useState<string>(() => {
    // Initialize with saved sentiment from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedSentiment') || 'confident';
    }
    return 'confident';
  });
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null);
  
  // New state for submission name, partnership type, and investment thesis
  const [submissionName, setSubmissionName] = useState<string>('');
  const [partnershipType, setPartnershipType] = useState<string>('Limited Partner');
  const [investmentThesis, setInvestmentThesis] = useState<string>('');
  const [analysisGenerated, setAnalysisGenerated] = useState<boolean>(false);
  
  // Submission management state
  const [userSubmissions, setUserSubmissions] = useState<UserSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-submissions' | 'create-new'>('create-new');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [submissionToWithdraw, setSubmissionToWithdraw] = useState<string | null>(null);
  const [showWithdrawSuccessModal, setShowWithdrawSuccessModal] = useState(false);
  const [hasInvestmentAnalysis, setHasInvestmentAnalysis] = useState(false);
  
  // Other Documents modal state
  const [showOtherDocumentsModal, setShowOtherDocumentsModal] = useState(false);
  const [externalFileUrl, setExternalFileUrl] = useState('');

  // Real data states
  const [engagedProperties, setEngagedProperties] = useState<Property[]>([]);
  const [offerScenarios, setOfferScenarios] = useState<Record<string, OfferScenario[]>>({});

  // Restore state from URL parameters on page load
  useEffect(() => {
    const propertyParam = searchParams?.get('property');
    const offerParam = searchParams?.get('offer');
    const sentimentParam = searchParams?.get('sentiment');
    
    if (propertyParam) {
      setSelectedPropertyId(propertyParam);
      // Fetch offer scenarios for this property
      fetchOfferScenarios(propertyParam);
    }
    
    if (offerParam) {
      setSelectedOfferId(offerParam);
    }
    
    // Restore sentiment - prioritize localStorage over URL param to maintain user's selection
    const savedSentiment = localStorage.getItem('selectedSentiment');
    const sentimentToRestore = savedSentiment || sentimentParam || localStorage.getItem('lastUsedSentiment') || 'confident';
    if (sentimentToRestore && INVESTMENT_SENTIMENTS.some(s => s.value === sentimentToRestore)) {
      setSelectedSentiment(sentimentToRestore);
    }
    
    // Check if we have saved form data (for restoration after analysis generation)
    const savedFormData = localStorage.getItem('createSubmissionFormData');
    
    if (!propertyParam && !offerParam && !sentimentParam) {
      // No URL params - this is a fresh start, clear everything
      localStorage.removeItem('investmentAnalysisHtmlSnapshot');
      localStorage.removeItem('investmentAnalysisPdf');
      localStorage.removeItem('selectedSentiment');
      localStorage.removeItem('lastUsedSentiment');
      localStorage.removeItem('createSubmissionFormData');
      
      // Reset all form states for fresh submission
      setSelectedPropertyId(null);
      setSelectedOfferId(null);
      setSelectedSentiment('confident');
      setSubmissionName('');
      setInvestmentThesis('');
      setAnalysisGenerated(false);
      setShowOfferPrompt(false);
    } else if (propertyParam && offerParam && savedFormData) {
      // Coming back from analysis generation with URL params and saved data - restore form data
      try {
        const formData = JSON.parse(savedFormData);
        setSubmissionName(formData.submissionName || '');
        setPartnershipType(formData.partnershipType || 'Limited Partner');
        setInvestmentThesis(formData.investmentThesis || '');
        // Property and offer will be set by URL params above
        
        // Check if analysis exists
        const analysisExists = localStorage.getItem('investmentAnalysisHtmlSnapshot') !== null;
        setAnalysisGenerated(analysisExists);
      } catch (error) {
        console.error('Error restoring form data:', error);
        setAnalysisGenerated(false);
      }
    } else {
      // Using URL params but no saved form data - check for existing analysis
      const analysisExists = localStorage.getItem('investmentAnalysisHtmlSnapshot') !== null;
      setAnalysisGenerated(analysisExists);
    }
  }, [searchParams]);

  // Save sentiment to localStorage whenever it changes
  useEffect(() => {
    if (selectedSentiment) {
      localStorage.setItem('selectedSentiment', selectedSentiment);
    }
  }, [selectedSentiment]);

  // Save form data whenever key values change
  useEffect(() => {
    if (submissionName || investmentThesis || selectedPropertyId || selectedOfferId) {
      const formData = {
        submissionName,
        partnershipType,
        investmentThesis,
        selectedPropertyId,
        selectedOfferId,
        selectedSentiment
      };
      localStorage.setItem('createSubmissionFormData', JSON.stringify(formData));
    }
  }, [submissionName, partnershipType, investmentThesis, selectedPropertyId, selectedOfferId, selectedSentiment]);

  // Check for analysis generation when returning to page
  useEffect(() => {
    const checkAnalysisStatus = () => {
      const analysisExists = localStorage.getItem('investmentAnalysisHtmlSnapshot') !== null;
      setAnalysisGenerated(analysisExists);
    };

    // Check immediately
    checkAnalysisStatus();

    // Also check when window focus returns (user comes back from analysis page)
    const handleFocus = () => {
      checkAnalysisStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Fetch engaged/LOI properties
  useEffect(() => {
    const fetchEngagedProperties = async () => {
      try {
        if (!user || !supabase) return;


        const { data, error } = await supabase
          .from('user_favorites')
          .select(`
            property_id,
            favorite_status,
            saved_properties (
              address_full,
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
          .in('favorite_status', ['Engaged', 'LOI Sent', 'Analyzing']);

        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }


        const formattedProperties: Property[] = data?.map(item => ({
          property_id: item.property_id,
          address: (item.saved_properties as any)?.address_full || (item.saved_properties as any)?.address_street || '',
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

  // Fetch user submissions when My Submissions tab is selected
  useEffect(() => {
    if (activeTab === 'my-submissions' && userSubmissions.length === 0) {
      fetchUserSubmissions();
    }
  }, [activeTab]);

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

  // Fetch user submissions
  const fetchUserSubmissions = async () => {
    if (!supabase || !user) return;
    
    setSubmissionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          property_id,
          deal_summary,
          partnership_type,
          created_at,
          status,
          is_public,
          view_count,
          interest_count,
          saved_properties (
            address_street,
            address_full,
            address_city,
            address_state,
            units_count
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format the submissions data
      const formattedSubmissions: UserSubmission[] = (data || []).map((item: any) => ({
        id: item.id,
        property_id: item.property_id,
        deal_summary: item.deal_summary,
        partnership_type: item.partnership_type,
        created_at: item.created_at,
        status: item.status,
        is_public: item.is_public,
        view_count: item.view_count,
        interest_count: item.interest_count,
        address: Array.isArray(item.saved_properties) ? 
          (item.saved_properties[0]?.address_street || item.saved_properties[0]?.address_full) : 
          (item.saved_properties?.address_street || item.saved_properties?.address_full),
        city: Array.isArray(item.saved_properties) ? item.saved_properties[0]?.address_city : item.saved_properties?.address_city,
        state: Array.isArray(item.saved_properties) ? item.saved_properties[0]?.address_state : item.saved_properties?.address_state,
        units_count: Array.isArray(item.saved_properties) ? item.saved_properties[0]?.units_count : item.saved_properties?.units_count
      }));

      setUserSubmissions(formattedSubmissions);
    } catch (err) {
      console.error('Error fetching user submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Handle withdrawing a submission
  const handleWithdrawSubmission = (submissionId: string) => {
    setSubmissionToWithdraw(submissionId);
    setShowWithdrawModal(true);
  };

  // Confirm withdrawal
  const confirmWithdrawSubmission = async () => {
    if (!supabase || !user || !submissionToWithdraw) return;

    try {
      console.log('Attempting to withdraw submission:', submissionToWithdraw, 'for user:', user.id);
      
      const { data, error } = await supabase
        .from('submissions')
        .update({ 
          status: 'archived',
          is_public: false 
        })
        .eq('id', submissionToWithdraw)
        .eq('user_id', user.id);

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      // Remove from local state
      setUserSubmissions(prev => prev.filter(sub => sub.id !== submissionToWithdraw));
      
      setShowWithdrawModal(false);
      setSubmissionToWithdraw(null);
      setShowWithdrawSuccessModal(true);
    } catch (err) {
      console.error('Error withdrawing submission:', err);
      alert(`Failed to withdraw submission: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
    }
  };

  // Handle submission
  const handleSubmission = async () => {
    if (!selectedPropertyId || !selectedOfferId || !submissionName.trim() || !investmentThesis.trim()) {
      alert('Please complete all steps before creating your submission');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user || !supabase) throw new Error('User not authenticated');

      
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          property_id: selectedPropertyId,
          offer_scenario_id: selectedOfferId,
          deal_summary: investmentThesis,
          partnership_type: partnershipType,
          investment_sentiment: selectedSentiment,
          submission_name: submissionName,
          external_file_url: externalFileUrl.trim() || null,
          status: 'active',
          is_public: true
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase submission creation error:', error);
        throw error;
      }

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
                const errorText = await uploadResponse.text();
                console.error('Failed to upload cash flow PDF:', uploadResponse.status, errorText);
                // Continue anyway - don't fail the submission
              }
            }
          }
        }
      } catch (pdfError) {
        console.error('Error generating/uploading cash flow PDF:', pdfError);
        // Don't fail the submission if PDF generation fails
      }

      // Clean up localStorage after submission creation
      localStorage.removeItem('investmentAnalysisPdf');
      localStorage.removeItem('investmentAnalysisPdfData');
      localStorage.removeItem('lastUsedSentiment');

      // Save HTML snapshot if it exists in localStorage
      try {
        const htmlSnapshotData = localStorage.getItem('investmentAnalysisHtmlSnapshot');
        
        
        if (htmlSnapshotData) {
          const htmlSnapshot = JSON.parse(htmlSnapshotData);
          
          
          const { error: htmlError } = await supabase
            .from('submissions')
            .update({
              investment_analysis_html: htmlSnapshot,
              investment_analysis_html_updated_at: new Date().toISOString()
            })
            .eq('id', data.id);
          
          if (htmlError) {
            console.error('❌ Error saving HTML snapshot to database:', htmlError);
          } else {
            // Clean up localStorage
            localStorage.removeItem('investmentAnalysisHtmlSnapshot');
          }
        }
      } catch (htmlError) {
        console.error('💥 Error saving HTML snapshot:', htmlError);
        // Don't fail the submission if HTML snapshot saving fails
      }

      // Clear saved form data after successful submission
      localStorage.removeItem('createSubmissionFormData');
      localStorage.removeItem('investmentAnalysisHtmlSnapshot');
      localStorage.removeItem('selectedSentiment');
      localStorage.removeItem('lastUsedSentiment');
      
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Submissions</h1>
            <p className="text-gray-600">
              Manage your existing submissions and create new investment opportunities
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('my-submissions')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'my-submissions'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Submissions {userSubmissions.length > 0 && `(${userSubmissions.length})`}
                </button>
                <button
                  onClick={() => setActiveTab('create-new')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'create-new'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Create New
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === 'my-submissions' ? (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Active Submissions</h2>
                  {submissionsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading submissions...</p>
                    </div>
                  ) : userSubmissions.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">You have no active submissions yet.</p>
                      <button
                        onClick={() => setActiveTab('create-new')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create Your First Submission
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {userSubmissions.map((submission) => (
                        <div key={submission.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {submission.address}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {submission.city}, {submission.state} • {submission.units_count} units
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <button
                                    onClick={() => router.push(`/fund/browse/${submission.id}?source=manage`)}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Details"
                                  >
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => handleWithdrawSubmission(submission.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Withdraw Submission"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                                <div>
                                  <span className="font-medium">Partnership:</span> {submission.partnership_type}
                                </div>
                                <div>
                                  <span className="font-medium">Created:</span> {new Date(submission.created_at).toLocaleDateString()}
                                </div>
                                <div>
                                  <span className="font-medium">Views:</span> {submission.view_count}
                                </div>
                                <div>
                                  <span className="font-medium">Interest:</span> {submission.interest_count}
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-3">
                                {submission.deal_summary}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
            {/* Step 1: Investment Overview */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Investment Overview</h3>
              <p className="text-gray-600 mb-6">Name your submission and describe your investment thesis</p>
              
              <div className="space-y-6">
                {/* Submission Name */}
                <div>
                  <label htmlFor="submissionName" className="block text-sm font-medium text-gray-700 mb-2">
                    Submission Name
                  </label>
                  <input
                    type="text"
                    id="submissionName"
                    value={submissionName}
                    onChange={(e) => setSubmissionName(e.target.value)}
                    placeholder="e.g., Downtown Multifamily Opportunity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Partnership Type */}
                <div>
                  <label htmlFor="partnershipType" className="block text-sm font-medium text-gray-700 mb-2">
                    Partnership Type
                  </label>
                  <select
                    id="partnershipType"
                    value={partnershipType}
                    onChange={(e) => setPartnershipType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="506(b)">506(b)</option>
                    <option value="506(c)">506(c)</option>
                    <option value="Capital Club">Capital Club</option>
                    <option value="Crowd Funding">Crowd Funding</option>
                    <option value="Limited Partner">Limited Partner</option>
                    <option value="Private Equity">Private Equity</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    Select the type of partnership structure for this investment opportunity.
                  </p>
                </div>
                
                {/* Investment Thesis */}
                <div>
                  <label htmlFor="investmentThesis" className="block text-sm font-medium text-gray-700 mb-2">
                    Investment Thesis
                  </label>
                  <textarea
                    id="investmentThesis"
                    value={investmentThesis}
                    onChange={(e) => setInvestmentThesis(e.target.value)}
                    placeholder="Describe the investment opportunity, key highlights, and what you're looking for in a partner..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[150px]"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    This will be shared with the Capital Club as part of your submission. The text box will expand as you type.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Property Selection */}
            {submissionName.trim() && investmentThesis.trim() && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Select a Property for Funding</h3>
                <p className="text-gray-600 mb-6">Choose from properties with a pipeline status of <strong>Analyzing</strong>, <strong>LOI Sent</strong>, or <strong>Engaged</strong>.</p>
              </div>
            )}
              
            {submissionName.trim() && investmentThesis.trim() && (
            <div className="mb-6">
              {engagedProperties.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    No properties with "Engaged" or "LOI Sent" status found. 
                    Please add properties to your favorites and update their status first.
                  </p>
                </div>
              ) : (
                <select
                  size={8}
                  value={selectedPropertyId || ''}
                  onChange={(e) => handlePropertySelection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{
                    fontSize: '14px',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  <option value="" style={{ padding: '4px 2px' }}>Choose a property...</option>
                  {engagedProperties.map(property => (
                    <option 
                      key={property.property_id} 
                      value={property.property_id}
                      style={{ padding: '4px 2px' }}
                    >
                      {property.address} • {property.city}, {property.state} • {property.units_count} units • {property.favorite_status}
                    </option>
                  ))}
                </select>
              )}
            </div>
            )}

            {/* Step 3: Offer Scenario Selection */}
            {selectedPropertyId && (
              <>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 3: Select a Pricing Scenario</h3>
                  <p className="text-gray-600 mb-6">A Pricing Scenario is required for a submission</p>
                </div>
                
                {offerScenarios[selectedPropertyId] && offerScenarios[selectedPropertyId].length > 0 ? (
                  <div className="mb-6">
                    <select
                      value={selectedOfferId || ''}
                      onChange={(e) => setSelectedOfferId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3"
                    >
                      <option value="">Choose a pricing scenario...</option>
                      {offerScenarios[selectedPropertyId].map(offer => (
                        <option key={offer.id} value={offer.id}>
                          {offer.offer_name} - ${Math.round((offer.offer_data.purchasePrice || 0) / 1000000)}M {offer.offer_data.projected_irr ? `(IRR: ${offer.offer_data.projected_irr})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      No pricing scenarios found for this property. Please create an offer scenario first.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Selected Property Confirmation - shown after Steps 1 & 2 */}
            {selectedPropertyId && selectedOfferId && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Property</h3>
                {(() => {
                  const property = getSelectedProperty();
                  const offer = getSelectedOffer();
                  return property && offer ? (
                    <div className="flex gap-6">
                      <div className="w-48 h-32 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={`https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(property.address + ', ' + property.city + ', ' + property.state)}&heading=0&pitch=0&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                          alt={`Street view of ${property.address}`}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              `;
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">{property.address}</h4>
                            <p className="text-gray-600">{property.city}, {property.state}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-sm text-gray-500">Units:</span>
                            <span className="ml-2 font-medium text-gray-900">{property.units_count}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Year Built:</span>
                            <span className="ml-2 font-medium text-gray-900">{property.year_built || 'N/A'}</span>
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
            )}

            {/* Investment Sentiment Selection */}
            {selectedPropertyId && selectedOfferId && (
              <>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 4: Investment Presentation Style</h3>
                  <p className="text-gray-600 mb-6">Your presentation style will be reflected in the AI-generated Investment Analysis</p>
                </div>
                
                <div className="mb-6">
                <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-gray-200 rounded-lg p-8 shadow-sm">
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
                          <h3 className="text-xl font-bold text-blue-700 mb-3">
                            {displaySentiment.label}
                          </h3>
                          <p className="text-base text-gray-700 max-w-lg mx-auto leading-relaxed">
                            {displaySentiment.description}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
              </>
            )}

            {/* Step 4: Generate AI Investment Analysis */}
            {selectedPropertyId && selectedOfferId && selectedSentiment && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 5: Generate AI Investment Analysis</h3>
                <p className="text-gray-600 mb-6">You will have the opportunity to edit the analysis before submission</p>
                
                <button
                  onClick={() => {
                    const selectedProperty = engagedProperties.find(p => p.property_id === selectedPropertyId);
                    const selectedOffer = offerScenarios[selectedPropertyId]?.find(o => o.id === selectedOfferId);
                    if (selectedProperty && selectedOffer) {
                      router.push(`/fund/investment-analysis?property=${selectedPropertyId}&offer=${selectedOfferId}&sentiment=${selectedSentiment}`);
                    }
                  }}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
                >
                  Generate Investment Analysis
                </button>
              </div>
            )}

            {/* No Offers Alert */}
            {showOfferPrompt && selectedPropertyId && !loadingOffers && (!offerScenarios[selectedPropertyId] || offerScenarios[selectedPropertyId].length === 0) && (
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

            {/* Step 5: Review Attachments */}
            {selectedPropertyId && selectedOfferId && (
              <>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 6: Review Attachments</h3>
                  <p className="text-gray-600 mb-6">Your submission will include these reports and analyses</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <button 
                    onClick={() => router.push(`/fund/property-profile?property=${selectedPropertyId}&offer=${selectedOfferId}&returnUrl=${encodeURIComponent(`/fund/create?property=${selectedPropertyId}&offer=${selectedOfferId}&sentiment=${selectedSentiment}`)}`)}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="border-l-4 border-purple-500 pl-4">
                      <div className="text-lg font-bold text-gray-900">Property Profile</div>
                    </div>
                  </button>
                  
                  <button 
                    onClick={handleGenerate10YearCashFlow}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="border-l-4 border-green-500 pl-4">
                      <div className="text-lg font-bold text-gray-900">Cash Flow</div>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => router.push(`/fund/pricing-scenario-view/${selectedOfferId}`)}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="border-l-4 border-orange-500 pl-4">
                      <div className="text-lg font-bold text-gray-900">Pricing Scenario</div>
                    </div>
                  </button>

                  {analysisGenerated && (
                    <button 
                      onClick={() => {
                        // Always navigate to the investment analysis page, but it will handle showing existing vs generating new
                        router.push(`/fund/investment-analysis?property=${selectedPropertyId}&offer=${selectedOfferId}&sentiment=${selectedSentiment}&returnUrl=${encodeURIComponent(`/fund/create?property=${selectedPropertyId}&offer=${selectedOfferId}&sentiment=${selectedSentiment}`)}`);
                      }}
                      className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
                    >
                      <div className="border-l-4 border-blue-500 pl-4">
                        <div className="text-lg font-bold text-gray-900">Investment Analysis</div>
                      </div>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => setShowOtherDocumentsModal(true)}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="border-l-4 border-teal-500 pl-4">
                      <div className="text-lg font-bold text-gray-900">Other Files</div>
                      {externalFileUrl && (
                        <div className="text-sm text-green-600 mt-1">✓ Link added</div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Create Submission Button */}
                <button
                  onClick={handleSubmission}
                  disabled={isSubmitting || !submissionName.trim() || !investmentThesis.trim() || !selectedPropertyId || !selectedOfferId || !analysisGenerated}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {isSubmitting ? 'Creating...' : 'Create Submission'}
                </button>
              </>
            )}
                </div>
              )}
            </div>
          </div>

        {/* Withdraw Submission Modal */}
        <StandardModalWithActions
          isOpen={showWithdrawModal}
          onClose={() => {
            setShowWithdrawModal(false);
            setSubmissionToWithdraw(null);
          }}
          title="Withdraw Submission"
          primaryAction={{
            label: 'Withdraw',
            onClick: confirmWithdrawSubmission,
            disabled: false
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => {
              setShowWithdrawModal(false);
              setSubmissionToWithdraw(null);
            }
          }}
        >
          <div className="p-6">
            <p className="text-gray-700 mb-2">
              Are you sure you want to withdraw this submission?
            </p>
            <p className="text-gray-600 text-sm">
              This action cannot be undone.
            </p>
          </div>
        </StandardModalWithActions>

        {/* Withdraw Success Modal */}
        <StandardModalWithActions
          isOpen={showWithdrawSuccessModal}
          onClose={() => setShowWithdrawSuccessModal(false)}
          title="Submission Withdrawn"
          primaryAction={{
            label: 'OK',
            onClick: () => setShowWithdrawSuccessModal(false),
            disabled: false
          }}
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-gray-700">
                  Submission withdrawn successfully.
                </p>
              </div>
            </div>
          </div>
        </StandardModalWithActions>

        {/* Other Documents Modal */}
        <StandardModalWithActions
          isOpen={showOtherDocumentsModal}
          onClose={() => setShowOtherDocumentsModal(false)}
          title="Other Files"
          primaryAction={{
            label: 'Save',
            onClick: () => {
              setShowOtherDocumentsModal(false);
            },
            disabled: false
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => {
              setShowOtherDocumentsModal(false);
            }
          }}
        >
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              Add a link to external files such as Dropbox folders, Google Drive files, or other relevant resources.
            </p>
            
            <label htmlFor="external-file-url" className="block text-sm font-medium text-gray-700 mb-2">
              Document Link (Optional)
            </label>
            <input
              id="external-file-url"
              type="url"
              value={externalFileUrl}
              onChange={(e) => setExternalFileUrl(e.target.value)}
              placeholder="https://dropbox.com/... or https://drive.google.com/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <p className="text-xs text-gray-500 mt-2">
              Examples: Dropbox links, Google Drive folders, OneDrive files, etc.
            </p>
          </div>
        </StandardModalWithActions>

        </div>
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