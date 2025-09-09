import OpenAI from "openai";

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
  latitude?: number;
  longitude?: number;
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
    verdict: {
      decision: 'PURSUE' | 'CONSIDER' | 'PASS';
      reasoning: string;
    };
  };
  confidence: 'low' | 'medium' | 'high';
  analysisDate: string;
}

async function performOpenAIAnalysis(prompt: string, maxTokens: number = 300): Promise<string> {
  try {
    console.log('🤖 OpenAI Analysis for:', prompt.substring(0, 100) + '...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a real estate investment expert. Provide concise, data-driven analysis. Focus on actionable insights. Keep responses brief and well-formatted. Do not use markdown formatting or ** characters."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.1
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
  const marketPrompt = `Analyze the real estate market for ${property.city}, ${property.state}. Provide 2-3 sentences about:
- Market characteristics and investment climate
- Average 1-bedroom rental rates if available
- Current market trends

Property context: ${property.units}-unit ${property.yearBuilt < 1950 ? 'historic' : property.yearBuilt > 1990 ? 'modern' : 'established'} property.

Keep response concise and factual.`;

  // 2. Financial Analysis
  const financialPrompt = `Estimate financial metrics for a ${property.units}-unit property in ${property.city}, ${property.state}, built ${property.yearBuilt}, assessed at ${property.assessedValue}:

- Monthly rent per unit estimate
- Market cap rate for similar properties
- Key financial considerations

Provide specific numbers when possible. Keep response brief.`;

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
  const strategyPrompt = `Provide investment recommendation for this ${property.units}-unit property in ${property.city}, ${property.state}:

1. List 3-4 specific action items for approaching this investment
2. Give final recommendation: PURSUE, CONSIDER, or PASS
3. Provide 1-sentence reasoning

Property details: Built ${property.yearBuilt}, assessed ${property.assessedValue}.
Keep response structured and actionable.`;

  try {
    // Execute all prompts in parallel
    const [marketResponse, financialResponse, featuresResponse, riskResponse, strategyResponse] = await Promise.all([
      performOpenAIAnalysis(marketPrompt, 200),
      performOpenAIAnalysis(financialPrompt, 200), 
      performOpenAIAnalysis(featuresPrompt, 200),
      performOpenAIAnalysis(riskPrompt, 200),
      performOpenAIAnalysis(strategyPrompt, 300)
    ]);

    console.log('✅ All OpenAI analyses completed');
    console.log('🔍 Features response:', featuresResponse);
    console.log('🔍 Risk response:', riskResponse);

    // Parse responses and build analysis result
    return buildAnalysisResult({
      marketResponse,
      financialResponse,
      featuresResponse,
      riskResponse,
      strategyResponse,
      property
    });

  } catch (error) {
    console.error('❌ Multi-prompt analysis failed:', error);
    // Return fallback analysis
    return buildFallbackAnalysis(property);
  }
}

function buildAnalysisResult({
  marketResponse,
  financialResponse, 
  featuresResponse,
  riskResponse,
  strategyResponse,
  property
}: {
  marketResponse: string;
  financialResponse: string;
  featuresResponse: string;
  riskResponse: string;
  strategyResponse: string;
  property: PropertyData;
}): AnalysisResult {
  // Parse financial metrics from financial response
  const rentMatch = financialResponse.match(/\$([\d,]+)/);
  const capRateMatch = financialResponse.match(/(\d+\.?\d*)%/);
  
  const estimatedRent = rentMatch ? parseInt(rentMatch[1].replace(/,/g, '')) : property.units * 1500;
  const projectedNOI = Math.round((estimatedRent * property.units * 12) * 0.65);
  const capRate = capRateMatch ? parseFloat(capRateMatch[1]) : 7.4;
  
  // Format equity position
  let formattedEquity = property.assessedValue || 'Unknown';
  if (property.assessedValue) {
    const assessedStr = String(property.assessedValue);
    if (!assessedStr.startsWith('$')) {
      const numValue = parseInt(assessedStr.replace(/[^\d]/g, ''));
      if (!isNaN(numValue)) {
        formattedEquity = `$${numValue.toLocaleString()}`;
      }
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

  // Parse strategy items
  const strategyLines = strategyResponse
    .split(/\n|•|-/)
    .map(line => line.trim().replace(/^\d+\.?\s*/, '').trim())
    .filter(line => line.length > 10 && !line.toLowerCase().includes('pursue') && !line.toLowerCase().includes('consider') && !line.toLowerCase().includes('pass'))
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
      cashOnCash: 8.2,
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
      verdict: {
        decision,
        reasoning
      }
    },
    confidence: 'high',
    analysisDate: new Date().toLocaleDateString()
  };
}

function buildFallbackAnalysis(property: PropertyData): AnalysisResult {
  const ageCategory = property.yearBuilt < 1950 ? 'historic' : property.yearBuilt > 1990 ? 'modern' : 'established';
  
  let formattedEquity = property.assessedValue || 'Unknown';
  if (property.assessedValue) {
    const assessedStr = String(property.assessedValue);
    if (!assessedStr.startsWith('$')) {
      const numValue = parseInt(assessedStr.replace(/[^\d]/g, ''));
      if (!isNaN(numValue)) {
        formattedEquity = `$${numValue.toLocaleString()}`;
      }
    }
  }

  const estimatedRent = property.units * 1500;
  const projectedNOI = Math.round((estimatedRent * 12) * 0.65);

  return {
    financialStrength: {
      projectedNOI,
      cashOnCash: 8.2,
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