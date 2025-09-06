'use client';

import { useState } from 'react';
import { Search, MapPin, SlidersHorizontal, ChevronDown, ChevronUp, X, Heart, Bookmark } from 'lucide-react';

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [propertyCount, setPropertyCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchDescription, setSaveSearchDescription] = useState('');
  
  // Collapsible section states
  const [collapsedSections, setCollapsedSections] = useState({
    units: false,
    owner: false,
    sale: true,
    physical: true,
    financial: true,
    distress: true
  });

  const handleSearch = () => {
    // Simulate API call - in real app this would call your backend
    const mockPropertyCount = Math.floor(Math.random() * 150) + 5; // 5-154 properties
    setPropertyCount(mockPropertyCount);
    setHasSearched(true);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  // Check if any filters have been modified (not default values)
  const hasFiltersSet = () => {
    // In a real implementation, this would check actual filter state
    // For now, return true if search query is set or has searched
    return searchQuery.trim() !== '' || hasSearched;
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return;
    
    // TODO: This would call API to save search criteria
    const searchCriteria = {
      location: searchQuery,
      // Add all other filter values here
      // minUnits, maxUnits, etc.
    };
    
    console.log('Saving search:', { name: saveSearchName, description: saveSearchDescription, criteria: searchCriteria });
    
    // Reset modal
    setShowSaveModal(false);
    setSaveSearchName('');
    setSaveSearchDescription('');
    
    // Show success message (TODO: implement proper feedback)
    alert('Search saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Search Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          {/* Add left margin on mobile to avoid hamburger menu overlap */}
          <div className="max-w-2xl mx-auto ml-16 lg:ml-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Enter city, zip code, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-16 lg:pr-32 py-3 text-base lg:text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-2 lg:px-6 py-2 rounded-md font-medium transition-colors duration-200 flex items-center">
                <Search className="h-4 w-4" />
                <span className="hidden lg:inline ml-2">Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Carvana Layout: Sidebar + Results */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          
          {/* Left Sidebar - Filters (Carvana Style) */}
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              
              {/* Number of Units */}
              <CollapsibleFilterSection 
                title="NUMBER OF UNITS" 
                isCollapsed={collapsedSections.units}
                onToggle={() => toggleSection('units')}
              >
                <div className="flex space-x-2">
                  <input 
                    type="number" 
                    placeholder="Min"
                    className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="flex items-center text-gray-500">—</span>
                  <input 
                    type="number" 
                    placeholder="Max"
                    className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </CollapsibleFilterSection>

              {/* Owner Information */}
              <CollapsibleFilterSection 
                title="OWNER INFORMATION" 
                isCollapsed={collapsedSections.owner}
                onToggle={() => toggleSection('owner')}
              >
                <FilterGroup label="Owner Location">
                  <ToggleButton active={true} label="Any" color="blue" />
                  <ToggleButton active={false} label="In State" />
                  <ToggleButton active={false} label="Out of State" />
                </FilterGroup>
                
                <FilterGroup label="Corporate Owned">
                  <ToggleButton active={true} label="Any" color="blue" />
                  <ToggleButton active={false} label="Yes" />
                  <ToggleButton active={false} label="No" />
                </FilterGroup>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Years Owned
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="50"
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </CollapsibleFilterSection>

              {/* Sale History */}
              <CollapsibleFilterSection 
                title="SALE HISTORY" 
                isCollapsed={collapsedSections.sale}
                onToggle={() => toggleSection('sale')}
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Last Sale Price
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="5,000,000"
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <FilterGroup label="Active MLS">
                  <ToggleButton active={true} label="Any" color="blue" />
                  <ToggleButton active={false} label="Yes" />
                  <ToggleButton active={false} label="No" />
                </FilterGroup>
                
                <FilterGroup label="Last Sale Arms Length">
                  <ToggleButton active={true} label="Any" color="blue" />
                  <ToggleButton active={false} label="Yes" />
                  <ToggleButton active={false} label="No" />
                </FilterGroup>
              </CollapsibleFilterSection>

              {/* Physical Characteristics */}
              <CollapsibleFilterSection 
                title="PHYSICAL CHARACTERISTICS" 
                isCollapsed={collapsedSections.physical}
                onToggle={() => toggleSection('physical')}
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Year Built
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="1800"
                      className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="2025"
                      className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <FilterGroup label="Flood Zone">
                  <ToggleButton active={true} label="Any" color="blue" />
                  <ToggleButton active={false} label="Yes" />
                  <ToggleButton active={false} label="No" />
                </FilterGroup>
              </CollapsibleFilterSection>

              {/* Financial Information */}
              <CollapsibleFilterSection 
                title="FINANCIAL INFORMATION" 
                isCollapsed={collapsedSections.financial}
                onToggle={() => toggleSection('financial')}
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Assessed Value
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="5,000,000"
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Estimated Value
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="5,000,000"
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </CollapsibleFilterSection>

              {/* Distress & Special Conditions */}
              <CollapsibleFilterSection 
                title="DISTRESS & SPECIAL CONDITIONS" 
                isCollapsed={collapsedSections.distress}
                onToggle={() => toggleSection('distress')}
              >
                <FilterGroup label="Assumable">
                  <ToggleButton active={true} label="Any" color="blue" />
                  <ToggleButton active={false} label="Yes" />
                  <ToggleButton active={false} label="No" />
                </FilterGroup>
                
                <FilterGroup label="REO">
                  <ToggleButton active={true} label="Any" color="blue" />
                  <ToggleButton active={false} label="Yes" />
                  <ToggleButton active={false} label="No" />
                </FilterGroup>
                
                <FilterGroup label="Pre-Foreclosure">
                  <ToggleButton active={true} label="Any" color="blue" />
                  <ToggleButton active={false} label="Yes" />
                  <ToggleButton active={false} label="No" />
                </FilterGroup>
              </CollapsibleFilterSection>

              {/* Search Button */}
              <div className="pt-6 border-t border-gray-200 space-y-3">
                <button 
                  onClick={handleSearch}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Properties
                </button>
                
                {/* Save Search Button - Only show when filters are set */}
                {hasFiltersSet() && (
                  <button 
                    onClick={() => setShowSaveModal(true)}
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save This Search
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Right Side - Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 space-y-4 lg:space-y-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
                <p className="text-sm text-gray-600 mt-1">Search to see available multifamily investments</p>
              </div>
              <div className="flex items-center space-x-4 flex-shrink-0">
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {hasSearched ? `${propertyCount} properties` : '0 properties'}
                </span>
                <select className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white min-w-0">
                  <option>Sort by Recommended</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Year Built: Newest</option>
                  <option>Year Built: Oldest</option>
                </select>
              </div>
            </div>

            {/* Results or Empty State */}
            {hasSearched ? (
              <div>
                {/* Property Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: Math.min(propertyCount, 12) }).map((_, i) => (
                    <PropertyCard key={i} />
                  ))}
                </div>
                
                {propertyCount > 12 && (
                  <div className="text-center py-8">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                      Load More Properties ({propertyCount - 12} remaining)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start Your Property Search</h3>
                <p className="text-gray-600 mb-6">
                  Enter a location above and use the filters to find multifamily investment opportunities.
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
                  <span className="bg-gray-100 px-3 py-1 rounded-full">Denver, CO</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-full">Austin, TX</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-full">Atlanta, GA</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-full">Phoenix, AZ</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Filters Button */}
      <div className="lg:hidden fixed bottom-4 right-4">
        <button 
          onClick={() => setShowMobileFilters(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMobileFilters(false)}
          />
          
          {/* Modal */}
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-lg max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <button 
                  onClick={() => setShowMobileFilters(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Number of Units */}
                <CollapsibleFilterSection 
                  title="NUMBER OF UNITS" 
                  isCollapsed={collapsedSections.units}
                  onToggle={() => toggleSection('units')}
                >
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </CollapsibleFilterSection>

                {/* Owner Information */}
                <CollapsibleFilterSection 
                  title="OWNER INFORMATION" 
                  isCollapsed={collapsedSections.owner}
                  onToggle={() => toggleSection('owner')}
                >
                  <FilterGroup label="Owner Location">
                    <ToggleButton active={true} label="Any" color="blue" />
                    <ToggleButton active={false} label="In State" />
                    <ToggleButton active={false} label="Out of State" />
                  </FilterGroup>
                  
                  <FilterGroup label="Corporate Owned">
                    <ToggleButton active={true} label="Any" color="blue" />
                    <ToggleButton active={false} label="Yes" />
                    <ToggleButton active={false} label="No" />
                  </FilterGroup>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Years Owned
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="50"
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </CollapsibleFilterSection>

                {/* Sale History */}
                <CollapsibleFilterSection 
                  title="SALE HISTORY" 
                  isCollapsed={collapsedSections.sale}
                  onToggle={() => toggleSection('sale')}
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Last Sale Price
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="5,000,000"
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <FilterGroup label="Active MLS">
                    <ToggleButton active={true} label="Any" color="blue" />
                    <ToggleButton active={false} label="Yes" />
                    <ToggleButton active={false} label="No" />
                  </FilterGroup>
                  
                  <FilterGroup label="Last Sale Arms Length">
                    <ToggleButton active={true} label="Any" color="blue" />
                    <ToggleButton active={false} label="Yes" />
                    <ToggleButton active={false} label="No" />
                  </FilterGroup>
                </CollapsibleFilterSection>

                {/* Physical Characteristics */}
                <CollapsibleFilterSection 
                  title="PHYSICAL CHARACTERISTICS" 
                  isCollapsed={collapsedSections.physical}
                  onToggle={() => toggleSection('physical')}
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Year Built
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="1800"
                        className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="2025"
                        className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <FilterGroup label="Flood Zone">
                    <ToggleButton active={true} label="Any" color="blue" />
                    <ToggleButton active={false} label="Yes" />
                    <ToggleButton active={false} label="No" />
                  </FilterGroup>
                </CollapsibleFilterSection>

                {/* Financial Information */}
                <CollapsibleFilterSection 
                  title="FINANCIAL INFORMATION" 
                  isCollapsed={collapsedSections.financial}
                  onToggle={() => toggleSection('financial')}
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Assessed Value
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="5,000,000"
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Estimated Value
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="5,000,000"
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </CollapsibleFilterSection>

                {/* Distress & Special Conditions */}
                <CollapsibleFilterSection 
                  title="DISTRESS & SPECIAL CONDITIONS" 
                  isCollapsed={collapsedSections.distress}
                  onToggle={() => toggleSection('distress')}
                >
                  <FilterGroup label="Assumable">
                    <ToggleButton active={true} label="Any" color="blue" />
                    <ToggleButton active={false} label="Yes" />
                    <ToggleButton active={false} label="No" />
                  </FilterGroup>
                  
                  <FilterGroup label="REO">
                    <ToggleButton active={true} label="Any" color="blue" />
                    <ToggleButton active={false} label="Yes" />
                    <ToggleButton active={false} label="No" />
                  </FilterGroup>
                  
                  <FilterGroup label="Pre-Foreclosure">
                    <ToggleButton active={true} label="Any" color="blue" />
                    <ToggleButton active={false} label="Yes" />
                    <ToggleButton active={false} label="No" />
                  </FilterGroup>
                </CollapsibleFilterSection>
              </div>

              {/* Search Button */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <button 
                  onClick={() => {
                    handleSearch();
                    setShowMobileFilters(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Properties
                </button>
                
                {/* Save Search Button - Only show when filters are set */}
                {hasFiltersSet() && (
                  <button 
                    onClick={() => {
                      setShowSaveModal(true);
                      setShowMobileFilters(false);
                    }}
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save This Search
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Save Search</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Save your current search criteria so you can easily find similar properties later.
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveSearch(); }} className="space-y-4">
              <div>
                <label htmlFor="searchName" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Name *
                </label>
                <input
                  id="searchName"
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="e.g., Denver Multi-Family Properties"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label htmlFor="searchDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="searchDescription"
                  value={saveSearchDescription}
                  onChange={(e) => setSaveSearchDescription(e.target.value)}
                  placeholder="Brief description of this search..."
                  rows={3}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Save Search
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

function CollapsibleFilterSection({ 
  title, 
  children, 
  isCollapsed, 
  onToggle 
}: { 
  title: string; 
  children: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-200 pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-xs font-medium text-gray-900 uppercase tracking-wide">{title}</h3>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        )}
      </button>
      
      {!isCollapsed && (
        <div className="space-y-4 mt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">{label}</label>
      <div className="flex space-x-1">
        {children}
      </div>
    </div>
  );
}

function ToggleButton({ 
  active, 
  label, 
  color = 'gray' 
}: { 
  active: boolean; 
  label: string; 
  color?: 'blue' | 'gray'; 
}) {
  const baseClasses = "px-3 py-1 text-sm font-medium rounded transition-colors";
  const activeClasses = color === 'blue' 
    ? "bg-blue-500 text-white" 
    : "bg-gray-600 text-white";
  const inactiveClasses = "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50";
  
  return (
    <button className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}>
      {label}
    </button>
  );
}

function PropertyCard() {
  const sampleProperties = [
    { 
      address: "3843 Payne Ave", 
      city: "Cleveland", 
      state: "OH", 
      zip: "44114",
      units: 43, 
      built: 1997,
      assessed: "$843,540", 
      estEquity: "$836,332",
      absenteeOwner: true,
      priceTag: null
    },
    { 
      address: "1567 Elm Street", 
      city: "Denver", 
      state: "CO", 
      zip: "80202",
      units: 24, 
      built: 2001,
      assessed: "$2,150,000", 
      estEquity: "$1,890,000",
      absenteeOwner: false,
      priceTag: "Price Drop"
    },
    { 
      address: "892 Oak Avenue", 
      city: "Austin", 
      state: "TX", 
      zip: "78701",
      units: 18, 
      built: 1995,
      assessed: "$1,650,000", 
      estEquity: "$1,420,000",
      absenteeOwner: true,
      priceTag: null
    },
    { 
      address: "4521 Cedar Lane", 
      city: "Phoenix", 
      state: "AZ", 
      zip: "85001",
      units: 36, 
      built: 1988,
      assessed: "$3,200,000", 
      estEquity: "$2,850,000",
      absenteeOwner: true,
      priceTag: "Price Drop"
    },
  ];
  
  const property = sampleProperties[Math.floor(Math.random() * sampleProperties.length)];
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer">
      {/* Property Image */}
      <div className="relative">
        <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-400/30 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-gray-400 rounded"></div>
            </div>
            <div className="text-sm font-medium">Property Photo</div>
          </div>
        </div>
        
        {/* Heart Favorite Button */}
        <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors">
          <Heart className="h-4 w-4 text-gray-600 hover:text-red-500" />
        </button>
        
        {/* Price Tag */}
        {property.priceTag && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
              {property.priceTag}
            </span>
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Address */}
        <h3 className="font-semibold text-gray-900 mb-1 truncate">
          {property.address}
        </h3>
        
        {/* Location and Basic Info */}
        <p className="text-sm text-gray-600 mb-3">
          {property.city}, {property.state} • {property.units} Units • Built {property.built}
        </p>

        {/* Price */}
        <div className="mb-3">
          <div className="text-xl font-bold text-gray-900">
            {property.assessed}
          </div>
          <div className="text-sm text-gray-600">
            Est. Equity: <span className="font-medium text-green-600">{property.estEquity}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {property.absenteeOwner && (
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
              Absentee Owner
            </span>
          )}
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            {property.units} Units
          </span>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-xs text-gray-500">Select</span>
          </div>
          <button 
            onClick={() => window.location.href = `/discover/property/${Math.floor(Math.random() * 1000)}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}