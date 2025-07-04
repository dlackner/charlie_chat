'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { generatePropertySummary, PropertySummaryButton } from './summary-generator';
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
// --- Multifamily-Specific Investment Grading System ---
interface GradeMetrics {
  irr: number;
  roiAtHorizon: number;
  cashOnCashReturn: number;
  debtServiceCoverageRatio: number;
  capRate: number;
  breakEvenYear: number | null;
  netOperatingIncome: number;
  cashFlowBeforeTax: number;
  purchasePrice: number;
}

interface MultifamilyMarketBenchmarks {
  avgIRR: number;
  avgCashOnCash: number;
  avgDSCR: number;
  avgCapRate: number;
  avgExpenseRatio: number;
}

interface PropertyCharacteristics {
  purchasePrice: number;
  numUnits: number;
  avgMonthlyRentPerUnit: number;
  capRate: number;
  expenseRatio: number;
}

interface MultifamilyGradeMetrics extends GradeMetrics {
  expenseRatio: number;
  assetClass?: 'a-class' | 'b-class' | 'c-class' | 'value-add';
  marketTier?: 'tier-1' | 'tier-2' | 'tier-3' | 'emerging';
}

// Current 2024/2025 Multifamily Market Benchmarks
const MULTIFAMILY_BENCHMARKS = {
  assetClass: {
    'a-class': { avgIRR: 8.5, avgCashOnCash: 3.5, avgDSCR: 1.20, avgCapRate: 4.7, avgExpenseRatio: 35 },
    'b-class': { avgIRR: 10.0, avgCashOnCash: 4.5, avgDSCR: 1.25, avgCapRate: 4.9, avgExpenseRatio: 40 },
    'c-class': { avgIRR: 12.0, avgCashOnCash: 6.0, avgDSCR: 1.30, avgCapRate: 5.4, avgExpenseRatio: 45 },
    'value-add': { avgIRR: 14.0, avgCashOnCash: 5.5, avgDSCR: 1.15, avgCapRate: 5.2, avgExpenseRatio: 50 }
  },
  marketTier: {
    'tier-1': { avgIRR: 8.0, avgCashOnCash: 3.0, avgDSCR: 1.20, avgCapRate: 4.2, avgExpenseRatio: 38 },
    'tier-2': { avgIRR: 10.0, avgCashOnCash: 4.5, avgDSCR: 1.25, avgCapRate: 4.8, avgExpenseRatio: 42 },
    'tier-3': { avgIRR: 12.0, avgCashOnCash: 5.5, avgDSCR: 1.30, avgCapRate: 5.5, avgExpenseRatio: 45 },
    'emerging': { avgIRR: 14.0, avgCashOnCash: 7.0, avgDSCR: 1.35, avgCapRate: 6.2, avgExpenseRatio: 48 }
  }
};

// Auto-detect asset class based on property characteristics
const detectAssetClass = (characteristics: PropertyCharacteristics): string => {
  const { purchasePrice, numUnits, avgMonthlyRentPerUnit, capRate, expenseRatio } = characteristics;

  const pricePerUnit = purchasePrice / numUnits;
  let score = 0;

  // Price per unit scoring (40% weight)
  if (pricePerUnit >= 300000) score += 40;
  else if (pricePerUnit >= 200000) score += 30;
  else if (pricePerUnit >= 100000) score += 20;
  else score += 10;

  // Monthly rent scoring (30% weight)
  if (avgMonthlyRentPerUnit >= 2500) score += 30;
  else if (avgMonthlyRentPerUnit >= 1800) score += 25;
  else if (avgMonthlyRentPerUnit >= 1200) score += 20;
  else score += 10;

  // Cap rate scoring (20% weight) - Lower cap = higher class
  if (capRate <= 4.5) score += 20;
  else if (capRate <= 5.5) score += 15;
  else if (capRate <= 6.5) score += 10;
  else score += 5;

  // Expense ratio scoring (10% weight) - Lower expenses = higher class
  if (expenseRatio <= 35) score += 10;
  else if (expenseRatio <= 45) score += 8;
  else if (expenseRatio <= 55) score += 6;
  else score += 3;

  if (score >= 85) return 'a-class';
  else if (score >= 65) return 'b-class';
  else if (score >= 45) return 'c-class';
  else return 'value-add';
};

// Auto-detect market tier based on pricing
const detectMarketTier = (characteristics: PropertyCharacteristics): string => {
  const { purchasePrice, numUnits, avgMonthlyRentPerUnit } = characteristics;

  const pricePerUnit = purchasePrice / numUnits;
  let score = 0;

  // Price per unit indicators
  if (pricePerUnit >= 400000) score += 40;
  else if (pricePerUnit >= 250000) score += 30;
  else if (pricePerUnit >= 150000) score += 20;
  else score += 10;

  // Rent level indicators
  if (avgMonthlyRentPerUnit >= 3000) score += 30;
  else if (avgMonthlyRentPerUnit >= 2000) score += 25;
  else if (avgMonthlyRentPerUnit >= 1400) score += 20;
  else score += 10;

  if (score >= 60) return 'tier-1';
  else if (score >= 45) return 'tier-2';
  else if (score >= 30) return 'tier-3';
  else return 'emerging';
};

// Enhanced Grading System for Multifamily Properties
const calculateMultifamilyGrade = (
  metrics: MultifamilyGradeMetrics,
  customBenchmarks?: MultifamilyMarketBenchmarks
): { grade: string; score: number; breakdown: Record<string, number>; classification: { assetClass: string; marketTier: string } } => {


  // Determine benchmarks to use
  let benchmarks: MultifamilyMarketBenchmarks;

  if (customBenchmarks) {
    benchmarks = customBenchmarks;
  } else {
    const assetBench = MULTIFAMILY_BENCHMARKS.assetClass[metrics.assetClass || 'b-class'];
    const marketBench = MULTIFAMILY_BENCHMARKS.marketTier[metrics.marketTier || 'tier-2'];

    // Weight: 60% asset class, 40% market tier
    benchmarks = {
      avgIRR: (assetBench.avgIRR * 0.6) + (marketBench.avgIRR * 0.4),
      avgCashOnCash: (assetBench.avgCashOnCash * 0.6) + (marketBench.avgCashOnCash * 0.4),
      avgDSCR: (assetBench.avgDSCR * 0.6) + (marketBench.avgDSCR * 0.4),
      avgCapRate: (assetBench.avgCapRate * 0.6) + (marketBench.avgCapRate * 0.4),
      avgExpenseRatio: (assetBench.avgExpenseRatio * 0.6) + (marketBench.avgExpenseRatio * 0.4)
    };
  }

  let totalScore = 0;
  const breakdown: Record<string, number> = {};

  // 1. IRR Score - 35% weight (most important for multifamily)
  const irrRatio = metrics.irr / benchmarks.avgIRR;
  let irrScore = 0;
  if (irrRatio >= 1.5) irrScore = 100;
  else if (irrRatio >= 1.25) irrScore = 85;
  else if (irrRatio >= 1.1) irrScore = 70;
  else if (irrRatio >= 0.9) irrScore = 55;
  else if (irrRatio >= 0.75) irrScore = 40;
  else if (irrRatio >= 0.5) irrScore = 25;
  else irrScore = 10;

  totalScore += irrScore * 0.35;
  breakdown['IRR vs Market'] = irrScore;

  // 2. Cash-on-Cash Return - 25% weight
  const cocRatio = metrics.cashOnCashReturn / benchmarks.avgCashOnCash;
  let cocScore = 0;
  if (cocRatio >= 1.5) cocScore = 100;
  else if (cocRatio >= 1.25) cocScore = 85;
  else if (cocRatio >= 1.1) cocScore = 70;
  else if (cocRatio >= 0.9) cocScore = 55;
  else if (cocRatio >= 0.75) cocScore = 40;
  else if (cocRatio >= 0.5) cocScore = 25;
  else cocScore = 10;

  totalScore += cocScore * 0.25;
  breakdown['Cash-on-Cash vs Market'] = cocScore;

  // 3. DSCR - 20% weight (critical for multifamily financing)
  const dscrRatio = metrics.debtServiceCoverageRatio / benchmarks.avgDSCR;
  let dscrScore = 0;
  if (dscrRatio >= 1.4) dscrScore = 100;
  else if (dscrRatio >= 1.2) dscrScore = 85;
  else if (dscrRatio >= 1.1) dscrScore = 70;
  else if (dscrRatio >= 1.0) dscrScore = 55;
  else if (dscrRatio >= 0.9) dscrScore = 40;
  else if (dscrRatio >= 0.8) dscrScore = 25;
  else dscrScore = 10;

  totalScore += dscrScore * 0.20;
  breakdown['DSCR vs Market'] = dscrScore;

  // 4. Cap Rate Attractiveness - 8% weight
  const capRateRatio = metrics.capRate / benchmarks.avgCapRate;
  let capScore = 0;
  if (capRateRatio >= 1.3) capScore = 100;
  else if (capRateRatio >= 1.15) capScore = 85;
  else if (capRateRatio >= 1.05) capScore = 70;
  else if (capRateRatio >= 0.95) capScore = 55;
  else if (capRateRatio >= 0.85) capScore = 40;
  else if (capRateRatio >= 0.7) capScore = 25;
  else capScore = 10;

  totalScore += capScore * 0.08;
  breakdown['Cap Rate vs Market'] = capScore;

  // 5. Expense Efficiency - 7% weight
  const expenseRatio = metrics.expenseRatio || 40;
  const expenseEfficiency = benchmarks.avgExpenseRatio / Math.max(expenseRatio, 1);
  let expenseScore = 0;
  if (expenseEfficiency >= 1.2) expenseScore = 100;
  else if (expenseEfficiency >= 1.1) expenseScore = 85;
  else if (expenseEfficiency >= 1.05) expenseScore = 70;
  else if (expenseEfficiency >= 0.95) expenseScore = 55;
  else if (expenseEfficiency >= 0.85) expenseScore = 40;
  else if (expenseEfficiency >= 0.7) expenseScore = 25;
  else expenseScore = 10;

  totalScore += expenseScore * 0.07;
  breakdown['Expense Efficiency'] = expenseScore;

  // 6. Break-Even Analysis - 3% weight
  let breakEvenScore = 0;
  if (metrics.breakEvenYear === null) {
    breakEvenScore = 10;
  } else if (metrics.breakEvenYear <= 1) {
    breakEvenScore = 100;
  } else if (metrics.breakEvenYear <= 2) {
    breakEvenScore = 80;
  } else if (metrics.breakEvenYear <= 3) {
    breakEvenScore = 60;
  } else if (metrics.breakEvenYear <= 5) {
    breakEvenScore = 40;
  } else {
    breakEvenScore = 20;
  }

  totalScore += breakEvenScore * 0.03;
  breakdown['breakEvenSpeed'] = breakEvenScore;

  // 7. ROI at Horizon - 2% weight (reduced importance)
  let roiScore = 0;
  if (metrics.roiAtHorizon >= 150) roiScore = 100;
  else if (metrics.roiAtHorizon >= 100) roiScore = 85;
  else if (metrics.roiAtHorizon >= 75) roiScore = 70;
  else if (metrics.roiAtHorizon >= 50) roiScore = 55;
  else if (metrics.roiAtHorizon >= 25) roiScore = 40;
  else if (metrics.roiAtHorizon >= 0) roiScore = 25;
  else roiScore = 10;

  totalScore += roiScore * 0.02;
  breakdown['ROI at Horizon'] = roiScore;

  // Grade mapping - more stringent for multifamily
  let grade: string;
  if (totalScore >= 85) grade = "A+";
  else if (totalScore >= 78) grade = "A";
  else if (totalScore >= 70) grade = "A-";
  else if (totalScore >= 62) grade = "B+";
  else if (totalScore >= 55) grade = "B";
  else if (totalScore >= 47) grade = "B-";
  else if (totalScore >= 40) grade = "C+";
  else if (totalScore >= 32) grade = "C";
  else if (totalScore >= 25) grade = "C-";
  else if (totalScore >= 18) grade = "D";
  else grade = "F";

  return {
    grade,
    score: Math.round(totalScore * 10) / 10,
    breakdown,
    classification: {
      assetClass: metrics.assetClass || 'b-class',
      marketTier: metrics.marketTier || 'tier-2'
    }
  };
};


export default function PropertyAnalyzerPage() {
  // --- Input States: FINANCING ---
  const [purchasePrice, setPurchasePrice] = useState<number>(7000000);
  const [downPaymentPercentage, setDownPaymentPercentage] = useState<number>(20); // Percentage
  const [interestRate, setInterestRate] = useState<number>(7.0); // Percentage
  const [loanTermYears, setLoanTermYears] = useState<number>(24); // Years
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
    return loanTermYears * 12;
  }, [loanTermYears]);

  const monthlyMortgagePayment = useMemo(() => {
    if (monthlyInterestRate === 0) { // Handle 0% interest rate to avoid division by zero
      if (numberOfPayments === 0) return 0;
      return loanAmount / numberOfPayments;
    }
    const numerator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments);
    const denominator = Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1;

    if (denominator === 0) return loanAmount;
    return loanAmount * (numerator / denominator);
  }, [loanAmount, monthlyInterestRate, numberOfPayments]);

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

  // FIXED: Function to calculate remaining loan balance correctly
  const calculateRemainingLoanBalance = (yearsElapsed: number): number => {
    const monthsPaid = yearsElapsed * 12;
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

  }, [
    numUnits, avgMonthlyRentPerUnit, vacancyRate, annualRentalGrowthRate, otherIncomeAnnual, incomeReductionsAnnual,
    propertyTaxes, insurance, propertyManagementFeePercentage, maintenanceRepairsAnnual, utilitiesAnnual,
    contractServicesAnnual, payrollAnnual, marketingAnnual, gAndAAnnual,
    otherExpensesAnnual, expenseGrowthRate,
    capitalReservePerUnitAnnual, deferredCapitalReservePerUnit, holdingPeriodYears,
    purchasePrice, downPaymentPercentage, interestRate, loanTermYears, closingCostsPercentage,
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
    <div className="flex flex-col lg:flex-row p-4 md:p-8 bg-white text-gray-800 min-h-screen">
      <div className="lg:w-2/3 pr-0 lg:pr-8 mb-8 lg:mb-0">

<div className="flex justify-between items-end mb-6">
          {/* Investment Grade Blue Box */}
          <div className="p-3 rounded-lg shadow-xl flex items-center text-white" style={{ backgroundColor: '#1C599F' }}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10">
                <img src="/charlie.png" alt="Grade Icon" className="w-full h-full object-contain" />
              </div>
              <p className="text-2xl font-bold">Investment Grade: <span className="text-2xl font-extrabold">{overallGrade}</span></p>
            </div>
          </div>
          <div className="flex space-x-3">
            <PropertySummaryButton
              gradeResult={{
                grade: overallGrade,
                score: Object.values(gradeBreakdown).reduce((sum, score) => sum + score, 0) / Object.keys(gradeBreakdown).length,
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
            <h3 className="text-md font-semibold text-orange-600 mb-1">Expense Ratio</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(expenseRatio)}</p>
          </div>

          {/* Row 2 Metrics: Cap Rate, DSCR, IRR */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cap Rate</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(capRate)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Debt Service Coverage Ratio</h3>
            <p className="text-2xl font-bold text-gray-900">{debtServiceCoverageRatio.toFixed(2)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">IRR at End of Holding Period</h3>
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
            <h3 className="text-md font-semibold text-orange-600 mb-1">Return on Investment (at Year {holdingPeriodYears})</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(roiAtHorizon)}</p>
          </div>

          {/* Row 4 Metrics */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Annual Debt Service</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(annualDebtService)}</p>
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
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash-on-Cash Return</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(cashOnCashReturn)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Projected Equity (at Year {holdingPeriodYears})</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(projectedEquityAtHorizon)}</p>
          </div>
        </div>

      </div>

      <div className="print-assumptions lg:w-1/3 bg-gray-50 p-6 rounded-xl shadow-2xl border border-gray-200 lg:sticky lg:top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-6 text-orange-600">Assumptions</h2>

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

        <div className="mb-5">
          <label htmlFor="loanTermYears" className="block text-sm font-medium text-gray-700 mb-1">Loan Term (Years)</label>
          <input
            type="number"
            id="loanTermYears"
            value={loanTermYears ?? 0}
            onChange={(e) => setLoanTermYears(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="1"
            min="1"
          />
        </div>

        <div className="mb-5">
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
            type="number"
            id="numUnits"
            value={numUnits ?? 0}
            onChange={(e) => setNumUnits(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="1"
            min="1"
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
  );
}