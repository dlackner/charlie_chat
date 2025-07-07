// --- Multifamily-Specific Investment Grading System ---
export interface GradeMetrics {
    irr: number;
    roiAtHorizon: number;
    cashOnCashReturn: number;
    debtServiceCoverageRatio: number;
    capRate: number;
    breakEvenYear: number | null;
    netOperatingIncome: number;
    cashFlowBeforeTax: number;
    purchasePrice: number;
}

export interface MultifamilyMarketBenchmarks {
    avgIRR: number;
    avgCashOnCash: number;
    avgDSCR: number;
    avgCapRate: number;
    avgExpenseRatio: number;
}

export interface PropertyCharacteristics {
    purchasePrice: number;
    numUnits: number;
    avgMonthlyRentPerUnit: number;
    capRate: number;
    expenseRatio: number;
}

export interface MultifamilyGradeMetrics extends GradeMetrics {
    expenseRatio: number;
    assetClass?: 'a-class' | 'b-class' | 'c-class' | 'value-add';
    marketTier?: 'tier-1' | 'tier-2' | 'tier-3' | 'emerging';
}
// Current 2024/2025 Multifamily Market Benchmarks
export const MULTIFAMILY_BENCHMARKS = {
    assetClass: {
        'a-class': { avgIRR: 8.5, avgCashOnCash: 3.5, avgDSCR: 1.20, avgCapRate: 4.7, avgExpenseRatio: 35 },
        'b-class': { avgIRR: 10.0, avgCashOnCash: 4.5, avgDSCR: 1.25, avgCapRate: 4.9, avgExpenseRatio: 40 },
        'c-class': { avgIRR: 12.0, avgCashOnCash: 6.0, avgDSCR: 1.30, avgCapRate: 5.4, avgExpenseRatio: 45 },
        'value-add': { avgIRR: 14.0, avgCashOnCash: 5.5, avgDSCR: 1.15, avgCapRate: 5.2, avgExpenseRatio: 50 }
    },
    marketTier: {
        'tier-1': { avgIRR: 8.0, avgCashOnCash: 3.0, avgDSCR: 1.20, avgCapRate: 4.2, avgExpenseRatio: 38 },
        'tier-2': { avgIRR: 10.0, avgCashOnCash: 4.5, avgDSCR: 1.25, avgCapRate: 4.8, avgExpenseRatio: 42 },
        'tier-3': { avgIRR: 12.0, avgCashOnCash: 5.5, avgDSCR: 1.30, avgCapRate: 5.5, avgExpenseRatio: 45 },
        'emerging': { avgIRR: 14.0, avgCashOnCash: 7.0, avgDSCR: 1.35, avgCapRate: 6.2, avgExpenseRatio: 48 }
    }
};
// Auto-detect asset class based on property characteristics
export const detectAssetClass = (characteristics: PropertyCharacteristics): string => {
    const { purchasePrice, numUnits, avgMonthlyRentPerUnit, capRate, expenseRatio } = characteristics;

    const pricePerUnit = purchasePrice / numUnits;
    let score = 0;

    // Price per unit scoring (40% weight)
    if (pricePerUnit >= 300000) score += 40;
    else if (pricePerUnit >= 200000) score += 30;
    else if (pricePerUnit >= 100000) score += 20;
    else score += 10;

    // Monthly rent scoring (30% weight)
    if (avgMonthlyRentPerUnit >= 2500) score += 30;
    else if (avgMonthlyRentPerUnit >= 1800) score += 25;
    else if (avgMonthlyRentPerUnit >= 1200) score += 20;
    else score += 10;

    // Cap rate scoring (20% weight) - Lower cap = higher class
    if (capRate <= 4.5) score += 20;
    else if (capRate <= 5.5) score += 15;
    else if (capRate <= 6.5) score += 10;
    else score += 5;

    // Expense ratio scoring (10% weight) - Lower expenses = higher class
    if (expenseRatio <= 35) score += 10;
    else if (expenseRatio <= 45) score += 8;
    else if (expenseRatio <= 55) score += 6;
    else score += 3;

    if (score >= 85) return 'a-class';
    else if (score >= 65) return 'b-class';
    else if (score >= 45) return 'c-class';
    else return 'value-add';
};
// Auto-detect market tier based on pricing
export const detectMarketTier = (characteristics: PropertyCharacteristics): string => {
    const { purchasePrice, numUnits, avgMonthlyRentPerUnit } = characteristics;

    const pricePerUnit = purchasePrice / numUnits;
    let score = 0;

    // Price per unit indicators
    if (pricePerUnit >= 400000) score += 40;
    else if (pricePerUnit >= 250000) score += 30;
    else if (pricePerUnit >= 150000) score += 20;
    else score += 10;

    // Rent level indicators
    if (avgMonthlyRentPerUnit >= 3000) score += 30;
    else if (avgMonthlyRentPerUnit >= 2000) score += 25;
    else if (avgMonthlyRentPerUnit >= 1400) score += 20;
    else score += 10;

    if (score >= 60) return 'tier-1';
    else if (score >= 45) return 'tier-2';
    else if (score >= 30) return 'tier-3';
    else return 'emerging';
};
// Enhanced Grading System for Multifamily Properties
export const calculateMultifamilyGrade = (
    metrics: MultifamilyGradeMetrics,
    customBenchmarks?: MultifamilyMarketBenchmarks
): { grade: string; score: number; breakdown: Record<string, number>; classification: { assetClass: string; marketTier: string } } => {


    // Determine benchmarks to use
    let benchmarks: MultifamilyMarketBenchmarks;

    if (customBenchmarks) {
        benchmarks = customBenchmarks;
    } else {
        const assetBench = MULTIFAMILY_BENCHMARKS.assetClass[metrics.assetClass || 'b-class'];
        const marketBench = MULTIFAMILY_BENCHMARKS.marketTier[metrics.marketTier || 'tier-2'];

        // Weight: 60% asset class, 40% market tier
        benchmarks = {
            avgIRR: (assetBench.avgIRR * 0.6) + (marketBench.avgIRR * 0.4),
            avgCashOnCash: (assetBench.avgCashOnCash * 0.6) + (marketBench.avgCashOnCash * 0.4),
            avgDSCR: (assetBench.avgDSCR * 0.6) + (marketBench.avgDSCR * 0.4),
            avgCapRate: (assetBench.avgCapRate * 0.6) + (marketBench.avgCapRate * 0.4),
            avgExpenseRatio: (assetBench.avgExpenseRatio * 0.6) + (marketBench.avgExpenseRatio * 0.4)
        };
    }

    let totalScore = 0;
    const breakdown: Record<string, number> = {};

    // 1. IRR Score - 35% weight (most important for multifamily)
    const irrRatio = metrics.irr / benchmarks.avgIRR;
    let irrScore = 0;
    if (irrRatio >= 1.5) irrScore = 100;
    else if (irrRatio >= 1.25) irrScore = 85;
    else if (irrRatio >= 1.1) irrScore = 70;
    else if (irrRatio >= 0.9) irrScore = 55;
    else if (irrRatio >= 0.75) irrScore = 40;
    else if (irrRatio >= 0.5) irrScore = 25;
    else irrScore = 10;

    totalScore += irrScore * 0.35;
    breakdown['IRR vs Market'] = irrScore;

    // 2. Cash-on-Cash Return - 25% weight
    const cocRatio = metrics.cashOnCashReturn / benchmarks.avgCashOnCash;
    let cocScore = 0;
    if (cocRatio >= 1.5) cocScore = 100;
    else if (cocRatio >= 1.25) cocScore = 85;
    else if (cocRatio >= 1.1) cocScore = 70;
    else if (cocRatio >= 0.9) cocScore = 55;
    else if (cocRatio >= 0.75) cocScore = 40;
    else if (cocRatio >= 0.5) cocScore = 25;
    else cocScore = 10;

    totalScore += cocScore * 0.25;
    breakdown['Cash-on-Cash vs Market'] = cocScore;

    // 3. DSCR - 20% weight (critical for multifamily financing)
    const dscrRatio = metrics.debtServiceCoverageRatio / benchmarks.avgDSCR;
    let dscrScore = 0;
    if (dscrRatio >= 1.4) dscrScore = 100;
    else if (dscrRatio >= 1.2) dscrScore = 85;
    else if (dscrRatio >= 1.1) dscrScore = 70;
    else if (dscrRatio >= 1.0) dscrScore = 55;
    else if (dscrRatio >= 0.9) dscrScore = 40;
    else if (dscrRatio >= 0.8) dscrScore = 25;
    else dscrScore = 10;

    totalScore += dscrScore * 0.20;
    breakdown['DSCR vs Market'] = dscrScore;

    // 4. Cap Rate Attractiveness - 8% weight
    const capRateRatio = metrics.capRate / benchmarks.avgCapRate;
    let capScore = 0;
    if (capRateRatio >= 1.3) capScore = 100;
    else if (capRateRatio >= 1.15) capScore = 85;
    else if (capRateRatio >= 1.05) capScore = 70;
    else if (capRateRatio >= 0.95) capScore = 55;
    else if (capRateRatio >= 0.85) capScore = 40;
    else if (capRateRatio >= 0.7) capScore = 25;
    else capScore = 10;

    totalScore += capScore * 0.08;
    breakdown['Cap Rate vs Market'] = capScore;

    // 5. Expense Efficiency - 7% weight
    const expenseRatio = metrics.expenseRatio || 40;
    const expenseEfficiency = benchmarks.avgExpenseRatio / Math.max(expenseRatio, 1);
    let expenseScore = 0;
    if (expenseEfficiency >= 1.2) expenseScore = 100;
    else if (expenseEfficiency >= 1.1) expenseScore = 85;
    else if (expenseEfficiency >= 1.05) expenseScore = 70;
    else if (expenseEfficiency >= 0.95) expenseScore = 55;
    else if (expenseEfficiency >= 0.85) expenseScore = 40;
    else if (expenseEfficiency >= 0.7) expenseScore = 25;
    else expenseScore = 10;

    totalScore += expenseScore * 0.07;
    breakdown['Expense Efficiency'] = expenseScore;

    // 6. Break-Even Analysis - 3% weight
    let breakEvenScore = 0;
    if (metrics.breakEvenYear === null) {
        breakEvenScore = 10;
    } else if (metrics.breakEvenYear <= 1) {
        breakEvenScore = 100;
    } else if (metrics.breakEvenYear <= 2) {
        breakEvenScore = 80;
    } else if (metrics.breakEvenYear <= 3) {
        breakEvenScore = 60;
    } else if (metrics.breakEvenYear <= 5) {
        breakEvenScore = 40;
    } else {
        breakEvenScore = 20;
    }

    totalScore += breakEvenScore * 0.03;
    breakdown['breakEvenSpeed'] = breakEvenScore;

    // 7. ROI at Horizon - 2% weight (reduced importance)
    let roiScore = 0;
    if (metrics.roiAtHorizon >= 150) roiScore = 100;
    else if (metrics.roiAtHorizon >= 100) roiScore = 85;
    else if (metrics.roiAtHorizon >= 75) roiScore = 70;
    else if (metrics.roiAtHorizon >= 50) roiScore = 55;
    else if (metrics.roiAtHorizon >= 25) roiScore = 40;
    else if (metrics.roiAtHorizon >= 0) roiScore = 25;
    else roiScore = 10;

    totalScore += roiScore * 0.02;
    breakdown['ROI at Horizon'] = roiScore;

    // Grade mapping - more stringent for multifamily
    const getGradeFromScore = (score: number): string => {
    if (score >= 92) return "A+";      // Exceptional - Top 5% of deals
    else if (score >= 85) return "A";   // Excellent - Top 10-15% of deals 
    else if (score >= 78) return "A-";  // Very Good - Top 20-25% of deals
    else if (score >= 70) return "B+";  // Good - Above market average
    else if (score >= 62) return "B";   // Market Level - Typical performance
    else if (score >= 54) return "B-";  // Below Market - Acceptable but weak
    else if (score >= 46) return "C+";  // Poor - Significant concerns
    else if (score >= 38) return "C";   // Very Poor - Major red flags
    else if (score >= 30) return "C-";  // Terrible - Avoid unless major upside
    else if (score >= 22) return "D";   // Awful - High risk of loss
    else return "F";                    // Unacceptable - Do not invest
  };

  // Use the helper function instead of duplicating logic
  const grade = getGradeFromScore(totalScore);

  return {
    grade,
    score: Math.round(totalScore * 10) / 10,
    breakdown,
    classification: {
      assetClass: metrics.assetClass || 'b-class',
      marketTier: metrics.marketTier || 'tier-2'
    }
  };
};

// Export the helper functions for use in other files
export const getGradeFromScore = (score: number): string => {
  if (score >= 92) return "A+";      // Exceptional - Top 5% of deals
  else if (score >= 85) return "A";   // Excellent - Top 10-15% of deals 
  else if (score >= 78) return "A-";  // Very Good - Top 20-25% of deals
  else if (score >= 70) return "B+";  // Good - Above market average
  else if (score >= 62) return "B";   // Market Level - Typical performance
  else if (score >= 54) return "B-";  // Below Market - Acceptable but weak
  else if (score >= 46) return "C+";  // Poor - Significant concerns
  else if (score >= 38) return "C";   // Very Poor - Major red flags
  else if (score >= 30) return "C-";  // Terrible - Avoid unless major upside
  else if (score >= 22) return "D";   // Awful - High risk of loss
  else return "F";                    // Unacceptable - Do not invest
};

// Helper function to get threshold for a grade
export const getGradeThreshold = (grade: string): number => {
  switch(grade) {
    case 'A+': return 92;  
    case 'A': return 85;   
    case 'A-': return 78;  
    case 'B+': return 70;  
    case 'B': return 62;   
    case 'B-': return 54;  
    case 'C+': return 46;  
    case 'C': return 38;   
    case 'C-': return 30;  
    case 'D': return 22;   
    default: return 0;
  }
};