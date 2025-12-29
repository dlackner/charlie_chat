/*
 * CHARLIE2 V2 - Home Page
 * Investment metrics and portfolio management dashboard overview
 * Main landing page for authenticated users in V2 application
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building, 
  Users, 
  BarChart3,
  Activity,
  AlertCircle,
  Calendar,
  Clock,
  Crown
} from 'lucide-react';

interface DashboardMetrics {
  totalPipelineValue: {
    value: string;
    rawValue: number;
    change: string;
    trend: 'up' | 'down';
  };
  buyBoxMarkets: {
    value: string;
    rawValue: number;
    change: string;
    trend: 'up' | 'down';
  };
  propertiesFavorited: {
    value: string;
    rawValue: number;
    change: string;
    trend: 'up' | 'down';
  };
  totalUnits: {
    value: string;
    rawValue: number;
    change: string;
    trend: 'up' | 'down';
  };
}

interface ActivityItem {
  type: string;
  title: string;
  description: string;
  time: string;
  icon: string;
}

interface MarketInsights {
  marketPulse: {
    activeListings: number;
    avgEstimatedValue: string;
    avgAssessedValue: string;
  };
  portfolioInsights: {
    propertiesTracked: number;
    totalInvestment: string;
    avgCapRate: string;
  };
  aiTrends: {
    marketBriefing: string;
  };
}

interface BuyBoxMarket {
  id: string;
  key: string;
  name: string;
  city: string;
  state: string;
  type: string;
  propertyCount: number;
  isLocked: boolean;
}

// Cache keys for session storage
const CACHE_KEYS = {
  BASE_DATA: 'home_dashboard_base_data',
  MARKET_INSIGHTS: 'home_dashboard_market_insights_'
} as const;

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

interface CachedData {
  data: any;
  timestamp: number;
  userId: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [buyBoxMarkets, setBuyBoxMarkets] = useState<BuyBoxMarket[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMarketInsights, setIsLoadingMarketInsights] = useState(false);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Capital Club funding opportunities count
  const [capitalClubCount, setCapitalClubCount] = useState(0);
  const [isLoadingCapitalClub, setIsLoadingCapitalClub] = useState(false);

  // Helper functions for cache management
  const getCachedData = (cacheKey: string, currentUserId: string): any => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsedCache: CachedData = JSON.parse(cached);
      
      // Check if cache is still valid (not expired and same user)
      const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION;
      const isSameUser = parsedCache.userId === currentUserId;
      
      if (isExpired || !isSameUser) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }

      return parsedCache.data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  };

  const setCachedData = (cacheKey: string, data: any, userId: string): void => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData: CachedData = {
        data,
        timestamp: Date.now(),
        userId
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  };

  const clearMarketInsightsCache = (): void => {
    if (typeof window === 'undefined') return;
    
    try {
      // Remove all market insights cache entries
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(CACHE_KEYS.MARKET_INSIGHTS)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing market insights cache:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      // Check cache first
      const cachedBaseData = getCachedData(CACHE_KEYS.BASE_DATA, user.id);
      if (cachedBaseData) {
        setMetrics(cachedBaseData.metrics);
        setRecentActivity(cachedBaseData.recentActivity || []);
        setBuyBoxMarkets(cachedBaseData.buyBoxMarkets || []);
        
        // Set first market as default if not already set
        if (cachedBaseData.buyBoxMarkets && cachedBaseData.buyBoxMarkets.length > 0 && !selectedMarket) {
          setSelectedMarket(cachedBaseData.buyBoxMarkets[0].key);
        }
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        
        // Fetch metrics, activity, and buy box markets in parallel
        const [metricsResponse, activityResponse, marketsResponse] = await Promise.all([
          fetch(`/api/dashboard/metrics?userId=${user.id}`),
          fetch(`/api/dashboard/recent-activity?userId=${user.id}`),
          fetch(`/api/user-markets?userId=${user.id}`)
        ]);

        if (!metricsResponse.ok) {
          console.error('Metrics API response not ok:', metricsResponse.status, metricsResponse.statusText);
          throw new Error(`Metrics API Error: ${metricsResponse.status}`);
        }

        if (!activityResponse.ok) {
          console.error('Activity API response not ok:', activityResponse.status, activityResponse.statusText);
          throw new Error(`Activity API Error: ${activityResponse.status}`);
        }

        if (!marketsResponse.ok) {
          console.error('Markets API response not ok:', marketsResponse.status, marketsResponse.statusText);
        }
        
        const [metricsData, activityData, marketsData] = await Promise.all([
          metricsResponse.json(),
          activityResponse.json(),
          marketsResponse.ok ? marketsResponse.json() : { markets: [] }
        ]);

        
        const baseDataToCache = {
          metrics: metricsData.metrics,
          recentActivity: activityData.activities || [],
          buyBoxMarkets: marketsData.markets || []
        };
        
        // Cache the data
        setCachedData(CACHE_KEYS.BASE_DATA, baseDataToCache, user.id);
        
        setMetrics(metricsData.metrics);
        setRecentActivity(activityData.activities || []);
        setBuyBoxMarkets(marketsData.markets || []);
        
        // Set first market as default
        if (marketsData.markets && marketsData.markets.length > 0) {
          setSelectedMarket(marketsData.markets[0].key);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Fetch market insights when selected market changes
  useEffect(() => {
    const fetchMarketInsights = async () => {
      if (!user?.id || !selectedMarket) {
        return;
      }

      // Check cache for cacheable data only (market pulse and AI trends)
      const marketCacheKey = `${CACHE_KEYS.MARKET_INSIGHTS}${selectedMarket}`;
      const cachedCacheableData = getCachedData(marketCacheKey, user.id);

      // If we have cached data, show it immediately for Market Pulse and AI Trends
      if (cachedCacheableData) {
        setMarketInsights({
          marketPulse: cachedCacheableData.marketPulse || {
            activeListings: 0,
            avgEstimatedValue: '$0',
            avgAssessedValue: '$0'
          },
          portfolioInsights: {
            propertiesTracked: 0,
            totalInvestment: '$0',
            avgCapRate: '0%'
          },
          aiTrends: cachedCacheableData.aiTrends || {
            marketBriefing: 'Market analysis unavailable. Add more properties to your buy box to generate insights for this market.'
          }
        });
      }

      try {
        // Only show loading for portfolio data if we don't have cached Market Pulse and AI Trends
        if (!cachedCacheableData) {
          setIsLoadingMarketInsights(true);
        } else {
          setIsLoadingPortfolio(true);
        }
        
        const response = await fetch(`/api/dashboard/market-insights?userId=${user.id}&marketKey=${selectedMarket}`);
        if (!response.ok) {
          throw new Error(`Market Insights API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Use cached data for market pulse and AI trends if available, fresh data for portfolio
        const finalData = {
          marketPulse: cachedCacheableData?.marketPulse || data.cacheable?.marketPulse || {
            activeListings: 0,
            avgEstimatedValue: '$0',
            avgAssessedValue: '$0'
          },
          portfolioInsights: data.portfolioInsights || {
            propertiesTracked: 0,
            totalInvestment: '$0',
            avgCapRate: '0%'
          },
          aiTrends: cachedCacheableData?.aiTrends || data.cacheable?.aiTrends || {
            marketBriefing: 'Market analysis unavailable. Add more properties to your buy box to generate insights for this market.'
          }
        };
        
        // Cache only the cacheable data (market pulse and AI trends)
        if (data.cacheable && !cachedCacheableData) {
          setCachedData(marketCacheKey, data.cacheable, user.id);
        }
        
        setMarketInsights(finalData);
      } catch (err) {
        console.error('Error fetching market insights:', err);
        // Set fallback data instead of error to maintain UI
        const fallbackData = {
          marketPulse: cachedCacheableData?.marketPulse || {
            activeListings: 0,
            avgEstimatedValue: '$0',
            avgAssessedValue: '$0'
          },
          portfolioInsights: {
            propertiesTracked: 0,
            totalInvestment: '$0',
            avgCapRate: '0%'
          },
          aiTrends: cachedCacheableData?.aiTrends || {
            marketBriefing: 'Market analysis unavailable. Add more properties to your buy box to generate insights for this market.'
          }
        };
        setMarketInsights(fallbackData);
      } finally {
        setIsLoadingMarketInsights(false);
        setIsLoadingPortfolio(false);
      }
    };

    fetchMarketInsights();
  }, [user?.id, selectedMarket]);

  // Fetch Capital Club funding opportunities count
  useEffect(() => {
    const fetchCapitalClubCount = async () => {
      setIsLoadingCapitalClub(true);
      try {
        const response = await fetch('/api/submissions/metrics');
        if (response.ok) {
          const data = await response.json();
          setCapitalClubCount(data.activeCount || 0);
        }
      } catch (error) {
        console.error('Error fetching Capital Club count:', error);
        setCapitalClubCount(0);
      } finally {
        setIsLoadingCapitalClub(false);
      }
    };

    fetchCapitalClubCount();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Home</h1>
            <p className="text-gray-600">Loading your investment metrics...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Announcements Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Announcements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                {isLoadingCapitalClub ? 'Loading...' : `${capitalClubCount} Properties Looking for Funding`}
              </h3>
              <p className="text-gray-600 text-sm mb-4">Active investment opportunities available to Capital Club members.</p>
              <Link 
                href="/fund/browse"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Browse Opportunities →
              </Link>
              <div className="text-xs text-gray-400 mt-3">November 5, 2025</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-yellow-500 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Join the Capital Club</h3>
              <p className="text-gray-600 text-sm mb-4">The Capital Club is now accepting new members</p>
              <Link 
                href="/capital-club"
                className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Join the Capital Club →
              </Link>
              <div className="text-xs text-gray-400 mt-3">November 3, 2025</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Add MultiFamilyOS to Your Safe Senders</h3>
              <p className="text-gray-600 text-sm mb-4">Send a quick email to info@multifamilyos.ai from the email address you used to log in. This ensures our support messages, property alerts, and system notifications reach your inbox instead of junk mail.</p>
              <a 
                href="mailto:info@multifamilyos.ai?subject=Adding MultiFamilyOS to Safe Senders"
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Send Email →
              </a>
              <div className="text-xs text-gray-400 mt-3">December 29, 2025</div>
            </div>
          </div>
        </div>

        {/* Reminders Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Reminders</h2>
          <RemindersSection user={user} />
        </div>

        {/* Activity Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Activity</h2>
          
          {/* Unified White Container */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Main Activity Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Total Pipeline Value"
                value={metrics?.totalPipelineValue.value || "$0"}
                change={metrics?.totalPipelineValue.change || "0%"}
                trend={metrics?.totalPipelineValue.trend || "up"}
                icon={<DollarSign className="h-6 w-6" />}
                color="green"
              />
              <MetricCard
                title="Buy Box Markets"
                value={metrics?.buyBoxMarkets.value || "0"}
                change={metrics?.buyBoxMarkets.change || "+0"}
                trend={metrics?.buyBoxMarkets.trend || "up"}
                icon={<Building className="h-6 w-6" />}
                color="blue"
              />
              <MetricCard
                title="Properties Favorited"
                value={metrics?.propertiesFavorited.value || "0"}
                change={metrics?.propertiesFavorited.change || "+0"}
                trend={metrics?.propertiesFavorited.trend || "up"}
                icon={<Building className="h-6 w-6" />}
                color="purple"
              />
              <MetricCard
                title="Total Units"
                value={metrics?.totalUnits.value || "0"}
                change={metrics?.totalUnits.change || "+0"}
                trend={metrics?.totalUnits.trend || "up"}
                icon={<Users className="h-6 w-6" />}
                color="orange"
              />
            </div>
            
            {/* Recent Activity Summary */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Past 7 Days</h3>
                <Link href="/dashboard/metrics" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View Details
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ActivityCard
                  title="Marketing Letters"
                  value={recentActivity.filter(activity => activity.type === 'marketing').length.toString()}
                  description="Letters sent"
                  icon={<Users className="h-6 w-6" />}
                  color="blue"
                />
                <ActivityCard
                  title="Emails Sent"
                  value={recentActivity.filter(activity => activity.type === 'engagement' && activity.title.includes('Email')).length.toString()}
                  description="Email campaigns"
                  icon={<Users className="h-6 w-6" />}
                  color="green"
                />
                <ActivityCard
                  title="LOI/P&S Created"
                  value={recentActivity.filter(activity => activity.type === 'engagement' && activity.title.includes('LOI')).length.toString()}
                  description="LOIs and Purchase & Sale Agreements"
                  icon={<Building className="h-6 w-6" />}
                  color="purple"
                />
                <ActivityCard
                  title="Offers Made"
                  value={recentActivity.filter(activity => activity.type === 'analysis' && activity.title.includes('offer')).length.toString()}
                  description="Property offers"
                  icon={<DollarSign className="h-6 w-6" />}
                  color="orange"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buy Box Market Insights */}
        {buyBoxMarkets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Buy Box</h2>
            <div className="mb-6">
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px] shadow-sm"
              >
                {buyBoxMarkets.map((market) => (
                  <option key={market.key} value={market.key}>
                    {market.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Unified Buy Box Container */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

              {/* Content Cards */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Market Pulse */}
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">Market Pulse</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700">Active Listings:</span>
                        <span className="font-semibold text-blue-900">
                          {isLoadingMarketInsights ? '...' : marketInsights?.marketPulse.activeListings || 0} properties
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700">Avg. Estimated Value:</span>
                        <span className="font-semibold text-blue-900">
                          {isLoadingMarketInsights ? '...' : marketInsights?.marketPulse.avgEstimatedValue || '$0'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700">Avg. Assessed Value:</span>
                        <span className="font-semibold text-blue-900">
                          {isLoadingMarketInsights ? '...' : marketInsights?.marketPulse.avgAssessedValue || '$0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Your Portfolio */}
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">Your Portfolio</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700">Properties Tracked:</span>
                        <span className="font-semibold text-green-900">
                          {isLoadingPortfolio ? '...' : marketInsights?.portfolioInsights.propertiesTracked || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-700">Total Investment:</span>
                        <span className="font-semibold text-green-900">
                          {isLoadingPortfolio ? '...' : marketInsights?.portfolioInsights.totalInvestment || '$0'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-700">Avg. Cap Rate Target:</span>
                        <span className="font-semibold text-green-900">
                          {isLoadingPortfolio ? '...' : marketInsights?.portfolioInsights.avgCapRate || '0%'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Market Analysis - Full Width within Buy Box */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Market Analysis</h3>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <div className="prose prose-purple max-w-none">
                      <p className="text-purple-700 leading-relaxed text-base">
                        {isLoadingMarketInsights ? 'Generating market analysis...' : marketInsights?.aiTrends.marketBriefing || 'Market analysis will appear here once data is loaded.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}

// Helper Components

function MetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon, 
  color 
}: { 
  title: string; 
  value: string; 
  change: string; 
  trend: 'up' | 'down'; 
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const borderColorClasses = {
    green: 'border-l-green-500',
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500',
    orange: 'border-l-orange-500'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 border-l-4 ${borderColorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-4xl font-bold text-gray-900">{value}</div>
          <div className="text-lg font-medium text-gray-700 mt-2">{title}</div>
        </div>
        <div className={`flex items-center text-sm font-medium ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? (
            <TrendingUp className="h-4 w-4 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 mr-1" />
          )}
          {change}
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ 
  title, 
  value, 
  description, 
  icon, 
  color 
}: { 
  title: string; 
  value: string; 
  description: string; 
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const borderColorClasses = {
    green: 'border-l-green-500',
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500',
    orange: 'border-l-orange-500'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 border-l-4 ${borderColorClasses[color]}`}>
      <div className="text-4xl font-bold text-gray-900">{value}</div>
      <div className="text-lg font-medium text-gray-700 mt-2">{title}</div>
    </div>
  );
}

// Reminders Section Component
function RemindersSection({ user }: { user: any }) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [pendingRecommendations, setPendingRecommendations] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Investment activity state
  const [submissionMetrics, setSubmissionMetrics] = useState({ activeCount: 0, newThisWeek: 0 });
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  
  // Discussion replies state
  const [discussionReplies, setDiscussionReplies] = useState({
    unread_submissions: [],
    total_count: 0
  });
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  // Fetch reminders from API
  useEffect(() => {
    const fetchReminders = async () => {
      if (!user) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/reminders');
        if (!response.ok) {
          throw new Error('Failed to fetch reminders');
        }

        const data = await response.json();
        setReminders(data.reminders || []);
      } catch (err: any) {
        // Error fetching reminders
        setError(err.message || 'Failed to load reminders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReminders();
  }, [user]);

  // Fetch discussion replies
  useEffect(() => {
    const fetchDiscussionReplies = async () => {
      if (!user?.id) return;
      
      setIsLoadingReplies(true);
      
      try {
        const response = await fetch('/api/discussion-replies');
        if (response.ok) {
          const data = await response.json();
          setDiscussionReplies(data);
        } else {
          console.error('Failed to fetch discussion replies');
        }
      } catch (err) {
        console.error('Error fetching discussion replies:', err);
      } finally {
        setIsLoadingReplies(false);
      }
    };

    fetchDiscussionReplies();
  }, [user?.id]);

  // Fetch pending recommendations count
  useEffect(() => {
    const fetchPendingRecommendations = async () => {
      if (!user) {
        return;
      }

      setIsLoadingRecommendations(true);

      try {
        const response = await fetch(`/api/favorites`);
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();
        console.log('API Response:', data); // Debug log
        console.log('Filtering favorites:', data.favorites); // Debug log
        
        // Count favorites with recommendation_type = 'algorithm' and raw_status = 'pending'
        const pendingCount = data.favorites?.filter((fav: any) => {
          console.log('Checking favorite:', fav.recommendation_type, 'raw_status:', fav.raw_status, 'status:', fav.status, fav.property_data ? 'has property_data' : 'no property_data');
          return fav.recommendation_type === 'algorithm' && 
                 fav.property_data && 
                 fav.raw_status === 'pending';
        }).length || 0;
        
        console.log('Pending count:', pendingCount); // Debug log
        
        setPendingRecommendations(pendingCount);
      } catch (err: any) {
        console.error('Error fetching pending recommendations:', err);
        setPendingRecommendations(0);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchPendingRecommendations();
  }, [user]);

  // Fetch submission metrics
  useEffect(() => {
    const fetchSubmissionMetrics = async () => {
      setIsLoadingSubmissions(true);
      try {
        const response = await fetch('/api/submissions/metrics');
        if (response.ok) {
          const data = await response.json();
          setSubmissionMetrics({
            activeCount: data.activeCount || 0,
            newThisWeek: data.newThisWeek || 0
          });
        }
      } catch (error) {
        console.error('Error fetching submission metrics:', error);
        setSubmissionMetrics({ activeCount: 0, newThisWeek: 0 });
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    fetchSubmissionMetrics();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* Next 7 Days Reminders (upcoming only) */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Next 7 Days ({reminders.filter(r => r.type === 'upcoming').length})
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

          {/* Pending Weekly Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
              <BarChart3 className="h-4 w-4 mr-1" />
              Pending Recommendations ({isLoadingRecommendations ? '...' : pendingRecommendations})
            </h3>
            <div className="max-h-48 overflow-y-auto">
              {isLoadingRecommendations ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-blue-600">Loading...</span>
                </div>
              ) : pendingRecommendations === 0 ? (
                <p className="text-sm text-gray-600 italic">No pending recommendations</p>
              ) : (
                <div className="space-y-2">
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      Weekly Buy Box Recommendations
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      You have {pendingRecommendations} property recommendation{pendingRecommendations !== 1 ? 's' : ''} to review from our weekly analysis.
                    </div>
                    <Link 
                      href="/discover/buybox"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Review Recommendations →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// Reminder Card Component
function ReminderCard({ reminder }: { reminder: any }) {
  const formatDate = (dateStr: string) => {
    // Parse date components manually to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-based
    
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
          <Link 
            href={`/discover/property/${reminder.property_id}?context=engage&back=${encodeURIComponent('/dashboard/headlines')}`}
            className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            {reminder.property_address}
          </Link>
          <div className="text-xs text-gray-600">{reminder.reminder_text}</div>
          <div className="text-xs text-gray-500 mt-1">{formatDate(reminder.reminder_date)}</div>
        </div>
      </div>
    </div>
  );
}

// Market Insights Component
function MarketInsights() {
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/national-market-insights');
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else {
        throw new Error('Failed to fetch insights');
      }
    } catch (error) {
      setError('Failed to load insights');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">National Market Insights</h3>
        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Error Loading Insights</h4>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <button
              onClick={fetchInsights}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : isLoading && insights.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Generating Insights</h4>
            <p className="text-gray-500 text-sm">
              AI is analyzing current market conditions...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className={`p-1 rounded-full ${
                insight.type === 'success' ? 'bg-green-100 text-green-600' :
                insight.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">{insight.title}</div>
                <div className="text-gray-600 text-sm">{insight.description}</div>
                {insight.timestamp && (
                  <div className="text-xs text-gray-400 mt-1">
                    Updated {new Date(insight.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


