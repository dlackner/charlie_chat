/*
 * CHARLIE2 V2 - Cash Flow Reports Modal
 * Modal for viewing and generating 10-year cash flow reports from saved offer scenarios
 * Features: List properties with pricing scenarios, generate reports, delete functionality
 * Part of the new V2 UI architecture
 */
'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Download, Trash2, AlertCircle } from 'lucide-react';

interface PropertyWithOffer {
  id: string;
  offer_name: string;
  offer_description: string | null;
  property_address: string;
  offer_amount: string;
  created_date: string;
  property_id: string;
  offer_data: any;
  property_details?: {
    address: string;
    city: string;
    state: string;
    units: string;
    assessed: string;
    built: string;
  };
}

interface CashFlowReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (propertyWithOffer: PropertyWithOffer) => void;
}

export const CashFlowReportsModal: React.FC<CashFlowReportsModalProps> = ({
  isOpen,
  onClose,
  onGenerate
}) => {
  const [propertiesWithOffers, setPropertiesWithOffers] = useState<PropertyWithOffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch properties with pricing scenarios when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPropertiesWithOffers();
    }
  }, [isOpen]);

  const fetchPropertiesWithOffers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/offer-scenarios?all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch properties with pricing scenarios');
      }

      const data = await response.json();
      
      // Transform the data to match our UI format
      const transformedData = data.scenarios.map((scenario: any) => ({
        id: scenario.id,
        offer_name: scenario.offer_name || `Offer ${scenario.id}`,
        offer_description: scenario.offer_description || 'No description',
        property_address: scenario.saved_properties?.address_full || 'Unknown Address',
        offer_amount: scenario.offer_data?.purchasePrice ? `$${parseInt(scenario.offer_data.purchasePrice).toLocaleString()}` : 'N/A',
        created_date: new Date(scenario.created_at).toLocaleDateString(),
        property_id: scenario.property_id,
        offer_data: scenario.offer_data
      }));

      setPropertiesWithOffers(transformedData);
    } catch (err: any) {
      setError(err.message || 'Failed to load properties with pricing scenarios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = (property: PropertyWithOffer) => {
    onGenerate(property);
    onClose();
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this pricing scenario? This action cannot be undone.')) {
      return;
    }

    setDeletingId(offerId);

    try {
      const response = await fetch(`/api/offer-scenarios/${offerId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete pricing scenario');
      }

      // Remove from local state
      setPropertiesWithOffers(prev => prev.filter(property => property.id !== offerId));
    } catch (error) {
      console.error('Error deleting pricing scenario:', error);
      alert('Failed to delete pricing scenario. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Select an Analysis</h2>
              <p className="text-sm text-gray-600">Choose an offer to generate a 10-year cash flow report</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Error Message */}
          {error && (
            <div className="m-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading properties...</span>
            </div>
          ) : propertiesWithOffers.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <FileText className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium mb-2">No pricing scenarios found</p>
              <p className="text-sm">Create offer analyses to generate cash flow reports</p>
            </div>
          ) : (
            /* Properties List */
            <div className="overflow-y-auto h-full">
              <div className="p-6 space-y-3">
                {propertiesWithOffers.map((property) => (
                  <div
                    key={property.id}
                    onClick={() => handleGenerateReport(property)}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {property.offer_name}
                        </h3>
                        {property.offer_description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {property.offer_description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">{property.property_address}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <span>Created {property.created_date}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-lg font-semibold text-blue-600">{property.offer_amount}</div>
                          <div className="text-xs text-gray-500">Purchase Price</div>
                        </div>
                        <Download className="h-5 w-5 text-blue-600" />
                        <button
                          onClick={() => handleDeleteOffer(property.id)}
                          disabled={deletingId === property.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Delete pricing scenario"
                        >
                          {deletingId === property.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Reports are generated as professional PDF documents with 10-year cash flow projections
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};