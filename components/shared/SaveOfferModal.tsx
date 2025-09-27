/*
 * CHARLIE2 V2 - Save Offer Modal
 * Modal for saving offer analyzer scenarios to database
 * Features: Analysis name, description, validation, error handling
 */
'use client';

import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

interface SaveOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (offerName: string, offerDescription: string) => Promise<void>;
  isLoading?: boolean;
}

export const SaveOfferModal: React.FC<SaveOfferModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [offerName, setOfferName] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!offerName.trim()) {
      setError('Analysis name is required');
      return;
    }

    if (offerName.trim().length > 100) {
      setError('Analysis name must be 100 characters or less');
      return;
    }

    if (offerDescription.length > 500) {
      setError('Description must be 500 characters or less');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await onSave(offerName.trim(), offerDescription.trim());
      // Reset form on successful save
      setOfferName('');
      setOfferDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save analysis');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setOfferName('');
      setOfferDescription('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Save Analysis</h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Analysis Name */}
          <div className="mb-4">
            <label htmlFor="offerName" className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="offerName"
              value={offerName}
              onChange={(e) => setOfferName(e.target.value)}
              placeholder="e.g., Conservative Offer, Aggressive Bid"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={100}
              disabled={isSaving}
              required
            />
            <div className="mt-1 text-xs text-gray-500">
              {offerName.length}/100 characters
            </div>
          </div>

          {/* Offer Description */}
          <div className="mb-6">
            <label htmlFor="offerDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="offerDescription"
              value={offerDescription}
              onChange={(e) => setOfferDescription(e.target.value)}
              placeholder="Add notes about this offer scenario..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              maxLength={500}
              disabled={isSaving}
            />
            <div className="mt-1 text-xs text-gray-500">
              {offerDescription.length}/500 characters
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !offerName.trim()}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Analysis
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};