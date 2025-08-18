import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PageSavedProperty as SavedProperty } from '../types';
import { FavoriteStatus, STATUS_OPTIONS } from '../constants';

interface AnalyticsViewProps {
  properties: SavedProperty[];
  selectedStatuses: Set<FavoriteStatus | 'ALL' | 'NO_STATUS'>;
  onStatusFilterChange: (status: FavoriteStatus | 'NO_STATUS' | null) => void;
  onViewChange: (view: 'cards') => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  properties,
  selectedStatuses,
  onStatusFilterChange,
  onViewChange
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


  const totalProperties = properties.length;

  const handlePieClick = (data: any) => {
    if (data && data.status) {
      // Filter by the clicked status AND switch to cards view to see the properties
      onStatusFilterChange(data.status);
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Breakdown</h3>
        
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