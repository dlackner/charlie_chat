/*
 * CHARLIE2 V2 - Engage Page
 * Property engagement and workflow management
 * Part of the new V2 application architecture
 * TODO: Consider moving to app/v2/engage/ for proper V2 organization
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Heart, Grid3x3, Map, BarChart3, Grid, Filter, ChevronDown, FileText, MapPin, Calculator, StickyNote, Columns } from 'lucide-react';
import PropertyMap from '@/components/v2/PropertyMap';
import { generate10YearCashFlowReport } from '../offer-analyzer/cash-flow-report';
import { useAuth } from "@/contexts/AuthContext";

export default function EngagePage() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'cards' | 'map' | 'analysis' | 'matrix' | 'pipeline'>(() => {
    // Initialize view mode from URL parameter, defaulting to 'cards'
    const paramViewMode = searchParams.get('viewMode');
    if (paramViewMode && ['cards', 'map', 'analysis', 'matrix', 'pipeline'].includes(paramViewMode)) {
      return paramViewMode as 'cards' | 'map' | 'analysis' | 'matrix' | 'pipeline';
    }
    return 'cards';
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState('All');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMarkets, setUserMarkets] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const marketDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch favorited properties and user markets from database
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch both favorites and user markets in parallel
        const [favoritesResponse, marketsResponse] = await Promise.all([
          fetch('/api/favorites'),
          fetch(`/api/v2/user-markets?userId=${user.id}`)
        ]);

        if (!favoritesResponse.ok) {
          throw new Error('Failed to fetch favorites');
        }

        const favoritesData = await favoritesResponse.json();
        
        // Transform the data to match the expected format
        const transformedProperties = favoritesData.favorites.map((favorite: any) => {
          const propertyData = favorite.property_data;
          if (!propertyData) {
            console.warn('No property data found for favorite:', favorite);
            return null;
          }
          
          return {
            id: propertyData.property_id || favorite.property_id,
            address: propertyData.address_street || propertyData.address_full || 'Unknown Address',
            city: propertyData.address_city || 'Unknown City',
            state: propertyData.address_state || 'Unknown State',
            zip: propertyData.address_zip || 'Unknown Zip',
            latitude: propertyData.latitude,
            longitude: propertyData.longitude,
            units: propertyData.units_count || 1,
            built: propertyData.year_built || 1950,
            assessed: propertyData.assessed_value ? `$${parseInt(propertyData.assessed_value).toLocaleString()}` : 'Unknown',
            estimated: propertyData.estimated_value ? `$${parseInt(propertyData.estimated_value).toLocaleString()}` : 'Unknown',
            estEquity: propertyData.estimated_equity ? `$${parseInt(propertyData.estimated_equity).toLocaleString()}` : 'Unknown',
            market: favorite.market_name || propertyData.address_city || 'Unknown Market',
            pipelineStatus: favorite.status || 'Reviewing',
            source: favorite.recommendation_type === 'algorithm' ? 'A' : 'M', // A = Auto (algorithm), M = Manual
            isFavorited: true,
            isSkipTraced: favorite.is_skip_traced || false,
            hasPricingScenario: favorite.has_pricing_scenario || false,
            notes: favorite.notes || '',
            createdAt: favorite.created_at
          };
        }).filter(Boolean); // Remove any null entries

        setSavedProperties(transformedProperties);

        // Fetch user markets
        if (marketsResponse.ok) {
          const marketsData = await marketsResponse.json();
          setUserMarkets(marketsData.markets || []);
        } else {
          console.warn('Failed to fetch user markets, using fallback');
          setUserMarkets([]);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load saved properties');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  // Get unique values for filters - sort statuses in logical pipeline order
  const statusOrder = ['Reviewing', 'Communicating', 'Engaged', 'Analyzing', 'LOI Sent', 'Acquired', 'Rejected'];
  const uniqueStatuses = statusOrder.filter(status => 
    savedProperties.some(p => p.pipelineStatus === status)
  );
  // Use user markets from database, limited to 5 markets
  const uniqueMarkets = userMarkets.slice(0, 5).map(market => market.name);
  // Also create validMarkets list for property card dropdowns from user markets
  const validMarkets = userMarkets.slice(0, 5).map(market => market.name);
  const uniqueSources = ['All', 'Algorithm', 'Manual'];

  // Filter properties based on selections
  const filteredProperties = savedProperties.filter(property => {
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(property.pipelineStatus);
    const matchesMarket = selectedMarkets.length === 0 || selectedMarkets.includes(property.market);
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

  const handleStatusUpdate = (propertyId: string, newStatus: string) => {
    setSavedProperties(prev => 
      prev.map(property => 
        property.id.toString() === propertyId 
          ? { ...property, pipelineStatus: newStatus }
          : property
      )
    );
  };

  const handleMarketUpdate = (propertyId: string, newMarket: string) => {
    setSavedProperties(prev => 
      prev.map(property => 
        property.id.toString() === propertyId 
          ? { ...property, market: newMarket }
          : property
      )
    );
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
      
      // Close filter dropdowns when clicking outside
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(event.target as Node)) {
        setShowMarketDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="px-4 sm:px-6 lg:px-8">
        
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
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px] text-left"
                >
                  Status ({selectedStatuses.length} selected)
                </button>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                
                {showStatusDropdown && (
                  <div 
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Status Options</span>
                        <button
                          onClick={() => {
                            if (selectedStatuses.length === uniqueStatuses.length) {
                              setSelectedStatuses([]);
                            } else {
                              setSelectedStatuses([...uniqueStatuses]);
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          {selectedStatuses.length === uniqueStatuses.length ? 'Clear All' : 'Select All'}
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {uniqueStatuses.map(status => (
                          <label key={status} className="flex items-center space-x-2 py-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStatuses.includes(status)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStatuses(prev => [...prev, status]);
                                } else {
                                  setSelectedStatuses(prev => prev.filter(s => s !== status));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 text-xs"
                            />
                            <span className="text-sm">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Market Options</span>
                        <button
                          onClick={() => {
                            if (selectedMarkets.length === uniqueMarkets.length) {
                              setSelectedMarkets([]);
                            } else {
                              setSelectedMarkets([...uniqueMarkets]);
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          {selectedMarkets.length === uniqueMarkets.length ? 'Clear All' : 'Select All'}
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {uniqueMarkets.map(market => (
                          <label key={market} className="flex items-center space-x-2 py-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedMarkets.includes(market)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMarkets(prev => [...prev, market]);
                                } else {
                                  setSelectedMarkets(prev => prev.filter(m => m !== market));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 text-xs"
                            />
                            <span className="text-sm">{market}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
              
              {/* Clear Filters Button */}
              {(selectedStatuses.length > 0 || selectedMarkets.length > 0) && (
                <button
                  onClick={() => {
                    setSelectedStatuses([]);
                    setSelectedMarkets([]);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear Filters
                </button>
              )}
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your saved properties...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Properties</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {savedProperties.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Properties</h3>
                  <p className="text-gray-600 mb-4">You haven't saved any properties yet. Start by discovering properties and saving your favorites.</p>
                  <a 
                    href="/v2/discover" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Discover Properties
                  </a>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Match Your Filters</h3>
                  <p className="text-gray-600 mb-4">You have {savedProperties.length} saved properties, but none match your current filter criteria.</p>
                  <button 
                    onClick={() => {
                      setSelectedStatuses([]);
                      setSelectedMarkets([]);
                      setSelectedSource('All');
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Clear All Filters
                  </button>
                </>
              )}
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSelected={selectedProperties.includes(property.id)}
                onToggleSelect={() => togglePropertySelection(property.id)}
                validMarkets={validMarkets}
                onStatusUpdate={handleStatusUpdate}
                onMarketUpdate={handleMarketUpdate}
                currentViewMode={viewMode}
              />
            ))}
          </div>
        ) : null}

        {!isLoading && !error && viewMode === 'map' && (
          <div className="flex gap-6 h-[600px]">
            {/* Left: Map */}
            <div className="w-2/5">
              <PropertyMap
                properties={filteredProperties}
                className="h-full rounded-lg border border-gray-200"
                context="engage"
                currentViewMode={viewMode}
              />
            </div>
            
            {/* Right: Properties in 2-column grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSelected={selectedProperties.includes(property.id)}
                    onToggleSelect={() => togglePropertySelection(property.id)}
                    validMarkets={validMarkets}
                    onStatusUpdate={handleStatusUpdate}
                    onMarketUpdate={handleMarketUpdate}
                    currentViewMode={viewMode}
                  />
                ))}
              </div>
              
              {filteredProperties.length === 0 && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Found</h3>
                    <p className="text-gray-600">No properties match your current filters.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!isLoading && !error && viewMode === 'analysis' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics View</h3>
            <p className="text-gray-600">Performance metrics and analysis for your {filteredProperties.length} properties</p>
          </div>
        )}

        {!isLoading && !error && viewMode === 'matrix' && (
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
  validMarkets,
  onStatusUpdate,
  onMarketUpdate,
  currentViewMode
}: { 
  property: any; 
  isSelected: boolean; 
  onToggleSelect: () => void;
  validMarkets: string[];
  onStatusUpdate?: (propertyId: string, newStatus: string) => void;
  onMarketUpdate?: (propertyId: string, newMarket: string) => void;
  currentViewMode?: string;
}) {
  const [pipelineStatus, setPipelineStatus] = useState(property.pipelineStatus);
  const [market, setMarket] = useState(property.market);
  const [notes, setNotes] = useState(property.notes || '');

  const updateFavoriteStatus = async (newStatus: string) => {
    try {
      const response = await fetch('/api/favorites/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: property.id,
          favorite_status: newStatus
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update favorite status');
      } else {
        // Update parent component's state
        if (onStatusUpdate) {
          onStatusUpdate(property.id, newStatus);
        }
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const updateFavoriteMarket = async (newMarket: string) => {
    try {
      const response = await fetch('/api/favorites/update-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: property.id,
          market: newMarket
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update favorite market');
      }
    } catch (error) {
      console.error('Error updating favorite market:', error);
    }
  };

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

  const getStreetViewImage = () => {
    const address = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
    return `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  };

  const handleZillowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const zillowUrl = `https://www.zillow.com/homes/${property.address.replace(/\s+/g, '-')}-${property.city}-${property.state}-${property.zip}_rb/`;
    window.open(zillowUrl, '_blank');
  };

  const handleImageClick = () => {
    const address = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Property Image */}
      <div className="relative aspect-[4/3] bg-gray-200 cursor-pointer" onClick={handleImageClick}>
        <img 
          src={getStreetViewImage()}
          alt={`Street view of ${property.address}`}
          className="w-full h-full object-cover hover:opacity-95 transition-opacity"
          onError={(e) => {
            // Fallback to placeholder if Street View fails
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        {/* Fallback placeholder */}
        <div className="hidden absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-400/30 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-gray-400 rounded"></div>
            </div>
            <div className="text-sm font-medium">Property Photo</div>
          </div>
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

        {/* Zillow Icon */}
        <button 
          onClick={handleZillowClick}
          className="absolute bottom-3 right-3 bg-white/95 hover:bg-white rounded-lg p-2 shadow-sm transition-colors group"
          title="View on Zillow"
        >
          <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 12h3v8h4v-6h6v6h4v-8h3L12 2z"/>
          </svg>
        </button>
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
              onChange={(e) => {
                const newMarket = e.target.value;
                setMarket(newMarket);
                updateFavoriteMarket(newMarket);
                // Update parent component state immediately
                if (onMarketUpdate) {
                  onMarketUpdate(property.id.toString(), newMarket);
                }
              }}
              className="text-xs px-2 py-1 rounded-full font-medium border-0 focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-700"
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
              onChange={(e) => {
                const newStatus = e.target.value;
                setPipelineStatus(newStatus);
                updateFavoriteStatus(newStatus);
              }}
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
            {property.estimated}
          </div>
          <div className="text-sm text-gray-600">
            Assessed: <span className="font-medium text-blue-600">{property.assessed}</span>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-3">
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
            {property.hasPricingScenario ? 'Modify Offer' : 'Create Offer'}
          </button>
          
          <button 
            onClick={() => {
              const baseUrl = new URL('/v2/engage', window.location.origin);
              if (currentViewMode && currentViewMode !== 'cards') {
                baseUrl.searchParams.set('viewMode', currentViewMode);
              }
              const backUrl = encodeURIComponent(baseUrl.toString());
              window.location.href = `/v2/discover/property/${property.id}?context=engage&back=${backUrl}`;
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}