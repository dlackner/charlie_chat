'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Search, MapPin, SlidersHorizontal, ChevronDown, ChevronUp, X, Heart, Bookmark } from 'lucide-react';

// Extend Window interface for address validation timeout
declare global {
  interface Window {
    addressValidationTimeout: NodeJS.Timeout;
  }
}

export default function DiscoverPage() {
  const { user, supabase } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [propertyCount, setPropertyCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchDescription, setSaveSearchDescription] = useState('');
  const [recentProperties, setRecentProperties] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    // Location
    city: '',
    state: '',
    zip: '',
    
    // Number of Units
    units_min: '',
    units_max: '',
    
    // Owner Information
    in_state_owner: null as boolean | null,
    out_of_state_owner: null as boolean | null,
    corporate_owned: null as boolean | null,
    years_owned_min: '',
    years_owned_max: '',
    
    // Sale History
    last_sale_price_min: '',
    last_sale_price_max: '',
    mls_active: null as boolean | null,
    last_sale_arms_length: null as boolean | null,
    
    // Physical Characteristics
    year_built_min: '',
    year_built_max: '',
    flood_zone: null as boolean | null,
    
    // Financial Information
    assessed_value_min: '',
    assessed_value_max: '',
    value_min: '',
    value_max: '',
    
    // Distress & Special Conditions
    assumable: null as boolean | null,
    reo: null as boolean | null,
    pre_foreclosure: null as boolean | null
  });
  
  // Collapsible section states - all closed by default
  const [collapsedSections, setCollapsedSections] = useState({
    units: true,
    owner: true,
    sale: true,
    physical: true,
    financial: true,
    distress: true
  });

  // Load recent favorited properties on page load
  useEffect(() => {
    const loadRecentProperties = async () => {
      if (!user || !supabase) {
        setIsLoadingRecent(false);
        return;
      }

      try {
        // First, let's try a simpler approach - just get the favorites and use mock data for now
        // TODO: Replace with actual property data join when tables are properly set up
        const { data: favoritesData, error } = await supabase
          .from("user_favorites")
          .select("saved_at, property_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("saved_at", { ascending: false })
          .limit(12);

        if (error) {
          console.error("Error loading recent properties:", error);
          // Show empty state
          setRecentProperties([]);
          setPropertyCount(0);
          setHasSearched(false);
        } else if (favoritesData && favoritesData.length > 0) {
          // For now, create mock properties based on the favorites
          // TODO: Replace with actual property data when database schema is ready
          const mockProperties = favoritesData.map((favorite, index) => ({
            property_id: favorite.property_id,
            saved_at: favorite.saved_at,
            address_full: `Sample Property ${index + 1}`,
            address_city: "Newport",
            address_state: "RI",
            address_zip: "02840",
            units: Math.floor(Math.random() * 50) + 5,
            year_built: Math.floor(Math.random() * 50) + 1970,
            assessed_value: (Math.floor(Math.random() * 2000000) + 500000).toString(),
            estimated_value: (Math.floor(Math.random() * 2500000) + 600000).toString()
          }));
          
          setRecentProperties(mockProperties);
          setPropertyCount(mockProperties.length);
          setHasSearched(mockProperties.length > 0);
        } else {
          // No favorites found
          setRecentProperties([]);
          setPropertyCount(0);
          setHasSearched(false);
        }
      } catch (error) {
        console.error("Unexpected error loading recent properties:", error);
        setRecentProperties([]);
        setPropertyCount(0);
        setHasSearched(false);
      } finally {
        setIsLoadingRecent(false);
      }
    };

    loadRecentProperties();
  }, [user, supabase]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    // Close address validation dropdown
    setShowAddressSuggestions(false);
    
    setIsSearching(true);
    setRecentProperties([]);
    
    try {
      // Helper function to capitalize words properly
      const capitalizeWords = (str: string) => {
        return str.replace(/\b\w+/g, word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
      };
      
      // Enhanced location parsing for zip codes, city/state, and full addresses
      const locationParts = searchQuery.split(',').map(s => s.trim());
      
      let searchFilters = { ...filters };
      
      // Check if this is multiple zip codes FIRST (before other parsing)
      const zipPattern = /^\d{5}(-\d{4})?$/;
      const isMultipleZips = locationParts.length >= 2 && 
                            locationParts.every(part => part === '' || zipPattern.test(part));
      
      if (isMultipleZips) {
        // Handle multiple zip codes - only send zip parameter
        const validZips = locationParts.filter(part => part !== '');
        searchFilters = {
          zip: validZips.join(',') // Send as comma-separated string
        };
      } else {
        // Check if any part contains a zip code (5 digits)
        const zipMatch = searchQuery.match(/\b\d{5}(-\d{4})?\b/);
        const hasZip = zipMatch !== null;
        
        // Check if first part looks like a street address (contains numbers + text)
        const isStreetAddress = /^\d+\s+.+/.test(locationParts[0]);
      
      if (hasZip && locationParts.length === 1) {
        // Just a zip code: "80202"
        searchFilters.zip = zipMatch[0];
        searchFilters.city = '';
        searchFilters.state = '';
        searchFilters.street = '';
      } else if (isStreetAddress && locationParts.length >= 3) {
        // Full address: "73 rhode island ave, newport, ri 02840"
        // Clear all filters - only use address components for exact property lookup
        searchFilters = {};
        
        const streetPart = locationParts[0];
        const houseMatch = streetPart.match(/^(\d+)\s+(.+)$/);
        
        if (houseMatch) {
          searchFilters.house = houseMatch[1]; // "73"
          searchFilters.street = capitalizeWords(houseMatch[2]); // "Rhode Island Ave"
        } else {
          searchFilters.street = capitalizeWords(streetPart);
        }
        
        searchFilters.city = capitalizeWords(locationParts[1]);
        
        // Handle state + zip in last part: "ri 02840" or just "ri"
        const lastPart = locationParts[locationParts.length - 1].trim();
        
        // Handle US addresses - can be 3 or 4 parts
        if (locationParts.length >= 4) {
          // Format: "73 Rhode Island Avenue, Newport, RI, USA" 
          const statePart = locationParts[2].trim(); // "RI"
          searchFilters.state = statePart.toUpperCase();
          searchFilters.zip = hasZip ? zipMatch[0] : '';
        } else if (locationParts.length === 3) {
          // Format: "73 Rhode Island Avenue, Newport, RI" (no USA suffix)
          const statePart = locationParts[2].trim(); // "RI" or "RI 02840"
          const stateZipMatch = statePart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
          
          if (stateZipMatch) {
            searchFilters.state = stateZipMatch[1].toUpperCase();
            searchFilters.zip = stateZipMatch[2] || (hasZip ? zipMatch[0] : '');
          } else {
            searchFilters.state = statePart.toUpperCase();
            searchFilters.zip = hasZip ? zipMatch[0] : '';
          }
        } else {
          // Fallback for unusual formats
          searchFilters.state = lastPart.toUpperCase();
          searchFilters.zip = hasZip ? zipMatch[0] : '';
        }
      } else if (locationParts.length >= 2) {
        // City, State format: "newport, ri" or "denver, co 80202"
        searchFilters.city = capitalizeWords(locationParts[0]);
        
        const lastPart = locationParts[1].trim();
        const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
        
        if (stateZipMatch) {
          searchFilters.state = stateZipMatch[1].toUpperCase();
          searchFilters.zip = stateZipMatch[2] || (hasZip ? zipMatch[0] : '');
        } else {
          // Assume whole part is state and uppercase it
          searchFilters.state = lastPart.toUpperCase();
          searchFilters.zip = hasZip ? zipMatch[0] : '';
        }
        searchFilters.street = '';
      } else {
        // Single input - could be city name, zip, or street
        if (hasZip) {
          searchFilters.zip = zipMatch[0];
          searchFilters.city = '';
          searchFilters.state = '';
          searchFilters.street = '';
        } else {
          searchFilters.city = capitalizeWords(locationParts[0]);
          searchFilters.state = '';
          searchFilters.zip = '';
          searchFilters.street = '';
        }
      }
      }
      
      // Remove empty string and null values to avoid API validation errors
      Object.keys(searchFilters).forEach(key => {
        const value = searchFilters[key as keyof typeof searchFilters];
        if (value === '' || value === null || value === undefined) {
          delete searchFilters[key as keyof typeof searchFilters];
        }
      });
      
      const response = await fetch('/api/realestateapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...searchFilters,
          size: 12,
          resultIndex: 0
        })
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data.data || []);
      setPropertyCount(data.resultCount || data.data?.length || 0);
      setHasSearched(true);
      
    } catch (error) {
      console.error('Search error:', error);
      // Show error state or fallback
      setSearchResults([]);
      setPropertyCount(0);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };
  
  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Address validation and suggestions
  const validateAndSuggestAddress = async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setShowAddressSuggestions(false);
      return;
    }
    
    // Check if this is multiple zip codes (contains commas and looks like zip codes)
    const hasCommas = input.includes(',');
    const zipPattern = /^\d{5}(-\d{4})?$/;
    const parts = input.split(',').map(s => s.trim());
    
    if (hasCommas && parts.every(part => zipPattern.test(part) || part === '')) {
      // This is multiple zip codes - don't validate, just show a helpful message
      setAddressSuggestions([{
        description: `Search ${parts.filter(p => p).length} zip codes: ${parts.filter(p => p).join(', ')}`,
        isMultiZip: true,
        structured_formatting: {
          main_text: `${parts.filter(p => p).length} zip codes`,
          secondary_text: parts.filter(p => p).join(', ')
        }
      }]);
      setShowAddressSuggestions(true);
      setIsValidatingAddress(false);
      return;
    }
    
    setIsValidatingAddress(true);
    
    try {
      // Use Google Places Autocomplete API for single locations
      const response = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
      
      if (response.ok) {
        const data = await response.json();
        setAddressSuggestions(data.predictions || []);
        setShowAddressSuggestions(true);
      }
    } catch (error) {
      console.error('Address validation error:', error);
    } finally {
      setIsValidatingAddress(false);
    }
  };
  
  const selectAddressSuggestion = (suggestion: any) => {
    setSearchQuery(suggestion.description);
    setShowAddressSuggestions(false);
    // Clear previous search results when address is updated
    if (hasSearched && searchResults.length > 0) {
      setSearchResults([]);
      setPropertyCount(0);
      setHasSearched(false);
    }
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
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  
                  // Clear previous search results when location changes
                  if (hasSearched && searchResults.length > 0) {
                    setSearchResults([]);
                    setPropertyCount(0);
                    setHasSearched(false);
                  }
                  
                  // Trigger address validation after 300ms delay
                  clearTimeout(window.addressValidationTimeout);
                  window.addressValidationTimeout = setTimeout(() => {
                    validateAndSuggestAddress(value);
                  }, 300);
                }}
                onFocus={() => {
                  if (searchQuery.length >= 3) {
                    validateAndSuggestAddress(searchQuery);
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow for clicks
                  setTimeout(() => setShowAddressSuggestions(false), 200);
                }}
                className="w-full pl-12 pr-16 lg:pr-32 py-3 text-base lg:text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button 
                onClick={() => {
                  if (searchQuery.trim()) {
                    validateAndSuggestAddress(searchQuery);
                  }
                }}
                disabled={isValidatingAddress}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 text-blue-700 disabled:text-gray-500 px-2 lg:px-6 py-2 rounded-md font-medium transition-colors duration-200 flex items-center"
                title="Validate and suggest address"
              >
                {isValidatingAddress ? (
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                <span className="hidden lg:inline ml-2">
                  {isValidatingAddress ? 'Validating...' : 'Validate'}
                </span>
              </button>
              
              {/* Address Suggestions Dropdown */}
              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => selectAddressSuggestion(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
                    >
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {suggestion.structured_formatting?.main_text || suggestion.description}
                          </div>
                          <div className="text-xs text-gray-600">
                            {suggestion.structured_formatting?.secondary_text || ''}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                    value={filters.units_min}
                    onChange={(e) => updateFilter('units_min', e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="flex items-center text-gray-500">—</span>
                  <input 
                    type="number" 
                    placeholder="Max"
                    value={filters.units_max}
                    onChange={(e) => updateFilter('units_max', e.target.value)}
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
                      value={filters.years_owned_min}
                      onChange={(e) => updateFilter('years_owned_min', e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="50"
                      value={filters.years_owned_max}
                      onChange={(e) => updateFilter('years_owned_max', e.target.value)}
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
                <h2 className="text-xl font-semibold text-gray-900">
                  {recentProperties.length > 0 && !hasSearched ? 'Your Recent Properties' : 'Properties'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {recentProperties.length > 0 && !hasSearched 
                    ? 'Your most recently favorited properties'
                    : 'Search to see available multifamily investments'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-4 flex-shrink-0">
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {isLoadingRecent ? 'Loading...' : `${propertyCount} properties`}
                </span>
                <select className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white min-w-0">
                  <option>Most Recent</option>
                  <option>Location</option>
                  <option>Source</option>
                </select>
              </div>
            </div>

            {/* Results or Empty State */}
            {isLoadingRecent ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : recentProperties.length > 0 && !hasSearched ? (
              <div>
                {/* Recent Properties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentProperties.map((property) => (
                    <RecentPropertyCard key={property.property_id} property={property} />
                  ))}
                </div>
              </div>
            ) : hasSearched ? (
              <div>
                {/* Search Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.length > 0 ? (
                    searchResults.map((property, i) => (
                      <PropertyCard key={property.id || i} property={property} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500">No properties found. Try adjusting your search criteria.</p>
                    </div>
                  )}
                </div>
                
                {searchResults.length > 0 && propertyCount > searchResults.length && (
                  <div className="text-center py-8">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                      Load More Properties ({propertyCount - searchResults.length} remaining)
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

function RecentPropertyCard({ property }: { property: any }) {
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
        
        {/* Heart Favorite Button - Already favorited */}
        <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors">
          <Heart className="h-4 w-4 text-red-500 fill-current" />
        </button>
        
        {/* Recent Tag */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
            Recent
          </span>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Address */}
        <h3 className="font-semibold text-gray-900 mb-1 truncate">
          {property.address_full}
        </h3>
        
        {/* Location and Basic Info */}
        <p className="text-sm text-gray-600 mb-3">
          {property.address_city}, {property.address_state} • {property.units} Units • Built {property.year_built}
        </p>

        {/* Price */}
        <div className="mb-3">
          <div className="text-xl font-bold text-gray-900">
            ${property.assessed_value ? parseInt(property.assessed_value).toLocaleString() : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">
            Est. Value: <span className="font-medium text-green-600">
              ${property.estimated_value ? parseInt(property.estimated_value).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
            Favorited
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            {property.units} Units
          </span>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Saved {new Date(property.saved_at).toLocaleDateString()}
          </div>
          <button 
            onClick={() => window.location.href = `/discover/property/${property.property_id}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View Details
          </button>
        </div>
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

function PropertyCard({ property }: { property?: any }) {
  // Use real property data if available, otherwise fallback to sample data
  const displayProperty = property || {
    address_full: "Sample Property",
    address_city: "Sample City",
    address_state: "ST",
    units_count: 12,
    year_built: 2000,
    assessed_value: 1000000,
    estimated_value: 1200000,
    out_of_state_absentee_owner: false
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer">
      {/* Property Image - Google Street View */}
      <div className="relative">
        <div 
          className="relative aspect-[4/3] bg-gray-200 cursor-pointer group"
          onClick={() => {
            const address = `${displayProperty.address_full || displayProperty.address_street}, ${displayProperty.address_city}, ${displayProperty.address_state} ${displayProperty.address_zip}`;
            const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
            window.open(mapsUrl, '_blank');
          }}
        >
          <img 
            src={(() => {
              const address = `${displayProperty.address_full || displayProperty.address_street}, ${displayProperty.address_city}, ${displayProperty.address_state} ${displayProperty.address_zip}`;
              return `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
            })()}
            alt={`Street view of ${displayProperty.address_full || displayProperty.address_street}`}
            className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
            onError={(e) => {
              // Fallback to placeholder if Street View fails
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).classList.remove('hidden');
              }
            }}
          />
          {/* Fallback placeholder */}
          <div className="hidden absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <div className="text-gray-500 text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-gray-400/30 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-gray-400 rounded"></div>
              </div>
              <div className="text-sm font-medium">Property Photo</div>
            </div>
          </div>
        </div>
        
        {/* Heart Favorite Button */}
        <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors">
          <Heart className="h-4 w-4 text-gray-600 hover:text-red-500" />
        </button>
        
        {/* Zillow Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const address = displayProperty.address_full || displayProperty.address_street || '';
            const zillowUrl = `https://www.zillow.com/homes/${address.replace(/\s+/g, '-')}-${displayProperty.address_city}-${displayProperty.address_state}-${displayProperty.address_zip}_rb/`;
            window.open(zillowUrl, '_blank');
          }}
          className="absolute bottom-3 right-3 bg-white/95 hover:bg-white rounded-lg p-2 shadow-sm transition-colors group"
          title="View on Zillow"
        >
          <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 12h3v8h4v-6h6v6h4v-8h3L12 2z"/>
          </svg>
        </button>
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Address */}
        <h3 className="font-semibold text-gray-900 mb-1 truncate">
          {displayProperty.address_full || displayProperty.address_street || 'Address Not Available'}
        </h3>
        
        {/* Location and Basic Info */}
        <p className="text-sm text-gray-600 mb-3">
          {displayProperty.address_city}, {displayProperty.address_state} • {displayProperty.units_count || 'N/A'} Units • Built {displayProperty.year_built || 'Unknown'}
        </p>

        {/* Price */}
        <div className="mb-3">
          <div className="text-xl font-bold text-gray-900">
            ${displayProperty.assessed_value ? parseInt(displayProperty.assessed_value).toLocaleString() : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">
            Est. Value: <span className="font-medium text-green-600">
              ${displayProperty.estimated_value ? parseInt(displayProperty.estimated_value).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {displayProperty.out_of_state_absentee_owner && (
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
              Absentee Owner
            </span>
          )}
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            {displayProperty.units_count || 'N/A'} Units
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

