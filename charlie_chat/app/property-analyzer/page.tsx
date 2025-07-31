'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GradeMetrics, MultifamilyMarketBenchmarks, PropertyCharacteristics, MultifamilyGradeMetrics, MULTIFAMILY_BENCHMARKS, detectAssetClass, detectMarketTier, calculateMultifamilyGrade } from './grading-system';
import { generatePropertySummary, PropertySummaryButton } from './summary-generator';
import { useAuth } from '@/contexts/AuthContext';
import { usePropertyAnalyzerAccess } from './usePropertyAnalyzerAccess';
import { UnsavedChangesModal } from './UnsavedChangesModal';
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



export default function PropertyAnalyzerPage() {
  // Get user authentication and access control
  const { user: currentUser } = useAuth();
  const { userClass, hasAccess: hasPropertyAnalyzerAccess, isLoading: isLoadingAccess } = usePropertyAnalyzerAccess();
  const router = useRouter();

  // --- Modal State ---
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const allowLeavingRef = useRef(false);

  // --- Input States: FINANCING ---
  const [purchasePrice, setPurchasePrice] = useState<number>(7000000);
  const [downPaymentPercentage, setDownPaymentPercentage] = useState<number>(20); // Percentage
  const [interestRate, setInterestRate] = useState<number>(7.0); // Percentage
  const [loanStructure, setLoanStructure] = useState<'amortizing' | 'interest-only'>('amortizing'); // New loan structure selection
  const [amortizationPeriodYears, setAmortizationPeriodYears] = useState<number>(30); // Years (updated from 24 to 30)
  const [interestOnlyPeriodYears, setInterestOnlyPeriodYears] = useState<number>(10); // Years for IO period
  const [refinanceTermYears, setRefinanceTermYears] = useState<number>(25); // Years (0 means sale)
  const [closingCostsPercentage, setClosingCostsPercentage] = useState<number>(3); // Percentage of Purchase Price
  const [dispositionCapRate, setDispositionCapRate] = useState<number>(6); // Target cap rate at sale

  // --- Input States: RENTS ---
  const [numUnits, setNumUnits] = useState<number>(47);
  const [avgMonthlyRentPerUnit, setAvgMonthlyRentPerUnit] = useState<number>(2500);
  const [vacancyRate, setVacancyRate] = useState<number>(10); // Percentage
  const [annualRentalGrowthRate, setAnnualRentalGrowthRate] = useState<number>(2); // Percentage
  const [otherIncomeAnnual, setOtherIncomeAnnual] = useState<number>(0); // New State for Other Income
  const [incomeReductionsAnnual, setIncomeReductionsAnnual] = useState<number>(0); // New State for Income Reductions

  // --- Input States: OPERATING EXPENSES (ANNUAL) ---
  const [propertyTaxes, setPropertyTaxes] = useState<number>(12000);
  const [insurance, setInsurance] = useState<number>(10000);
  const [propertyManagementFeePercentage, setPropertyManagementFeePercentage] = useState<number>(6); // Percentage of EGI
  const [maintenanceRepairsAnnual, setMaintenanceRepairsAnnual] = useState<number>(12000); // Total annual
  const [utilitiesAnnual, setUtilitiesAnnual] = useState<number>(6000); // Total annual
  const [contractServicesAnnual, setContractServicesAnnual] = useState<number>(6000); // New expense
  const [payrollAnnual, setPayrollAnnual] = useState<number>(15000); // New expense
  const [marketingAnnual, setMarketingAnnual] = useState<number>(2400); // New expense
  const [gAndAAnnual, setGAndAAnnual] = useState<number>(1200); // New expense
  const [otherExpensesAnnual, setOtherExpensesAnnual] = useState<number>(5000); // Total annual
  const [expenseGrowthRate, setExpenseGrowthRate] = useState<number>(2); // Percentage

  // --- Input States: CAPITAL EXPENDITURES (ANNUAL) ---
  const [capitalReservePerUnitAnnual, setCapitalReservePerUnitAnnual] = useState<number>(500); // Per unit, annual
  const [holdingPeriodYears, setHoldingPeriodYears] = useState<number>(10); // Years
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
    return effectiveGrossIncome * (propertyManagementFeePercentage / 100);
  }, [effectiveGrossIncome, propertyManagementFeePercentage]);

  const totalOperatingExpenses = useMemo(() => {
    return propertyTaxes + insurance + propertyManagementFeeAmount + maintenanceRepairsAnnual + utilitiesAnnual + contractServicesAnnual + payrollAnnual + marketingAnnual + gAndAAnnual + otherExpensesAnnual;
  }, [propertyTaxes, insurance, propertyManagementFeeAmount, maintenanceRepairsAnnual, utilitiesAnnual, contractServicesAnnual, payrollAnnual, marketingAnnual, gAndAAnnual, otherExpensesAnnual]);

  const netOperatingIncome = useMemo(() => {
    return effectiveGrossIncome - totalOperatingExpenses;
  }, [effectiveGrossIncome, totalOperatingExpenses]);

  const expenseRatio = useMemo(() => {
    if (effectiveGrossIncome === 0) return 0;
    return (totalOperatingExpenses / effectiveGrossIncome) * 100; // Percentage
  }, [totalOperatingExpenses, effectiveGrossIncome]);

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
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Property data for 10-year cash flow report (moved into Charlie's Analysis)
  const propertyData = useMemo(() => ({
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
    holdingPeriodYears
  }), [
    purchasePrice, downPaymentPercentage, closingCostsPercentage, interestRate,
    amortizationPeriodYears, loanStructure, interestOnlyPeriodYears, numUnits,
    avgMonthlyRentPerUnit, vacancyRate, annualRentalGrowthRate, otherIncomeAnnual,
    incomeReductionsAnnual, propertyTaxes, insurance, propertyManagementFeePercentage,
    maintenanceRepairsAnnual, utilitiesAnnual, contractServicesAnnual, payrollAnnual,
    marketingAnnual, gAndAAnnual, otherExpensesAnnual, expenseGrowthRate,
    capitalReservePerUnitAnnual, holdingPeriodYears
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
      const currentPropertyManagementFeeAmount = currentEffectiveGrossIncome * (propertyManagementFeePercentage / 100);
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

    // CAPITAL EXPENDITURES
    setCapitalReservePerUnitAnnual(500);
    setDeferredCapitalReservePerUnit(0);
    setHoldingPeriodYears(10);
    
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

  // Custom Tooltip Content for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm text-gray-700 font-semibold">{`Year: ${label}`}</p>
          <p className="text-sm text-orange-600">{`Cumulative Cash Flow: ${formatCurrency(data.cumulativeCashFlow)}`}</p>
          <p className="text-sm text-blue-600">{`Annual NOI: ${formatCurrency(data.noi)}`}</p>
          <p className="text-sm text-green-600">{`Annual Cash Flow (BT): ${formatCurrency(data.cashFlowBeforeTax)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
    <div className="flex flex-col lg:flex-row p-4 md:p-8 bg-white text-gray-800 min-h-screen">
      {/* Hidden file input for loading settings */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileLoad}
      />
      <div className="lg:w-2/3 pr-0 lg:pr-8 mb-8 lg:mb-0">

        <div className="flex justify-between items-end mb-6">
          {/* Investment Grade Blue Box */}
          {/*</div><div className="p-3 rounded-lg shadow-xl flex items-center text-white" style={{ backgroundColor: '#1C599F' }}>*/}
          <div className="p-3 rounded-lg shadow-xl flex items-center text-white h-16" style={{ backgroundColor: '#1C599F' }}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10">
                <img src="/charlie.png" alt="Grade Icon" className="w-full h-full object-contain" />
              </div>
              <p className="text-2xl font-bold">Investment Grade: <span className="text-2xl font-extrabold">{overallGrade}</span></p>
            </div>
          </div>
          <div className="flex justify-end">
            <PropertySummaryButton
              gradeResult={{
                grade: overallGrade,
                score: actualGradingScore,
                breakdown: gradeBreakdown,
                classification: detectedClassification
              }}
              metrics={{
                purchasePrice,
                numUnits,
                avgMonthlyRentPerUnit,
                irr,
                cashOnCashReturn,
                capRate,
                dscr: debtServiceCoverageRatio,
                expenseRatio,
                breakEvenYear
              }}
              userClass={userClass || undefined}
              propertyData={propertyData}
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 md:p-6 rounded-lg shadow-xl border border-gray-200 h-[400px] md:h-[500px] flex items-center justify-center">
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

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F97316', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ color: '#4B5563', paddingBottom: '10px' }}
                payload={[
                  { value: 'Cumulative Cash Flow', type: 'line', id: 'ID01', color: '#F97316' },
                  { value: 'Annual NOI', type: 'line', id: 'ID02', color: '#4A90E2' },
                  { value: 'Annual Cash Flow (Before Tax)', type: 'line', id: 'ID03', color: '#50C878' }
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
                stroke="#F97316"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#F97316', stroke: '#FFF' }}
                name="Cumulative Cash Flow"
              />
              <Line
                type="monotone"
                dataKey="noi"
                stroke="#4A90E2"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 1, fill: '#4A90E2', stroke: '#FFF' }}
                name="Annual NOI"
              />
              <Line
                type="monotone"
                dataKey="cashFlowBeforeTax"
                stroke="#50C878"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 1, fill: '#50C878', stroke: '#FFF' }}
                name="Annual Cash Flow (Before Tax)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Row 1 Metrics */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Gross Operating Income</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(effectiveGrossIncome)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Net Operating Income</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(netOperatingIncome)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Expense Ratio (Year 1)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(expenseRatio)}</p>
          </div>

          {/* Row 2 Metrics: Cap Rate, DSCR, IRR */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cap Rate (Year 1)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(capRate)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Debt Service Coverage Ratio</h3>
            <p className="text-2xl font-bold text-gray-900">{debtServiceCoverageRatio.toFixed(2)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Annualized Return ({holdingPeriodYears} Year)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(irr)}</p>
          </div>

          {/* Row 3 Metrics */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash Flow (Before Tax)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowBeforeTax)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash Flow (After Capital Reserve)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowAfterCapitalReserve)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Total ROI ({holdingPeriodYears} Year)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(roiAtHorizon)}</p>
          </div>

          {/* Row 4 Metrics */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">
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

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Loan Balance (Year 1)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(year1LoanBalance)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Break-Even Point</h3>
            <p className="text-2xl font-bold text-gray-900">
              {breakEvenYear !== null ? `${breakEvenYear} years` : 'N/A (No positive cash flow within horizon)'}
            </p>
          </div>

          {/* Row 5 Metrics */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash-on-Cash Return (Year 1)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(cashOnCashReturn)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Projected Equity (at Year {holdingPeriodYears})</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(projectedEquityAtHorizon)}</p>
          </div>
        </div>

      </div>

      <div className="print-assumptions lg:w-1/3 bg-gray-50 p-6 rounded-xl shadow-2xl border border-gray-200 lg:sticky lg:top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-orange-600">Assumptions</h2>
          <div className="flex space-x-2 relative" style={{ minHeight: '40px', minWidth: '280px' }}>
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-white rounded-lg transform transition-all duration-150 text-sm hover:scale-105 active:scale-95 active:bg-blue-700"
              style={{ backgroundColor: '#1C599F' }}
            >
              Defaults
            </button>
            <button
              onClick={resetAllValues}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transform transition-all duration-150 text-sm hover:scale-105 active:scale-95 active:bg-gray-700"
            >
              Clear
            </button>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform transition-all duration-150 text-sm hover:scale-105 active:scale-95 active:bg-blue-700"
            >
              More...
            </button>
            {showMoreMenu && (
              <div
                ref={moreMenuRef}
                className="absolute w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                style={{
                  top: '100%',
                  right: '0',
                  marginTop: '4px',
                  position: 'absolute'
                }}
              >
                <button
                  onClick={() => {
                    saveSettings();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-t-lg transition-colors cursor-pointer border-b border-gray-100"
                >
                  &gt; Save scenario
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-b-lg transition-colors cursor-pointer"
                >
                  &gt; Load scenario
                </button>
              </div>
            )}
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-gray-700">FINANCING</h3>
        <div className="mb-5">
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)</label>
          <input
            type="text"
            id="purchasePrice"
            value={(purchasePrice ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setPurchasePrice)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="10000"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="downPaymentPercentage" className="block text-sm font-medium text-gray-700 mb-1">Down Payment (%)</label>
          <input
            type="number"
            id="downPaymentPercentage"
            value={downPaymentPercentage || ''}
            onChange={(e) => setDownPaymentPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
            max="100"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
          <input
            type="number"
            id="interestRate"
            value={interestRate || ''}
            onChange={(e) => setInterestRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
          />
        </div>

        {/* Loan Structure Selection */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">Loan Structure</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="loanStructure"
                value="amortizing"
                checked={loanStructure === 'amortizing'}
                onChange={(e) => setLoanStructure(e.target.value as 'amortizing' | 'interest-only')}
                className="mr-2 text-orange-500 focus:ring-orange-500"
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
                className="mr-2 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Interest-Only Loan</span>
            </label>
          </div>
        </div>

        {/* Conditional Fields Based on Loan Structure */}
        {loanStructure === 'amortizing' ? (
          <div className="mb-5">
            <label htmlFor="amortizationPeriodYears" className="block text-sm font-medium text-gray-700 mb-1">Amortization Period (Years)</label>
            <input
              type="number"
              id="amortizationPeriodYears"
              value={amortizationPeriodYears ?? 0}
              onChange={(e) => setAmortizationPeriodYears(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
              step="1"
              min="1"
            />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label htmlFor="interestOnlyPeriodYears" className="block text-sm font-medium text-gray-700 mb-1">Interest-Only Period (Years)</label>
              <input
                type="number"
                id="interestOnlyPeriodYears"
                value={interestOnlyPeriodYears ?? 0}
                onChange={(e) => setInterestOnlyPeriodYears(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
                step="1"
                min="1"
              />
            </div>
            <div>
              <label htmlFor="refinanceTermYears" className="block text-sm font-medium text-gray-700 mb-1">Refinance Term (Years)</label>
              <input
                type="number"
                id="refinanceTermYears"
                value={refinanceTermYears ?? 0}
                onChange={(e) => setRefinanceTermYears(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
                step="1"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Enter 0 if planning to sell at end of interest-only period</p>
            </div>
          </div>
        )}

        <div className="mb-5 mt-3">
          <label htmlFor="closingCostsPercentage" className="block text-sm font-medium text-gray-700 mb-1">Closing Costs (%)</label>
          <input
            type="number"
            id="closingCostsPercentage"
            value={closingCostsPercentage || ''}
            onChange={(e) => setClosingCostsPercentage(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
          />
        </div>

        {/* Disposition Cap Rate */}
        <div className="mb-5">
          <label htmlFor="dispositionCapRate" className="block text-sm font-medium text-gray-700 mb-1">Disposition Cap Rate (%)</label>
          <input
            type="number"
            id="dispositionCapRate"
            value={dispositionCapRate || ''}
            onChange={(e) => setDispositionCapRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
          />
        </div>

        <h3 className="text-xl font-semibold mb-4 text-gray-700 mt-8">RENTS</h3>
        <div className="mb-5">
          <label htmlFor="numUnits" className="block text-sm font-medium text-gray-700 mb-1">Number of Units</label>
          <input
            type="text"
            id="numUnits"
            value={(numUnits ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setNumUnits)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="avgMonthlyRentPerUnit" className="block text-sm font-medium text-gray-700 mb-1">Avg Monthly Rent (per unit) ($)</label>
          <input
            type="text"
            id="avgMonthlyRentPerUnit"
            value={(avgMonthlyRentPerUnit ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setAvgMonthlyRentPerUnit)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="vacancyRate" className="block text-sm font-medium text-gray-700 mb-1">Vacancy Rate (%)</label>
          <input
            type="number"
            id="vacancyRate"
            value={vacancyRate || ''}
            onChange={(e) => setVacancyRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
            max="100"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="annualRentalGrowthRate" className="block text-sm font-medium text-gray-700 mb-1">Annual Rental Growth Rate (%)</label>
          <input
            type="number"
            id="annualRentalGrowthRate"
            value={annualRentalGrowthRate || ''}
            onChange={(e) => setAnnualRentalGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="otherIncomeAnnual" className="block text-sm font-medium text-gray-700 mb-1">Other Income ($)</label>
          <input
            type="text"
            id="otherIncomeAnnual"
            value={(otherIncomeAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setOtherIncomeAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="incomeReductionsAnnual" className="block text-sm font-medium text-gray-700 mb-1">Income Reducers ($)</label>
          <input
            type="text"
            id="incomeReductionsAnnual"
            value={(incomeReductionsAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setIncomeReductionsAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <h3 id="operating-expenses-section" className="text-xl font-semibold mb-4 text-gray-700 mt-8">OPERATING EXPENSES (ANNUAL)</h3>
        <div className="mb-5">
          <label htmlFor="propertyTaxes" className="block text-sm font-medium text-gray-700 mb-1">Property Taxes ($)</label>
          <input
            type="text"
            id="propertyTaxes"
            value={(propertyTaxes ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setPropertyTaxes)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="insurance" className="block text-sm font-medium text-gray-700 mb-1">Insurance ($)</label>
          <input
            type="text"
            id="insurance"
            value={(insurance ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setInsurance)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="propertyManagementFeePercentage" className="block text-sm font-medium text-gray-700 mb-1">Property Management Fee (%)</label>
          <input
            type="number"
            id="propertyManagementFeePercentage"
            value={propertyManagementFeePercentage || ''}
            onChange={(e) => setPropertyManagementFeePercentage(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="maintenanceRepairsAnnual" className="block text-sm font-medium text-gray-700 mb-1">Maintenance & Repairs ($)</label>
          <input
            type="text"
            id="maintenanceRepairsAnnual"
            value={(maintenanceRepairsAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setMaintenanceRepairsAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="utilitiesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Utilities ($)</label>
          <input
            type="text"
            id="utilitiesAnnual"
            value={(utilitiesAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setUtilitiesAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="contractServicesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Contract Services ($)</label>
          <input
            type="text"
            id="contractServicesAnnual"
            value={(contractServicesAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setContractServicesAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="payrollAnnual" className="block text-sm font-medium text-gray-700 mb-1">Payroll ($)</label>
          <input
            type="text"
            id="payrollAnnual"
            value={(payrollAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setPayrollAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="marketingAnnual" className="block text-sm font-medium text-gray-700 mb-1">Marketing ($)</label>
          <input
            type="text"
            id="marketingAnnual"
            value={(marketingAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setMarketingAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="gAndAAnnual" className="block text-sm font-medium text-gray-700 mb-1">G&A ($)</label>
          <input
            type="text"
            id="gAndAAnnual"
            value={(gAndAAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setGAndAAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="otherExpensesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Other Expenses ($)</label>
          <input
            type="text"
            id="otherExpensesAnnual"
            value={(otherExpensesAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setOtherExpensesAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="expenseGrowthRate" className="block text-sm font-medium text-gray-700 mb-1">Expense Growth Rate (%)</label>
          <input
            type="number"
            id="expenseGrowthRate"
            value={expenseGrowthRate ?? 0}
            onChange={(e) => setExpenseGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
          />
        </div>

        <h3 className="text-xl font-semibold mb-4 text-gray-700 mt-8">CAPITAL EXPENDITURES (ANNUAL)</h3>
        <div className="mb-5">
          <label htmlFor="capitalReservePerUnitAnnual" className="block text-sm font-medium text-gray-700 mb-1">Capital Reserve (per unit) ($)</label>
          <input
            type="text"
            id="capitalReservePerUnitAnnual"
            value={(capitalReservePerUnitAnnual ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setCapitalReservePerUnitAnnual)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="10"
            suppressHydrationWarning={true}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="deferredCapitalReservePerUnit" className="block text-sm font-medium text-gray-700 mb-1">Deferred Capital Reserve (per unit) ($)</label>
          <input
            type="text"
            id="deferredCapitalReservePerUnit"
            value={(deferredCapitalReservePerUnit ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setDeferredCapitalReservePerUnit)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="10"
            suppressHydrationWarning={true}
          />
        </div>
        <div className="mb-6">
          <label htmlFor="holdingPeriodYears" className="block text-sm font-medium text-gray-700 mb-1">Holding Period (Years)</label>
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
        </div>
      </div>
    </div>
    
    {/* Unsaved Changes Modal */}
    <UnsavedChangesModal
      isOpen={showUnsavedChangesModal}
      onStay={handleStayAndSave}
      onLeave={handleLeaveWithoutSaving}
    />
  </>
  );
}