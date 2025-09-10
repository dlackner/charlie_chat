import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Info, X } from 'lucide-react';
import { FavoriteStatus, STATUS_OPTIONS } from '../constants';

// Filter types
export type FilterCriteria = {
  statuses: Set<FavoriteStatus | 'NO_STATUS'>;
  markets: Set<string>;
  sources: Set<'manual' | 'algorithm'>;
  hasClusterFilter: boolean;
};

interface MultiCriteriaFilterProps {
  selectedCriteria: FilterCriteria;
  onFilterChange: (criteria: FilterCriteria) => void;
  onClearClusterFilter: () => void;
  userMarkets: Array<{ market_key: string; market_name: string }>;
}

type FilterTab = 'status' | 'market' | 'source';

export const MultiCriteriaFilter: React.FC<MultiCriteriaFilterProps> = ({
  selectedCriteria,
  onFilterChange,
  onClearClusterFilter,
  userMarkets
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('status');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close info modal when pressing escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showInfoModal) {
        setShowInfoModal(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showInfoModal]);

  const handleStatusToggle = (status: FavoriteStatus | 'NO_STATUS') => {
    const newStatuses = new Set(selectedCriteria.statuses);
    
    if (newStatuses.has(status)) {
      newStatuses.delete(status);
    } else {
      newStatuses.add(status);
    }
    
    onFilterChange({
      ...selectedCriteria,
      statuses: newStatuses
    });
  };

  const handleMarketToggle = (marketKey: string) => {
    const newMarkets = new Set(selectedCriteria.markets);
    
    if (newMarkets.has(marketKey)) {
      newMarkets.delete(marketKey);
    } else {
      newMarkets.add(marketKey);
    }
    
    onFilterChange({
      ...selectedCriteria,
      markets: newMarkets
    });
  };

  const handleSourceToggle = (source: 'manual' | 'algorithm') => {
    const newSources = new Set(selectedCriteria.sources);
    
    if (newSources.has(source)) {
      newSources.delete(source);
    } else {
      newSources.add(source);
    }
    
    onFilterChange({
      ...selectedCriteria,
      sources: newSources
    });
  };

  const handleSelectAllStatuses = () => {
    const allStatuses = new Set<FavoriteStatus | 'NO_STATUS'>([
      ...STATUS_OPTIONS.map(option => option.value),
      'NO_STATUS'
    ]);
    onFilterChange({
      ...selectedCriteria,
      statuses: allStatuses
    });
  };

  const handleClearAllStatuses = () => {
    onFilterChange({
      ...selectedCriteria,
      statuses: new Set()
    });
  };

  const handleSelectAllMarkets = () => {
    const allMarkets = new Set(userMarkets.map(market => market.market_key));
    onFilterChange({
      ...selectedCriteria,
      markets: allMarkets
    });
  };

  const handleClearAllMarkets = () => {
    onFilterChange({
      ...selectedCriteria,
      markets: new Set()
    });
  };

  const handleSelectAllSources = () => {
    onFilterChange({
      ...selectedCriteria,
      sources: new Set(['manual', 'algorithm'])
    });
  };

  const handleClearAllSources = () => {
    onFilterChange({
      ...selectedCriteria,
      sources: new Set()
    });
  };

  const handleResetAllFilters = () => {
    onFilterChange({
      statuses: new Set(),
      markets: new Set(),
      sources: new Set(),
      hasClusterFilter: false
    });
    onClearClusterFilter();
    setIsOpen(false);
  };

  const getActiveFilterCount = () => {
    const statusCount = selectedCriteria.statuses.size;
    const marketCount = selectedCriteria.markets.size;
    const sourceCount = selectedCriteria.sources.size;
    const clusterCount = selectedCriteria.hasClusterFilter ? 1 : 0;
    
    return statusCount + marketCount + sourceCount + clusterCount;
  };

  const getDisplayText = () => {
    const activeCount = getActiveFilterCount();
    
    if (activeCount === 0) {
      return 'All Properties';
    }
    
    const parts = [];
    
    if (selectedCriteria.statuses.size > 0) {
      if (selectedCriteria.statuses.size === 1) {
        const status = Array.from(selectedCriteria.statuses)[0];
        if (status === 'NO_STATUS') {
          parts.push('No Status');
        } else {
          const option = STATUS_OPTIONS.find(opt => opt.value === status);
          parts.push(option?.label || status);
        }
      } else {
        parts.push(`${selectedCriteria.statuses.size} Statuses`);
      }
    }
    
    if (selectedCriteria.markets.size > 0) {
      if (selectedCriteria.markets.size === 1) {
        const marketKey = Array.from(selectedCriteria.markets)[0];
        const market = userMarkets.find(m => m.market_key === marketKey);
        parts.push(market?.market_name || marketKey);
      } else {
        parts.push(`${selectedCriteria.markets.size} Markets`);
      }
    }
    
    if (selectedCriteria.sources.size > 0) {
      if (selectedCriteria.sources.size === 1) {
        const source = Array.from(selectedCriteria.sources)[0];
        parts.push(source === 'manual' ? 'Manual (M)' : 'Algorithmic (A)');
      } else {
        parts.push('Manual + Algorithmic');
      }
    }
    
    if (selectedCriteria.hasClusterFilter) {
      parts.push('Cluster');
    }
    
    return parts.join(', ');
  };

  // Funnel icon using CSS
  const FunnelIcon = () => (
    <div className="w-4 h-4 flex flex-col justify-center items-center space-y-0.5">
      <div className="w-3 h-0.5 bg-current"></div>
      <div className="w-2.5 h-0.5 bg-current"></div>
      <div className="w-2 h-0.5 bg-current"></div>
      <div className="w-1.5 h-0.5 bg-current"></div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 border ${
          getActiveFilterCount() > 0
            ? 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-gray-200'
        }`}
      >
        <FunnelIcon />
        <span>{getDisplayText()}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-[1010]">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('status')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'status'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Status
              {selectedCriteria.statuses.size > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 text-xs rounded-full px-2 py-0.5">
                  {selectedCriteria.statuses.size}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'market'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Market
              {selectedCriteria.markets.size > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 text-xs rounded-full px-2 py-0.5">
                  {selectedCriteria.markets.size}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('source')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'source'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Source
              {selectedCriteria.sources.size > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 text-xs rounded-full px-2 py-0.5">
                  {selectedCriteria.sources.size}
                </span>
              )}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Status Tab */}
            {activeTab === 'status' && (
              <div className="py-2">
                {STATUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="relative flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCriteria.statuses.has(option.value)}
                      onChange={() => handleStatusToggle(option.value)}
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}

                <label className="relative flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCriteria.statuses.has('NO_STATUS')}
                    onChange={() => handleStatusToggle('NO_STATUS')}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 italic">No Status</span>
                </label>

                <div className="border-t border-gray-200 my-1"></div>
                <div className="flex items-center justify-between px-4 py-2">
                  <button
                    onClick={handleSelectAllStatuses}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAllStatuses}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Market Tab */}
            {activeTab === 'market' && (
              <div className="py-2">
                {userMarkets.length > 0 ? (
                  userMarkets.map((market) => (
                    <label
                      key={market.market_key}
                      className="relative flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCriteria.markets.has(market.market_key)}
                        onChange={() => handleMarketToggle(market.market_key)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{market.market_name}</span>
                    </label>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 italic">
                    No markets configured yet
                  </div>
                )}

                {userMarkets.length > 0 && (
                  <>
                    <div className="border-t border-gray-200 my-1"></div>
                    <div className="flex items-center justify-between px-4 py-2">
                      <button
                        onClick={handleSelectAllMarkets}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleClearAllMarkets}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear All
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Source Tab */}
            {activeTab === 'source' && (
              <div className="py-2">
                <label className="relative flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCriteria.sources.has('manual')}
                    onChange={() => handleSourceToggle('manual')}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700">Manual</span>
                    <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-medium">M</span>
                  </div>
                </label>

                <label className="relative flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCriteria.sources.has('algorithm')}
                    onChange={() => handleSourceToggle('algorithm')}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700">Algorithmic</span>
                    <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-medium">A</span>
                  </div>
                </label>

                <div className="px-4 py-2">
                  <p className="text-xs text-gray-500">
                    Manual: Properties you added or favorited yourself
                  </p>
                  <p className="text-xs text-gray-500">
                    Algorithmic: Properties from weekly recommendations
                  </p>
                </div>

                <div className="border-t border-gray-200 my-1"></div>
                <div className="flex items-center justify-between px-4 py-2">
                  <button
                    onClick={handleSelectAllSources}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAllSources}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cluster Filter Indicator */}
          {selectedCriteria.hasClusterFilter && (
            <div className="border-t border-gray-200 px-4 py-2 bg-amber-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm text-amber-700 font-medium">Analytics Cluster Active</span>
                </div>
                <button
                  onClick={onClearClusterFilter}
                  className="text-amber-600 hover:text-amber-800 text-xs flex items-center space-x-1"
                >
                  <X size={12} />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
            <button
              onClick={() => setShowInfoModal(true)}
              className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Info size={12} />
              <span>Help</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetAllFilters}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm bg-blue-600 text-white hover:bg-blue-700 px-4 py-1 rounded transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showInfoModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1010]"
          onClick={() => setShowInfoModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border-2 border-orange-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <img
                  src="/charlie.png"
                  alt="Charlie"
                  className="w-10 h-10 rounded-full mr-3 shadow-md border-[0.5px] border-gray-300"
                />
                <h3 className="text-lg font-semibold text-gray-900">Property Filter Guide</h3>
              </div>
              
              <div className="space-y-4 text-sm text-gray-700">
                {/* Status Filters Section */}
                <div className="pb-2">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Status Filters</h4>
                  <p className="mb-2 text-gray-600">Track your pursuit progress for each property:</p>
                  <div className="space-y-1 text-xs ml-4">
                    {STATUS_OPTIONS.map((option) => (
                      <div key={option.value} className="flex">
                        <span className="font-medium w-24 flex-shrink-0">{option.label}:</span>
                        <span className="text-gray-600 flex-1">{option.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-gray-200" />

                {/* Market Filters Section */}
                <div className="pb-2">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Market Filters</h4>
                  <p className="text-gray-600 ml-4">Filter properties by their assigned market regions to focus on specific geographic areas.</p>
                </div>

                {/* Divider */}
                <hr className="border-gray-200" />

                {/* Source Filters Section */}
                <div className="pb-2">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Source Filters</h4>
                  <p className="mb-2 text-gray-600">Distinguish between properties you found manually vs. those recommended by the algorithm:</p>
                  <div className="space-y-1 text-xs ml-4">
                    <div><strong>Manual (M):</strong> Properties you researched and added yourself</div>
                    <div><strong>Algorithmic (A):</strong> Properties from weekly recommendation engine</div>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-gray-200" />

                {/* Analytics Clusters Section */}
                <div className="pb-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Analytics Clusters</h4>
                  <p className="text-gray-600 ml-4">When you select a cluster in the Deal Analytics section, it temporarily filters your view. Use "Reset All" to clear cluster filters and see all properties again.</p>
                </div>
              </div>
              
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-150"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};