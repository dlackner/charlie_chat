import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PageSavedProperty as SavedProperty } from '../types';
import { FavoriteStatus, STATUS_OPTIONS } from '../constants';
import { kmeans } from 'ml-kmeans';

interface AnalyticsViewProps {
  properties: SavedProperty[];
  selectedStatuses: Set<FavoriteStatus | 'ALL' | 'NO_STATUS'>;
  onStatusFilterChange: (status: FavoriteStatus | 'NO_STATUS' | null) => void;
  onViewChange: (view: 'cards') => void;
  onClusterFilter?: (propertyIds: string[]) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  properties,
  selectedStatuses,
  onStatusFilterChange,
  onViewChange,
  onClusterFilter
}) => {
  // Calculate status distribution
  const statusCounts = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    
    // Initialize counts for all statuses
    STATUS_OPTIONS.forEach(option => {
      counts[option.value] = 0;
    });
    counts['NO_STATUS'] = 0;
    
    // Count properties by status
    properties.forEach(property => {
      if (property.favorite_status) {
        counts[property.favorite_status] = (counts[property.favorite_status] || 0) + 1;
      } else {
        counts['NO_STATUS'] = (counts['NO_STATUS'] || 0) + 1;
      }
    });
    
    // Convert to chart data, filtering out zero counts
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => {
        if (status === 'NO_STATUS') {
          return {
            name: 'No Status',
            value: count,
            status: 'NO_STATUS' as const,
            color: '#9CA3AF'
          };
        }
        
        const option = STATUS_OPTIONS.find(opt => opt.value === status);
        return {
          name: option?.label || status,
          value: count,
          status: status as FavoriteStatus,
          color: getStatusColor(status as FavoriteStatus)
        };
      });
  }, [properties]);

  // K-means clustering analysis
  const clusterAnalysis = React.useMemo(() => {
    if (properties.length < 3) return null; // Need minimum 3 properties for meaningful clustering
    
    // Calculate distress indicator for each property
    const propertiesWithDistress = properties.map(property => ({
      ...property,
      distress_indicator: calculateDistressScore(property)
    }));
    
    // Analyze data completeness for key features
    const features = ['assessed_value', 'estimated_value', 'year_built', 'units_count', 'distress_indicator'];
    const dataCompleteness = features.map(feature => {
      let nonNullCount;
      if (feature === 'distress_indicator') {
        // Distress indicator is always available since we calculate it
        nonNullCount = propertiesWithDistress.length;
      } else {
        nonNullCount = propertiesWithDistress.filter(p => p[feature as keyof SavedProperty] != null).length;
      }
      return {
        feature,
        completeness: nonNullCount / propertiesWithDistress.length,
        nonNullCount
      };
    });
    
    // Use features with at least 60% data completeness
    const viableFeatures = dataCompleteness.filter(f => f.completeness >= 0.6);
    
    if (viableFeatures.length < 2) {
      return {
        viable: false,
        message: "Not enough complete data for clustering analysis. Need at least 2 features with 60%+ data coverage.",
        dataCompleteness
      };
    }
    
    // Prepare data for clustering
    const featureNames = viableFeatures.map(f => f.feature);
    const validProperties = propertiesWithDistress.filter(p => 
      featureNames.some(feature => {
        if (feature === 'distress_indicator') return true; // Always available
        return p[feature as keyof SavedProperty] != null;
      })
    );
    
    if (validProperties.length < 3) {
      return {
        viable: false,
        message: "Not enough properties with complete data for clustering.",
        dataCompleteness
      };
    }
    
    // Calculate medians for imputation
    const medians: { [key: string]: number } = {};
    featureNames.forEach(feature => {
      let values: number[];
      if (feature === 'distress_indicator') {
        values = propertiesWithDistress.map(p => p.distress_indicator);
      } else {
        values = propertiesWithDistress
          .map(p => p[feature as keyof SavedProperty] as number)
          .filter(v => v != null && !isNaN(v));
      }
      values.sort((a, b) => a - b);
      if (values.length > 0) {
        medians[feature] = values[Math.floor(values.length / 2)];
      }
    });
    
    // Prepare clustering data with imputation
    const clusterData = validProperties.map(property => {
      return featureNames.map(feature => {
        let value: number;
        if (feature === 'distress_indicator') {
          value = property.distress_indicator;
        } else {
          value = property[feature as keyof SavedProperty] as number;
          if (value == null || isNaN(value)) {
            value = medians[feature] || 0;
          }
        }
        return value;
      });
    });
    
    // Normalize data (z-score normalization)
    const means = featureNames.map((_, i) => 
      clusterData.reduce((sum, row) => sum + row[i], 0) / clusterData.length
    );
    const stdDevs = featureNames.map((_, i) => {
      const mean = means[i];
      const variance = clusterData.reduce((sum, row) => sum + Math.pow(row[i] - mean, 2), 0) / clusterData.length;
      return Math.sqrt(variance) || 1; // Avoid division by zero
    });
    
    const normalizedData = clusterData.map(row =>
      row.map((value, i) => (value - means[i]) / stdDevs[i])
    );
    
    // Determine optimal number of clusters (2-4 based on portfolio size)
    const maxClusters = Math.min(4, Math.floor(validProperties.length / 2));
    const numClusters = Math.max(2, maxClusters);
    
    try {
      // Run k-means clustering
      const kmeansResult = kmeans(normalizedData, numClusters, { maxIterations: 100 });
      
      // Assign cluster labels to properties
      const clusteredProperties = validProperties.map((property, index) => ({
        ...property,
        cluster: kmeansResult.clusters[index]
      }));
      
      // Analyze cluster characteristics
      const clusterStats = Array.from({ length: numClusters }, (_, clusterIndex) => {
        const clusterProperties = clusteredProperties.filter(p => p.cluster === clusterIndex);
        const stats: { [key: string]: any } = {
          count: clusterProperties.length,
          properties: clusterProperties
        };
        
        // Calculate cluster averages for each feature
        featureNames.forEach(feature => {
          const values = clusterProperties
            .map(p => p[feature as keyof SavedProperty] as number)
            .filter(v => v != null && !isNaN(v));
          if (values.length > 0) {
            stats[feature] = {
              avg: values.reduce((sum, v) => sum + v, 0) / values.length,
              min: Math.min(...values),
              max: Math.max(...values)
            };
          }
        });
        
        return stats;
      });
      
      // Analyze feature importance for smart naming
      const featureImportance = analyzeFeatureImportance(clusterStats, featureNames);
      const separationScore = calculateClusterSeparation(featureImportance);
      
      return {
        viable: true,
        clusters: clusterStats,
        featureNames,
        totalClustered: validProperties.length,
        clusterLabels: generateClusterLabels(clusterStats),
        clusterDescriptions: generateClusterDescriptions(clusterStats),
        separationScore
      };
      
    } catch (error) {
      return {
        viable: false,
        message: "Clustering analysis failed. Data may be too uniform or contain invalid values.",
        dataCompleteness
      };
    }
  }, [properties]);

  const totalProperties = properties.length;

  const handlePieClick = (data: any) => {
    if (data && data.status) {
      // Filter by the clicked status AND switch to cards view to see the properties
      onStatusFilterChange(data.status);
      onViewChange('cards');
    }
  };

  const handleClusterClick = (cluster: any) => {
    if (onClusterFilter && cluster.properties) {
      const propertyIds = cluster.properties.map((p: SavedProperty) => p.property_id);
      onClusterFilter(propertyIds);
      onViewChange('cards');
    }
  };

  if (totalProperties === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
            <path d="M11,2V22C5.9,21.5 2,17.2 2,12S5.9,2.5 11,2M13,2V11H22C21.5,6.2 17.8,2.5 13,2M13,13V22C17.7,21.5 21.5,17.7 22,13H13Z"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data to Analyze</h3>
        <p className="text-gray-600">
          Add some properties to your favorites to see analytics and status distribution.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Deal Pipeline</h2>
        <p className="text-gray-600">
          Track where your {totalProperties} {totalProperties === 1 ? 'deal stands' : 'deals stand'} in the pursuit process
        </p>
      </div>

      {/* Status Distribution Pie Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        
        {statusCounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No status data available
          </div>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusCounts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                  style={{ cursor: 'pointer', fontSize: '12px' }}
                >
                  {statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} ${value === 1 ? 'property' : 'properties'}`,
                    name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusCounts.map((item) => (
          <div
            key={item.status}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handlePieClick(item)}
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: item.color }}
              ></div>
              <div>
                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                <div className="text-2xl font-bold" style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="text-xs text-gray-500">
                  {((item.value / totalProperties) * 100).toFixed(0)}% of total
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* K-means Clustering Analysis */}
      {totalProperties >= 3 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <img
              src="/charlie.png"
              alt="Charlie"
              className="w-8 h-8 rounded-full shadow-md border-[0.5px] border-gray-300"
            />
            <h3 className="text-lg font-semibold text-gray-900">Portfolio Insights</h3>
          </div>
          
          {clusterAnalysis === null ? (
            <div className="text-center py-8 text-gray-500">
              Need at least 3 properties for portfolio analysis
            </div>
          ) : !clusterAnalysis.viable ? (
            <div className="space-y-4">
              <div className="text-center py-4 text-amber-600 bg-amber-50 rounded-lg">
                <p className="font-medium">Limited Data for Analysis</p>
                <p className="text-sm mt-1">{clusterAnalysis.message}</p>
              </div>
              
              {clusterAnalysis.dataCompleteness && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Data Coverage by Feature:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {clusterAnalysis.dataCompleteness.map(({ feature, completeness, nonNullCount }) => (
                      <div key={feature} className="flex justify-between">
                        <span className="capitalize">{feature.replace('_', ' ')}:</span>
                        <span className={completeness >= 0.6 ? 'text-green-600' : 'text-red-600'}>
                          {(completeness * 100).toFixed(0)}% ({nonNullCount}/{totalProperties})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-sm text-gray-600 mb-4">
                {generateClusterIntro(
                  clusterAnalysis.featureNames?.length || 0,
                  clusterAnalysis.clusters?.length || 0,
                  clusterAnalysis.separationScore || 0
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clusterAnalysis.clusters?.map((cluster, index) => (
                  <div 
                    key={index} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    style={{ 
                      borderLeftWidth: '4px',
                      borderLeftColor: getClusterColor(index)
                    }}
                    onClick={() => handleClusterClick(cluster)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getClusterColor(index) }}
                        ></div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {clusterAnalysis.clusterLabels?.[index] || `Group ${index + 1}`}
                          </h4>
                          {clusterAnalysis.clusterDescriptions?.[index] && (
                            <p className="text-xs text-gray-600 mt-1">
                              {clusterAnalysis.clusterDescriptions[index]}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-blue-600 whitespace-nowrap">
                        {cluster.count} {cluster.count === 1 ? 'property' : 'properties'} →
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {clusterAnalysis.featureNames?.map(feature => {
                        if (!cluster[feature]) return null;
                        return (
                          <div key={feature} className="space-y-1">
                            <div className="font-medium capitalize text-gray-700">
                              {feature.replace('_', ' ')}
                            </div>
                            <div className="text-gray-600">
                              Avg: {formatFeatureValue(feature, cluster[feature].avg)}
                            </div>
                            <div className="text-gray-500">
                              Spread: {formatFeatureValue(feature, cluster[feature].min)} to {formatFeatureValue(feature, cluster[feature].max)}
                            </div>
                          </div>
                        );
                      }) || []}
                    </div>
                  </div>
                )) || []}
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                Analysis based on {clusterAnalysis.totalClustered || 0} of {totalProperties} properties with sufficient data
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to get colors for each status
function getStatusColor(status: FavoriteStatus): string {
  const colors: { [key in FavoriteStatus]: string } = {
    'REVIEWED': '#3B82F6',      // Blue
    'COMMUNICATED': '#8B5CF6',  // Purple  
    'ENGAGED': '#10B981',       // Green
    'ANALYZED': '#F59E0B',      // Orange
    'LOI_SENT': '#EF4444',      // Red
    'ACQUIRED': '#059669',      // Emerald
    'REJECTED': '#6B7280'       // Gray
  };
  
  return colors[status] || '#9CA3AF';
}

// Helper function to calculate distress score for a property
function calculateDistressScore(property: SavedProperty): number {
  let distressCount = 0;
  
  // Count distress indicators based on available fields
  if (property.reo) distressCount++;
  if (property.pre_foreclosure) distressCount++;
  if (property.auction) distressCount++;
  if (property.tax_lien) distressCount++;
  if (property.private_lender) distressCount++; // Private lender can indicate distress
  
  // Return a score from 0 (no distress) to 5 (maximum distress)
  return distressCount;
}

// Helper function to analyze which features are most important for cluster separation
function analyzeFeatureImportance(clusterStats: any[], featureNames: string[]): {[key: string]: number} {
  const importance: {[key: string]: number} = {};
  
  featureNames.forEach(feature => {
    // Calculate coefficient of variation (standard deviation / mean) across clusters
    const values = clusterStats
      .filter(cluster => cluster[feature]?.avg != null)
      .map(cluster => cluster[feature].avg);
    
    if (values.length < 2) {
      importance[feature] = 0;
      return;
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation - higher means more separation between clusters
    importance[feature] = mean !== 0 ? stdDev / Math.abs(mean) : 0;
  });
  
  return importance;
}

// Helper function to calculate overall cluster separation quality
function calculateClusterSeparation(featureImportance: {[key: string]: number}): number {
  const importanceValues = Object.values(featureImportance);
  if (importanceValues.length === 0) return 0;
  
  // Average importance score - higher means better separation
  const avgImportance = importanceValues.reduce((sum, val) => sum + val, 0) / importanceValues.length;
  
  // Normalize to 0-1 scale (typical k-means importance ranges from 0 to ~2)
  return Math.min(avgImportance / 0.5, 1);
}

// Helper function to generate dynamic intro text based on cluster separation
function generateClusterIntro(featureCount: number, clusterCount: number, separationScore: number): string {
  const features = `${featureCount} key property characteristics`;
  const clusters = `${clusterCount} ${clusterCount > 1 ? 'categories' : 'category'}`;
  
  if (separationScore > 0.7) {
    return `I've analyzed your portfolio using ${features}, and the data shows some CLEAR differences! Your properties fall into ${clusters} with distinct investment profiles:`;
  } else if (separationScore > 0.4) {
    return `Based on ${features}, your portfolio organizes into ${clusters}. The differences are moderate but meaningful for your strategy:`;
  } else if (separationScore > 0.2) {
    return `Here's the thing - I ran the numbers on ${features}, and while your portfolio is fairly consistent, there are ${clusters} with subtle but important differences:`;
  } else {
    return `Listen up! Your portfolio is remarkably consistent across ${features}. The ${clusters} I'm showing you have very subtle differences - this actually shows a focused investment strategy:`;
  }
}

// Helper function to generate simple cluster labels
function generateClusterLabels(clusterStats: any[]): string[] {
  return clusterStats.map((_, index) => `Cluster ${index + 1}`);
}

// Helper functions for feature labeling
function getDistressLabel(avgDistress?: number): string {
  if (avgDistress == null) return '';
  if (avgDistress >= 2) return "Distressed";
  if (avgDistress >= 1) return "Motivated Seller";
  return "Clean";
}

function getValueLabel(avgValue?: number, type = 'assessed'): string {
  if (avgValue == null) return '';
  if (avgValue < 150000) return "Value";
  if (avgValue < 400000) return "Core";
  return "Premium";
}

function getAgeLabel(avgYear?: number): string {
  if (avgYear == null) return '';
  const currentYear = new Date().getFullYear();
  const age = currentYear - avgYear;
  if (age > 40) return "Vintage";
  if (age > 15) return "Established";
  return "Modern";
}

function getUnitsLabel(avgUnits?: number): string {
  if (avgUnits == null) return '';
  if (avgUnits <= 1) return "Single-Family";
  if (avgUnits <= 4) return "Small-Scale";
  return "Large-Scale";
}

// Helper function to generate cluster descriptions explaining the investment thesis
function generateClusterDescriptions(clusterStats: any[]): string[] {
  return clusterStats.map((cluster, index) => {
    const characteristics = [];
    
    // Get specific values for this cluster
    const avgValue = cluster.assessed_value?.avg || 0;
    const avgYear = cluster.year_built?.avg || 0;
    const avgUnits = cluster.units_count?.avg || 0;
    const avgDistress = cluster.distress_indicator?.avg || 0;
    
    // Compare with other clusters to find distinguishing features
    const allValues = clusterStats.map(c => c.assessed_value?.avg || 0);
    const allYears = clusterStats.map(c => c.year_built?.avg || 0);
    const allUnits = clusterStats.map(c => c.units_count?.avg || 0);
    
    const valuePercentile = avgValue / Math.max(...allValues);
    const unitsPercentile = avgUnits / Math.max(...allUnits);
    const avgAge = avgYear > 0 ? new Date().getFullYear() - avgYear : 0;
    
    // Build distinguishing description based on relative position
    if (valuePercentile > 0.85) {
      characteristics.push("highest-value assets in your portfolio");
    } else if (valuePercentile < 0.5) {
      characteristics.push("most affordable entry points for maximum leverage");
    } else {
      characteristics.push("solid mid-market performers");
    }
    
    if (avgAge > 0) {
      if (avgAge > 50) {
        characteristics.push("classic buildings with proven staying power");
      } else if (avgAge > 30) {
        characteristics.push("mature properties with established rental history");
      } else {
        characteristics.push("relatively newer construction with modern appeal");
      }
    }
    
    if (unitsPercentile > 0.8) {
      characteristics.push("larger scale for economies of scale advantages");
    } else if (unitsPercentile < 0.6) {
      characteristics.push("more manageable size for hands-on investors");
    }
    
    // Create unique descriptions
    const descriptions = [
      `Your ${valuePercentile > 0.7 ? 'premium' : 'value-focused'} ${avgAge > 35 ? 'heritage' : 'contemporary'} collection`,
      `Strategic ${avgUnits > 50 ? 'large-scale' : 'boutique'} holdings with ${avgDistress > 0 ? 'negotiation potential' : 'stable fundamentals'}`,
      `${characteristics[0] || 'Core properties'} targeting ${avgValue > 1500000 ? 'appreciation' : 'cash flow'} strategy`,
      `The ${avgAge > 40 ? 'character-rich' : 'modern'} portfolio with ${avgUnits > 30 ? 'scale benefits' : 'personal touch opportunities'}`
    ];
    
    const baseDescription = descriptions[index % descriptions.length] || "Specialized segment of your investment strategy";
    
    // Ensure first letter is capitalized
    return baseDescription.charAt(0).toUpperCase() + baseDescription.slice(1);
  });
}

// Helper function to get cluster colors
function getClusterColor(index: number): string {
  const colors = [
    '#10B981', // Green
    '#3B82F6', // Blue  
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#06B6D4', // Cyan
  ];
  return colors[index % colors.length];
}

// Helper function to format feature values for display
function formatFeatureValue(feature: string, value: number): string {
  if (isNaN(value)) return 'N/A';
  
  switch (feature) {
    case 'assessed_value':
    case 'estimated_value':
    case 'estimated_equity':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(value);
    
    case 'year_built':
      return Math.round(value).toString();
    
    case 'units_count':
      const rounded = Math.round(value);
      return `${rounded} ${rounded === 1 ? 'unit' : 'units'}`;
    
    case 'distress_indicator':
      const distressValue = Math.round(value * 10) / 10; // Round to 1 decimal
      if (distressValue === 0) return 'Clean';
      else if (distressValue <= 1) return 'Low distress';
      else if (distressValue <= 2) return 'Moderate distress';
      else return 'High distress';
    
    default:
      return Math.round(value).toString();
  }
}