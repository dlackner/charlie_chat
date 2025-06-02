'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  // --- Input States: FINANCING ---
  const [purchasePrice, setPurchasePrice] = useState<number>(1000000);
  const [downPaymentPercentage, setDownPaymentPercentage] = useState<number>(20); // Percentage
  const [interestRate, setInterestRate] = useState<number>(5.0);
  // Percentage
  const [loanTermYears, setLoanTermYears] = useState<number>(30); // Years
  const [closingCostsPercentage, setClosingCostsPercentage] = useState<number>(3);
  // Percentage of Purchase Price

  // --- Input States: RENTS ---
  const [numUnits, setNumUnits] = useState<number>(10);
  const [avgMonthlyRentPerUnit, setAvgMonthlyRentPerUnit] = useState<number>(2500);
  const [vacancyRate, setVacancyRate] = useState<number>(5); // Percentage
  const [annualRentalGrowthRate, setAnnualRentalGrowthRate] = useState<number>(2);
  // Percentage

  // --- Input States: OPERATING EXPENSES (ANNUAL) ---
  const [propertyTaxes, setPropertyTaxes] = useState<number>(12000);
  // Separated from insurance
  const [insurance, setInsurance] = useState<number>(10000);
  // Separated from property taxes
  const [propertyManagementFeePercentage, setPropertyManagementFeePercentage] = useState<number>(4);
  // Percentage of EGI
  const [maintenanceRepairsAnnual, setMaintenanceRepairsAnnual] = useState<number>(12000);
  // Total annual
  const [utilitiesAnnual, setUtilitiesAnnual] = useState<number>(6000);
  // Total annual
  const [contractServicesAnnual, setContractServicesAnnual] = useState<number>(6000); // New expense
  const [payrollAnnual, setPayrollAnnual] = useState<number>(15000);
  // New expense
  const [marketingAnnual, setMarketingAnnual] = useState<number>(2400); // New expense
  const [gAndAAnnual, setGAndAAnnual] = useState<number>(1200);
  // New expense
  const [otherExpensesAnnual, setOtherExpensesAnnual] = useState<number>(5000);
  // Total annual
  const [expenseGrowthRate, setExpenseGrowthRate] = useState<number>(2);
  // Percentage

  // --- Input States: CAPITAL EXPENDITURES (ANNUAL) ---
  const [capitalReservePerUnitAnnual, setCapitalReservePerUnitAnnual] = useState<number>(1000);
  // Per unit, annual
  const [holdingPeriodYears, setHoldingPeriodYears] = useState<number>(10);
  // Years

  // --- Helper function for formatting and parsing numerical inputs with commas ---
  const formatAndParseNumberInput = (
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit and non-decimal characters (allowing only one decimal point)
    const cleanedValue = e.target.value.replace(/[^\d.]/g, '');
    // Parse to float, default to 0 if invalid
    const parsedValue = parseFloat(cleanedValue) || 0;
    setter(Math.max(0, parsedValue)); // Ensure non-negative
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
      // If loanAmount is also 0, or payments is 0, this still needs care
      if (numberOfPayments === 0) return 0;
      return loanAmount / numberOfPayments;
    }
    const numerator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments);
    const denominator = Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1;

    if (denominator === 0) return loanAmount; // Pay off in one go if term is 0 months
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
    return grossPotentialRent * (1 - vacancyRate / 100);
  }, [grossPotentialRent, vacancyRate]);
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
  // Capital Reserve (Year 1)
  const annualCapitalReserveTotal = useMemo(() => {
    return capitalReservePerUnitAnnual * numUnits;
  }, [capitalReservePerUnitAnnual, numUnits]);
  // Cash Flow & Returns (Year 1)
  const cashFlowBeforeTax = useMemo(() => {
    return netOperatingIncome - annualDebtService;
  }, [netOperatingIncome, annualDebtService]);
  const cashFlowAfterCapitalReserve = useMemo(() => {
    return cashFlowBeforeTax - annualCapitalReserveTotal;
  }, [cashFlowBeforeTax, annualCapitalReserveTotal]);
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
  const [irr, setIRR] = useState<number>(0); // New state for IRR

  useEffect(() => {
    const data: ChartDataPoint[] = [];
    let cumulativeCashFlow = -totalInitialInvestment;
    let currentBreakEvenYear: number | null = null;
    const cashFlowsForIRR: number[] = [-totalInitialInvestment]; // Year 0 outflow for IRR

    // Initialize values for year 0 (start of investment)
    data.push({
      year: 0,
      cumulativeCashFlow: cumulativeCashFlow,
      noi: netOperatingIncome,
      cashFlowBeforeTax: cashFlowBeforeTax,
    });

    let currentGrossPotentialRent = grossPotentialRent;
    let currentEffectiveGrossIncome = effectiveGrossIncome;
    let currentTotalOperatingExpenses = totalOperatingExpenses;
    let currentNetOperatingIncome = netOperatingIncome;
    let currentCashFlowBeforeTax = cashFlowBeforeTax;
    let currentAnnualCapitalReserveTotal = annualCapitalReserveTotal;
    let currentLoanBalance = loanAmount; // Track loan balance for equity calculation

    for (let y = 1; y <= holdingPeriodYears; y++) {
      // Project Rent Growth
      currentGrossPotentialRent *= (1 + annualRentalGrowthRate / 100);
      currentEffectiveGrossIncome = currentGrossPotentialRent * (1 - vacancyRate / 100);

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
      const annualCashFlow = currentCashFlowBeforeTax - currentAnnualCapitalReserveTotal;
      cumulativeCashFlow += annualCashFlow;

      if (cumulativeCashFlow >= 0 && currentBreakEvenYear === null) {
        currentBreakEvenYear = y;
      }

      // Calculate remaining loan balance for equity projection
      const remainingPayments = Math.max(0, numberOfPayments - (y * 12));
      if (monthlyInterestRate > 0 && remainingPayments > 0) {
        currentLoanBalance = monthlyMortgagePayment * ((1 - Math.pow(1 + monthlyInterestRate, -remainingPayments)) / monthlyInterestRate);
      } else if (remainingPayments > 0) {
        currentLoanBalance = loanAmount - (monthlyMortgagePayment * y * 12);
      } else {
        currentLoanBalance = 0;
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
    // Without appreciation, final sales price is the initial purchase price
    const finalSalesPrice = purchasePrice;
    const finalLoanBalanceAtHorizon = currentLoanBalance;
    const finalProjectedEquity = finalSalesPrice - finalLoanBalanceAtHorizon;
    setProjectedEquityAtHorizon(finalProjectedEquity);
    // ROI without appreciation: (Final Equity + Total Cumulative Cash Flow) / Initial Investment - 1
    const totalCashFlowOverPeriod = cumulativeCashFlow + totalInitialInvestment;
    const totalReturn = (finalProjectedEquity - downPaymentAmount) + totalCashFlowOverPeriod;
    const roi = (totalReturn / totalInitialInvestment) * 100;
    setRoiAtHorizon(roi);
    // Adjust the last cash flow for IRR to include sale proceeds
    if (holdingPeriodYears > 0 && cashFlowsForIRR.length > holdingPeriodYears) {
      cashFlowsForIRR[holdingPeriodYears] += finalProjectedEquity;
    } else if (holdingPeriodYears > 0 && cashFlowsForIRR.length === holdingPeriodYears) {
      // This case handles when holdingPeriodYears is 1 and the loop only runs once.
      // The push already happened, so we just add the final equity to the last element.
      cashFlowsForIRR[holdingPeriodYears - 1] += finalProjectedEquity;
    } else if (holdingPeriodYears === 0) {
      if (cashFlowsForIRR.length === 1) { // Only initial investment added
        cashFlowsForIRR.push(finalSalesPrice - finalLoanBalanceAtHorizon);
      }
    }

    // Defensive check before calling calculateIRR
    if (!Array.isArray(cashFlowsForIRR) || cashFlowsForIRR.length === 0) {
      console.warn("IRR calculation skipped: Cash flow array is invalid or empty.");
      setIRR(0); // Set IRR to 0 if calculation is not possible
      return;
    }

    const calculatedIRR = calculateIRR(cashFlowsForIRR);
    setIRR(calculatedIRR);
  }, [
    numUnits, avgMonthlyRentPerUnit, vacancyRate, annualRentalGrowthRate,
    propertyTaxes, insurance, propertyManagementFeePercentage, maintenanceRepairsAnnual, utilitiesAnnual,
    contractServicesAnnual, payrollAnnual, marketingAnnual, gAndAAnnual,
    otherExpensesAnnual, expenseGrowthRate,
    capitalReservePerUnitAnnual, holdingPeriodYears,
    purchasePrice, downPaymentPercentage, interestRate, loanTermYears, closingCostsPercentage,
    grossPotentialRent, effectiveGrossIncome, propertyManagementFeeAmount, totalOperatingExpenses, netOperatingIncome,
    downPaymentAmount, loanAmount, totalInitialInvestment, monthlyInterestRate, numberOfPayments, monthlyMortgagePayment, annualDebtService,
    cashFlowBeforeTax, annualCapitalReserveTotal
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-orange-600">Property Analyzer</h1>
<button
  onClick={() => window.print()}
  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors duration-150 shadow-md print:hidden"
>
  Print Page
</button>
        </div>

        <div
          className="bg-gray-50 p-4 md:p-6 rounded-lg shadow-xl border border-gray-200 h-[400px] md:h-[500px] flex items-center justify-center">
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
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash Flow (Before Tax)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowBeforeTax)}</p>
          </div>

          {/* New Row 2 Metrics: Cap Rate, DSCR, IRR */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cap Rate</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(capRate)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Debt Service Coverage Ratio </h3>
            <p className="text-2xl font-bold text-gray-900">{debtServiceCoverageRatio.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Internal Rate of Return (IRR)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(irr)}</p>
          </div>

          {/* Remaining Metrics (now on Row 3 and beyond) */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash Flow (After Capital Reserve)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowAfterCapitalReserve)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash-on-Cash Return</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(cashOnCashReturn)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Annual Debt Service</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(annualDebtService)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Return on Investment (at Year {holdingPeriodYears})</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(roiAtHorizon)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Break-Even Point</h3>
            <p className="text-2xl font-bold text-gray-900">
              {breakEvenYear !== null ? `${breakEvenYear} years` : 'N/A (No positive cash flow within horizon)'}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Projected Equity (at Year {holdingPeriodYears})</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(projectedEquityAtHorizon)}</p>
          </div>
        </div>
      </div>

      <div className="lg:w-1/3 bg-gray-50 p-6 rounded-xl shadow-2xl border border-gray-200 lg:sticky lg:top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
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
            value={downPaymentPercentage ?? 0}
            onChange={(e) => setDownPaymentPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
            max="100"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="interestRate"
            className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
          <input
            type="number"
            id="interestRate"
            value={interestRate ?? 0}
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
            min="1"
            step="1"
          />
        </div>
        <div className="mb-6">
          <label htmlFor="closingCostsPercentage" className="block text-sm font-medium text-gray-700 mb-1">Closing Costs (% of Purchase Price)</label>
          <input
            type="number"
            id="closingCostsPercentage"
            value={closingCostsPercentage ?? 0}
            onChange={(e) => setClosingCostsPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
            max="100"
          />
        </div>
        <h3 className="text-xl font-semibold mb-4 text-gray-700">RENTS</h3>
        <div className="mb-5">
          <label htmlFor="numUnits" className="block text-sm font-medium text-gray-700 mb-1">Number of Units</label>
          <input
            type="number"
            id="numUnits"
            value={numUnits ?? 0}
            onChange={(e) => setNumUnits(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            min="1"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="avgMonthlyRentPerUnit" className="block text-sm font-medium text-gray-700 mb-1">Average Monthly Rent per Unit ($)</label>
          <input
            type="text"
            id="avgMonthlyRentPerUnit"
            value={(avgMonthlyRentPerUnit ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setAvgMonthlyRentPerUnit)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="10"
            suppressHydrationWarning={true}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="vacancyRate" className="block text-sm font-medium text-gray-700 mb-1">Vacancy Rate (%)</label>
          <div className="flex items-center">
            <input
              type="range"
              id="vacancyRate"
              min="0"
              max="100"
              value={vacancyRate ?? 0}
              onChange={(e) => setVacancyRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <span className="ml-4 text-sm w-12 text-right text-gray-600">{vacancyRate}%</span>
          </div>
        </div>
        <div
          className="mb-6">
          <label htmlFor="annualRentalGrowthRate" className="block text-sm font-medium text-gray-700 mb-1">Annual Rental Growth Rate (%)</label>
          <input
            type="number"
            id="annualRentalGrowthRate"
            value={annualRentalGrowthRate ?? 0}
            onChange={(e) => setAnnualRentalGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
          />
        </div>
        <h3 className="text-xl font-semibold mb-4 text-gray-700">OPERATING EXPENSES (ANNUAL)</h3>
        <div className="mb-5">
          <label htmlFor="propertyTaxes" className="block text-sm font-medium text-gray-700 mb-1">Property Taxes ($)</label>
          <input
            type="text"
            id="propertyTaxes"
            value={(propertyTaxes ?? 0).toLocaleString('en-US')}
            onChange={formatAndParseNumberInput(setPropertyTaxes)}
            className="w-full p-2.5
              bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
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
          <label htmlFor="propertyManagementFeePercentage" className="block text-sm font-medium text-gray-700 mb-1">Property Management Fee (% of EGI)</label>
          <input
            type="number"
            id="propertyManagementFeePercentage"
            value={propertyManagementFeePercentage ?? 0}
            onChange={(e) => setPropertyManagementFeePercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
            max="100"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="maintenanceRepairsAnnual" className="block text-sm font-medium text-gray-700 mb-1">Maintenance & Repairs (Annual) ($)</label>
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
          <label htmlFor="utilitiesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Utilities (Annual) ($)</label>
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
          <label htmlFor="contractServicesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Contract Services (Annual) ($)</label>
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
          <label htmlFor="payrollAnnual" className="block text-sm font-medium text-gray-700 mb-1">Payroll (Annual) ($)</label>
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
          <label htmlFor="marketingAnnual" className="block text-sm font-medium text-gray-700 mb-1">Marketing (Annual) ($)</label>
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
          <label htmlFor="gAndAAnnual" className="block text-sm font-medium text-gray-700 mb-1">General & Admin (Annual) ($)</label>
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
          <label htmlFor="otherExpensesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Other Expenses (Annual) ($)</label>
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
          <label htmlFor="expenseGrowthRate" className="block text-sm font-medium text-gray-700 mb-1">Annual Expense Growth Rate (%)</label>
          <input
            type="number"
            id="expenseGrowthRate"
            value={expenseGrowthRate ?? 0}
            onChange={(e) => setExpenseGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
          />
        </div>

        <h3 className="text-xl font-semibold mb-4 text-gray-700">CAPITAL EXPENDITURES</h3>
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
            <span className="ml-4 text-sm w-12 text-right text-gray-600">{holdingPeriodYears} years</span>
          </div>
        </div>
      </div>
    </div>
  );
}