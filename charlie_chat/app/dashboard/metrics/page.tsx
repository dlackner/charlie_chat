'use client';

import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building, 
  Users, 
  Mail,
  FileText,
  AlertCircle,
  Calendar,
  BarChart3,
  Activity,
  ChevronDown,
  Clock,
  CheckCircle,
  Filter
} from 'lucide-react';

export default function MetricsPage() {
  const [propertyMetric, setPropertyMetric] = useState('properties');
  const [timeRange, setTimeRange] = useState('30');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Metrics Dashboard</h1>
          <p className="text-gray-600">Track your real estate investment activity and performance</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
          </select>
        </div>

        {/* Action Center - Full Width */}
        <ActionCenter />

        {/* 4-Quadrant Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Property Intelligence */}
          <PropertyIntelligence 
            metric={propertyMetric} 
            setMetric={setPropertyMetric}
            timeRange={timeRange} 
          />

          {/* Outreach Performance */}
          <OutreachPerformance timeRange={timeRange} />

          {/* Cluster Analysis */}
          <ClusterAnalysis />

          {/* User Engagement */}
          <UserEngagement />
        </div>
      </div>
    </div>
  );
}

// Action Center Component
function ActionCenter() {
  const reminders = [
    { 
      id: 1, 
      property: '103 Gibbs Ave', 
      note: 'Follow up with owner', 
      date: '2025-09-08', 
      type: 'today', 
      priority: 'high' 
    },
    { 
      id: 2, 
      property: '9-11 Sherman St', 
      note: 'Schedule site visit', 
      date: '2025-09-10', 
      type: 'upcoming', 
      priority: 'medium' 
    },
    { 
      id: 3, 
      property: 'Kingston Ave', 
      note: 'Review financials', 
      date: '2025-09-05', 
      type: 'overdue', 
      priority: 'high' 
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
        Action Center
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Reminders */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Today ({reminders.filter(r => r.type === 'today').length})
          </h3>
          {reminders.filter(r => r.type === 'today').map(reminder => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </div>

        {/* Upcoming Reminders */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            This Week ({reminders.filter(r => r.type === 'upcoming').length})
          </h3>
          {reminders.filter(r => r.type === 'upcoming').map(reminder => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </div>

        {/* Overdue Reminders */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-800 mb-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            Overdue ({reminders.filter(r => r.type === 'overdue').length})
          </h3>
          {reminders.filter(r => r.type === 'overdue').map(reminder => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Property Intelligence Quadrant
function PropertyIntelligence({ metric, setMetric, timeRange }: { 
  metric: string; 
  setMetric: (value: string) => void; 
  timeRange: string; 
}) {
  const metrics = {
    properties: { label: 'Properties Favorited', value: 47, change: '+12', icon: Building },
    units: { label: 'Total Units', value: 1247, change: '+85', icon: Users },
    value: { label: 'Assessed Value', value: '$24.8M', change: '+$2.1M', icon: DollarSign },
    volume: { label: 'Deal Volume', value: 18, change: '+3', icon: BarChart3 }
  };

  const currentMetric = metrics[metric as keyof typeof metrics];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Property Intelligence</h3>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="properties">Properties</option>
          <option value="units">Units</option>
          <option value="value">Assessed Value</option>
          <option value="volume">Deal Volume</option>
        </select>
      </div>

      <div className="mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <currentMetric.icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{currentMetric.value}</div>
            <div className="text-sm text-gray-600">{currentMetric.label}</div>
          </div>
          <div className="flex items-center text-sm font-medium text-green-600">
            <TrendingUp className="h-4 w-4 mr-1" />
            {currentMetric.change}
          </div>
        </div>
      </div>

      {/* Placeholder for trend chart */}
      <div className="h-32 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <TrendingUp className="h-8 w-8 mx-auto mb-1" />
          <p className="text-xs">Trend Chart</p>
        </div>
      </div>
    </div>
  );
}

// Outreach Performance Quadrant
function OutreachPerformance({ timeRange }: { timeRange: string }) {
  const outreachData = [
    { type: 'Emails', count: 127, color: 'bg-blue-500' },
    { type: 'Marketing Letters', count: 43, color: 'bg-green-500' },
    { type: 'LOIs', count: 12, color: 'bg-purple-500' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Outreach Performance</h3>
      
      <div className="space-y-4 mb-4">
        {outreachData.map((item) => (
          <div key={item.type} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
              <span className="text-sm text-gray-700">{item.type}</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">{item.count}</div>
          </div>
        ))}
      </div>

      {/* Placeholder for stacked bar chart */}
      <div className="h-32 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Mail className="h-8 w-8 mx-auto mb-1" />
          <p className="text-xs">Weekly Outreach Chart</p>
        </div>
      </div>
    </div>
  );
}

// Cluster Analysis Quadrant
function ClusterAnalysis() {
  const insights = [
    'High correlation: 5+ unit properties in Newport',
    'Preference trend: Cap rates between 6-8%',
    'Geographic cluster: Southeast markets',
    'Price range pattern: $800K - $2.5M range'
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cluster Analysis</h3>
      
      <div className="space-y-3 mb-4">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <span className="text-sm text-gray-700">{insight}</span>
          </div>
        ))}
      </div>

      {/* Placeholder for cluster visualization */}
      <div className="h-32 bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Filter className="h-8 w-8 mx-auto mb-1" />
          <p className="text-xs">Correlation Matrix</p>
        </div>
      </div>
    </div>
  );
}

// User Engagement Quadrant
function UserEngagement() {
  const sessionData = {
    totalSessions: 28,
    avgDuration: '12m 34s',
    peakHour: '2:00 PM',
    mostActiveDay: 'Tuesday'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">User Engagement</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{sessionData.totalSessions}</div>
          <div className="text-xs text-gray-600">Total Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{sessionData.avgDuration}</div>
          <div className="text-xs text-gray-600">Avg Duration</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{sessionData.peakHour}</div>
          <div className="text-xs text-gray-600">Peak Hour</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{sessionData.mostActiveDay}</div>
          <div className="text-xs text-gray-600">Most Active</div>
        </div>
      </div>

      {/* Placeholder for session heatmap */}
      <div className="h-16 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Activity className="h-6 w-6 mx-auto mb-1" />
          <p className="text-xs">Session Heatmap</p>
        </div>
      </div>
    </div>
  );
}

// Reminder Card Component
function ReminderCard({ reminder }: { reminder: any }) {
  return (
    <div className="bg-white rounded p-3 mb-2 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm text-gray-900">{reminder.property}</div>
          <div className="text-xs text-gray-600">{reminder.note}</div>
          <div className="text-xs text-gray-500 mt-1">{reminder.date}</div>
        </div>
        <button className="text-green-600 hover:text-green-700">
          <CheckCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}