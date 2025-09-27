/*
 * CHARLIE2 V2 - Load Offer Modal
 * Modal for loading and managing saved offer analyzer scenarios
 * Features: List scenarios, load, delete, search/filter
 */
'use client';

import { useState, useEffect } from 'react';
import { X, Search, Trash2, FileText, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

interface OfferScenario {
  id: string;
  offer_name: string;
  offer_description: string | null;
  offer_data: any;
  created_at: string;
  updated_at: string;
}

interface LoadOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (scenarioData: any) => void;
  propertyId: string;
}

export const LoadOfferModal: React.FC<LoadOfferModalProps> = ({
  isOpen,
  onClose,
  onLoad,
  propertyId
}) => {
  const [scenarios, setScenarios] = useState<OfferScenario[]>([]);
  const [filteredScenarios, setFilteredScenarios] = useState<OfferScenario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch scenarios when modal opens
  useEffect(() => {
    if (isOpen && propertyId) {
      fetchScenarios();
    }
  }, [isOpen, propertyId]);

  // Filter scenarios based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredScenarios(scenarios);
    } else {
      const filtered = scenarios.filter(scenario =>
        scenario.offer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (scenario.offer_description && scenario.offer_description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredScenarios(filtered);
    }
  }, [scenarios, searchTerm]);

  const fetchScenarios = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/offer-scenarios?propertyId=${propertyId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch scenarios');
      }

      setScenarios(data.scenarios || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load scenarios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = (scenario: OfferScenario) => {
    onLoad(scenario.offer_data);
    onClose();
  };

  const handleDelete = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      return;
    }

    setDeletingId(scenarioId);

    try {
      const response = await fetch(`/api/offer-scenarios?id=${scenarioId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete scenario');
      }

      // Remove from local state
      setScenarios(prev => prev.filter(scenario => scenario.id !== scenarioId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete scenario');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClose = () => {
    setSearchTerm('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Load Analysis</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchScenarios}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search offers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
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
              <span className="ml-3 text-gray-600">Loading offers...</span>
            </div>
          ) : filteredScenarios.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <FileText className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium mb-2">
                {searchTerm ? 'No offers found' : 'No saved offers'}
              </p>
              <p className="text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Save your first offer to get started'}
              </p>
            </div>
          ) : (
            /* Scenarios List */
            <div className="overflow-y-auto h-full">
              <div className="p-6 space-y-3">
                {filteredScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {scenario.offer_name}
                        </h3>
                        {scenario.offer_description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {scenario.offer_description}
                          </p>
                        )}
                        <div className="flex items-center text-xs text-gray-500 mt-2">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Created {formatDate(scenario.created_at)}</span>
                          {scenario.updated_at !== scenario.created_at && (
                            <span className="ml-2">• Updated {formatDate(scenario.updated_at)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLoad(scenario)}
                          className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDelete(scenario.id)}
                          disabled={deletingId === scenario.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Delete offer"
                        >
                          {deletingId === scenario.id ? (
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
          <div className="flex justify-end">
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