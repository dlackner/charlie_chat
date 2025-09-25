/*
 * CHARLIE2 V2 - Community Insights Dashboard
 * Real-time community metrics, property heat map, and AI-powered market insights
 * Features: Activity trends, geographic heat map, live market analysis
 * Part of the new V2 application architecture
 */

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MapPin,
  Building,
  DollarSign,
  BookOpen,
  AlertCircle,
  Phone,
  Mail,
  Globe,
  Star
} from 'lucide-react';

// Dynamically import Mapbox components to avoid SSR issues
const HeatMapComponent = dynamic(() => import('react-map-gl/mapbox').then((mod) => {
  const { Map, Source, Layer } = mod;
  
  return function HeatMap({ 
    heatmapData, 
    heatmapGeoJSON, 
    heatmapLayer, 
    circleLayer, 
    mapLoaded, 
    setMapLoaded 
  }: any) {
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <div className="h-12 w-12 mx-auto mb-2 text-gray-400">🗺️</div>
            <p className="font-medium">Map requires configuration</p>
          </div>
        </div>
      );
    }

    return (
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: -95.7129,
          latitude: 37.0902,
          zoom: 3.2,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        projection="mercator"
        onLoad={() => setMapLoaded(true)}
      >
        {mapLoaded && (
          <Source
            id="property-data"
            type="geojson"
            data={heatmapGeoJSON}
          >
            <Layer {...heatmapLayer} />
            <Layer {...circleLayer} />
          </Source>
        )}
      </Map>
    );
  };
}), { ssr: false });

export default function CommunityPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [showLendersModal, setShowLendersModal] = useState(false);
  const [communityData, setCommunityData] = useState({
    totalUsers: 0,
    totalFavorited: 0,
    averageEstimatedValue: 0,
    propertiesSearched: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch community insights data
  useEffect(() => {
    const fetchCommunityData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/metrics/community-insights');
        if (response.ok) {
          const data = await response.json();
          setCommunityData(data);
        } else {
          // Failed to fetch community insights
        }
      } catch (error) {
        // Error fetching community insights
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunityData();
  }, []);

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Insights</h1>
          <p className="text-gray-600">Discover market trends and connect with resources in the multifamily investment community</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        {/* Community Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <CommunityStatCard
            title="Total Users"
            value={isLoading ? "..." : communityData.totalUsers.toLocaleString()}
            change=""
            trend="up"
            icon={<Users className="h-6 w-6" />}
            subtitle="Registered community members"
          />
          <CommunityStatCard
            title="Properties Searched"
            value={isLoading ? "..." : communityData.propertiesSearched.toLocaleString()}
            change=""
            trend="up"
            icon={<MapPin className="h-6 w-6" />}
            subtitle="Total properties analyzed"
          />
          <CommunityStatCard
            title="Properties Favorited"
            value={isLoading ? "..." : communityData.totalFavorited.toLocaleString()}
            change=""
            trend="up"
            icon={<Building className="h-6 w-6" />}
            subtitle="Total saved across all users"
          />
          <CommunityStatCard
            title="Avg Property Value"
            value={isLoading ? "..." : `$${(communityData.averageEstimatedValue / 1000000).toFixed(1)}M`}
            change=""
            trend="up"
            icon={<DollarSign className="h-6 w-6" />}
            subtitle="Average estimated value"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Activity Trends Chart */}
            <ActivityTrendsChart timeRange={selectedTimeRange} />

            {/* Regional Heat Map */}
            <RegionalHeatMap timeRange={selectedTimeRange} />
          </div>

          {/* Right Column - Market Insights */}
          <div className="space-y-8">
            {/* Market Insights */}
            <MarketInsights />
          </div>
        </div>

        {/* Bottom Section - Coming Soon Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mortgage Lenders */}
          <MortgageLenders onShowModal={() => setShowLendersModal(true)} />

          {/* Educational Resources */}
          <EducationalResources />
        </div>

        {/* Mortgage Lenders Modal */}
        {showLendersModal && (
          <MortgageLendersModal onClose={() => setShowLendersModal(false)} />
        )}
      </div>
    </div>
    </AuthGuard>
  );
}

// Community Stat Card Component
function CommunityStatCard({ title, value, change, trend, icon, subtitle }: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
          {icon}
        </div>
        {change && (
          <div className={`flex items-center text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            {change}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

// Activity Trends Chart Component
function ActivityTrendsChart({ timeRange }: { timeRange: string }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredData, setHoveredData] = useState<any>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchTrendsData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/metrics/community-activity-trends?timeRange=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setChartData(data || []);
        } else {
          // Failed to fetch community activity trends
        }
      } catch (error) {
        // Error fetching community activity trends
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendsData();
  }, [timeRange]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Community Activity Trends</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Properties Favorited</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Total Value</span>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-80">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-full relative">
            {/* Chart Container */}
            <div className="h-full flex flex-col">
              {/* Chart Area */}
              <div 
                className="flex-1 relative"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseLeave={() => setHoveredData(null)}
              >
                <svg className="w-full h-full" viewBox="0 0 800 300">
                  {/* Grid Lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line key={i} x1="60" y1={60 + i * 48} x2="750" y2={60 + i * 48} 
                          stroke="#f3f4f6" strokeWidth="1" />
                  ))}
                  
                  {/* Chart Data */}
                  {(() => {
                    const maxCount = Math.max(...chartData.map(d => d.propertiesFavorited));
                    const maxValue = Math.max(...chartData.map(d => d.totalValue));
                    const width = 690; // 750 - 60
                    const height = 192; // 252 - 60
                    const barWidth = Math.max(width / chartData.length * 0.6, 8); // 60% of available space
                    
                    return (
                      <g>
                        {/* Bars for Properties Favorited (Blue) */}
                        {chartData.map((item, index) => {
                          const x = 60 + (index / (chartData.length - 1)) * width - barWidth / 2;
                          const barHeight = (item.propertiesFavorited / maxCount) * height;
                          const y = 60 + height - barHeight;
                          
                          return (
                            <rect
                              key={`bar-${index}`}
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              fill="#3b82f6"
                              className="cursor-pointer hover:fill-blue-700 transition-colors"
                              onMouseEnter={() => setHoveredData({ ...item, index, type: 'bar' })}
                            />
                          );
                        })}
                        
                        {/* Line for Total Value (Green) */}
                        <polyline
                          points={chartData.map((item, index) => {
                            const x = 60 + (index / (chartData.length - 1)) * width;
                            const y = 60 + height - (item.totalValue / maxValue) * height;
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                        />
                        
                        {/* Line Points for Hover */}
                        {chartData.map((item, index) => {
                          const x = 60 + (index / (chartData.length - 1)) * width;
                          const y = 60 + height - (item.totalValue / maxValue) * height;
                          
                          return (
                            <circle
                              key={`point-${index}`}
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#10b981"
                              className="cursor-pointer hover:fill-green-700 transition-colors"
                              onMouseEnter={() => setHoveredData({ ...item, index, type: 'line' })}
                            />
                          );
                        })}
                      </g>
                    );
                  })()}
                </svg>
                
                {/* Hover Tooltip */}
                {hoveredData && (
                  <div 
                    className="absolute pointer-events-none z-50"
                    style={{ 
                      left: mousePosition.x + 10, 
                      top: mousePosition.y - 10,
                      transform: mousePosition.x > 400 ? 'translateX(-100%)' : 'none'
                    }}
                  >
                    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900 mb-2">
                        Week of {new Date(hoveredData.week).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span className="text-sm text-gray-600">Properties Favorited:</span>
                          <span className="text-sm font-medium text-blue-600">
                            {hoveredData.propertiesFavorited.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span className="text-sm text-gray-600">Total Value:</span>
                          <span className="text-sm font-medium text-green-600">
                            ${(hoveredData.totalValue / 1000000).toFixed(1)}M
                          </span>
                        </div>
                      </div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45 -mb-1"></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* X-Axis Labels */}
              <div className="flex justify-between px-4 mt-4">
                {chartData.map((item, index) => {
                  if (index % Math.ceil(chartData.length / 6) === 0 || index === chartData.length - 1) {
                    return (
                      <div key={index} className="text-xs text-gray-600">
                        {new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2" />
              <p className="font-medium">No activity data yet</p>
              <p className="text-sm">Trends will appear as users favorite properties</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Regional Heat Map Component
function RegionalHeatMap({ timeRange }: { timeRange: string }) {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/metrics/property-heatmap?timeRange=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setHeatmapData(data || []);
        } else {
          // Failed to fetch heatmap data
        }
      } catch (error) {
        // Error fetching heatmap data
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeatmapData();
  }, [timeRange]);

  // Convert heatmap data to GeoJSON format for Mapbox
  const heatmapGeoJSON = {
    type: 'FeatureCollection' as const,
    features: heatmapData.map((point) => ({
      type: 'Feature' as const,
      properties: {
        weight: point.weight,
        count: point.count,
        city: point.city,
        state: point.state,
        totalValue: point.totalValue,
        averageValue: point.averageValue
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [point.longitude, point.latitude]
      }
    }))
  };

  const heatmapLayer: any = {
    id: 'property-heatmap',
    type: 'heatmap',
    source: 'property-data',
    maxzoom: 9,
    paint: {
      // Increase the heatmap weight based on favorite count
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'weight'],
        0, 0,
        6, 1
      ],
      // Increase the heatmap color weight weight by zoom level
      // heatmap-intensity is a multiplier on top of heatmap-weight
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 1,
        9, 3
      ],
      // Color ramp for heatmap. Domain is 0 (low) to 1 (high).
      // Begin color ramp at 0-stop with a 0-transparancy color
      // to create a blur-like effect.
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(33,102,172,0)',
        0.2, 'rgb(103,169,207)',
        0.4, 'rgb(209,229,240)',
        0.6, 'rgb(253,219,199)',
        0.8, 'rgb(239,138,98)',
        1, 'rgb(178,24,43)'
      ],
      // Adjust the heatmap radius by zoom level
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 2,
        9, 20
      ],
      // Transition from heatmap to circle layer by zoom level
      'heatmap-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        7, 1,
        9, 0
      ]
    }
  };

  const circleLayer: any = {
    id: 'property-points',
    type: 'circle',
    source: 'property-data',
    minzoom: 7,
    paint: {
      // Size circle radius by favorite count
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'weight'],
        1, 4,
        6, 20
      ],
      // Color circle by favorite count
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'weight'],
        1, 'rgba(33,102,172,0.8)',
        6, 'rgba(178,24,43,0.8)'
      ],
      'circle-stroke-color': 'white',
      'circle-stroke-width': 1,
      // Transition from heatmap to circle layer by zoom level
      'circle-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        7, 0,
        8, 1
      ]
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Property Activity Heat Map</h3>
      </div>
      
      {/* Heat Map */}
      <div className="h-96 rounded-lg overflow-hidden border">
        {isLoading ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="font-medium">Loading heat map data...</p>
            </div>
          </div>
        ) : heatmapData.length > 0 ? (
          <HeatMapComponent
            heatmapData={heatmapData}
            heatmapGeoJSON={heatmapGeoJSON}
            heatmapLayer={heatmapLayer}
            circleLayer={circleLayer}
            mapLoaded={mapLoaded}
            setMapLoaded={setMapLoaded}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-2" />
              <p className="font-medium">No Activity Data</p>
              <p className="text-sm">Heat map will appear as users favorite properties</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <span>Low Activity</span>
        <div className="flex space-x-1">
          <div className="w-4 h-3 bg-blue-200 rounded"></div>
          <div className="w-4 h-3 bg-yellow-200 rounded"></div>
          <div className="w-4 h-3 bg-red-200 rounded"></div>
        </div>
        <span>High Activity</span>
      </div>
      
      {/* Summary Stats */}
      {heatmapData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">{heatmapData.length}</div>
              <div className="text-gray-500">Active Regions</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {heatmapData.reduce((sum, point) => sum + point.count, 0).toLocaleString()}
              </div>
              <div className="text-gray-500">Total Favorites</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                ${(heatmapData.reduce((sum, point) => sum + point.totalValue, 0) / 1000000).toFixed(1)}M
              </div>
              <div className="text-gray-500">Total Value</div>
            </div>
          </div>
        </div>
      )}
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
      // Error fetching market insights
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

// Mortgage Lenders Component
function MortgageLenders({ onShowModal }: { onShowModal: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Mortgage Lenders</h3>
      
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h4>
          <p className="text-gray-500 text-sm">
            Connect with multifamily financing specialists here.
          </p>
        </div>
      </div>
    </div>
  );
}


// Educational Resources Component
function EducationalResources() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Center</h3>
      
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h4>
          <p className="text-gray-500 text-sm">
            Educational resources and guides will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}


// Mortgage Lenders Modal
function MortgageLendersModal({ onClose }: { onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const lenders = [
    { name: "Capital Multifamily", type: "Commercial Bank", rate: "6.25%", minDeal: "$1M+", rating: 4.8, phone: "(555) 123-4567", email: "loans@capitalmf.com", website: "capitalmf.com" },
    { name: "Regional Investment Bank", type: "Community Bank", rate: "6.45%", minDeal: "$500K+", rating: 4.6, phone: "(555) 234-5678", email: "commercial@rib.com", website: "rib.com" },
    { name: "Pacific Coast Lending", type: "Credit Union", rate: "6.15%", minDeal: "$250K+", rating: 4.9, phone: "(555) 345-6789", email: "info@pcl.org", website: "pcl.org" },
    { name: "Metro Commercial Finance", type: "Commercial Bank", rate: "6.35%", minDeal: "$2M+", rating: 4.7, phone: "(555) 456-7890", email: "deals@metrocf.com", website: "metrocf.com" },
    { name: "Community First Credit Union", type: "Credit Union", rate: "6.20%", minDeal: "$100K+", rating: 4.5, phone: "(555) 567-8901", email: "lending@cfcu.org", website: "cfcu.org" },
    { name: "Bridge Capital Partners", type: "Private Lender", rate: "7.50%", minDeal: "$500K+", rating: 4.4, phone: "(555) 678-9012", email: "bridge@bcp.com", website: "bridgecp.com" }
  ];

  const filteredLenders = lenders.filter(lender => {
    const matchesSearch = lender.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || lender.type.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesType;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Mortgage Lenders Directory</h2>
            <p className="text-sm text-gray-600 mt-1">Connect with multifamily financing specialists</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search lenders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="commercial">Commercial Banks</option>
              <option value="community">Community Banks</option>
              <option value="credit">Credit Unions</option>
              <option value="private">Private Lenders</option>
            </select>
          </div>
        </div>

        {/* Lenders List */}
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="grid gap-4">
            {filteredLenders.map((lender, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{lender.name}</h3>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">{lender.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{lender.type}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Starting Rate:</span>
                        <span className="ml-2 font-medium text-green-600">{lender.rate}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Minimum Deal:</span>
                        <span className="ml-2 font-medium">{lender.minDeal}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <a href={`tel:${lender.phone}`} className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{lender.phone}</span>
                    </a>
                    <a href={`mailto:${lender.email}`} className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm">
                      <Mail className="h-4 w-4" />
                      <span>{lender.email}</span>
                    </a>
                    <a href={`https://${lender.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm">
                      <Globe className="h-4 w-4" />
                      <span>{lender.website}</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}