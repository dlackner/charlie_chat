/*
 * CHARLIE2 V2 - Discover Page
 * Advanced property search and filtering with comprehensive saved search functionality
 * Features: Clean map implementation, connected filter system, smart searches
 * TODO: Move to app/v2/discover/ for proper V2 organization
 */
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';
import { hasAccess } from '@/lib/v2/accessControl';
import { AuthGuard } from '@/components/auth/AuthGuard';
import type { UserClass } from '@/lib/v2/accessControl';
import { Search, MapPin, SlidersHorizontal, ChevronDown, ChevronUp, X, Heart, Bookmark, Target, AlertTriangle, Wrench, Activity, CreditCard, DollarSign, Home, Building, Users, Grid3x3, Map, ArrowUpDown, Trash2, Edit } from 'lucide-react';
import { StandardModalWithActions } from '@/components/shared/StandardModal';
import PropertyMapWithRents from '@/components/shared/PropertyMapWithRents';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAlert } from '@/components/shared/AlertModal';
import { getPropertyType } from '@/lib/propertyTypeOverrides';


// Extend Window interface for address validation timeout
declare global {
  interface Window {
    addressValidationTimeout: NodeJS.Timeout;
  }
}

function DiscoverPageContent() {
  const { user, supabase } = useAuth();
  const { showError, showWarning, AlertComponent } = useAlert();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // US states for recognition (full names and abbreviations)
  const US_STATES = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
    'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
    'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
    'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
    'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
    'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
    'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
    'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
  };
  
  // User class for access control
  const [userClass, setUserClass] = useState<string | null>(null);
  
  // Modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Initialize state from sessionStorage first, then URL parameters if available
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = sessionStorage.getItem('discoverPageFilters');
      if (savedFilters) {
        try {
          const parsed = JSON.parse(savedFilters);
          if (parsed.searchQuery) {
            return parsed.searchQuery;
          }
        } catch (e) {
          console.error('Error parsing saved discover filters:', e);
        }
      }
    }
    return searchParams.get('q') || '';
  });
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
    // Force cards view on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    // Restore view mode from URL if present
    const urlViewMode = searchParams.get('viewMode');
    return (urlViewMode === 'map' || urlViewMode === 'cards') ? urlViewMode : 'cards';
  });
  const [isRestoringSearch, setIsRestoringSearch] = useState(false);
  
  // Wrapper function to prevent map mode on mobile
  const handleSetViewMode = (mode: 'cards' | 'map') => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && mode === 'map') {
      return; // Don't allow map mode on mobile
    }
    setViewMode(mode);
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [lastSearchFilters, setLastSearchFilters] = useState<any>(null);
  const [favoritePropertyIds, setFavoritePropertyIds] = useState<string[]>([]);
  const [dailyProperties, setDailyProperties] = useState<any[]>([]);
  const [currentDailyPage, setCurrentDailyPage] = useState(1);
  const [mySearches, setMySearches] = useState<any[]>([]);
  const [isLoadingMySearches, setIsLoadingMySearches] = useState(false);
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);
  
  // Constants
  const PROPERTIES_PER_PAGE = 12;

  // Clean up sessionStorage after filters are restored
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('discoverPageFilters');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handler for View Details to save filter state
  const handleViewDetails = (property: any) => {
    const filterState = {
      filters,
      searchQuery,
      collapsedSections
    };
    sessionStorage.setItem('discoverPageFilters', JSON.stringify(filterState));
    
    const baseUrl = new URL('/discover', window.location.origin);
    baseUrl.searchParams.set('viewMode', viewMode);
    
    if (hasSearched && (searchResults.length > 0 || searchQuery)) {
      if (searchQuery) {
        baseUrl.searchParams.set('q', searchQuery);
      }
      baseUrl.searchParams.set('hasResults', 'true');
    } else if (!hasSearched && recentProperties.length > 0) {
      baseUrl.searchParams.set('showingFavorites', 'true');
    }
    
    const backUrl = encodeURIComponent(baseUrl.toString());
    const propertyId = property.property_id || property.id;
    window.location.href = `/discover/property/${propertyId}?back=${backUrl}`;
  };
  
  // Simple pagination for 24 daily properties (2 pages of 12 each)
  const totalDailyPages = 2;
  const dailyStartIndex = (currentDailyPage - 1) * 12;
  const dailyEndIndex = dailyStartIndex + 12;
  const paginatedDailyProperties = dailyProperties.slice(dailyStartIndex, dailyEndIndex);
  
  // Pagination calculations for search results  
  const totalSearchPages = Math.ceil(propertyCount / PROPERTIES_PER_PAGE);
  const searchStartIndex = (currentPage - 1) * PROPERTIES_PER_PAGE;
  const searchEndIndex = searchStartIndex + PROPERTIES_PER_PAGE;
  const paginatedSearchResults = searchResults.slice(searchStartIndex, searchEndIndex);
  
  // Update recentProperties when daily properties page changes
  useEffect(() => {
    if (!hasSearched && paginatedDailyProperties.length > 0) {
      setRecentProperties(paginatedDailyProperties);
      setPropertyCount(paginatedDailyProperties.length);
    }
  }, [currentDailyPage, dailyProperties, hasSearched]);
  
  
  // Load more search results when navigating to a page that needs more data
  useEffect(() => {
    if (hasSearched && totalSearchPages > 1 && searchResults.length < propertyCount) {
      const neededResults = currentPage * PROPERTIES_PER_PAGE;
      if (neededResults > searchResults.length) {
        // Need to load more results
        const loadMoreSearchResults = async () => {
          if (!lastSearchFilters) return;
          
          try {
            const nextResultIndex = searchResults.length;
            const response = await fetch('/api/realestateapi', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...lastSearchFilters,
                property_type: getPropertyType(lastSearchFilters?.state, lastSearchFilters?.county),
                size: 12 * (currentPage - Math.floor(searchResults.length / PROPERTIES_PER_PAGE)),
                resultIndex: nextResultIndex,
                userId: user?.id || null // Add user ID for search tracking
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              setSearchResults(prev => [...prev, ...(data.data || [])]);
            }
          } catch (error) {
            console.error('Error loading more search results:', error);
          }
        };
        
        loadMoreSearchResults();
      }
    }
  }, [currentPage, hasSearched, searchResults.length, propertyCount, totalSearchPages, lastSearchFilters]);
  
  // Filter states - initialize from sessionStorage if available
  const [filters, setFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = sessionStorage.getItem('discoverPageFilters');
      if (savedFilters) {
        try {
          const parsed = JSON.parse(savedFilters);
          if (parsed.filters) {
            return parsed.filters;
          }
        } catch (e) {
          console.error('Error parsing saved discover filters:', e);
        }
      }
    }
    
    return {
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
    mfh_2to4: null as boolean | null,
    mfh_5plus: null as boolean | null,
    
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
    stories_min: '',
    stories_max: '',
    lot_size_min: '',
    lot_size_max: '',
    flood_zone: null as boolean | null,
    
    // Financial Information
    assessed_value_min: '',
    assessed_value_max: '',
    value_min: '',
    value_max: '',
    estimated_equity_min: '',
    estimated_equity_max: '',
    mortgage_min: '',
    mortgage_max: '',
    
    // Distress & Special Conditions
    assumable: null as boolean | null,
    reo: null as boolean | null,
    pre_foreclosure: null as boolean | null,
    auction: null as boolean | null,
    private_lender: null as boolean | null
    };
  });
  
  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);
  
  // Collapsible section states - restore from sessionStorage or default to all closed
  const [collapsedSections, setCollapsedSections] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = sessionStorage.getItem('discoverPageFilters');
      if (savedFilters) {
        try {
          const parsed = JSON.parse(savedFilters);
          if (parsed.collapsedSections) {
            return parsed.collapsedSections;
          }
        } catch (e) {
          console.error('Error parsing saved discover filters:', e);
        }
      }
    }
    
    return {
      units: true,
      owner: true,
      sale: true,
      physical: true,
      financial: true,
      distress: true,
      savedSearches: true,
      mySearches: true
    };
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

  // Fetch user class for access control
  useEffect(() => {
    if (user?.id && supabase && !userClass) {
      const fetchUserClass = async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_class')
            .eq('user_id', user.id)
            .single();
            
          if (profile?.user_class) {
            setUserClass(profile.user_class);
          }
        } catch (error) {
          // Error fetching user class
        }
      };
      
      fetchUserClass();
    }
  }, [user?.id, supabase, userClass]);

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
          // Error loading favorites
          setRecentProperties([]);
          setPropertyCount(0);
          setHasSearched(false);
          setIsLoadingRecent(false);
          return;
        }
        
        const favoritesResult = await response.json();
        // Extract property IDs from the new API format
        const favoritePropertyIds = favoritesResult.favorites?.map((fav: any) => fav.property_id) || [];
        
        if (favoritePropertyIds.length > 0) {
          // Show all favorite properties for users who have access to favorites
          const limitedFavoriteIds = favoritePropertyIds;
          
          // Get real property data from saved_properties table using existing supabase client
          if (supabase) {
            // Load ALL property data for pagination to work correctly
            const { data: propertiesData, error: propertiesError } = await supabase
              .from('saved_properties')
              .select('*')
              .in('property_id', limitedFavoriteIds);
            
            if (propertiesError) {
              // Error loading property data
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
              
              // recentProperties will be set by the useEffect when paginatedFavorites changes
              setHasSearched(false);
              setIsLoadingRecent(false);
              return;
            }
          }
          
          // Fallback: if no supabase client or error, show empty state
          setRecentProperties([]);
          setPropertyCount(0);
          setHasSearched(false);
          setIsLoadingRecent(false);
        } else {
          setRecentProperties([]);
          setPropertyCount(0);
          setHasSearched(false);
          setIsLoadingRecent(false);
        }

      } catch (error) {
        // Unexpected error loading recent properties
        setRecentProperties([]);
        setPropertyCount(0);
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

  

  // Load daily properties and user favorites on page load
  useEffect(() => {
    loadDailyProperties();
  }, []);
  
  // Load user favorites for favoriting functionality
  useEffect(() => {
    if (user) {
      loadUserFavorites();
    }
  }, [user]);

  const loadDailyProperties = async () => {
    setIsLoadingDaily(true);
    
    try {
      const response = await fetch('/api/daily-properties');
      if (response.ok) {
        const data = await response.json();
        setDailyProperties(data.properties || []);
        setCurrentDailyPage(1);
        setHasSearched(false);
      } else {
        console.error('Failed to load daily properties');
        setDailyProperties([]);
      }
    } catch (error) {
      console.error('Error loading daily properties:', error);
      setDailyProperties([]);
    } finally {
      setIsLoadingDaily(false);
    }
  };
  
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
      // Error loading user favorites
    }
  };

  const toggleFavorite = async (property: any, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Check if user has permission to favorite properties
    const currentUserClass = userClass as UserClass;
    if (!hasAccess(currentUserClass, 'discover_favorite_properties')) {
      setShowUpgradeModal(true);
      return;
    }
    
    // TEMPORARY: Skip auth check for testing
    // if (!user) {
    //   alert('Please sign in to save favorites');
    //   return;
    // }

    const propertyId = property.property_id || property.id;
    const isFavorited = favoritePropertyIds.includes(propertyId);
    const action = isFavorited ? 'remove' : 'add';
    
    // Note: Core users cannot access favorites at all (handled by access control)
    

    // Optimistic update
    if (isFavorited) {
      setFavoritePropertyIds(prev => prev.filter(id => id !== propertyId));
    } else {
      setFavoritePropertyIds(prev => [...prev, propertyId]);
    }

    try {
      let response;
      
      if (action === 'remove') {
        // Use DELETE method for removing favorites
        response = await fetch('/api/favorites', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            property_id: propertyId
          }),
        });
      } else {
        // Use POST method for adding favorites
        const requestPayload = {
          property_id: propertyId,
          property_data: property,
          action: 'add'
        };
        
        response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        // API Error
        throw new Error(`Failed to update favorite: ${errorData.error || response.statusText}`);
      }

      // Note: We don't update recentProperties display state here
      // Properties remain visible until page refresh for better UX
      // Only the heart state (favoritePropertyIds) changes immediately

    } catch (error) {
      // Error updating favorite
      // Revert optimistic update
      if (isFavorited) {
        setFavoritePropertyIds(prev => [...prev, propertyId]);
      } else {
        setFavoritePropertyIds(prev => prev.filter(id => id !== propertyId));
      }
      showError('Failed to update favorite. Please try again.', 'Update Failed');
    }
  };

  const handleFavoriteAllSuccess = (favoritedPropertyIds: string[]) => {
    // Update the local state to reflect newly favorited properties
    setFavoritePropertyIds(prev => {
      const newIds = favoritedPropertyIds.filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setRecentProperties([]);
    setCurrentPage(1); // Reset pagination for new search
    
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
      
      // Remove country suffixes that interfere with parsing
      cleanedQuery = cleanedQuery.replace(/,\s*(USA|US|United States)$/i, '');
      
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
        // Check if any part contains a zip code (5 digits) - but not at the beginning (avoid house numbers)
        // Look for zip codes after state abbreviations or in standalone context
        const zipMatch = query.match(/(?:^|\s|,)\s*(\d{5}(?:-\d{4})?)\s*$/);
        const hasZip = zipMatch !== null;
        
        // Check if first part looks like a street address (contains numbers + text, including hyphenated)
        const isStreetAddress = /^\d+(?:-\d+)?\s+.+/.test(locationParts[0]);
      
      if (hasZip && locationParts.length === 1) {
        // Just a zip code: "80202"
        searchFilters.zip = zipMatch[1];
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
        const houseMatch = streetPart.match(/^(\d+(?:-\d+)?)\s+(.+)$/);
        
        // Extract house and street for specific property lookup
        if (houseMatch) {
          searchFilters.house = houseMatch[1]; // "73" or "32-34"
          searchFilters.street = capitalizeWords(houseMatch[2]); // "Rhode Island Ave" or "Grand Avenue"
        } else {
          searchFilters.street = capitalizeWords(streetPart);
        }
        
        searchFilters.city = capitalizeWords(locationParts[1]);
        
        // Handle state + zip in last part: "ri 02840" or just "ri"
        const lastPart = locationParts[locationParts.length - 1].trim();
        
        // Handle US addresses - can be 3 or 4 parts
        if (locationParts.length >= 4) {
          // Format: "73 Rhode Island Avenue, Newport, RI, USA" 
          const statePart = locationParts[2].trim(); // "RI" or "Florida"
          
          // Convert full state name to abbreviation if needed
          const statePartUpper = statePart.toUpperCase();
          searchFilters.state = US_STATES[statePartUpper as keyof typeof US_STATES] || statePartUpper;
          searchFilters.zip = hasZip ? zipMatch[1] : '';
        } else if (locationParts.length === 3) {
          // Format: "73 Rhode Island Avenue, Newport, RI" (no USA suffix)
          const statePart = locationParts[2].trim(); // "RI" or "RI 02840"
          const stateZipMatch = statePart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
          
          if (stateZipMatch) {
            searchFilters.state = stateZipMatch[1].toUpperCase();
            searchFilters.zip = stateZipMatch[2] || (hasZip ? zipMatch[1] : '');
          } else {
            // Convert full state name to abbreviation if possible
            const statePartUpper = statePart.toUpperCase();
            searchFilters.state = US_STATES[statePartUpper as keyof typeof US_STATES] || statePartUpper;
            searchFilters.zip = hasZip ? zipMatch[1] : '';
          }
        } else {
          // Fallback for unusual formats
          const lastPartUpper = lastPart.toUpperCase();
          searchFilters.state = US_STATES[lastPartUpper as keyof typeof US_STATES] || lastPartUpper;
          searchFilters.zip = hasZip ? zipMatch[1] : '';
        }
      } else if (locationParts.length >= 2) {
        // City, State format: "newport, ri" or "denver, co 80202"
        // But also handle "State, USA" format: "New Hampshire, USA"
        const firstPart = locationParts[0];
        const lastPart = locationParts[1].trim();
        
        // Check if first part is a US state name (e.g., "New Hampshire, USA")
        const firstPartUpper = firstPart.toUpperCase();
        const isStateFirst = US_STATES.hasOwnProperty(firstPartUpper) || 
                           Object.values(US_STATES).includes(firstPartUpper as any);
                           
        if (isStateFirst && (lastPart.toUpperCase() === 'USA' || lastPart.toUpperCase() === 'US')) {
          // Handle "State, USA" format - treat first part as state
          searchFilters.state = US_STATES[firstPartUpper as keyof typeof US_STATES] || firstPartUpper;
          searchFilters.city = '';
          searchFilters.zip = hasZip ? zipMatch[1] : '';
        } else if (firstPart.toLowerCase().includes('county')) {
          // Handle county format
          searchFilters.county = capitalizeWords(firstPart);
          const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
          
          if (stateZipMatch) {
            searchFilters.state = stateZipMatch[1].toUpperCase();
            searchFilters.zip = stateZipMatch[2] || (hasZip ? zipMatch[1] : '');
          } else {
            const lastPartUpper = lastPart.toUpperCase();
            searchFilters.state = US_STATES[lastPartUpper as keyof typeof US_STATES] || lastPartUpper;
            searchFilters.zip = hasZip ? zipMatch[1] : '';
          }
        } else {
          // Standard "City, State" format
          searchFilters.city = capitalizeWords(firstPart);
          const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
          
          if (stateZipMatch) {
            searchFilters.state = stateZipMatch[1].toUpperCase();
            searchFilters.zip = stateZipMatch[2] || (hasZip ? zipMatch[1] : '');
          } else {
            // Convert full state name to abbreviation if possible
            const lastPartUpper = lastPart.toUpperCase();
            searchFilters.state = US_STATES[lastPartUpper as keyof typeof US_STATES] || lastPartUpper;
            searchFilters.zip = hasZip ? zipMatch[1] : '';
          }
        }
      } else {
        // Single input - could be city name, zip, or street
        if (hasZip) {
          searchFilters.zip = zipMatch[1];
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
        property_type: getPropertyType(searchFilters.state, searchFilters.county),
        size: 12, // Load 12 at a time for pagination
        resultIndex: 0,
        userId: user?.id || null // Add user ID for search tracking
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
      // Search error
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

  
  const updateFilter = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
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
      mfh_2to4: null,
      mfh_5plus: null,
      
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
      stories_min: '',
      stories_max: '',
      lot_size_min: '',
      lot_size_max: '',
      flood_zone: null,
      
      // Financial Information
      assessed_value_min: '',
      assessed_value_max: '',
      value_min: '',
      value_max: '',
      estimated_equity_min: '',
      estimated_equity_max: '',
      mortgage_min: '',
      mortgage_max: '',
      
      // Distress & Special Conditions
      assumable: null,
      reo: null,
      pre_foreclosure: null,
      auction: null,
      private_lender: null
    });
    
    // Also close all filter sections
    setCollapsedSections({
      units: true,
      owner: true,
      sale: true,
      physical: true,
      financial: true,
      distress: true,
      savedSearches: true,
      mySearches: true
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
          property_type: getPropertyType(savedSearch.criteria?.state, savedSearch.criteria?.county),
          count: false,
          size: 12,
          resultIndex: 0,
          obfuscate: false,
          summary: false,
          userId: user?.id || null // Add user ID for search tracking
        };
        
        // Add location if available
        if (searchQuery.trim()) {
          const cleanedQuery = searchQuery.replace(/,\s*(USA|US|United States)$/i, '');
          const locationParts = cleanedQuery.split(',').map((s: string) => s.trim());
          const zipPattern = /^\d{5}(-\d{4})?$/;
          const zipMatch = cleanedQuery.match(/\b\d{5}(-\d{4})?\b/);
          
          if (zipMatch && locationParts.length === 1) {
            apiParams.zip = zipMatch[1];
          } else if (locationParts.length >= 2) {
            const firstPart = locationParts[0];
            const lastPart = locationParts[1].trim();
            
            // Check if first part is a US state name (e.g., "New Hampshire, USA")
            const firstPartUpper = firstPart.toUpperCase();
            const isStateFirst = US_STATES.hasOwnProperty(firstPartUpper) || 
                               Object.values(US_STATES).includes(firstPartUpper as any);
                               
            if (isStateFirst && (lastPart.toUpperCase() === 'USA' || lastPart.toUpperCase() === 'US')) {
              // Handle "State, USA" format - treat first part as state
              apiParams.state = US_STATES[firstPartUpper as keyof typeof US_STATES] || firstPartUpper;
            } else if (firstPart.toLowerCase().includes('county')) {
              // Check if first part contains "County" - if so, use county parameter instead of city
              apiParams.county = firstPart;
              const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
              if (stateZipMatch) {
                apiParams.state = stateZipMatch[1].toUpperCase();
                if (stateZipMatch[2]) apiParams.zip = stateZipMatch[2];
              }
            } else {
              apiParams.city = firstPart;
              const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
              if (stateZipMatch) {
                apiParams.state = stateZipMatch[1].toUpperCase();
                if (stateZipMatch[2]) apiParams.zip = stateZipMatch[2];
              }
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
          // Smart query search failed
          setSearchResults([]);
          setPropertyCount(0);
          setHasSearched(true);
        }
      }
      
      // Collapse the saved searches section after applying
      setCollapsedSections((prev: any) => ({ ...prev, savedSearches: true }));
      
    } catch (error) {
      // Error executing saved search
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
      const response = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
      
      if (response.ok) {
        const data = await response.json();
        setAddressSuggestions(data.predictions || []);
        setShowAddressSuggestions(true);
      }
    } catch (error) {
      // Address validation error
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
    setCollapsedSections((prev: any) => ({
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
      const response = await fetch('/api/saved-searches');
      if (response.ok) {
        const data = await response.json();
        setMySearches(data.data || []);
      } else {
        // Failed to load saved searches
      }
    } catch (error) {
      // Error loading saved searches
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
      const response = await fetch(`/api/saved-searches?id=${searchToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        setMySearches(prev => prev.filter(s => s.id !== searchToDelete.id));
        setShowDeleteModal(false);
        setSearchToDelete(null);
      } else {
        // Failed to delete saved search
        showError('Failed to delete search. Please try again.', 'Delete Failed');
      }
    } catch (error) {
      // Error deleting saved search
      showError('Failed to delete search. Please try again.', 'Delete Failed');
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
      
      // Saving search with data

      const response = await fetch('/api/saved-searches', {
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
        // Save search failed
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
      // Error saving search
      showError('Failed to save search. Please try again.', 'Save Failed');
    }
  };

  // Handle editing a smart search (populate filters without executing)
  const handleEditSmartSearch = (search: any) => {
    if (search.criteria && search.criteria.apiFields) {
      // Map criteria fields to filter sections
      const fieldToSection: { [key: string]: string } = {
        units_min: 'units',
        units_max: 'units',
        mfh_2to4: 'units',
        mfh_5plus: 'units',
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
        stories_min: 'physical',
        stories_max: 'physical',
        lot_size_min: 'physical',
        lot_size_max: 'physical',
        flood_zone: 'physical',
        assessed_value_min: 'financial',
        assessed_value_max: 'financial',
        value_min: 'financial',
        value_max: 'financial',
        estimated_value_min: 'financial',
        estimated_equity_min: 'financial',
        estimated_equity_max: 'financial',
        mortgage_min: 'financial',
        mortgage_max: 'financial',
        assumable: 'financial',
        reo: 'distress',
        pre_foreclosure: 'distress',
        auction: 'distress',
        private_lender: 'distress'
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
        mfh_2to4: null,
        mfh_5plus: null,
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
        stories_min: '',
        stories_max: '',
        lot_size_min: '',
        lot_size_max: '',
        flood_zone: null,
        assessed_value_min: '',
        assessed_value_max: '',
        value_min: '',
        value_max: '',
        estimated_equity_min: '',
        estimated_equity_max: '',
        mortgage_min: '',
        mortgage_max: '',
        assumable: null,
        reo: null,
        pre_foreclosure: null,
        auction: null,
        private_lender: null
      };
      
      // Apply smart search criteria to the form (don't execute search)
      setFilters({ ...defaultFilters, ...search.criteria.apiFields });
      
      // Expand relevant filter sections
      setCollapsedSections((prev: any) => {
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
        mfh_2to4: null,
        mfh_5plus: null,
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
        stories_min: '',
        stories_max: '',
        lot_size_min: '',
        lot_size_max: '',
        flood_zone: null,
        assessed_value_min: '',
        assessed_value_max: '',
        value_min: '',
        value_max: '',
        estimated_equity_min: '',
        estimated_equity_max: '',
        mortgage_min: '',
        mortgage_max: '',
        assumable: null,
        reo: null,
        pre_foreclosure: null,
        auction: null,
        private_lender: null
      };
      
      // Apply smart search criteria to the form
      setFilters({ ...defaultFilters, ...search.criteria.apiFields });
      
      // Execute the search automatically using the same method as smart searches
      setTimeout(() => {
        const tempSmartSearch = {
          criteria: {
            specialQuery: 'saved-search',
            apiFields: search.criteria.apiFields
          }
        };
        applySavedSearch(tempSmartSearch);
      }, 100);
    }
  };

  // Handle editing a saved search (populate filters without executing)
  const handleEditSavedSearch = (search: any) => {
    if (search.filters) {
      // Find which sections contain the search criteria
      const fieldToSection: { [key: string]: string } = {
        units_min: 'units',
        units_max: 'units',
        mfh_2to4: 'units',
        mfh_5plus: 'units',
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
        stories_min: 'physical',
        stories_max: 'physical',
        lot_size_min: 'physical',
        lot_size_max: 'physical',
        flood_zone: 'physical',
        assessed_value_min: 'financial',
        assessed_value_max: 'financial',
        value_min: 'financial',
        value_max: 'financial',
        estimated_value_min: 'financial',
        estimated_equity_min: 'financial',
        estimated_equity_max: 'financial',
        mortgage_min: 'financial',
        mortgage_max: 'financial',
        assumable: 'financial',
        reo: 'distress',
        pre_foreclosure: 'distress',
        auction: 'distress',
        private_lender: 'distress'
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
        mfh_2to4: null,
        mfh_5plus: null,
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
        stories_min: '',
        stories_max: '',
        lot_size_min: '',
        lot_size_max: '',
        flood_zone: null,
        assessed_value_min: '',
        assessed_value_max: '',
        value_min: '',
        value_max: '',
        estimated_equity_min: '',
        estimated_equity_max: '',
        mortgage_min: '',
        mortgage_max: '',
        assumable: null,
        reo: null,
        pre_foreclosure: null,
        auction: null,
        private_lender: null
      };
      
      // Apply saved search criteria to the form (don't execute search)
      setFilters({ ...defaultFilters, ...search.filters });
      
      // Set search query if saved
      if (search.filters.searchQuery) {
        setSearchQuery(search.filters.searchQuery);
      }
      
      // Expand relevant filter sections
      setCollapsedSections((prev: any) => {
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
        mfh_2to4: null,
        mfh_5plus: null,
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
        stories_min: '',
        stories_max: '',
        lot_size_min: '',
        lot_size_max: '',
        flood_zone: null,
        assessed_value_min: '',
        assessed_value_max: '',
        value_min: '',
        value_max: '',
        estimated_equity_min: '',
        estimated_equity_max: '',
        mortgage_min: '',
        mortgage_max: '',
        assumable: null,
        reo: null,
        pre_foreclosure: null,
        auction: null,
        private_lender: null
      };
      
      // Apply saved search criteria to the form
      setFilters({ ...defaultFilters, ...search.filters });
      
      // Set search query if saved - this needs to be set BEFORE calling applySavedSearch
      if (search.filters.searchQuery) {
        setSearchQuery(search.filters.searchQuery);
      }
      
      // Execute the search automatically with the saved location
      setTimeout(async () => {
        setIsSearching(true);
        
        try {
          setSearchResults([]);
          setPropertyCount(0);
          
          // Build API params with saved location and filters
          let apiParams: any = {
            property_type: getPropertyType(search.filters?.state, search.filters?.county),
            count: false,
            size: 12,
            resultIndex: 0,
            obfuscate: false,
            summary: false,
            userId: user?.id || null, // Add user ID for search tracking
            ...search.filters // Include all saved filters
          };
          
          // Add saved location if available
          if (search.filters.searchQuery && search.filters.searchQuery.trim()) {
            const savedQuery = search.filters.searchQuery.replace(/,\s*(USA|US|United States)$/i, '');
            const locationParts = savedQuery.split(',').map((s: string) => s.trim());
            const zipPattern = /^\d{5}(-\d{4})?$/;
            const zipMatch = savedQuery.match(/\b\d{5}(-\d{4})?\b/);
            
            if (zipMatch && locationParts.length === 1) {
              apiParams.zip = zipMatch[1];
            } else if (locationParts.length >= 2) {
              const firstPart = locationParts[0];
              const lastPart = locationParts[1].trim();
              
              // Check if first part is a US state name (e.g., "New Hampshire, USA")
              const firstPartUpper = firstPart.toUpperCase();
              const isStateFirst = US_STATES.hasOwnProperty(firstPartUpper) || 
                                 Object.values(US_STATES).includes(firstPartUpper as any);
                                 
              if (isStateFirst && (lastPart.toUpperCase() === 'USA' || lastPart.toUpperCase() === 'US')) {
                // Handle "State, USA" format - treat first part as state
                apiParams.state = US_STATES[firstPartUpper as keyof typeof US_STATES] || firstPartUpper;
              } else if (firstPart.toLowerCase().includes('county')) {
                apiParams.county = firstPart;
                const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
                if (stateZipMatch) {
                  apiParams.state = stateZipMatch[1].toUpperCase();
                  if (stateZipMatch[2]) {
                    apiParams.zip = stateZipMatch[2];
                  }
                } else {
                  apiParams.state = lastPart.toUpperCase();
                }
              } else {
                apiParams.city = firstPart;
                const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
                if (stateZipMatch) {
                  apiParams.state = stateZipMatch[1].toUpperCase();
                  if (stateZipMatch[2]) {
                    apiParams.zip = stateZipMatch[2];
                  }
                } else {
                  apiParams.state = lastPart.toUpperCase();
                }
              }
            } else {
              // Single input - could be city, state, or zip
              if (zipMatch) {
                apiParams.zip = zipMatch[1];
              } else {
                apiParams.city = savedQuery;
              }
            }
          }
          
          // Remove the searchQuery from API params as it's not an API field
          delete apiParams.searchQuery;
          
          // Remove empty string and null values to avoid API validation errors
          Object.keys(apiParams).forEach(key => {
            const value = apiParams[key];
            if (value === '' || value === null || value === undefined) {
              delete apiParams[key];
            }
          });
          
          const response = await fetch('/api/realestateapi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiParams)
          });
          
          if (response.ok) {
            const data = await response.json();
            const results = data.data || [];
            setSearchResults(results);
            setPropertyCount(data.resultCount || results.length);
            setHasSearched(true);
            setLastSearchFilters(apiParams);
          }
        } catch (error) {
          console.error('Saved search execution error:', error);
          setSearchResults([]);
          setPropertyCount(0);
          setHasSearched(true);
        } finally {
          setIsSearching(false);
        }
      }, 100);
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
                    onClick={() => {
                      const currentUserClass = userClass as UserClass;
                      if (!hasAccess(currentUserClass, 'discover_saved_searches')) {
                        router.push('/pricing');
                        return;
                      }
                      setShowSaveModal(true);
                    }}
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
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      min="0"
                      value={filters.units_min}
                      onChange={(e) => updateFilter('units_min', e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      min="0"
                      value={filters.units_max}
                      onChange={(e) => updateFilter('units_max', e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="hidden flex space-x-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.mfh_2to4 === true}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFilter('mfh_2to4', true);
                            updateFilter('mfh_5plus', null);
                          } else {
                            updateFilter('mfh_2to4', null);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">2-4 units</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.mfh_5plus === true}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFilter('mfh_5plus', true);
                            updateFilter('mfh_2to4', null);
                          } else {
                            updateFilter('mfh_5plus', null);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">5+ units</span>
                    </label>
                  </div>
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
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Stories
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={filters.stories_min || ''}
                      onChange={(e) => updateFilter('stories_min', e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={filters.stories_max || ''}
                      onChange={(e) => updateFilter('stories_max', e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Lot Size (sq ft)
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={filters.lot_size_min || ''}
                      onChange={(e) => updateFilter('lot_size_min', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={filters.lot_size_max || ''}
                      onChange={(e) => updateFilter('lot_size_max', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Estimated Equity
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={filters.estimated_equity_min || ''}
                      onChange={(e) => updateFilter('estimated_equity_min', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={filters.estimated_equity_max || ''}
                      onChange={(e) => updateFilter('estimated_equity_max', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Mortgage Balance
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={filters.mortgage_min || ''}
                      onChange={(e) => updateFilter('mortgage_min', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center text-gray-500">—</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={filters.mortgage_max || ''}
                      onChange={(e) => updateFilter('mortgage_max', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
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
              </CollapsibleFilterSection>

              {/* Distress & Special Conditions */}
              <CollapsibleFilterSection 
                title="DISTRESS & SPECIAL CONDITIONS" 
                isCollapsed={collapsedSections.distress}
                onToggle={() => toggleSection('distress')}
                sectionKey="distress"
              >
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
                
                <FilterGroup label="Auction">
                  <ToggleButton 
                    active={filters.auction === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => updateFilter('auction', null)}
                  />
                  <ToggleButton 
                    active={filters.auction === true} 
                    label="Yes"
                    onClick={() => updateFilter('auction', true)}
                  />
                  <ToggleButton 
                    active={filters.auction === false} 
                    label="No"
                    onClick={() => updateFilter('auction', false)}
                  />
                </FilterGroup>
                
                <FilterGroup label="Private Lender">
                  <ToggleButton 
                    active={filters.private_lender === null} 
                    label="Any" 
                    color="blue"
                    onClick={() => updateFilter('private_lender', null)}
                  />
                  <ToggleButton 
                    active={filters.private_lender === true} 
                    label="Yes"
                    onClick={() => updateFilter('private_lender', true)}
                  />
                  <ToggleButton 
                    active={filters.private_lender === false} 
                    label="No"
                    onClick={() => updateFilter('private_lender', false)}
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

              {/* My Searches - Access Control */}
              {hasAccess(userClass as UserClass, 'discover_saved_searches') ? (
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
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bookmark className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Save Your Searches</h3>
                      <p className="text-xs text-gray-600">Keep track of your favorite search criteria</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">
                    Save and organize your property searches for quick access later. Plus and Pro plans include this powerful feature.
                  </p>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="w-full bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Upgrade to Plus or Professional
                  </button>
                </div>
              )}

              {/* Search button moved to top */}

            </div>
          </div>

          {/* Right Side - Results */}
          <div className="flex-1 overflow-x-hidden">
            {/* Results Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 space-y-4 lg:space-y-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900">
                  {recentProperties.length > 0 && !hasSearched ? 'Daily Properties' : 'Properties'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {recentProperties.length > 0 && !hasSearched 
                    ? 'Featured properties from across the United States'
                    : 'Search to see available multifamily investments'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-4 flex-shrink-0">
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {isLoadingDaily ? 'Loading...' : recentProperties.length > 0 && !hasSearched 
                    ? `${recentProperties.length} of ${dailyProperties.length} properties`
                    : `${propertyCount} properties`}
                </span>
                
                {/* Favorite All Button - Only show for search results */}
                {hasSearched && searchResults.length > 0 && (
                  <FavoriteAllButton 
                    properties={searchResults}
                    userClass={userClass}
                    onShowUpgradeModal={() => setShowUpgradeModal(true)}
                    onFavoriteSuccess={handleFavoriteAllSuccess}
                  />
                )}
                
                {/* View Toggle - Hidden on mobile */}
                {(hasSearched || recentProperties.length > 0) && (
                  <div className="hidden md:flex items-center space-x-2">
                    <button
                      onClick={() => handleSetViewMode('cards')}
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
                      onClick={() => handleSetViewMode('map')}
                      className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
                        viewMode === 'map'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Map className="h-4 w-4 mr-2" />
                      Map
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pr-8">
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
                        favoritePropertyIds={favoritePropertyIds}
                        userClass={userClass}
                        setShowUpgradeModal={setShowUpgradeModal}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                ) : (
                  /* Map Only View for Daily Properties - Updated for better UX */
                  /* Previously showed Map + Cards combined view, but users expect map-only when clicking "Map" */
                  <PropertyMapWithRents
                    properties={recentProperties}
                    className="h-[600px] w-full rounded-lg border border-gray-200"
                    context="discover"
                    currentViewMode={viewMode}
                    isShowingFavorites={true}
                    hasSearched={false}
                  />
                )}
                
                {/* Daily Properties Pagination Controls */}
                {totalDailyPages > 1 && (
                  <div className="mt-8 flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setCurrentDailyPage(prev => Math.max(1, prev - 1))}
                      disabled={currentDailyPage === 1}
                      className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalDailyPages) }, (_, i) => {
                        let pageNumber;
                        if (totalDailyPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentDailyPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentDailyPage >= totalDailyPages - 2) {
                          pageNumber = totalDailyPages - 4 + i;
                        } else {
                          pageNumber = currentDailyPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentDailyPage(pageNumber)}
                            className={`w-10 h-10 rounded-lg ${
                              currentDailyPage === pageNumber
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentDailyPage(prev => Math.min(totalDailyPages, prev + 1))}
                      disabled={currentDailyPage === totalDailyPages}
                      className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    
                    <div className="ml-4 text-sm text-gray-600">
                      Showing {dailyStartIndex + 1}-{Math.min(dailyEndIndex, dailyProperties.length)} of {dailyProperties.length} properties
                    </div>
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
                      {paginatedSearchResults.length > 0 ? (
                        paginatedSearchResults.map((property, i) => (
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
                            onViewDetails={handleViewDetails}
                          />
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">No properties found. Try adjusting your search criteria.</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Search Results Pagination Controls */}
                    {totalSearchPages > 1 && (
                      <div className="mt-8 flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalSearchPages) }, (_, i) => {
                            let pageNumber;
                            if (totalSearchPages <= 5) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage >= totalSearchPages - 2) {
                              pageNumber = totalSearchPages - 4 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={i}
                                onClick={() => setCurrentPage(pageNumber)}
                                className={`w-10 h-10 rounded-lg ${
                                  currentPage === pageNumber
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalSearchPages, prev + 1))}
                          disabled={currentPage === totalSearchPages}
                          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                        
                        <div className="ml-4 text-sm text-gray-600">
                          Showing {searchStartIndex + 1}-{Math.min(searchEndIndex, searchResults.length)} of {propertyCount} properties
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Map Only View - Updated for better UX */
                  /* Previously showed Map + Cards combined view, but users expect map-only when clicking "Map" */
                  <PropertyMapWithRents
                    properties={paginatedSearchResults}
                    className="h-[600px] w-full rounded-lg border border-gray-200"
                    context="discover"
                    currentViewMode={viewMode}
                    isShowingFavorites={false}
                    searchQuery={searchQuery}
                    hasSearched={hasSearched}
                  />
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
                  Show me my recent properties
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
          <span>Filter</span>
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
                        const currentUserClass = userClass as UserClass;
                        if (!hasAccess(currentUserClass, 'discover_saved_searches')) {
                          router.push('/pricing');
                          setShowMobileFilters(false);
                          return;
                        }
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
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        min="0"
                        value={filters.units_min}
                        onChange={(e) => updateFilter('units_min', e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        min="0"
                        value={filters.units_max}
                        onChange={(e) => updateFilter('units_max', e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="hidden flex space-x-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.mfh_2to4 === true}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFilter('mfh_2to4', true);
                              updateFilter('mfh_5plus', null);
                            } else {
                              updateFilter('mfh_2to4', null);
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">2-4 units</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.mfh_5plus === true}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFilter('mfh_5plus', true);
                              updateFilter('mfh_2to4', null);
                            } else {
                              updateFilter('mfh_5plus', null);
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">5+ units</span>
                      </label>
                    </div>
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
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Stories
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={filters.stories_min || ''}
                        onChange={(e) => updateFilter('stories_min', e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={filters.stories_max || ''}
                        onChange={(e) => updateFilter('stories_max', e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Lot Size (sq ft)
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={filters.lot_size_min || ''}
                        onChange={(e) => updateFilter('lot_size_min', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={filters.lot_size_max || ''}
                        onChange={(e) => updateFilter('lot_size_max', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Estimated Equity
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={filters.estimated_equity_min || ''}
                        onChange={(e) => updateFilter('estimated_equity_min', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={filters.estimated_equity_max || ''}
                        onChange={(e) => updateFilter('estimated_equity_max', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Mortgage Balance
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={filters.mortgage_min || ''}
                        onChange={(e) => updateFilter('mortgage_min', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="flex items-center text-gray-500">—</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={filters.mortgage_max || ''}
                        onChange={(e) => updateFilter('mortgage_max', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
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
                </CollapsibleFilterSection>

                {/* Distress & Special Conditions */}
                <CollapsibleFilterSection 
                  title="DISTRESS & SPECIAL CONDITIONS" 
                  isCollapsed={collapsedSections.distress}
                  onToggle={() => toggleSection('distress')}
                  sectionKey="distress"
                >
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
                  
                  <FilterGroup label="Auction">
                    <ToggleButton 
                      active={filters.auction === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => updateFilter('auction', null)}
                    />
                    <ToggleButton 
                      active={filters.auction === true} 
                      label="Yes"
                      onClick={() => updateFilter('auction', true)}
                    />
                    <ToggleButton 
                      active={filters.auction === false} 
                      label="No"
                      onClick={() => updateFilter('auction', false)}
                    />
                  </FilterGroup>
                  
                  <FilterGroup label="Private Lender">
                    <ToggleButton 
                      active={filters.private_lender === null} 
                      label="Any" 
                      color="blue"
                      onClick={() => updateFilter('private_lender', null)}
                    />
                    <ToggleButton 
                      active={filters.private_lender === true} 
                      label="Yes"
                      onClick={() => updateFilter('private_lender', true)}
                    />
                    <ToggleButton 
                      active={filters.private_lender === false} 
                      label="No"
                      onClick={() => updateFilter('private_lender', false)}
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

      {/* Upgrade Plan Modal */}
      <StandardModalWithActions
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade Required"
        showCloseButton={true}
        primaryAction={{
          label: "View Plans",
          onClick: () => {
            setShowUpgradeModal(false);
            router.push('/pricing');
          },
          variant: "primary"
        }}
        secondaryAction={{
          label: "Maybe Later",
          onClick: () => setShowUpgradeModal(false)
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Save Your Favorite Properties</h3>
              <p className="text-gray-600">Keep track of properties you're interested in</p>
            </div>
          </div>
          <p className="text-gray-700">
            Upgrade your plan to save favorite properties and access them anytime. 
            Choose from our Plus or Pro plans to unlock this feature and many more!
          </p>
        </div>
      </StandardModalWithActions>

      {/* Alert Modal */}
      {AlertComponent}

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
  searchResults = [],
  favoritePropertyIds = [],
  userClass = null,
  setShowUpgradeModal,
  onViewDetails
}: { 
  property: any;
  searchQuery?: string;
  hasSearched?: boolean;
  onToggleFavorite?: (property: any, event: React.MouseEvent) => void;
  viewMode?: string;
  recentProperties?: any[];
  searchResults?: any[];
  favoritePropertyIds?: string[];
  userClass?: string | null;
  setShowUpgradeModal?: (show: boolean) => void;
  onViewDetails?: (property: any) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Property Image */}
      <div className="relative aspect-[3/2] sm:aspect-[4/3] bg-gray-200">
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
        
        {/* Heart Favorite Button */}
        <button 
          onClick={(e) => {
            const currentUserClass = userClass as UserClass;
            if (!hasAccess(currentUserClass, 'discover_favorite_properties')) {
              // Trigger the modal in the parent component
              setShowUpgradeModal?.(true);
              return;
            }
            onToggleFavorite?.(property, e);
          }}
          className={`absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-sm transition-colors ${
            hasAccess(userClass as UserClass, 'discover_favorite_properties') 
              ? 'hover:bg-white cursor-pointer' 
              : 'cursor-not-allowed opacity-50'
          }`}
        >
          {favoritePropertyIds.includes(property.property_id || property.id) ? (
            <Heart className="h-4 w-4 text-red-500 fill-current" />
          ) : (
            <Heart className={`h-4 w-4 ${
              hasAccess(userClass as UserClass, 'discover_favorite_properties')
                ? 'text-gray-600 hover:text-red-500'
                : 'text-gray-400'
            }`} />
          )}
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


        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Saved {new Date(property.saved_at).toLocaleDateString()}
          </div>
          <button 
            onClick={() => onViewDetails?.(property)}
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
  searchResults = [],
  onViewDetails
}: { 
  property?: any;
  searchQuery?: string;
  hasSearched?: boolean;
  favoritePropertyIds?: string[];
  onToggleFavorite?: (property: any, event: React.MouseEvent) => void;
  viewMode?: string;
  recentProperties?: any[];
  searchResults?: any[];
  onViewDetails?: (property: any) => void;
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
      <div className="relative aspect-[3/2] sm:aspect-[4/3] bg-gray-200">
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
        {displayProperty.out_of_state_absentee_owner && (
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
              Absentee Owner
            </span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
            <span className="text-xs text-gray-500">Select</span>
          </div>
          <button 
            onClick={() => onViewDetails?.(displayProperty)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}


// FavoriteAllButton Component
function FavoriteAllButton({ 
  properties, 
  userClass, 
  onShowUpgradeModal, 
  onFavoriteSuccess 
}: {
  properties: any[];
  userClass: string | null;
  onShowUpgradeModal: () => void;
  onFavoriteSuccess: (favoritedPropertyIds: string[]) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Count how many properties are not yet favorited
  const [favoritePropertyIds, setFavoritePropertyIds] = useState<string[]>([]);
  
  // Get favorite status on mount
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      try {
        const response = await fetch('/api/favorites');
        if (response.ok) {
          const data = await response.json();
          const currentFavoriteIds = data.favorites?.map((fav: any) => fav.property_id) || [];
          setFavoritePropertyIds(currentFavoriteIds);
        }
      } catch (error) {
        console.error('Error fetching favorite status:', error);
      }
    };
    
    fetchFavoriteStatus();
  }, []);
  
  const unfavoritedProperties = properties.filter(property => {
    const propertyId = property.property_id || property.id;
    return !favoritePropertyIds.includes(propertyId);
  });
  
  const handleFavoriteAll = async () => {
    // Check access permissions
    const currentUserClass = userClass as UserClass;
    if (!hasAccess(currentUserClass, 'discover_favorite_properties')) {
      onShowUpgradeModal();
      return;
    }
    
    if (unfavoritedProperties.length === 0) {
      return; // Nothing to favorite
    }
    
    setIsLoading(true);
    const successfullyFavorited: string[] = [];
    
    try {
      // Process properties in batches of 5 to avoid overwhelming the server
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < unfavoritedProperties.length; i += batchSize) {
        batches.push(unfavoritedProperties.slice(i, i + batchSize));
      }
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (property) => {
          const propertyId = property.property_id || property.id;
          
          try {
            const response = await fetch('/api/favorites', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                property_id: propertyId,
                property_data: property,
                action: 'add'
              }),
            });
            
            if (response.ok) {
              successfullyFavorited.push(propertyId);
              return { success: true, propertyId };
            } else {
              console.error(`Failed to favorite property ${propertyId}`);
              return { success: false, propertyId };
            }
          } catch (error) {
            console.error(`Error favoriting property ${propertyId}:`, error);
            return { success: false, propertyId };
          }
        });
        
        await Promise.all(batchPromises);
        
        // Small delay between batches to be respectful to the server
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Update local state and notify parent
      setFavoritePropertyIds(prev => [...prev, ...successfullyFavorited]);
      onFavoriteSuccess(successfullyFavorited);
      
      // Show success message
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(`Successfully added ${successfullyFavorited.length} properties to favorites!`);
      }
      
    } catch (error) {
      console.error('Error in batch favorite operation:', error);
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error('Failed to add some properties to favorites. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Don't show button if no properties to favorite
  if (unfavoritedProperties.length === 0) {
    return null;
  }
  
  return (
    <button
      onClick={handleFavoriteAll}
      disabled={isLoading}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
        isLoading
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
          Adding...
        </>
      ) : (
        <>
          <Heart className="h-4 w-4 mr-2" />
          ♥ Add All {unfavoritedProperties.length}
        </>
      )}
    </button>
  );
}

export default function DiscoverPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <DiscoverPageContent />
      </Suspense>
    </AuthGuard>
  );
}
