'use client';

import { useState } from 'react';

export default function LoadPropertyPage() {
  const [propertyJson, setPropertyJson] = useState('');
  const [userUuid, setUserUuid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setMessageType('');

    try {
      // Validate inputs
      if (!propertyJson.trim()) {
        throw new Error('Property JSON is required');
      }
      if (!userUuid.trim()) {
        throw new Error('User UUID is required');
      }

      // Parse JSON to validate it
      let propertyData;
      try {
        propertyData = JSON.parse(propertyJson);
      } catch (error) {
        throw new Error('Invalid JSON format');
      }

      // Send to API
      const response = await fetch('/api/admin/load-property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userUuid.trim(),
          propertyData: propertyData
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`Property loaded successfully! Property ID: ${result.propertyId}`);
        setMessageType('success');
        // Clear the form
        setPropertyJson('');
        setUserUuid('');
      } else {
        throw new Error(result.error || 'Failed to load property');
      }

    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Load Other Properties</h1>
            <p className="mt-2 text-sm text-gray-600">
              Admin tool to manually add properties to user favorites from external API data
            </p>
            
            {/* Program Summary */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h2 className="text-sm font-semibold text-blue-900 mb-2">How to Use This Tool:</h2>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li><strong>Get Property ID:</strong> Find the property ID you want to load</li>
                <li><strong>Fetch from RealEstateAPI:</strong> Use the property ID to call the RealEstateAPI and get the complete JSON response</li>
                <li><strong>Paste JSON:</strong> Copy the entire JSON response and paste it into the form below</li>
                <li><strong>Enter User UUID:</strong> Specify which user should receive this property in their favorites</li>
                <li><strong>Submit:</strong> The property will be saved and automatically favorited for that user</li>
              </ol>
              <p className="mt-2 text-xs text-blue-700">
                <strong>Access:</strong> This tool is available at <code>/admin/load-property</code> and requires admin privileges.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Property JSON Input */}
            <div>
              <label htmlFor="propertyJson" className="block text-sm font-medium text-gray-700 mb-2">
                Property JSON Data
              </label>
              <textarea
                id="propertyJson"
                value={propertyJson}
                onChange={(e) => setPropertyJson(e.target.value)}
                rows={15}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Paste the entire JSON response from the realestateapi here..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Paste the complete JSON object returned from the realestateapi
              </p>
            </div>

            {/* User UUID Input */}
            <div>
              <label htmlFor="userUuid" className="block text-sm font-medium text-gray-700 mb-2">
                User UUID
              </label>
              <input
                type="text"
                id="userUuid"
                value={userUuid}
                onChange={(e) => setUserUuid(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 36f7b3a4-7bb1-42c7-9f66-b036de7dff5d"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                The UUID of the user who should receive this property as a favorite
              </p>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isLoading ? 'Loading Property...' : 'Load Property'}
              </button>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-4 rounded-md ${
                messageType === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}
          </form>

          {/* Instructions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Instructions:</h3>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Copy the complete JSON response from the realestateapi</li>
              <li>Paste it into the "Property JSON Data" field above</li>
              <li>Enter the user UUID who should receive this property</li>
              <li>Click "Load Property" to add it to saved_properties and user_favorites</li>
            </ol>
            <p className="mt-2 text-xs text-gray-500">
              The property will be added with status "active", favorite_status "Reviewing", and recommendation_type "manual"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}