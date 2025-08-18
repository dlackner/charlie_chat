import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { FavoriteStatus, STATUS_OPTIONS } from '../constants';

interface StatusFilterProps {
  selectedStatuses: Set<FavoriteStatus | 'ALL' | 'NO_STATUS'>;
  onStatusChange: (statuses: Set<FavoriteStatus | 'ALL' | 'NO_STATUS'>) => void;
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatuses,
  onStatusChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
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

  // Close info modal when clicking outside
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showInfoModal) {
        setShowInfoModal(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showInfoModal]);

  const handleStatusToggle = (status: FavoriteStatus | 'ALL' | 'NO_STATUS') => {
    const newStatuses = new Set(selectedStatuses);
    
    if (status === 'ALL') {
      // If "All" is selected, clear everything and select "All"
      onStatusChange(new Set(['ALL']));
    } else {
      // Remove "ALL" if selecting a specific status
      newStatuses.delete('ALL');
      
      if (newStatuses.has(status)) {
        newStatuses.delete(status);
        // If no statuses selected, default to "All"
        if (newStatuses.size === 0) {
          newStatuses.add('ALL');
        }
      } else {
        newStatuses.add(status);
      }
      
      onStatusChange(newStatuses);
    }
  };

  const handleSelectAll = () => {
    const allStatuses = new Set<FavoriteStatus | 'ALL' | 'NO_STATUS'>(['ALL', ...STATUS_OPTIONS.map(option => option.value), 'NO_STATUS']);
    onStatusChange(allStatuses);
  };

  const handleClearAll = () => {
    onStatusChange(new Set(['ALL']));
  };

  const getDisplayText = () => {
    if (selectedStatuses.has('ALL') && selectedStatuses.size === 1) {
      return 'All Statuses';
    }
    
    const statusCount = Array.from(selectedStatuses).filter(s => s !== 'ALL').length;
    if (statusCount === 0) {
      return 'All Statuses';
    } else if (statusCount === 1) {
      const status = Array.from(selectedStatuses).find(s => s !== 'ALL') as FavoriteStatus | 'NO_STATUS';
      if (status === 'NO_STATUS') {
        return 'No Status';
      }
      const option = STATUS_OPTIONS.find(opt => opt.value === status);
      return option?.label || status;
    } else {
      return `${statusCount} Statuses`;
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfoModal(true);
  };

  // Funnel icon using CSS (parallel lines getting shorter)
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
        className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-gray-200"
      >
        <FunnelIcon />
        <span>{getDisplayText()}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-2">
            {/* Individual Status Options */}
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="relative flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedStatuses.has(option.value)}
                  onChange={() => handleStatusToggle(option.value)}
                  className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}

            {/* No Status Option */}
            <label
              key="NO_STATUS"
              className="relative flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedStatuses.has('NO_STATUS')}
                onChange={() => handleStatusToggle('NO_STATUS')}
                className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500 italic">No Status</span>
            </label>

            <div className="border-t border-gray-200 my-1"></div>

            {/* Select All / Clear All */}
            <div className="flex items-center justify-between px-4 py-2">
              <button
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>

            <div className="border-t border-gray-200 my-1"></div>

            {/* Info Button */}
            <div className="flex justify-center px-4 py-2">
              <button
                onClick={handleInfoClick}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
                title="View status descriptions"
              >
                <Info size={12} className="text-gray-400" />
                <span>What do these statuses mean?</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charlie Chat Info Modal */}
      {showInfoModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
          onClick={() => setShowInfoModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border-2 border-orange-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header with Charlie image */}
              <div className="flex items-center mb-4">
                <img
                  src="/charlie.png"
                  alt="Charlie"
                  className="w-10 h-10 rounded-full mr-3 shadow-md border-[0.5px] border-gray-300"
                />
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Property Status Guide
                  </h3>
                </div>
              </div>
              
              {/* Status Descriptions */}
              <div className="space-y-2 mb-4">
                <div className="text-gray-700 text-sm mb-4">
                  <p className="mb-2">
                    Hi there! Listen, if you want to close deals and build real wealth in real estate, you've GOT to stay organized. 
                    I've seen too many investors lose great opportunities because they couldn't keep track of where they stood with each property.
                  </p>
                  <p className="mb-3">
                    These status labels aren't just busy work - they're your roadmap to success. Use them to track every property from first look to closing day:
                  </p>
                </div>
                
                {STATUS_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 py-1">
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{option.label}</span>
                      <span className="text-gray-600"> - {option.description}</span>
                    </div>
                  </div>
                ))}
                
                {/* No Status explanation */}
                <div className="flex items-center space-x-3 py-1">
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">No Status</span>
                    <span className="text-gray-600"> - Properties that haven't been assigned a pursuit status yet. Get on them!</span>
                  </div>
                </div>
              </div>
              
              {/* Close Button */}
              <div className="flex justify-center">
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