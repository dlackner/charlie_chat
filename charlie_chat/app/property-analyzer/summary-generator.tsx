import React, { useState } from 'react';
import { getGradeFromScore, getGradeThreshold } from './grading-system';
import { generate10YearCashFlowReport } from './cash-flow-report'; 

// Property Summary Generator
const generatePropertySummary = (
    gradeResult: { grade: string; score: number; breakdown: Record<string, number>; classification: { assetClass: string; marketTier: string } },
    metrics: {
        purchasePrice: number;
        numUnits: number;
        avgMonthlyRentPerUnit: number;
        irr: number;
        cashOnCashReturn: number;
        capRate: number;
        dscr: number;
        expenseRatio: number;
        breakEvenYear: number | null;
    }
): string => {
    const { grade, score, breakdown, classification } = gradeResult;

    // Format property basics
    const pricePerUnit = metrics.purchasePrice / metrics.numUnits;
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);

    const formatAssetClass = (assetClass: string) => {
        return assetClass.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const formatMarketTier = (marketTier: string) => {
        return marketTier.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    // Analyze performance drivers
    const topPerformers = Object.entries(breakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2);

    const weakestAreas = Object.entries(breakdown)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 2);

    // Determine overall performance category
    let performanceCategory = '';
    let performanceReason = '';

    if (score >= 85) {
        performanceCategory = 'exceptional';
        performanceReason = 'significantly outperforming market benchmarks';
    } else if (score >= 78) {
        performanceCategory = 'strong';
        performanceReason = 'consistently above market expectations';
    } else if (score >= 70) {
        performanceCategory = 'good';
        performanceReason = 'performing above market averages';
    } else if (score >= 55) {
        performanceCategory = 'market-level';
        performanceReason = 'meeting typical market performance';
    } else if (score >= 40) {
        performanceCategory = 'below-market';
        performanceReason = 'underperforming market expectations';
    } else {
        performanceCategory = 'poor';
        performanceReason = 'significantly underperforming market standards';
    }

    // Generate key insights
    const insights = [];

    // Annualized Return insight
    if (breakdown['IRR vs Market'] >= 70) {
        insights.push(`Strong annualized return of ${metrics.irr.toFixed(1)}% delivers solid returns`);
    } else if (breakdown['IRR vs Market'] <= 40) {
        insights.push(`Annualized return of ${metrics.irr.toFixed(1)}% is below market expectations`);
    }

    // Cash flow insight
    if (breakdown['Cash-on-Cash vs Market'] >= 70) {
        insights.push(`Excellent cash-on-cash return of ${metrics.cashOnCashReturn.toFixed(1)}%`);
    } else if (breakdown['Cash-on-Cash vs Market'] <= 40) {
        insights.push(`Cash-on-cash return of ${metrics.cashOnCashReturn.toFixed(1)}% is concerning`);
    }

    // DSCR insight
    if (breakdown['DSCR vs Market'] >= 70) {
        insights.push(`Strong debt coverage ratio of ${metrics.dscr.toFixed(2)} indicates low financing risk`);
    } else if (breakdown['DSCR vs Market'] <= 40) {
        insights.push(`DSCR of ${metrics.dscr.toFixed(2)} presents elevated financing risk`);
    }

    // Cap rate insight
    if (breakdown['Cap Rate vs Market'] >= 70) {
        insights.push(`Cap rate of ${metrics.capRate.toFixed(1)}% offers attractive yield`);
    } else if (breakdown['Cap Rate vs Market'] <= 40) {
        insights.push(`Cap rate of ${metrics.capRate.toFixed(1)}% suggests premium pricing`);
    }

    // Expense efficiency insight
    if (breakdown['Expense Efficiency'] >= 70) {
        insights.push(`Expense ratio of ${metrics.expenseRatio.toFixed(1)}% demonstrates efficient operations`);
    } else if (breakdown['Expense Efficiency'] <= 40) {
        insights.push(`Expense ratio of ${metrics.expenseRatio.toFixed(1)}% indicates operational inefficiencies`);
    }

    // Break-even insight
    if (metrics.breakEvenYear !== null && metrics.breakEvenYear <= 2) {
        insights.push(`Fast break-even in Year ${metrics.breakEvenYear} accelerates returns`);
    } else if (metrics.breakEvenYear === null || metrics.breakEvenYear > 5) {
        insights.push(`Extended break-even period delays positive cash flow`);
    }

    // Generate improvement suggestions
    const generateImprovementSuggestions = () => {
        const suggestions = [];

        // Annualized Return improvements
        if (breakdown['IRR vs Market'] < 60) {
            suggestions.push({
                category: 'Return Enhancement',
                suggestions: [
                    'Negotiate purchase price down by 5-10% to improve returns',
                    'Explore value-add opportunities (unit upgrades, amenity improvements)',
                    'Consider alternative financing with better terms',
                    'Implement rent growth strategies (market-rate adjustments, lease renewals)'
                ]
            });
        }

        // Cash-on-Cash improvements
        if (breakdown['Cash-on-Cash vs Market'] < 60) {
            suggestions.push({
                category: 'Cash Flow Optimization',
                suggestions: [
                    'Increase down payment to reduce debt service and improve cash flow',
                    'Negotiate seller financing or assumable loans at better rates',
                    'Implement immediate rent increases where market allows',
                    'Add revenue streams (parking fees, storage, laundry, pet fees)',
                    'Consider short-term rental opportunities for select units'
                ]
            });
        }

        // DSCR improvements
        if (breakdown['DSCR vs Market'] < 60) {
            suggestions.push({
                category: 'Financing Risk Reduction',
                suggestions: [
                    'Increase NOI through rent optimization and expense reduction',
                    'Refinance to lower interest rate or extend amortization',
                    'Consider interest-only period to improve initial DSCR',
                    'Negotiate purchase price reduction to lower debt service',
                    'Explore mezzanine financing to reduce primary debt'
                ]
            });
        }

        // Cap Rate improvements (buying at better value)
        if (breakdown['Cap Rate vs Market'] < 60) {
            suggestions.push({
                category: 'Acquisition Pricing',
                suggestions: [
                    'Negotiate purchase price down - currently paying premium to market',
                    'Wait for better market conditions if this is discretionary',
                    'Look for similar properties with better cap rates in the market',
                    'Consider properties requiring light renovation for better basis',
                    'Explore off-market opportunities for better pricing'
                ]
            });
        }

        // Expense efficiency improvements
        if (breakdown['Expense Efficiency'] < 60) {
            suggestions.push({
                category: 'Operational Efficiency',
                suggestions: [
                    'Audit property management fees - shop for competitive rates',
                    'Implement energy efficiency improvements to reduce utilities',
                    'Negotiate better insurance rates or increase deductibles',
                    'Review maintenance contracts and vendor pricing',
                    'Consider self-management for smaller properties',
                    'Install smart home technology to reduce maintenance calls',
                    'Implement preventive maintenance program to reduce repairs'
                ]
            });
        }

        // Break-even improvements
        if (breakdown['Break-Even Speed'] < 60) {
            suggestions.push({
                category: 'Cash Flow Acceleration',
                suggestions: [
                    'Focus on immediate revenue increases (rent to market, add fees)',
                    'Reduce initial capital expenditures to essential items only',
                    'Negotiate seller credits for deferred maintenance',
                    'Consider graduated rent increases in early years',
                    'Implement cost reduction initiatives in year one'
                ]
            });
        }

        // ROI improvements
        if (breakdown['ROI at Horizon'] < 60) {
            suggestions.push({
                category: 'Long-Term Value Creation',
                suggestions: [
                    'Develop comprehensive value-add business plan',
                    'Consider unit mix optimization (convert to higher-rent layouts)',
                    'Explore highest and best use alternatives',
                    'Plan strategic capital improvements to drive rent premiums',
                    'Consider condo conversion potential in strong markets'
                ]
            });
        }

        return suggestions;
    };

    const improvements = generateImprovementSuggestions();

    // Build summary
    let summary = `## Investment Summary\n\n`;

    summary += `**${formatCurrency(metrics.purchasePrice)} • ${metrics.numUnits} Units • Likely ${formatAssetClass(classification.assetClass)} • ${formatMarketTier(classification.marketTier)} Market**\n\n`;

    summary += `This property receives a **${grade} grade (${Math.round(score)}/100)** for ${performanceCategory} performance, ${performanceReason}.\n\n`;

    summary += `**Key Metrics:** ${formatCurrency(pricePerUnit)} per unit • ${formatCurrency(metrics.avgMonthlyRentPerUnit)}/month rent • ${metrics.irr.toFixed(1)}% Annualized Return • ${metrics.cashOnCashReturn.toFixed(1)}% Cash-on-Cash\n\n`;

    if (insights.length > 0) {
        summary += `**Key Performance Drivers:**\n`;
        insights.slice(0, 3).forEach(insight => {
            summary += `• ${insight}\n`;
        });
        summary += `\n`;
    }

    // Top performers and weaknesses
    summary += `**Strongest Areas:** ${topPerformers.map(([metric, score]) => `${metric} (${Math.round(score)}/100)`).join(', ')}\n\n`;

    if (weakestAreas[0][1] < 60) {
        summary += `**Areas for Improvement:** ${weakestAreas.map(([metric, score]) => `${metric} (${Math.round(score)}/100)`).join(', ')}\n\n`;
    }

    // Add improvement suggestions
    if (improvements.length > 0) {
        summary += `## Improvement Strategies\n\n`;

        improvements.slice(0, 3).forEach(improvement => {
            summary += `**${improvement.category}:**\n`;
            improvement.suggestions.slice(0, 4).forEach(suggestion => {
                summary += `• ${suggestion}\n`;
            });
            summary += `\n`;
        });

   // Potential grade improvement estimate
        const potentialImprovement = Math.min(15, improvements.length * 3);
        const potentialNewScore = Math.min(100, score + potentialImprovement);
        const potentialGrade = getGradeFromScore(potentialNewScore);
        const currentGradeThreshold = getGradeThreshold(grade);

        // Only show improvement potential if there's meaningful improvement
        if (potentialNewScore > score + 2 && improvements.length > 0) {
            if (grade === 'A+') {
                // Already at top grade
                if (potentialNewScore > score + 3) {
                    summary += `**Improvement Potential:** Implementing these strategies could further strengthen the A+ performance to **${Math.round(potentialNewScore)}/100**, solidifying the investment case.\n\n`;
                }
            } else if (potentialGrade !== grade) {
                // Grade would actually improve
                summary += `**Improvement Potential:** Implementing these strategies could potentially improve the grade to **${potentialGrade} (${Math.round(potentialNewScore)}/100)**\n\n`;
            } else {
                // Same grade but higher score
                summary += `**Improvement Potential:** Implementing these strategies could strengthen the **${grade}** performance to **${Math.round(potentialNewScore)}/100**\n\n`;
            }
        }
    }

    // Investment recommendation
    if (score >= 70) {
        summary += `**Investment Outlook:** This property demonstrates ${performanceCategory} fundamentals with ${topPerformers[0][0].toLowerCase()} as a key strength. The metrics support proceeding with detailed due diligence.`;
    } else if (score >= 55) {
        summary += `**Investment Outlook:** This represents a market-level opportunity. Consider if the risk-adjusted returns align with your investment objectives and if improvements can be made to ${weakestAreas[0][0].toLowerCase()}.`;
    } else {
        summary += `**Investment Outlook:** This property faces significant challenges, particularly with ${weakestAreas[0][0].toLowerCase()}. Consider passing unless substantial improvements can be identified or pricing reflects the risks.`;
    }

    if (improvements.length > 0) {
        summary += ` The improvement strategies above could help enhance performance and justify the investment.`;
    }

    return summary;
};

// React Component for the Summary Button and Modal
const PropertySummaryButton = ({
    gradeResult,
    metrics,
    userClass,
    propertyData
}: {
    gradeResult: { grade: string; score: number; breakdown: Record<string, number>; classification: { assetClass: string; marketTier: string } };
    metrics: any;
    userClass?: string;
    propertyData?: any;
}) => {
    const [showSummary, setShowSummary] = useState(false);
    const [summary, setSummary] = useState('');

    // Check if user has access to Charlie's Analysis
    // Must match the same logic as My Properties access control
    const hasAccess = userClass && (
        userClass === "charlie_chat_pro" ||
        userClass === "cohort" ||
        userClass === "trial" ||
        userClass === "pro"
    );

    const handleGenerateSummary = async () => {
        if (!hasAccess) {
            return; // This shouldn't happen due to button restrictions, but defensive check
        }
        
        const generatedSummary = generatePropertySummary(gradeResult, metrics);
        setSummary(generatedSummary);
        setShowSummary(true);
    };

    const handleGenerateCashFlowReport = async () => {
        if (propertyData) {
            await generate10YearCashFlowReport(propertyData);
        }
    };
    const handlePrintSummary = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Investment Analysis Summary</title>
        <style>
          @page { size: A4; margin: 0.75in; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px; line-height: 1.6; color: #374151; font-size: 14px;
          }
          .header { 
            text-align: center; margin-bottom: 30px; padding-bottom: 15px;
            border-bottom: 3px solid #ea580c;
          }
          .header h1 { 
            margin: 0; font-size: 24px; font-weight: 700; color: #1f2937;
          }
          h2 { 
            color: #ea580c; font-size: 18px; font-weight: 700; 
            margin: 24px 0 12px 0;
          }
          p { 
            margin: 8px 0; color: #374151;
          }
          .font-semibold { 
            font-weight: 600; color: #1f2937; margin: 12px 0 4px 0;
          }
          .ml-4 { 
            margin-left: 16px; margin-bottom: 4px;
          }
          .mb-2 { 
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Investment Analysis Summary</h1>
        </div>
        ${summary.split('\n').map(line => {
            if (line.startsWith('## ')) {
                return `<h2>${line.replace('## ', '')}</h2>`;
            } else if (line.startsWith('**') && line.endsWith('**')) {
                return `<p class="font-semibold">${line.replace(/\*\*/g, '')}</p>`;
            } else if (line.startsWith('• ')) {
                return `<p class="ml-4">${line}</p>`;
            } else if (line.trim()) {
                return `<p class="mb-2">${line}</p>`;
            }
            return '<div style="margin-bottom: 8px;"></div>';
        }).join('')}
      </body>
    </html>
  `);

        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    };

    return (
        <>
{/* Summary Button */}
<div className="mt-8 text-center">
    {hasAccess ? (
        <button
            onClick={handleGenerateSummary}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-2xl py-3 px-8 rounded-lg transition-colors duration-150 shadow-lg flex items-center mx-auto space-x-2 h-16"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Charlie's Analysis</span>
        </button>
    ) : (
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700">Charlie's Analysis</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
                Get AI-powered investment analysis plus a lender-ready 10-year cash flow report
            </p>
            <p className="text-xs text-gray-500 mb-4">
                Available for Pro and Cohort users
            </p>
            <button
                onClick={() => window.location.href = '/pricing'}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-150"
            >
                Upgrade to Access
            </button>
        </div>
    )}
</div>

            {/* Summary Modal */}
            {showSummary && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">Charlie's Analysis</h2>
                                <button
                                    onClick={() => setShowSummary(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="prose max-w-none">
                                {summary.split('\n').map((line, index) => {
                                    if (line.startsWith('## ')) {
                                        return <h2 key={index} className="text-xl font-bold text-orange-600 mt-4 mb-2">{line.replace('## ', '')}</h2>;
                                    } else if (line.startsWith('**') && line.endsWith('**')) {
                                        return <p key={index} className="font-semibold text-gray-900 mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
                                    } else if (line.startsWith('• ')) {
                                        return <p key={index} className="ml-4 text-gray-700 mb-1">{line}</p>;
                                    } else if (line.trim()) {
                                        return <p key={index} className="text-gray-700 mb-2">{line}</p>;
                                    }
                                    return <div key={index} className="mb-2"></div>;
                                })}
                            </div>

                            <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleGenerateCashFlowReport}
                                    className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150 flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a4 4 0 01-4 4z" />
                                    </svg>
                                    <span>10-Year Cash Flow Report</span>
                                </button>
                                <button
                                    onClick={handlePrintSummary}
                                    className="text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150 flex items-center space-x-2"
                                    style={{ backgroundColor: '#1C599F' }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    <span>Print Summary</span>
                                </button>
                                <button
                                    onClick={() => setShowSummary(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-150"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
export { generatePropertySummary, PropertySummaryButton };