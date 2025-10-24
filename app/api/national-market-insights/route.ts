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
    const prompt = `Generate 3 specific, data-driven national multifamily real estate market insights for today's investors. Current date: ${new Date().toLocaleDateString()}.

Context: Focus on actionable intelligence for apartment building investors, including specific metrics, trends, and market opportunities.

Please provide exactly 3 insights in this format:
1. MARKET TREND: [Include specific data like "Cap rates averaging X%" or "Rents up X% nationally" or "Vacancy rates at X%" - be specific with numbers and timeframes]
2. RATE IMPACT: [How current Fed rates (mention approximate current rate) are affecting deal structures, financing costs, or investment strategies - include specific impacts]  
3. OPPORTUNITY: [Specific geographic markets, property types, or investment strategies showing promise - mention specific markets/states if relevant]

Requirements:
- Include specific numbers, percentages, or data points where possible
- Mention current approximate interest rates (around 7-8% range)
- Reference specific US markets or regions when relevant
- Focus on actionable insights investors can use immediately
- Each insight should be 1-2 sentences maximum`;

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
      max_tokens: 200,
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
      } else if (line.includes('INTEREST RATE IMPACT:') || line.includes('2.')) {
        interestRateImpact = line.replace(/^.*(?:INTEREST RATE IMPACT:|2\.)\s*/, '').trim();
      } else if (line.includes('OPPORTUNITY OUTLOOK:') || line.includes('3.')) {
        opportunityOutlook = line.replace(/^.*(?:OPPORTUNITY OUTLOOK:|3\.)\s*/, '').trim();
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