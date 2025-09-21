/*
 * CHARLIE2 V2 - Dashboard Page
 * Investment metrics and portfolio management dashboard
 * Part of the new V2 application architecture
 * TODO: Consider moving to app/v2/dashboard/ for proper V2 organization
 */
'use client';

import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building, 
  Users, 
  Eye,
  ArrowRight,
  BarChart3,
  Activity,
  MapPin
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your multifamily investments.</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Pipeline Value"
            value="$24.8M"
            change="+12.5%"
            trend="up"
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Properties Owned"
            value="47"
            change="+3"
            trend="up"
            icon={<Building className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Total Units"
            value="1,247"
            change="+85"
            trend="up"
            icon={<Users className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="Average Cap Rate"
            value="6.2%"
            change="-0.3%"
            trend="down"
            icon={<BarChart3 className="h-6 w-6" />}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                <Link href="/v2/dashboard/metrics" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                <ActivityItem
                  type="property"
                  title="New property added to watchlist"
                  description="3843 Payne Ave, Cleveland, OH - 43 units"
                  time="2 hours ago"
                />
                <ActivityItem
                  type="analysis"
                  title="Deal analysis completed"
                  description="ROI projection: 14.2% for Denver market expansion"
                  time="5 hours ago"
                />
                <ActivityItem
                  type="engagement"
                  title="Email campaign sent"
                  description="Outreach to 127 property owners in Phoenix market"
                  time="1 day ago"
                />
                <ActivityItem
                  type="market"
                  title="Market alert triggered"
                  description="Price drop detected in Austin, TX - 3 properties"
                  time="2 days ago"
                />
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Pipeline Performance</h2>
                <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
                  <option>Last 6 months</option>
                  <option>Last year</option>
                  <option>All time</option>
                </select>
              </div>
              {/* Chart Placeholder */}
              <div className="h-64 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-medium">Pipeline Performance Chart</p>
                  <p className="text-sm">Interactive chart would go here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <QuickAction
                  title="Find Properties"
                  description="Search multifamily investments"
                  href="/discover"
                  icon={<Building className="h-5 w-5" />}
                />
                <QuickAction
                  title="Start Outreach"
                  description="Contact property owners"
                  href="/engage/outreach"
                  icon={<Users className="h-5 w-5" />}
                />
                <QuickAction
                  title="AI Analysis"
                  description="Get deal insights"
                  href="/chat/deals"
                  icon={<BarChart3 className="h-5 w-5" />}
                />
                <QuickAction
                  title="Buy Box"
                  description="Weekly recommendations"
                  href="/discover/buybox"
                  icon={<TrendingUp className="h-5 w-5" />}
                />
              </div>
            </div>

            {/* Market Insights */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Market Insights</h3>
                <Link href="/discover/buybox" className="text-blue-600 hover:text-blue-700 text-sm">
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                <MarketInsight
                  market="Denver, CO"
                  trend="up"
                  value="Cap rates averaging 5.8%"
                  change="+0.2% this quarter"
                />
                <MarketInsight
                  market="Austin, TX"
                  trend="down"
                  value="Price per unit: $185k"
                  change="-3.1% from last month"
                />
                <MarketInsight
                  market="Atlanta, GA"
                  trend="up"
                  value="Occupancy rates: 94.2%"
                  change="+1.8% year over year"
                />
              </div>
            </div>

            {/* Deal Pipeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-3xl font-semibold text-gray-900">Deal Pipeline</h3>
                <Link href="/v2/dashboard/pipeline" className="text-blue-600 hover:text-blue-700 text-sm">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                <PipelineItem status="hot" title="Cleveland Property" value="$843k" />
                <PipelineItem status="warm" title="Phoenix Complex" value="$3.2M" />
                <PipelineItem status="cold" title="Denver Apartments" value="$2.1M" />
              </div>
            </div>
          </div>
        </div>
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
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
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
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
      </div>
    </div>
  );
}

function ActivityItem({ 
  type, 
  title, 
  description, 
  time 
}: { 
  type: string; 
  title: string; 
  description: string; 
  time: string;
}) {
  const getIcon = () => {
    switch (type) {
      case 'property': return <Building className="h-4 w-4" />;
      case 'analysis': return <BarChart3 className="h-4 w-4" />;
      case 'engagement': return <Users className="h-4 w-4" />;
      case 'market': return <TrendingUp className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}

function QuickAction({ 
  title, 
  description, 
  href, 
  icon 
}: { 
  title: string; 
  description: string; 
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link 
      href={href}
      className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="p-2 bg-gray-100 rounded-lg text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
        {icon}
      </div>
      <div className="ml-3 flex-1">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className="text-xs text-gray-600">{description}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
    </Link>
  );
}

function MarketInsight({ 
  market, 
  trend, 
  value, 
  change 
}: { 
  market: string; 
  trend: 'up' | 'down'; 
  value: string; 
  change: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-2">
        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-gray-900">{market}</div>
          <div className="text-xs text-gray-600">{value}</div>
        </div>
      </div>
      <div className={`flex items-center text-xs font-medium ${
        trend === 'up' ? 'text-green-600' : 'text-red-600'
      }`}>
        {trend === 'up' ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 mr-1" />
        )}
        {change}
      </div>
    </div>
  );
}

function PipelineItem({ 
  status, 
  title, 
  value 
}: { 
  status: 'hot' | 'warm' | 'cold'; 
  title: string; 
  value: string;
}) {
  const statusColors = {
    hot: 'bg-red-100 text-red-600',
    warm: 'bg-yellow-100 text-yellow-600',
    cold: 'bg-blue-100 text-blue-600'
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-2 h-2 rounded-full ${statusColors[status].replace('text-', 'bg-').replace('100', '500')}`}></div>
        <div>
          <div className="text-sm font-medium text-gray-900">{title}</div>
          <div className="text-xs text-gray-600">Est. value: {value}</div>
        </div>
      </div>
      <Eye className="h-4 w-4 text-gray-400" />
    </div>
  );
}