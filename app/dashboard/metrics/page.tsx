/*
 * CHARLIE2 V2 - Dashboard Metrics Page
 * Real-time activity tracking and performance metrics for real estate investors
 * Features: Activity coaching, time-based charts, property tracking metrics
 * Part of the new V2 application architecture
 */
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building, 
  Users, 
  Mail,
  FileText,
  BarChart3,
  Activity,
  ChevronDown,
  Filter
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function MetricsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [propertyMetric, setPropertyMetric] = useState('properties');
  const [timeRange, setTimeRange] = useState('30');

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Metrics</h1>
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


        {/* Daily Activity Coaching */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Daily Activity Coaching</h2>

          {/* Top Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Properties Favorited Over Time */}
            <PropertiesFavoritedChart user={user} timeRange={timeRange} />
            
            {/* Market Activity Chart */}
            <MarketActivityChart user={user} timeRange={timeRange} />
          </div>

          {/* Activity Coaching Cards */}
          
          {/* First Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            {/* Offers Created */}
            <OffersCreatedCard user={user} timeRange={timeRange} />

            {/* LOIs Created */}
            <LOIsCreatedCard user={user} timeRange={timeRange} />

          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Marketing Letters Created */}
            <MarketingLettersCreatedCard user={user} timeRange={timeRange} />

            {/* Emails Sent */}
            <EmailsSentCard user={user} timeRange={timeRange} />

          </div>
        </div>
        
      </div>
    </div>
    </AuthGuard>
  );
}


// Properties Favorited Over Time Chart
function PropertiesFavoritedChart({ user, timeRange }: { user: any; timeRange: string }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/metrics/favorites-over-time?days=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setChartData(data.chartData || []);
        } else {
          // Favorites API error
        }
      } catch (error) {
        // Error fetching favorites chart data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange, user]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Properties Favorited Over Time</h3>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="h-48">
          {chartData.length > 0 ? (
            <>
              <div className="h-full flex items-end space-x-2 p-4">
                {chartData.map((item, index) => {
                  const maxCount = Math.max(...chartData.map(d => d.count));
                  const maxHeight = 120; // Fixed max height in pixels
                  const heightPx = Math.max((item.count / maxCount) * maxHeight, 10); // Minimum 10px height
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center justify-end min-w-0 group relative">
                      <div 
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                        style={{ height: `${heightPx}px`, minWidth: '20px' }}
                      ></div>
                      <div className="text-xs text-gray-600 mt-2 text-center">
                        {item.date}
                      </div>
                      
                      {/* Tooltip - matching pipeline chart style */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
                          <p className="font-medium text-gray-900">Week of {item.date}</p>
                          <p className="text-blue-600">{item.count} {item.count === 1 ? 'property' : 'properties'}</p>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 -mt-1"></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* X-axis label */}
              <div className="text-center -mt-2">
                <span className="text-sm text-gray-500">Week Of</span>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Building className="h-8 w-8 mx-auto mb-2" />
                <p>No data for selected period</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Offers Created Activity Card Component
function OffersCreatedCard({ user, timeRange }: { user: any; timeRange: string }) {
  const [todayCount, setTodayCount] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch today's count
        const today = new Date().toISOString().split('T')[0];
        const todayResponse = await fetch(`/api/metrics/offers-daily?date=${today}`);
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          setTodayCount(todayData.count || 0);
        }

        // Fetch weekly trend data using the selected timeRange
        const weeklyResponse = await fetch(`/api/metrics/analysis-over-time?days=${timeRange}`);
        if (weeklyResponse.ok) {
          const weeklyResult = await weeklyResponse.json();
          setWeeklyData(weeklyResult.chartData || []);
        }
      } catch (error) {
        // Error fetching offers data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, timeRange]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Offers Created</h3>
      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl font-bold text-blue-600">{todayCount}</div>
        <div className="text-sm text-gray-600">Today</div>
      </div>
      
      {/* Weekly trend chart - matching Properties Favorited style */}
      <div className="h-32">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : weeklyData.length > 0 ? (
          <>
            <div className="h-full flex items-end space-x-2 p-4">
              {weeklyData.map((item, index) => {
                const maxCount = Math.max(...weeklyData.map(d => d.count));
                const maxHeight = 80; // Fixed max height in pixels
                const heightPx = Math.max((item.count / maxCount) * maxHeight, 10); // Minimum 10px height
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end min-w-0 group relative">
                    <div 
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ height: `${heightPx}px`, minWidth: '20px' }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      {item.date}
                    </div>
                    
                    {/* Tooltip - matching pipeline chart style */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
                        <p className="font-medium text-gray-900">Week of {item.date}</p>
                        <p className="text-blue-600">{item.count} {item.count === 1 ? 'offer' : 'offers'}</p>
                        <p className="text-green-600">Total: ${(item.totalPrice || 0).toLocaleString()}</p>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 -mt-1"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* X-axis label */}
            <div className="text-center -mt-2">
              <span className="text-sm text-gray-500">Week Of</span>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-2" />
              <p className="text-xs">No offers yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// LOIs Created Card
function LOIsCreatedCard({ user, timeRange }: { user: any; timeRange: string }) {
  const [todayCount, setTodayCount] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch today's count from activity counts table
        const today = new Date().toISOString().split('T')[0];
        const todayResponse = await fetch(`/api/metrics/activity-daily?userId=${user.id}&activityType=lois_created&date=${today}`);
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          setTodayCount(todayData.count || 0);
        }

        // Fetch weekly trend data using the selected timeRange
        const weeklyResponse = await fetch(`/api/metrics/lois-over-time?userId=${user.id}&timeRange=${timeRange}`);
        if (weeklyResponse.ok) {
          const weeklyResult = await weeklyResponse.json();
          setWeeklyData(weeklyResult || []);
        }
      } catch (error) {
        // Error fetching LOI data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, timeRange]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">LOIs Created</h3>
      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl font-bold text-purple-600">{todayCount}</div>
        <div className="text-sm text-gray-600">Today</div>
      </div>
      
      {/* Weekly trend chart - matching Properties Favorited style */}
      <div className="h-32">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        ) : weeklyData.length > 0 ? (
          <>
            <div className="h-full flex items-end space-x-2 p-4">
              {weeklyData.map((item, index) => {
                const maxCount = Math.max(...weeklyData.map(d => d.count));
                const maxHeight = 80; // Fixed max height in pixels
                const heightPx = Math.max((item.count / maxCount) * maxHeight, 10); // Minimum 10px height
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end min-w-0 group relative">
                    <div 
                      className="w-full bg-purple-500 rounded-t hover:bg-purple-600 transition-colors cursor-pointer"
                      style={{ height: `${heightPx}px`, minWidth: '20px' }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      {item.date}
                    </div>
                    
                    {/* Tooltip - matching pipeline chart style */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
                        <p className="font-medium text-gray-900">Week of {item.date}</p>
                        <p className="text-purple-600">{item.count} {item.count === 1 ? 'LOI' : 'LOIs'}</p>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 -mt-1"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* X-axis label */}
            <div className="text-center -mt-2">
              <span className="text-sm text-gray-500">Week Of</span>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-2" />
              <p className="text-xs">No LOIs yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Marketing Letters Created Card
function MarketingLettersCreatedCard({ user, timeRange }: { user: any; timeRange: string }) {
  const [todayCount, setTodayCount] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch today's count from activity counts table
        const today = new Date().toISOString().split('T')[0];
        const todayResponse = await fetch(`/api/metrics/activity-daily?userId=${user.id}&activityType=marketing_letters_created&date=${today}`);
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          setTodayCount(todayData.count || 0);
        }

        // Fetch weekly trend data using the selected timeRange
        const weeklyResponse = await fetch(`/api/metrics/marketing-letters-over-time?userId=${user.id}&timeRange=${timeRange}`);
        if (weeklyResponse.ok) {
          const weeklyResult = await weeklyResponse.json();
          setWeeklyData(weeklyResult || []);
        }
      } catch (error) {
        // Error fetching marketing letters data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, timeRange]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Letters Created</h3>
      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl font-bold text-orange-600">{todayCount}</div>
        <div className="text-sm text-gray-600">Today</div>
      </div>
      
      {/* Weekly trend chart - matching Properties Favorited style */}
      <div className="h-32">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
          </div>
        ) : weeklyData.length > 0 ? (
          <>
            <div className="h-full flex items-end space-x-2 p-4">
              {weeklyData.map((item, index) => {
                const maxCount = Math.max(...weeklyData.map(d => d.count));
                const maxHeight = 80; // Fixed max height in pixels
                const heightPx = Math.max((item.count / maxCount) * maxHeight, 10); // Minimum 10px height
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end min-w-0 group relative">
                    <div 
                      className="w-full bg-orange-500 rounded-t hover:bg-orange-600 transition-colors cursor-pointer"
                      style={{ height: `${heightPx}px`, minWidth: '20px' }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      {item.date}
                    </div>
                    
                    {/* Tooltip - matching pipeline chart style */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
                        <p className="font-medium text-gray-900">Week of {item.date}</p>
                        <p className="text-orange-600">{item.count} {item.count === 1 ? 'letter' : 'letters'}</p>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 -mt-1"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* X-axis label */}
            <div className="text-center -mt-2">
              <span className="text-sm text-gray-500">Week Of</span>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-2" />
              <p className="text-xs">No letters yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Emails Sent Card
function EmailsSentCard({ user, timeRange }: { user: any; timeRange: string }) {
  const [todayCount, setTodayCount] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch today's count from activity counts table
        const today = new Date().toISOString().split('T')[0];
        const todayResponse = await fetch(`/api/metrics/activity-daily?userId=${user.id}&activityType=emails_sent&date=${today}`);
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          setTodayCount(todayData.count || 0);
        }

        // Fetch weekly trend data using the selected timeRange
        const weeklyResponse = await fetch(`/api/metrics/emails-over-time?userId=${user.id}&timeRange=${timeRange}`);
        if (weeklyResponse.ok) {
          const weeklyResult = await weeklyResponse.json();
          setWeeklyData(weeklyResult || []);
        }
      } catch (error) {
        // Error fetching emails data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, timeRange]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Emails Sent</h3>
      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl font-bold text-green-600">{todayCount}</div>
        <div className="text-sm text-gray-600">Today</div>
      </div>
      
      {/* Weekly trend chart - matching Properties Favorited style */}
      <div className="h-32">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          </div>
        ) : weeklyData.length > 0 ? (
          <>
            <div className="h-full flex items-end space-x-2 p-4">
              {weeklyData.map((item, index) => {
                const maxCount = Math.max(...weeklyData.map(d => d.count));
                const maxHeight = 80; // Fixed max height in pixels
                const heightPx = Math.max((item.count / maxCount) * maxHeight, 10); // Minimum 10px height
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end min-w-0 group relative">
                    <div 
                      className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
                      style={{ height: `${heightPx}px`, minWidth: '20px' }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      {item.date}
                    </div>
                    
                    {/* Tooltip - matching pipeline chart style */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
                        <p className="font-medium text-gray-900">Week of {item.date}</p>
                        <p className="text-green-600">{item.count} {item.count === 1 ? 'email' : 'emails'}</p>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 -mt-1"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* X-axis label */}
            <div className="text-center -mt-2">
              <span className="text-sm text-gray-500">Week Of</span>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-2" />
              <p className="text-xs">No emails yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Market Activity Distribution Chart
function MarketActivityChart({ user, timeRange }: { user: any; timeRange: string }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredSlice, setHoveredSlice] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/metrics/market-activity?days=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setChartData(data.chartData || []);
        } else {
          // Market activity API error
        }
      } catch (error) {
        // Error fetching market activity data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange, user]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Activity</h3>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="h-48 flex items-center">
          {chartData.length > 0 ? (
            <div className="flex w-full relative">
              {/* Pie Chart */}
              <div className="w-48 h-48 relative mx-auto">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  {(() => {
                    const total = chartData.reduce((sum, item) => sum + item.count, 0);
                    let currentAngle = 0;
                    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
                    
                    return chartData.slice(0, 6).map((market, index) => {
                      const percentage = market.count / total;
                      const angle = percentage * 360;
                      const radius = 80;
                      const centerX = 100;
                      const centerY = 100;
                      
                      const startAngle = (currentAngle * Math.PI) / 180;
                      const endAngle = ((currentAngle + angle) * Math.PI) / 180;
                      
                      const x1 = centerX + radius * Math.cos(startAngle);
                      const y1 = centerY + radius * Math.sin(startAngle);
                      const x2 = centerX + radius * Math.cos(endAngle);
                      const y2 = centerY + radius * Math.sin(endAngle);
                      
                      const largeArcFlag = angle > 180 ? 1 : 0;
                      
                      const pathData = [
                        `M ${centerX} ${centerY}`,
                        `L ${x1} ${y1}`,
                        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                        'Z'
                      ].join(' ');
                      
                      currentAngle += angle;
                      
                      return (
                        <path
                          key={index}
                          d={pathData}
                          fill={colors[index % colors.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                          onMouseEnter={() => setHoveredSlice(market)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      );
                    });
                  })()}
                </svg>
                
                {/* Tooltip positioned to the left of SVG */}
                {hoveredSlice && (
                  <div className="absolute top-1/2 right-full mr-4 transform -translate-y-1/2 z-50">
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
                      <p className="font-medium text-gray-900">{hoveredSlice.market_name || 'No Market'}</p>
                      <p className="text-blue-600">{hoveredSlice.count} {hoveredSlice.count === 1 ? 'property' : 'properties'}</p>
                      <p className="text-green-600">Total Value: ${(hoveredSlice.total_value / 1000000).toFixed(1)}M</p>
                      <div className="absolute top-1/2 left-full transform -translate-y-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 ml-1"></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Legend */}
              <div className="ml-6 flex flex-col justify-center space-y-2">
                {chartData.slice(0, 6).map((market, index) => {
                  const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
                  const total = chartData.reduce((sum, item) => sum + item.count, 0);
                  const percentage = ((market.count / total) * 100).toFixed(1);
                  
                  return (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      ></div>
                      <div className="text-xs">
                        <div className="font-medium">{market.market_name || 'No Market'}</div>
                        <div className="text-gray-600">{market.count} ({percentage}%)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 w-full">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2" />
                <p>No data for selected period</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}