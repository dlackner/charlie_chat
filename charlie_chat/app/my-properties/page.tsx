"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Mail, MapPin, DollarSign, Home, Bed, Bath, Square, Send } from 'lucide-react';

// Types for our property data
interface Property {
  id: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  propertyType?: string;
  yearBuilt?: number;
  lotSize?: string;
  owner?: {
    name?: string;
    email?: string;
  };
}

export default function MyPropertiesPage() {
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [isGeneratingLOIs, setIsGeneratingLOIs] = useState(false);
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);

  const isLoggedIn = !!currentUser;

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoadingAuth && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoadingAuth, isLoggedIn, router]);

  // Load favorite properties from session storage (for POC)
  useEffect(() => {
    const savedFavorites = sessionStorage.getItem('favoriteProperties');
    if (savedFavorites) {
      setFavoriteProperties(JSON.parse(savedFavorites));
    }
  }, []);

  const handlePropertySelect = (propertyId: string) => {
    const newSelection = new Set(selectedProperties);
    if (newSelection.has(propertyId)) {
      newSelection.delete(propertyId);
    } else {
      newSelection.add(propertyId);
    }
    setSelectedProperties(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedProperties.size === favoriteProperties.length) {
      setSelectedProperties(new Set());
    } else {
      setSelectedProperties(new Set(favoriteProperties.map(p => p.id)));
    }
  };

  const handleRemoveFavorite = (propertyId: string) => {
    const updatedFavorites = favoriteProperties.filter(p => p.id !== propertyId);
    setFavoriteProperties(updatedFavorites);
    sessionStorage.setItem('favoriteProperties', JSON.stringify(updatedFavorites));
    
    // Remove from selection if it was selected
    const newSelection = new Set(selectedProperties);
    newSelection.delete(propertyId);
    setSelectedProperties(newSelection);
  };

  const handleBulkLOI = async () => {
    if (selectedProperties.size === 0) {
      alert('Please select at least one property to generate LOIs.');
      return;
    }

    setIsGeneratingLOIs(true);
    
    try {
      // For now, we'll simulate the bulk LOI generation
      // Later this will integrate with the skip trace API and LOI generation
      const selectedProps = favoriteProperties.filter(p => selectedProperties.has(p.id));
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Generated LOIs for ${selectedProps.length} properties! 
      
Properties:
${selectedProps.map(p => `• ${p.address}`).join('\n')}
      
(This is a POC - integration with skip trace API and email sending coming soon!)`);
      
    } catch (error) {
      console.error('Error generating bulk LOIs:', error);
      alert('Error generating LOIs. Please try again.');
    } finally {
      setIsGeneratingLOIs(false);
    }
  };

  const handleBulkEmail = async () => {
    if (selectedProperties.size === 0) {
      alert('Please select at least one property to send emails.');
      return;
    }

    setIsGeneratingEmails(true);
    
    try {
      const selectedProps = favoriteProperties.filter(p => selectedProperties.has(p.id));
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Bulk emails sent to ${selectedProps.length} property owners! 
      
Properties:
${selectedProps.map(p => `• ${p.address}`).join('\n')}
      
(This is a POC - integration with skip trace API for emails and email templates coming soon!)`);
      
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      alert('Error sending emails. Please try again.');
    } finally {
      setIsGeneratingEmails(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Heart className="text-red-500 mr-3" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">My Properties</h1>
          </div>
          <p className="text-gray-600">
            Your saved properties for analysis and bulk LOI generation.
          </p>
        </div>

        {/* No properties state */}
        {favoriteProperties.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="mx-auto text-gray-400 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No saved properties yet</h2>
            <p className="text-gray-600 mb-6">
              Start by searching for properties in the sidebar and clicking the heart icon to save them here.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
            >
              Start Searching Properties
            </button>
          </div>
        ) : (
          <>
            {/* Bulk actions bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedProperties.size === favoriteProperties.length && favoriteProperties.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Select All ({favoriteProperties.length})
                    </span>
                  </label>
                  
                  {selectedProperties.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedProperties.size} selected
                    </span>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleBulkLOI}
                    disabled={selectedProperties.size === 0 || isGeneratingLOIs}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium transition ${
                      selectedProperties.size === 0 || isGeneratingLOIs
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    <Mail className="mr-2" size={16} />
                    {isGeneratingLOIs ? 'Generating...' : 'Generate Bulk LOIs'}
                  </button>

                  <button
                    onClick={handleBulkEmail}
                    disabled={selectedProperties.size === 0 || isGeneratingEmails}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium transition ${
                      selectedProperties.size === 0 || isGeneratingEmails
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Send className="mr-2" size={16} />
                    {isGeneratingEmails ? 'Sending...' : 'Generate Bulk Email'}
                  </button>
                </div>
              </div>
            </div>

            {/* Properties grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteProperties.map((property) => (
                <div key={property.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Property card header with selection */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedProperties.has(property.id)}
                          onChange={() => handlePropertySelect(property.id)}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Select for LOI</span>
                      </label>
                      
                      <button
                        onClick={() => handleRemoveFavorite(property.id)}
                        className="text-red-500 hover:text-red-700 transition"
                        title="Remove from favorites"
                      >
                        <Heart className="fill-current" size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Property details */}
                  <div className="p-4">
                    <div className="flex items-start mb-3">
                      <MapPin className="text-gray-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      <div>
                        <p className="font-semibold text-gray-900">{property.address}</p>
                        {(property.city || property.state || property.zip) && (
                          <p className="text-gray-600 text-sm">
                            {[property.city, property.state, property.zip].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Property stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {property.price && (
                        <div className="flex items-center">
                          <DollarSign className="text-green-600 mr-1" size={14} />
                          <span className="text-sm text-gray-700">
                            ${property.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {property.propertyType && (
                        <div className="flex items-center">
                          <Home className="text-blue-600 mr-1" size={14} />
                          <span className="text-sm text-gray-700">{property.propertyType}</span>
                        </div>
                      )}
                      
                      {property.bedrooms && (
                        <div className="flex items-center">
                          <Bed className="text-purple-600 mr-1" size={14} />
                          <span className="text-sm text-gray-700">{property.bedrooms} bed</span>
                        </div>
                      )}
                      
                      {property.bathrooms && (
                        <div className="flex items-center">
                          <Bath className="text-cyan-600 mr-1" size={14} />
                          <span className="text-sm text-gray-700">{property.bathrooms} bath</span>
                        </div>
                      )}
                      
                      {property.sqft && (
                        <div className="flex items-center">
                          <Square className="text-orange-600 mr-1" size={14} />
                          <span className="text-sm text-gray-700">{property.sqft.toLocaleString()} sq ft</span>
                        </div>
                      )}
                    </div>

                    {/* Owner info */}
                    {property.owner && (
                      <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                        {property.owner.name && <p>Owner: {property.owner.name}</p>}
                        {property.owner.email && <p>Email: {property.owner.email}</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}