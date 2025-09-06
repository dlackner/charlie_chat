'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Heart, Grid3x3, Map, BarChart3, Grid, Filter, ChevronDown, FileText, MapPin, Calculator, StickyNote, Columns } from 'lucide-react';
import { generate10YearCashFlowReport } from '../offer-analyzer/cash-flow-report';

export default function EngagePage() {
  const [viewMode, setViewMode] = useState<'cards' | 'map' | 'analysis' | 'matrix' | 'pipeline'>('cards');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sample saved properties data - would come from API
  const savedProperties = [
    {
      id: 1,
      address: '103 Gibbs Ave',
      city: 'Newport',
      state: 'RI',
      zip: '02840',
      units: 10,
      built: 1900,
      assessed: '$1,202,800',
      estEquity: '$2,079,000',
      market: 'Newport',
      pipelineStatus: 'Reviewing',
      source: 'A', // A = Auto (weekly recommendations), M = Manual (user saved)
      isFavorited: true,
      isSkipTraced: false,
      hasPricingScenario: false,
      notes: ''
    },
    {
      id: 2,
      address: '9-11 Sherman St',
      city: 'Newport',
      state: 'RI', 
      zip: '02840',
      units: 5,
      built: 1870,
      assessed: '$1,262,300',
      estEquity: '$1,597,000',
      market: 'Newport',
      pipelineStatus: 'Engaged',
      source: 'M',
      isFavorited: true,
      isSkipTraced: true,
      hasPricingScenario: true,
      notes: 'Great property, need to follow up @09/15/25'
    },
    {
      id: 3,
      address: 'Kingston Ave',
      city: 'Newport',
      state: 'RI',
      zip: '02840',
      units: 286,
      built: 1980,
      assessed: '$3,468,900',
      estEquity: '$3,468,900',
      market: 'Newport',
      pipelineStatus: 'Analyzing',
      source: 'A',
      isFavorited: true,
      isSkipTraced: false,
      hasPricingScenario: false,
      notes: 'Large complex - schedule site visit @09/20/25'
    },
    {
      id: 4,
      address: '14 Everett St',
      city: 'Newport',
      state: 'RI',
      zip: '02840',
      units: 5,
      built: 1900,
      assessed: '$976,600',
      estEquity: '$1,844,000',
      market: 'Newport',
      pipelineStatus: 'Engaged',
      source: 'M',
      isFavorited: true,
      isSkipTraced: false,
      hasPricingScenario: true,
      notes: 'Owner responded - waiting for financials'
    }
  ];

  // Valid markets that can be assigned to properties
  const validMarkets = ['Denver, CO', 'Austin, TX', 'Phoenix, AZ', 'Newport, RI', 'Atlanta, GA', 'Tampa, FL'];
  
  // Get unique values for filters
  const uniqueStatuses = ['All', ...new Set(savedProperties.map(p => p.pipelineStatus))];
  const uniqueMarkets = ['All', ...new Set(savedProperties.map(p => p.market))];
  const uniqueSources = ['All', 'Algorithm', 'Manual'];

  // Filter properties based on selections
  const filteredProperties = savedProperties.filter(property => {
    const matchesStatus = selectedStatus === 'All' || property.pipelineStatus === selectedStatus;
    const matchesMarket = selectedMarket === 'All' || property.market === selectedMarket;
    const matchesSource = selectedSource === 'All' || 
      (selectedSource === 'Algorithm' && property.source === 'A') ||
      (selectedSource === 'Manual' && property.source === 'M');
    const matchesSearch = searchQuery === '' || 
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesMarket && matchesSource && matchesSearch;
  });

  const togglePropertySelection = (propertyId: number) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const selectAll = () => {
    setSelectedProperties(filteredProperties.map(p => p.id));
  };

  const clearSelection = () => {
    setSelectedProperties([]);
  };

  const handleGenerateCashFlowReport = (propertyId: number) => {
    const property = savedProperties.find(p => p.id === propertyId);
    if (!property) return;

    // Check if property has pricing scenario data
    if (!property.hasPricingScenario) {
      alert(`To generate a 10-Year Cash Flow Report for ${property.address}, you must first complete an Offer Analysis. Click 'Offer Analysis' on the property card to set up the financial parameters needed for the cash flow report.`);
      return;
    }

    // TODO: In a real implementation, we would:
    // 1. Fetch saved offer analyzer scenario data from database
    // 2. Call generate10YearCashFlowReport with the complete data
    // For now, show placeholder message
    alert(`10-Year Cash Flow Report generation for ${property.address} would be implemented here using saved offer analysis data.`);
  };

  const handleDocumentAction = (action: string) => {
    console.log(`${action} requested for properties:`, selectedProperties);
    setShowDocumentDropdown(false);
    
    // TODO: Implement document generation logic
    switch (action) {
      case 'marketing-letter':
        // Can handle multiple properties
        break;
      case 'email':
      case 'loi':
      case 'cash-flow-report':
        // Should only allow 1 property
        if (selectedProperties.length !== 1) {
          alert(`${action.toUpperCase()} can only be generated for one property at a time.`);
          return;
        }
        // Handle cash flow report generation
        if (action === 'cash-flow-report') {
          handleGenerateCashFlowReport(selectedProperties[0]);
        }
        break;
      case 'csv':
        // Export filtered results
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDocumentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Engage</h1>
          <p className="text-gray-600">{filteredProperties.length} saved investment opportunities</p>
        </div>

        {/* Filters and Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            
            {/* Left side - Selection and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Select All Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedProperties.length === filteredProperties.length && filteredProperties.length > 0}
                  onChange={selectedProperties.length === filteredProperties.length ? clearSelection : selectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Select All</span>
              </div>

              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowDocumentDropdown(!showDocumentDropdown)}
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Documents ({selectedProperties.length})
                  <ChevronDown className="h-4 w-4 ml-2" />
                </button>

                {/* Document Generation Dropdown */}
                {showDocumentDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-2">
                      <button
                        onClick={() => handleDocumentAction('marketing-letter')}
                        disabled={selectedProperties.length === 0}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        <div>
                          <div>Marketing Letter</div>
                          <div className="text-xs text-gray-500">Batch multiple properties</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleDocumentAction('email')}
                        disabled={selectedProperties.length !== 1}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        <div>
                          <div>Email</div>
                          <div className="text-xs text-gray-500">Select exactly 1 property</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleDocumentAction('loi')}
                        disabled={selectedProperties.length !== 1}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        <div>
                          <div>Letter of Intent (LOI)</div>
                          <div className="text-xs text-gray-500">Select exactly 1 property</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleDocumentAction('cash-flow-report')}
                        disabled={selectedProperties.length !== 1}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                      >
                        <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a4 4 0 01-4 4z" />
                        </svg>
                        <div>
                          <div>10-Year Cash Flow Report</div>
                          <div className="text-xs text-gray-500">Select exactly 1 property</div>
                        </div>
                      </button>

                      <div className="border-t border-gray-200 my-1"></div>
                      
                      <button
                        onClick={() => handleDocumentAction('csv')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        <div>
                          <div>CSV Download</div>
                          <div className="text-xs text-gray-500">Export filtered results</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status and Market Filters with View Mode Toggle */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 space-y-4 lg:space-y-0">
          
          {/* Status and Market Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>
                      {status === 'All' ? 'All Statuses' : status}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Market Filter */}
              <div className="relative">
                <select
                  value={selectedMarket}
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {uniqueMarkets.map(market => (
                    <option key={market} value={market}>
                      {market === 'All' ? 'All Markets' : market}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Source Filter */}
              <div className="relative">
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {uniqueSources.map(source => (
                    <option key={source} value={source}>
                      {source === 'All' ? 'All Sources' : source}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3x3 className="h-4 w-4 mr-1.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'map' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Map className="h-4 w-4 mr-1.5" />
              Map
            </button>
            <button
              onClick={() => setViewMode('analysis')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'analysis' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Analytics
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'matrix' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="h-4 w-4 mr-1.5" />
              Matrix
            </button>
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSelected={selectedProperties.includes(property.id)}
                onToggleSelect={() => togglePropertySelection(property.id)}
                validMarkets={validMarkets}
              />
            ))}
          </div>
        )}

        {viewMode === 'map' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Map className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Map View</h3>
            <p className="text-gray-600">Interactive map showing all {filteredProperties.length} saved properties</p>
          </div>
        )}

        {viewMode === 'analysis' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics View</h3>
            <p className="text-gray-600">Performance metrics and analysis for your {filteredProperties.length} properties</p>
          </div>
        )}

        {viewMode === 'matrix' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Grid className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Matrix View</h3>
            <p className="text-gray-600">Tabular view of all {filteredProperties.length} properties with detailed comparison</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyCard({ 
  property, 
  isSelected, 
  onToggleSelect,
  validMarkets
}: { 
  property: any; 
  isSelected: boolean; 
  onToggleSelect: () => void;
  validMarkets: string[];
}) {
  const [pipelineStatus, setPipelineStatus] = useState(property.pipelineStatus);
  const [market, setMarket] = useState(property.market);
  const [notes, setNotes] = useState(property.notes || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Reviewing': return 'bg-gray-100 text-gray-700';
      case 'Communicating': return 'bg-blue-100 text-blue-700';
      case 'Engaged': return 'bg-green-100 text-green-700';
      case 'Analyzing': return 'bg-yellow-100 text-yellow-700';
      case 'LOI Sent': return 'bg-purple-100 text-purple-700';
      case 'Acquired': return 'bg-emerald-100 text-emerald-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getHeartColor = () => {
    return property.source === 'A' ? 'text-blue-600' : 'text-red-500';
  };

  const handleOfferAnalyzer = () => {
    // Navigate to offer analyzer with property data
    const params = new URLSearchParams({
      address: property.address,
      city: property.city,
      state: property.state,
      units: property.units.toString(),
      assessed: property.assessed,
      built: property.built.toString()
    });
    
    window.open(`/offer-analyzer?${params.toString()}`, '_blank');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Property Image */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-gray-400/30 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 bg-gray-400 rounded"></div>
          </div>
          <div className="text-sm font-medium">Property Photo</div>
        </div>
        
        {/* Selection Checkbox */}
        <div className="absolute top-3 left-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shadow-sm"
          />
        </div>
        
        {/* Heart with Source Indicator */}
        <div className="absolute top-3 right-3">
          <div className={`p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors ${getHeartColor()}`}>
            <Heart className="h-4 w-4 fill-current" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs font-bold border border-gray-200">
              {property.source}
            </div>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Address */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {property.address}
          </h3>
          {/* Calculator Icon for Properties with Pricing Scenario */}
          {property.hasPricingScenario && (
            <Calculator className="h-4 w-4 text-blue-600 flex-shrink-0" />
          )}
        </div>
        
        {/* Location and Basic Info */}
        <p className="text-sm text-gray-600 mb-3">
          {property.city}, {property.state} • {property.units} Units • Built {property.built}
        </p>

        {/* Market and Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-3 w-3 mr-1" />
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="text-sm text-gray-600 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-1 py-0 cursor-pointer hover:bg-gray-50"
            >
              {validMarkets.map(marketOption => (
                <option key={marketOption} value={marketOption}>
                  {marketOption}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={pipelineStatus}
              onChange={(e) => setPipelineStatus(e.target.value)}
              className={`text-xs px-2 py-1 rounded-full font-medium border-0 focus:ring-2 focus:ring-blue-500 ${getStatusColor(pipelineStatus)}`}
            >
              <option value="Reviewing">Reviewing</option>
              <option value="Communicating">Communicating</option>
              <option value="Engaged">Engaged</option>
              <option value="Analyzing">Analyzing</option>
              <option value="LOI Sent">LOI Sent</option>
              <option value="Acquired">Acquired</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="text-xl font-bold text-gray-900">
            {property.assessed}
          </div>
          <div className="text-sm text-gray-600">
            Est. Equity: <span className="font-medium text-green-600">{property.estEquity}</span>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-3">
          <div className="flex items-center mb-2">
            <StickyNote className="h-3 w-3 text-gray-500 mr-1" />
            <label className="text-xs font-medium text-gray-700">Notes</label>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes... Use @MM/DD/YY for reminders"
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={2}
            onBlur={() => {
              // In a real app, this would save to database
              console.log(`Notes updated for ${property.address}:`, notes);
            }}
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Offer Analyzer Button */}
          <button 
            onClick={handleOfferAnalyzer}
            className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <Calculator className="h-3 w-3 mr-1" />
            {property.hasPricingScenario ? 'Edit Scenario' : 'Offer Analysis'}
          </button>
          
          <button 
            onClick={() => window.location.href = `/discover/property/${property.id}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}