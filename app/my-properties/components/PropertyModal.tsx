import React, { useState } from 'react';
import { X, Heart, CheckSquare, Square } from 'lucide-react';
import { PageSavedProperty as SavedProperty } from '../types';

interface PropertyModalProps {
  isOpen: boolean;
  property: SavedProperty | null;
  selectedProperties: Set<string>;
  onClose: () => void;
  onToggleSelection: (propertyId: string) => void;
  onRemoveFromFavorites: (propertyId: string) => void;
  onUpdateNotes?: (propertyId: string, notes: string) => void;
  onSkipTrace?: (propertyId: string, property: SavedProperty) => void;
  hideActions?: boolean;
}

export const PropertyModal: React.FC<PropertyModalProps> = ({
  isOpen,
  property,
  selectedProperties,
  onClose,
  onToggleSelection,
  onRemoveFromFavorites,
  onUpdateNotes,
  onSkipTrace,
  hideActions = false
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<{ [key: string]: string }>({});
  const [selectedAction, setSelectedAction] = useState<{ [key: string]: 'select' | 'skiptrace' | null }>({});

  if (!isOpen || !property) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const calculateAge = (yearBuilt: number) => {
    return new Date().getFullYear() - yearBuilt;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleCardFlip = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    setIsFlipped(prev => !prev);
  };

  const getInvestmentFlags = (property: SavedProperty) => {
    const flags = [];
    if (property.auction) flags.push('Auction');
    if (property.reo) flags.push('REO');
    if (property.pre_foreclosure) flags.push('Pre-Foreclosure');
    if (property.private_lender) flags.push('Private Lender');
    if (property.out_of_state_absentee_owner) flags.push('Absentee Owner');
    return flags;
  };

  const handleNotesChange = (propertyId: string, notes: string) => {
    setLocalNotes(prev => ({ ...prev, [propertyId]: notes }));
  };

  const saveNotes = (propertyId: string) => {
    const notes = getCurrentNotes({ property_id: propertyId } as SavedProperty);
    if (onUpdateNotes) {
      onUpdateNotes(propertyId, notes);
    }
    setNotesModalOpen(null);
  };

  const getCurrentNotes = (property: SavedProperty) => {
    return localNotes[property.property_id] !== undefined
      ? localNotes[property.property_id]
      : property.notes || '';
  };

  const truncateNotes = (notes: string, maxLength: number = 40) => {
    if (!notes) return '';
    return notes.length > maxLength ? notes.substring(0, maxLength) + '...' : notes;
  };

  const handleActionChange = (propertyId: string, action: 'select' | 'skiptrace') => {
    setSelectedAction(prev => ({
      ...prev,
      [propertyId]: prev[propertyId] === action ? null : action
    }));

    if (action === 'skiptrace') {
      if (onSkipTrace) {
        onSkipTrace(propertyId, property);
      }
    } else if (action === 'select') {
      onToggleSelection(propertyId);
    }
  };

  const investmentFlags = getInvestmentFlags(property);
  const hasSkipTrace = !!(property as any).skipTraceData;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Modal Content - Simple Map-Style Layout */}
        <div className="p-4 overflow-y-auto">
          <div className="bg-white">
            {/* Property Address with Google Maps Link */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {property.address_full}
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {property.address_city}, {property.address_state}
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address_full + ', ' + property.address_city + ', ' + property.address_state)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 no-underline"
                  title="View Property on Google Maps"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="mr-1">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  View Property
                </a>
              </div>
              
              {/* Remove from favorites */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromFavorites(property.property_id);
                  onClose();
                }}
                className="text-red-500 hover:text-red-700 text-lg leading-none"
                title="Remove from favorites"
              >
                ✕
              </button>
            </div>
            
            {/* Property Details */}
            <div className="space-y-1 text-xs text-gray-600 mb-3">
              <div>Units: <span className="font-medium">{property.units_count}</span></div>
              <div>Built: <span className="font-medium">{property.year_built} ({calculateAge(property.year_built)} years old)</span></div>
              <div>Assessed: <span className="font-medium text-green-600">{formatCurrency(property.assessed_value)}</span></div>
              <div>Est. Equity: <span className="font-medium text-blue-600">{formatCurrency(property.estimated_equity)}</span></div>
            </div>

            {/* Investment Flags */}
            {investmentFlags.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {investmentFlags.map(flag => (
                    <span
                      key={flag}
                      className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skip Trace Indicator */}
            <div className="pt-3 border-t border-gray-100">
              {hasSkipTrace ? (
                <span className="text-xs text-blue-600 font-medium">Skip Traced</span>
              ) : null}
            </div>

            {/* Action buttons */}
            {!hideActions && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelection(property.property_id);
                  }}
                  className="flex items-center space-x-1 text-xs text-gray-600 hover:text-blue-600"
                  title="Select for analysis"
                >
                  {selectedProperties.has(property.property_id) ? (
                    <CheckSquare size={16} className="text-blue-600" />
                  ) : (
                    <Square size={16} className="text-gray-400" />
                  )}
                  <span>{selectedProperties.has(property.property_id) ? 'Selected' : 'Select'}</span>
                </button>
                
                {onSkipTrace && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSkipTrace(property.property_id, property);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {hasSkipTrace ? 'Re-run Skip Trace' : 'Skip Trace'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      {notesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Property Notes</h3>
              <button
                onClick={() => setNotesModalOpen(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={getCurrentNotes(property)}
              onChange={(e) => handleNotesChange(notesModalOpen, e.target.value)}
              placeholder="Add your thoughts about this property..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setNotesModalOpen(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => saveNotes(notesModalOpen)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};