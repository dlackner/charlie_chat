'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import PropertyIntelligenceChart from '@/components/v2/PropertyIntelligenceChart';
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
  const { user, isLoading: authLoading } = useAuth();
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
        <ActionCenter user={user} authLoading={authLoading} />

        {/* 4-Quadrant Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Property Pipeline */}
          <PropertyIntelligence 
            user={user}
            authLoading={authLoading}
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
function ActionCenter({ user, authLoading }: { user: any; authLoading: boolean }) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reminders from API
  useEffect(() => {
    const fetchReminders = async () => {
      if (!user || authLoading) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v2/reminders');
        if (!response.ok) {
          throw new Error('Failed to fetch reminders');
        }

        const data = await response.json();
        setReminders(data.reminders || []);
      } catch (err: any) {
        console.error('Error fetching reminders:', err);
        setError(err.message || 'Failed to load reminders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReminders();
  }, [user, authLoading]);


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
        Reminders
      </h2>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading reminders...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="text-red-600">{error}</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">No reminders found</p>
          <p className="text-sm text-gray-500 mt-1">Add reminders to your property notes using @MM/DD/YYYY format</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Reminders */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Today ({reminders.filter(r => r.type === 'today').length})
            </h3>
            <div className="max-h-48 overflow-y-auto">
              {reminders.filter(r => r.type === 'today').map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
              {reminders.filter(r => r.type === 'today').length === 0 && (
                <p className="text-sm text-gray-600 italic">No reminders for today</p>
              )}
            </div>
          </div>

          {/* This Week Reminders (upcoming only) */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              This Week ({reminders.filter(r => r.type === 'upcoming').length})
            </h3>
            <div className="max-h-48 overflow-y-auto">
              {reminders.filter(r => r.type === 'upcoming').map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
              {reminders.filter(r => r.type === 'upcoming').length === 0 && (
                <p className="text-sm text-gray-600 italic">No upcoming reminders</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Property Pipeline Quadrant
function PropertyIntelligence({ user, authLoading }: { user: any; authLoading: boolean }) {
  const [intelligenceData, setIntelligenceData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'mixed' | 'funnel' | 'pie'>('mixed');
  
  // Available options
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const availableSources = ['manual', 'algorithm'];
  
  // Dropdown states
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  
  // Refs for click-outside handling
  const marketDropdownRef = useRef<HTMLDivElement>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available markets
  useEffect(() => {
    const fetchMarkets = async () => {
      if (!user || authLoading) return;
      
      try {
        const response = await fetch(`/api/v2/user-markets?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableMarkets(data.markets?.map((m: any) => m.name) || []);
        }
      } catch (err) {
        console.error('Error fetching markets:', err);
      }
    };
    
    fetchMarkets();
  }, [user, authLoading]);

  // Fetch intelligence data
  useEffect(() => {
    const fetchIntelligenceData = async () => {
      if (!user || authLoading) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        params.set('userId', user.id);
        if (selectedMarkets.length > 0) {
          params.set('markets', selectedMarkets.join(','));
        }
        if (selectedSources.length > 0) {
          params.set('sources', selectedSources.join(','));
        }
        
        const response = await fetch(`/api/v2/metrics/property-intelligence?${params.toString()}`);
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.details || result.error || 'Failed to fetch intelligence data');
        }
        setIntelligenceData(result.data || []);
        setSummary(result.summary || {});
      } catch (err: any) {
        console.error('Error fetching intelligence data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchIntelligenceData();
  }, [user, authLoading, selectedMarkets, selectedSources]);

  const handleMarketChange = (market: string) => {
    setSelectedMarkets(prev => 
      prev.includes(market) 
        ? prev.filter(m => m !== market)
        : [...prev, market]
    );
  };

  const handleSourceChange = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source) 
        : [...prev, source]
    );
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(event.target as Node)) {
        setShowMarketDropdown(false);
      }
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setShowSourceDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Property Pipeline</h3>
        <div className="flex items-center space-x-3">
          {/* Chart Type Toggle */}
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'mixed' | 'funnel' | 'pie')}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="mixed">Bar/Line Chart</option>
            <option value="funnel">Funnel Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Market Filter */}
        <div className="relative" ref={marketDropdownRef}>
          <button
            onClick={() => setShowMarketDropdown(!showMarketDropdown)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px] text-left"
          >
            Markets ({selectedMarkets.length} selected)
          </button>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          
          {showMarketDropdown && (
            <div 
              className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2">
                {availableMarkets.map((market) => (
                  <label key={market} className="flex items-center p-2 hover:bg-gray-50 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMarkets.includes(market)}
                      onChange={() => handleMarketChange(market)}
                      className="mr-2 h-3 w-3 text-blue-600"
                    />
                    {market}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Source Filter */}
        <div className="relative" ref={sourceDropdownRef}>
          <button
            onClick={() => setShowSourceDropdown(!showSourceDropdown)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px] text-left"
          >
            Sources ({selectedSources.length} selected)
          </button>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          
          {showSourceDropdown && (
            <div 
              className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2">
                {availableSources.map((source) => (
                  <label key={source} className="flex items-center p-2 hover:bg-gray-50 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(source)}
                      onChange={() => handleSourceChange(source)}
                      className="mr-2 h-3 w-3 text-blue-600"
                    />
                    {source.charAt(0).toUpperCase() + source.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{summary.total_properties || 0}</div>
              <div className="text-sm text-gray-600">Total Properties</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.total_estimated_value ? (summary.total_estimated_value / 1000000).toFixed(1) : 0}M
              </div>
              <div className="text-sm text-gray-600">Estimated Value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-64 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-1" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : intelligenceData.length === 0 ? (
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-8 w-8 mx-auto mb-1" />
            <p className="text-sm">No data available with current filters</p>
          </div>
        </div>
      ) : (
        <PropertyIntelligenceChart data={intelligenceData} chartType={chartType} />
      )}
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
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="bg-white rounded p-3 mb-2 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{reminder.property_address}</div>
          <div className="text-xs text-gray-600">{reminder.reminder_text}</div>
          <div className="text-xs text-gray-500 mt-1">{formatDate(reminder.reminder_date)}</div>
        </div>
      </div>
    </div>
  );
}