/*
 * CHARLIE2 V2 - Discover Page
 * Advanced property search and filtering with comprehensive saved search functionality
 * Features: Clean map implementation, connected filter system, smart searches
 * TODO: Move to app/v2/discover/ for proper V2 organization
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Search, MapPin, SlidersHorizontal, ChevronDown, ChevronUp, X, Heart, Bookmark, Target, AlertTriangle, Wrench, Activity, CreditCard, DollarSign, Home, Building, Users, Grid3x3, Map, ArrowUpDown, Trash2, Edit } from 'lucide-react';
import { StandardModalWithActions } from '@/components/v2/StandardModal';
import PropertyMap from '@/components/v2/PropertyMap';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';

// Clean map implementation for discover page using react-map-gl
const DiscoverMap = dynamic(() => import('react-map-gl/mapbox').then((mod) => {
  const { Map, Marker, Popup } = mod;
  
  return function DiscoverMap({ properties, className, currentViewMode, isShowingFavorites, searchQuery, hasSearched }: { properties: any[], className?: string, currentViewMode?: string, isShowingFavorites?: boolean, searchQuery?: string, hasSearched?: boolean }) {
    const [viewState, setViewState] = useState({
      longitude: -71.3128,
      latitude: 41.4901,
      zoom: 13
    });
    const [popupInfo, setPopupInfo] = useState<any>(null);

    // Calculate centroid when properties change
    useEffect(() => {
      if (properties?.length > 0) {
        const validProperties = properties.filter(p => p.latitude && p.longitude);
        if (validProperties.length > 0) {
          const avgLat = validProperties.reduce((sum, p) => sum + p.latitude, 0) / validProperties.length;
          const avgLng = validProperties.reduce((sum, p) => sum + p.longitude, 0) / validProperties.length;
          setViewState({
            latitude: avgLat,
            longitude: avgLng,
            zoom: 12
          });
        }
      }
    }, [properties]);

    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      return (
        <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
          <div className="text-center text-gray-500 p-8">
            <div className="h-12 w-12 mx-auto mb-4 text-gray-400">🗺️</div>
            <p className="text-sm">Map requires configuration</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`relative ${className}`}>
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: '100%', height: '100%' }}
        >
          {properties?.filter(p => p.latitude && p.longitude).map((property, index) => {
            return (
              <Marker
                key={property.id || index}
                longitude={Number(property.longitude)}
                latitude={Number(property.latitude)}
                onClick={(e) => {
                  e.originalEvent?.stopPropagation();
                  setPopupInfo(property);
                }}
              >
                <button className="w-8 h-8 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-red-600 transition-colors">
                  <span className="text-white text-xs font-bold">
                    {property.units_count || '?'}
                  </span>
                </button>
              </Marker>
            );
          })}

          {popupInfo && (
            <Popup
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              onClose={() => setPopupInfo(null)}
              closeButton={true}
              closeOnClick={false}
              offset={10}
            >
              <div 
                className="p-3 max-w-64 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  // Create a clean back URL for the discover page
                  const baseUrl = new URL('/v2/discover', window.location.origin);
                  baseUrl.searchParams.set('viewMode', currentViewMode || 'cards');
                  
                  // If we're in favorites mode, preserve that too
                  if (isShowingFavorites) {
                    baseUrl.searchParams.set('showingFavorites', 'true');
                  } else if (hasSearched && searchQuery) {
                    baseUrl.searchParams.set('q', searchQuery);
                    baseUrl.searchParams.set('hasResults', 'true');
                  }
                  
                  const backUrl = encodeURIComponent(baseUrl.toString());
                  window.location.href = `/v2/discover/property/${popupInfo.id || popupInfo.property_id}?back=${backUrl}`;
                }}
              >
                <h3 className="font-semibold text-gray-900 mb-2 text-sm break-words leading-tight">
                  {popupInfo.address_street || 'Property'}
                </h3>
                <div className="text-xs text-gray-600 mb-2">
                  {popupInfo.units_count || 'N/A'} Units • Built {popupInfo.year_built || 'Unknown'}
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="text-sm font-bold text-gray-900">
                    ${popupInfo.assessed_value ? parseInt(popupInfo.assessed_value.toString()).toLocaleString() : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600">
                    Est. Value: ${popupInfo.estimated_value ? parseInt(popupInfo.estimated_value.toString()).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    );
  };
}), {
  ssr: false,
  loading: () => <div className="bg-gray-100 animate-pulse rounded-lg" />
});

// Extend Window interface for address validation timeout
declare global {
  interface Window {
    addressValidationTimeout: NodeJS.Timeout;
  }
}

export default function DiscoverPage() {
  const { user, supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state from URL parameters if available
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [propertyCount, setPropertyCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchSuccess, setSaveSearchSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<any>(null);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchDescription, setSaveSearchDescription] = useState('');
  const [recentProperties, setRecentProperties] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'map'>(() => {
    // Restore view mode from URL if present
    const urlViewMode = searchParams.get('viewMode');
    return (urlViewMode === 'map' || urlViewMode === 'cards') ? urlViewMode : 'cards';
  });
  const [isRestoringSearch, setIsRestoringSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastSearchFilters, setLastSearchFilters] = useState<any>(null);
  const [favoritePropertyIds, setFavoritePropertyIds] = useState<string[]>([]);
  const [currentFavoritesPage, setCurrentFavoritesPage] = useState(0);
  const [isLoadingMoreFavorites, setIsLoadingMoreFavorites] = useState(false);
  const [totalFavoritesCount, setTotalFavoritesCount] = useState(0);
  const [locationFilter, setLocationFilter] = useState('');
  const [allFavorites, setAllFavorites] = useState<any[]>([]);
  const [mySearches, setMySearches] = useState<any[]>([]);
  const [isLoadingMySearches, setIsLoadingMySearches] = useState(false);
  
  // Constants
  const MAX_FAVORITES_LIMIT = 24;
  
  // Constants
  const FAVORITES_PER_PAGE = 12;
  
  // Filter favorites by location
  const filterFavoritesByLocation = (favorites: any[], filter: string) => {
    if (!filter.trim() || !favorites.length) return favorites;
    
    const filterLower = filter.toLowerCase();
    
    return favorites.filter(property => {
      const city = (property.address_city || '').toLowerCase();
      const state = (property.address_state || '').toLowerCase();
      const zip = (property.address_zip || '').toLowerCase();
      const fullAddress = (property.address_full || '').toLowerCase();
      
      // Check if filter matches city, state, zip, or full address
      return city.includes(filterLower) ||
             state.includes(filterLower) ||
             zip.includes(filterLower) ||
             fullAddress.includes(filterLower) ||
             `${city}, ${state}`.includes(filterLower);
    });
  };
  
  // Get filtered favorites for display
  const getFilteredFavorites = () => {
    const filtered = filterFavoritesByLocation(allFavorites, locationFilter);
    // Always show by recency (favorites are already sorted by saved_at DESC from API)
    return filtered;
  };
  
  // Filter states
  const [filters, setFilters] = useState({
    // Location
    city: '',
    state: '',
    zip: '',
    county: '',
    house: '',
    street: '',
    
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
    distress: true,
    savedSearches: true,
    mySearches: true
  });

  // Saved searches data
  const savedSearches = [
    {
      id: 101,
      name: 'Motivated Sellers',
      description: 'Out-of-state owners who have owned 10+ years',
      icon: Target,
      color: 'green',
      criteria: {
        specialQuery: 'motivated-sellers',
        apiFields: {
          out_of_state_owner: true,
          years_owned_min: 10
        }
      }
    },
    {
      id: 102,
      name: 'Value-Add Deals',
      description: 'Older properties (1970-1995) with absentee owners',
      icon: Wrench,
      color: 'blue',
      criteria: {
        specialQuery: 'value-add-deals',
        apiFields: {
          year_built_min: 1970,
          year_built_max: 1995,
          out_of_state_owner: true
        }
      }
    },
    {
      id: 103,
      name: 'High Cash Flow Properties',
      description: 'Multi-family properties with strong rental income potential',
      icon: DollarSign,
      color: 'green',
      criteria: {
        specialQuery: 'high-cash-flow',
        apiFields: {
          year_built_min: 1980,
          year_built_max: 2015
        }
      }
    },
    {
      id: 104,
      name: 'Fix & Flip Opportunities',
      description: 'Distressed properties with renovation potential',
      icon: AlertTriangle,
      color: 'red',
      criteria: {
        specialQuery: 'fix-and-flip',
        apiFields: {
          year_built_min: 1950,
          year_built_max: 1990,
          or: [
            { pre_foreclosure: true },
            { tax_lien: true },
            { reo: true },
            { auction: true }
          ]
        }
      }
    },
    {
      id: 105,
      name: 'New Construction',
      description: 'Recently built properties with modern amenities',
      icon: Building,
      color: 'blue',
      criteria: {
        specialQuery: 'new-construction',
        apiFields: {
          year_built_min: 2010,
          year_built_max: 2024
        }
      }
    },
    {
      id: 106,
      name: 'Luxury Properties',
      description: 'High-end properties in premium locations',
      icon: Users,
      color: 'purple',
      criteria: {
        specialQuery: 'luxury-properties',
        apiFields: {
          year_built_min: 1995,
          estimated_value_min: 1000000
        }
      }
    },
    {
      id: 107,
      name: 'Private Lender',
      description: 'Properties with private financing and absentee owners',
      icon: CreditCard,
      color: 'indigo',
      criteria: {
        specialQuery: 'private-lender-deals',
        apiFields: {
          private_lender: true,
          out_of_state_owner: true
        }
      }
    }
  ];

  // Restore search state from URL parameters if present
  useEffect(() => {
    const restoreSearchState = async () => {
      const query = searchParams.get('q');
      const hasResults = searchParams.get('hasResults') === 'true';
      
      if (query && hasResults) {
        setIsRestoringSearch(true);
        setSearchQuery(query);
        // Re-run the search to restore results
        await performSearch(query);
        setIsRestoringSearch(false);
      }
    };

    restoreSearchState();
  }, []); // Only run on mount

  // Load recent favorited properties on page load
  useEffect(() => {
    const loadRecentProperties = async () => {
      if (!user || !supabase) {
        setIsLoadingRecent(false);
        return;
      }

      // Don't load favorites if we're restoring search state from URL
      const hasSearchFromUrl = searchParams.get('hasResults') === 'true';
      if (hasSearchFromUrl) {
        setIsLoadingRecent(false);
        return;
      }

      try {
        // Get favorites using API endpoint first
        
        const response = await fetch('/api/favorites');
        
        if (!response.ok) {
          console.error('Error loading favorites:', response.statusText);
          setRecentProperties([]);
          setPropertyCount(0);
          setTotalFavoritesCount(0);
          setHasSearched(false);
          setIsLoadingRecent(false);
          return;
        }
        
        const favoritesResult = await response.json();
        // Extract property IDs from the new API format
        const favoritePropertyIds = favoritesResult.favorites?.map((fav: any) => fav.property_id) || [];
        
        if (favoritePropertyIds.length > 0) {
          // Apply 24 limit: for paid users show most recent 24, for free users this is their total
          const isFreeUser = user?.user_metadata?.user_class === 'charlie_chat';
          const limitedFavoriteIds = isFreeUser 
            ? favoritePropertyIds // Free users can't exceed 24 anyway
            : favoritePropertyIds.slice(0, MAX_FAVORITES_LIMIT); // Paid users: show most recent 24
          
          // Get real property data from saved_properties table using existing supabase client
          if (supabase) {
            const firstPageIds = limitedFavoriteIds.slice(0, FAVORITES_PER_PAGE);
            const { data: propertiesData, error: propertiesError } = await supabase
              .from('saved_properties')
              .select('*')
              .in('property_id', firstPageIds);
            
            if (propertiesError) {
              console.error('Error loading property data:', propertiesError);
              setAllFavorites([]);
              setTotalFavoritesCount(0);
              setRecentProperties([]);
              setPropertyCount(0);
            } else {
              // Map database fields to component expected fields
              const mappedProperties = propertiesData?.map(prop => ({
                ...prop,
                id: prop.property_id || prop.id, // Ensure PropertyMap has the id field it expects
                units: prop.units_count || 0,
                address_full: prop.address_full || prop.address_street || 'Address Not Available'
              })) || [];
              
              setAllFavorites(limitedFavoriteIds);
              setTotalFavoritesCount(limitedFavoriteIds.length);
              setRecentProperties(mappedProperties);
              setPropertyCount(mappedProperties.length);
              setCurrentFavoritesPage(0);
              setHasSearched(false);
              setIsLoadingRecent(false);
              return;
            }
          }
          
          // Fallback: if no supabase client or error, show empty state
          setAllFavorites([]);
          setRecentProperties([]);
          setPropertyCount(0);
          setTotalFavoritesCount(0);
          setHasSearched(false);
        } else {
          setAllFavorites([]);
          setRecentProperties([]);
          setPropertyCount(0);
          setTotalFavoritesCount(0);
          setHasSearched(false);
        }

      } catch (error) {
        console.error("Unexpected error loading recent properties:", error);
        setAllFavorites([]);
        setRecentProperties([]);
        setPropertyCount(0);
        setTotalFavoritesCount(0);
        setHasSearched(false);
        setIsLoadingRecent(false);
      }
    };

    loadRecentProperties();
    // Also load saved searches
    if (user) {
      loadMySearches();
    }
  }, [user]); // Add user dependency for saved searches

  // Load more favorites function
  const loadMoreFavorites = async () => {
    if (isLoadingMoreFavorites) return;
    
    setIsLoadingMoreFavorites(true);
    
    try {
      const filteredFavorites = getFilteredFavorites();
      const nextPage = currentFavoritesPage + 1;
      const startIndex = nextPage * FAVORITES_PER_PAGE;
      const endIndex = startIndex + FAVORITES_PER_PAGE;
      const nextPageIds = filteredFavorites.slice(startIndex, endIndex);
      
      if (nextPageIds.length > 0) {
        // Fetch actual property data from database
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('saved_properties')
          .select('*')
          .in('property_id', nextPageIds);
        
        if (propertiesError) {
          console.error('Error loading more property data:', propertiesError);
        } else {
          // Map database fields to component expected fields
          const mappedProperties = propertiesData?.map(prop => ({
            ...prop,
            id: prop.property_id || prop.id,
            units: prop.units_count || 0,
            address_full: prop.address_full || prop.address_street || 'Address Not Available'
          })) || [];
          
          // Append to existing properties
          setRecentProperties(prev => [...prev, ...mappedProperties]);
          setPropertyCount(prev => prev + mappedProperties.length);
          setCurrentFavoritesPage(nextPage);
        }
      }
    } catch (error) {
      console.error('Error loading more favorites:', error);
    } finally {
      setIsLoadingMoreFavorites(false);
    }
  };
  
  // Handle location filter changes
  const handleLocationFilterChange = (newFilter: string) => {
    setLocationFilter(newFilter);
    setCurrentFavoritesPage(0);
    
    // Apply filter and show first page
    const filteredFavorites = filterFavoritesByLocation(allFavorites, newFilter);
    const firstPage = filteredFavorites.slice(0, FAVORITES_PER_PAGE);
    setRecentProperties(firstPage);
    setPropertyCount(firstPage.length);
  };

  // Load user favorites
  useEffect(() => {
    // TEMPORARY: Always load for testing
    loadUserFavorites();
    // if (user) {
    //   loadUserFavorites();
    // }
  }, [user]);

  const loadUserFavorites = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        // Extract property IDs from the new API format
        const propertyIds = data.favorites?.map((fav: any) => fav.property_id) || [];
        setFavoritePropertyIds(propertyIds);
      }
    } catch (error) {
      console.error('Error loading user favorites:', error);
    }
  };

  const toggleFavorite = async (property: any, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // TEMPORARY: Skip auth check for testing
    // if (!user) {
    //   alert('Please sign in to save favorites');
    //   return;
    // }

    const propertyId = property.property_id || property.id;
    const isFavorited = favoritePropertyIds.includes(propertyId);
    const action = isFavorited ? 'remove' : 'add';
    
    // Check 24 favorite limit for free users only
    const isFreeUser = user?.user_metadata?.user_class === 'charlie_chat';
    if (action === 'add' && isFreeUser && favoritePropertyIds.length >= MAX_FAVORITES_LIMIT) {
      alert(`You've reached the ${MAX_FAVORITES_LIMIT} favorite limit for free users. Remove some favorites or upgrade for unlimited favorites in the Engage workshop.`);
      return;
    }
    

    // Optimistic update
    if (isFavorited) {
      setFavoritePropertyIds(prev => prev.filter(id => id !== propertyId));
    } else {
      setFavoritePropertyIds(prev => [...prev, propertyId]);
    }

    try {
      const requestPayload = {
        property_id: propertyId,
        property_data: property,
        action
      };
      
      
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', response.status, errorData);
        throw new Error(`Failed to update favorite: ${errorData.error || response.statusText}`);
      }

      // If adding favorite, refresh recent properties to show newly saved item
      if (action === 'add') {
        // For pagination: just add the new property to the beginning of the list
        // In a real app, you'd want to refresh from the server to get actual property data
        const newProperty = {
          property_id: propertyId,
          saved_at: new Date().toISOString(),
          address_full: property.address_full || property.address_street || 'New Favorite',
          address_city: property.address_city || 'Newport',
          address_state: property.address_state || 'RI',
          address_zip: property.address_zip || '02840',
          units: property.units_count || Math.floor(Math.random() * 20) + 2,
          year_built: property.year_built || Math.floor(Math.random() * 50) + 1970,
          assessed_value: property.assessed_value || (Math.floor(Math.random() * 2000000) + 500000).toString(),
          estimated_value: property.estimated_value || (Math.floor(Math.random() * 2500000) + 600000).toString()
        };
        
        // Add to all favorites and refresh the display
        setAllFavorites(prev => [newProperty, ...prev]);
        setTotalFavoritesCount(prev => prev + 1);
        
        // Refresh filtered view
        const updatedAllFavorites = [newProperty, ...allFavorites];
        const filteredFavorites = filterFavoritesByLocation(updatedAllFavorites, locationFilter);
        const firstPage = filteredFavorites.slice(0, FAVORITES_PER_PAGE);
        setRecentProperties(firstPage);
        setPropertyCount(firstPage.length);
        setCurrentFavoritesPage(0);
      }

    } catch (error) {
      console.error('Error updating favorite:', error);
      // Revert optimistic update
      if (isFavorited) {
        setFavoritePropertyIds(prev => [...prev, propertyId]);
      } else {
        setFavoritePropertyIds(prev => prev.filter(id => id !== propertyId));
      }
      alert('Failed to update favorite. Please try again.');
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setRecentProperties([]);
    setCurrentPage(0); // Reset pagination for new search
    
    try {
      // Helper function to capitalize words properly
      const capitalizeWords = (str: string) => {
        return str.replace(/\b\w+/g, word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
      };
      
      // Enhanced location parsing for zip codes, city/state, and full addresses
      // Clean the search query - remove common prefixes like "Search 2 zip codes:"
      let cleanedQuery = query.replace(/^(search\s+\d+\s+zip\s+codes?:\s*)/i, '').trim();
      
      const locationParts = cleanedQuery.split(',').map(s => s.trim());
      
      let searchFilters = { ...filters };
      
      // Check if this is multiple zip codes FIRST (before other parsing)
      const zipPattern = /^\d{5}(-\d{4})?$/;
      const isMultipleZips = locationParts.length >= 2 && 
                            locationParts.every(part => zipPattern.test(part.trim()));
      
      if (isMultipleZips) {
        // Handle multiple zip codes - only send zip parameter
        const validZips = locationParts.filter(part => part.trim() !== '').map(part => part.trim());
        searchFilters.zip = validZips.join(','); // Send as comma-separated string
        searchFilters.city = '';
        searchFilters.state = '';
        searchFilters.house = '';
        searchFilters.street = '';
      } else {
        // Check if any part contains a zip code (5 digits)
        const zipMatch = query.match(/\b\d{5}(-\d{4})?\b/);
        const hasZip = zipMatch !== null;
        
        // Check if first part looks like a street address (contains numbers + text)
        const isStreetAddress = /^\d+\s+.+/.test(locationParts[0]);
      
      if (hasZip && locationParts.length === 1) {
        // Just a zip code: "80202"
        searchFilters.zip = zipMatch[0];
        searchFilters.city = '';
        searchFilters.state = '';
      } else if (isStreetAddress && locationParts.length >= 3) {
        // Full address: "73 rhode island ave, newport, ri 02840"
        // Clear location filters - only use address components for exact property lookup
        searchFilters.city = '';
        searchFilters.state = '';
        searchFilters.zip = '';
        searchFilters.house = '';
        searchFilters.street = '';
        
        const streetPart = locationParts[0];
        const houseMatch = streetPart.match(/^(\d+)\s+(.+)$/);
        
        // Extract house and street for specific property lookup
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
        // Check if first part contains "County" - if so, use county parameter instead of city
        const firstPart = locationParts[0];
        if (firstPart.toLowerCase().includes('county')) {
          searchFilters.county = capitalizeWords(firstPart);
        } else {
          searchFilters.city = capitalizeWords(firstPart);
        }
        
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
      } else {
        // Single input - could be city name, zip, or street
        if (hasZip) {
          searchFilters.zip = zipMatch[0];
          searchFilters.city = '';
          searchFilters.state = '';
        } else {
          // Check if single input contains "County"
          const input = locationParts[0];
          if (input.toLowerCase().includes('county')) {
            searchFilters.county = capitalizeWords(input);
          } else {
            searchFilters.city = capitalizeWords(input);
          }
          searchFilters.state = '';
          searchFilters.zip = '';
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
      
      const searchPayload = {
        ...searchFilters,
        property_type: "MFR", // Only multifamily properties  
        size: 12, // Load 12 at a time for pagination
        resultIndex: 0
      };
      
      
      const response = await fetch('/api/realestateapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchPayload)
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      
      // Log the property types we're getting back
      if (data.data && data.data.length > 0) {
      }
      
      // Filter out non-multifamily properties as backup
      const filteredResults = (data.data || []).filter((property: any) => {
        // Allow MFR and properties with 2+ units, but exclude obvious single-family types
        const propertyType = property.property_type?.toLowerCase();
        const unitCount = parseInt(property.units_count) || 0;
        
        // Include if explicitly MFR or has 2+ units (but exclude condos and single family)
        return (propertyType === 'mfr' || 
               (unitCount >= 2 && 
                propertyType !== 'condo' && 
                propertyType !== 'condominium' && 
                propertyType !== 'single family' && 
                propertyType !== 'single-family'));
      });
      
      
      setSearchResults(filteredResults);
      setPropertyCount(data.resultCount || filteredResults.length); // Use total count from API
      setHasSearched(true);
      
      // Save search filters for pagination
      setLastSearchFilters(searchFilters);
      
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    // Close address validation dropdown
    setShowAddressSuggestions(false);
    
    // Update URL with search parameters
    const newSearchParams = new URLSearchParams();
    newSearchParams.set('q', searchQuery);
    newSearchParams.set('hasResults', 'true');
    
    // Update URL without triggering a navigation
    window.history.replaceState(null, '', `?${newSearchParams.toString()}`);
    
    // Perform the search
    await performSearch(searchQuery);
  };

  const loadMoreProperties = async () => {
    if (!lastSearchFilters || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const nextResultIndex = searchResults.length; // Use current results length as starting index
      const response = await fetch('/api/realestateapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...lastSearchFilters,
          property_type: "MFR", // Only multifamily properties
          size: 12,
          resultIndex: nextResultIndex // Start from current results length
        })
      });
      
      if (!response.ok) {
        throw new Error('Load more failed');
      }
      
      const data = await response.json();
      
      // Append new results to existing results
      setSearchResults(prev => [...prev, ...(data.data || [])]);
      setCurrentPage(prev => prev + 1);
      
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Reset all filters to defaults
  const resetFilters = () => {
    setFilters({
      // Location
      city: '',
      state: '',
      zip: '',
      county: '',
      house: '',
      street: '',
      
      // Number of Units
      units_min: '',
      units_max: '',
      
      // Owner Information
      in_state_owner: null,
      out_of_state_owner: null,
      corporate_owned: null,
      years_owned_min: '',
      years_owned_max: '',
      
      // Sale History
      last_sale_price_min: '',
      last_sale_price_max: '',
      mls_active: null,
      last_sale_arms_length: null,
      
      // Physical Characteristics
      year_built_min: '',
      year_built_max: '',
      flood_zone: null,
      
      // Financial Information
      assessed_value_min: '',
      assessed_value_max: '',
      value_min: '',
      value_max: '',
      
      // Distress & Special Conditions
      assumable: null,
      reo: null,
      pre_foreclosure: null
    });
  };

  // Apply saved search and trigger search
  const applySavedSearch = async (savedSearch: any) => {
    setIsSearching(true);
    
    try {
      // Clear previous search results
      setSearchResults([]);
      setPropertyCount(0);
      
      if (savedSearch.criteria.specialQuery) {
        // Handle smart queries - make direct API call
        const { apiFields } = savedSearch.criteria;
        
        let apiParams: any = {
          propertyType: "MFR",
          count: false,
          size: 12,
          resultIndex: 0,
          obfuscate: false,
          summary: false
        };
        
        // Add location if available
        if (searchQuery.trim()) {
          const locationParts = searchQuery.split(',').map(s => s.trim());
          const zipPattern = /^\d{5}(-\d{4})?$/;
          const zipMatch = searchQuery.match(/\b\d{5}(-\d{4})?\b/);
          
          if (zipMatch && locationParts.length === 1) {
            apiParams.zip = zipMatch[0];
          } else if (locationParts.length >= 2) {
            const firstPart = locationParts[0];
            // Check if first part contains "County" - if so, use county parameter instead of city
            if (firstPart.toLowerCase().includes('county')) {
              apiParams.county = firstPart;
            } else {
              apiParams.city = firstPart;
            }
            
            const lastPart = locationParts[1].trim();
            const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
            if (stateZipMatch) {
              apiParams.state = stateZipMatch[1].toUpperCase();
              if (stateZipMatch[2]) apiParams.zip = stateZipMatch[2];
            }
          }
        }
        
        // Add smart query specific fields
        if (apiFields.or && Array.isArray(apiFields.or)) {
          // Queries with "or" conditions (Fix & Flip Opportunities)
          apiParams.or = apiFields.or;
          // Also add any other non-"or" fields
          Object.keys(apiFields).forEach(key => {
            if (key !== 'or') {
              apiParams[key] = apiFields[key];
            }
          });
        } else {
          // Other smart queries - use direct fields
          Object.keys(apiFields).forEach(key => {
            apiParams[key] = apiFields[key];
          });
        }
        
        // Remove empty values
        Object.keys(apiParams).forEach(key => {
          const value = apiParams[key];
          if (value === '' || value === null || value === undefined) {
            delete apiParams[key];
          }
        });
        
        // Make API call
        const response = await fetch('/api/realestateapi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiParams)
        });
        
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.data || []);
          setPropertyCount(data.resultCount || data.data?.length || 0);
          setHasSearched(true);
        } else {
          console.error('Smart query search failed:', await response.text());
          setSearchResults([]);
          setPropertyCount(0);
          setHasSearched(true);
        }
      }
      
      // Collapse the saved searches section after applying
      setCollapsedSections(prev => ({ ...prev, savedSearches: true }));
      
    } catch (error) {
      console.error('Error executing saved search:', error);
      setSearchResults([]);
      setPropertyCount(0);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string; hover: string } } = {
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', hover: 'hover:bg-green-100' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', hover: 'hover:bg-orange-100' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hover: 'hover:bg-blue-100' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hover: 'hover:bg-purple-100' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', hover: 'hover:bg-indigo-100' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', hover: 'hover:bg-yellow-100' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', hover: 'hover:bg-red-100' }
    };
    return colorMap[color] || colorMap.blue;
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
      const response = await fetch(`/api/v2/places-autocomplete?input=${encodeURIComponent(input)}`);
      
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

  // Load user's saved searches
  const loadMySearches = async () => {
    if (!user) return;
    
    setIsLoadingMySearches(true);
    try {
      const response = await fetch('/api/v2/saved-searches');
      if (response.ok) {
        const data = await response.json();
        setMySearches(data.data || []);
      } else {
        console.error('Failed to load saved searches');
      }
    } catch (error) {
      console.error('Error loading saved searches:', error);
    } finally {
      setIsLoadingMySearches(false);
    }
  };

  // Show delete confirmation modal
  const deleteSavedSearch = (searchId: string) => {
    const search = mySearches.find(s => s.id === searchId);
    setSearchToDelete(search);
    setShowDeleteModal(true);
  };

  // Actually delete the search after confirmation
  const confirmDeleteSearch = async () => {
    if (!searchToDelete) return;
    
    try {
      const response = await fetch(`/api/v2/saved-searches?id=${searchToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        setMySearches(prev => prev.filter(s => s.id !== searchToDelete.id));
        setShowDeleteModal(false);
        setSearchToDelete(null);
      } else {
        console.error('Failed to delete saved search');
        alert('Failed to delete search. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting saved search:', error);
      alert('Failed to delete search. Please try again.');
    }
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return;
    
    try {
      // Save ALL current filters and search query
      const searchFilters = {
        ...filters, // Save all current filter values
        searchQuery: searchQuery
      };
      
      console.log('Saving search with data:', {
        name: saveSearchName.trim(),
        description: saveSearchDescription.trim() || null,
        filters: searchFilters
      });

      const response = await fetch('/api/v2/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: saveSearchName.trim(),
          description: saveSearchDescription.trim() || null,
          filters: searchFilters
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Save search failed:', response.status, errorData);
        throw new Error(`Failed to save search: ${response.status} ${errorData}`);
      }

      // Reset form fields
      setSaveSearchName('');
      setSaveSearchDescription('');
      
      // Show success message
      setSaveSearchSuccess(true);
      
      // Auto-hide success message and close modal after 2 seconds
      setTimeout(() => {
        setSaveSearchSuccess(false);
        setShowSaveModal(false);
      }, 2000);
      
      // Reload saved searches to show the new one
      loadMySearches();
      
    } catch (error) {
      console.error('Error saving search:', error);
      alert('Failed to save search. Please try again.');
    }
  };

  // Handle editing a smart search (populate filters without executing)
  const handleEditSmartSearch = (search: any) => {
    if (search.criteria && search.criteria.apiFields) {
      // Map criteria fields to filter sections
      const fieldToSection: { [key: string]: string } = {
        units_min: 'units',
        units_max: 'units',
        in_state_owner: 'owner',
        out_of_state_owner: 'owner',
        corporate_owned: 'owner',
        years_owned_min: 'owner',
        years_owned_max: 'owner',
        last_sale_price_min: 'sale',
        last_sale_price_max: 'sale',
        mls_active: 'sale',
        last_sale_arms_length: 'sale',
        year_built_min: 'physical',
        year_built_max: 'physical',
        flood_zone: 'physical',
        assessed_value_min: 'financial',
        assessed_value_max: 'financial',
        value_min: 'financial',
        value_max: 'financial',
        estimated_value_min: 'financial',
        assumable: 'distress',
        reo: 'distress',
        pre_foreclosure: 'distress'
      };

      // Find which sections contain the search criteria
      const sectionsToExpand = new Set<string>();
      Object.keys(search.criteria.apiFields).forEach(field => {
        if (fieldToSection[field]) {
          sectionsToExpand.add(fieldToSection[field]);
        }
      });

      // First reset all filters to defaults, preserving location
      const defaultFilters = {
        // Location - preserve current values
        city: filters.city,
        state: filters.state,
        zip: filters.zip,
        house: filters.house,
        street: filters.street,
        
        // Reset all other filters to defaults
        units_min: '',
        units_max: '',
        in_state_owner: null,
        out_of_state_owner: null,
        corporate_owned: null,
        years_owned_min: '',
        years_owned_max: '',
        last_sale_price_min: '',
        last_sale_price_max: '',
        mls_active: null,
        last_sale_arms_length: null,
        year_built_min: '',
        year_built_max: '',
        flood_zone: null,
        assessed_value_min: '',
        assessed_value_max: '',
        value_min: '',
        value_max: '',
        assumable: null,
        reo: null,
        pre_foreclosure: null
      };
      
      // Apply smart search criteria to the form (don't execute search)
      setFilters({ ...defaultFilters, ...search.criteria.apiFields });
      
      // Expand relevant filter sections
      setCollapsedSections(prev => {
        const newCollapsed = { ...prev };
        sectionsToExpand.forEach(section => {
          if (section in newCollapsed) {
            (newCollapsed as any)[section] = false;
          }
        });
        return newCollapsed;
      });
      
      // Scroll to first relevant section after a short delay
      setTimeout(() => {
        const firstSection = Array.from(sectionsToExpand)[0];
        if (firstSection) {
          const element = document.querySelector(`[data-section="${firstSection}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);
    }
  };

  // Handle executing a smart search (populate filters and execute)
  const handleExecuteSmartSearch = async (search: any) => {
    if (search.criteria && search.criteria.apiFields) {
      // First reset all filters to defaults, preserving location
      const defaultFilters = {
        // Location - preserve current values
        city: filters.city,
        state: filters.state,
        zip: filters.zip,
        house: filters.house,
        street: filters.street,
        
        // Reset all other filters to defaults
        units_min: '',
        units_max: '',
        in_state_owner: null,
        out_of_state_owner: null,
        corporate_owned: null,
        years_owned_min: '',
        years_owned_max: '',
        last_sale_price_min: '',
        last_sale_price_max: '',
        mls_active: null,
        last_sale_arms_length: null,
        year_built_min: '',
        year_built_max: '',
        flood_zone: null,
        assessed_value_min: '',
        assessed_value_max: '',
        value_min: '',
        value_max: '',
        assumable: null,
        reo: null,
        pre_foreclosure: null
      };
      
      // Apply smart search criteria to the form
      setFilters({ ...defaultFilters, ...search.criteria.apiFields });
      
      // Execute the search automatically
      setTimeout(() => {
        handleSearch();
      }, 100); // Small delay to ensure filters are updated
    }
  };

  // Handle editing a saved search (populate filters without executing)
  const handleEditSavedSearch = (search: any) => {
    if (search.filters) {
      // Find which sections contain the search criteria
      const fieldToSection: { [key: string]: string } = {
        units_min: 'units',
        units_max: 'units',
        in_state_owner: 'owner',
        out_of_state_owner: 'owner',
        corporate_owned: 'owner',
        years_owned_min: 'owner',
        years_owned_max: 'owner',
        last_sale_price_min: 'sale',
        last_sale_price_max: 'sale',
        mls_active: 'sale',
        last_sale_arms_length: 'sale',
        year_built_min: 'physical',
        year_built_max: 'physical',
        flood_zone: 'physical',
        assessed_value_min: 'financial',
        assessed_value_max: 'financial',
        value_min: 'financial',
        value_max: 'financial',
        estimated_value_min: 'financial',
        assumable: 'distress',
        reo: 'distress',
        pre_foreclosure: 'distress'
      };

      const sectionsToExpand = new Set<string>();
      Object.keys(search.filters).forEach(field => {
        if (fieldToSection[field] && search.filters[field] !== null && search.filters[field] !== '') {
          sectionsToExpand.add(fieldToSection[field]);
        }
      });

      // First reset all filters to defaults, preserving location
      const defaultFilters = {
        // Location - preserve current values
        city: filters.city,
        state: filters.state,
        zip: filters.zip,
        house: filters.house,
        street: filters.street,
        
        // Reset all other filters to defaults
        units_min: '',
        units_max: '',
        in_state_owner: null,
        out_of_state_owner: null,
        corporate_owned: null,
        years_owned_min: '',
        years_owned_max: '',
        last_sale_price_min: '',
        last_sale_price_max: '',
        mls_active: null,
        last_sale_arms_length: null,
        year_built_min: '',
        year_built_max: '',
        flood_zone: null,
        assessed_value_min: '',
        assessed_value_max: '',
        value_min: '',
        value_max: '',
        assumable: null,
        reo: null,
        pre_foreclosure: null
      };
      
      // Apply saved search criteria to the form (don't execute search)
      setFilters({ ...defaultFilters, ...search.filters });
      
      // Set search query if saved
      if (search.filters.searchQuery) {
        setSearchQuery(search.filters.searchQuery);
      }
      
      // Expand relevant filter sections
      setCollapsedSections(prev => {
        const newCollapsed = { ...prev };
        sectionsToExpand.forEach(section => {
          if (section in newCollapsed) {
            (newCollapsed as any)[section] = false;
          }
        });
        return newCollapsed;
      });
      
      // Scroll to first relevant section after a short delay
      setTimeout(() => {
        const firstSection = Array.from(sectionsToExpand)[0];
        if (firstSection) {
          const element = document.querySelector(`[data-section="${firstSection}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);
    }
  };

  // Handle executing a saved search (populate filters and execute)
  const handleExecuteSavedSearch = async (search: any) => {
    if (search.filters) {
      // First reset all filters to defaults, preserving location
      const defaultFilters = {
        // Location - preserve current values
        city: filters.city,
        state: filters.state,
        zip: filters.zip,
        house: filters.house,
        street: filters.street,
        
        // Reset all other filters to defaults
        units_min: '',
        units_max: '',
        in_state_owner: null,
        out_of_state_owner: null,
        corporate_owned: null,
        years_owned_min: '',
        years_owned_max: '',
        last_sale_price_min: '',
        last_sale_price_max: '',
        mls_active: null,
        last_sale_arms_length: null,
        year_built_min: '',
        year_built_max: '',
        flood_zone: null,
        assessed_value_min: '',
        assessed_value_max: '',
        value_min: '',
        value_max: '',
        assumable: null,
        reo: null,
        pre_foreclosure: null
      };
      
      // Apply saved search criteria to the form
      setFilters({ ...defaultFilters, ...search.filters });
      
      // Set search query if saved
      if (search.filters.searchQuery) {
        setSearchQuery(search.filters.searchQuery);
      }
      
      // Execute the search automatically
      setTimeout(() => {
        handleSearch();
      }, 100); // Small delay to ensure filters are updated
    }
  };

  return (
    <div>
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
                className="w-full pl-12 pr-4 py-3 text-base lg:text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              
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
              
              {/* Search Button */}
              <div className="pb-4 border-b border-gray-200 mb-4">
                <button 
                  onClick={handleSearch}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center text-sm"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Properties
                </button>
                
                {/* Save Search Button - Only show when filters are set */}
                {hasFiltersSet() && (
                  <button 
                    onClick={() => setShowSaveModal(true)}
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center text-sm mt-2"
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save This Search
                  </button>
                )}
              </div>
              
              {/* Reset Button */}
              <div className="pb-6 border-b border-gray-200 mb-6">
                <button
                  onClick={resetFilters}
                  className="w-full text-gray-600 hover:text-gray-900 text-sm font-medium py-2 px-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Reset All Filters
                </button>
              </div>

              {/* Number of Units */}
              <CollapsibleFilterSection 
                title="NUMBER OF UNITS" 
                isCollapsed={collapsedSections.units}
                onToggle={() => toggleSection('units')}
                sectionKey="units"
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
                sectionKey="owner"
              >
                <FilterGroup label="Owner Location">
                  <ToggleButton 
                    active={filters.in_state_owner === null && filters.out_of_state_owner === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => {
                      updateFilter('in_state_owner', null);
                      updateFilter('out_of_state_owner', null);
                    }}
                  />
                  <ToggleButton 
                    active={filters.in_state_owner === true} 
                    label="In State"
                    onClick={() => {
                      updateFilter('in_state_owner', true);
                      updateFilter('out_of_state_owner', null);
                    }}
                  />
                  <ToggleButton 
                    active={filters.out_of_state_owner === true} 
                    label="Out of State"
                    onClick={() => {
                      updateFilter('in_state_owner', null);
                      updateFilter('out_of_state_owner', true);
                    }}
                  />
                </FilterGroup>
                
                <FilterGroup label="Corporate Owned">
                  <ToggleButton 
                    active={filters.corporate_owned === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => updateFilter('corporate_owned', null)}
                  />
                  <ToggleButton 
                    active={filters.corporate_owned === true} 
                    label="Yes"
                    onClick={() => updateFilter('corporate_owned', true)}
                  />
                  <ToggleButton 
                    active={filters.corporate_owned === false} 
                    label="No"
                    onClick={() => updateFilter('corporate_owned', false)}
                  />
                </FilterGroup>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Years Owned
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={filters.years_owned_min}
                      onChange={(e) => updateFilter('years_owned_min', e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
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
                sectionKey="sale"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Last Sale Price
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={filters.last_sale_price_min}
                      onChange={(e) => updateFilter('last_sale_price_min', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={filters.last_sale_price_max}
                      onChange={(e) => updateFilter('last_sale_price_max', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <FilterGroup label="Active MLS">
                  <ToggleButton 
                    active={filters.mls_active === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => updateFilter('mls_active', null)}
                  />
                  <ToggleButton 
                    active={filters.mls_active === true} 
                    label="Yes"
                    onClick={() => updateFilter('mls_active', true)}
                  />
                  <ToggleButton 
                    active={filters.mls_active === false} 
                    label="No"
                    onClick={() => updateFilter('mls_active', false)}
                  />
                </FilterGroup>
                
                <FilterGroup label="Last Sale Arms Length">
                  <ToggleButton 
                    active={filters.last_sale_arms_length === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => updateFilter('last_sale_arms_length', null)}
                  />
                  <ToggleButton 
                    active={filters.last_sale_arms_length === true} 
                    label="Yes"
                    onClick={() => updateFilter('last_sale_arms_length', true)}
                  />
                  <ToggleButton 
                    active={filters.last_sale_arms_length === false} 
                    label="No"
                    onClick={() => updateFilter('last_sale_arms_length', false)}
                  />
                </FilterGroup>
              </CollapsibleFilterSection>

              {/* Physical Characteristics */}
              <CollapsibleFilterSection 
                title="PHYSICAL CHARACTERISTICS" 
                isCollapsed={collapsedSections.physical}
                onToggle={() => toggleSection('physical')}
                sectionKey="physical"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Year Built
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min Year"
                      value={filters.year_built_min}
                      onChange={(e) => updateFilter('year_built_min', e.target.value)}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max Year"
                      value={filters.year_built_max}
                      onChange={(e) => updateFilter('year_built_max', e.target.value)}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <FilterGroup label="Flood Zone">
                  <ToggleButton 
                    active={filters.flood_zone === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => updateFilter('flood_zone', null)}
                  />
                  <ToggleButton 
                    active={filters.flood_zone === true} 
                    label="Yes"
                    onClick={() => updateFilter('flood_zone', true)}
                  />
                  <ToggleButton 
                    active={filters.flood_zone === false} 
                    label="No"
                    onClick={() => updateFilter('flood_zone', false)}
                  />
                </FilterGroup>
              </CollapsibleFilterSection>

              {/* Financial Information */}
              <CollapsibleFilterSection 
                title="FINANCIAL INFORMATION" 
                isCollapsed={collapsedSections.financial}
                onToggle={() => toggleSection('financial')}
                sectionKey="financial"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Assessed Value
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={filters.assessed_value_min}
                      onChange={(e) => updateFilter('assessed_value_min', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={filters.assessed_value_max}
                      onChange={(e) => updateFilter('assessed_value_max', e.target.value)}
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
                      placeholder="Min"
                      value={filters.value_min}
                      onChange={(e) => updateFilter('value_min', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={filters.value_max}
                      onChange={(e) => updateFilter('value_max', e.target.value)}
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
                sectionKey="distress"
              >
                <FilterGroup label="Assumable">
                  <ToggleButton 
                    active={filters.assumable === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => updateFilter('assumable', null)}
                  />
                  <ToggleButton 
                    active={filters.assumable === true} 
                    label="Yes"
                    onClick={() => updateFilter('assumable', true)}
                  />
                  <ToggleButton 
                    active={filters.assumable === false} 
                    label="No"
                    onClick={() => updateFilter('assumable', false)}
                  />
                </FilterGroup>
                
                <FilterGroup label="REO">
                  <ToggleButton 
                    active={filters.reo === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => updateFilter('reo', null)}
                  />
                  <ToggleButton 
                    active={filters.reo === true} 
                    label="Yes"
                    onClick={() => updateFilter('reo', true)}
                  />
                  <ToggleButton 
                    active={filters.reo === false} 
                    label="No"
                    onClick={() => updateFilter('reo', false)}
                  />
                </FilterGroup>
                
                <FilterGroup label="Pre-Foreclosure">
                  <ToggleButton 
                    active={filters.pre_foreclosure === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => updateFilter('pre_foreclosure', null)}
                  />
                  <ToggleButton 
                    active={filters.pre_foreclosure === true} 
                    label="Yes"
                    onClick={() => updateFilter('pre_foreclosure', true)}
                  />
                  <ToggleButton 
                    active={filters.pre_foreclosure === false} 
                    label="No"
                    onClick={() => updateFilter('pre_foreclosure', false)}
                  />
                </FilterGroup>
              </CollapsibleFilterSection>

              {/* Smart Searches */}
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mt-4">
                <CollapsibleFilterSection 
                  title="SMART SEARCHES" 
                  isCollapsed={collapsedSections.savedSearches}
                  onToggle={() => toggleSection('savedSearches')}
                >
                <div className="space-y-3">
                  {savedSearches.map((search) => {
                    const colorClasses = getColorClasses(search.color);
                    const Icon = search.icon;
                    
                    return (
                      <div
                        key={search.id}
                        className={`${colorClasses.bg} ${colorClasses.border} border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${colorClasses.hover} relative`}
                        onClick={() => handleExecuteSmartSearch(search)}
                      >
                        <div className="flex items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">{search.name}</h4>
                            <div className="text-xs text-gray-500 space-y-0.5">
                              {search.criteria.apiFields.out_of_state_owner && (
                                <div>• Out-of-state owners</div>
                              )}
                              {search.criteria.apiFields.years_owned_min && (
                                <div>• Owned {search.criteria.apiFields.years_owned_min}+ years</div>
                              )}
                              {search.criteria.apiFields.year_built_min && search.criteria.apiFields.year_built_max && (
                                <div>• Built {search.criteria.apiFields.year_built_min}-{search.criteria.apiFields.year_built_max}</div>
                              )}
                              {search.criteria.apiFields.year_built_min && !search.criteria.apiFields.year_built_max && (
                                <div>• Built {search.criteria.apiFields.year_built_min}+</div>
                              )}
                              {search.criteria.apiFields.estimated_value_min && (
                                <div>• Value ${(search.criteria.apiFields.estimated_value_min / 1000000).toFixed(1)}M+</div>
                              )}
                              {search.criteria.apiFields.private_lender && (
                                <div>• Private financing</div>
                              )}
                              {search.criteria.apiFields.or && (
                                <div>• Distressed properties</div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Edit Button - Positioned at bottom right */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSmartSearch(search);
                          }}
                          className="absolute bottom-2 right-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Edit search criteria"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleFilterSection>
              </div>

              {/* My Searches */}
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 mt-4">
                <CollapsibleFilterSection 
                  title="MY SEARCHES" 
                  isCollapsed={collapsedSections.mySearches}
                  onToggle={() => toggleSection('mySearches')}
                >
                <div className="space-y-3">
                  {isLoadingMySearches ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : mySearches.length > 0 ? (
                    mySearches.map((search) => (
                      <div
                        key={search.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm hover:bg-gray-100 relative"
                        onClick={() => handleExecuteSavedSearch(search)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">{search.name}</h4>
                            {search.description && (
                              <p className="text-xs text-gray-600 mb-2">{search.description}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              Saved {new Date(search.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSavedSearch(search.id);
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete search"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Edit Button - Positioned at bottom right */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSavedSearch(search);
                          }}
                          className="absolute bottom-2 right-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Edit search criteria"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Bookmark className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No saved searches yet</p>
                      <p className="text-xs text-gray-400 mt-1">Create a search above to save it here</p>
                    </div>
                  )}
                </div>
              </CollapsibleFilterSection>
              </div>

              {/* Search button moved to top */}

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
                  {isLoadingRecent ? 'Loading...' : recentProperties.length > 0 && !hasSearched 
                    ? locationFilter 
                      ? `${recentProperties.length} of ${getFilteredFavorites().length} filtered favorites`
                      : `${recentProperties.length} of ${totalFavoritesCount} favorites`
                    : `${propertyCount} properties`}
                </span>
                
                {/* View Toggle */}
                {(hasSearched || recentProperties.length > 0) && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
                        viewMode === 'cards'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Grid3x3 className="h-4 w-4 mr-2" />
                      Cards
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
                        viewMode === 'map'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Map className="h-4 w-4 mr-2" />
                      Map + Cards
                    </button>
                  </div>
                )}
                
                {/* Remove sort dropdown - favorites always show by recency */}
              </div>
            </div>


            {/* Results or Empty State */}
            {isLoadingRecent || isRestoringSearch ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">
                  {isRestoringSearch ? 'Restoring search results...' : 'Loading...'}
                </span>
              </div>
            ) : recentProperties.length > 0 && !hasSearched ? (
              <div>
                {/* Recent Properties Grid */}
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentProperties.map((property, index) => (
                      <RecentPropertyCard 
                        key={property.property_id || property.id || `property-${index}`} 
                        property={property}
                        onToggleFavorite={toggleFavorite} 
                        searchQuery={searchQuery}
                        hasSearched={hasSearched}
                        viewMode={viewMode}
                        recentProperties={recentProperties}
                        searchResults={searchResults}
                      />
                    ))}
                  </div>
                ) : (
                  /* Map + Card Combined View for Favorites */
                  <div className="flex gap-6 h-[600px]">
                    {/* Left: Map */}
                    <div className="w-2/5">
                      <PropertyMap
                        properties={recentProperties}
                        className="h-full rounded-lg border border-gray-200"
                        context="discover"
                        currentViewMode={viewMode}
                        isShowingFavorites={true}
                        hasSearched={false}
                      />
                    </div>
                    
                    {/* Right: Cards in 2-column grid */}
                    <div className="flex-1 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4 pr-4">
                        {recentProperties.map((property, index) => (
                          <RecentPropertyCard 
                            key={property.property_id || property.id || `property-${index}`} 
                            property={property}
                            onToggleFavorite={toggleFavorite} 
                            searchQuery={searchQuery}
                            hasSearched={hasSearched}
                            viewMode={viewMode}
                            recentProperties={recentProperties}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Load More Favorites Button */}
                {getFilteredFavorites().length > recentProperties.length && (
                  <div className="text-center py-8">
                    <button 
                      onClick={loadMoreFavorites}
                      disabled={isLoadingMoreFavorites}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isLoadingMoreFavorites ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Loading More Favorites...
                        </>
                      ) : (
                        `Load More Favorites (${getFilteredFavorites().length - recentProperties.length} remaining)`
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : hasSearched ? (
              <div>
                {viewMode === 'cards' ? (
                  /* Card View Only */
                  <>
                    {/* Search Results Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {searchResults.length > 0 ? (
                        searchResults.map((property, i) => (
                          <PropertyCard 
                            key={property.id || i} 
                            property={property} 
                            searchQuery={searchQuery}
                            hasSearched={hasSearched}
                            favoritePropertyIds={favoritePropertyIds}
                            onToggleFavorite={toggleFavorite}
                            viewMode={viewMode}
                            recentProperties={recentProperties}
                            searchResults={searchResults}
                          />
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">No properties found. Try adjusting your search criteria.</p>
                        </div>
                      )}
                    </div>
                    
                    {searchResults.length > 0 && propertyCount > searchResults.length && (
                      <div className="text-center py-8">
                        <button 
                          onClick={loadMoreProperties}
                          disabled={isLoadingMore}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isLoadingMore ? (
                            <>
                              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Loading More...
                            </>
                          ) : (
                            `Load More Properties (${propertyCount - searchResults.length} remaining)`
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Map + Card Combined View */
                  <div className="flex gap-6 h-[600px]">
                    {/* Left: Map */}
                    <div className="w-2/5">
                      <PropertyMap
                        properties={searchResults}
                        className="h-full rounded-lg border border-gray-200"
                        context="discover"
                        currentViewMode={viewMode}
                        isShowingFavorites={false}
                        searchQuery={searchQuery}
                        hasSearched={hasSearched}
                      />
                    </div>
                    
                    {/* Right: Cards in 2-column grid */}
                    <div className="flex-1 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4 pr-4">
                        {searchResults.length > 0 ? (
                          searchResults.map((property, i) => (
                            <PropertyCard 
                              key={property.id || i} 
                              property={property} 
                              searchQuery={searchQuery}
                              hasSearched={hasSearched}
                              favoritePropertyIds={favoritePropertyIds}
                              onToggleFavorite={toggleFavorite}
                              viewMode={viewMode}
                              recentProperties={recentProperties}
                            />
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-8">
                            <p className="text-gray-500">No properties found. Try adjusting your search criteria.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start Your Property Search</h3>
                <p className="text-gray-600 mb-2">
                  Enter a location above and use the filters to find multifamily investment opportunities.
                </p>
                <p className="text-gray-600 mb-2 font-medium">OR</p>
                <p className="text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
                   onClick={() => {
                     // Clear search state and show favorites
                     setSearchQuery('');
                     setSearchResults([]);
                     setHasSearched(false);
                     
                     // If we have recent properties, update count, otherwise reload them
                     if (recentProperties.length > 0) {
                       setPropertyCount(recentProperties.length);
                     } else {
                       // Reload favorites if none are currently loaded
                       setIsLoadingRecent(true);
                       loadUserFavorites().then(() => {
                         // This will trigger the useEffect to reload recent properties
                         window.location.reload();
                       });
                     }
                     
                     // Update URL to remove search params
                     window.history.replaceState(null, '', window.location.pathname);
                   }}
                >
                  Show me my recent favorites
                </p>
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
                {/* Search Button */}
                <div className="pb-4 border-b border-gray-200">
                  <button 
                    onClick={() => {
                      handleSearch();
                      setShowMobileFilters(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center text-sm"
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
                      className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center text-sm mt-2"
                    >
                      <Bookmark className="h-4 w-4 mr-2" />
                      Save This Search
                    </button>
                  )}
                </div>
                
                {/* Reset Button */}
                <div className="pb-4 border-b border-gray-200">
                  <button
                    onClick={resetFilters}
                    className="w-full text-gray-600 hover:text-gray-900 text-sm font-medium py-2 px-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Reset All Filters
                  </button>
                </div>

                {/* Number of Units */}
                <CollapsibleFilterSection 
                  title="NUMBER OF UNITS" 
                  isCollapsed={collapsedSections.units}
                  onToggle={() => toggleSection('units')}
                  sectionKey="units"
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
                  sectionKey="owner"
                >
                  <FilterGroup label="Owner Location">
                    <ToggleButton 
                      active={filters.in_state_owner === null && filters.out_of_state_owner === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => {
                        updateFilter('in_state_owner', null);
                        updateFilter('out_of_state_owner', null);
                      }}
                    />
                    <ToggleButton 
                      active={filters.in_state_owner === true} 
                      label="In State"
                      onClick={() => {
                        updateFilter('in_state_owner', true);
                        updateFilter('out_of_state_owner', null);
                      }}
                    />
                    <ToggleButton 
                      active={filters.out_of_state_owner === true} 
                      label="Out of State"
                      onClick={() => {
                        updateFilter('in_state_owner', null);
                        updateFilter('out_of_state_owner', true);
                      }}
                    />
                  </FilterGroup>
                  
                  <FilterGroup label="Corporate Owned">
                    <ToggleButton 
                      active={filters.corporate_owned === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => updateFilter('corporate_owned', null)}
                    />
                    <ToggleButton 
                      active={filters.corporate_owned === true} 
                      label="Yes"
                      onClick={() => updateFilter('corporate_owned', true)}
                    />
                    <ToggleButton 
                      active={filters.corporate_owned === false} 
                      label="No"
                      onClick={() => updateFilter('corporate_owned', false)}
                    />
                  </FilterGroup>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Years Owned
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={filters.years_owned_min}
                        onChange={(e) => updateFilter('years_owned_min', e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max"
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
                  sectionKey="sale"
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Last Sale Price
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={filters.last_sale_price_min}
                        onChange={(e) => updateFilter('last_sale_price_min', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={filters.last_sale_price_max}
                        onChange={(e) => updateFilter('last_sale_price_max', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <FilterGroup label="Active MLS">
                    <ToggleButton 
                      active={filters.mls_active === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => updateFilter('mls_active', null)}
                    />
                    <ToggleButton 
                      active={filters.mls_active === true} 
                      label="Yes"
                      onClick={() => updateFilter('mls_active', true)}
                    />
                    <ToggleButton 
                      active={filters.mls_active === false} 
                      label="No"
                      onClick={() => updateFilter('mls_active', false)}
                    />
                  </FilterGroup>
                  
                  <FilterGroup label="Last Sale Arms Length">
                    <ToggleButton 
                      active={filters.last_sale_arms_length === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => updateFilter('last_sale_arms_length', null)}
                    />
                    <ToggleButton 
                      active={filters.last_sale_arms_length === true} 
                      label="Yes"
                      onClick={() => updateFilter('last_sale_arms_length', true)}
                    />
                    <ToggleButton 
                      active={filters.last_sale_arms_length === false} 
                      label="No"
                      onClick={() => updateFilter('last_sale_arms_length', false)}
                    />
                  </FilterGroup>
                </CollapsibleFilterSection>

                {/* Physical Characteristics */}
                <CollapsibleFilterSection 
                  title="PHYSICAL CHARACTERISTICS" 
                  isCollapsed={collapsedSections.physical}
                  onToggle={() => toggleSection('physical')}
                  sectionKey="physical"
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Year Built
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="Min Year"
                        value={filters.year_built_min}
                        onChange={(e) => updateFilter('year_built_min', e.target.value)}
                        className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max Year"
                        value={filters.year_built_max}
                        onChange={(e) => updateFilter('year_built_max', e.target.value)}
                        className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <FilterGroup label="Flood Zone">
                    <ToggleButton 
                      active={filters.flood_zone === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => updateFilter('flood_zone', null)}
                    />
                    <ToggleButton 
                      active={filters.flood_zone === true} 
                      label="Yes"
                      onClick={() => updateFilter('flood_zone', true)}
                    />
                    <ToggleButton 
                      active={filters.flood_zone === false} 
                      label="No"
                      onClick={() => updateFilter('flood_zone', false)}
                    />
                  </FilterGroup>
                </CollapsibleFilterSection>

                {/* Financial Information */}
                <CollapsibleFilterSection 
                  title="FINANCIAL INFORMATION" 
                  isCollapsed={collapsedSections.financial}
                  onToggle={() => toggleSection('financial')}
                  sectionKey="financial"
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Assessed Value
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={filters.assessed_value_min}
                        onChange={(e) => updateFilter('assessed_value_min', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={filters.assessed_value_max}
                        onChange={(e) => updateFilter('assessed_value_max', e.target.value)}
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
                        placeholder="Min"
                        value={filters.value_min}
                        onChange={(e) => updateFilter('value_min', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={filters.value_max}
                        onChange={(e) => updateFilter('value_max', e.target.value)}
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
                  sectionKey="distress"
                >
                  <FilterGroup label="Assumable">
                    <ToggleButton 
                      active={filters.assumable === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => updateFilter('assumable', null)}
                    />
                    <ToggleButton 
                      active={filters.assumable === true} 
                      label="Yes"
                      onClick={() => updateFilter('assumable', true)}
                    />
                    <ToggleButton 
                      active={filters.assumable === false} 
                      label="No"
                      onClick={() => updateFilter('assumable', false)}
                    />
                  </FilterGroup>
                  
                  <FilterGroup label="REO">
                    <ToggleButton 
                      active={filters.reo === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => updateFilter('reo', null)}
                    />
                    <ToggleButton 
                      active={filters.reo === true} 
                      label="Yes"
                      onClick={() => updateFilter('reo', true)}
                    />
                    <ToggleButton 
                      active={filters.reo === false} 
                      label="No"
                      onClick={() => updateFilter('reo', false)}
                    />
                  </FilterGroup>
                  
                  <FilterGroup label="Pre-Foreclosure">
                    <ToggleButton 
                      active={filters.pre_foreclosure === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => updateFilter('pre_foreclosure', null)}
                    />
                    <ToggleButton 
                      active={filters.pre_foreclosure === true} 
                      label="Yes"
                      onClick={() => updateFilter('pre_foreclosure', true)}
                    />
                    <ToggleButton 
                      active={filters.pre_foreclosure === false} 
                      label="No"
                      onClick={() => updateFilter('pre_foreclosure', false)}
                    />
                  </FilterGroup>
                </CollapsibleFilterSection>
              </div>

              {/* Search button moved to top */}
            </div>
          </div>
        </div>
      )}

      {/* Save Search Modal */}
      <StandardModalWithActions
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Search"
        size="md"
        primaryAction={!saveSearchSuccess ? {
          label: "Save Search",
          onClick: handleSaveSearch,
          type: "submit"
        } : undefined}
        secondaryAction={!saveSearchSuccess ? {
          label: "Cancel",
          onClick: () => setShowSaveModal(false)
        } : undefined}
      >
        {saveSearchSuccess ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Saved Successfully!</h3>
            <p className="text-sm text-gray-600">You can now access this search from your saved searches.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Save your current search criteria so you can easily find similar properties later.
            </p>

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
            </form>
          </>
        )}
      </StandardModalWithActions>

      {/* Delete Search Confirmation Modal */}
      <StandardModalWithActions
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSearchToDelete(null);
        }}
        title="Delete Search"
        size="sm"
        primaryAction={{
          label: "Delete Search",
          onClick: confirmDeleteSearch,
          variant: "danger"
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => {
            setShowDeleteModal(false);
            setSearchToDelete(null);
          }
        }}
      >
        <div className="py-2">
          <p className="text-sm text-gray-600 mb-2">
            Are you sure you want to delete <strong>"{searchToDelete?.name}"</strong>?
          </p>
          <p className="text-xs text-gray-500">
            This action cannot be undone.
          </p>
        </div>
      </StandardModalWithActions>
    </div>
    </div>
  );
}

// Helper Components

function CollapsibleFilterSection({ 
  title, 
  children, 
  isCollapsed, 
  onToggle,
  sectionKey
}: { 
  title: string; 
  children: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  sectionKey?: string;
}) {
  return (
    <div className="border-b border-gray-200 pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0" data-section={sectionKey}>
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

function RecentPropertyCard({ 
  property, 
  searchQuery = '', 
  hasSearched = false,
  onToggleFavorite,
  viewMode = 'cards',
  recentProperties = [],
  searchResults = []
}: { 
  property: any;
  searchQuery?: string;
  hasSearched?: boolean;
  onToggleFavorite?: (property: any, event: React.MouseEvent) => void;
  viewMode?: string;
  recentProperties?: any[];
  searchResults?: any[];
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Property Image */}
      <div className="relative">
        <div 
          className="relative aspect-[4/3] bg-gray-200 cursor-pointer group"
          onClick={() => {
            const address = `${property.address_full || property.address_street}, ${property.address_city}, ${property.address_state} ${property.address_zip}`;
            const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
            window.open(mapsUrl, '_blank');
          }}
        >
          <img 
            src={(() => {
              const address = `${property.address_full || property.address_street}, ${property.address_city}, ${property.address_state} ${property.address_zip}`;
              return `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
            })()}
            alt={`Street view of ${property.address_full || property.address_street}`}
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
        
        {/* Heart Favorite Button - Already favorited */}
        <button 
          onClick={(e) => onToggleFavorite?.(property, e)}
          className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors cursor-pointer"
        >
          <Heart className="h-4 w-4 text-red-500 fill-current" />
        </button>
        
        {/* Zillow Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const address = property.address_full || property.address_street || '';
            const zillowUrl = `https://www.zillow.com/homes/${address.replace(/\s+/g, '-')}-${property.address_city}-${property.address_state}-${property.address_zip}_rb/`;
            window.open(zillowUrl, '_blank');
          }}
          className="absolute bottom-3 right-3 bg-white/95 hover:bg-white rounded-lg p-2 shadow-sm transition-colors group cursor-pointer"
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
          {property.address_full}
        </h3>
        
        {/* Location and Basic Info */}
        <p className="text-sm text-gray-600 mb-3">
          {property.address_city}, {property.address_state} • {property.units} Units • Built {property.year_built}
        </p>

        {/* Price */}
        <div className="mb-3">
          <div className="text-xl font-bold text-gray-900">
            ${property.estimated_value ? parseInt(property.estimated_value).toLocaleString() : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">
            Assessed: <span className="font-medium text-gray-600">
              ${property.assessed_value ? parseInt(property.assessed_value).toLocaleString() : 'N/A'}
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
            onClick={() => {
              // Create a clean back URL for the discover page
              const baseUrl = new URL('/v2/discover', window.location.origin);
              baseUrl.searchParams.set('viewMode', viewMode);
              
              if (hasSearched && (searchResults.length > 0 || searchQuery)) {
                // We have search results or an active search, preserve search state
                if (searchQuery) {
                  baseUrl.searchParams.set('q', searchQuery);
                }
                baseUrl.searchParams.set('hasResults', 'true');
              } else if (!hasSearched && recentProperties.length > 0) {
                // We're in favorites mode, preserve that
                baseUrl.searchParams.set('showingFavorites', 'true');
              }
              
              const backUrl = encodeURIComponent(baseUrl.toString());
              window.location.href = `/v2/discover/property/${property.property_id}?back=${backUrl}`;
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
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
  color = 'gray',
  onClick
}: { 
  active: boolean; 
  label: string; 
  color?: 'blue' | 'gray';
  onClick?: () => void;
}) {
  const baseClasses = "px-3 py-1 text-sm font-medium rounded transition-colors";
  const activeClasses = color === 'blue' 
    ? "bg-blue-500 text-white" 
    : "bg-gray-600 text-white";
  const inactiveClasses = "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50";
  
  return (
    <button 
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PropertyCard({ 
  property, 
  searchQuery = '', 
  hasSearched = false,
  favoritePropertyIds = [],
  onToggleFavorite,
  viewMode = 'cards',
  recentProperties = [],
  searchResults = []
}: { 
  property?: any;
  searchQuery?: string;
  hasSearched?: boolean;
  favoritePropertyIds?: string[];
  onToggleFavorite?: (property: any, event: React.MouseEvent) => void;
  viewMode?: string;
  recentProperties?: any[];
  searchResults?: any[];
}) {
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
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
        <button 
          onClick={(e) => onToggleFavorite?.(displayProperty, e)}
          className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors cursor-pointer"
        >
          {favoritePropertyIds.includes(displayProperty.property_id || displayProperty.id) ? (
            <Heart className="h-4 w-4 text-red-500 fill-current" />
          ) : (
            <Heart className="h-4 w-4 text-gray-600 hover:text-red-500" />
          )}
        </button>
        
        {/* Zillow Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const address = displayProperty.address_full || displayProperty.address_street || '';
            const zillowUrl = `https://www.zillow.com/homes/${address.replace(/\s+/g, '-')}-${displayProperty.address_city}-${displayProperty.address_state}-${displayProperty.address_zip}_rb/`;
            window.open(zillowUrl, '_blank');
          }}
          className="absolute bottom-3 right-3 bg-white/95 hover:bg-white rounded-lg p-2 shadow-sm transition-colors group cursor-pointer"
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
            ${displayProperty.estimated_value ? parseInt(displayProperty.estimated_value).toLocaleString() : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">
            Assessed: <span className="font-medium text-gray-600">
              ${displayProperty.assessed_value ? parseInt(displayProperty.assessed_value).toLocaleString() : 'N/A'}
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
            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
            <span className="text-xs text-gray-500">Select</span>
          </div>
          <button 
            onClick={() => {
              // Create a clean back URL for the discover page
              const baseUrl = new URL('/v2/discover', window.location.origin);
              baseUrl.searchParams.set('viewMode', viewMode);
              
              if (hasSearched && (searchResults.length > 0 || searchQuery)) {
                // We have search results or an active search, preserve search state
                if (searchQuery) {
                  baseUrl.searchParams.set('q', searchQuery);
                }
                baseUrl.searchParams.set('hasResults', 'true');
              } else if (!hasSearched && recentProperties.length > 0) {
                // We're in favorites mode, preserve that
                baseUrl.searchParams.set('showingFavorites', 'true');
              }
              
              const backUrl = encodeURIComponent(baseUrl.toString());
              window.location.href = `/v2/discover/property/${displayProperty.id || displayProperty.property_id}?back=${backUrl}`;
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

