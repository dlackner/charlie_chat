'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ArrowLeft } from 'lucide-react';

interface OfferScenario {
  id: string;
  offer_name: string;
  offer_data: {
    purchasePrice?: number;
    downPaymentPercentage?: number;
    downPayment?: number;
    loanAmount?: number;
    interestRate?: number;
    loanTermYears?: number;
    projected_irr?: string;
    projected_cash_on_cash?: string;
    projected_cap_rate?: string;
    projected_equity_at_horizon?: number;
    annualRent?: number;
    monthlyRent?: number;
    grossRentalYield?: number;
    operatingExpenseRatio?: number;
    noi?: number;
    monthlyDebtService?: number;
    annualDebtService?: number;
    monthlyCashFlow?: number;
    annualCashFlow?: number;
    totalCashRequired?: number;
    renovationBudget?: number;
    [key: string]: any;
  };
  property_id: string;
  created_at: string;
}

export default function PricingScenarioViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = params?.id as string;
  const { supabase } = useAuth();
  const isPrintMode = searchParams?.get('print') === 'true';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<OfferScenario | null>(null);

  // Fetch scenario data
  useEffect(() => {
    const fetchScenario = async () => {
      if (!scenarioId || !supabase) return;

      try {
        const { data, error } = await supabase
          .from('offer_scenarios')
          .select('*')
          .eq('id', scenarioId)
          .single();

        if (error) throw error;
        setScenario(data);
      } catch (err) {
        console.error('Error fetching scenario:', err);
        setError('Failed to load pricing scenario');
      } finally {
        setLoading(false);
      }
    };

    fetchScenario();
  }, [scenarioId, supabase]);

  // Format currency
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: string | number | undefined) => {
    if (!value) return 'N/A';
    if (typeof value === 'string') return value;
    return `${value.toFixed(2)}%`;
  };

  // Format number with commas
  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pricing scenario...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !scenario) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Pricing scenario not found'}</p>
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

  const { offer_data } = scenario;


  return (
    <AuthGuard>
      <div className={`min-h-screen ${isPrintMode ? 'bg-white' : 'bg-gray-50'}`}>
        {/* Print Mode Header */}
        {isPrintMode && (
          <div className="no-print bg-white shadow-sm border-b p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900">Pricing Scenario - Print View</h1>
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Print
                </button>
                <button
                  onClick={() => window.close()}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back Button - hide in print mode */}
        {!isPrintMode && (
          <div className="bg-white border-b print:hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className={`${isPrintMode ? 'bg-white text-black border-b-2 border-gray-800' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'}`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div>
              <h1 className="text-3xl font-bold">Pricing Scenario</h1>
              <p className={`text-xl ${isPrintMode ? 'text-gray-700' : 'text-white/90'} mt-2`}>{scenario.offer_name}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Key Metrics Overview */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 mb-8 border border-blue-200">
            <h2 className="text-2xl font-bold text-blue-900 mb-6">Key Investment Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600">{formatPercentage(offer_data.projected_irr)}</div>
                <div className="text-sm text-gray-600 font-medium">Projected IRR</div>
              </div>
              <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{formatPercentage(offer_data.cash_on_cash_return)}</div>
                <div className="text-sm text-gray-600 font-medium">Cash-on-Cash Return</div>
              </div>
              <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{formatPercentage(offer_data.cap_rate_year_1)}</div>
                <div className="text-sm text-gray-600 font-medium">Cap Rate (Year 1)</div>
              </div>
              <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-indigo-600">{offer_data.debt_service_coverage_ratio}</div>
                <div className="text-sm text-gray-600 font-medium">Debt Coverage Ratio</div>
              </div>
            </div>
          </div>

          {/* Purchase & Financing */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Purchase & Financing</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Purchase Price:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Down Payment ({offer_data.downPaymentPercentage}%):</span>
                    <span className="font-semibold">{formatCurrency(offer_data.down_payment_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loan Amount:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.loan_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Closing Costs ({offer_data.closingCostsPercentage}%):</span>
                    <span className="font-semibold">{formatCurrency((offer_data.total_acquisition_cost || 0) - (offer_data.purchasePrice || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Acquisition Cost:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.total_acquisition_cost)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Rate:</span>
                    <span className="font-semibold">{formatPercentage(offer_data.interestRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loan Structure:</span>
                    <span className="font-semibold capitalize">{offer_data.loanStructure}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amortization Period:</span>
                    <span className="font-semibold">{offer_data.amortizationPeriodYears} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest-Only Period:</span>
                    <span className="font-semibold">{offer_data.interestOnlyPeriodYears} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cash Invested:</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(offer_data.total_cash_invested)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Property & Income Details */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Property & Income Details</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Number of Units:</span>
                    <span className="font-semibold">{formatNumber(offer_data.numUnits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Monthly Rent/Unit:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.avgMonthlyRentPerUnit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross Operating Income:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.gross_operating_income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vacancy Rate:</span>
                    <span className="font-semibold">{formatPercentage(offer_data.vacancyRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other Income (Annual):</span>
                    <span className="font-semibold">{formatCurrency(offer_data.otherIncomeAnnual)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Annual Rental Growth Rate:</span>
                    <span className="font-semibold">{formatPercentage(offer_data.annualRentalGrowthRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expense Growth Rate:</span>
                    <span className="font-semibold">{formatPercentage(offer_data.expenseGrowthRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Operating Expense Ratio:</span>
                    <span className="font-semibold">{formatPercentage(offer_data.operatingExpensePercentage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expense Ratio (Year 1):</span>
                    <span className="font-semibold">{formatPercentage(offer_data.expense_ratio_year_1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Operating Income:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(offer_data.net_operating_income)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Operating Expenses Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Operating Expenses Breakdown</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Property Taxes:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.propertyTaxes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Insurance:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.insurance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Property Management ({offer_data.propertyManagementFeePercentage}%):</span>
                    <span className="font-semibold">{formatCurrency(offer_data.gross_operating_income * (offer_data.propertyManagementFeePercentage / 100))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maintenance & Repairs:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.maintenanceRepairsAnnual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utilities:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.utilitiesAnnual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contract Services:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.contractServicesAnnual)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payroll:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.payrollAnnual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Marketing:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.marketingAnnual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">G&A (General & Admin):</span>
                    <span className="font-semibold">{formatCurrency(offer_data.gAndAAnnual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other Expenses:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.otherExpensesAnnual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capital Reserve/Unit:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.capitalReservePerUnitAnnual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Income Reductions:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.incomeReductionsAnnual)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow Analysis */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Cash Flow & Debt Analysis</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Mortgage Payment:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.monthly_mortgage_payment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Annual Debt Service:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.annual_debt_service)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Debt Service Coverage Ratio:</span>
                    <span className="font-semibold text-blue-600">{offer_data.debt_service_coverage_ratio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loan Balance (Year 1):</span>
                    <span className="font-semibold">{formatCurrency(offer_data.loan_balance_year_1)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash Flow Before Tax:</span>
                    <span className={`font-semibold ${(offer_data.cash_flow_before_tax || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(offer_data.cash_flow_before_tax)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash Flow After Capital Reserve:</span>
                    <span className={`font-semibold ${(offer_data.cash_flow_after_capital_reserve || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(offer_data.cash_flow_after_capital_reserve)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Break-Even Point:</span>
                    <span className="font-semibold text-purple-600">{offer_data.break_even_point}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Exit Strategy & Hold Period */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Exit Strategy & Hold Period</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Holding Period:</span>
                    <span className="font-semibold">{offer_data.holdingPeriodYears} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Disposition Cap Rate:</span>
                    <span className="font-semibold">{formatPercentage(offer_data.dispositionCapRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Refinance Term:</span>
                    <span className="font-semibold">{offer_data.refinanceTermYears} years</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Projected Equity at Horizon:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(offer_data.projected_equity_at_horizon)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deferred Capital Reserve/Unit:</span>
                    <span className="font-semibold">{formatCurrency(offer_data.deferredCapitalReservePerUnit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}