'use client';

import jsPDF from 'jspdf';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// Tax rate assumptions
const TAX_RATES = {
  federal: 0.24,    // 24%
  state: 0.06,      // 6%
  medicare: 0.038   // 3.8%
};

interface CashFlowReportProps {
  // Property Address (optional - for cash flow statement title)
  propertyStreet?: string;
  propertyCity?: string;
  propertyState?: string;
  
  // Acquisition Details
  purchasePrice: number;
  downPaymentPercentage: number;
  closingCostsPercentage: number;
  
  // Financing Terms
  interestRate: number;
  amortizationPeriodYears: number;
  loanStructure: 'amortizing' | 'interest-only';
  interestOnlyPeriodYears?: number;
  
  // Property Details
  numUnits: number;
  avgMonthlyRentPerUnit: number;
  vacancyRate: number;
  annualRentalGrowthRate: number;
  otherIncomeAnnual: number;
  incomeReductionsAnnual: number;
  
  // Operating Expenses (Annual)
  propertyTaxes: number;
  insurance: number;
  propertyManagementFeePercentage: number;
  maintenanceRepairsAnnual: number;
  utilitiesAnnual: number;
  contractServicesAnnual: number;
  payrollAnnual: number;
  marketingAnnual: number;
  gAndAAnnual: number;
  otherExpensesAnnual: number;
  expenseGrowthRate: number;
  
  // Operating Expenses Percentage Mode
  usePercentageMode?: boolean;
  operatingExpensePercentage?: number;
  
  // Capital Expenditures
  capitalReservePerUnitAnnual: number;
  holdingPeriodYears: number;
  
  // Exit Strategy
  dispositionCapRate?: number;
  
  // Report Branding (optional)
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  reportTitle?: string;
  
  // Pre-calculated values (optional - when provided, these override calculations)
  preCalculatedMetrics?: {
    cashOnCashReturn?: number;
    capRate?: number;
    debtServiceCoverageRatio?: number;
    expenseRatio?: number;
    projectedIRR?: number;
    totalROI?: number;
    projectedEquity?: number;
    netOperatingIncome?: number;
    cashFlowBeforeTax?: number;
  };
  
  // Options
  returnBlob?: boolean; // If true, returns blob instead of downloading
}

interface YearlyData {
  year: number;
  grossRentalIncome: number;
  vacancyCreditLoss: number;
  otherIncome: number;
  effectiveGrossIncome: number;
  propertyTaxes: number;
  insurance: number;
  propertyManagement: number;
  maintenanceRepairs: number;
  utilities: number;
  contractServices: number;
  payroll: number;
  marketing: number;
  gAndA: number;
  otherExpenses: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  debtService: number;
  cashFlowBeforeTax: number;
  depreciation: number;
  interestDeduction: number;
  principalPayment: number;
  taxableIncome: number;
  taxLiability: number;
  cashFlowAfterTax: number;
}

export const generate10YearCashFlowReport = async (props: CashFlowReportProps): Promise<Blob | void> => {
  const {
    propertyStreet,
    propertyCity,
    propertyState,
    purchasePrice,
    downPaymentPercentage,
    closingCostsPercentage,
    interestRate,
    amortizationPeriodYears,
    loanStructure,
    interestOnlyPeriodYears = 10,
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
    usePercentageMode = false,
    operatingExpensePercentage = 45,
    capitalReservePerUnitAnnual,
    holdingPeriodYears
  } = props;

  // Get user profile and logo
  const supabase = createSupabaseBrowserClient();
  let logoUrl = null;
  let businessName = 'YOUR BUSINESS';
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')  // Select all columns to see what's available
        .eq('user_id', user.id)
        .single();
      
      console.log('Profile data:', profile);
      console.log('Profile error:', error);
      
      if (profile) {
        businessName = profile.business_name || profile.company_name || 'YOUR BUSINESS';
        logoUrl = profile.logo_base64 || profile.logo_url || profile.logo;
        console.log('Business name:', businessName);
        console.log('Logo URL:', logoUrl);
      }
    }
  } catch (error) {
    console.log('Could not fetch user profile for logo:', error);
  }

  // Calculate basic financing metrics
  const downPaymentAmount = purchasePrice * (downPaymentPercentage / 100);
  const loanAmount = purchasePrice - downPaymentAmount;
  const closingCosts = purchasePrice * (closingCostsPercentage / 100);
  const totalInitialInvestment = downPaymentAmount + closingCosts;
  
  const monthlyInterestRate = (interestRate / 100) / 12;
  const numberOfPayments = amortizationPeriodYears * 12;
  
  // Calculate monthly mortgage payment
  let monthlyMortgagePayment = 0;
  if (loanStructure === 'interest-only') {
    monthlyMortgagePayment = loanAmount * monthlyInterestRate;
  } else {
    if (monthlyInterestRate === 0) {
      monthlyMortgagePayment = numberOfPayments === 0 ? 0 : loanAmount / numberOfPayments;
    } else {
      monthlyMortgagePayment = loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
        (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    }
  }
  
  const annualDebtService = monthlyMortgagePayment * 12;
  
  // Calculate annual depreciation (27.5 years for residential rental property)
  const annualDepreciation = purchasePrice / 27.5;
  
  // Generate 10-year projections with proper amortization
  const yearlyData: YearlyData[] = [];
  let remainingBalance = loanAmount;
  
  for (let year = 1; year <= 10; year++) {
    const growthFactor = Math.pow(1 + (annualRentalGrowthRate / 100), year - 1);
    const expenseGrowthFactor = Math.pow(1 + (expenseGrowthRate / 100), year - 1);
    
    // INCOME CALCULATIONS
    const grossRentalIncome = (numUnits * avgMonthlyRentPerUnit * 12) * growthFactor;
    const vacancyCreditLoss = grossRentalIncome * (vacancyRate / 100);
    const effectiveRentalIncome = grossRentalIncome - vacancyCreditLoss;
    const otherIncome = (otherIncomeAnnual - incomeReductionsAnnual) * growthFactor;
    const effectiveGrossIncome = effectiveRentalIncome + otherIncome;
    
    // OPERATING EXPENSES CALCULATIONS
    let yearlyPropertyTaxes, yearlyInsurance, yearlyPropertyManagement, yearlyMaintenanceRepairs;
    let yearlyUtilities, yearlyContractServices, yearlyPayroll, yearlyMarketing, yearlyGAndA, yearlyOtherExpenses;
    let totalOperatingExpenses;
    
    if (usePercentageMode) {
      // In percentage mode, show $0 for individual items and calculate total from percentage
      yearlyPropertyTaxes = 0;
      yearlyInsurance = 0;
      yearlyPropertyManagement = 0;
      yearlyMaintenanceRepairs = 0;
      yearlyUtilities = 0;
      yearlyContractServices = 0;
      yearlyPayroll = 0;
      yearlyMarketing = 0;
      yearlyGAndA = 0;
      yearlyOtherExpenses = 0;
      
      totalOperatingExpenses = effectiveGrossIncome * (operatingExpensePercentage / 100) * expenseGrowthFactor;
    } else {
      // In detailed mode, calculate individual line items
      yearlyPropertyTaxes = propertyTaxes * expenseGrowthFactor;
      yearlyInsurance = insurance * expenseGrowthFactor;
      yearlyPropertyManagement = effectiveGrossIncome * (propertyManagementFeePercentage / 100);
      yearlyMaintenanceRepairs = maintenanceRepairsAnnual * expenseGrowthFactor;
      yearlyUtilities = utilitiesAnnual * expenseGrowthFactor;
      yearlyContractServices = contractServicesAnnual * expenseGrowthFactor;
      yearlyPayroll = payrollAnnual * expenseGrowthFactor;
      yearlyMarketing = marketingAnnual * expenseGrowthFactor;
      yearlyGAndA = gAndAAnnual * expenseGrowthFactor;
      yearlyOtherExpenses = otherExpensesAnnual * expenseGrowthFactor;
      
      totalOperatingExpenses = yearlyPropertyTaxes + yearlyInsurance + yearlyPropertyManagement + 
        yearlyMaintenanceRepairs + yearlyUtilities + yearlyContractServices + yearlyPayroll + 
        yearlyMarketing + yearlyGAndA + yearlyOtherExpenses;
    }
    
    // FINANCIAL METRICS
    const netOperatingIncome = effectiveGrossIncome - totalOperatingExpenses;
    const cashFlowBeforeTax = netOperatingIncome - annualDebtService;
    
    // AMORTIZATION CALCULATIONS (proper interest vs principal split)
    let yearlyInterestPayment = 0;
    let yearlyPrincipalPayment = 0;
    
    if (loanStructure === 'interest-only') {
      yearlyInterestPayment = remainingBalance * (interestRate / 100);
      yearlyPrincipalPayment = 0;
    } else {
      // Calculate interest and principal for amortizing loan
      for (let month = 1; month <= 12; month++) {
        const monthlyInterestPayment = remainingBalance * monthlyInterestRate;
        const monthlyPrincipalPayment = monthlyMortgagePayment - monthlyInterestPayment;
        
        yearlyInterestPayment += monthlyInterestPayment;
        yearlyPrincipalPayment += monthlyPrincipalPayment;
        
        remainingBalance -= monthlyPrincipalPayment;
      }
    }
    
    // TAX CALCULATIONS
    const interestDeduction = yearlyInterestPayment;
    const taxableIncome = Math.max(0, netOperatingIncome - interestDeduction - annualDepreciation);
    const combinedTaxRate = TAX_RATES.federal + TAX_RATES.state + TAX_RATES.medicare;
    const taxLiability = taxableIncome * combinedTaxRate;
    const cashFlowAfterTax = cashFlowBeforeTax - taxLiability;
    
    yearlyData.push({
      year,
      grossRentalIncome,
      vacancyCreditLoss,
      otherIncome,
      effectiveGrossIncome,
      propertyTaxes: yearlyPropertyTaxes,
      insurance: yearlyInsurance,
      propertyManagement: yearlyPropertyManagement,
      maintenanceRepairs: yearlyMaintenanceRepairs,
      utilities: yearlyUtilities,
      contractServices: yearlyContractServices,
      payroll: yearlyPayroll,
      marketing: yearlyMarketing,
      gAndA: yearlyGAndA,
      otherExpenses: yearlyOtherExpenses,
      totalOperatingExpenses,
      netOperatingIncome,
      debtService: annualDebtService,
      cashFlowBeforeTax,
      depreciation: annualDepreciation,
      interestDeduction,
      principalPayment: yearlyPrincipalPayment,
      taxableIncome,
      taxLiability,
      cashFlowAfterTax
    });
  }

  // Generate PDF Report
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  
  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  // Helper function to format percentage
  const formatPercent = (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  // Helper function to format numbers without currency
  const formatNumber = (amount: number): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0';
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Set up document dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 20;
  const rightMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  let yPosition = 40;

  // LOGO (top left)
  console.log('Attempting to load logo:', logoUrl);
  
  if (logoUrl && logoUrl.trim() !== '') {
    try {
      // If logo exists, add it to the PDF
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('Logo loaded successfully:', img.width, 'x', img.height);
          resolve(img);
        };
        img.onerror = (e) => {
          console.log('Logo failed to load:', e);
          reject(e);
        };
        
        // Handle both base64 data URLs and regular URLs
        if (logoUrl.startsWith('data:')) {
          img.src = logoUrl; // Base64 data URL
        } else {
          img.crossOrigin = 'anonymous';
          img.src = logoUrl; // Regular URL
        }
      });
      
      // Calculate logo dimensions (max 120x40)
      const maxWidth = 120;
      const maxHeight = 40;
      const aspectRatio = img.width / img.height;
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;
      
      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }
      
      console.log('Adding logo to PDF:', logoWidth, 'x', logoHeight);
      // For base64 data, detect format from the data URL
      let imageFormat = 'JPEG';
      if (logoUrl.startsWith('data:image/png')) {
        imageFormat = 'PNG';
      } else if (logoUrl.toLowerCase().includes('.png')) {
        imageFormat = 'PNG';
      }
      
      doc.addImage(logoUrl, imageFormat, leftMargin, yPosition - 5, logoWidth, logoHeight);
      
    } catch (error) {
      console.log('Error loading logo:', error);
      // Fallback to text if image fails to load
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(businessName, leftMargin, yPosition);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Analysis Report', leftMargin, yPosition + 12);
    }
  } else {
    console.log('No logo URL available, using text fallback');
    // Fallback to business name text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(businessName, leftMargin, yPosition);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Analysis', leftMargin, yPosition + 12);
  }

  // HEADER SECTION (centered)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('10-Year After Tax Cash Flow Analysis', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Show property address if provided (smaller font than title)
  if (propertyStreet || propertyCity || propertyState) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const addressParts = [propertyStreet, propertyCity, propertyState].filter(Boolean);
    const addressText = addressParts.join(', ');
    doc.text(addressText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
  } else {
    yPosition += 5;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Investment Property Analysis', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  doc.text(`Fiscal Year Beginning ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 25;

  // TWO SUMMARY BOXES (left and right sides)
  const boxWidth = (contentWidth - 40) / 2;
  const boxHeight = 100;
  const bannerHeight = 16;
  
  // Investment Summary box (left side)
  let boxX = leftMargin;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(boxX, yPosition, boxWidth, boxHeight);
  
  // Orange banner for Investment Summary (matching sidebar orange-500)
  doc.setFillColor(249, 115, 22); // Orange-500 color
  doc.rect(boxX, yPosition, boxWidth, bannerHeight, 'F');
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('INVESTMENT SUMMARY', boxX + boxWidth/2, yPosition + 10, { align: 'center' });
  
  // Reset text color to black for content
  doc.setTextColor(0, 0, 0);
  
  // Left column items (more compact)
  doc.setFont('helvetica', 'normal');
  doc.text(`Purchase Price`, boxX + 5, yPosition + 26);
  doc.text(`Down Payment (${formatPercent(downPaymentPercentage)})`, boxX + 5, yPosition + 34);
  doc.text(`Acquisition Costs`, boxX + 5, yPosition + 42);
  doc.text(`Loan Amount`, boxX + 5, yPosition + 50);
  doc.text(`Interest Rate`, boxX + 5, yPosition + 58);
  doc.text(`Monthly Payment`, boxX + 5, yPosition + 66);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Initial Investment`, boxX + 5, yPosition + 82);

  // Right column amounts
  const valueX = boxX + boxWidth - 5;
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(purchasePrice), valueX, yPosition + 26, { align: 'right' });
  doc.text(formatCurrency(downPaymentAmount), valueX, yPosition + 34, { align: 'right' });
  doc.text(formatCurrency(closingCosts), valueX, yPosition + 42, { align: 'right' });
  doc.text(formatCurrency(loanAmount), valueX, yPosition + 50, { align: 'right' });
  doc.text(formatPercent(interestRate), valueX, yPosition + 58, { align: 'right' });
  doc.text(formatCurrency(monthlyMortgagePayment), valueX, yPosition + 66, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalInitialInvestment), valueX, yPosition + 82, { align: 'right' });

  // Key Financial Metrics box (right side)
  boxX = pageWidth - rightMargin - boxWidth;
  doc.rect(boxX, yPosition, boxWidth, boxHeight);
  
  // Orange banner for Key Financial Metrics (matching sidebar orange-500)
  doc.setFillColor(249, 115, 22); // Orange-500 color
  doc.rect(boxX, yPosition, boxWidth, bannerHeight, 'F');
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('KEY FINANCIAL METRICS', boxX + boxWidth/2, yPosition + 10, { align: 'center' });
  
  // Reset text color to black for content
  doc.setTextColor(0, 0, 0);
  
  // Calculate key metrics - use pre-calculated values if provided, otherwise calculate
  const year1Data = yearlyData[0];
  
  // Use pre-calculated values if available, otherwise calculate
  const expenseRatio = props.preCalculatedMetrics?.expenseRatio ?? 
    (year1Data.effectiveGrossIncome > 0 ? (year1Data.totalOperatingExpenses / year1Data.effectiveGrossIncome) * 100 : 0);
  
  const capRate = props.preCalculatedMetrics?.capRate ?? 
    (purchasePrice > 0 ? (year1Data.netOperatingIncome / purchasePrice) * 100 : 0);
  
  const dscr = props.preCalculatedMetrics?.debtServiceCoverageRatio ?? 
    (annualDebtService > 0 ? year1Data.netOperatingIncome / annualDebtService : 0);
  
  const cashOnCashReturn = props.preCalculatedMetrics?.cashOnCashReturn ?? 
    (totalInitialInvestment > 0 ? (year1Data.cashFlowAfterTax / totalInitialInvestment) * 100 : 0);
  
  // Calculate actual remaining loan balance at end of holding period
  let finalLoanBalance = loanAmount;
  for (let year = 1; year <= holdingPeriodYears; year++) {
    const yearData = yearlyData[Math.min(year - 1, yearlyData.length - 1)]; // Use available data or last year
    finalLoanBalance -= yearData.principalPayment;
  }
  
  // Use pre-calculated projected equity if available, otherwise calculate
  const projectedEquity = props.preCalculatedMetrics?.projectedEquity ?? (() => {
    const projectedPropertyValue = purchasePrice * Math.pow(1.03, holdingPeriodYears);
    return projectedPropertyValue - Math.max(0, finalLoanBalance);
  })();
  
  // Use pre-calculated IRR and ROI if available, otherwise calculate
  const annualizedReturn = props.preCalculatedMetrics?.projectedIRR ?? (() => {
    const totalCashFlows = yearlyData.reduce((sum, data) => sum + data.cashFlowAfterTax, 0);
    const totalReturn = totalCashFlows + projectedEquity;
    return totalInitialInvestment > 0 ? (Math.pow(totalReturn / totalInitialInvestment, 1/holdingPeriodYears) - 1) * 100 : 0;
  })();
  
  const totalROI = props.preCalculatedMetrics?.totalROI ?? (() => {
    const totalCashFlows = yearlyData.reduce((sum, data) => sum + data.cashFlowAfterTax, 0);
    const totalReturn = totalCashFlows + projectedEquity;
    return totalInitialInvestment > 0 ? ((totalReturn - totalInitialInvestment) / totalInitialInvestment) * 100 : 0;
  })();
  
  // Display metrics (more compact)
  doc.setFont('helvetica', 'normal');
  doc.text(`Expense Ratio (Year 1)`, boxX + 5, yPosition + 26);
  doc.text(`Cap Rate (Year 1)`, boxX + 5, yPosition + 34);
  doc.text(`Debt Service Coverage Ratio`, boxX + 5, yPosition + 42);
  doc.text(`Cash-on-Cash Return (Year 1)`, boxX + 5, yPosition + 50);
  doc.text(`Annualized Return (${holdingPeriodYears} Year)`, boxX + 5, yPosition + 58);
  doc.text(`Total ROI (${holdingPeriodYears} Year)`, boxX + 5, yPosition + 66);
  doc.setFont('helvetica', 'bold');
  doc.text(`Projected Equity (Year ${holdingPeriodYears})`, boxX + 5, yPosition + 82);

  // Right column values
  const metricsValueX = boxX + boxWidth - 5;
  doc.setFont('helvetica', 'normal');
  doc.text(formatPercent(expenseRatio), metricsValueX, yPosition + 26, { align: 'right' });
  doc.text(formatPercent(capRate), metricsValueX, yPosition + 34, { align: 'right' });
  doc.text(dscr.toFixed(2), metricsValueX, yPosition + 42, { align: 'right' });
  doc.text(formatPercent(cashOnCashReturn), metricsValueX, yPosition + 50, { align: 'right' });
  doc.text(formatPercent(annualizedReturn), metricsValueX, yPosition + 58, { align: 'right' });
  doc.text(formatPercent(totalROI), metricsValueX, yPosition + 66, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(projectedEquity), metricsValueX, yPosition + 82, { align: 'right' });

  yPosition += boxHeight + 20;

  // Create table structure like the example
  const rowHeight = 8;
  
  // Column definitions
  const labelColWidth = 140;
  const yearColWidth = 60;
  
  // Draw blue header bar (Charlie blue color)
  const headerHeight = 20;
  doc.setFillColor(28, 89, 159); // Charlie blue color
  doc.rect(leftMargin, yPosition, contentWidth, headerHeight, 'F');
  
  // Draw table headers with white text
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255); // White text
  
  // Draw header row
  doc.text('For the Year Ending', leftMargin + 10, yPosition + 12);
  for (let year = 1; year <= 10; year++) {
    const xPos = leftMargin + labelColWidth + (year - 1) * yearColWidth;
    // Center the year headers over their columns
    doc.text(`Year ${year}`, xPos + yearColWidth/2, yPosition + 8, { align: 'center' });
    doc.text(`${new Date().getFullYear() + year - 1}`, xPos + yearColWidth/2, yPosition + 15, { align: 'center' });
  }
  
  // Reset text color to black for body content
  doc.setTextColor(0, 0, 0);
  yPosition += headerHeight + 5;

  // Table sections with data
  const sections = [
    {
      title: 'RENTAL INCOME',
      items: [
        { label: 'Vacancy / Credit Loss', getValue: (data: YearlyData) => -data.vacancyCreditLoss, underline: true },
        { label: 'EFFECTIVE RENTAL INCOME', getValue: (data: YearlyData) => data.grossRentalIncome - data.vacancyCreditLoss, bold: true, blankAfter: true },
        { label: 'Other Income', getValue: (data: YearlyData) => data.otherIncome, underline: true },
        { label: 'GROSS OPERATING INCOME', getValue: (data: YearlyData) => data.effectiveGrossIncome, bold: true, blankAfter: true }
      ]
    },
    {
      title: 'OPERATING EXPENSES',
      items: [
        { label: 'Property Taxes', getValue: (data: YearlyData) => -data.propertyTaxes },
        { label: 'Insurance', getValue: (data: YearlyData) => -data.insurance },
        { label: 'Property Management', getValue: (data: YearlyData) => -data.propertyManagement },
        { label: 'Maintenance & Repairs', getValue: (data: YearlyData) => -data.maintenanceRepairs },
        { label: 'Utilities', getValue: (data: YearlyData) => -data.utilities },
        { label: 'Contract Services', getValue: (data: YearlyData) => -data.contractServices },
        { label: 'Payroll', getValue: (data: YearlyData) => -data.payroll },
        { label: 'Marketing', getValue: (data: YearlyData) => -data.marketing },
        { label: 'General & Administrative', getValue: (data: YearlyData) => -data.gAndA },
        { label: 'Other Expenses', getValue: (data: YearlyData) => -data.otherExpenses, underline: true },
        { label: 'TOTAL OPERATING EXPENSES', getValue: (data: YearlyData) => -data.totalOperatingExpenses, bold: true, blankAfter: true },
        { label: 'NET OPERATING INCOME', getValue: (data: YearlyData) => data.netOperatingIncome, bold: true, blankAfter: true }
      ]
    },
    {
      title: 'FINANCING',
      items: [
        { label: 'Depreciation', getValue: (data: YearlyData) => -data.depreciation },
        { label: '1st Lien Interest Deduction', getValue: (data: YearlyData) => -data.interestDeduction },
        { label: 'Amortized Loan Costs', getValue: () => -closingCosts * 0.2 / amortizationPeriodYears, underline: true },
        { label: 'TOTAL TAX DEDUCTIONS', getValue: (data: YearlyData) => -(data.depreciation + data.interestDeduction + (closingCosts * 0.2 / amortizationPeriodYears)), bold: true, blankAfter: true },
        { label: 'TAXABLE INCOME', getValue: (data: YearlyData) => data.taxableIncome, bold: true, blankAfter: true },
        { label: `Federal Marginal Tax Rate ${formatPercent(TAX_RATES.federal * 100)}`, getValue: (data: YearlyData) => -data.taxableIncome * TAX_RATES.federal },
        { label: `Local Marginal Tax Rate ${formatPercent(TAX_RATES.state * 100)}`, getValue: (data: YearlyData) => -data.taxableIncome * TAX_RATES.state },
        { label: `Medicare Surtax ${formatPercent(TAX_RATES.medicare * 100)}`, getValue: (data: YearlyData) => -data.taxableIncome * TAX_RATES.medicare, underline: true },
        { label: 'TAX LIABILITY', getValue: (data: YearlyData) => data.taxLiability, bold: true, blankAfter: true },
        { label: 'NET OPERATING INCOME', getValue: (data: YearlyData) => data.netOperatingIncome, bold: true, blankAfter: true },
        { label: 'Capital Expenses / Replacement Reserves', getValue: () => -capitalReservePerUnitAnnual * numUnits },
        { label: 'Annual Debt Service 1st Lien', getValue: (data: YearlyData) => -data.debtService, underline: true },
        { label: 'CASH FLOW BEFORE TAXES', getValue: (data: YearlyData) => data.cashFlowBeforeTax, bold: true, blankAfter: true },
        { label: 'Tax Liability', getValue: (data: YearlyData) => -data.taxLiability, underline: true },
        { label: 'CASH FLOW AFTER TAXES', getValue: (data: YearlyData) => data.cashFlowAfterTax, bold: true, blankAfter: true }
      ]
    }
  ];

  // First, add Rental Income data row
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('RENTAL INCOME', leftMargin + 10, yPosition);
  for (let year = 1; year <= 10; year++) {
    const data = yearlyData[year - 1];
    const xPos = leftMargin + labelColWidth + (year - 1) * yearColWidth;
    doc.text(formatCurrency(data.grossRentalIncome), xPos + yearColWidth - 5, yPosition, { align: 'right' });
  }
  yPosition += rowHeight;

  // Draw all sections
  sections.forEach(section => {
    section.items.forEach((item: any) => {
      doc.setFontSize(5);
      doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
      doc.text(item.label, leftMargin + 10, yPosition);
      
      for (let year = 1; year <= 10; year++) {
        const data = yearlyData[year - 1];
        const value = item.getValue(data);
        const xPos = leftMargin + labelColWidth + (year - 1) * yearColWidth;
        const formattedValue = formatCurrency(value);
        doc.text(formattedValue, xPos + yearColWidth - 5, yPosition, { align: 'right' });
        
        // Add underline for specific items (consistent width, right-aligned to match numbers)
        if (item.underline) {
          const rightEdge = xPos + yearColWidth - 5; // Same position as right-aligned text
          const underlineWidth = 40; // Fixed width for all underlines
          doc.line(rightEdge - underlineWidth, yPosition + 1, rightEdge, yPosition + 1);
        }
      }
      yPosition += rowHeight;
      
      // Add blank line after bold items
      if (item.blankAfter) {
        yPosition += rowHeight;
      }
    });
  });

  // Save the PDF or return blob based on options
  if (props.returnBlob) {
    // Return the PDF as a blob instead of downloading
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  } else {
    // Download the PDF directly
    doc.save('10-Year-Investment-Analysis.pdf');
  }
};

export default generate10YearCashFlowReport;