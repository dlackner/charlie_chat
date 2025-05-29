// app/property-analyzer/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  // Potentially add other annual metrics if desired for charting
}

export default function PropertyAnalyzerPage() {
  // --- Input States: FINANCING ---
  const [purchasePrice, setPurchasePrice] = useState<number>(300000);
  const [downPaymentPercentage, setDownPaymentPercentage] = useState<number>(20); // Percentage
  const [interestRate, setInterestRate] = useState<number>(6.5); // Percentage
  const [loanTermYears, setLoanTermYears] = useState<number>(30); // Years
  const [closingCostsPercentage, setClosingCostsPercentage] = useState<number>(3); // Percentage of Purchase Price

  // --- Input States: RENTS ---
  const [numUnits, setNumUnits] = useState<number>(4);
  const [avgMonthlyRentPerUnit, setAvgMonthlyRentPerUnit] = useState<number>(1500);
  const [vacancyRate, setVacancyRate] = useState<number>(5); // Percentage
  const [annualRentalGrowthRate, setAnnualRentalGrowthRate] = useState<number>(2); // Percentage

  // --- Input States: OPERATING EXPENSES (ANNUAL) ---
  const [propertyTaxesInsurance, setPropertyTaxesInsurance] = useState<number>(5000);
  const [propertyManagementFeePercentage, setPropertyManagementFeePercentage] = useState<number>(8); // Percentage of EGI
  const [maintenanceRepairsAnnual, setMaintenanceRepairsAnnual] = useState<number>(1000); // Total annual
  const [utilitiesAnnual, setUtilitiesAnnual] = useState<number>(500); // Total annual
  const [otherExpensesAnnual, setOtherExpensesAnnual] = useState<number>(200); // Total annual
  const [expenseGrowthRate, setExpenseGrowthRate] = useState<number>(2); // Percentage

  // --- Input States: CAPITAL EXPENDITURES (ANNUAL) ---
  const [capitalReservePerUnitAnnual, setCapitalReservePerUnitAnnual] = useState<number>(200); // Per unit, annual
  const [holdingPeriodYears, setHoldingPeriodYears] = useState<number>(10); // Years

  // --- Input States: PROPERTY APPRECIATION ---
  const [annualAppreciationRate, setAnnualAppreciationRate] = useState<number>(3); // Percentage

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
      return loanAmount / numberOfPayments;
    }
    const numerator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments);
    const denominator = Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1;
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
    return propertyTaxesInsurance + propertyManagementFeeAmount + maintenanceRepairsAnnual + utilitiesAnnual + otherExpensesAnnual;
  }, [propertyTaxesInsurance, propertyManagementFeeAmount, maintenanceRepairsAnnual, utilitiesAnnual, otherExpensesAnnual]);

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

  // --- Chart Data & Projections (Multi-Year) ---
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [breakEvenYear, setBreakEvenYear] = useState<number | null>(null);
  const [projectedSalesPriceAtHorizon, setProjectedSalesPriceAtHorizon] = useState<number>(0);
  const [projectedEquityAtHorizon, setProjectedEquityAtHorizon] = useState<number>(0);
  const [roiAtHorizon, setRoiAtHorizon] = useState<number>(0);

  useEffect(() => {
    const data: ChartDataPoint[] = [];
    let cumulativeCashFlow = -totalInitialInvestment;
    let currentBreakEvenYear: number | null = null;

    // Initialize values for year 0 (start of investment)
    data.push({
      year: 0,
      cumulativeCashFlow: cumulativeCashFlow,
      noi: netOperatingIncome, // This represents Year 1 NOI, but for chart visualization, it's the starting point
      cashFlowBeforeTax: cashFlowBeforeTax, // This represents Year 1 CFBT
    });

    let currentGrossPotentialRent = grossPotentialRent;
    let currentEffectiveGrossIncome = effectiveGrossIncome;
    let currentTotalOperatingExpenses = totalOperatingExpenses;
    let currentNetOperatingIncome = netOperatingIncome;
    let currentCashFlowBeforeTax = cashFlowBeforeTax;
    let currentAnnualCapitalReserveTotal = annualCapitalReserveTotal;
    let currentPurchasePriceForAppreciation = purchasePrice;
    let currentLoanBalance = loanAmount;

    for (let y = 1; y <= holdingPeriodYears; y++) {
      // Project Rent Growth
      currentGrossPotentialRent *= (1 + annualRentalGrowthRate / 100);
      currentEffectiveGrossIncome = currentGrossPotentialRent * (1 - vacancyRate / 100);

      // Project Expense Growth
      // Re-calculate property management fee based on new EGI for this year
      const currentPropertyManagementFeeAmount = currentEffectiveGrossIncome * (propertyManagementFeePercentage / 100);
      
      // Apply growth rate to fixed expenses (taxes, maintenance, utilities, other)
      const projectedPropertyTaxesInsurance = propertyTaxesInsurance * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      const projectedMaintenanceRepairs = maintenanceRepairsAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      const projectedUtilities = utilitiesAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      const projectedOtherExpenses = otherExpensesAnnual * Math.pow(1 + expenseGrowthRate / 100, y - 1);

      currentTotalOperatingExpenses = projectedPropertyTaxesInsurance + currentPropertyManagementFeeAmount + projectedMaintenanceRepairs + projectedUtilities + projectedOtherExpenses;
      
      currentNetOperatingIncome = currentEffectiveGrossIncome - currentTotalOperatingExpenses;
      currentCashFlowBeforeTax = currentNetOperatingIncome - annualDebtService; // Assuming debt service is fixed

      // Capital Reserve also grows (or remains fixed based on assumption)
      currentAnnualCapitalReserveTotal = capitalReservePerUnitAnnual * numUnits; // Assuming fixed per unit, adjust if it grows

      const annualCashFlow = currentCashFlowBeforeTax - currentAnnualCapitalReserveTotal;
      cumulativeCashFlow += annualCashFlow;

      // Check for break-even year (when cumulative cash flow turns positive)
      if (cumulativeCashFlow >= 0 && currentBreakEvenYear === null) {
        currentBreakEvenYear = y;
      }

      // Project property appreciation
      currentPurchasePriceForAppreciation *= (1 + annualAppreciationRate / 100);

      // Calculate remaining loan balance for equity projection
      // This is a simplified approach. A precise amortization schedule would be complex.
      const remainingPayments = Math.max(0, numberOfPayments - (y * 12));
      if (monthlyInterestRate > 0 && remainingPayments > 0) {
        currentLoanBalance = monthlyMortgagePayment * ((1 - Math.pow(1 + monthlyInterestRate, -remainingPayments)) / monthlyInterestRate);
      } else if (remainingPayments > 0) { // interestRate is 0
        currentLoanBalance = loanAmount - (monthlyMortgagePayment * y * 12);
      } else {
        currentLoanBalance = 0; // Loan fully paid off
      }

      data.push({
        year: y,
        cumulativeCashFlow: cumulativeCashFlow,
        noi: currentNetOperatingIncome,
        cashFlowBeforeTax: currentCashFlowBeforeTax,
      });
    }

    setChartData(data);
    setBreakEvenYear(currentBreakEvenYear);

    // Calculate Projected Sales Price at end of holding period
    const finalSalesPrice = purchasePrice * Math.pow(1 + (annualAppreciationRate / 100), holdingPeriodYears);
    setProjectedSalesPriceAtHorizon(finalSalesPrice);

    // Calculate Loan Balance at end of holding period (final `currentLoanBalance` from loop)
    const finalLoanBalanceAtHorizon = currentLoanBalance;

    // Calculate Projected Equity at end of holding period
    const finalProjectedEquity = finalSalesPrice - finalLoanBalanceAtHorizon;
    setProjectedEquityAtHorizon(finalProjectedEquity);

    // Calculate Return on Investment (ROI)
    // ROI = (Net Profit / Total Initial Investment) * 100
    // Net Profit = (Projected Sales Price - Final Loan Balance) + (Cumulative Cash Flow from Operations) - Total Initial Investment
    // A simpler ROI for real estate often considers initial equity and sales proceeds.
    // Let's use: (Equity at Sale + Cumulative Cash Flow from Operations - Initial Investment) / Initial Investment
    const roiNumerator = (finalSalesPrice - finalLoanBalanceAtHorizon) + (cumulativeCashFlow + totalInitialInvestment) - totalInitialInvestment; // (Equity at sale + total cash flow over period)
    const roi = (roiNumerator / totalInitialInvestment) * 100;
    setRoiAtHorizon(roi);

  }, [
    numUnits, avgMonthlyRentPerUnit, vacancyRate, annualRentalGrowthRate,
    propertyTaxesInsurance, propertyManagementFeePercentage, maintenanceRepairsAnnual, utilitiesAnnual, otherExpensesAnnual, expenseGrowthRate,
    capitalReservePerUnitAnnual, holdingPeriodYears, annualAppreciationRate,
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
      {/* --- Main Content Area (Graph & Summary) --- */}
      <div className="lg:w-2/3 pr-0 lg:pr-8 mb-8 lg:mb-0">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-orange-600">Property Analyzer</h1>
        
        <div className="bg-gray-50 p-4 md:p-6 rounded-lg shadow-xl border border-gray-200 h-[400px] md:h-[500px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 30, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="year" 
                label={{ value: 'Time (Years)', position: 'insideBottom', offset: -20, fill: '#4B5563', dy:10 }}
                tickFormatter={(tick) => `Yr ${tick}`}
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                interval="preserveStartEnd"
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                label={{ value: 'Cumulative Cash Flow ($)', angle: -90, position: 'insideLeft', fill: '#4B5563', dx: -25, dy: 50}}
                tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                domain={['auto', 'auto']}
                allowDataOverflow={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F97316', strokeWidth: 1, strokeDasharray: '3 3' }}/>
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

        {/* --- Summary Metrics --- */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Estimated Gross Operating Income (Annual)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(effectiveGrossIncome)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Estimated Net Operating Income (Annual)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(netOperatingIncome)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash Flow (Before Tax) (Annual)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowBeforeTax)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash Flow (After Capital Reserve) (Annual)</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowAfterCapitalReserve)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cap Rate</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(capRate)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Cash-on-Cash Return</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(cashOnCashReturn)}</p>
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
            <h3 className="text-md font-semibold text-orange-600 mb-1">Projected Sales Price (at Year {holdingPeriodYears})</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(projectedSalesPriceAtHorizon)}</p>
          </div>
           <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Projected Equity (at Year {holdingPeriodYears})</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(projectedEquityAtHorizon)}</p>
          </div>
        </div>
      </div>

      {/* --- Input Panel --- */}
      <div className="lg:w-1/3 bg-gray-50 p-6 rounded-xl shadow-2xl border border-gray-200 lg:sticky lg:top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-6 text-orange-600">Assumptions</h2>

        {/* FINANCING */}
        <h3 className="text-xl font-semibold mb-4 text-gray-700">FINANCING</h3>
        <div className="mb-5">
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)</label>
          <input
            type="text" // Changed to text
            id="purchasePrice"
            value={purchasePrice.toLocaleString('en-US')} // Formatted for display
            onChange={formatAndParseNumberInput(setPurchasePrice)} // Using helper
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="10000"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="downPaymentPercentage" className="block text-sm font-medium text-gray-700 mb-1">Down Payment (%)</label>
          <input
            type="number"
            id="downPaymentPercentage"
            value={downPaymentPercentage}
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
            value={interestRate}
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
            value={loanTermYears}
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
            value={closingCostsPercentage}
            onChange={(e) => setClosingCostsPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
            max="100"
          />
        </div>

        {/* RENTS */}
        <h3 className="text-xl font-semibold mb-4 text-gray-700">RENTS</h3>
        <div className="mb-5">
          <label htmlFor="numUnits" className="block text-sm font-medium text-gray-700 mb-1">Number of Units</label>
          <input
            type="number"
            id="numUnits"
            value={numUnits}
            onChange={(e) => setNumUnits(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            min="1"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="avgMonthlyRentPerUnit" className="block text-sm font-medium text-gray-700 mb-1">Average Monthly Rent per Unit ($)</label>
          <input
            type="text" // Changed to text
            id="avgMonthlyRentPerUnit"
            value={avgMonthlyRentPerUnit.toLocaleString('en-US')} // Formatted for display
            onChange={formatAndParseNumberInput(setAvgMonthlyRentPerUnit)} // Using helper
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="10"
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
              value={vacancyRate}
              onChange={(e) => setVacancyRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <span className="ml-4 text-sm w-12 text-right text-gray-600">{vacancyRate}%</span>
          </div>
        </div>
        <div className="mb-6">
          <label htmlFor="annualRentalGrowthRate" className="block text-sm font-medium text-gray-700 mb-1">Annual Rental Growth Rate (%)</label>
          <input
            type="number"
            id="annualRentalGrowthRate"
            value={annualRentalGrowthRate}
            onChange={(e) => setAnnualRentalGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
          />
        </div>

        {/* OPERATING EXPENSES (ANNUAL) */}
        <h3 className="text-xl font-semibold mb-4 text-gray-700">OPERATING EXPENSES (ANNUAL)</h3>
        <div className="mb-5">
          <label htmlFor="propertyTaxesInsurance" className="block text-sm font-medium text-gray-700 mb-1">Property Taxes & Insurance ($)</label>
          <input
            type="text" // Changed to text
            id="propertyTaxesInsurance"
            value={propertyTaxesInsurance.toLocaleString('en-US')} // Formatted for display
            onChange={formatAndParseNumberInput(setPropertyTaxesInsurance)} // Using helper
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="100"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="propertyManagementFeePercentage" className="block text-sm font-medium text-gray-700 mb-1">Property Management Fee (% of EGI)</label>
          <input
            type="number"
            id="propertyManagementFeePercentage"
            value={propertyManagementFeePercentage}
            onChange={(e) => setPropertyManagementFeePercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
            min="0"
            max="100"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="maintenanceRepairsAnnual" className="block text-sm font-medium text-gray-700 mb-1">Maintenance and Repairs (Annual) ($)</label>
          <input
            type="text" // Changed to text
            id="maintenanceRepairsAnnual"
            value={maintenanceRepairsAnnual.toLocaleString('en-US')} // Formatted for display
            onChange={formatAndParseNumberInput(setMaintenanceRepairsAnnual)} // Using helper
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="50"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="utilitiesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Utilities (Annual) ($)</label>
          <input
            type="text" // Changed to text
            id="utilitiesAnnual"
            value={utilitiesAnnual.toLocaleString('en-US')} // Formatted for display
            onChange={formatAndParseNumberInput(setUtilitiesAnnual)} // Using helper
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="50"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="otherExpensesAnnual" className="block text-sm font-medium text-gray-700 mb-1">Other Expenses (Annual) ($)</label>
          <input
            type="text" // Changed to text
            id="otherExpensesAnnual"
            value={otherExpensesAnnual.toLocaleString('en-US')} // Formatted for display
            onChange={formatAndParseNumberInput(setOtherExpensesAnnual)} // Using helper
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="10"
          />
        </div>
        <div className="mb-6">
          <label htmlFor="expenseGrowthRate" className="block text-sm font-medium text-gray-700 mb-1">Expense Growth Rate (%)</label>
          <input
            type="number"
            id="expenseGrowthRate"
            value={expenseGrowthRate}
            onChange={(e) => setExpenseGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
          />
        </div>

        {/* CAPITAL EXPENDITURES (ANNUAL) */}
        <h3 className="text-xl font-semibold mb-4 text-gray-700">CAPITAL EXPENDITURES (ANNUAL)</h3>
         <div className="mb-5">
          <label htmlFor="capitalReservePerUnitAnnual" className="block text-sm font-medium text-gray-700 mb-1">Capital Reserve (per unit, annual) ($)</label>
          <input
            type="text" // Changed to text
            id="capitalReservePerUnitAnnual"
            value={capitalReservePerUnitAnnual.toLocaleString('en-US')} // Formatted for display
            onChange={formatAndParseNumberInput(setCapitalReservePerUnitAnnual)} // Using helper
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="10"
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
              value={holdingPeriodYears}
              onChange={(e) => setHoldingPeriodYears(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <span className="ml-4 text-sm w-12 text-right text-gray-600">{holdingPeriodYears} yrs</span>
          </div>
        </div>

        {/* PROPERTY APPRECIATION */}
        <h3 className="text-xl font-semibold mb-4 text-gray-700">PROPERTY APPRECIATION</h3>
        <div className="mb-6">
          <label htmlFor="annualAppreciationRate" className="block text-sm font-medium text-gray-700 mb-1">Annual Appreciation Rate (%)</label>
          <input
            type="number"
            id="annualAppreciationRate"
            value={annualAppreciationRate}
            onChange={(e) => setAnnualAppreciationRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="0.1"
          />
        </div>
      </div>
    </div>
  );
}