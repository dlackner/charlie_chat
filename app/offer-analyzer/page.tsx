'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GradeMetrics, MultifamilyMarketBenchmarks, PropertyCharacteristics, MultifamilyGradeMetrics, MULTIFAMILY_BENCHMARKS, detectAssetClass, detectMarketTier, calculateMultifamilyGrade } from './grading-system';
// Removed PropertySummaryButton - analysis now handled on property details page
import { useAuth } from '@/contexts/AuthContext';
import { useOfferAnalyzerAccess } from './usePropertyAnalyzerAccess';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { CharlieTooltip } from './CharlieTooltip';
import { SaveOfferModal } from '@/components/shared/SaveOfferModal';
import AlertModal, { useAlert } from '@/components/shared/AlertModal';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ArrowLeft } from 'lucide-react';

// Define the structure for data points in the chart
interface ChartDataPoint {
  year: number;
  cumulativeCashFlow: number;
  noi: number;
  cashFlowBeforeTax: number;
}

// Helper function to calculate IRR using Newton's method
const calculateIRR = (cashFlows: number[], guess: number = 0.1): number => {
  // Defensive check: Ensure cashFlows is a valid, non-empty array
  if (!Array.isArray(cashFlows) || cashFlows.length === 0) {
    console.error("calculateIRR received an invalid or empty cashFlows array:", cashFlows);
    return 0; // Return a default of 0 if input is invalid
  }
  // If only initial investment is present, IRR is not meaningful in standard calculation
  // Or if all cash flows are 0 after initial investment
  if (cashFlows.length === 1 && cashFlows[0] < 0) {
    return 0;
  }

  const npv = (rate: number) => {
    let sum = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      sum += cashFlows[i] / Math.pow(1 + rate, i);
    }
    return sum;
  };

  const derivativeNpv = (rate: number): number => {
    let sum = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      sum -= i * cashFlows[i] / Math.pow(1 + rate, i + 1);
    }
    return sum;
  };

  let irr = guess;
  const maxIterations = 100;
  const tolerance = 0.0001;
  for (let i = 0; i < maxIterations; i++) {
    const nextIrr = irr - npv(irr) / derivativeNpv(irr);
    if (Math.abs(nextIrr - irr) < tolerance) {
      return nextIrr;
    }
    irr = nextIrr;
  }
  return irr; // Return the last approximation if not converged
};

// Component to handle search params
function SearchParamsHandler({ onParamsLoaded }: { onParamsLoaded: (params: { street: string; city: string; state: string; id?: string; offerId?: string; submissionId?: string; variationId?: string; readOnly?: boolean; source?: string }) => void }) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    onParamsLoaded({
      street: searchParams.get('street') || searchParams.get('address') || '',
      city: searchParams.get('city') || '',
      state: searchParams.get('state') || '',
      id: searchParams.get('id') || undefined,
      offerId: searchParams.get('offerId') || undefined,
      submissionId: searchParams.get('submissionId') || undefined,
      variationId: searchParams.get('variationId') || undefined,
      readOnly: searchParams.get('readOnly') === 'true',
      source: searchParams.get('source') || undefined
    });
  }, [searchParams, onParamsLoaded]);
  
  return null;
}

export default function OfferAnalyzerPage() {
  // Get user authentication and access control
  const { user: currentUser } = useAuth();
  const { userClass, hasAccess: hasOfferAnalyzerAccess, isLoading: isLoadingAccess } = useOfferAnalyzerAccess();
  const router = useRouter();
  const { showDelete, showError, AlertComponent } = useAlert();

  // Redirect disabled users to pricing page
  useEffect(() => {
    if (!isLoadingAccess && !hasOfferAnalyzerAccess && userClass === 'disabled') {
      router.replace('/pricing');
    }
  }, [isLoadingAccess, hasOfferAnalyzerAccess, userClass, router]);

  // --- Modal State ---
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const allowLeavingRef = useRef(false);
  
  // --- Offer Management Modals ---
  const [showSaveOfferModal, setShowSaveOfferModal] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [pendingOfferData, setPendingOfferData] = useState<{ name: string; description: string } | null>(null);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [selectedPropertyOffers, setSelectedPropertyOffers] = useState<any[]>([]);
  const [loadedOfferName, setLoadedOfferName] = useState<string>('');

  // --- Property Address State (from URL params, not displayed in UI) ---
  const [propertyStreet, setPropertyStreet] = useState<string>('');
  const [propertyCity, setPropertyCity] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [propertyState, setPropertyState] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string>('');
  const [variationId, setVariationId] = useState<string>('');
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [source, setSource] = useState<string>('');
  
  // Callback to handle search params
  const handleParamsLoaded = useCallback(async (params: { street: string; city: string; state: string; id?: string; offerId?: string; submissionId?: string; variationId?: string; readOnly?: boolean; source?: string }) => {
    setPropertyStreet(params.street);
    setPropertyCity(params.city);
    setPropertyState(params.state);
    if (params.submissionId) {
      setSubmissionId(params.submissionId);
    }
    if (params.variationId) {
      setVariationId(params.variationId);
    }
    if (params.id) {
      setPropertyId(params.id);
    }
    if (params.readOnly) {
      setIsReadOnly(params.readOnly);
    }

    // Handle loading pricing variation by ID
    if (params.variationId) {
      try {
        console.log('Loading pricing variation with ID:', params.variationId);
        const response = await fetch(`/api/pricing-variations/${params.variationId}`);
        if (response.ok) {
          const data = await response.json();
          const scenarioData = data.variation.scenario_data;
          console.log('Loading scenario data:', scenarioData);
          
          // Load all the scenario data into the analyzer state using the complete loader
          loadOfferData(scenarioData);
          
          console.log('Scenario data loaded successfully');
        } else {
          console.error('Failed to load pricing variation');
        }
      } catch (error) {
        console.error('Error loading pricing variation:', error);
      }
    }
    
    // If offerId is provided, load the saved offer scenario
    if (params.offerId) {
      try {
        const response = await fetch(`/api/offer-scenarios/${params.offerId}`);
        if (response.ok) {
          const data = await response.json();
          const offerData = data.scenario.offer_data;
          
          // Set the loaded analysis name for display
          setLoadedOfferName(data.scenario.offer_name || `Analysis ${params.offerId}`);
          
          // Load all the saved values into the form fields
          if (offerData) {
            setPurchasePrice(parseFloat(offerData.purchasePrice) || 0);
            setDownPaymentPercentage(parseFloat(offerData.downPaymentPercentage) || 20);
            setInterestRate(parseFloat(offerData.interestRate) || 7.0);
            setAmortizationPeriodYears(parseInt(offerData.amortizationPeriodYears) || 30);
            setClosingCostsPercentage(parseFloat(offerData.closingCostsPercentage) || 3);
            
            setNumUnits(parseInt(offerData.numUnits) || 0);
            setAvgMonthlyRentPerUnit(parseFloat(offerData.avgMonthlyRentPerUnit) || 0);
            setVacancyRate(parseFloat(offerData.vacancyRate) || 10);
            setAnnualRentalGrowthRate(parseFloat(offerData.annualRentalGrowthRate) || 2);
            setOtherIncomeAnnual(parseFloat(offerData.otherIncomeAnnual) || 0);
            setIncomeReductionsAnnual(parseFloat(offerData.incomeReductionsAnnual) || 0);
            
            setPropertyTaxes(parseFloat(offerData.propertyTaxes) || 0);
            setInsurance(parseFloat(offerData.insurance) || 0);
            setPropertyManagementFeePercentage(parseFloat(offerData.propertyManagementFeePercentage) || 6);
            setMaintenanceRepairsAnnual(parseFloat(offerData.maintenanceRepairsAnnual) || 0);
            setUtilitiesAnnual(parseFloat(offerData.utilitiesAnnual) || 0);
            setContractServicesAnnual(parseFloat(offerData.contractServicesAnnual) || 0);
            
            setInterestOnlyPeriodYears(parseInt(offerData.interestOnlyPeriodYears) || 10);
            setRefinanceTermYears(parseInt(offerData.refinanceTermYears) || 25);
            setDispositionCapRate(parseFloat(offerData.dispositionCapRate) || 6);
          }
        }
      } catch (error) {
        console.error('Error loading saved offer:', error);
      }
    }
    
    // Set the source for back navigation
    if (params.source) {
      setSource(params.source);
    }
  }, []);

  // --- Input States: FINANCING ---
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [downPaymentPercentage, setDownPaymentPercentage] = useState<number>(0); // Percentage
  const [interestRate, setInterestRate] = useState<number>(0); // Percentage
  const [loanStructure, setLoanStructure] = useState<'amortizing' | 'interest-only'>('amortizing'); // New loan structure selection
  const [amortizationPeriodYears, setAmortizationPeriodYears] = useState<number>(0); // Years (updated from 24 to 30)
  const [interestOnlyPeriodYears, setInterestOnlyPeriodYears] = useState<number>(0); // Years for IO period
  const [refinanceTermYears, setRefinanceTermYears] = useState<number>(0); // Years (0 means sale)
  const [closingCostsPercentage, setClosingCostsPercentage] = useState<number>(0); // Percentage of Purchase Price
  const [dispositionCapRate, setDispositionCapRate] = useState<number>(0); // Target cap rate at sale

  // --- Input States: RENTS ---
  const [numUnits, setNumUnits] = useState<number>(0);
  const [avgMonthlyRentPerUnit, setAvgMonthlyRentPerUnit] = useState<number>(0);
  const [vacancyRate, setVacancyRate] = useState<number>(0); // Percentage
  const [annualRentalGrowthRate, setAnnualRentalGrowthRate] = useState<number>(0); // Percentage
  const [otherIncomeAnnual, setOtherIncomeAnnual] = useState<number>(0); // New State for Other Income
  const [incomeReductionsAnnual, setIncomeReductionsAnnual] = useState<number>(0); // New State for Income Reductions

  // --- Input States: OPERATING EXPENSES (ANNUAL) ---
  const [propertyTaxes, setPropertyTaxes] = useState<number>(0);
  const [insurance, setInsurance] = useState<number>(0);
  const [propertyManagementFeePercentage, setPropertyManagementFeePercentage] = useState<number>(0); // Percentage of EGI
  const [maintenanceRepairsAnnual, setMaintenanceRepairsAnnual] = useState<number>(0); // Total annual
  const [utilitiesAnnual, setUtilitiesAnnual] = useState<number>(0); // Total annual
  const [contractServicesAnnual, setContractServicesAnnual] = useState<number>(0); // New expense
  const [payrollAnnual, setPayrollAnnual] = useState<number>(0); // New expense
  const [marketingAnnual, setMarketingAnnual] = useState<number>(0); // New expense
  const [gAndAAnnual, setGAndAAnnual] = useState<number>(0); // New expense
  const [otherExpensesAnnual, setOtherExpensesAnnual] = useState<number>(0); // Total annual
  const [expenseGrowthRate, setExpenseGrowthRate] = useState<number>(0); // Percentage

  // --- Operating Expenses Toggle States ---
  const [usePercentageMode, setUsePercentageMode] = useState<boolean>(false);
  const [operatingExpensePercentage, setOperatingExpensePercentage] = useState<number>(0);

  // --- Input States: CAPITAL EXPENDITURES (ANNUAL) ---
  const [capitalReservePerUnitAnnual, setCapitalReservePerUnitAnnual] = useState<number>(0); // Per unit, annual
  const [holdingPeriodYears, setHoldingPeriodYears] = useState<number>(0); // Years
  const [deferredCapitalReservePerUnit, setDeferredCapitalReservePerUnit] = useState<number>(0);
  // --- Helper function for formatting and parsing numerical inputs with commas ---
  const formatAndParseNumberInput = (
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit and non-decimal characters (allowing only one decimal point)
    const cleanedValue = e.target.value.replace(/[^\d.]/g, '');
    // Parse to float, default to 0 if invalid
    const parsedValue = parseFloat(cleanedValue) || 0;
    setter(Math.max(0, parsedValue));
  };

  // --- Calculated Metrics (Year 1) ---

  // Financing Calculations (Year 1)
  const downPaymentAmount = useMemo(() => {
    return purchasePrice * (downPaymentPercentage / 100);
  }, [purchasePrice, downPaymentPercentage]);

  const loanAmount = useMemo(() => {
    return purchasePrice - downPaymentAmount;
  }, [purchasePrice, downPaymentAmount]);

  const totalInitialInvestment = useMemo(() => {
    return downPaymentAmount + (purchasePrice * (closingCostsPercentage / 100));
  }, [downPaymentAmount, purchasePrice, closingCostsPercentage]);

  const monthlyInterestRate = useMemo(() => {
    return (interestRate / 100) / 12;
  }, [interestRate]);

  const numberOfPayments = useMemo(() => {
    return amortizationPeriodYears * 12;
  }, [amortizationPeriodYears]);

  const monthlyMortgagePayment = useMemo(() => {
    if (loanStructure === 'interest-only') {
      // For interest-only loans, payment is just the interest
      return loanAmount * monthlyInterestRate;
    }
    
    // For amortizing loans, use standard amortization formula
    if (monthlyInterestRate === 0) { // Handle 0% interest rate to avoid division by zero
      if (numberOfPayments === 0) return 0;
      return loanAmount / numberOfPayments;
    }
    const numerator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments);
    const denominator = Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1;

    if (denominator === 0) return loanAmount;
    return loanAmount * (numerator / denominator);
  }, [loanAmount, monthlyInterestRate, numberOfPayments, loanStructure]);

  const annualDebtService = useMemo(() => {
    return monthlyMortgagePayment * 12;
  }, [monthlyMortgagePayment]);

  // Rent Calculations (Year 1)
  const grossPotentialRent = useMemo(() => {
    return numUnits * avgMonthlyRentPerUnit * 12;
  }, [numUnits, avgMonthlyRentPerUnit]);

  const effectiveGrossIncome = useMemo(() => {
    return (grossPotentialRent * (1 - vacancyRate / 100)) + otherIncomeAnnual - incomeReductionsAnnual;
  }, [grossPotentialRent, vacancyRate, otherIncomeAnnual, incomeReductionsAnnual]);

  // Expense Calculations (Year 1)
  const propertyManagementFeeAmount = useMemo(() => {
    if (usePercentageMode) return 0; // Show $0 in percentage mode
    return effectiveGrossIncome * (propertyManagementFeePercentage / 100);
  }, [usePercentageMode, effectiveGrossIncome, propertyManagementFeePercentage]);

  const totalOperatingExpenses = useMemo(() => {
    if (usePercentageMode) {
      return effectiveGrossIncome * (operatingExpensePercentage / 100);
    }
    return propertyTaxes + insurance + propertyManagementFeeAmount + maintenanceRepairsAnnual + utilitiesAnnual + contractServicesAnnual + payrollAnnual + marketingAnnual + gAndAAnnual + otherExpensesAnnual;
  }, [usePercentageMode, operatingExpensePercentage, effectiveGrossIncome, propertyTaxes, insurance, propertyManagementFeeAmount, maintenanceRepairsAnnual, utilitiesAnnual, contractServicesAnnual, payrollAnnual, marketingAnnual, gAndAAnnual, otherExpensesAnnual]);

  const netOperatingIncome = useMemo(() => {
    return effectiveGrossIncome - totalOperatingExpenses;
  }, [effectiveGrossIncome, totalOperatingExpenses]);

  const expenseRatio = useMemo(() => {
    if (effectiveGrossIncome === 0) return 0;
    return (totalOperatingExpenses / effectiveGrossIncome) * 100; // Percentage
  }, [totalOperatingExpenses, effectiveGrossIncome]);

  // Individual Operating Expense Line Items for Display (Year 1)
  // These show $0 in percentage mode, actual values in detailed mode
  const displayPropertyTaxes = useMemo(() => usePercentageMode ? 0 : propertyTaxes, [usePercentageMode, propertyTaxes]);
  const displayInsurance = useMemo(() => usePercentageMode ? 0 : insurance, [usePercentageMode, insurance]);
  const displayPropertyManagementFeeAmount = useMemo(() => usePercentageMode ? 0 : propertyManagementFeeAmount, [usePercentageMode, propertyManagementFeeAmount]);
  const displayMaintenanceRepairsAnnual = useMemo(() => usePercentageMode ? 0 : maintenanceRepairsAnnual, [usePercentageMode, maintenanceRepairsAnnual]);
  const displayUtilitiesAnnual = useMemo(() => usePercentageMode ? 0 : utilitiesAnnual, [usePercentageMode, utilitiesAnnual]);
  const displayContractServicesAnnual = useMemo(() => usePercentageMode ? 0 : contractServicesAnnual, [usePercentageMode, contractServicesAnnual]);
  const displayPayrollAnnual = useMemo(() => usePercentageMode ? 0 : payrollAnnual, [usePercentageMode, payrollAnnual]);
  const displayMarketingAnnual = useMemo(() => usePercentageMode ? 0 : marketingAnnual, [usePercentageMode, marketingAnnual]);
  const displayGAndAAnnual = useMemo(() => usePercentageMode ? 0 : gAndAAnnual, [usePercentageMode, gAndAAnnual]);
  const displayOtherExpensesAnnual = useMemo(() => usePercentageMode ? 0 : otherExpensesAnnual, [usePercentageMode, otherExpensesAnnual]);

  // Capital Reserve (Year 1)
  const annualCapitalReserveTotal = useMemo(() => {
    return capitalReservePerUnitAnnual * numUnits;
  }, [capitalReservePerUnitAnnual, numUnits]);

  const totalDeferredCapitalReserve = useMemo(() => {
    return deferredCapitalReservePerUnit * numUnits;
  }, [deferredCapitalReservePerUnit, numUnits]);

  // Cash Flow & Returns (Year 1)
  const cashFlowBeforeTax = useMemo(() => {
    return netOperatingIncome - annualDebtService;
  }, [netOperatingIncome, annualDebtService]);

  const cashFlowAfterCapitalReserve = useMemo(() => {
    return cashFlowBeforeTax - annualCapitalReserveTotal - totalDeferredCapitalReserve;
  }, [cashFlowBeforeTax, annualCapitalReserveTotal, totalDeferredCapitalReserve]);

  const capRate = useMemo(() => {
    if (purchasePrice === 0) return 0;
    return (netOperatingIncome / purchasePrice) * 100; // Percentage
  }, [netOperatingIncome, purchasePrice]);

  const cashOnCashReturn = useMemo(() => {
    if (totalInitialInvestment === 0) return 0;
    return (cashFlowAfterCapitalReserve / totalInitialInvestment) * 100; // Percentage
  }, [cashFlowAfterCapitalReserve, totalInitialInvestment]);

  // Debt Service Coverage Ratio (DSCR) Calculation
  const debtServiceCoverageRatio = useMemo(() => {
    if (annualDebtService === 0) return 0; // Avoid division by zero
    return netOperatingIncome / annualDebtService;
  }, [netOperatingIncome, annualDebtService]);

  // --- Chart Data & Projections (Multi-Year) ---
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [breakEvenYear, setBreakEvenYear] = useState<number | null>(null);
  const [projectedEquityAtHorizon, setProjectedEquityAtHorizon] = useState<number>(0);
  const [roiAtHorizon, setRoiAtHorizon] = useState<number>(0);
  const [irr, setIRR] = useState<number>(0);
  const [overallGrade, setOverallGrade] = useState<string>('N/A');
  const [gradeBreakdown, setGradeBreakdown] = useState<Record<string, number>>({});
  const [detectedClassification, setDetectedClassification] = useState<{ assetClass: string; marketTier: string }>({
    assetClass: 'b-class',
    marketTier: 'tier-2'
  });
  const [year1LoanBalance, setYear1LoanBalance] = useState<number>(0);
  const [actualGradingScore, setActualGradingScore] = useState<number>(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toggleState, setToggleState] = useState<'clear' | 'defaults'>('clear'); // Initial state is 'clear' since form opens with defaults
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Function to save settings as blob
  const saveSettings = () => {
    // Reset the unsaved changes tracking since we're saving the scenario
    if ((window as any).propertyAnalyzerSetSavingScenario) {
      (window as any).propertyAnalyzerSetSavingScenario(true);
    }
    
    const settingsToSave = {
      purchasePrice,
      downPaymentPercentage,
      interestRate,
      loanStructure,
      amortizationPeriodYears,
      interestOnlyPeriodYears,
      refinanceTermYears,
      closingCostsPercentage,
      dispositionCapRate,
      numUnits,
      avgMonthlyRentPerUnit,
      vacancyRate,
      annualRentalGrowthRate,
      otherIncomeAnnual,
      incomeReductionsAnnual,
      propertyTaxes,
      insurance,
      propertyManagementFeePercentage,
      maintenanceRepairsAnnual,
      utilitiesAnnual,
      contractServicesAnnual,
      payrollAnnual,
      marketingAnnual,
      gAndAAnnual,
      otherExpensesAnnual,
      expenseGrowthRate,
      capitalReservePerUnitAnnual,
      deferredCapitalReservePerUnit,
      holdingPeriodYears,
      usePercentageMode,
      operatingExpensePercentage,
      savedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(settingsToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Prompt user for filename
    const defaultFilename = `property-analyzer-${new Date().toISOString().split('T')[0]}.json`;
    const userFilename = prompt('Enter filename:', defaultFilename);

    if (userFilename) {
      a.download = userFilename.endsWith('.json') ? userFilename : userFilename + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // File was successfully saved, permanently reset the interaction flag
      // This prevents warnings until user makes new changes
      if ((window as any).propertyAnalyzerResetUserInteraction) {
        (window as any).propertyAnalyzerResetUserInteraction();
      }
    }

    URL.revokeObjectURL(url);
    
    // Clean up the saving flag 
    if ((window as any).propertyAnalyzerSetSavingScenario) {
      (window as any).propertyAnalyzerSetSavingScenario(false);
    }
  };

  // --- Offer Management Functions ---
  
  // Function to get current offer data for saving
  const getCurrentOfferData = () => {
    return {
      // === INPUT PARAMETERS ===
      purchasePrice,
      downPaymentPercentage,
      interestRate,
      loanStructure,
      amortizationPeriodYears,
      interestOnlyPeriodYears,
      refinanceTermYears,
      closingCostsPercentage,
      dispositionCapRate,
      numUnits,
      avgMonthlyRentPerUnit,
      vacancyRate,
      annualRentalGrowthRate,
      otherIncomeAnnual,
      incomeReductionsAnnual,
      propertyTaxes,
      insurance,
      propertyManagementFeePercentage,
      maintenanceRepairsAnnual,
      utilitiesAnnual,
      contractServicesAnnual,
      payrollAnnual,
      marketingAnnual,
      gAndAAnnual,
      otherExpensesAnnual,
      expenseGrowthRate,
      capitalReservePerUnitAnnual,
      deferredCapitalReservePerUnit,
      holdingPeriodYears,
      
      // === CALCULATED RESULTS ===
      projected_irr: irr.toFixed(2) + '%',
      cash_on_cash_return: cashOnCashReturn.toFixed(2) + '%',
      roi_at_horizon: roiAtHorizon.toFixed(2) + '%',
      projected_equity_at_horizon: projectedEquityAtHorizon,
      
      // Additional calculated fields
      gross_operating_income: effectiveGrossIncome,
      net_operating_income: netOperatingIncome,
      debt_service_coverage_ratio: debtServiceCoverageRatio.toFixed(2),
      cash_flow_before_tax: cashFlowBeforeTax,
      cash_flow_after_capital_reserve: cashFlowAfterCapitalReserve,
      annual_debt_service: annualDebtService,
      loan_balance_year_1: calculateRemainingLoanBalance(1),
      cap_rate_year_1: capRate.toFixed(2) + '%',
      break_even_point: breakEvenYear ? `${breakEvenYear} years` : null,
      total_acquisition_cost: purchasePrice + (purchasePrice * (closingCostsPercentage / 100)),
      total_cash_invested: totalInitialInvestment,
      down_payment_amount: downPaymentAmount,
      loan_amount: loanAmount,
      monthly_mortgage_payment: monthlyMortgagePayment,
      expense_ratio_year_1: expenseRatio.toFixed(2) + '%',
      
      usePercentageMode,
      operatingExpensePercentage,
      savedAt: new Date().toISOString()
    };
  };

  // Function to load offer data
  const loadOfferData = (offerData: any) => {
    if (!offerData || typeof offerData !== 'object') return;
    
    setPurchasePrice(offerData.purchasePrice ?? purchasePrice);
    setDownPaymentPercentage(offerData.downPaymentPercentage ?? downPaymentPercentage);
    setInterestRate(offerData.interestRate ?? interestRate);
    setLoanStructure(offerData.loanStructure ?? loanStructure);
    setAmortizationPeriodYears(offerData.amortizationPeriodYears ?? amortizationPeriodYears);
    setInterestOnlyPeriodYears(offerData.interestOnlyPeriodYears ?? interestOnlyPeriodYears);
    setRefinanceTermYears(offerData.refinanceTermYears ?? refinanceTermYears);
    setClosingCostsPercentage(offerData.closingCostsPercentage ?? closingCostsPercentage);
    setDispositionCapRate(offerData.dispositionCapRate ?? dispositionCapRate);
    setNumUnits(offerData.numUnits ?? numUnits);
    setAvgMonthlyRentPerUnit(offerData.avgMonthlyRentPerUnit ?? avgMonthlyRentPerUnit);
    setVacancyRate(offerData.vacancyRate ?? vacancyRate);
    setAnnualRentalGrowthRate(offerData.annualRentalGrowthRate ?? annualRentalGrowthRate);
    setOtherIncomeAnnual(offerData.otherIncomeAnnual ?? otherIncomeAnnual);
    setIncomeReductionsAnnual(offerData.incomeReductionsAnnual ?? incomeReductionsAnnual);
    setPropertyTaxes(offerData.propertyTaxes ?? propertyTaxes);
    setInsurance(offerData.insurance ?? insurance);
    setPropertyManagementFeePercentage(offerData.propertyManagementFeePercentage ?? propertyManagementFeePercentage);
    setMaintenanceRepairsAnnual(offerData.maintenanceRepairsAnnual ?? maintenanceRepairsAnnual);
    setUtilitiesAnnual(offerData.utilitiesAnnual ?? utilitiesAnnual);
    setContractServicesAnnual(offerData.contractServicesAnnual ?? contractServicesAnnual);
    setPayrollAnnual(offerData.payrollAnnual ?? payrollAnnual);
    setMarketingAnnual(offerData.marketingAnnual ?? marketingAnnual);
    setGAndAAnnual(offerData.gAndAAnnual ?? gAndAAnnual);
    setOtherExpensesAnnual(offerData.otherExpensesAnnual ?? otherExpensesAnnual);
    setExpenseGrowthRate(offerData.expenseGrowthRate ?? expenseGrowthRate);
    setCapitalReservePerUnitAnnual(offerData.capitalReservePerUnitAnnual ?? capitalReservePerUnitAnnual);
    setDeferredCapitalReservePerUnit(offerData.deferredCapitalReservePerUnit ?? deferredCapitalReservePerUnit);
    setHoldingPeriodYears(offerData.holdingPeriodYears ?? holdingPeriodYears);
    setUsePercentageMode(offerData.usePercentageMode ?? usePercentageMode);
    setOperatingExpensePercentage(offerData.operatingExpensePercentage ?? operatingExpensePercentage);
  };

  // Handle viewing all user offers
  const handleViewOffers = async () => {
    if (!currentUser) {
      alert('Please log in to view offers.');
      return;
    }

    try {
      // Fetch offers from the offer_scenarios table (all user offers)
      const response = await fetch('/api/offer-scenarios?all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      const data = await response.json();
      
      // Transform the data to match our UI format
      const transformedOffers = data.scenarios.map((offer: any) => ({
        id: offer.id,
        name: offer.offer_name || `Offer ${offer.id}`,
        description: offer.offer_description || 'No description',
        property_address: offer.saved_properties?.address_full || 'Unknown Address',
        offer_amount: offer.offer_data?.purchasePrice ? `$${parseInt(offer.offer_data.purchasePrice).toLocaleString()}` : 'N/A',
        created_date: new Date(offer.created_at).toLocaleDateString(),
        property_id: offer.property_id,
        offer_data: offer.offer_data
      }));

      setSelectedPropertyOffers(transformedOffers);
      setShowOffersModal(true);
    } catch (error) {
      console.error('Error fetching offers:', error);
      alert('Failed to load offers. Please try again.');
    }
  };

  const handleOfferSelection = (offer: any) => {
    loadOfferData(offer.offer_data);
    setLoadedOfferName(offer.name);
    setShowOffersModal(false);
  };

  const handleDeleteOffer = async (offerId: string) => {
    showDelete(
      'Are you sure you want to delete this offer? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`/api/offer-scenarios/${offerId}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete offer');
          }

          // Remove from local state
          setSelectedPropertyOffers(prev => prev.filter(offer => offer.id !== offerId));
        } catch (error) {
          console.error('Error deleting offer:', error);
          showError('Failed to delete offer. Please try again.');
        }
      }
    );
  };

  // Handle saving analysis to database
  // Check if analysis name already exists
  const checkDuplicateOfferName = async (offerName: string, propertyId: string): Promise<boolean> => {
    try {
      console.log('Checking for duplicate analysis name:', offerName, 'for property:', propertyId);
      const response = await fetch(`/api/offer-scenarios?propertyId=${propertyId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        console.log('API response not ok:', response.status);
        return false; // If we can't check, proceed with save
      }
      
      const data = await response.json();
      console.log('Existing scenarios:', data.scenarios);
      
      const isDuplicate = data.scenarios?.some((scenario: any) => 
        scenario.offer_name?.toLowerCase() === offerName.toLowerCase()
      ) || false;
      
      console.log('Is duplicate?', isDuplicate);
      return isDuplicate;
    } catch (error) {
      console.error('Error checking for duplicate offer name:', error);
      return false; // If error, proceed with save
    }
  };

  const handleSaveOffer = async (offerName: string, offerDescription: string) => {
    if (submissionId) {
      // For pricing variations, skip duplicate checking and go straight to save
      await performSaveOffer(offerName, offerDescription);
      setShowSaveOfferModal(false);
      // Redirect back to the fund browse page where they started
      router.push(`/fund/browse/${submissionId}`);
      return;
    }

    // Original offer scenario logic - requires propertyId
    if (!propertyId) {
      throw new Error('Property ID is required to save offers');
    }

    // Get the correct property_id from saved_properties table for duplicate check
    const favoritesResponse = await fetch('/api/favorites', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!favoritesResponse.ok) {
      throw new Error('Failed to fetch saved properties');
    }
    
    const favoritesData = await favoritesResponse.json();
    const savedProperty = favoritesData.favorites?.find((f: any) => 
      f.property_data?.id === propertyId
    );
    
    if (!savedProperty || !savedProperty.property_id) {
      throw new Error(`Property UUID ${propertyId} not found in favorites. This property must be saved to your favorites before creating offer scenarios.`);
    }

    const actualPropertyId = savedProperty.property_id;

    // Check for duplicate offer name using the actual property_id
    const isDuplicate = await checkDuplicateOfferName(offerName, actualPropertyId);
    if (isDuplicate) {
      // Store the pending offer data and show warning dialog
      setPendingOfferData({ name: offerName, description: offerDescription });
      // Close save modal first, then show duplicate alert
      setShowSaveOfferModal(false);
      // Use setTimeout to ensure save modal closes before duplicate alert appears
      setTimeout(() => setShowDuplicateAlert(true), 0);
      return;
    }

    // If no duplicate, proceed with save
    await performSaveOffer(offerName, offerDescription);
    // SaveOfferModal will close itself after successful save
  };

  // Handle user choice to overwrite existing offer
  const handleConfirmOverwrite = async () => {
    if (pendingOfferData) {
      try {
        // Perform the save without duplicate check (we already know we want to overwrite)
        await performSaveOffer(pendingOfferData.name, pendingOfferData.description);
        
        // Clear everything at once to minimize visual glitches
        setPendingOfferData(null);
        setShowDuplicateAlert(false);
        setShowSaveOfferModal(false);
      } catch (error) {
        console.error('Error during overwrite save:', error);
        // If there's an error, close duplicate and show save modal
        setShowDuplicateAlert(false);
        setShowSaveOfferModal(true);
      }
    }
  };

  // Handle user choice to cancel overwrite
  const handleCancelOverwrite = () => {
    setPendingOfferData(null);
    setShowDuplicateAlert(false);
    setShowSaveOfferModal(true); // Re-open the save modal so user can choose a different name
  };

  // Separate function to actually perform the save
  const performSaveOffer = async (offerName: string, offerDescription: string) => {
    // Check if we're saving a pricing variation (from submission) or regular offer scenario
    // submissionId is available from state if this was opened from a fund submission
    
    if (submissionId) {
      // Check if we're updating an existing variation or creating a new one
      if (variationId) {
        // Update existing pricing variation
        const response = await fetch(`/api/pricing-variations/${variationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisName: offerName,
            description: offerDescription,
            scenarioData: getCurrentOfferData()
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update pricing variation');
        }
      } else {
        // Create new pricing variation - no propertyId needed
        const response = await fetch('/api/pricing-variations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId,
            analysisName: offerName,
            description: offerDescription,
            scenarioData: getCurrentOfferData()
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to save pricing variation');
        }
      }
    } else {
      // Original offer scenario save logic - propertyId required
      if (!propertyId) {
        throw new Error('Property ID is required to save offers');
      }

      // Get the correct property_id from saved_properties table
      const favoritesResponse = await fetch('/api/favorites', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!favoritesResponse.ok) {
        throw new Error('Failed to fetch saved properties');
      }
      
      const favoritesData = await favoritesResponse.json();
      
      console.log('Looking for UUID:', propertyId);
      
      // Find the saved property record where the internal UUID matches
      const savedProperty = favoritesData.favorites?.find((f: any) => 
        f.property_data?.id === propertyId
      );
      
      console.log('Found saved property:', savedProperty);
      
      if (!savedProperty || !savedProperty.property_id) {
        console.error('Available property_data IDs:', favoritesData.favorites?.map((f: any) => f.property_data?.id));
        throw new Error(`Property UUID ${propertyId} not found in favorites. This property must be saved to your favorites before creating offer scenarios.`);
      }

      const actualPropertyId = savedProperty.property_id;
      console.log('Using actual property_id:', actualPropertyId);

      const response = await fetch('/api/offer-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: actualPropertyId, // Use the property_id field from saved_properties
          offerName,
          offerDescription,
          offerData: getCurrentOfferData()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save offer');
      }
    }

    // Reset the unsaved changes tracking since we're saving the scenario
    if ((window as any).propertyAnalyzerSetSavingScenario) {
      (window as any).propertyAnalyzerSetSavingScenario(true);
    }
    
    // File was successfully saved, permanently reset the interaction flag
    if ((window as any).propertyAnalyzerResetUserInteraction) {
      (window as any).propertyAnalyzerResetUserInteraction();
    }

    // Clean up the saving flag 
    if ((window as any).propertyAnalyzerSetSavingScenario) {
      (window as any).propertyAnalyzerSetSavingScenario(false);
    }
  };

  // Property data for 10-year cash flow report (moved into Charlie's Analysis)
  const propertyData = useMemo(() => ({
    propertyStreet,
    propertyCity,
    propertyState,
    purchasePrice,
    downPaymentPercentage,
    closingCostsPercentage,
    interestRate,
    amortizationPeriodYears,
    loanStructure,
    interestOnlyPeriodYears,
    numUnits,
    avgMonthlyRentPerUnit,
    vacancyRate,
    annualRentalGrowthRate,
    otherIncomeAnnual,
    incomeReductionsAnnual,
    propertyTaxes: displayPropertyTaxes,
    insurance: displayInsurance,
    propertyManagementFeePercentage,
    maintenanceRepairsAnnual: displayMaintenanceRepairsAnnual,
    utilitiesAnnual: displayUtilitiesAnnual,
    contractServicesAnnual: displayContractServicesAnnual,
    payrollAnnual: displayPayrollAnnual,
    marketingAnnual: displayMarketingAnnual,
    gAndAAnnual: displayGAndAAnnual,
    otherExpensesAnnual: displayOtherExpensesAnnual,
    expenseGrowthRate,
    usePercentageMode,
    operatingExpensePercentage,
    capitalReservePerUnitAnnual,
    holdingPeriodYears
  }), [
    propertyStreet, propertyCity, propertyState,
    purchasePrice, downPaymentPercentage, closingCostsPercentage, interestRate,
    amortizationPeriodYears, loanStructure, interestOnlyPeriodYears, numUnits,
    avgMonthlyRentPerUnit, vacancyRate, annualRentalGrowthRate, otherIncomeAnnual,
    incomeReductionsAnnual, displayPropertyTaxes, displayInsurance, propertyManagementFeePercentage,
    displayMaintenanceRepairsAnnual, displayUtilitiesAnnual, displayContractServicesAnnual, displayPayrollAnnual,
    displayMarketingAnnual, displayGAndAAnnual, displayOtherExpensesAnnual, expenseGrowthRate,
    usePercentageMode, operatingExpensePercentage, capitalReservePerUnitAnnual, holdingPeriodYears
  ]);

  // Function to handle file loading
  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed && typeof parsed === "object") {
          setPurchasePrice(parsed.purchasePrice ?? 0);
          setDownPaymentPercentage(parsed.downPaymentPercentage ?? 0);
          setInterestRate(parsed.interestRate ?? 0);
          setLoanStructure(parsed.loanStructure ?? 'amortizing');
          setAmortizationPeriodYears(parsed.amortizationPeriodYears ?? 30);
          setInterestOnlyPeriodYears(parsed.interestOnlyPeriodYears ?? 10);
          setRefinanceTermYears(parsed.refinanceTermYears ?? 25);
          setClosingCostsPercentage(parsed.closingCostsPercentage ?? 0);
          setDispositionCapRate(parsed.dispositionCapRate ?? 0);
          setNumUnits(parsed.numUnits ?? 0);
          setAvgMonthlyRentPerUnit(parsed.avgMonthlyRentPerUnit ?? 0);
          setVacancyRate(parsed.vacancyRate ?? 0);
          setAnnualRentalGrowthRate(parsed.annualRentalGrowthRate ?? 0);
          setOtherIncomeAnnual(parsed.otherIncomeAnnual ?? 0);
          setIncomeReductionsAnnual(parsed.incomeReductionsAnnual ?? 0);
          setPropertyTaxes(parsed.propertyTaxes ?? 0);
          setInsurance(parsed.insurance ?? 0);
          setPropertyManagementFeePercentage(parsed.propertyManagementFeePercentage ?? 0);
          setMaintenanceRepairsAnnual(parsed.maintenanceRepairsAnnual ?? 0);
          setUtilitiesAnnual(parsed.utilitiesAnnual ?? 0);
          setContractServicesAnnual(parsed.contractServicesAnnual ?? 0);
          setPayrollAnnual(parsed.payrollAnnual ?? 0);
          setMarketingAnnual(parsed.marketingAnnual ?? 0);
          setGAndAAnnual(parsed.gAndAAnnual ?? 0);
          setOtherExpensesAnnual(parsed.otherExpensesAnnual ?? 0);
          setExpenseGrowthRate(parsed.expenseGrowthRate ?? 0);
          setCapitalReservePerUnitAnnual(parsed.capitalReservePerUnitAnnual ?? 0);
          setDeferredCapitalReservePerUnit(parsed.deferredCapitalReservePerUnit ?? 0);
          setHoldingPeriodYears(parsed.holdingPeriodYears ?? 1);
          setUsePercentageMode(parsed.usePercentageMode ?? false);
          setOperatingExpensePercentage(parsed.operatingExpensePercentage ?? 45);

          alert('Scenario loaded successfully!');
        } else {
          alert('Invalid file format');
        }
      } catch (error) {
        alert('Error loading file: Invalid JSON format');
      }
    };

    reader.readAsText(file);
    // Reset the input so the same file can be loaded again if needed
    event.target.value = '';
  };

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Detect any changes on the page and warn before leaving
  useEffect(() => {
    let userInteracted = false;
    let isResettingToDefaults = false;
    let isSavingScenario = false;

    const handleUserInteraction = () => {
      if (!isResettingToDefaults && !isSavingScenario) {
        userInteracted = true;
      }
    };

    const resetUserInteraction = () => {
      userInteracted = false;
    };

    const setResettingToDefaults = (resetting: boolean) => {
      isResettingToDefaults = resetting;
      if (resetting) {
        userInteracted = false; // Reset when loading defaults
      }
    };

    const setSavingScenario = (saving: boolean) => {
      isSavingScenario = saving;
      if (saving) {
        userInteracted = false; // Reset when saving scenario
      }
    };

    // Expose functions to window for button clicks to use
    (window as any).propertyAnalyzerResetUserInteraction = resetUserInteraction;
    (window as any).propertyAnalyzerSetResettingToDefaults = setResettingToDefaults;
    (window as any).propertyAnalyzerSetSavingScenario = setSavingScenario;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (userInteracted && !allowLeavingRef.current) {
        e.preventDefault();
        e.returnValue = "Charlie here. I see you've been working on an offer and I don't want you to lose your work! Save your scenario first by clicking 'More' then 'Save scenario'.";
        return "Charlie here. I see you've been working on an offer and I don't want you to lose your work! Save your scenario first by clicking 'More' then 'Save scenario'.";
      }
    };

    // Override the router methods to intercept navigation
    const originalPush = router.push;
    const originalReplace = router.replace;
    
    router.push = (href: string, options?: any) => {
      if (userInteracted && href !== '/property-analyzer') {
        setPendingNavigation(() => () => originalPush.call(router, href, options));
        setShowUnsavedChangesModal(true);
        return Promise.resolve(false);
      }
      return originalPush.call(router, href, options);
    };

    router.replace = (href: string, options?: any) => {
      if (userInteracted && href !== '/property-analyzer') {
        setPendingNavigation(() => () => originalReplace.call(router, href, options));
        setShowUnsavedChangesModal(true);
        return Promise.resolve(false);
      }
      return originalReplace.call(router, href, options);
    };

    // Intercept clicks on links and navigation elements
    const handleLinkClick = (e: MouseEvent) => {
      if (!userInteracted) return;
      
      const target = e.target as HTMLElement;
      const link = target.closest('a[href], [data-nextjs-link]');
      
      if (link) {
        const href = link.getAttribute('href');
        if (href && href !== '/property-analyzer' && !href.startsWith('#')) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation(() => () => {
            window.location.href = href;
          });
          setShowUnsavedChangesModal(true);
          return false;
        }
      }
    };

    // Listen for any input changes or form changes
    document.addEventListener('input', handleUserInteraction);
    document.addEventListener('change', handleUserInteraction);
    
    // Listen for link clicks
    document.addEventListener('click', handleLinkClick, true);
    
    // Listen for browser navigation events
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // Restore original router methods
      router.push = originalPush;
      router.replace = originalReplace;
      
      // Clean up window functions
      delete (window as any).propertyAnalyzerResetUserInteraction;
      delete (window as any).propertyAnalyzerSetResettingToDefaults;
      delete (window as any).propertyAnalyzerSetSavingScenario;
      
      document.removeEventListener('input', handleUserInteraction);
      document.removeEventListener('change', handleUserInteraction);
      document.removeEventListener('click', handleLinkClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router]);

  // Modal handlers
  const handleStayAndSave = () => {
    setShowUnsavedChangesModal(false);
    setPendingNavigation(null);
    // User should save manually - they'll stay on the page
  };

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedChangesModal(false);
    
    // Allow leaving without further warnings
    allowLeavingRef.current = true;
    
    if (pendingNavigation) {
      pendingNavigation();
    }
    setPendingNavigation(null);
  };

  // FIXED: Function to calculate remaining loan balance correctly
  const calculateRemainingLoanBalance = (yearsElapsed: number): number => {
    const monthsPaid = yearsElapsed * 12;
    
    if (loanStructure === 'interest-only') {
      // For interest-only loans, balance stays the same during IO period
      if (yearsElapsed <= interestOnlyPeriodYears) {
        return loanAmount; // Full balance remains during IO period
      } else if (refinanceTermYears === 0) {
        // Sale scenario - full balance due at end of IO period
        return 0; // Assume sale pays off loan
      } else {
        // Refinance scenario - loan continues amortizing after IO period
        const monthsIntoAmortization = (yearsElapsed - interestOnlyPeriodYears) * 12;
        const amortizationMonths = refinanceTermYears * 12;
        
        if (monthsIntoAmortization >= amortizationMonths) return 0; // Loan is paid off
        
        // Calculate amortizing payment for refinance period
        let amortizingPayment = 0;
        if (monthlyInterestRate === 0) {
          amortizingPayment = loanAmount / amortizationMonths;
        } else {
          const numerator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, amortizationMonths);
          const denominator = Math.pow(1 + monthlyInterestRate, amortizationMonths) - 1;
          amortizingPayment = loanAmount * (numerator / denominator);
        }
        
        // Calculate remaining balance using amortization formula
        if (monthlyInterestRate === 0) {
          return loanAmount - (amortizingPayment * monthsIntoAmortization);
        } else {
          const A = loanAmount;
          const r = monthlyInterestRate;
          const n = amortizationMonths;
          const remainingBalance = A * (Math.pow(1 + r, n) - Math.pow(1 + r, monthsIntoAmortization)) / (Math.pow(1 + r, n) - 1);
          return Math.max(0, remainingBalance);
        }
      }
    }
    
    // For standard amortizing loans
    if (monthsPaid >= numberOfPayments) return 0; // Loan is paid off

    if (monthlyInterestRate === 0) {
      // Simple calculation for 0% interest
      return loanAmount - (monthlyMortgagePayment * monthsPaid);
    }

    // Standard amortization formula for remaining balance
    const A = loanAmount;
    const r = monthlyInterestRate;
    const n = numberOfPayments;

    const remainingBalance = A * (Math.pow(1 + r, n) - Math.pow(1 + r, monthsPaid)) / (Math.pow(1 + r, n) - 1);
    return Math.max(0, remainingBalance);
  };

  useEffect(() => {
    const data: ChartDataPoint[] = [];
    let cumulativeCashFlow = -totalInitialInvestment;
    let currentBreakEvenYear: number | null = null;
    const cashFlowsForIRR: number[] = [-totalInitialInvestment]; // Year 0 outflow for IRR

    // FIXED: Initialize values for year 0 correctly
    data.push({
      year: 0,
      cumulativeCashFlow: cumulativeCashFlow,
      noi: 0, // Year 0 has no NOI
      cashFlowBeforeTax: 0, // Year 0 has no cash flow
    });

    let currentGrossPotentialRent = grossPotentialRent;
    let currentEffectiveGrossIncome = effectiveGrossIncome;
    let currentTotalOperatingExpenses = totalOperatingExpenses;
    let currentNetOperatingIncome = netOperatingIncome;
    let currentCashFlowBeforeTax = cashFlowBeforeTax;
    let currentAnnualCapitalReserveTotal = annualCapitalReserveTotal;
    let currentOtherIncomeAnnual = otherIncomeAnnual;
    let currentIncomeReductionsAnnual = incomeReductionsAnnual;

    // FIXED: Calculate Year 1 loan balance correctly
    const year1Balance = calculateRemainingLoanBalance(1);
    setYear1LoanBalance(year1Balance);

    for (let y = 1; y <= holdingPeriodYears; y++) {
      // Project Rent Growth
      currentGrossPotentialRent *= (1 + annualRentalGrowthRate / 100);
      currentEffectiveGrossIncome = (currentGrossPotentialRent * (1 - vacancyRate / 100)) + currentOtherIncomeAnnual - currentIncomeReductionsAnnual;

      // Project Expense Growth
      let currentPropertyManagementFeeAmount;
      
      if (usePercentageMode) {
        // In percentage mode, calculate total operating expenses based on percentage
        currentPropertyManagementFeeAmount = 0; // Don't show property management fee in percentage mode
        currentTotalOperatingExpenses = currentEffectiveGrossIncome * (operatingExpensePercentage / 100) * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      } else {
        // In detailed mode, calculate property management fee normally
        currentPropertyManagementFeeAmount = currentEffectiveGrossIncome * (propertyManagementFeePercentage / 100);
        // In detailed mode, use individual line items
        const projectedPropertyTaxes = propertyTaxes * Math.pow(1 + expenseGrowthRate / 100, y - 1);
        const projectedInsurance = insurance * Math.pow(1 + expenseGrowthRate / 100, y - 1);
        const projectedMaintenanceRepairs = maintenanceRepairsAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);
        const projectedUtilities = utilitiesAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);
        const projectedContractServices = contractServicesAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);
        const projectedPayroll = payrollAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);
        const projectedMarketing = marketingAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);
        const projectedGAndA = gAndAAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);
        const projectedOtherExpenses = otherExpensesAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);

        currentTotalOperatingExpenses = projectedPropertyTaxes + projectedInsurance + currentPropertyManagementFeeAmount + projectedMaintenanceRepairs + projectedUtilities + projectedContractServices + projectedPayroll + projectedMarketing + projectedGAndA + projectedOtherExpenses;
      }
      currentNetOperatingIncome = currentEffectiveGrossIncome - currentTotalOperatingExpenses;
      currentCashFlowBeforeTax = currentNetOperatingIncome - annualDebtService;

      currentAnnualCapitalReserveTotal = capitalReservePerUnitAnnual * numUnits;
      const annualDeferredCapitalReserve = totalDeferredCapitalReserve;
      const annualCashFlow = currentCashFlowBeforeTax - currentAnnualCapitalReserveTotal - annualDeferredCapitalReserve;
      cumulativeCashFlow += annualCashFlow;

      if (cumulativeCashFlow >= 0 && currentBreakEvenYear === null) {
        currentBreakEvenYear = y;
      }

      data.push({
        year: y,
        cumulativeCashFlow: cumulativeCashFlow,
        noi: currentNetOperatingIncome,
        cashFlowBeforeTax: currentCashFlowBeforeTax,
      });

      // Store annual cash flow for IRR calculation
      cashFlowsForIRR.push(annualCashFlow);
    }

    setChartData(data);
    setBreakEvenYear(currentBreakEvenYear);

    // Calculate sale price based on disposition cap rate
    const finalSalesPrice = currentNetOperatingIncome / (dispositionCapRate / 100);
    const finalLoanBalanceAtHorizon = calculateRemainingLoanBalance(holdingPeriodYears);

    // FIXED: Calculate net sale proceeds correctly
    const sellingCosts = finalSalesPrice * 0.02; // 2% selling costs
    const finalProjectedEquity = finalSalesPrice - finalLoanBalanceAtHorizon - sellingCosts;
    setProjectedEquityAtHorizon(finalProjectedEquity);

    // FIXED: Simplified ROI calculation
    const totalReturn = finalProjectedEquity + cumulativeCashFlow;
    const roi = ((totalReturn / totalInitialInvestment) - 1) * 100;
    setRoiAtHorizon(roi);

    // FIXED: Add sale proceeds to final year for IRR calculation
    if (cashFlowsForIRR.length > holdingPeriodYears) {
      cashFlowsForIRR[holdingPeriodYears] += finalProjectedEquity;
    }

    // Defensive check before calling calculateIRR
    if (!Array.isArray(cashFlowsForIRR) || cashFlowsForIRR.length === 0) {
      console.warn("IRR calculation skipped: Cash flow array is invalid or empty.");
      setIRR(0);
      return;
    }

    const calculatedIRR = calculateIRR(cashFlowsForIRR);
    setIRR(calculatedIRR * 100); // Convert to percentage

    // --- Calculate Overall Grade ---
    const adjustedCashFlowForGrading = currentCashFlowBeforeTax - totalDeferredCapitalReserve;

    // Auto-detect property classification
    const propertyCharacteristics: PropertyCharacteristics = {
      purchasePrice,
      numUnits,
      avgMonthlyRentPerUnit,
      capRate,
      expenseRatio
    };

    const detectedAssetClass = detectAssetClass(propertyCharacteristics);
    const detectedMarketTier = detectMarketTier(propertyCharacteristics);

    const gradeMetrics: MultifamilyGradeMetrics = {
      irr: calculatedIRR * 100,
      roiAtHorizon: roi,
      cashOnCashReturn: cashOnCashReturn,
      debtServiceCoverageRatio: debtServiceCoverageRatio,
      capRate: capRate,
      breakEvenYear: currentBreakEvenYear,
      netOperatingIncome: currentNetOperatingIncome,
      cashFlowBeforeTax: adjustedCashFlowForGrading,
      purchasePrice: purchasePrice,
      expenseRatio: expenseRatio,
      assetClass: detectedAssetClass as any,
      marketTier: detectedMarketTier as any
    };

    const gradingResult = calculateMultifamilyGrade(gradeMetrics);
    setOverallGrade(gradingResult.grade);
    setGradeBreakdown(gradingResult.breakdown);
    setDetectedClassification(gradingResult.classification);
    setActualGradingScore(gradingResult.score);


  }, [
    numUnits, avgMonthlyRentPerUnit, vacancyRate, annualRentalGrowthRate, otherIncomeAnnual, incomeReductionsAnnual,
    propertyTaxes, insurance, propertyManagementFeePercentage, maintenanceRepairsAnnual, utilitiesAnnual,
    contractServicesAnnual, payrollAnnual, marketingAnnual, gAndAAnnual,
    otherExpensesAnnual, expenseGrowthRate,
    capitalReservePerUnitAnnual, deferredCapitalReservePerUnit, holdingPeriodYears,
    purchasePrice, downPaymentPercentage, interestRate, loanStructure, amortizationPeriodYears, interestOnlyPeriodYears, refinanceTermYears, closingCostsPercentage,
    dispositionCapRate, // Target cap rate at sale
    grossPotentialRent, effectiveGrossIncome, propertyManagementFeeAmount, totalOperatingExpenses, netOperatingIncome,
    downPaymentAmount, loanAmount, totalInitialInvestment, monthlyInterestRate, numberOfPayments, monthlyMortgagePayment, annualDebtService,
    cashFlowBeforeTax, annualCapitalReserveTotal, totalDeferredCapitalReserve,
    capRate, cashOnCashReturn, debtServiceCoverageRatio, expenseRatio,
  ]);

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  // Helper function to format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  //Clear defaults
  const resetAllValues = () => {
    // FINANCING
    setPurchasePrice(0);
    setDownPaymentPercentage(0);
    setInterestRate(0);
    setLoanStructure('amortizing');
    setAmortizationPeriodYears(30);
    setInterestOnlyPeriodYears(10);
    setRefinanceTermYears(25);
    setClosingCostsPercentage(0);
    setDispositionCapRate(0);

    // RENTS
    setNumUnits(0);
    setAvgMonthlyRentPerUnit(0);
    setVacancyRate(0);
    setAnnualRentalGrowthRate(0);
    setOtherIncomeAnnual(0);
    setIncomeReductionsAnnual(0);

    // OPERATING EXPENSES
    setPropertyTaxes(0);
    setInsurance(0);
    setPropertyManagementFeePercentage(0);
    setMaintenanceRepairsAnnual(0);
    setUtilitiesAnnual(0);
    setContractServicesAnnual(0);
    setPayrollAnnual(0);
    setMarketingAnnual(0);
    setGAndAAnnual(0);
    setOtherExpensesAnnual(0);
    setExpenseGrowthRate(0);

    // CAPITAL EXPENDITURES
    setCapitalReservePerUnitAnnual(0);
    setDeferredCapitalReservePerUnit(0);
    setHoldingPeriodYears(1);
    
    // Update toggle state
    setToggleState('defaults');
  };

  //Reset to defaults
  const resetToDefaults = () => {
    // FINANCING
    setPurchasePrice(7000000);
    setDownPaymentPercentage(20);
    setInterestRate(7.0);
    setLoanStructure('amortizing');
    setAmortizationPeriodYears(30);
    setClosingCostsPercentage(3);
    setDispositionCapRate(6);

    // RENTS
    setNumUnits(47);
    setAvgMonthlyRentPerUnit(2500);
    setVacancyRate(10);
    setAnnualRentalGrowthRate(2);
    setOtherIncomeAnnual(0);
    setIncomeReductionsAnnual(0);

    // OPERATING EXPENSES
    setPropertyTaxes(12000);
    setInsurance(10000);
    setPropertyManagementFeePercentage(6);
    setMaintenanceRepairsAnnual(12000);
    setUtilitiesAnnual(6000);
    setContractServicesAnnual(6000);
    setPayrollAnnual(15000);
    setMarketingAnnual(2400);
    setGAndAAnnual(1200);
    setOtherExpensesAnnual(5000);
    setExpenseGrowthRate(2);
    setOperatingExpensePercentage(45);

    // CAPITAL EXPENDITURES
    setCapitalReservePerUnitAnnual(500);
    setDeferredCapitalReservePerUnit(0);
    setHoldingPeriodYears(10);
    
    // Update toggle state
    setToggleState('clear');
    
    // Reset the unsaved changes tracking since we just loaded defaults
    if ((window as any).propertyAnalyzerSetResettingToDefaults) {
      (window as any).propertyAnalyzerSetResettingToDefaults(true);
      setTimeout(() => {
        if ((window as any).propertyAnalyzerSetResettingToDefaults) {
          (window as any).propertyAnalyzerSetResettingToDefaults(false);
        }
      }, 100);
    }
  };

  // Toggle function that handles both actions
  const handleToggle = () => {
    if (toggleState === 'clear') {
      resetAllValues();
    } else {
      resetToDefaults();
    }
  };

  // Print function to generate comprehensive PDF with chart/metrics first, then inputs
  const handlePrintAnalysis = async () => {
    try {
      // Import jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Document styling constants
      const primaryColor = [44, 82, 130]; // Blue
      const secondaryColor = [100, 100, 100]; // Gray
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const rightMargin = pageWidth - margin;
      
      // PAGE 1: ANALYSIS RESULTS & METRICS
      let yPos = 30;
      
      // Header with property name and date
      doc.setFontSize(24);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Investment Analysis Report', margin, yPos);
      
      yPos += 15;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Property name from address params
      if (propertyStreet && propertyCity && propertyState) {
        doc.text(`Property: ${propertyStreet}, ${propertyCity}, ${propertyState}`, margin, yPos);
        yPos += 8;
      }
      doc.text(`Analysis Date: ${new Date().toLocaleDateString()}`, margin, yPos);
      
      // Investment Grade
      yPos += 20;
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('INVESTMENT GRADE', margin, yPos);
      doc.line(margin, yPos + 2, rightMargin, yPos + 2);
      
      yPos += 15;
      doc.setFontSize(20);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${overallGrade}`, margin, yPos);
      
      // Key Metrics
      yPos += 25;
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('KEY FINANCIAL METRICS', margin, yPos);
      doc.line(margin, yPos + 2, rightMargin, yPos + 2);
      
      yPos += 15;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      const leftCol = margin;
      const rightCol = pageWidth / 2 + 10;
      
      doc.text(`Gross Operating Income: $${Math.round(effectiveGrossIncome).toLocaleString()}`, leftCol, yPos);
      doc.text(`Net Operating Income: $${Math.round(netOperatingIncome).toLocaleString()}`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Cash Flow (Before Tax): $${Math.round(cashFlowBeforeTax).toLocaleString()}`, leftCol, yPos);
      doc.text(`Cash Flow (After Capital Reserve): $${Math.round(cashFlowAfterCapitalReserve).toLocaleString()}`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Cash-on-Cash Return (Year 1): ${cashOnCashReturn.toFixed(1)}%`, leftCol, yPos);
      doc.text(`Cap Rate (Year 1): ${capRate.toFixed(1)}%`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Total ROI (10 Year): ${roiAtHorizon.toFixed(1)}%`, leftCol, yPos);
      doc.text(`Internal Rate of Return (10 Year): ${irr.toFixed(1)}%`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Debt Service Coverage Ratio: ${debtServiceCoverageRatio.toFixed(1)}`, leftCol, yPos);
      doc.text(`Expense Ratio (Year 1): ${expenseRatio.toFixed(1)}%`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Break-Even Point: ${breakEvenYear !== null ? `${breakEvenYear} years` : 'N/A'}`, leftCol, yPos);
      doc.text(`Projected Equity (at Year 10): $${Math.round(projectedEquityAtHorizon).toLocaleString()}`, rightCol, yPos);
      
      
      // PAGE 2: INVESTMENT INPUTS
      doc.addPage();
      yPos = 30;
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Investment Assumptions & Inputs', margin, yPos);
      
      yPos += 20;
      
      // Financing Section
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('FINANCING', margin, yPos);
      doc.line(margin, yPos + 2, rightMargin, yPos + 2);
      
      yPos += 15;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      doc.text(`Purchase Price: $${Math.round(purchasePrice || 0).toLocaleString()}`, leftCol, yPos);
      doc.text(`Down Payment: ${downPaymentPercentage || 0}%`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Interest Rate: ${interestRate || 0}%`, leftCol, yPos);
      doc.text(`Loan Structure: ${loanStructure || 'amortizing'}`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Amortization Period: ${amortizationPeriodYears || 0} years`, leftCol, yPos);
      doc.text(`Closing Costs: ${closingCostsPercentage || 0}%`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Disposition Cap Rate: ${dispositionCapRate || 0}%`, leftCol, yPos);
      
      // Rental Income Section
      yPos += 20;
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('RENTAL INCOME', margin, yPos);
      doc.line(margin, yPos + 2, rightMargin, yPos + 2);
      
      yPos += 15;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      doc.text(`Number of Units: ${numUnits || 0}`, leftCol, yPos);
      doc.text(`Avg Monthly Rent/Unit: $${Math.round(avgMonthlyRentPerUnit || 0).toLocaleString()}`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Vacancy Rate: ${vacancyRate || 0}%`, leftCol, yPos);
      doc.text(`Annual Rental Growth: ${annualRentalGrowthRate || 0}%`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Other Income (Annual): $${Math.round(otherIncomeAnnual || 0).toLocaleString()}`, leftCol, yPos);
      doc.text(`Income Reductions (Annual): $${Math.round(incomeReductionsAnnual || 0).toLocaleString()}`, rightCol, yPos);
      
      // Operating Expenses Section
      yPos += 20;
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('OPERATING EXPENSES', margin, yPos);
      doc.line(margin, yPos + 2, rightMargin, yPos + 2);
      
      yPos += 15;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      if (usePercentageMode) {
        // Only show overall percentage when in percentage mode
        doc.text(`Operating Expense Percentage: ${operatingExpensePercentage || 0}%`, leftCol, yPos);
        yPos += 8;
      } else {
        // Show detailed breakdown when not in percentage mode
        doc.text(`Property Taxes: $${Math.round(propertyTaxes || 0).toLocaleString()}`, leftCol, yPos);
        doc.text(`Insurance: $${Math.round(insurance || 0).toLocaleString()}`, rightCol, yPos);
        yPos += 8;
        
        doc.text(`Property Management: ${propertyManagementFeePercentage || 0}%`, leftCol, yPos);
        doc.text(`Maintenance & Repairs: $${Math.round(maintenanceRepairsAnnual || 0).toLocaleString()}`, rightCol, yPos);
        yPos += 8;
        
        doc.text(`Utilities: $${Math.round(utilitiesAnnual || 0).toLocaleString()}`, leftCol, yPos);
        doc.text(`Contract Services: $${Math.round(contractServicesAnnual || 0).toLocaleString()}`, rightCol, yPos);
        yPos += 8;
        
        doc.text(`Payroll: $${Math.round(payrollAnnual || 0).toLocaleString()}`, leftCol, yPos);
        doc.text(`Marketing: $${Math.round(marketingAnnual || 0).toLocaleString()}`, rightCol, yPos);
        yPos += 8;
        
        doc.text(`G&A: $${Math.round(gAndAAnnual || 0).toLocaleString()}`, leftCol, yPos);
        doc.text(`Other Expenses: $${Math.round(otherExpensesAnnual || 0).toLocaleString()}`, rightCol, yPos);
        yPos += 8;
      }
      
      doc.text(`Expense Growth Rate: ${expenseGrowthRate || 0}%`, leftCol, yPos);
      
      // Capital Expenditures Section
      yPos += 20;
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('CAPITAL EXPENDITURES', margin, yPos);
      doc.line(margin, yPos + 2, rightMargin, yPos + 2);
      
      yPos += 15;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      doc.text(`Capital Reserve/Unit (Annual): $${Math.round(capitalReservePerUnitAnnual || 0).toLocaleString()}`, leftCol, yPos);
      doc.text(`Deferred Capital Reserve/Unit: $${Math.round(deferredCapitalReservePerUnit || 0).toLocaleString()}`, rightCol, yPos);
      yPos += 8;
      
      doc.text(`Holding Period: ${holdingPeriodYears || 0} years`, leftCol, yPos);
      
      // Footer
      yPos = pageHeight - 20;
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Generated by MultifamilyOS.ai - The AI Operating System for Multifamily Investing', margin, yPos);
      
      // Save the PDF
      const propertyName = propertyStreet ? propertyStreet.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'investment_analysis';
      const fileName = `${propertyName}_analysis_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Custom Tooltip Content for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm text-gray-700 font-semibold">{`Year: ${label}`}</p>
          <p className="text-sm text-blue-600">{`Cumulative Cash Flow: ${formatCurrency(data.cumulativeCashFlow)}`}</p>
          <p className="text-sm text-emerald-600">{`Annual NOI: ${formatCurrency(data.noi)}`}</p>
          <p className="text-sm text-purple-600">{`Annual Cash Flow (BT): ${formatCurrency(data.cashFlowBeforeTax)}`}</p>
        </div>
      );
    }
    return null;
  };

  // Show loading while checking access or redirect disabled users
  if (isLoadingAccess || (userClass === 'disabled' && !hasOfferAnalyzerAccess)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <SearchParamsHandler onParamsLoaded={handleParamsLoaded} />
      </Suspense>
      
    <div className="flex flex-col lg:flex-row p-6 bg-gray-50 text-gray-800 min-h-screen">
      {/* Hidden file input for loading settings */}
      <div className="lg:w-2/3 pr-0 lg:pr-8 mb-8 lg:mb-0">

        {/* Back Button - show when coming from specific pages */}
        {(submissionId || source) && (
          <button
            onClick={() => {
              if (submissionId) {
                router.push(`/fund/browse/${submissionId}`);
              } else if (source === 'engage') {
                router.push('/engage');
              } else if (source === 'discover' && propertyId) {
                router.push(`/discover/property/${propertyId}`);
              } else if (source === 'create') {
                router.push('/fund/create');
              } else {
                router.back();
              }
            }}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        )}

        <div className="flex justify-between items-end mb-6">
          {/* Investment Grade Card - Modern Charlie2 Style */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-lg shadow-lg flex items-center text-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-blue-100 font-medium">Investment Grade</p>
                <p className="text-2xl font-bold">{overallGrade}</p>
              </div>
            </div>
          </div>
          {/* Offer Analysis button removed - analysis now on property details page */}
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 h-[400px] md:h-[500px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 30, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="year"
                label={{ value: 'Time (Years)', position: 'insideBottom', offset: -20, fill: '#4B5563', dy: 10 }}
                tickFormatter={(tick) => `Yr ${tick}`}
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                interval="preserveStartEnd"
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                label={{ value: 'Cumulative Cash Flow ($)', angle: -90, position: 'insideLeft', fill: '#4B5563', dx: -25, dy: 50 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                domain={['auto', 'auto']}
                allowDataOverflow={false}
                width={80}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2563EB', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ color: '#4B5563', paddingBottom: '10px' }}
                payload={[
                  { value: 'Cumulative Cash Flow', type: 'line', id: 'ID01', color: '#2563EB' },
                  { value: 'Annual NOI', type: 'line', id: 'ID02', color: '#10B981' },
                  { value: 'Annual Cash Flow (Before Tax)', type: 'line', id: 'ID03', color: '#8B5CF6' }
                ]}
              />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />
              {breakEvenYear !== null && (
                <ReferenceLine
                  x={breakEvenYear}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  label={{
                    value: `Break-Even (Yr ${breakEvenYear})`,
                    fill: '#EF4444',
                    position: 'insideTopRight',
                    fontSize: 12,
                    dy: -10,
                    dx: 10
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="cumulativeCashFlow"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#2563EB', stroke: '#FFF' }}
                name="Cumulative Cash Flow"
              />
              <Line
                type="monotone"
                dataKey="noi"
                stroke="#10B981"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 1, fill: '#10B981', stroke: '#FFF' }}
                name="Annual NOI"
              />
              <Line
                type="monotone"
                dataKey="cashFlowBeforeTax"
                stroke="#8B5CF6"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 1, fill: '#8B5CF6', stroke: '#FFF' }}
                name="Annual Cash Flow (Before Tax)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Column 1 - Row 1 */}
          <CharlieTooltip message="Total rental income after vacancy. The foundation of every deal—if this number's wrong, the entire analysis is worthless.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Gross Operating Income</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(effectiveGrossIncome)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 2 - Row 1 */}
          <CharlieTooltip message="Net Operating Income—the money left after all operating expenses. This pays the mortgage and generates cash flow. The most critical number in real estate.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Net Operating Income</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(netOperatingIncome)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 3 - Row 1 */}
          <CharlieTooltip message="How well your property covers its debt payments. 1.25+ is what lenders want. Below 1.0 means you're paying out of pocket every month.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Debt Service Coverage Ratio</h3>
              <p className="text-2xl font-bold text-gray-900">{debtServiceCoverageRatio.toFixed(2)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 1 - Row 2 */}
          <CharlieTooltip message="Percentage of income consumed by expenses. Under 50% is excellent. Over 60% means the property is working against you.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Expense Ratio (Year 1)</h3>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(expenseRatio)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 2 - Row 2 */}
          <CharlieTooltip message="Money in your pocket each month after debt service. Positive is good, negative means you're feeding the property every month.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Cash Flow (Before Tax)</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowBeforeTax)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 3 - Row 2 */}
          <CharlieTooltip message="Return on actual cash invested in year one. Immediate gratification—the cash return on the down payment and closing costs.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Cash-on-Cash Return (Year 1)</h3>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(cashOnCashReturn)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 1 - Row 3 */}
          <CharlieTooltip message="Cash flow after setting aside money for future repairs and improvements. This is your real spendable cash—don't forget the reserves!">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Cash Flow (After Capital Reserve)</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowAfterCapitalReserve)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 2 - Row 3 */}
          <CharlieTooltip message="Total return if sold at the end of the holding period. Includes all cash flow plus sale proceeds. The ultimate performance metric.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Total ROI ({holdingPeriodYears} Year)</h3>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(roiAtHorizon)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 3 - Row 3 */}
          <CharlieTooltip message="Annual return including cash flow AND appreciation. The gold standard metric—double digits are excellent but market reality matters.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Internal Rate of Return ({holdingPeriodYears} Year)</h3>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(irr)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 1 - Row 4 */}
          <CharlieTooltip message="Annual payment to the bank. This comes out of NOI first—everything else is profit. Keep debt service manageable.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">
                {loanStructure === 'interest-only' ? 'Annual IO Payment' : 'Annual Debt Service'}
              </h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(annualDebtService)}</p>
              {loanStructure === 'interest-only' && refinanceTermYears === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Sale required by Year {interestOnlyPeriodYears}
                </p>
              )}
              {loanStructure === 'interest-only' && refinanceTermYears > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Refinance required by Year {interestOnlyPeriodYears}
                </p>
              )}
            </div>
          </CharlieTooltip>

          {/* Column 2 - Row 4 */}
          <CharlieTooltip message="How much you still owe the bank after one year. With interest-only loans, this doesn't change much. That's the point.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Loan Balance (Year 1)</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(year1LoanBalance)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 3 - Row 4 */}
          <CharlieTooltip message="NOI divided by purchase price. Like a stock dividend—higher is better, but don't chase cap rates into bad neighborhoods.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Cap Rate (Year 1)</h3>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(capRate)}</p>
            </div>
          </CharlieTooltip>

          {/* Column 1 - Row 5 */}
          <CharlieTooltip message="When your cumulative cash flow turns positive and you stop feeding the deal. The sooner the better—deals that never break even are wealth destroyers.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Break-Even Point</h3>
              <p className="text-2xl font-bold text-gray-900">
                {breakEvenYear !== null ? `${breakEvenYear} years` : 'N/A (No positive cash flow within horizon)'}
              </p>
            </div>
          </CharlieTooltip>

          {/* Column 2 - Row 5 */}
          <CharlieTooltip message="Property value at sale minus remaining debt. The ultimate payday—appreciation plus principal paydown over time.">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 cursor-pointer">
              <h3 className="text-md font-semibold text-blue-600 mb-1">Projected Equity (at Year {holdingPeriodYears})</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(projectedEquityAtHorizon)}</p>
            </div>
          </CharlieTooltip>
        </div>

      </div>

      <div className="print-assumptions lg:w-1/3 bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:sticky lg:top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Investment Assumptions</h2>
          </div>
          <div className="flex space-x-2 relative" style={{ minHeight: '40px', minWidth: '200px' }}>
            <button
              onClick={handleToggle}
              className="flex-1 px-4 py-2 text-white rounded-lg transform transition-all duration-150 text-sm hover:scale-105 active:scale-95 active:bg-gray-700"
              style={{ backgroundColor: toggleState === 'clear' ? '#6B7280' : '#1C599F' }}
            >
              {toggleState === 'clear' ? 'Clear' : 'Defaults'}
            </button>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              disabled={isReadOnly}
              className={`flex-1 px-4 py-2 rounded-lg transform transition-all duration-150 text-sm hover:scale-105 active:scale-95 ${
                isReadOnly 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              }`}
            >
              Actions
            </button>
            {showMoreMenu && (
              <div
                ref={moreMenuRef}
                className="absolute w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                style={{
                  top: '100%',
                  right: '0',
                  marginTop: '4px',
                  position: 'absolute'
                }}
              >
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowSaveOfferModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    Save Analysis
                  </button>
                  <div className="border-t border-gray-100 mx-2"></div>
                  <button
                    onClick={() => {
                      handleViewOffers();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    Load Analysis
                  </button>
                  <div className="border-t border-gray-100 mx-2"></div>
                  <button
                    onClick={() => {
                      handlePrintAnalysis();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    Print to PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-gray-200 pb-2 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Financing</h3>
        </div>
        <div className="mb-5">
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)</label>
          <CharlieTooltip message="This is your offer price. Don't get emotional—stick to the numbers. What can you realistically pay and still make money?">
            <input
              type="text"
              id="purchasePrice"
              value={(purchasePrice ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setPurchasePrice)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="10000"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="downPaymentPercentage" className="block text-sm font-medium text-gray-700 mb-1">Down Payment (%)</label>
          <CharlieTooltip message="Most deals need 20-25% down. Less down = higher leverage = higher returns IF the deal works. More down = safer but lower returns.">
            <input
              type="number"
              id="downPaymentPercentage"
              value={downPaymentPercentage || ''}
              onChange={(e) => setDownPaymentPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="0.1"
              min="0"
              max="100"
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
          <CharlieTooltip message="Shop around! A half percent difference on a million-dollar loan costs $5,000/year. Broker relationships matter here.">
            <input
              type="number"
              id="interestRate"
              value={interestRate || ''}
              onChange={(e) => setInterestRate(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="0.1"
            />
          </CharlieTooltip>
        </div>

        {/* Loan Structure Selection */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">Loan Structure</label>
          <CharlieTooltip message="Interest-only gives better cash flow early but higher payments later. Strategic for value-add deals with planned improvements.">
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="loanStructure"
                  value="amortizing"
                  checked={loanStructure === 'amortizing'}
                  onChange={(e) => setLoanStructure(e.target.value as 'amortizing' | 'interest-only')}
                  className="mr-2 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Amortizing Loan</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="loanStructure"
                  value="interest-only"
                  checked={loanStructure === 'interest-only'}
                  onChange={(e) => setLoanStructure(e.target.value as 'amortizing' | 'interest-only')}
                  className="mr-2 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Interest-Only Loan</span>
              </label>
            </div>
          </CharlieTooltip>
        </div>

        {/* Conditional Fields Based on Loan Structure */}
        {loanStructure === 'amortizing' ? (
          <div className="mb-5">
            <label htmlFor="amortizationPeriodYears" className="block text-sm font-medium text-gray-700 mb-1">Amortization Period (Years)</label>
            <CharlieTooltip message="30 years = lower payments, more cash flow. 25 years = higher payments but faster equity building. Choose based on strategy.">
              <input
                type="number"
                id="amortizationPeriodYears"
                value={amortizationPeriodYears ?? 0}
                onChange={(e) => setAmortizationPeriodYears(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
                step="1"
                min="1"
              />
            </CharlieTooltip>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label htmlFor="interestOnlyPeriodYears" className="block text-sm font-medium text-gray-700 mb-1">Interest-Only Period (Years)</label>
              <CharlieTooltip message="Perfect for value-add deals. Use this time to increase rents, then refinance. Plan the exit before the IO period ends.">
                <input
                  type="number"
                  id="interestOnlyPeriodYears"
                  value={interestOnlyPeriodYears ?? 0}
                  onChange={(e) => setInterestOnlyPeriodYears(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
                  step="1"
                  min="1"
                />
              </CharlieTooltip>
            </div>
            <div>
              <label htmlFor="refinanceTermYears" className="block text-sm font-medium text-gray-700 mb-1">Refinance Term (Years)</label>
              <CharlieTooltip message="Plan the exit strategy now. Sell, refinance, or hold? This term should align with the business plan.">
                <input
                  type="number"
                  id="refinanceTermYears"
                  value={refinanceTermYears ?? 0}
                  onChange={(e) => setRefinanceTermYears(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
                  step="1"
                  min="0"
                />
              </CharlieTooltip>
              <p className="text-xs text-gray-500 mt-1">Enter 0 if planning to sell at end of interest-only period</p>
            </div>
          </div>
        )}

        <div className="mb-5 mt-3">
          <label htmlFor="closingCostsPercentage" className="block text-sm font-medium text-gray-700 mb-1">Closing Costs (%)</label>
          <CharlieTooltip message="Don't forget these! They add up fast. Budget 2-4% depending on lender and market. Factor them into return calculations.">
            <input
              type="number"
              id="closingCostsPercentage"
              value={closingCostsPercentage || ''}
              onChange={(e) => setClosingCostsPercentage(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="0.1"
              min="0"
            />
          </CharlieTooltip>
        </div>

        {/* Disposition Cap Rate */}
        <div className="mb-5">
          <label htmlFor="dispositionCapRate" className="block text-sm font-medium text-gray-700 mb-1">Disposition Cap Rate (%)</label>
          <CharlieTooltip message="What cap rate at sale? Be conservative—markets change. Assume 0.5-1% higher than current market rates.">
            <input
              type="number"
              id="dispositionCapRate"
              value={dispositionCapRate || ''}
              onChange={(e) => setDispositionCapRate(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="0.1"
              min="0"
            />
          </CharlieTooltip>
        </div>

        <div className="border-b border-gray-200 pb-2 mb-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900">Rental Income</h3>
        </div>
        <div className="mb-5">
          <label htmlFor="numUnits" className="block text-sm font-medium text-gray-700 mb-1">Number of Units</label>
          <CharlieTooltip message="More units = more stability. Fewer units = higher risk but potentially higher returns per unit. Know your market.">
            <input
              type="text"
              id="numUnits"
              value={(numUnits ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setNumUnits)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="avgMonthlyRentPerUnit" className="block text-sm font-medium text-gray-700 mb-1">Avg Monthly Rent (per unit) ($)</label>
          <CharlieTooltip message="This should be market rent, not current rent. What can the property actually command? Drive the comps personally.">
            <input
              type="text"
              id="avgMonthlyRentPerUnit"
              value={(avgMonthlyRentPerUnit ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setAvgMonthlyRentPerUnit)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="vacancyRate" className="block text-sm font-medium text-gray-700 mb-1">Vacancy Rate (%)</label>
          <CharlieTooltip message="Don't be optimistic! Even the best properties have turnover. Use 5-10% minimum, higher for value-add deals.">
            <input
              type="number"
              id="vacancyRate"
              value={vacancyRate || ''}
              onChange={(e) => setVacancyRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="0.1"
              min="0"
              max="100"
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="annualRentalGrowthRate" className="block text-sm font-medium text-gray-700 mb-1">Annual Rental Growth Rate (%)</label>
          <CharlieTooltip message="Inflation is an ally in real estate. But don't assume boom-era growth rates. Be realistic—1-3% is usually safe.">
            <input
              type="number"
              id="annualRentalGrowthRate"
              value={annualRentalGrowthRate || ''}
              onChange={(e) => setAnnualRentalGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="0.1"
              min="0"
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="otherIncomeAnnual" className="block text-sm font-medium text-gray-700 mb-1">Other Income ($)</label>
          <CharlieTooltip message="Laundry, parking, pet fees, storage—every dollar counts. But don't rely on income that doesn't exist yet.">
            <input
              type="text"
              id="otherIncomeAnnual"
              value={(otherIncomeAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setOtherIncomeAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="incomeReductionsAnnual" className="block text-sm font-medium text-gray-700 mb-1">Income Reducers ($)</label>
          <CharlieTooltip message="Concessions, bad debt, employee unit discounts. The stuff that hits your bottom line but isn't an 'expense.'">
            <input
              type="text"
              id="incomeReductionsAnnual"
              value={(incomeReductionsAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setIncomeReductionsAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="border-b border-gray-200 pb-2 mb-6 mt-8">
          <div className="flex items-center justify-between">
            <h3 id="operating-expenses-section" className="text-lg font-semibold text-gray-900">Operating Expenses</h3>
            <button
              onClick={() => setUsePercentageMode(!usePercentageMode)}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {usePercentageMode ? 'Use Detailed Breakdown' : 'Use % Estimate'}
            </button>
          </div>
        </div>

        {usePercentageMode ? (
          <div>
            <div className="mb-5">
              <label htmlFor="operatingExpensePercentage" className="block text-sm font-medium text-gray-700 mb-1">Operating Expense Ratio (%)</label>
              <CharlieTooltip message={`Industry rule of thumb based on 25+ years of experience. These are guidelines - adjust based on specific property and market conditions.

• All Bills Paid, 1985 or older: 60%+ of gross income
• Tenant Paid, 1986-2010: 45-55% of gross income
• Tenant Paid, 2011 and newer: 35-40% of gross income`}>
                <input
                  type="text"
                  id="operatingExpensePercentage"
                  value={operatingExpensePercentage}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.]/g, ''); // Allow only digits and decimal
                    const numValue = parseFloat(value);
                    
                    if (value === '' || !isNaN(numValue)) {
                      setOperatingExpensePercentage(numValue || 0);
                    }
                  }}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="45"
                />
              </CharlieTooltip>
              {(operatingExpensePercentage < 20 || operatingExpensePercentage > 80) && (
                <p className="text-red-600 text-sm mt-1">Please enter a percentage between 20% and 80%</p>
              )}
            </div>
            
            <div className="mb-5">
              <label htmlFor="expenseGrowthRate" className="block text-sm font-medium text-gray-700 mb-1">Expense Growth Rate (%)</label>
              <CharlieTooltip message="Expenses grow faster than rent in many markets. Don't assume they stay flat—that's the #1 rookie mistake.">
                <input
                  type="number"
                  id="expenseGrowthRate"
                  value={expenseGrowthRate ?? 0}
                  onChange={(e) => setExpenseGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
                  step="0.1"
                  min="0"
                />
              </CharlieTooltip>
            </div>
          </div>
        ) : (
          <div>
        <div className="mb-5">
          <label htmlFor="propertyTaxes" className="block text-sm font-medium text-gray-700 mb-1">Property Taxes ($)</label>
          <CharlieTooltip message="These will go up! Especially after you improve the property. Budget for reassessment—it's coming.">
            <input
              type="text"
              id="propertyTaxes"
              value={(propertyTaxes ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setPropertyTaxes)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="insurance" className="block text-sm font-medium text-gray-700 mb-1">Insurance ($)</label>
          <CharlieTooltip message="Shop this annually. And get the right coverage—don't cheap out on liability. One lawsuit can kill your returns.">
            <input
              type="text"
              id="insurance"
              value={(insurance ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setInsurance)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="propertyManagementFeePercentage" className="block text-sm font-medium text-gray-700 mb-1">Property Management Fee (%)</label>
          <CharlieTooltip message="Good management is worth every penny. Bad management will cost you more than the fee. Interview multiple companies.">
            <input
              type="number"
              id="propertyManagementFeePercentage"
              value={propertyManagementFeePercentage || ''}
              onChange={(e) => setPropertyManagementFeePercentage(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="0.1"
              min="0"
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="maintenanceRepairsAnnual" className="block text-sm font-medium text-gray-700 mb-1">Maintenance & Repairs ($)</label>
          <CharlieTooltip message="Deferred maintenance is a profit killer. Budget generously here—better to overestimate than get surprised.">
            <input
              type="text"
              id="maintenanceRepairsAnnual"
              value={(maintenanceRepairsAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setMaintenanceRepairsAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="utilitiesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Utilities ($)</label>
          <CharlieTooltip message="Who pays what? Separate meters save you money. Master metered properties need higher budgets.">
            <input
              type="text"
              id="utilitiesAnnual"
              value={(utilitiesAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setUtilitiesAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="contractServicesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Contract Services ($)</label>
          <CharlieTooltip message="Landscaping, elevator, HVAC contracts. Lock in good vendors early—they're hard to find and keep.">
            <input
              type="text"
              id="contractServicesAnnual"
              value={(contractServicesAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setContractServicesAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="payrollAnnual" className="block text-sm font-medium text-gray-700 mb-1">Payroll ($)</label>
          <CharlieTooltip message="On-site staff for 50+ units usually makes sense. Factor in benefits, not just wages.">
            <input
              type="text"
              id="payrollAnnual"
              value={(payrollAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setPayrollAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="marketingAnnual" className="block text-sm font-medium text-gray-700 mb-1">Marketing ($)</label>
          <CharlieTooltip message="Good marketing keeps vacancy low. Apartment finders, online listings, signage—it all adds up but pays for itself.">
            <input
              type="text"
              id="marketingAnnual"
              value={(marketingAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setMarketingAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="gAndAAnnual" className="block text-sm font-medium text-gray-700 mb-1">G&A ($)</label>
          <CharlieTooltip message="General & Administrative—the miscellaneous expenses. Legal, accounting, office supplies. Usually 2-5% of gross income.">
            <input
              type="text"
              id="gAndAAnnual"
              value={(gAndAAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setGAndAAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="otherExpensesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Other Expenses ($)</label>
          <CharlieTooltip message="The catch-all category. There's always something. Budget for it or get surprised by it.">
            <input
              type="text"
              id="otherExpensesAnnual"
              value={(otherExpensesAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setOtherExpensesAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="100"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>

        <div className="mb-5">
          <label htmlFor="expenseGrowthRate" className="block text-sm font-medium text-gray-700 mb-1">Expense Growth Rate (%)</label>
          <CharlieTooltip message="Expenses grow faster than rent in many markets. Don't assume they stay flat—that's the #1 rookie mistake.">
            <input
              type="number"
              id="expenseGrowthRate"
              value={expenseGrowthRate ?? 0}
              onChange={(e) => setExpenseGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="0.1"
              min="0"
            />
          </CharlieTooltip>
        </div>
          </div>
        )}

        <div className="border-b border-gray-200 pb-2 mb-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900">Capital Expenditures</h3>
        </div>
        <div className="mb-5">
          <label htmlFor="capitalReservePerUnitAnnual" className="block text-sm font-medium text-gray-700 mb-1">Capital Reserve (per unit) ($)</label>
          <CharlieTooltip message="The 'stuff breaks' fund. HVAC, roofs, parking lots—big ticket items. Use $300-500/unit minimum.">
            <input
              type="text"
              id="capitalReservePerUnitAnnual"
              value={(capitalReservePerUnitAnnual ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setCapitalReservePerUnitAnnual)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="10"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>
        <div className="mb-5">
          <label htmlFor="deferredCapitalReservePerUnit" className="block text-sm font-medium text-gray-700 mb-1">Deferred Capital Reserve (per unit) ($)</label>
          <CharlieTooltip message="Buying a fixer-upper? This is your renovation budget per unit. Be generous—construction always costs more.">
            <input
              type="text"
              id="deferredCapitalReservePerUnit"
              value={(deferredCapitalReservePerUnit ?? 0).toLocaleString('en-US')}
              onChange={formatAndParseNumberInput(setDeferredCapitalReservePerUnit)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="10"
              suppressHydrationWarning={true}
            />
          </CharlieTooltip>
        </div>
        <div className="mb-6">
          <label htmlFor="holdingPeriodYears" className="block text-sm font-medium text-gray-700 mb-1">Holding Period (Years)</label>
          <CharlieTooltip message="How long before selling or refinancing? Longer holds smooth out market volatility but tie up capital.">
            <div className="flex items-center">
              <input
                type="range"
                id="holdingPeriodYears"
                min="1"
                max="50"
                value={holdingPeriodYears ?? 0}
                onChange={(e) => setHoldingPeriodYears(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="ml-3 text-gray-700 font-medium w-10 text-right">{holdingPeriodYears}</span>
            </div>
          </CharlieTooltip>
        </div>
      </div>
    </div>
    
    {/* Unsaved Changes Modal */}
    <UnsavedChangesModal
      isOpen={showUnsavedChangesModal}
      onStay={handleStayAndSave}
      onLeave={handleLeaveWithoutSaving}
    />
    
    {/* Save Offer Modal */}
    <SaveOfferModal
      isOpen={showSaveOfferModal}
      onClose={() => setShowSaveOfferModal(false)}
      onSave={handleSaveOffer}
    />

    {/* Duplicate Analysis Name Warning */}
    <AlertModal
      isOpen={showDuplicateAlert}
      onClose={handleCancelOverwrite}
      type="warning"
      title="Analysis Name Already Exists"
      message={`An analysis named "${pendingOfferData?.name}" already exists for this property. Do you want to replace the existing analysis?`}
      confirmText="Replace Existing"
      cancelText="Choose Different Name"
      onConfirm={handleConfirmOverwrite}
    />
    
    {/* Offers Modal */}
    {showOffersModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Select an Analysis</h3>
            <button
              onClick={() => setShowOffersModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedPropertyOffers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No offers have been created yet.</p>
            ) : (
              selectedPropertyOffers.map((offer) => (
                <div
                  key={offer.id}
                  onClick={() => handleOfferSelection(offer)}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{offer.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{offer.property_address}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-blue-600">{offer.offer_amount}</div>
                        <div className="text-xs text-gray-500">{offer.created_date}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOffer(offer.id);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete offer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setShowOffersModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </AuthGuard>
  );
}