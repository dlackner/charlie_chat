// app/property-analyzer/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
// Import Recharts components
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine // For marking break-even
} from 'recharts';

// (Your Button component can remain here if you plan to use it, or remove if not)
// const Button = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
//   <button
//     onClick={onClick}
//     className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors duration-150"
//   >
//     {children}
//   </button>
// );

interface ChartDataPoint {
  month: number;
  profit: number;
  cumulativeInvestment: number; // Kept for potential future use in tooltip
  cumulativeRevenue: number;  // Kept for potential future use in tooltip
}

export default function PropertyAnalyzerPage() {
  // --- Input States ---
  const [propertyCost, setPropertyCost] = useState<number>(1000000);
  const [retrofitCost, setRetrofitCost] = useState<number>(2000000);
  const [rentPerUnit, setRentPerUnit] = useState<number>(3500);
  const [numUnits, setNumUnits] = useState<number>(40);
  const [monthlyExpensesPerUnit, setMonthlyExpensesPerUnit] = useState<number>(500);
  const [vacancyRate, setVacancyRate] = useState<number>(5);
  const [timeHorizon, setTimeHorizon] = useState<number>(20);

  // --- Calculation Logic ---
  const totalInitialInvestment = useMemo(() => propertyCost + retrofitCost, [propertyCost, retrofitCost]);
  const monthlyGrossRent = useMemo(() => rentPerUnit * numUnits, [rentPerUnit, numUnits]);
  const monthlyNetOperatingIncome = useMemo(() => {
    const gross = monthlyGrossRent;
    const vacancyLoss = gross * (vacancyRate / 100);
    const totalExpenses = monthlyExpensesPerUnit * numUnits;
    return gross - vacancyLoss - totalExpenses;
  }, [monthlyGrossRent, vacancyRate, monthlyExpensesPerUnit, numUnits]);

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [breakEvenMonth, setBreakEvenMonth] = useState<number | null>(null);
  const [totalProfitAtHorizon, setTotalProfitAtHorizon] = useState<number>(0);

  useEffect(() => {
    const data: ChartDataPoint[] = [];
    let cumulativeProfit = -totalInitialInvestment;
    let currentBreakEvenMonth: number | null = null;

    data.push({ month: 0, profit: cumulativeProfit, cumulativeInvestment: totalInitialInvestment, cumulativeRevenue: 0 });

    if (monthlyNetOperatingIncome <= 0 && totalInitialInvestment > 0) {
       for (let m = 1; m <= timeHorizon * 12; m++) {
        data.push({ month: m, profit: cumulativeProfit, cumulativeInvestment: totalInitialInvestment, cumulativeRevenue: 0 });
      }
      setBreakEvenMonth(null);
      setTotalProfitAtHorizon(cumulativeProfit);
    } else if (totalInitialInvestment === 0 && monthlyNetOperatingIncome <=0) {
        for (let m = 1; m <= timeHorizon * 12; m++) {
            data.push({ month: m, profit: 0, cumulativeInvestment: 0, cumulativeRevenue: 0 });
        }
        setBreakEvenMonth(0);
        setTotalProfitAtHorizon(0);
    } else {
        for (let m = 1; m <= timeHorizon * 12; m++) {
            cumulativeProfit += monthlyNetOperatingIncome;
            if (cumulativeProfit >= 0 && currentBreakEvenMonth === null && monthlyNetOperatingIncome > 0) { // Ensure positive income for breakeven
                currentBreakEvenMonth = m;
            }
            data.push({
                month: m,
                profit: cumulativeProfit,
                cumulativeInvestment: totalInitialInvestment,
                cumulativeRevenue: monthlyNetOperatingIncome * m
            });
        }
        setBreakEvenMonth(currentBreakEvenMonth);
        setTotalProfitAtHorizon(cumulativeProfit);
    }
    setChartData(data);
  }, [totalInitialInvestment, monthlyNetOperatingIncome, timeHorizon]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  // Custom Tooltip Content for better display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Access the full data point
      return (
        <div className="bg-white/90 p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm text-gray-700 font-semibold">{`Month: ${label}`}{label % 12 === 0 && label > 0 ? ` (Year ${label/12})` : ''}</p>
          <p className="text-sm text-orange-600">{`Profit: ${formatCurrency(payload[0].value)}`}</p>
          {/* You can add more info from 'data' if needed, e.g., data.cumulativeRevenue */}
        </div>
      );
    }
    return null;
  };


  return (
    <div className="flex flex-col lg:flex-row p-4 md:p-8 bg-white text-gray-800 min-h-screen">
      {/* --- Main Content Area (Graph & Summary) --- */}
      <div className="lg:w-2/3 pr-0 lg:pr-8 mb-8 lg:mb-0">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-orange-600">Property Conversion Analyzer</h1>
        
        <div className="bg-gray-50 p-4 md:p-6 rounded-lg shadow-xl border border-gray-200 h-[400px] md:h-[500px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 30, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                label={{ value: 'Time (Months)', position: 'insideBottom', offset: -20, fill: '#4B5563', dy:10 }}
                tickFormatter={(tick) => {
                    if (tick === 0) return 'Start';
                    if (tick % 12 === 0) return `Yr ${tick/12}`;
                    return ''; // Show fewer ticks for clarity
                }}
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                interval="preserveStartEnd" // Show start and end, then based on ticks
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                label={{ value: 'Cumulative Profit ($)', angle: -90, position: 'insideLeft', fill: '#4B5563', dx: -25, dy: 50}}
                tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                stroke="#9CA3AF"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                domain={['auto', 'auto']} // Let Recharts determine domain, or set manually if needed
                allowDataOverflow={false}
                width={80} // Increased width for y-axis label and ticks
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F97316', strokeWidth: 1, strokeDasharray: '3 3' }}/>
              <Legend 
                verticalAlign="top" 
                height={36} 
                wrapperStyle={{ color: '#4B5563', paddingBottom: '10px' }} 
                payload={[{ value: 'Cumulative Profit', type: 'line', id: 'ID01', color: '#F97316' }]}
              />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />
              {breakEvenMonth !== null && monthlyNetOperatingIncome > 0 && (
                <ReferenceLine 
                  x={breakEvenMonth} 
                  stroke="#EF4444" // Red for emphasis
                  strokeDasharray="4 4" 
                  label={{ 
                    value: `Break-Even (~${(breakEvenMonth/12).toFixed(1)} yrs)`, 
                    fill: '#EF4444', 
                    position: 'insideTopRight', 
                    fontSize: 12,
                    dy: -10, // Adjust position
                    dx: 10
                  }} 
                />
              )}
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#F97316" // Orange line
                strokeWidth={2.5} 
                dot={false} 
                activeDot={{ r: 6, strokeWidth: 2, fill: '#F97316', stroke: '#FFF' }} 
                name="Cumulative Profit" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* --- Summary Metrics --- */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ... (summary metrics code remains the same) ... */}
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Total Initial Investment</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInitialInvestment)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Est. Monthly Net Income</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyNetOperatingIncome)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Break-Even Point</h3>
            <p className="text-2xl font-bold text-gray-900">
              {breakEvenMonth !== null && monthlyNetOperatingIncome > 0
                ? `${breakEvenMonth} months (~${(breakEvenMonth / 12).toFixed(1)} years)`
                : 'N/A'}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 md:col-span-3">
            <h3 className="text-md font-semibold text-orange-600 mb-1">Projected Profit at {timeHorizon} Years</h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalProfitAtHorizon)}</p>
          </div>
        </div>
      </div>

      {/* --- Input Panel --- */}
      <div className="lg:w-1/3 bg-gray-50 p-6 rounded-xl shadow-2xl border border-gray-200 lg:sticky lg:top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
        {/* ... (input panel code remains the same) ... */}
        <h2 className="text-2xl font-semibold mb-6 text-orange-600">Assumptions</h2>

        {/* Investment Costs */}
        <div className="mb-5">
          <label htmlFor="propertyCost" className="block text-sm font-medium text-gray-700 mb-1">Property Cost ($)</label>
          <input
            type="number"
            id="propertyCost"
            value={propertyCost}
            onChange={(e) => setPropertyCost(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="50000"
          />
        </div>
        <div className="mb-5">
          <label htmlFor="retrofitCost" className="block text-sm font-medium text-gray-700 mb-1">Retrofit Cost ($)</label>
          <input
            type="number"
            id="retrofitCost"
            value={retrofitCost}
            onChange={(e) => setRetrofitCost(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="50000"
          />
        </div>

        {/* Unit & Rent Details */}
        <div className="mb-5">
          <label htmlFor="numUnits" className="block text-sm font-medium text-gray-700 mb-1">Number of Units/Rooms</label>
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
          <label htmlFor="rentPerUnit" className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent per Unit ($)</label>
          <input
            type="number"
            id="rentPerUnit"
            value={rentPerUnit}
            onChange={(e) => setRentPerUnit(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="50"
          />
        </div>

        {/* Operational Costs */}
        <div className="mb-5">
          <label htmlFor="monthlyExpensesPerUnit" className="block text-sm font-medium text-gray-700 mb-1">Avg. Monthly Expenses per Unit ($)</label>
          <input
            type="number"
            id="monthlyExpensesPerUnit"
            value={monthlyExpensesPerUnit}
            onChange={(e) => setMonthlyExpensesPerUnit(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow duration-150 ease-in-out shadow-sm"
            step="25"
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
              onChange={(e) => setVacancyRate(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <span className="ml-4 text-sm w-12 text-right text-gray-600">{vacancyRate}%</span>
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="timeHorizon" className="block text-sm font-medium text-gray-700 mb-1">Projection Time Horizon (Years)</label>
           <div className="flex items-center">
            <input
              type="range"
              id="timeHorizon"
              min="1"
              max="50"
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <span className="ml-4 text-sm w-12 text-right text-gray-600">{timeHorizon} yrs</span>
          </div>
        </div>
      </div>
    </div>
  );
}