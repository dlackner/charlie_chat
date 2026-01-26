/*
 * CHARLIE2 V2 - AI Investment Analysis API
 * OpenAI-powered property investment analysis
 * Part of the new V2 API architecture
 */
import OpenAI from "openai";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface PropertyData {
  address: string;
  city: string;
  state: string;
  zip: string;
  units: number;
  yearBuilt: number;
  assessedValue: string;
  estimatedValue?: string;
  estimatedEquity?: string;
  latitude?: number;
  longitude?: number;
  lastSaleDate?: string;
  lastSaleAmount?: string;
  outOfStateAbsenteeOwner?: boolean;
  inStateAbsenteeOwner?: boolean;
}


interface AnalysisResult {
  financialStrength: {
    projectedNOI: number;
    cashOnCash: number;
    capRate: number;
    equityPosition: string;
    marketRent?: string;
    notes: string[];
  };
  propertyFeatures: {
    highlights: string[];
    marketPosition: string;
    notes: string[];
  };
  riskFactors: {
    risks: string[];
    severity: 'low' | 'medium' | 'high';
    notes: string[];
  };
  narrative: {
    marketOverview: string;
    charliesTake: string;
    strategy: string[];
    ownerApproach?: string;
    verdict: {
      decision: 'PURSUE' | 'CONSIDER' | 'PASS';
      reasoning: string;
    };
  };
  confidence: 'low' | 'medium' | 'high';
  analysisDate: string;
}

/**
 * Lookup market-specific rental rates using hybrid approach:
 * 1. Try city name matching first (fast)
 * 2. If no match, find nearest market by geographic distance
 * 3. Fallback to $1500 for rural areas >50 miles from any market
 */
async function getMarketRent(property: PropertyData): Promise<number> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Step 1: Try exact city/state matching first (fast lookup)
    const cityStatePattern = `%${property.city}, ${property.state}%`;
    const { data: cityMatch } = await supabase
      .from('market_rental_data')
      .select('monthly_rental_average')
      .ilike('city_state', cityStatePattern)
      .limit(1)
      .single();

    if (cityMatch?.monthly_rental_average) {
      console.log(`📍 Found exact city match for ${property.city}, ${property.state}: $${cityMatch.monthly_rental_average}`);
      return cityMatch.monthly_rental_average;
    }

    // Step 2: If no city match and we have coordinates, find nearest market by distance
    if (property.latitude && property.longitude) {
      const { data: nearestMarkets } = await supabase
        .from('market_rental_data')
        .select('monthly_rental_average, city_state, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (nearestMarkets && nearestMarkets.length > 0) {
        // Calculate distances and find nearest market
        let nearestMarket = null;
        let minDistance = Infinity;

        for (const market of nearestMarkets) {
          const distance = calculateDistance(
            property.latitude,
            property.longitude,
            Number(market.latitude),
            Number(market.longitude)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestMarket = market;
          }
        }

        // Only use nearest market if within 50 miles (reasonable metro area)
        if (nearestMarket && minDistance <= 50) {
          console.log(`📍 Found nearest market for ${property.city}, ${property.state}: ${nearestMarket.city_state} (${minDistance.toFixed(1)} miles) - $${nearestMarket.monthly_rental_average}`);
          return nearestMarket.monthly_rental_average;
        } else {
          console.log(`📍 No nearby markets found for ${property.city}, ${property.state} (nearest: ${minDistance?.toFixed(1)} miles)`);
        }
      }
    }

    // Step 3: Fallback to $1500 for rural areas
    console.log(`📍 Using $1500 fallback for ${property.city}, ${property.state} (rural area)`);
    return 1500;

  } catch (error) {
    console.error('Error looking up market rent:', error);
    // Fallback to $1500 on any error
    return 1500;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function performOpenAIAnalysis(prompt: string, maxTokens: number = 300): Promise<string> {
  try {
    console.log('🤖 OpenAI Analysis for:', prompt.substring(0, 100) + '...');
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a seasoned real estate investment analyst with deep market knowledge. Vary your writing style - sometimes lead with opportunities, other times with market dynamics. Be concise but not formulaic. Focus on what makes each property unique. Avoid repetitive patterns across analyses. Do not use markdown formatting or ** characters."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.8 // Increased from 0.5 for more variety
    });

    return completion.choices[0]?.message?.content || '';

  } catch (error) {
    console.error('OpenAI Analysis failed for prompt:', prompt.substring(0, 50) + '...');
    console.error('OpenAI error:', error);
    return '';
  }
}

async function performMultiPromptAnalysis(property: PropertyData): Promise<AnalysisResult> {
  console.log('🔍 Starting multi-prompt analysis for:', property.city, property.state);

  // 1. Market Overview Analysis
  const marketAge = property.yearBuilt < 1950 ? 'historic' : property.yearBuilt > 1990 ? 'modern' : 'established';
  const propertySize = property.units < 20 ? 'boutique' : property.units < 50 ? 'mid-sized' : 'substantial';
  
  // Vary the market prompt based on property characteristics
  const marketVariations = [
    `Tell me what makes ${property.city}, ${property.state} unique for multifamily investors. Focus on this ${propertySize} ${marketAge} property with ${property.units} units. What's the typical rent for a 1-bedroom apartment here?`,
    `Describe the investment climate in ${property.city}, ${property.state}. How does a ${property.units}-unit ${marketAge} property fit into this market? Include typical 1-bedroom apartment rents.`,
    `Paint a picture of ${property.city}'s rental market. What opportunities exist for a ${propertySize} ${property.units}-unit building? What do 1-bedroom apartments rent for?`
  ];
  
  const marketPrompt = marketVariations[Math.floor(Math.random() * marketVariations.length)] + '\n\nBe specific and avoid generic statements. Focus on what makes THIS market and property combination interesting.';

  // 2. Financial Analysis
  const financialPrompt = `Estimate financial metrics for a ${property.units}-unit multifamily property in ${property.city}, ${property.state}, built ${property.yearBuilt}, assessed at ${property.assessedValue}:

IMPORTANT: Provide the monthly rent for ONE 1-bedroom apartment unit only (not total building rent).

- What does ONE 1-bedroom apartment rent for per month in this market?
- Market cap rate for similar multifamily properties
- Key financial considerations for apartment buildings

Format: "$1,200 per month for a 1-bedroom unit" 
Do NOT provide total building rent. Provide ONLY per-unit rent for one apartment.`;

  // 3. Property Features Analysis
  const featuresPrompt = `List exactly 3-4 SHORT investment highlights for this property:
- ${property.units} units
- Built in ${property.yearBuilt}
- Located in ${property.city}, ${property.state}
- Assessed value: ${property.assessedValue}

Requirements:
- Each highlight must be 6 words or less
- Focus on key strengths only
- Use bullet format
- No explanations or details`;

  // 4. Risk Assessment
  const riskPrompt = `List exactly 2-3 SHORT investment risks for this property:
- ${property.units}-unit building
- Built in ${property.yearBuilt}
- Located in ${property.city}, ${property.state}

Requirements:
- Each risk must be 6 words or less
- Focus on main concerns only
- Use bullet format
- No explanations or elaboration`;

  // 5. Strategy and Verdict
  const strategyPrompt = `Provide investment strategy for this ${property.units}-unit property in ${property.city}, ${property.state}:

Write 3-4 strategic initiatives in complete sentences. Do NOT use "Action Items:" or any headers. For example: "The first priority should be conducting a thorough property inspection to assess..." 

Then give your final recommendation: PURSUE, CONSIDER, or PASS with a brief reasoning.

Property details: Built ${property.yearBuilt}, assessed ${property.assessedValue}.
Write naturally without bullet points or lists.`;

  // 6. Owner Approach Analysis (if owner data available)
  let ownerPrompt = null;
  let ownershipYears = 0;
  if (property.lastSaleDate) {
    const saleDate = new Date(property.lastSaleDate);
    ownershipYears = Math.floor((Date.now() - saleDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }
  
  const hasOwnerData = property.outOfStateAbsenteeOwner || property.inStateAbsenteeOwner || property.lastSaleDate || property.estimatedEquity;
  
  if (hasOwnerData) {
    ownerPrompt = `Create an owner outreach strategy for this property:
    
Owner profile:
- ${property.outOfStateAbsenteeOwner ? 'Out-of-state absentee owner' : property.inStateAbsenteeOwner ? 'In-state absentee owner' : 'Local owner'}
${ownershipYears > 0 && property.lastSaleDate ? `- Owned for ${ownershipYears} years (since ${new Date(property.lastSaleDate).getFullYear()})` : ''}
${property.estimatedEquity ? `- Estimated equity position: ${property.estimatedEquity}` : ''}
${property.estimatedValue ? `- Estimated value: ${property.estimatedValue}` : ''}

Write a 2-3 paragraph approach strategy. Consider:
- Best initial contact method and timing
- Key pain points or motivations based on their situation
- Value propositions that resonate with this owner type
- Potential objections and how to address them

Be specific and tactical. This should guide how to approach THIS particular owner.`;
  }

  try {
    // Execute all prompts in parallel
    const prompts = [
      performOpenAIAnalysis(marketPrompt, 400),
      performOpenAIAnalysis(financialPrompt, 200), 
      performOpenAIAnalysis(featuresPrompt, 200),
      performOpenAIAnalysis(riskPrompt, 200),
      performOpenAIAnalysis(strategyPrompt, 300)
    ];
    
    if (ownerPrompt) {
      prompts.push(performOpenAIAnalysis(ownerPrompt, 300));
    }
    
    const responses = await Promise.all(prompts);
    const [marketResponse, financialResponse, featuresResponse, riskResponse, strategyResponse] = responses;
    const ownerResponse = responses[5] || null;

    console.log('✅ All OpenAI analyses completed');
    console.log('🔍 Features response:', featuresResponse);
    console.log('🔍 Risk response:', riskResponse);

    // Parse responses and build analysis result
    return await buildAnalysisResult({
      marketResponse,
      financialResponse,
      featuresResponse,
      riskResponse,
      strategyResponse,
      ownerResponse,
      property
    });

  } catch (error) {
    console.error('❌ Multi-prompt analysis failed:', error);
    // Return fallback analysis
    return await buildFallbackAnalysis(property);
  }
}

function calculateCashOnCash(noi: number, estimatedValue: string | undefined): number {
  // Use estimated_value if available, fallback to NOI-based estimation
  let purchasePrice = 0;
  
  if (estimatedValue) {
    const cleanValue = estimatedValue.toString().replace(/[^\d]/g, '');
    purchasePrice = parseInt(cleanValue) || 0;
  }
  
  // If no estimated value or invalid, estimate based on NOI and 7.4% cap rate
  if (purchasePrice === 0) {
    purchasePrice = Math.round(noi / 0.074);
  }
  
  // Standard investment property assumptions
  const downPaymentPercent = 0.25; // 25% down payment
  const interestRate = 0.075; // 7.5% interest rate
  const loanTermYears = 30;
  const closingCostPercent = 0.03; // 3% closing costs
  
  // Calculate loan details
  const downPayment = purchasePrice * downPaymentPercent;
  const loanAmount = purchasePrice - downPayment;
  const closingCosts = purchasePrice * closingCostPercent;
  const totalCashInvested = downPayment + closingCosts;
  
  // Calculate monthly mortgage payment (P&I only)
  const monthlyRate = interestRate / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const annualDebtService = monthlyPayment * 12;
  
  // Calculate annual cash flow
  const annualCashFlow = noi - annualDebtService;
  
  // Calculate Cash-on-Cash return
  const cashOnCash = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;
  
  // Round to 1 decimal place and ensure reasonable bounds
  return Math.max(0, Math.min(50, Math.round(cashOnCash * 10) / 10));
}

async function buildAnalysisResult({
  marketResponse,
  financialResponse, 
  featuresResponse,
  riskResponse,
  strategyResponse,
  ownerResponse,
  property
}: {
  marketResponse: string;
  financialResponse: string;
  featuresResponse: string;
  riskResponse: string;
  strategyResponse: string;
  ownerResponse: string | null;
  property: PropertyData;
}): Promise<AnalysisResult> {
  // Parse financial metrics from financial response
  const rentMatch = financialResponse.match(/\$([\d,]+)/);
  const capRateMatch = financialResponse.match(/(\d+\.?\d*)%/);
  
  // Use market-specific rent data instead of hardcoded $1500
  const marketRentPerUnit = await getMarketRent(property);
  const estimatedRent = rentMatch ? parseInt(rentMatch[1].replace(/,/g, '')) : property.units * marketRentPerUnit;
  const projectedNOI = Math.round((estimatedRent * property.units * 12) * 0.65);
  const capRate = capRateMatch ? parseFloat(capRateMatch[1]) : 7.4;
  const cashOnCash = calculateCashOnCash(projectedNOI, property.estimatedValue);
  
  // Use the actual equity field from property data
  let formattedEquity = 'Unknown';
  if (property.estimatedEquity) {
    const equityStr = String(property.estimatedEquity);
    if (!equityStr.startsWith('$')) {
      const numValue = parseInt(equityStr.replace(/[^\d]/g, ''));
      if (!isNaN(numValue)) {
        formattedEquity = `$${numValue.toLocaleString()}`;
      }
    } else {
      formattedEquity = property.estimatedEquity;
    }
  } else if (property.estimatedValue && property.assessedValue) {
    // Fallback: Calculate equity as estimated - assessed if equity field not available
    const estimatedStr = String(property.estimatedValue);
    const assessedStr = String(property.assessedValue);
    
    const estimatedNum = parseInt(estimatedStr.replace(/[^\d]/g, '')) || 0;
    const assessedNum = parseInt(assessedStr.replace(/[^\d]/g, '')) || 0;
    
    if (estimatedNum > 0 && assessedNum > 0) {
      const equity = estimatedNum - assessedNum;
      formattedEquity = `$${equity.toLocaleString()}`;
    }
  }

  // Parse property features - be more careful with splitting
  console.log('🔍 Raw features response:', featuresResponse);
  
  let featuresLines = [];
  
  // Try different parsing approaches
  if (featuresResponse.includes('•')) {
    // Split by bullet points and clean up any leading hyphens or dashes
    featuresLines = featuresResponse.split('•')
      .map(line => line.trim().replace(/^[-–—]\s*/, '').trim())
      .filter(line => line.length > 5)
      .slice(0, 4);
  } else if (featuresResponse.includes('-')) {
    // Split by dashes but be more careful
    featuresLines = featuresResponse.split(/\n\s*-\s*/)
      .map(line => line.trim())
      .filter(line => line.length > 5)
      .slice(0, 4);
  } else {
    // Split by line breaks and clean up
    featuresLines = featuresResponse.split('\n')
      .map(line => line.trim().replace(/^[-•*]\s*/, '').replace(/^\d+\.?\s*/, ''))
      .filter(line => line.length > 5)
      .slice(0, 4);
  }
  
  console.log('🔍 Parsed features lines:', featuresLines);

  // Parse risk factors - be more careful with splitting
  console.log('🔍 Raw risk response:', riskResponse);
  
  let riskLines = [];
  
  if (riskResponse.includes('•')) {
    riskLines = riskResponse.split('•')
      .map(line => line.trim().replace(/^[-–—]\s*/, '').trim())
      .filter(line => line.length > 5)
      .slice(0, 3);
  } else if (riskResponse.includes('-')) {
    riskLines = riskResponse.split(/\n\s*-\s*/)
      .map(line => line.trim())
      .filter(line => line.length > 5)
      .slice(0, 3);
  } else {
    riskLines = riskResponse.split('\n')
      .map(line => line.trim().replace(/^[-•*]\s*/, '').replace(/^\d+\.?\s*/, ''))
      .filter(line => line.length > 5)
      .slice(0, 3);
  }
  
  console.log('🔍 Parsed risk lines:', riskLines);

  // Parse strategy items - now expecting complete sentences
  const strategyLines = strategyResponse
    .split(/[.!?]/)
    .map(line => line.trim())
    .filter(line => {
      const lower = line.toLowerCase();
      return line.length > 20 && 
             !lower.includes('pursue') && 
             !lower.includes('consider') && 
             !lower.includes('pass') &&
             !lower.includes('recommendation') &&
             !lower.includes('action items');
    })
    .map(line => {
      // Clean up any leading words like "First," "Next," etc.
      return line.replace(/^(First|Second|Third|Next|Then|Finally|Also),?\s*/i, '');
    })
    .slice(0, 4);

  // Parse verdict from strategy response
  let decision: 'PURSUE' | 'CONSIDER' | 'PASS' = 'CONSIDER';
  let reasoning = '';
  
  const strategyLower = strategyResponse.toLowerCase();
  if (strategyLower.includes('pursue')) {
    decision = 'PURSUE';
  } else if (strategyLower.includes('pass')) {
    decision = 'PASS';
  }
  
  // Extract reasoning (usually the last sentence or after recommendation)
  const sentences = strategyResponse.split(/[.!]/).filter(s => s.trim().length > 20);
  reasoning = sentences[sentences.length - 1]?.trim() || `${decision} recommendation based on property analysis.`;

  // Clean up market overview and investment outlook
  const marketOverview = marketResponse.trim() || `${property.city}, ${property.state} market analysis based on property characteristics.`;
  
  const ageCategory = property.yearBuilt < 1950 ? 'historic' : property.yearBuilt > 1990 ? 'modern' : 'established';
  const investmentOutlook = `This ${ageCategory} ${property.units}-unit property presents ${decision === 'PURSUE' ? 'strong' : decision === 'CONSIDER' ? 'moderate' : 'limited'} investment potential. ${marketOverview.split('.')[0]}. The financial fundamentals and market conditions suggest ${decision.toLowerCase()} this opportunity.`;

  return {
    financialStrength: {
      projectedNOI,
      cashOnCash,
      capRate,
      equityPosition: formattedEquity,
      marketRent: rentMatch ? `$${rentMatch[1]}/month` : undefined,
      notes: financialResponse ? [financialResponse.substring(0, 100).trim() + '...'] : []
    },
    propertyFeatures: {
      highlights: featuresLines.length > 0 ? featuresLines : [
        `${property.units} units generating rental income`,
        `${ageCategory} property with character`,
        `Located in ${property.city} market`
      ],
      marketPosition: '',
      notes: []
    },
    riskFactors: {
      risks: riskLines.length > 0 ? riskLines : [
        'Standard real estate investment risks',
        'Market and economic factors'
      ],
      severity: decision === 'PASS' ? 'high' : decision === 'PURSUE' ? 'low' : 'medium',
      notes: []
    },
    narrative: {
      marketOverview,
      charliesTake: investmentOutlook,
      strategy: strategyLines.length > 0 ? strategyLines : [
        'Conduct thorough property inspection',
        'Research local rental market rates',
        'Analyze property management requirements',
        'Negotiate based on market conditions'
      ],
      ownerApproach: ownerResponse || undefined,
      verdict: {
        decision,
        reasoning
      }
    },
    confidence: 'high',
    analysisDate: new Date().toLocaleDateString()
  };
}

async function buildFallbackAnalysis(property: PropertyData): Promise<AnalysisResult> {
  const ageCategory = property.yearBuilt < 1950 ? 'historic' : property.yearBuilt > 1990 ? 'modern' : 'established';
  
  // Use the actual equity field from property data
  let formattedEquity = 'Unknown';
  if (property.estimatedEquity) {
    const equityStr = String(property.estimatedEquity);
    if (!equityStr.startsWith('$')) {
      const numValue = parseInt(equityStr.replace(/[^\d]/g, ''));
      if (!isNaN(numValue)) {
        formattedEquity = `$${numValue.toLocaleString()}`;
      }
    } else {
      formattedEquity = property.estimatedEquity;
    }
  } else if (property.estimatedValue && property.assessedValue) {
    // Fallback: Calculate equity as estimated - assessed if equity field not available
    const estimatedStr = String(property.estimatedValue);
    const assessedStr = String(property.assessedValue);
    
    const estimatedNum = parseInt(estimatedStr.replace(/[^\d]/g, '')) || 0;
    const assessedNum = parseInt(assessedStr.replace(/[^\d]/g, '')) || 0;
    
    if (estimatedNum > 0 && assessedNum > 0) {
      const equity = estimatedNum - assessedNum;
      formattedEquity = `$${equity.toLocaleString()}`;
    }
  }

  // Use market-specific rent data instead of hardcoded $1500
  const marketRentPerUnit = await getMarketRent(property);
  const estimatedRent = property.units * marketRentPerUnit;
  const projectedNOI = Math.round((estimatedRent * 12) * 0.65);
  const cashOnCash = calculateCashOnCash(projectedNOI, property.estimatedValue);

  return {
    financialStrength: {
      projectedNOI,
      cashOnCash,
      capRate: 7.4,
      equityPosition: formattedEquity,
      notes: ['Analysis based on property fundamentals']
    },
    propertyFeatures: {
      highlights: [
        `${property.units} units generating rental income`,
        `${ageCategory} property with character`,
        `Located in ${property.city} market`,
        'Potential for value appreciation'
      ],
      marketPosition: '',
      notes: []
    },
    riskFactors: {
      risks: [
        'Standard real estate investment risks',
        'Market and economic factors',
        'Property age and condition considerations'
      ],
      severity: 'medium' as const,
      notes: []
    },
    narrative: {
      marketOverview: `${property.city}, ${property.state} market presents opportunities for ${ageCategory} multifamily properties. Local market conditions and rental demand should be evaluated for this ${property.units}-unit investment.`,
      charliesTake: `This ${ageCategory} ${property.units}-unit property requires detailed market analysis to determine investment potential. The fundamentals suggest moderate opportunity with proper due diligence.`,
      strategy: [
        'Conduct thorough property inspection',
        'Research local rental market rates',
        'Analyze comparable sales and market trends',
        'Evaluate property management requirements'
      ],
      verdict: {
        decision: 'CONSIDER',
        reasoning: 'Property fundamentals suggest potential but requires detailed market analysis and inspection.'
      }
    },
    confidence: 'medium',
    analysisDate: new Date().toLocaleDateString()
  };
}





export async function POST(req: Request) {
  try {
    const propertyData: PropertyData = await req.json();
    
    console.log('🏠 Analyzing property:', propertyData);
    
    // Validate required fields
    if (!propertyData.city || !propertyData.state) {
      return Response.json({ error: 'City and state are required' }, { status: 400 });
    }
    
    // Generate analysis using multiple focused OpenAI prompts
    const analysis: AnalysisResult = await performMultiPromptAnalysis(propertyData);
    
    console.log('✅ Analysis complete with confidence:', analysis.confidence);
    
    return Response.json(analysis);
    
  } catch (error) {
    console.error('❌ Investment analysis error:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : error);
    return Response.json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}