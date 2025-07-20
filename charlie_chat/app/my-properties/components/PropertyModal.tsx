import React, { useState } from 'react';
import { X, Heart, CheckSquare, Square } from 'lucide-react';
import { CoreSavedProperty as SavedProperty } from '../types';

interface PropertyModalProps {
  isOpen: boolean;
  property: SavedProperty | null;
  selectedProperties: Set<string>;
  onClose: () => void;
  onToggleSelection: (propertyId: string) => void;
  onRemoveFromFavorites: (propertyId: string) => void;
  onUpdateNotes?: (propertyId: string, notes: string) => void;
  onSkipTrace?: (propertyId: string, property: SavedProperty) => void;
  hideActions?: boolean; // Add this prop to hide action buttons
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
  hideActions = false // Default to false to preserve existing behavior
}) => {
  
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [notesModalOpen, setNotesModalOpen] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<{ [key: string]: string }>({});
  const [selectedAction, setSelectedAction] = useState<{ [key: string]: 'select' | 'skiptrace' | null }>({});

  // DEBUG: Add this console log to verify the prop is being received
  console.log('PropertyModal hideActions prop:', hideActions);

  if (!isOpen || !property) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // All the helper functions from PropertyCardsView
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

  const handleCardFlip = (propertyId: string, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }

    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  };

  const getInvestmentFlags = (property: SavedProperty) => {
    const flags = [];
    if (property.auction) flags.push('Auction');
    if (property.reo) flags.push('REO');
    if (property.tax_lien) flags.push('Tax Lien');
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

  // Extract the exact card layout
  const isFlipped = flippedCards.has(property.property_id);
  const investmentFlags = getInvestmentFlags(property);

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

        {/* Modal Content - EXACT CARD LAYOUT */}
        <div className="p-4 overflow-y-auto">
          
          {/* Single Property Card - Exact same structure as PropertyCardsView */}
          <div
            className={`relative bg-white rounded-lg border shadow-sm cursor-pointer ${selectedProperties.has(property.property_id)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: 'transform 0.6s',
              minHeight: '160px'
            }}
            onClick={(e) => handleCardFlip(property.property_id, e)}
          >
            {/* FRONT SIDE */}
            <div
              className="p-3"
              style={{
                backfaceVisibility: 'hidden',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 2
              }}
            >
              <div className="flex gap-3">
                {/* Left side - Property details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {property.address_full}, {property.address_city}, {property.address_state}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromFavorites(property.property_id);
                        onClose(); // Close modal after removing
                      }}
                      className="ml-2 p-1 flex-shrink-0"
                      title="Remove from favorites"
                    >
                      <Heart size={14} className="text-red-500 fill-current" />
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 mb-3">
                    <div className="flex">
                      <span>Units:&nbsp;</span>
                      <span className="font-medium">{property.units_count}</span>
                    </div>
                    <div className="flex">
                      <span>Built:&nbsp;</span>
                      <span className="font-medium">{property.year_built} ({calculateAge(property.year_built)} years old)</span>
                    </div>
                    <div className="flex">
                      <span>Assessed:&nbsp;</span>
                      <span className="font-medium text-green-600">{formatCurrency(property.assessed_value)}</span>
                    </div>
                    <div className="flex">
                      <span>Est. Equity:&nbsp;</span>
                      <span className="font-medium text-blue-600">{formatCurrency(property.estimated_equity)}</span>
                    </div>
                  </div>

                  {investmentFlags.length > 0 && (
                    <div className="mb-2">
                      <div className="flex flex-wrap gap-1">
                        {investmentFlags.map(flag => (
                          <span
                            key={flag}
                            className="inline-block px-1 py-0.5 text-xs rounded bg-orange-100 text-orange-800"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hideActions && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionChange(property.property_id, 'select');
                        }}
                        className="flex items-center space-x-1"
                        title="Select"
                      >
                        {selectedAction[property.property_id] === 'select' ?
                          <CheckSquare size={14} className="text-blue-600" /> :
                          <Square size={14} className="text-gray-400" />
                        }
                        <span className="text-xs text-gray-600">Select</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right side - Notes */}
                <div className="w-32 flex-shrink-0">
                  <div className="bg-gray-50 rounded border p-2 h-[120px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">Notes</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotesModalOpen(property.property_id);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="Open notes editor"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" />
                        </svg>
                      </button>
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotesModalOpen(property.property_id);
                      }}
                      className="text-xs text-gray-600 cursor-pointer h-20 overflow-hidden"
                    >
                      {getCurrentNotes(property) ? (
                        <span>{truncateNotes(getCurrentNotes(property))}</span>
                      ) : (
                        <span className="text-gray-400 italic">Click to add notes...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BACK SIDE */}
            <div
              className="p-3"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1
              }}
            >
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-800 mb-1">Current Ownership</h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                  <div className="flex">
                    <span>Last Sale:&nbsp;</span>
                    <span className="font-medium">{formatDate(property.last_sale_date)}</span>
                  </div>
                  <div className="flex">
                    <span>Years Owned:&nbsp;</span>
                    <span className="font-medium">{property.years_owned}</span>
                  </div>
                  <div className="flex">
                    <span>Out-of-State Owner:&nbsp;</span>
                    <span className="font-medium">{property.out_of_state_absentee_owner ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex">
                    <span>Last Sale Amount:&nbsp;</span>
                    <span className="font-medium">{formatCurrency(property.assessed_value)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-800 mb-1">Property Flags</h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                  <div className="flex">
                    <span>Assumable:&nbsp;</span>
                    <span className="font-medium">No</span>
                  </div>
                  <div className="flex">
                    <span>REO:&nbsp;</span>
                    <span className="font-medium">{property.reo ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex">
                    <span>Auction:&nbsp;</span>
                    <span className="font-medium">{property.auction ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex">
                    <span>Tax Lien:&nbsp;</span>
                    <span className="font-medium">{property.tax_lien ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex">
                    <span>Pre-Foreclosure:&nbsp;</span>
                    <span className="font-medium">{property.pre_foreclosure ? 'Yes' : 'No'}</span>
                  </div>
                  {!hideActions && (
                    <div className="flex items-center">
                      <span>Skip Trace:&nbsp;</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionChange(property.property_id, 'skiptrace');
                        }}
                        className="ml-1"
                        title="Skip Trace"
                      >
                        {selectedAction[property.property_id] === 'skiptrace' ?
                          <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-blue-600"></div> :
                          <div className="w-3 h-3 rounded-full border-2 border-gray-400"></div>
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">Saved: {formatDate(property.saved_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Property ID Footer */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Property ID: {property.property_id}
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