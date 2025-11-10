/*
 * MFOS - National Market Insights API
 * Provides general national market trends for the community dashboard
 * No user-specific data - general market insights for all users
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    // Generate national market insights using OpenAI
    const nationalInsights = await generateNationalInsights();
    
    return NextResponse.json(nationalInsights);
  } catch (error) {
    console.error('Error generating national market insights:', error);
    
    // Return fallback insights
    return NextResponse.json([
      {
        type: 'info',
        title: 'Market Analysis',
        description: 'Analyzing current national multifamily market conditions...',
        timestamp: new Date().toISOString()
      },
      {
        type: 'warning', 
        title: 'Interest Rate Environment',
        description: 'Current interest rates continue to impact investment strategies.',
        timestamp: new Date().toISOString()
      },
      {
        type: 'success',
        title: 'Investment Opportunities',
        description: 'Multifamily markets showing resilience across various regions.',
        timestamp: new Date().toISOString()
      }
    ]);
  }
}

async function generateNationalInsights() {
  try {
    console.log('🤖 Starting national insights generation...');
    const prompt = `Generate 3 detailed, data-driven national multifamily real estate market insights for today's investors. Current date: ${new Date().toLocaleDateString()}.

Context: You are providing actionable intelligence for sophisticated apartment building investors who want specific metrics, market trends, and investment opportunities they can act on immediately.

Please provide exactly 3 comprehensive insights in this format:
1. MARKET TREND: [Provide specific national data like "Multifamily rents have increased X% year-over-year, with average monthly rents now at $X,XXX nationwide. Cap rates are averaging X.X% in primary markets and X.X% in secondary markets. Vacancy rates have declined to X.X% nationally, down from X.X% last year, indicating strong demand." Include specific timeframes and regional variations.]

2. RATE IMPACT: [Detail how current Fed rates (mention specific current rate around 5.25-5.50%) are affecting the market: "With the Federal Funds Rate at X.X%, multifamily financing costs have risen to approximately X.X-X.X% for acquisition loans and X.X-X.X% for construction financing. This has shifted investment strategies toward value-add properties where investors can increase NOI through renovations, rather than relying solely on appreciation. Deal volume has decreased by approximately X% compared to last year as investors require higher initial yields."]

3. OPPORTUNITY: [Identify specific geographic markets and strategies: "Secondary markets like [City, State] and [City, State] are showing strong fundamentals with X.X% population growth and X.X% job growth. Class B and C properties in these markets offer cap rates of X.X-X.X%, compared to X.X-X.X% in primary markets. Workforce housing targeting households earning $XX,XXX-$XX,XXX annually represents the strongest opportunity, particularly in markets with major employer expansion."]

Requirements:
- Include specific numbers, percentages, cap rates, and dollar amounts
- Mention current Fed funds rate (around 5.25-5.50%)
- Reference 2-3 specific US markets or regions with actual growth data
- Provide actionable investment strategies
- Each insight should be 3-4 detailed sentences with specific data points
- Focus on information sophisticated investors can immediately apply to their underwriting and market selection`;

    const result = await openai.chat.completions.create({
      model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a national real estate market analyst. Provide concise, current market insights for multifamily investors. Do not use markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.1
    });

    const response = result.choices[0]?.message?.content || '';
    const lines = response.split('\n').filter(line => line.trim());
    
    let marketTrend = 'Analyzing current national multifamily market conditions...';
    let interestRateImpact = 'Evaluating interest rate impacts on investment strategies...';
    let opportunityOutlook = 'Identifying emerging investment opportunities...';

    lines.forEach(line => {
      if (line.includes('MARKET TREND:') || line.includes('1.')) {
        marketTrend = line.replace(/^.*(?:MARKET TREND:|1\.)\s*/, '').trim();
      } else if (line.includes('RATE IMPACT:') || line.includes('2.')) {
        interestRateImpact = line.replace(/^.*(?:RATE IMPACT:|2\.)\s*/, '').trim();
      } else if (line.includes('OPPORTUNITY:') || line.includes('3.')) {
        opportunityOutlook = line.replace(/^.*(?:OPPORTUNITY:|3\.)\s*/, '').trim();
      }
    });

    return [
      {
        type: 'info',
        title: 'National Market Trend',
        description: marketTrend,
        timestamp: new Date().toISOString()
      },
      {
        type: 'warning',
        title: 'Interest Rate Impact', 
        description: interestRateImpact,
        timestamp: new Date().toISOString()
      },
      {
        type: 'success',
        title: 'Investment Outlook',
        description: opportunityOutlook,
        timestamp: new Date().toISOString()
      }
    ];

  } catch (error) {
    console.error('Error generating AI insights:', error);
    throw error;
  }
}