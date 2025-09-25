/*
 * CHARLIE2 V2 - Property Intelligence Chart Component
 * Provides both mixed bar/line chart and funnel chart visualizations
 * Part of the new V2 component architecture
 */
'use client';

import { 
  Bar, 
  Line, 
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface PropertyIntelligenceData {
  status: string;
  count: number;
  estimated_value: number;
  percentage: number;
}

interface PropertyIntelligenceChartProps {
  data: PropertyIntelligenceData[];
  chartType: 'mixed' | 'funnel' | 'pie';
}

export default function PropertyIntelligenceChart({ data, chartType }: PropertyIntelligenceChartProps) {
  // Colors for different statuses
  const statusColors = {
    'Reviewing': '#3B82F6',      // Blue
    'Communicating': '#10B981',   // Green
    'Engaged': '#F59E0B',         // Yellow
    'Analyzing': '#8B5CF6',       // Purple
    'LOI Sent': '#EF4444',        // Red
    'Acquired': '#059669',        // Emerald
    'Rejected': '#6B7280'         // Gray
  };

  // Custom tooltip for mixed chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`Status: ${label}`}</p>
          <p className="text-blue-600">
            {`Properties: ${data?.count || 0}`}
          </p>
          <p className="text-green-600">
            {`Value: $${(data?.value_millions || 0).toFixed(1)}M`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for funnel chart
  const FunnelTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`${data.status}`}</p>
          <p className="text-blue-600">{`Properties: ${data.count}`}</p>
          <p className="text-green-600">{`Value: $${(data.estimated_value / 1000000).toFixed(1)}M`}</p>
          <p className="text-gray-600">{`${data.percentage}% of total`}</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-blue-600">{`Properties: ${data.value}`}</p>
          <p className="text-green-600">{`Value: $${(data.payload.estimated_value / 1000000).toFixed(1)}M`}</p>
          <p className="text-gray-600">{`${data.payload.percentage.toFixed(1)}% of total`}</p>
        </div>
      );
    }
    return null;
  };

  if (chartType === 'pie') {
    // Transform data for pie chart - sliced by count
    const pieData = data.map((item) => ({
      name: item.status,
      value: item.count,
      estimated_value: item.estimated_value,
      percentage: item.percentage,
      fill: statusColors[item.status as keyof typeof statusColors] || '#6B7280'
    }));

    return (
      <div className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'funnel') {
    // Transform data for funnel chart - sort by count descending
    const funnelData = [...data]
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        name: item.status,
        value: item.count,
        fill: statusColors[item.status as keyof typeof statusColors] || '#6B7280'
      }));

    return (
      <div className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <defs>
              <linearGradient id="funnelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            <Tooltip content={<FunnelTooltip />} />
            <Funnel
              dataKey="value"
              data={funnelData}
              isAnimationActive={true}
            >
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Mixed bar/line chart - need to use ComposedChart for combining bar and line
  // Prepare data with both metrics
  const chartData = data.map((item) => ({
    status: item.status,
    count: item.count,
    value_millions: item.estimated_value / 1000000, // Convert to millions for readability
    percentage: item.percentage
  }));

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="status" 
            stroke="#6B7280"
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis 
            yAxisId="count"
            stroke="#3B82F6"
            fontSize={11}
          />
          <YAxis 
            yAxisId="value"
            orientation="right"
            stroke="#10B981"
            fontSize={11}
            tickFormatter={(value) => `$${value.toFixed(1)}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            yAxisId="count"
            dataKey="count" 
            name="Properties"
            fill="#3B82F6"
            fillOpacity={0.8}
            radius={[2, 2, 0, 0]}
          />
          <Line 
            yAxisId="value"
            type="monotone"
            dataKey="value_millions"
            name="Value ($M)"
            stroke="#10B981"
            strokeWidth={3}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#059669' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}