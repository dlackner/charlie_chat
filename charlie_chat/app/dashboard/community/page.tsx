'use client';

import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MapPin,
  Building,
  DollarSign,
  Calendar,
  Target,
  BookOpen,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Star
} from 'lucide-react';

export default function CommunityPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [selectedMarketType, setSelectedMarketType] = useState('all');
  const [showLendersModal, setShowLendersModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Insights</h1>
          <p className="text-gray-600">Discover market trends and connect with resources in the multifamily investment community</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex items-center justify-between">
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

          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Market Focus:</label>
            <select
              value={selectedMarketType}
              onChange={(e) => setSelectedMarketType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Markets</option>
              <option value="primary">Primary Markets</option>
              <option value="secondary">Secondary Markets</option>
              <option value="emerging">Emerging Markets</option>
            </select>
          </div>
        </div>

        {/* Community Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <CommunityStatCard
            title="Community Activity"
            value="2,847"
            change="+12.5%"
            trend="up"
            icon={<Users className="h-6 w-6" />}
            subtitle="Properties favorited this month"
          />
          <CommunityStatCard
            title="Market Strength"
            value="7.8/10"
            change="+0.3"
            trend="up"
            icon={<TrendingUp className="h-6 w-6" />}
            subtitle="Overall market sentiment"
          />
          <CommunityStatCard
            title="Avg Deal Size"
            value="$1.2M"
            change="+5.2%"
            trend="up"
            icon={<DollarSign className="h-6 w-6" />}
            subtitle="Typical property value"
          />
          <CommunityStatCard
            title="Success Rate"
            value="23%"
            change="-1.1%"
            trend="down"
            icon={<Target className="h-6 w-6" />}
            subtitle="Favorites to acquisition"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Activity Trends Chart */}
            <ActivityTrendsChart timeRange={selectedTimeRange} />

            {/* Regional Heat Map */}
            <RegionalHeatMap marketType={selectedMarketType} />

            {/* Market Insights */}
            <MarketInsights />
          </div>

          {/* Right Column - Resources */}
          <div className="space-y-8">
            {/* Mortgage Lenders */}
            <MortgageLenders onShowModal={() => setShowLendersModal(true)} />

            {/* Educational Resources */}
            <EducationalResources />

            {/* Community Challenges */}
            <CommunityChallenges />
          </div>
        </div>

        {/* Mortgage Lenders Modal */}
        {showLendersModal && (
          <MortgageLendersModal onClose={() => setShowLendersModal(false)} />
        )}
      </div>
    </div>
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
        <div className={`flex items-center text-sm font-medium ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
          {change}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

// Activity Trends Chart Component
function ActivityTrendsChart({ timeRange }: { timeRange: string }) {
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
      
      {/* Chart Placeholder */}
      <div className="h-80 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-2" />
          <p className="font-medium">Activity Trends Chart</p>
          <p className="text-sm">Properties favorited & total value over {timeRange} days</p>
        </div>
      </div>
    </div>
  );
}

// Regional Heat Map Component
function RegionalHeatMap({ marketType }: { marketType: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Activity Heat Map</h3>
        <div className="text-sm text-gray-500">
          {marketType === 'all' ? 'All Markets' : `${marketType.charAt(0).toUpperCase() + marketType.slice(1)} Markets`}
        </div>
      </div>
      
      {/* Heat Map Placeholder */}
      <div className="h-64 bg-gradient-to-r from-red-50 via-yellow-50 to-green-50 rounded-lg flex items-center justify-center border">
        <div className="text-center text-gray-500">
          <MapPin className="h-12 w-12 mx-auto mb-2" />
          <p className="font-medium">Regional Activity Map</p>
          <p className="text-sm">Heat map showing community interest by region</p>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <span>Low Activity</span>
        <div className="flex space-x-1">
          <div className="w-4 h-3 bg-red-200 rounded"></div>
          <div className="w-4 h-3 bg-yellow-200 rounded"></div>
          <div className="w-4 h-3 bg-green-200 rounded"></div>
        </div>
        <span>High Activity</span>
      </div>
    </div>
  );
}

// Market Insights Component
function MarketInsights() {
  const insights = [
    { title: "Seasonal Trend Alert", description: "Q4 typically shows 15% higher activity", type: "info" },
    { title: "Market Velocity", description: "Average time to decision: 3.2 days", type: "success" },
    { title: "Price Movement", description: "Multifamily values trending up 2.1%", type: "warning" },
    { title: "Financing Climate", description: "Interest rates stabilizing around 6.5%", type: "info" }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Insights</h3>
      
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mortgage Lenders Component
function MortgageLenders({ onShowModal }: { onShowModal: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Mortgage Lenders</h3>
        <button
          onClick={onShowModal}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View All
        </button>
      </div>
      
      <div className="space-y-3">
        <LenderCard
          name="Capital Multifamily"
          type="Commercial Bank"
          rate="6.25%"
          minDeal="$1M+"
          rating={4.8}
        />
        <LenderCard
          name="Regional Investment Bank"
          type="Community Bank"
          rate="6.45%"
          minDeal="$500K+"
          rating={4.6}
        />
        <LenderCard
          name="Pacific Coast Lending"
          type="Credit Union"
          rate="6.15%"
          minDeal="$250K+"
          rating={4.9}
        />
      </div>
    </div>
  );
}

function LenderCard({ name, type, rate, minDeal, rating }: {
  name: string;
  type: string;
  rate: string;
  minDeal: string;
  rating: number;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="font-medium text-gray-900 text-sm">{name}</div>
        <div className="flex items-center space-x-1">
          <Star className="h-3 w-3 text-yellow-400 fill-current" />
          <span className="text-xs text-gray-600">{rating}</span>
        </div>
      </div>
      <div className="text-xs text-gray-600">{type}</div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-green-600 font-medium">{rate}</span>
        <span className="text-gray-500">{minDeal}</span>
      </div>
    </div>
  );
}

// Educational Resources Component
function EducationalResources() {
  const resources = [
    { title: "Multifamily Investment Guide", type: "PDF Guide", new: true },
    { title: "Market Analysis Webinar", type: "Video", new: false },
    { title: "Deal Calculator Template", type: "Spreadsheet", new: true },
    { title: "Financing Options Overview", type: "Article", new: false }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Learning Center</h3>
        <BookOpen className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        {resources.map((resource, index) => (
          <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm flex items-center">
                {resource.title}
                {resource.new && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">New</span>
                )}
              </div>
              <div className="text-xs text-gray-500">{resource.type}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Community Challenges Component
function CommunityChallenges() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Community Goals</h3>
        <Target className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {/* Challenge 1 */}
        <div className="border-l-4 border-blue-500 pl-4">
          <div className="font-medium text-gray-900 text-sm">Q4 Activity Challenge</div>
          <div className="text-xs text-gray-600 mb-2">Community goal: 5,000 properties analyzed</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '67%' }}></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">3,350 / 5,000 (67%)</div>
        </div>

        {/* Challenge 2 */}
        <div className="border-l-4 border-green-500 pl-4">
          <div className="font-medium text-gray-900 text-sm">Success Stories</div>
          <div className="text-xs text-gray-600 mb-2">Share your recent acquisitions</div>
          <div className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">Join the discussion →</div>
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