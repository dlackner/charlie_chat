import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30;

// Function to get market rental data for YOY growth analysis only
async function getMarketRentalGrowth(city: string, state: string): Promise<{ yoy: string; source: string }> {
  try {
    console.log(`🔍 Looking up market rental growth for ${city}, ${state}`);
    
    // Use OpenAI to find YOY growth data only
    const searchPrompt = `Find the year-over-year rental growth rate for ${city}, ${state} as of 2024-2025. 

Look for:
- YOY rental growth percentage
- Market trends and growth direction
- Data sources for rental growth

Do NOT provide rental prices - only growth rates and trends.

Format as: "X% annual growth" or "Growth varies by market segment"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are a real estate market analyst. Provide only rental growth data, not actual rental prices. Focus on market trends and year-over-year changes." 
        },
        { role: "user", content: searchPrompt }
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const responseContent = completion.choices[0]?.message?.content;
    console.log(`🔍 Market growth response for ${city}, ${state}:`, responseContent);
    
    if (responseContent) {
      return {
        yoy: responseContent.trim(),
        source: `Market growth analysis for ${city}, ${state}`
      };
    }

    return {
      yoy: 'Growth data not available',
      source: 'No growth data found'
    };
    
  } catch (error) {
    console.error(`Error in market growth lookup for ${city}, ${state}:`, error);
    return {
      yoy: 'Growth data not available',
      source: 'Error retrieving growth data'
    };
  }
}

// Function to get rental data - uses ONLY user input from offer analyzer
async function getUserRentalData(userRentData: any, city: string, state: string): Promise<{ monthlyAverage: number; yoy: string; source: string }> {
  // Extract user's rental input from JSONB - monthly rental is required field
  const userRent = userRentData.avgMonthlyRentPerUnit ||
                   userRentData.currentRent || 
                   userRentData.current_rent || 
                   userRentData.currentMonthlyRent || 
                   userRentData.monthly_rent || 
                   userRentData.grossRent || 
                   userRentData.gross_rent || 
                   userRentData.totalRent ||
                   userRentData.monthly_rental_income ||
                   userRentData.monthlyRent ||
                   userRentData.rent;

  let monthlyAverage = 0;
  
  if (userRent && typeof userRent === 'number' && userRent > 0) {
    monthlyAverage = userRent;
    console.log(`📍 Using user's rental input: $${userRent}/month`);
  } else if (userRent && typeof userRent === 'string') {
    const parsedRent = parseInt(userRent.replace(/[^0-9]/g, ''));
    if (parsedRent > 0) {
      monthlyAverage = parsedRent;
      console.log(`📍 Using parsed user rental input: $${parsedRent}/month`);
    }
  }
  
  if (monthlyAverage === 0) {
    throw new Error(`No rental data found in offer analyzer for ${city}, ${state}. Monthly rental rate is required.`);
  }
  
  // Get market growth data for context
  const growthData = await getMarketRentalGrowth(city, state);
  
  return {
    monthlyAverage,
    yoy: growthData.yoy,
    source: 'User input from offer analyzer'
  };
}

export async function POST(req: NextRequest) {
  try {
    const { property, offerScenario, investment_sentiment, deal_summary } = await req.json();

    console.log('📊 Investment Analysis Request:');
    console.log('- Investment Sentiment:', investment_sentiment);
    console.log('- Deal Summary:', deal_summary);

    if (!property || !offerScenario) {
      return NextResponse.json(
        { error: 'Property and offer scenario data required' },
        { status: 400 }
      );
    }

    // Prepare property data summary
    const propertyData = {
      address: `${property.address_street}, ${property.address_city}, ${property.address_state}`,
      units: property.units_count || 'N/A',
      yearBuilt: property.year_built || 'N/A',
      assessedValue: property.assessed_value || 'N/A',
      estimatedValue: property.estimated_value || 'N/A',
      estimatedEquity: property.estimated_equity || 'N/A',
      mortgageBalance: property.mortgage_balance || 'N/A',
      lastSaleDate: property.last_sale_date || 'N/A',
      lastSaleAmount: property.last_sale_amount || 'N/A',
      ownerType: property.out_of_state_absentee_owner ? 'Out-of-State Absentee' :
                 property.in_state_absentee_owner ? 'In-State Absentee' : 'Local Owner',
      floodZone: property.flood_zone ? 'Yes' : 'No'
    };

    // Extract ALL data from the JSONB offer_data field first
    const offerData = offerScenario.offer_data || {};
    
    // Get user's rental data from offer analyzer
    const marketRentalData = await getUserRentalData(offerData, property.address_city, property.address_state);
    
    // Extract ALL financial data from JSONB - comprehensive extraction
    const allOfferKeys = Object.keys(offerData);
    console.log('All available JSONB keys:', allOfferKeys);
    console.log('Raw JSONB data:', JSON.stringify(offerData, null, 2));
    
    // Prepare comprehensive financial data using ACTUAL JSONB field names
    const financialData = {
      // Core pricing - using exact JSONB field names
      purchasePrice: offerData.purchasePrice || 'N/A',
      downPayment: offerData.down_payment_amount || 'N/A',
      downPaymentPercentage: offerData.downPaymentPercentage || 'N/A',
      renovationBudget: offerData.renovationBudget || 0,
      
      // Returns - using exact JSONB field names
      projectedIRR: offerData.projected_irr || 'N/A',
      projectedCashOnCash: offerData.cash_on_cash_return || 'N/A',
      projectedCapRate: offerData.cap_rate_year_1 || 'N/A',
      projectedEquityAtHorizon: offerData.projected_equity_at_horizon || 'N/A',
      roiAtHorizon: offerData.roi_at_horizon || 'N/A',
      
      // Rental income data - using exact JSONB field names
      avgMonthlyRentPerUnit: offerData.avgMonthlyRentPerUnit || 'N/A',
      numUnits: offerData.numUnits || property.units_count || 'N/A',
      grossOperatingIncome: offerData.gross_operating_income || 'N/A',
      marketRent: marketRentalData.monthlyAverage,
      marketRentYOY: marketRentalData.yoy,
      marketRentSource: marketRentalData.source,
      annualRentalGrowthRate: offerData.annualRentalGrowthRate || 'N/A',
      vacancyRate: offerData.vacancyRate || 'N/A',
      otherIncomeAnnual: offerData.otherIncomeAnnual || 'N/A',
      incomeReductionsAnnual: offerData.incomeReductionsAnnual || 'N/A',
      
      // Operating expenses - using exact JSONB field names
      propertyTaxes: offerData.propertyTaxes || 'N/A',
      insurance: offerData.insurance || 'N/A',
      maintenanceRepairsAnnual: offerData.maintenanceRepairsAnnual || 'N/A',
      propertyManagementFeePercentage: offerData.propertyManagementFeePercentage || 'N/A',
      utilitiesAnnual: offerData.utilitiesAnnual || 'N/A',
      contractServicesAnnual: offerData.contractServicesAnnual || 'N/A',
      payrollAnnual: offerData.payrollAnnual || 'N/A',
      marketingAnnual: offerData.marketingAnnual || 'N/A',
      gAndAAnnual: offerData.gAndAAnnual || 'N/A',
      otherExpensesAnnual: offerData.otherExpensesAnnual || 'N/A',
      expenseGrowthRate: offerData.expenseGrowthRate || 'N/A',
      expenseRatioYear1: offerData.expense_ratio_year_1 || 'N/A',
      usePercentageMode: offerData.usePercentageMode || false,
      operatingExpensePercentage: offerData.operatingExpensePercentage || 'N/A',
      
      // Financial metrics - using exact JSONB field names
      netOperatingIncome: offerData.net_operating_income || 'N/A',
      debtServiceCoverageRatio: offerData.debt_service_coverage_ratio || 'N/A',
      annualDebtService: offerData.annual_debt_service || 'N/A',
      cashFlowBeforeTax: offerData.cash_flow_before_tax || 'N/A',
      cashFlowAfterCapitalReserve: offerData.cash_flow_after_capital_reserve || 'N/A',
      
      // Financing details - using exact JSONB field names
      loanAmount: offerData.loan_amount || 'N/A',
      interestRate: offerData.interestRate || 'N/A',
      amortizationPeriodYears: offerData.amortizationPeriodYears || 'N/A',
      loanStructure: offerData.loanStructure || 'N/A',
      interestOnlyPeriodYears: offerData.interestOnlyPeriodYears || 'N/A',
      monthlyMortgagePayment: offerData.monthly_mortgage_payment || 'N/A',
      closingCostsPercentage: offerData.closingCostsPercentage || 'N/A',
      totalCashInvested: offerData.total_cash_invested || 'N/A',
      totalAcquisitionCost: offerData.total_acquisition_cost || 'N/A',
      
      // Investment strategy details
      holdingPeriodYears: offerData.holdingPeriodYears || 'N/A',
      dispositionCapRate: offerData.dispositionCapRate || 'N/A',
      capitalReservePerUnitAnnual: offerData.capitalReservePerUnitAnnual || 'N/A',
      deferredCapitalReservePerUnit: offerData.deferredCapitalReservePerUnit || 'N/A',
      refinanceTermYears: offerData.refinanceTermYears || 'N/A',
      loanBalanceYear1: offerData.loan_balance_year_1 || 'N/A',
      breakEvenPoint: offerData.break_even_point || 'N/A',
      
      // Extract any remaining numeric/financial fields from JSONB
      ...Object.keys(offerData).reduce((acc, key) => {
        if (typeof offerData[key] === 'number' || 
            (typeof offerData[key] === 'string' && offerData[key].toString().match(/^[\$]?[\d,]+\.?\d*%?$/))) {
          acc[key] = offerData[key];
        }
        return acc;
      }, {} as any)
    };
    
    console.log('Enhanced financial data extracted:', JSON.stringify(financialData, null, 2));

    // Create sentiment-based prompt modifiers
    const sentimentModifiers = {
      conservative: "Take a cautious, risk-aware approach. Emphasize potential challenges, market risks, and conservative assumptions. Focus on downside protection and thorough due diligence requirements.",
      measured: "Provide a balanced analysis that considers both opportunities and risks. Use realistic market assumptions and highlight both potential upside and downside scenarios.",
      confident: "Present an optimistic but grounded outlook. Emphasize growth potential and positive market trends while acknowledging manageable risks.",
      bullish: "Focus on strong growth assumptions and market opportunities. Emphasize upside potential and favorable market conditions while noting key success factors.",
      aggressive: "Highlight maximum return potential and aggressive growth strategies. Focus on value creation opportunities and ambitious but achievable projections."
    };

    const sentimentTone = sentimentModifiers[investment_sentiment as keyof typeof sentimentModifiers] || sentimentModifiers.confident;

    console.log('🎯 Applied Sentiment Tone:', investment_sentiment, '→', sentimentTone.substring(0, 100) + '...');

    const systemPrompt = `You are a senior institutional real estate investment analyst preparing a comprehensive investment memorandum for sophisticated investors. This analysis must demonstrate thorough due diligence and professional preparation. ${sentimentTone}

PROPERTY DATA:
${JSON.stringify(propertyData, null, 2)}

COMPREHENSIVE FINANCIAL DATA:
${JSON.stringify(financialData, null, 2)}

MARKET RENTAL DATA:
- Market Rent: $${marketRentalData.monthlyAverage}/month per unit
- YOY Growth: ${marketRentalData.yoy}
- Source: ${marketRentalData.source}

DEAL SUMMARY: ${deal_summary}

CRITICAL REQUIREMENTS:
- Use ACTUAL numbers from the financial data provided
- Reference specific market rental comparisons
- Demonstrate sophisticated financial analysis
- Show detailed understanding of operating expenses
- Present professional-grade investment reasoning
- Include specific calculations and metrics
- Sound like a prepared, knowledgeable investor who has done extensive homework
- NEVER use wishy-washy language like "warrants further investigation" or "requires analysis"
- Make DEFINITIVE statements and recommendations based on the data
- Write with CONFIDENCE - this is a funding request, not a research proposal
- Avoid phrases like "may", "might", "could", "should be analyzed", "requires further study"
- State conclusions directly: "This investment delivers X% IRR" not "This investment appears to offer potential returns"
- Sound like someone who has ALREADY done all due diligence and is presenting findings`;

    const userPrompt = `Create a comprehensive multifamily investment analysis. Write ONLY the content for each section - do not repeat section headers. Make each section unique and detailed:

SECTION 1 - EXECUTIVE SUMMARY:
Write a 2-3 paragraph CONFIDENT executive summary presenting a COMPELLING investment opportunity at ${propertyData.address}. State definitively: This investment DELIVERS ${financialData.projectedIRR} IRR and ${financialData.projectedCashOnCash} Cash-on-Cash returns with ${financialData.projectedCapRate} Cap Rate. Acquisition at $${Math.round(financialData.purchasePrice || 0).toLocaleString()} generates $${Math.round(financialData.netOperatingIncome || 0).toLocaleString()} NOI. Current rents of $${financialData.avgMonthlyRentPerUnit}/unit are at market rate of $${financialData.marketRent}, creating stable income foundation. Present this as a proven opportunity with quantified returns, not a speculative investment. Make a strong recommendation to move forward.

SECTION 2 - PROPERTY OVERVIEW:
Write 2-3 paragraphs describing: physical building details (${financialData.numUnits} units, built ${propertyData.yearBuilt}), location in ${propertyData.address}, current condition, architectural features, and neighborhood characteristics. Do NOT repeat financial metrics from Section 1.

SECTION 3 - MARKET ANALYSIS:
Write 2-3 paragraphs presenting DEFINITIVE market analysis for ${property.address_city}, ${property.address_state}. STATE FACTS: Market rent IS $${financialData.marketRent}/month with ${financialData.marketRentYOY} YOY growth (${financialData.marketRentSource}). Current property rents of $${financialData.avgMonthlyRentPerUnit}/unit match market rate, confirming optimal positioning. Present demographic strength, economic drivers, and competitive advantages. NO speculation - state market realities that support the investment thesis.

SECTION 4 - FINANCIAL ANALYSIS:
Write 4-5 comprehensive paragraphs demonstrating COMPLETE financial mastery. Use ALL available data and state financial performance as ESTABLISHED FACTS. Write flowing paragraphs without labels:

First paragraph - Detail the complete acquisition: Purchase price $${Math.round(financialData.purchasePrice || 0).toLocaleString()}, down payment $${Math.round(financialData.downPayment || 0).toLocaleString()} (${financialData.downPaymentPercentage}%), total cash invested $${Math.round(financialData.totalCashInvested || 0).toLocaleString()}, loan amount $${Math.round(financialData.loanAmount || 0).toLocaleString()} at ${financialData.interestRate}% for ${financialData.amortizationPeriodYears} years (${financialData.loanStructure}), closing costs ${financialData.closingCostsPercentage}%, total acquisition cost $${Math.round(financialData.totalAcquisitionCost || 0).toLocaleString()}. State the complete capital stack as COMMITTED funding.

Second paragraph - Current gross operating income $${Math.round(financialData.grossOperatingIncome || 0).toLocaleString()} from ${financialData.numUnits} units at $${financialData.avgMonthlyRentPerUnit}/month per unit after ${financialData.vacancyRate}% vacancy allowance. Market rate $${financialData.marketRent}/month with ${financialData.marketRentYOY} YOY growth confirmed by ${financialData.marketRentSource}. Rent growth IS ${financialData.annualRentalGrowthRate}% annually. Additional income ${financialData.otherIncomeAnnual} with reductions ${financialData.incomeReductionsAnnual}.

Third paragraph - Detailed expense structure: Property taxes $${Math.round(financialData.propertyTaxes || 0).toLocaleString()}, insurance $${Math.round(financialData.insurance || 0).toLocaleString()}, maintenance $${Math.round(financialData.maintenanceRepairsAnnual || 0).toLocaleString()}, management ${financialData.propertyManagementFeePercentage}% of income, utilities $${Math.round(financialData.utilitiesAnnual || 0).toLocaleString()}, contract services $${Math.round(financialData.contractServicesAnnual || 0).toLocaleString()}, payroll $${Math.round(financialData.payrollAnnual || 0).toLocaleString()}, marketing $${Math.round(financialData.marketingAnnual || 0).toLocaleString()}, G&A $${Math.round(financialData.gAndAAnnual || 0).toLocaleString()}, other $${Math.round(financialData.otherExpensesAnnual || 0).toLocaleString()}. Expense ratio ${financialData.expenseRatioYear1} with ${financialData.expenseGrowthRate}% annual growth.

Fourth paragraph - Net Operating Income $${Math.round(financialData.netOperatingIncome || 0).toLocaleString()}, annual debt service $${Math.round(financialData.annualDebtService || 0).toLocaleString()}, cash flow before tax $${Math.round(financialData.cashFlowBeforeTax || 0).toLocaleString()}. CONFIRMED returns: ${financialData.projectedIRR} IRR, ${financialData.projectedCashOnCash} Cash-on-Cash, ${financialData.projectedCapRate} Cap Rate. DSCR of ${financialData.debtServiceCoverageRatio}. Total ROI at horizon ${financialData.roiAtHorizon}. Equity at horizon $${Math.round(financialData.projectedEquityAtHorizon || 0).toLocaleString()}.

Fifth paragraph - Break-even point ${financialData.breakEvenPoint} provides security. Capital reserves $${financialData.capitalReservePerUnitAnnual}/unit annually with deferred reserves $${financialData.deferredCapitalReservePerUnit}/unit. This acquisition DELIVERS the stated returns with conservative assumptions. Financial modeling confirms sustainable cash flows and superior risk-adjusted returns over ${financialData.holdingPeriodYears}-year hold period.

SECTION 5 - INVESTMENT STRATEGY:
Write 2-3 paragraphs outlining EXECUTABLE value creation plan. Present strategy as COMMITTED action plan: operational improvements implementation, capital improvements deployment (capital reserves: $${financialData.capitalReservePerUnitAnnual}/unit annually), rent optimization EXECUTION (current rent $${financialData.avgMonthlyRentPerUnit} at market $${financialData.marketRent}), expense management execution with ${financialData.expenseGrowthRate}% growth control, and exit strategy at ${financialData.dispositionCapRate}% cap rate after ${financialData.holdingPeriodYears} years. State specific financial targets as COMMITMENTS focused on proven execution capabilities.

SECTION 6 - RISK ASSESSMENT:
Write 2-3 paragraphs identifying specific risks with PROVEN mitigation strategies already in place: property age (${propertyData.yearBuilt}), flood zone status (${propertyData.floodZone}), market risks, financial leverage risks with ${financialData.loanStructure} loan structure over ${financialData.amortizationPeriodYears} years, and operational risks. Present mitigation as IMPLEMENTED protections. State risk management as ESTABLISHED capabilities that protect investor capital through ${financialData.holdingPeriodYears}-year investment horizon.

SECTION 7 - INVESTMENT RECOMMENDATION:
Write 2-3 paragraphs with DEFINITIVE final recommendation. State recommendation as FACT: "This investment IS recommended for immediate funding" based on ${financialData.projectedIRR} IRR and ${financialData.projectedCashOnCash} Cash-on-Cash returns. Present investor suitability as CONFIRMED match, recommended ${financialData.holdingPeriodYears}-year hold period as OPTIMAL strategy, due diligence as COMPLETED verification, and next steps as IMMEDIATE action items. Make STRONG recommendation based on investment sentiment and demonstrate this opportunity IS ready for funding commitment.

Important: Each section must be completely different content. Do not repeat financial numbers across sections except where specifically relevant to that section's focus.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const analysisContent = completion.choices[0]?.message?.content || '';

    // Parse the response into sections using the new format
    const parsedAnalysis = {
      executive_summary: extractSectionByNumber(analysisContent, 1),
      property_overview: extractSectionByNumber(analysisContent, 2),
      market_analysis: extractSectionByNumber(analysisContent, 3),
      financial_analysis: extractSectionByNumber(analysisContent, 4),
      investment_strategy: extractSectionByNumber(analysisContent, 5),
      risk_assessment: extractSectionByNumber(analysisContent, 6),
      recommendation: extractSectionByNumber(analysisContent, 7),
    };

    return NextResponse.json(parsedAnalysis);

  } catch (error) {
    console.error('Error generating comprehensive investment analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate investment analysis' },
      { status: 500 }
    );
  }
}

function extractSectionByNumber(fullContent: string, sectionNumber: number): string {
  console.log(`Extracting section ${sectionNumber} from content:`, fullContent.substring(0, 500));
  
  // Look for section that starts with "SECTION {number}" or similar patterns
  const sectionPattern = new RegExp(`SECTION\\s+${sectionNumber}[\\s\\S]*?(?=SECTION\\s+${sectionNumber + 1}|$)`, 'i');
  const sectionMatch = fullContent.match(sectionPattern);
  
  if (sectionMatch) {
    console.log(`Found section ${sectionNumber} match:`, sectionMatch[0].substring(0, 200));
    // Remove the section header and return clean content
    const content = sectionMatch[0]
      .replace(/SECTION\s+\d+[^\n]*\n?/i, '')
      .trim();
    return content || `Section ${sectionNumber} analysis will be provided based on the property data.`;
  }
  
  console.log(`No section ${sectionNumber} found, using fallback`);
  
  // Fallback: Split by double newlines and try to get content by paragraph position
  const paragraphs = fullContent.split('\n\n').filter(p => p.trim().length > 20);
  const estimatedParagraphIndex = Math.max(0, (sectionNumber - 1) * 2);
  
  if (paragraphs[estimatedParagraphIndex]) {
    const fallbackContent = paragraphs.slice(estimatedParagraphIndex, estimatedParagraphIndex + 3).join('\n\n');
    return fallbackContent || `Section ${sectionNumber} analysis based on property and financial data.`;
  }
  
  return `Comprehensive analysis for section ${sectionNumber} will be provided based on the property and financial data.`;
}