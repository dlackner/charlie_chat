/*
 * CHARLIE2 V2 - Engage Page
 * Property engagement and workflow management
 * Part of the new V2 application architecture
 * TODO: Consider moving to app/v2/engage/ for proper V2 organization
 */
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Heart, Grid3x3, Map, Filter, ChevronDown, FileText, MapPin, Trash2, Route } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import PropertyMapWithRents from '@/components/shared/PropertyMapWithRents';
import { generate10YearCashFlowReport } from '../offer-analyzer/cash-flow-report';
import { generateMarketingLetter, createMailtoLink } from '../templates/generateMarketingLetter';
import { CashFlowReportsModal } from '@/components/shared/CashFlowReportsModal';
import { useAuth } from "@/contexts/AuthContext";
import { incrementActivityCount } from '@/lib/v2/activityCounter';
import { useAlert } from '@/components/shared/AlertModal';

function EngagePageContent() {
  const { user, supabase, isLoading: authLoading } = useAuth();
  const { showError, showWarning, showSuccess, showDelete, AlertComponent } = useAlert();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'cards' | 'map'>(() => {
    // Initialize view mode from URL parameter, defaulting to 'cards'
    const paramViewMode = searchParams.get('viewMode');
    if (paramViewMode && ['cards', 'map'].includes(paramViewMode)) {
      return paramViewMode as 'cards' | 'map';
    }
    return 'cards';
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  
  // Engagement Center dropdown states
  const [showMarketingMaterials, setShowMarketingMaterials] = useState(false);
  const [showLegalDocuments, setShowLegalDocuments] = useState(false);
  const [showFinancialAnalysis, setShowFinancialAnalysis] = useState(false);
  const [showToolbox, setShowToolbox] = useState(false);
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMarkets, setUserMarkets] = useState<any[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [selectedPropertyOffers, setSelectedPropertyOffers] = useState<any[]>([]);
  const [showCashFlowReportsModal, setShowCashFlowReportsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const propertiesPerPage = 12;
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const marketDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const marketDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch favorited properties and user markets from database
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch both favorites and user markets in parallel
        const [favoritesResponse, marketsResponse] = await Promise.all([
          fetch('/api/favorites'),
          fetch(`/api/user-markets?userId=${user.id}`)
        ]);

        if (!favoritesResponse.ok) {
          throw new Error('Failed to fetch favorites');
        }

        const favoritesData = await favoritesResponse.json();
        
        // Auto-assign markets to manual properties that don't have a market assigned
        try {
          const { data: assignmentResults, error: assignmentError } = await supabase.rpc('assign_manual_properties_to_markets', {
            target_user_id: user.id
          });
          
          if (assignmentError) {
            console.error('Error auto-assigning markets:', assignmentError);
          } else if (assignmentResults && assignmentResults.length > 0) {
            console.log(`Auto-assigned ${assignmentResults.length} properties to markets:`, assignmentResults);
            
            // Refetch favorites data if assignments were made
            const updatedFavoritesResponse = await fetch('/api/favorites');
            if (updatedFavoritesResponse.ok) {
              const updatedFavoritesData = await updatedFavoritesResponse.json();
              favoritesData.favorites = updatedFavoritesData.favorites;
            }
          }
        } catch (assignmentError) {
          console.error('Error calling auto-assignment function:', assignmentError);
        }
        
        // Transform the data to match the expected format
        const transformedProperties = favoritesData.favorites.map((favorite: any) => {
          const propertyData = favorite.property_data;
          
          if (!propertyData) {
            return null;
          }
          
          
          return {
            // UI-specific transformed fields (for display)
            id: propertyData.property_id || favorite.property_id,
            // Keep the original property_id for database operations
            original_property_id: favorite.property_id,
            address: propertyData.address_street || propertyData.address_full || 'Unknown Address',
            city: propertyData.address_city || 'Unknown City',
            state: propertyData.address_state || 'Unknown State',
            zip: propertyData.address_zip || 'Unknown Zip',
            latitude: propertyData.latitude,
            longitude: propertyData.longitude,
            units: propertyData.units_count || 1,
            built: propertyData.year_built || 1950,
            assessed: propertyData.assessed_value ? `$${parseInt(propertyData.assessed_value).toLocaleString()}` : 'Unknown',
            estimated: propertyData.estimated_value ? `$${parseInt(propertyData.estimated_value).toLocaleString()}` : 'Unknown',
            estEquity: propertyData.estimated_equity ? `$${parseInt(propertyData.estimated_equity).toLocaleString()}` : 'Unknown',
            market: favorite.market_name || propertyData.address_city || 'Unknown Market',
            market_key: favorite.market_key, // Keep original market_key for filtering
            pipelineStatus: favorite.status || 'Reviewing',
            source: favorite.recommendation_type === 'algorithm' ? 'A' : 'M',
            isFavorited: true,
            isSkipTraced: favorite.is_skip_traced || false,
            createdAt: favorite.created_at,
            owner_first_name: propertyData.owner_first_name,
            owner_last_name: propertyData.owner_last_name,
            skip_trace_data: favorite.skip_trace_data,
            
            // Include ALL raw database fields for CSV export
            ...propertyData,
            
            // Override any propertyData fields with favorites table data
            notes: favorite.notes || '',
            favorite_status: favorite.status,
            favorite_notes: favorite.notes,
            market_name: favorite.market_name,
            recommendation_type: favorite.recommendation_type,
            is_skip_traced: favorite.is_skip_traced,
            has_pricing_scenario: favorite.has_pricing_scenario
          };
        }).filter(Boolean); // Remove any null entries
        

        setSavedProperties(transformedProperties);

        // Fetch user markets
        if (marketsResponse.ok) {
          const marketsData = await marketsResponse.json();
          setUserMarkets(marketsData.markets || []);
        } else {
          // Failed to fetch user markets, using fallback
          setUserMarkets([]);
        }

      } catch (error) {
        // Error fetching data
        setError('Failed to load saved properties');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (statusDropdownTimeoutRef.current) {
        clearTimeout(statusDropdownTimeoutRef.current);
      }
      if (marketDropdownTimeoutRef.current) {
        clearTimeout(marketDropdownTimeoutRef.current);
      }
    };
  }, []);

  // Get unique values for filters - sort statuses in logical pipeline order
  const statusOrder = ['Reviewing', 'Communicating', 'Engaged', 'Analyzing', 'LOI Sent', 'Acquired', 'Rejected'];
  const uniqueStatuses = statusOrder.filter(status => 
    savedProperties.some(p => p.pipelineStatus === status)
  );
  // Use user markets from database, limited to 5 markets, plus "No Market" option
  const uniqueMarkets = ['No Market', ...userMarkets.slice(0, 5).map(market => market.name)];
  // Create market options for dropdown - maps market keys to display names
  const marketOptions = [
    { key: null, name: 'No Market' },
    ...userMarkets.slice(0, 5)
      .filter(market => market.name !== 'No Market')
      .map(market => ({ key: market.key, name: market.name }))
  ];
  const uniqueSources = ['All', 'Algorithm', 'Manual'];

  // Filter properties based on selections
  const filteredProperties = savedProperties.filter(property => {
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(property.pipelineStatus);
    
    // Pipeline stage filtering
    const matchesPipelineStage = selectedPipelineStage === 'all' || 
      property.pipelineStatus === selectedPipelineStage ||
      (selectedPipelineStage === 'Acq/Rej' && (property.pipelineStatus === 'Acquired' || property.pipelineStatus === 'Rejected'));
    
    // Enhanced market matching: include both market name AND geographic location
    let matchesMarket = selectedMarkets.length === 0;
    if (!matchesMarket && selectedMarkets.length > 0) {
      for (const selectedMarket of selectedMarkets) {
        if (selectedMarket === 'No market' && !property.market_key) {
          matchesMarket = true;
          break;
        } else if (selectedMarket !== 'No market') {
          // Check if property matches by market name
          if (property.market === selectedMarket) {
            matchesMarket = true;
            break;
          }
          
          // Geographic matching is now handled by auto-assignment feature
          // Manual properties are automatically assigned to markets based on 25-mile radius
        }
      }
    }
    
    const matchesSource = selectedSource === 'All' || 
      (selectedSource === 'Algorithm' && property.source === 'A') ||
      (selectedSource === 'Manual' && property.source === 'M');
    const matchesSearch = searchQuery === '' || 
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesPipelineStage && matchesMarket && matchesSource && matchesSearch;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatuses, selectedMarkets, selectedSource, selectedPipelineStage, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProperties.length / propertiesPerPage);
  const startIndex = (currentPage - 1) * propertiesPerPage;
  const endIndex = startIndex + propertiesPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

  const togglePropertySelection = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [propertyId] // Only allow one property to be selected at a time
    );
  };

  const selectAll = () => {
    // No longer allow selecting all properties - only one at a time
    setSelectedProperties([]);
  };

  const clearSelection = () => {
    setSelectedProperties([]);
  };

  const handleStatusUpdate = (propertyId: string, newStatus: string) => {
    setSavedProperties(prev => 
      prev.map(property => 
        property.id.toString() === propertyId 
          ? { ...property, pipelineStatus: newStatus }
          : property
      )
    );
  };

  const handleMarketUpdate = async (propertyId: string, newMarket: string | null) => {
    try {
      const response = await fetch('/api/favorites/update-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          market_key: newMarket
        })
      });
      
      if (!response.ok) {
        // Failed to update market
      } else {
        // Update local state only after successful API call
        setSavedProperties(prev => 
          prev.map(property => 
            property.id.toString() === propertyId 
              ? { ...property, market: newMarket }
              : property
          )
        );
      }
    } catch (error) {
      // Error updating market
    }
  };

  const handleRemoveFromFavorites = (propertyId: string) => {
    // Remove property from the savedProperties list using original_property_id
    setSavedProperties(prev => prev.filter(property => 
      (property.original_property_id || property.id).toString() !== propertyId
    ));
    
    // Also remove from selected properties if it was selected
    setSelectedProperties(prev => prev.filter(id => id.toString() !== propertyId));
  };

  const handleMassDelete = async () => {
    try {
      // Delete all selected properties from favorites
      const deletePromises = selectedProperties.map(async (propertyId) => {
        const response = await fetch('/api/favorites', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            property_id: propertyId
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete property ${propertyId}`);
        }
        
        return propertyId;
      });

      await Promise.all(deletePromises);

      // Remove all deleted properties from the UI
      setSavedProperties(prev => prev.filter(property => 
        !selectedProperties.includes(property.property_id)
      ));

      // Clear selections
      setSelectedProperties([]);
      setShowDeleteModal(false);

      // Show success message
      setSuccessMessage(`Successfully deleted ${deletePromises.length} properties from favorites.`);
      setShowSuccessModal(true);

    } catch (error) {
      // Error deleting selected properties
      showError('Failed to delete some properties. Please try again.', 'Delete Failed');
    }
  };

  const handleGenerateCashFlowReport = async (propertyId: number) => {
    const property = savedProperties.find(p => p.id === propertyId);
    if (!property) return;


    try {
      // Fetch saved offer scenarios for this property
      const response = await fetch(`/api/offer-scenarios?propertyId=${propertyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pricing scenarios');
      }

      const data = await response.json();
      if (!data.scenarios || data.scenarios.length === 0) {
        showWarning('No pricing scenarios found for this property. Please create an offer analysis first.', 'No Pricing Data');
        return;
      }

      // Use the most recent scenario
      const scenario = data.scenarios[0];
      const offerData = scenario.offer_data;
      
      if (!offerData) {
        showWarning('No pricing data found for this property.', 'No Pricing Data');
        return;
      }

      // Get user profile for report branding
      const profileResponse = await fetch('/api/profile');
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const profileData = await profileResponse.json();

      // Generate the cash flow report
      await generate10YearCashFlowReport({
        // Property address (optional)
        propertyStreet: property.address,
        propertyCity: property.city,
        propertyState: property.state,
        
        // Financial parameters from saved offer data
        purchasePrice: parseFloat(offerData.purchasePrice) || 0,
        downPaymentPercentage: parseFloat(offerData.downPaymentPercentage) || 20,
        interestRate: parseFloat(offerData.interestRate) || 7.0,
        loanStructure: offerData.loanStructure || 'amortizing',
        amortizationPeriodYears: parseInt(offerData.amortizationPeriodYears) || 30,
        interestOnlyPeriodYears: parseInt(offerData.interestOnlyPeriodYears) || 0,
        closingCostsPercentage: parseFloat(offerData.closingCostsPercentage) || 3,
        
        // Income parameters
        numUnits: parseInt(offerData.numUnits) || 1,
        avgMonthlyRentPerUnit: parseFloat(offerData.avgMonthlyRentPerUnit) || 0,
        vacancyRate: parseFloat(offerData.vacancyRate) || 10,
        annualRentalGrowthRate: parseFloat(offerData.annualRentalGrowthRate) || 2,
        otherIncomeAnnual: parseFloat(offerData.otherIncomeAnnual) || 0,
        incomeReductionsAnnual: parseFloat(offerData.incomeReductionsAnnual) || 0,
        
        // Expense parameters
        propertyTaxes: parseFloat(offerData.propertyTaxes) || 0,
        insurance: parseFloat(offerData.insurance) || 0,
        propertyManagementFeePercentage: parseFloat(offerData.propertyManagementFeePercentage) || 6,
        maintenanceRepairsAnnual: parseFloat(offerData.maintenanceRepairsAnnual) || 0,
        utilitiesAnnual: parseFloat(offerData.utilitiesAnnual) || 0,
        contractServicesAnnual: parseFloat(offerData.contractServicesAnnual) || 0,
        payrollAnnual: parseFloat(offerData.payrollAnnual) || 0,
        marketingAnnual: parseFloat(offerData.marketingAnnual) || 0,
        gAndAAnnual: parseFloat(offerData.gAndAAnnual) || 0,
        otherExpensesAnnual: parseFloat(offerData.otherExpensesAnnual) || 0,
        expenseGrowthRate: parseFloat(offerData.expenseGrowthRate) || 3,
        
        // Capital reserves
        capitalReservePerUnitAnnual: parseFloat(offerData.capitalReservePerUnitAnnual) || 300,
        
        // Investment timeline
        holdingPeriodYears: parseInt(offerData.holdingPeriodYears) || 10,
        
        // Mode settings
        usePercentageMode: offerData.usePercentageMode || false,
        operatingExpensePercentage: parseFloat(offerData.operatingExpensePercentage) || 50
      });
      
      // Show success message
      setSuccessMessage(`Cash flow report generated successfully for ${property.address}`);
      setShowSuccessModal(true);
      
    } catch (error) {
      // Error generating cash flow report
      showError('Failed to generate cash flow report. Please try again.', 'Report Generation Failed');
    }
  };

  const handleLOIGeneration = (propertyId: string) => {
    const property = savedProperties.find(p => p.property_id === propertyId);
    if (!property) return;

    // Navigate to templates page with property data for LOI generation
    const params = new URLSearchParams({
      propertyAddress: `${property.address}, ${property.city}, ${property.state} ${property.zip}`,
      ownerFirst: property.owner_first_name || '',
      ownerLast: property.owner_last_name || '',
      propertyId: property.id.toString(),
      returnUrl: '/engage'
    });
    router.push(`/templates?${params.toString()}`);

  };

  const handlePurchaseSaleGeneration = (propertyId: string) => {
    const property = savedProperties.find(p => p.property_id === propertyId);
    if (!property) return;
    // Navigate to templates page with property data for Purchase & Sale generation
    const params = new URLSearchParams({
      propertyAddress: `${property.address}, ${property.city}, ${property.state} ${property.zip}`,
      ownerFirst: property.owner_first_name || '',
      ownerLast: property.owner_last_name || '',
      propertyId: property.id.toString(),
      returnUrl: '/engage',
      type: 'purchase_sale'
    });
    router.push(`/templates?${params.toString()}`);
    // TODO: Increment activity count for Purchase & Sale creation initiated
    // if (user?.id) {
    //   incrementActivityCount(user.id, 'purchase_sale_agreements_created');
    // }
  };

  const handleViewOffers = async () => {
    if (!user) {
      showWarning('Please log in to view offers.', 'Login Required');
      return;
    }

    try {
      // Fetch offers from the offer_scenarios table (all user offers)
      const response = await fetch('/api/offer-scenarios?all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      const data = await response.json();
      
      // Transform the data to match our UI format
      const transformedOffers = data.scenarios.map((offer: any) => ({
        id: offer.id,
        name: offer.offer_name || `Offer ${offer.id}`,
        description: offer.offer_description || 'No description',
        property_address: offer.saved_properties?.address_full || 'Unknown Address',
        offer_amount: offer.offer_data?.purchasePrice ? `$${parseInt(offer.offer_data.purchasePrice).toLocaleString()}` : 'N/A',
        created_date: new Date(offer.created_at).toLocaleDateString(),
        property_id: offer.property_id
      }));

      setSelectedPropertyOffers(transformedOffers);
      setShowOffersModal(true);
    } catch (error) {
      // Error fetching offers
      showError('Failed to load analyses. Please try again.', 'Load Failed');
    }
  };

  const handleOfferSelection = (offerId: number, propertyId: string) => {
    // Find property by original_property_id (numeric) since offer.property_id is numeric
    const property = savedProperties.find(p => p.original_property_id?.toString() === propertyId);
    if (!property) {
      // If property not found in current saved properties, still navigate with minimal data
      const params = new URLSearchParams({
        offerId: offerId.toString(),
        id: propertyId,
        source: 'engage'
      });
      router.push(`/offer-analyzer?${params.toString()}`);
      setShowOffersModal(false);
      return;
    }

    // Navigate to offer analyzer with the selected offer ID and property data
    // Use property.id (UUID from saved_properties) not original_property_id
    const params = new URLSearchParams({
      address: property.address,
      city: property.city,
      state: property.state,
      units: property.units.toString(),
      assessed: property.assessed,
      built: property.built.toString(),
      id: property.id.toString(), // This should be the UUID
      offerId: offerId.toString(),
      source: 'engage'
    });
    router.push(`/offer-analyzer?${params.toString()}`);
    setShowOffersModal(false);
  };

  const handleDeleteOffer = async (offerId: string) => {
    showDelete(
      'Are you sure you want to delete this offer? This action cannot be undone.',
      async () => {
        await deleteOffer(offerId);
      }
    );
  };

  const deleteOffer = async (offerId: string) => {

    try {
      const response = await fetch(`/api/offer-scenarios/${offerId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete offer');
      }

      // Remove from local state
      setSelectedPropertyOffers(prev => prev.filter(offer => offer.id !== offerId));
    } catch (error) {
      // Error deleting offer
      showError('Failed to delete offer. Please try again.', 'Delete Failed');
    }
  };


  const handleCSVExport = () => {
    try {
      // Define comprehensive CSV headers (no date columns or JSONB fields)
      const headers = [
        // Property ID and Identifiers
        'Property ID',
        'Internal Property ID',
        
        // Property Address & Location
        'Address Street',
        'Address Full',
        'Address City',
        'Address State',
        'Address Zip',
        'County',
        'Latitude',
        'Longitude',
        
        // Mailing Address
        'Mail Address Full',
        'Mail Address Street',
        'Mail Address City',
        'Mail Address County',
        'Mail Address State',
        'Mail Address Zip',
        
        // Property Details
        'Property Type',
        'Units Count',
        'Stories',
        'Year Built',
        'Effective Year Built',
        'Square Feet',
        'Building Square Feet',
        'Lot Square Feet',
        
        // Financial Information
        'Assessed Value',
        'Assessed Land Value',
        'Estimated Value',
        'Estimated Equity',
        'Equity Percent',
        'Rent Estimate',
        'Listing Price',
        'Loan to Value Ratio',
        
        // Mortgage Information
        'Mortgage Balance',
        'Mortgage Rate First',
        'Mortgage Amount First',
        'Mortgage Type First',
        'Total Open Mortgage Balance',
        'Lender Name',
        
        // Sale History
        'Last Sale Amount',
        'Last Sale Arms Length',
        'Years Owned',
        'Years of Ownership',
        
        // Owner Information
        'Owner First Name',
        'Owner Last Name',
        'Owner Type',
        'Owner Phone',
        'Owner Email',
        'Out of State Absentee Owner',
        'In State Absentee Owner',
        'Owner Occupied',
        'Corporate Owned',
        'Investor Buyer',
        'Owner Mailing Address Same as Property',
        
        // Property Status Flags
        'MLS Active',
        'For Sale',
        'Assumable',
        'Auction',
        'REO',
        'Pre Foreclosure',
        'Foreclosure',
        'Private Lender',
        'Distressed Property',
        'Tax Delinquent',
        
        // Financial Distress
        'Lien Amount',
        'Judgment Amount',
        
        // Portfolio Information
        'Total Portfolio Equity',
        'Total Portfolio Mortgage Balance',
        'Total Properties Owned',
        
        // Environmental
        'Flood Zone',
        'Flood Zone Description',
        
        // Neighborhood Information
        'School District Name',
        'School Rating',
        'Neighborhood Name',
        'Walk Score',
        'Median Household Income',
        
        // User Workflow Data
        'Pipeline Status',
        'Market',
        'Notes',
        
        // Legacy fields that might be used in frontend
        'Legacy Address',
        'Legacy City',
        'Legacy State',
        'Legacy Zip',
        'Legacy Units',
        'Legacy Built',
        'Legacy Assessed',
        'Source',
      ];

      // Convert properties to CSV rows
      const csvRows = [
        headers.join(','), // Header row
        ...filteredProperties.map(property => {
          // Get the raw property data from the database
          // Since these are favorites, we need to fetch the original property_data
          // For now, we'll work with what we have in the transformed object
          
          // Parse skip trace data if available
          let ownerPhone = '';
          let ownerEmail = '';
          
          if (property.skip_trace_data) {
            try {
              const skipTrace = typeof property.skip_trace_data === 'string' 
                ? JSON.parse(property.skip_trace_data) 
                : property.skip_trace_data;
              ownerPhone = skipTrace.phone || '';
              ownerEmail = skipTrace.email || '';
            } catch (e) {
              // Skip trace data parsing failed, use empty values
            }
          }

          // Helper function to format currency values
          const formatCurrency = (value: any) => value ? Number(value).toFixed(2) : '';
          // Helper function to format percentage values  
          const formatPercent = (value: any) => value ? Number(value).toFixed(2) : '';
          // Helper function to format boolean values
          const formatBoolean = (value: any) => value === true ? 'Yes' : value === false ? 'No' : '';
          // Helper function to format dates
          const formatDate = (value: any) => value ? new Date(value).toLocaleDateString() : '';

          return [
            // Property ID and Identifiers
            `"${property.id || ''}"`,
            `"${property.property_id || ''}"`,
            
            // Property Address & Location (using exact schema field names)
            `"${property.address_street || ''}"`,
            `"${property.address_full || ''}"`,
            `"${property.address_city || ''}"`,
            `"${property.address_state || ''}"`,
            `"${property.address_zip || ''}"`,
            `"${property.county || ''}"`,
            `"${property.latitude || ''}"`,
            `"${property.longitude || ''}"`,
            
            // Mailing Address (exact schema field names)
            `"${property.mail_address_full || ''}"`,
            `"${property.mail_address_street || ''}"`,
            `"${property.mail_address_city || ''}"`,
            `"${property.mail_address_county || ''}"`,
            `"${property.mail_address_state || ''}"`,
            `"${property.mail_address_zip || ''}"`,
            
            // Property Details (exact schema field names)
            `"${property.property_type || ''}"`,
            `"${property.units_count || property.units || ''}"`,
            `"${property.stories || ''}"`,
            `"${property.year_built || property.built || ''}"`,
            `"${property.effective_year_built || ''}"`,
            `"${property.square_feet || ''}"`,
            `"${property.building_square_feet || ''}"`,
            `"${property.lot_square_feet || ''}"`,
            
            // Financial Information (exact schema field names)
            `"${formatCurrency(property.assessed_value)}"`,
            `"${formatCurrency(property.assessed_land_value)}"`,
            `"${formatCurrency(property.estimated_value)}"`,
            `"${formatCurrency(property.estimated_equity)}"`,
            `"${formatPercent(property.equity_percent)}"`,
            `"${formatCurrency(property.rent_estimate)}"`,
            `"${formatCurrency(property.listing_price)}"`,
            `"${formatPercent(property.loan_to_value_ratio)}"`,
            
            // Mortgage Information (exact schema field names) - removed date fields
            `"${formatCurrency(property.mortgage_balance)}"`,
            `"${formatPercent(property.mortgage_rate_first)}"`,
            `"${formatCurrency(property.mortgage_amount_first)}"`,
            `"${property.mortgage_type_first || ''}"`,
            `"${formatCurrency(property.total_open_mortgage_balance)}"`,
            `"${property.lender_name || ''}"`,
            
            // Sale History (exact schema field names) - removed date fields
            `"${formatCurrency(property.last_sale_amount)}"`,
            `"${formatBoolean(property.last_sale_arms_length)}"`,
            `"${property.years_owned || ''}"`,
            `"${property.years_of_ownership || ''}"`,
            
            // Owner Information (exact schema field names)
            `"${property.owner_first_name || ''}"`,
            `"${property.owner_last_name || ''}"`,
            `"${property.owner_type || ''}"`,
            `"${ownerPhone}"`,
            `"${ownerEmail}"`,
            `"${formatBoolean(property.out_of_state_absentee_owner)}"`,
            `"${formatBoolean(property.in_state_absentee_owner)}"`,
            `"${formatBoolean(property.owner_occupied)}"`,
            `"${formatBoolean(property.corporate_owned)}"`,
            `"${formatBoolean(property.investor_buyer)}"`,
            `"${formatBoolean(property.owner_mailing_address_same_as_property)}"`,
            
            // Property Status Flags (exact schema field names)
            `"${formatBoolean(property.mls_active)}"`,
            `"${formatBoolean(property.for_sale)}"`,
            `"${formatBoolean(property.assumable)}"`,
            `"${formatBoolean(property.auction)}"`,
            `"${formatBoolean(property.reo)}"`,
            `"${formatBoolean(property.pre_foreclosure)}"`,
            `"${formatBoolean(property.foreclosure)}"`,
            `"${formatBoolean(property.private_lender)}"`,
            `"${formatBoolean(property.distressed_property)}"`,
            `"${formatBoolean(property.tax_delinquent)}"`,
            
            // Financial Distress (exact schema field names) - removed date fields
            `"${formatCurrency(property.lien_amount)}"`,
            `"${formatCurrency(property.judgment_amount)}"`,
            
            // Portfolio Information (exact schema field names)
            `"${formatCurrency(property.total_portfolio_equity)}"`,
            `"${formatCurrency(property.total_portfolio_mortgage_balance)}"`,
            `"${property.total_properties_owned || ''}"`,
            
            // Environmental (exact schema field names)
            `"${formatBoolean(property.flood_zone)}"`,
            `"${property.flood_zone_description || ''}"`,
            
            // Neighborhood Information (exact schema field names)
            `"${property.school_district_name || ''}"`,
            `"${property.school_rating || ''}"`,
            `"${property.neighborhood_name || ''}"`,
            `"${property.walk_score || ''}"`,
            `"${formatCurrency(property.median_household_income)}"`,
            
            // User Workflow Data
            `"${property.pipelineStatus || ''}"`,
            `"${property.market || ''}"`,
            `"${(property.notes || '').replace(/"/g, '""')}"`, // Escape quotes in notes
            
            // Legacy fields that might be used in frontend
            `"${property.address || property.address_street || ''}"`,
            `"${property.city || property.address_city || ''}"`,
            `"${property.state || property.address_state || ''}"`,
            `"${property.zip || property.address_zip || ''}"`,
            `"${property.units || property.units_count || ''}"`,
            `"${property.built || property.year_built || ''}"`,
            `"${property.assessed || property.assessed_value || ''}"`,
            `"${property.source || ''}"`,
,
          ].join(',');
        })
      ];

      // Create CSV content
      const csvContent = csvRows.join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Generate filename with current date and filter info
        const currentDate = new Date().toISOString().split('T')[0];
        const filterInfo = filteredProperties.length !== savedProperties.length ? '_filtered' : '';
        const filename = `properties_${currentDate}${filterInfo}.csv`;
        
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        setSuccessMessage(`CSV export completed! Downloaded ${filteredProperties.length} properties.`);
        setShowSuccessModal(true);
      }
    } catch (error) {
      // Error exporting CSV
      showError('Failed to export CSV. Please try again.', 'Export Failed');
    }
  };

  const handleGenerateReportFromModal = async (propertyWithOffer: any) => {
    try {
      // Extract the offer data and transform it for the cash flow report
      const offerData = propertyWithOffer.offer_data;
      
      if (!offerData) {
        showWarning('No pricing data found for this offer.', 'No Pricing Data');
        return;
      }

      // Get user profile for report branding
      const profileResponse = await fetch('/api/profile');
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const profileData = await profileResponse.json();

      // Extract pre-calculated metrics from offer data to ensure consistency
      // Helper function to parse percentage fields (removes % and converts to number)
      const parsePercentage = (value: string | number | undefined) => {
        if (typeof value === 'string') {
          return parseFloat(value.replace('%', ''));
        }
        return typeof value === 'number' ? value : undefined;
      };
      
      const preCalculatedMetrics = {
        cashOnCashReturn: offerData.cash_on_cash_return ? parsePercentage(offerData.cash_on_cash_return) : undefined,
        capRate: offerData.cap_rate_year_1 ? parsePercentage(offerData.cap_rate_year_1) : undefined,
        debtServiceCoverageRatio: offerData.debt_service_coverage_ratio ? parseFloat(offerData.debt_service_coverage_ratio) : undefined,
        expenseRatio: offerData.expense_ratio_year_1 ? parsePercentage(offerData.expense_ratio_year_1) : undefined,
        projectedIRR: offerData.projected_irr ? parsePercentage(offerData.projected_irr) : undefined,
        totalROI: offerData.roi_at_horizon ? parsePercentage(offerData.roi_at_horizon) : undefined,
        projectedEquity: offerData.projected_equity_at_horizon ? parseFloat(offerData.projected_equity_at_horizon) : undefined,
        netOperatingIncome: offerData.net_operating_income ? parseFloat(offerData.net_operating_income) : undefined,
        cashFlowBeforeTax: offerData.cash_flow_before_tax ? parseFloat(offerData.cash_flow_before_tax) : undefined
      };

      // Filter out undefined values
      const validPreCalculatedMetrics = Object.fromEntries(
        Object.entries(preCalculatedMetrics).filter(([_, value]) => value !== undefined)
      );

      // Generate the cash flow report
      await generate10YearCashFlowReport({
        // Property address from offer
        propertyStreet: propertyWithOffer.property_address,
        
        // Financial parameters from saved offer data
        purchasePrice: parseFloat(offerData.purchasePrice) || 0,
        downPaymentPercentage: parseFloat(offerData.downPaymentPercentage) || 20,
        interestRate: parseFloat(offerData.interestRate) || 7.0,
        loanStructure: offerData.loanStructure || 'amortizing',
        amortizationPeriodYears: parseInt(offerData.amortizationPeriodYears) || 30,
        interestOnlyPeriodYears: parseInt(offerData.interestOnlyPeriodYears) || 0,
        closingCostsPercentage: parseFloat(offerData.closingCostsPercentage) || 3,
        
        // Income parameters
        numUnits: parseInt(offerData.numUnits) || 1,
        avgMonthlyRentPerUnit: parseFloat(offerData.avgMonthlyRentPerUnit) || 0,
        vacancyRate: parseFloat(offerData.vacancyRate) || 10,
        annualRentalGrowthRate: parseFloat(offerData.annualRentalGrowthRate) || 2,
        otherIncomeAnnual: parseFloat(offerData.otherIncomeAnnual) || 0,
        incomeReductionsAnnual: parseFloat(offerData.incomeReductionsAnnual) || 0,
        
        // Expense parameters
        propertyTaxes: parseFloat(offerData.propertyTaxes) || 0,
        insurance: parseFloat(offerData.insurance) || 0,
        propertyManagementFeePercentage: parseFloat(offerData.propertyManagementFeePercentage) || 6,
        maintenanceRepairsAnnual: parseFloat(offerData.maintenanceRepairsAnnual) || 0,
        utilitiesAnnual: parseFloat(offerData.utilitiesAnnual) || 0,
        contractServicesAnnual: parseFloat(offerData.contractServicesAnnual) || 0,
        payrollAnnual: parseFloat(offerData.payrollAnnual) || 0,
        marketingAnnual: parseFloat(offerData.marketingAnnual) || 0,
        gAndAAnnual: parseFloat(offerData.gAndAAnnual) || 0,
        otherExpensesAnnual: parseFloat(offerData.otherExpensesAnnual) || 0,
        expenseGrowthRate: parseFloat(offerData.expenseGrowthRate) || 3,
        
        // Capital reserves
        capitalReservePerUnitAnnual: parseFloat(offerData.capitalReservePerUnitAnnual) || 300,
        
        // Investment timeline
        holdingPeriodYears: parseInt(offerData.holdingPeriodYears) || 10,
        
        // Exit strategy
        dispositionCapRate: parseFloat(offerData.dispositionCapRate) || 6,
        
        // Mode settings
        usePercentageMode: offerData.usePercentageMode || false,
        operatingExpensePercentage: parseFloat(offerData.operatingExpensePercentage) || 50,
        
        // Pre-calculated metrics to ensure consistency with offer analyzer
        preCalculatedMetrics: Object.keys(validPreCalculatedMetrics).length > 0 ? validPreCalculatedMetrics : undefined,
        
        // Report branding
        userName: profileData.name || 'User',
        userEmail: profileData.email || '',
        userPhone: profileData.phone || '',
        reportTitle: `${propertyWithOffer.offer_name || 'Investment Analysis'} - 10-Year Cash Flow Analysis`
      });
      
      // Show success message
      setSuccessMessage(`Cash flow report generated successfully for ${propertyWithOffer.offer_name}`);
      setShowSuccessModal(true);
      
    } catch (error) {
      // Error generating cash flow report
      showError('Failed to generate cash flow report. Please try again.', 'Report Generation Failed');
    }
  };

  const handleEmailGeneration = async (propertyId: string) => {
    const property = savedProperties.find(p => p.property_id === propertyId);
    if (!property) return;

    // Parse skip trace data to extract email address

    // Parse skip trace data (it's a JSON blob)
    let skipTraceData;
    try {
      if (property.skip_trace_data) {
        if (typeof property.skip_trace_data === 'string') {
          skipTraceData = JSON.parse(property.skip_trace_data);
          // Parsed skip trace data from string
        } else {
          skipTraceData = property.skip_trace_data;
          // Skip trace data already parsed
        }
      } else {
        skipTraceData = null;
        // No skip trace data found
      }
    } catch (error) {
      // JSON parse error, using raw data
      skipTraceData = property.skip_trace_data; // In case it's already parsed
    }

    // Extract email from skip trace data

    // Extract email from contacts array (new skip trace format)
    let emailAddress = null;
    if (skipTraceData?.contacts && Array.isArray(skipTraceData.contacts)) {
      for (const contact of skipTraceData.contacts) {
        if (contact.email) {
          emailAddress = contact.email;
          break;
        }
      }
    }
    // Fallback to old format if exists
    if (!emailAddress && skipTraceData?.email) {
      emailAddress = skipTraceData.email;
    }

    // Extract email address for outreach

    // Check if property has skip trace data with email
    if (!skipTraceData || !emailAddress) {
      // No email address available for outreach
      setSuccessMessage(`No email address found for ${property.address}. Skip trace data must be available to send emails.`);
      setShowSuccessModal(true);
      return;
    }

    try {
      // Fetch user profile
      const profileResponse = await fetch('/api/profile');
      if (!profileResponse.ok) {
        showWarning('Please complete your profile to generate emails.', 'Profile Incomplete');
        return;
      }

      const profileData = await profileResponse.json();
      
      // Map profile data to sender info format (same as marketing letters)
      const senderInfo = {
        name: profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || user?.email || 'Your Name',
        address: profileData.street_address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        zip: profileData.zipcode || '',
        phone: profileData.phone_number || '',
        email: profileData.email || user?.email || '',
        business: profileData.business_name || '',
        title: profileData.job_title || '',
        logoBase64: profileData.logo_base64 || null
      };

      // Prepare property data (same logic as marketing letters)
      const rawAddress = property.address;
      const city = property.city;
      const state = property.state;
      const zip = property.zip;
      
      let cleanAddressFull;
      if (rawAddress && rawAddress.includes(city) && rawAddress.includes(state)) {
        cleanAddressFull = rawAddress;
      } else {
        cleanAddressFull = `${rawAddress}, ${city}, ${state}${zip ? ' ' + zip : ''}`.trim();
      }
      
      const propertyData = {
        address_full: cleanAddressFull,
        address_state: property.state,
        owner_first_name: property.owner_first_name || null,
        owner_last_name: property.owner_last_name || null,
        property_id: property.id.toString()
      };

      // Generate email content using existing function
      // Generate marketing letter with property and sender data
      const result = await generateMarketingLetter(propertyData, senderInfo, 'email');
      
      if (!result.success || !result.emailBody) {
        showError(`Failed to generate email content: ${result.message || 'Unknown error'}. Please try again.`, 'Email Generation Failed');
        return;
      }

      // Create and open mailto link
      const subject = `Inquiry About Your Property - ${propertyData.address_full}`;
      const encodedSubject = encodeURIComponent(subject);
      const encodedBody = encodeURIComponent(result.emailBody);
      const recipientEmail = emailAddress;
      
      const mailtoLink = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
      window.open(mailtoLink, '_blank');

      // Increment activity count for emails sent
      if (user?.id) {
        await incrementActivityCount(user.id, 'emails_sent');
      }

      // Add reminder notes to property card
      try {
        if (!user?.id) {
          console.error('User ID not available for updating notes');
          return;
        }
        
        const today = new Date();
        
        // Calculate reminder dates
        const oneWeekLater = new Date(today);
        oneWeekLater.setDate(today.getDate() + 7);
        
        const twoWeeksLater = new Date(today);
        twoWeeksLater.setDate(today.getDate() + 14);
        
        // Format dates as MM/DD/YYYY
        const formatDate = (date: Date) => {
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        };
        
        const oneWeekReminderNote = `@${formatDate(oneWeekLater)} One week email reminder`;
        const twoWeekReminderNote = `@${formatDate(twoWeeksLater)} Two week email reminder`;
        
        // First, get the current notes from the database
        const { data: currentFavorite } = await supabase
          .from('user_favorites')
          .select('notes')
          .eq('user_id', user.id)
          .eq('property_id', property.property_id)
          .single();
        
        const existingNotes = currentFavorite?.notes || '';
        
        // Combine existing notes with new reminder notes
        const updatedNotes = existingNotes 
          ? `${existingNotes}\n${oneWeekReminderNote}\n${twoWeekReminderNote}`
          : `${oneWeekReminderNote}\n${twoWeekReminderNote}`;
        
        // Update notes with both reminders
        const response = await fetch('/api/favorites/update-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_id: property.property_id,
            notes: updatedNotes
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update notes');
        }
        
        // Refresh the property to show updated notes
        setSavedProperties(prev => prev.map(p => {
          if (p.original_property_id === property.original_property_id) {
            return { ...p, notes: updatedNotes };
          }
          return p;
        }));
      } catch (noteError) {
        console.error('Failed to add reminder notes:', noteError);
        // Don't fail the email send if notes fail
      }
      
    } catch (error) {
      // Error generating email
      showError('Failed to generate email. Please try again.', 'Email Generation Failed');
    }
  };

  const handleGenerateMarketingLetters = async (propertyIds: string[]) => {
    try {
      // Get user profile info for sender details
      if (!user) {
        showWarning('Please log in to generate marketing letters.', 'Login Required');
        return;
      }

      // Fetch user profile from database
      const profileResponse = await fetch('/api/profile');
      const profileData = await profileResponse.json();
      
      if (!profileResponse.ok) {
        showWarning('Unable to load your profile information. Please complete your profile to generate marketing letters.', 'Profile Error');
        return;
      }

      // Map profile data to sender info format
      const senderInfo = {
        name: profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || user.email || 'Your Name',
        address: profileData.street_address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        zip: profileData.zipcode || '',
        phone: profileData.phone_number || '',
        email: profileData.email || user.email || '',
        business: profileData.business_name || '',
        title: profileData.job_title || '',
        logoBase64: profileData.logo_base64 || null
      };

      // Validate required profile information
      if (!senderInfo.name || !senderInfo.phone || !senderInfo.email) {
        showWarning('Please complete your profile with name, phone, and email to generate marketing letters.', 'Profile Incomplete');
        return;
      }

      // Generate letters for selected properties
      for (const propertyId of propertyIds) {
        const property = savedProperties.find(p => p.id === propertyId);
        if (property) {
          // Process property data for marketing letter generation
          
          // Smart address construction - check if city/state already in address_full
          const rawAddress = property.address;
          const city = property.city;
          const state = property.state;
          const zip = property.zip;
          
          let cleanAddressFull;
          if (rawAddress && rawAddress.includes(city) && rawAddress.includes(state)) {
            // Address already contains city/state, use as-is
            cleanAddressFull = rawAddress;
          } else {
            // Need to construct full address
            cleanAddressFull = `${rawAddress}, ${city}, ${state}${zip ? ' ' + zip : ''}`.trim();
          }
          
          const propertyData = {
            address_full: cleanAddressFull,
            address_state: property.state,
            owner_first_name: property.owner_first_name || null,
            owner_last_name: property.owner_last_name || null,
            property_id: property.id.toString()
          };
          
          // Generate marketing letter with property data

          const result = await generateMarketingLetter(propertyData, senderInfo, 'print');
          
          if (!result.success) {
            showError(`Error generating letter for ${property.address}: ${result.message}`, 'Letter Generation Error');
            return;
          }

          // Add 10-day reminder note to property card
          try {
            const today = new Date();
            
            // Calculate reminder date (10 days from today)
            const tenDaysLater = new Date(today);
            tenDaysLater.setDate(today.getDate() + 10);
            
            // Format date as MM/DD/YYYY
            const formatDate = (date: Date) => {
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const year = date.getFullYear();
              return `${month}/${day}/${year}`;
            };
            
            const reminderNote = `@${formatDate(tenDaysLater)} Marketing letter follow-up reminder`;
            
            // Add null check for user ID
            if (!user?.id) {
              console.error('User ID not available for updating notes');
              return;
            }
            
            // First, get the current notes from the database
            const { data: currentFavorite } = await supabase
              .from('user_favorites')
              .select('notes')
              .eq('user_id', user.id)
              .eq('property_id', property.property_id)
              .single();
            
            const existingNotes = currentFavorite?.notes || '';
            
            // Combine existing notes with new reminder note
            const updatedNotes = existingNotes 
              ? `${existingNotes}\n${reminderNote}`
              : reminderNote;
            
            // Update notes with reminder
            const response = await fetch('/api/favorites/update-notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                property_id: property.property_id,
                notes: updatedNotes
              })
            });
            
            if (!response.ok) {
              throw new Error('Failed to update notes');
            }
            
            // Update the local state immediately to show the new notes
            setSavedProperties(prev => prev.map(p => {
              if (p.original_property_id === property.original_property_id) {
                return { ...p, notes: updatedNotes };
              }
              return p;
            }));
          } catch (noteError) {
            console.error('Failed to add marketing letter reminder note:', noteError);
            // Don't fail the letter generation if notes fail
          }
        }
      }

      setSuccessMessage(`Marketing letters generated successfully for ${propertyIds.length} properties!`);
      setShowSuccessModal(true);

      // Increment activity count for marketing letters created
      if (user?.id) {
        await incrementActivityCount(user.id, 'marketing_letters_created');
      }
    } catch (error) {
      // Error generating marketing letters
      showError('Failed to generate marketing letters. Please try again.', 'Generation Failed');
    }
  };

  const handleDocumentAction = (action: string) => {
    // Process bulk action for selected properties
    
    // TODO: Implement document generation logic
    switch (action) {
      case 'marketing-letter':
        // Can handle multiple properties
        if (selectedProperties.length === 0) {
          showWarning('Please select at least one property to generate marketing letters.', 'No Selection');
          return;
        }
        
        // Import and call marketing letter generator
        handleGenerateMarketingLetters(selectedProperties);
        break;
      case 'view-offers':
        // View offers doesn't require property selection - shows all offers
        handleViewOffers();
        break;
      case 'cash-flow-report':
        // Cash flow report doesn't require property selection - shows all offers
        setShowCashFlowReportsModal(true);
        break;
      case 'csv':
        // CSV export doesn't require property selection - exports filtered results
        handleCSVExport();
        break;
      case 'email':
      case 'loi':
      case 'purchase-sale':
      case 'create-offer':
        // Should only allow 1 property
        if (selectedProperties.length !== 1) {
          showWarning(`${action.toUpperCase()} can only be generated for one property at a time.`, 'Single Property Only');
          return;
        }
        // Handle specific actions
        if (action === 'email') {
          handleEmailGeneration(selectedProperties[0]);
        } else if (action === 'loi') {
          handleLOIGeneration(selectedProperties[0]);
        } else if (action === 'purchase-sale') {
          handlePurchaseSaleGeneration(selectedProperties[0]);
        } else if (action === 'create-offer') {
          // Navigate to offer analyzer
          const property = savedProperties.find(p => p.property_id === selectedProperties[0]);
          if (property) {
            const params = new URLSearchParams({
              address: property.address,
              city: property.city,
              state: property.state,
              units: property.units.toString(),
              assessed: property.assessed,
              built: property.built.toString(),
              id: property.id.toString(),
              source: 'engage'
            });
            router.push(`/offer-analyzer?${params.toString()}`);

            // Increment activity count for offer creation initiated
            if (user?.id) {
              incrementActivityCount(user.id, 'offers_created');
            }
          }
        }
        break;
      case 'csv':
        // Export filtered results
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Old engagement center dropdown removed
      
      // Close filter dropdowns when clicking outside
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(event.target as Node)) {
        setShowMarketDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="px-4 sm:px-6 lg:px-8">
        

        {/* Filters and Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            
            {/* Left side - Selection and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Clear Selection Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedProperties.length > 0}
                  onChange={clearSelection}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Clear Selection</span>
              </div>

              {/* Delete Selected Button */}
              {selectedProperties.length > 0 && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Selected ({selectedProperties.length})</span>
                </button>
              )}

              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              {/* Property Count */}
              <div className="text-sm text-gray-600">
                {filteredProperties.length} saved investment opportunities
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              {/* Old engagement center button removed */}
            </div>
          </div>
        </div>

        {/* Mobile Engagement Center - Full Width */}
        <div className="lg:hidden mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Engagement Center</h3>
              <div className="text-sm text-gray-600 mt-1">
                {selectedProperties.length} properties selected
              </div>
            </div>

            {/* Mobile Actions - Two Column Layout */}
            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDocumentAction('email')}
                className="flex flex-col items-center justify-center py-4 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors border border-gray-200"
                disabled={selectedProperties.length !== 1}
                title="Generate email template for selected property"
              >
                <div className="h-6 w-6 mb-2 flex items-center justify-center">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <div className="font-medium">Marketing Email</div>
                  <div className="text-xs text-gray-500 mt-1">Select 1 property</div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  if (selectedProperties.length === 1) {
                    router.push(`/roadtrip?propertyId=${selectedProperties[0]}`);
                  }
                }}
                disabled={selectedProperties.length !== 1}
                className="flex flex-col items-center justify-center py-4 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors border border-gray-200"
                title="Explore nearby properties around selected property"
              >
                <Route className="h-6 w-6 mb-2" />
                <div className="text-center">
                  <div className="font-medium">Road Trip</div>
                  <div className="text-xs text-gray-500 mt-1">Explore nearby</div>
                </div>
              </button>
            </div>

            {/* Helper text when no properties selected */}
            {selectedProperties.length === 0 && (
              <div className="p-4 text-sm text-gray-500 text-center border-t border-gray-200">
                Select properties to enable actions
              </div>
            )}
          </div>
        </div>

        {/* Main Layout - Left Sidebar + Content */}
        <div className="flex gap-6">
          {/* Left Sidebar - Engagement Center */}
          <div className="w-80 flex-shrink-0 hidden lg:block">
            {/* Spacer to align with pipeline cards */}
            <div className="h-2 mb-4"></div>
            
            {/* View Mode Toggle and Filters */}
            <div className="mb-3">
              <div className="flex flex-col space-y-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'cards' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Grid3x3 className="h-4 w-4 mr-1.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'map' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Map className="h-4 w-4 mr-1.5" />
                    Map
                  </button>
                </div>

                {/* Market Filter */}
                <div 
                  className="relative" 
                  ref={marketDropdownRef}
                  onMouseEnter={() => {
                    // Clear any existing timeout when mouse enters
                    if (marketDropdownTimeoutRef.current) {
                      clearTimeout(marketDropdownTimeoutRef.current);
                      marketDropdownTimeoutRef.current = null;
                    }
                  }}
                  onMouseLeave={() => {
                    // Set timeout to close dropdown when mouse leaves
                    if (showMarketDropdown) {
                      marketDropdownTimeoutRef.current = setTimeout(() => {
                        setShowMarketDropdown(false);
                      }, 300); // 300ms delay
                    }
                  }}
                >
                  <button
                    onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
                  >
                    Markets ({selectedMarkets.length} selected)
                  </button>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  
                  {showMarketDropdown && (
                    <div 
                      className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Market Options</span>
                          <button
                            onClick={() => {
                              if (selectedMarkets.length === uniqueMarkets.length) {
                                setSelectedMarkets([]);
                              } else {
                                setSelectedMarkets([...uniqueMarkets]);
                              }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            {selectedMarkets.length === uniqueMarkets.length ? 'Clear All' : 'Select All'}
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {uniqueMarkets.map(market => (
                            <label key={market} className="flex items-center space-x-2 py-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedMarkets.includes(market)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMarkets(prev => [...prev, market]);
                                  } else {
                                    setSelectedMarkets(prev => prev.filter(m => m !== market));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 text-xs"
                              />
                              <span className="text-sm">{market}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Source Filter */}
                <div className="relative">
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {uniqueSources.map(source => (
                      <option key={source} value={source}>
                        {source === 'All' ? 'All Sources' : source}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                
                {/* Clear Filters Button */}
                {(selectedStatuses.length > 0 || selectedMarkets.length > 0 || selectedSource !== 'All' || selectedPipelineStage !== 'all') && (
                  <button
                    onClick={() => {
                      setSelectedStatuses([]);
                      setSelectedMarkets([]);
                      setSelectedSource('All');
                      setSelectedPipelineStage('all');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium text-left"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-6 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Engagement Center</h3>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedProperties.length} properties selected
                </div>
              </div>

              {/* Marketing Materials Section */}
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setShowMarketingMaterials(!showMarketingMaterials)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm font-normal text-gray-900">MARKETING MATERIALS</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showMarketingMaterials ? 'rotate-180' : ''}`} />
                </button>
                {showMarketingMaterials && (
                  <div className="px-4 pb-3 space-y-2">
                    <button
                      onClick={() => handleDocumentAction('marketing-letter')}
                      className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                      disabled={selectedProperties.length === 0}
                      title="Generate marketing letters for selected properties"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <div>
                          <div>Marketing Letter</div>
                          <div className="text-xs text-gray-500">Batch multiple properties</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDocumentAction('email')}
                      className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                      disabled={selectedProperties.length !== 1}
                      title="Generate email template for selected property"
                    >
                      <div className="flex items-center">
                        <div className="h-4 w-4 mr-2 flex items-center justify-center">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div>Marketing Email</div>
                          <div className="text-xs text-gray-500">Select 1 property</div>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Legal Documents Section */}
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setShowLegalDocuments(!showLegalDocuments)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm font-normal text-gray-900">LEGAL DOCUMENTS</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showLegalDocuments ? 'rotate-180' : ''}`} />
                </button>
                {showLegalDocuments && (
                  <div className="px-4 pb-3 space-y-2">
                    <button
                      onClick={() => handleDocumentAction('loi')}
                      className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                      disabled={selectedProperties.length !== 1}
                      title="Generate Letter of Intent - select exactly 1 property"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <div>
                          <div>Letters of Intent</div>
                          <div className="text-xs text-gray-500">Select 1 property</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDocumentAction('purchase-sale')}
                      className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                      disabled={selectedProperties.length !== 1}
                      title="Generate Purchase & Sale Agreement - select exactly 1 property"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <div>
                          <div>Purchase & Sale</div>
                          <div className="text-xs text-gray-500">Select 1 property</div>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Financial Analysis Section */}
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setShowFinancialAnalysis(!showFinancialAnalysis)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm font-normal text-gray-900">FINANCIAL ANALYSIS</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showFinancialAnalysis ? 'rotate-180' : ''}`} />
                </button>
                {showFinancialAnalysis && (
                  <div className="px-4 pb-3 space-y-2">
                    <button
                      onClick={() => handleDocumentAction('create-offer')}
                      className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                      disabled={selectedProperties.length !== 1}
                      title="Create new analysis for selected property"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <div>
                          <div>Create Analysis</div>
                          <div className="text-xs text-gray-500">Select 1 property</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDocumentAction('view-offers')}
                      className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                      title="View all your analyses"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <div>
                          <div>View Analyses</div>
                          <div className="text-xs text-gray-500">View all your analyses</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDocumentAction('cash-flow-report')}
                      className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                      disabled={selectedProperties.length !== 1}
                      title="Generate 10-year cash flow reports - select exactly 1 property"
                    >
                      <div className="flex items-center">
                        <div className="h-4 w-4 mr-2 flex items-center justify-center">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a4 4 0 01-4 4z" />
                          </svg>
                        </div>
                        <div>
                          <div>Cash Flow Report</div>
                          <div className="text-xs text-gray-500">Select 1 property</div>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Download Section */}
              <div>
                <button
                  onClick={() => setShowToolbox(!showToolbox)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm font-normal text-gray-900">TOOLBOX</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showToolbox ? 'rotate-180' : ''}`} />
                </button>
                {showToolbox && (
                  <div className="px-4 pb-3 space-y-2">
                    <button
                      onClick={() => {
                        if (selectedProperties.length === 1) {
                          router.push(`/roadtrip?propertyId=${selectedProperties[0]}`);
                        }
                      }}
                      disabled={selectedProperties.length !== 1}
                      className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                      title="Explore nearby properties around selected property"
                    >
                      <div className="flex items-center">
                        <Route className="h-4 w-4 mr-2" />
                        <div>
                          <div>Road Trip</div>
                          <div className="text-xs text-gray-500">Explore nearby properties</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDocumentAction('csv')}
                      className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                      title="Export filtered results to CSV"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <div>
                          <div>CSV Download</div>
                          <div className="text-xs text-gray-500">Export filtered results</div>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Helper text when no properties selected */}
              {selectedProperties.length === 0 && (
                <div className="p-4 text-sm text-gray-500 text-center">
                  Select properties to enable actions
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Content based on view mode */}
            {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your saved properties...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Properties</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {savedProperties.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Properties</h3>
                  <p className="text-gray-600 mb-4">You haven't saved any properties yet. Start by discovering properties and saving your favorites.</p>
                  <a 
                    href="/discover" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Discover Properties
                  </a>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Match Your Filters</h3>
                  <p className="text-gray-600 mb-4">You have {savedProperties.length} saved properties, but none match your current filter criteria.</p>
                  <button 
                    onClick={() => {
                      setSelectedStatuses([]);
                      setSelectedMarkets([]);
                      setSelectedSource('All');
                      setSelectedPipelineStage('all');
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Clear All Filters
                  </button>
                </>
              )}
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          <div>
            {/* Pipeline Status Metric Cards */}
            <div className="mb-6 hidden lg:block">
              <div className="flex items-center justify-between gap-2 md:gap-4">
                {(() => {
                  const stages = ['Reviewing', 'Analyzing', 'Engaged', 'LOI Sent'];
                  const stageMetrics = stages.map(stage => {
                    // Apply market and source filters to stage properties
                    const stageProperties = savedProperties.filter(property => {
                      // Must match the pipeline stage
                      const matchesStage = property.pipelineStatus === stage;
                      
                      // Apply market filter
                      let matchesMarket = selectedMarkets.length === 0;
                      if (!matchesMarket && selectedMarkets.length > 0) {
                        for (const selectedMarket of selectedMarkets) {
                          if (selectedMarket === 'No market' && !property.market_key) {
                            matchesMarket = true;
                            break;
                          } else if (selectedMarket !== 'No market') {
                            if (property.market === selectedMarket) {
                              matchesMarket = true;
                              break;
                            }
                          }
                        }
                      }
                      
                      // Apply source filter
                      const matchesSource = selectedSource === 'All' || 
                        (selectedSource === 'Algorithm' && property.source === 'A') ||
                        (selectedSource === 'Manual' && property.source === 'M');
                      
                      return matchesStage && matchesMarket && matchesSource;
                    });
                    return {
                      name: stage,
                      count: stageProperties.length,
                      units: stageProperties.reduce((sum, p) => sum + (parseInt(p.units) || 0), 0),
                      assessedValue: stageProperties.reduce((sum, p) => sum + (parseFloat(p.assessed?.replace(/[$,]/g, '')) || 0), 0),
                      estimatedValue: stageProperties.reduce((sum, p) => sum + (parseFloat(p.estimated?.replace(/[$,]/g, '')) || 0), 0)
                    };
                  });

                  // Calculate totals for the summary card (also apply market and source filters)
                  const allActiveProperties = savedProperties.filter(property => {
                    // Include all pipeline stages for "All Active"
                    const isActiveStage = stages.includes(property.pipelineStatus);
                    
                    // Apply market filter
                    let matchesMarket = selectedMarkets.length === 0;
                    if (!matchesMarket && selectedMarkets.length > 0) {
                      for (const selectedMarket of selectedMarkets) {
                        if (selectedMarket === 'No market' && !property.market_key) {
                          matchesMarket = true;
                          break;
                        } else if (selectedMarket !== 'No market') {
                          if (property.market === selectedMarket) {
                            matchesMarket = true;
                            break;
                          }
                        }
                      }
                    }
                    
                    // Apply source filter
                    const matchesSource = selectedSource === 'All' || 
                      (selectedSource === 'Algorithm' && property.source === 'A') ||
                      (selectedSource === 'Manual' && property.source === 'M');
                    
                    return isActiveStage && matchesMarket && matchesSource;
                  });

                  const totalMetrics = {
                    name: 'All Active',
                    count: allActiveProperties.length,
                    units: allActiveProperties.reduce((sum, p) => sum + (parseInt(p.units) || 0), 0),
                    assessedValue: allActiveProperties.reduce((sum, p) => sum + (parseFloat(p.assessed?.replace(/[$,]/g, '')) || 0), 0),
                    estimatedValue: allActiveProperties.reduce((sum, p) => sum + (parseFloat(p.estimated?.replace(/[$,]/g, '')) || 0), 0)
                  };

                  const formatCurrency = (value: number) => {
                    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                    return `$${value.toFixed(0)}`;
                  };

                  // Calculate Acquired/Rejected metrics
                  const acquiredRejectedProperties = savedProperties.filter(property => {
                    // Include Acquired and Rejected stages
                    const isAcquiredOrRejected = ['Acquired', 'Rejected'].includes(property.pipelineStatus);
                    
                    // Apply same market and source filters
                    let matchesMarket = selectedMarkets.length === 0;
                    if (!matchesMarket && selectedMarkets.length > 0) {
                      if (selectedMarkets.includes('No Market')) {
                        matchesMarket = !property.market || property.market === 'Unknown Market' || property.market.trim() === '';
                      }
                      if (!matchesMarket) {
                        matchesMarket = selectedMarkets.some(market => 
                          market !== 'No Market' && property.market === market
                        );
                      }
                    }
                    
                    const matchesSource = selectedSource === 'All' || 
                      (selectedSource === 'Algorithm' && property.source === 'A') ||
                      (selectedSource === 'Manual' && property.source === 'M');
                    
                    return isAcquiredOrRejected && matchesMarket && matchesSource;
                  });

                  const acquiredRejectedMetrics = {
                    name: 'Acq/Rej',
                    count: acquiredRejectedProperties.length,
                    units: acquiredRejectedProperties.reduce((sum, p) => sum + (parseInt(p.units) || 0), 0),
                    assessedValue: acquiredRejectedProperties.reduce((sum, p) => sum + (parseFloat(p.assessed?.replace(/[$,]/g, '')) || 0), 0),
                    estimatedValue: acquiredRejectedProperties.reduce((sum, p) => sum + (parseFloat(p.estimated?.replace(/[$,]/g, '')) || 0), 0)
                  };

                  const allMetrics = [totalMetrics, ...stageMetrics, acquiredRejectedMetrics];

                  // Color scheme: cool to warm background colors
                  const getCardStyles = (metricName: string, index: number) => {
                    const isSelected = selectedPipelineStage === (index === 0 ? 'all' : metricName);
                    
                    if (index === 0) {
                      // "All Active" card - white background with green left border
                      return isSelected 
                        ? 'bg-white text-gray-900 shadow-lg border-l-4 border-l-green-500 border-t border-r border-b border-gray-200' 
                        : 'bg-white text-gray-900 hover:shadow-md border-l-4 border-l-green-500 border-t border-r border-b border-gray-200';
                    }
                    
                    // Stage cards with white backgrounds and colored left borders
                    const colors = [
                      // Reviewing (gray)
                      { leftBorder: 'border-l-gray-500' },
                      // Analyzing (yellow)  
                      { leftBorder: 'border-l-yellow-500' },
                      // Engaged (blue)
                      { leftBorder: 'border-l-blue-500' },
                      // LOI Sent (purple)
                      { leftBorder: 'border-l-purple-500' },
                      // Acquired/Rejected (red)
                      { leftBorder: 'border-l-red-500' }
                    ];
                    
                    const colorIndex = index - 1; // Subtract 1 because first card is "All Active"
                    const color = colors[colorIndex] || colors[0];
                    
                    return isSelected 
                      ? `bg-white text-gray-900 shadow-lg border-l-4 ${color.leftBorder} border-t border-r border-b border-gray-300` 
                      : `bg-white text-gray-900 hover:shadow-md border-l-4 ${color.leftBorder} border-t border-r border-b border-gray-200`;
                  };

                  const cardElements: React.ReactElement[] = [];
                  
                  allMetrics.forEach((metric, index) => {
                    const isDisabled = metric.count === 0;
                    const isClickable = !isDisabled;
                    
                    // Add the card
                    cardElements.push(
                      <div
                        key={metric.name}
                        onClick={isClickable ? () => setSelectedPipelineStage(index === 0 ? 'all' : metric.name) : undefined}
                        className={`rounded-lg border-2 p-1 md:p-2 transition-all flex-shrink-0 w-28 md:w-32 lg:w-40 ${
                          isDisabled 
                            ? 'opacity-50 cursor-not-allowed bg-gray-300 border-gray-400' 
                            : `hover:shadow-md cursor-pointer ${getCardStyles(metric.name, index)}`
                        }`}
                      >
                        <div className="text-center">
                          <div className={`text-lg md:text-xl lg:text-2xl font-bold mb-0 leading-tight ${isDisabled ? 'text-gray-500' : ''}`}>{metric.count}</div>
                          <div className={`text-xs md:text-sm font-semibold mb-0 leading-tight ${isDisabled ? 'text-gray-600' : ''}`}>{metric.name}</div>
                          <div className={`text-xs space-y-0 leading-tight ${isDisabled ? 'text-gray-500' : 'opacity-90'}`}>
                            <div>{metric.units} units</div>
                            <div>{formatCurrency(metric.estimatedValue)} market</div>
                          </div>
                        </div>
                      </div>
                    );
                    
                    // Add arrow after each card except the last one
                    if (index < allMetrics.length - 1) {
                      cardElements.push(
                        <div key={`arrow-${index}`} className="flex items-center">
                          <div className="bg-gray-100 border-2 border-gray-300 rounded-full p-2 md:p-3 shadow-sm">
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      );
                    }
                  });
                  
                  return cardElements;
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSelected={selectedProperties.includes(property.property_id)}
                onToggleSelect={() => togglePropertySelection(property.property_id)}
                marketOptions={marketOptions}
                onStatusUpdate={handleStatusUpdate}
                onMarketUpdate={handleMarketUpdate}
                currentViewMode={viewMode}
                onRemoveFromFavorites={handleRemoveFromFavorites}
              />
            ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
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
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                
                <div className="ml-4 text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} of {filteredProperties.length} properties
                </div>
              </div>
            )}
          </div>
        ) : null}

        {!isLoading && !error && viewMode === 'map' && (
          <div className="hidden lg:flex gap-6 h-[600px]">
            {/* Left: Map */}
            <div className="w-2/5">
              <PropertyMapWithRents
                properties={filteredProperties}
                className="h-full rounded-lg border border-gray-200"
                context="engage"
                currentViewMode={viewMode}
              />
            </div>
            
            {/* Right: Properties in 2-column grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paginatedProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSelected={selectedProperties.includes(property.property_id)}
                    onToggleSelect={() => togglePropertySelection(property.property_id)}
                    marketOptions={marketOptions}
                    onStatusUpdate={handleStatusUpdate}
                    onMarketUpdate={handleMarketUpdate}
                    currentViewMode={viewMode}
                    onRemoveFromFavorites={handleRemoveFromFavorites}
                  />
                ))}
              </div>
              
              {filteredProperties.length === 0 && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Found</h3>
                    <p className="text-gray-600">No properties match your current filters.</p>
                  </div>
                </div>
              )}

              {/* Pagination Controls for Map View */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`w-8 h-8 rounded-lg text-sm ${
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
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Next
                  </button>
                  
                  <div className="ml-4 text-xs text-gray-600">
                    {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} of {filteredProperties.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 relative">
            {/* Brand Header */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Selected Properties</h3>
                <p className="text-sm text-gray-600">MultifamilyOS.ai</p>
              </div>
            </div>

            {/* Warning Content */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm">
                Are you sure you want to continue? This will remove these properties from your investment pipeline.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleMassDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete {selectedProperties.length} Properties
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Success</h3>
                <p className="text-sm text-gray-600">{successMessage}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offers Modal */}
      {showOffersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Select an Analysis</h3>
              <button
                onClick={() => setShowOffersModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedPropertyOffers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 4z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">No offers found</h4>
                  <p className="text-sm text-gray-500">No offers have been created yet.</p>
                </div>
              ) : (
                selectedPropertyOffers.map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => handleOfferSelection(offer.id, offer.property_id)}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{offer.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
                        <p className="text-xs text-gray-500 mt-2">{offer.property_address}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-lg font-semibold text-blue-600">{offer.offer_amount}</div>
                          <div className="text-xs text-gray-500">{offer.created_date}</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOffer(offer.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm"
                          title="Delete offer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowOffersModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Reports Modal */}
      <CashFlowReportsModal
        isOpen={showCashFlowReportsModal}
        onClose={() => setShowCashFlowReportsModal(false)}
        onGenerate={handleGenerateReportFromModal}
      />

      {/* Alert Modal */}
      {AlertComponent}
          </div>
        </div>
    </div>
  );
}

export default function EngagePage() {
  return (
    <AuthGuard>
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Engage</h1>
            <p className="text-gray-600">Loading your saved properties...</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    }>
      <EngagePageContent />
    </Suspense>
    </AuthGuard>
  );
}

function PropertyCard({ 
  property, 
  isSelected, 
  onToggleSelect,
  marketOptions,
  onStatusUpdate,
  onMarketUpdate,
  currentViewMode,
  onRemoveFromFavorites
}: { 
  property: any; 
  isSelected: boolean; 
  onToggleSelect: () => void;
  marketOptions: { key: string | null; name: string }[];
  onStatusUpdate?: (propertyId: string, newStatus: string) => void;
  onMarketUpdate?: (propertyId: string, newMarket: string | null) => void;
  currentViewMode?: string;
  onRemoveFromFavorites?: (propertyId: string) => void;
}) {
  const router = useRouter();
  const [pipelineStatus, setPipelineStatus] = useState(property.pipelineStatus);
  const [market, setMarket] = useState(property.market_key);
  const [isFavorited, setIsFavorited] = useState(true); // Start as favorited since this is engage page
  const [notes, setNotes] = useState(property.notes || '');
  
  // Update local notes state when property.notes changes
  useEffect(() => {
    setNotes(property.notes || '');
  }, [property.notes]);

  const updateFavoriteStatus = async (newStatus: string) => {
    try {
      const response = await fetch('/api/favorites/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: property.property_id || property.id,
          favorite_status: newStatus
        })
      });
      
      if (!response.ok) {
        // Failed to update favorite status
      } else {
        // Update parent component's state
        if (onStatusUpdate) {
          onStatusUpdate(property.id, newStatus);
        }
      }
    } catch (error) {
      // Error updating favorite status
    }
  };

  const updateFavoriteMarket = async (newMarket: string | null) => {
      try {
      const response = await fetch('/api/favorites/update-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: property.id,
          market_key: newMarket
        })
      });
      
      if (!response.ok) {
        // Failed to update favorite market
      }
    } catch (error) {
      // Error updating favorite market
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Reviewing': return 'bg-gray-100 text-gray-700';
      case 'Communicating': return 'bg-blue-100 text-blue-700';
      case 'Engaged': return 'bg-green-100 text-green-700';
      case 'Analyzing': return 'bg-yellow-100 text-yellow-700';
      case 'LOI Sent': return 'bg-purple-100 text-purple-700';
      case 'Acquired': return 'bg-emerald-100 text-emerald-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isFavorited) return; // Already unfavorited
    
    try {
      // Optimistically update UI
      setIsFavorited(false);
      
      // Call API to delete from favorites
      // Attempting to delete favorite
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.original_property_id || property.id
        })
      });

      const result = await response.json();
      // Process delete response

      if (!response.ok) {
        // Revert if API call fails
        setIsFavorited(true);
        // Failed to remove from favorites
        return;
      }

      // Successfully deleted favorite from API
      
      // Notify parent component to remove from list
      if (onRemoveFromFavorites) {
        // Removing from UI list
        onRemoveFromFavorites(property.original_property_id || property.id);
      }
    } catch (error) {
      // Revert if error occurs
      setIsFavorited(true);
      // Error removing from favorites
    }
  };

  const getHeartColor = () => {
    if (!isFavorited) {
      return 'text-gray-400';
    }
    return property.source === 'A' ? 'text-blue-600' : 'text-red-500';
  };


  const getStreetViewImage = () => {
    const address = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
    return `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  };

  const handleZillowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const zillowUrl = `https://www.zillow.com/homes/${property.address.replace(/\s+/g, '-')}-${property.city}-${property.state}-${property.zip}_rb/`;
    window.open(zillowUrl, '_blank');
  };

  const handleImageClick = () => {
    const address = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Property Image */}
      <div className="relative aspect-[4/3] bg-gray-200">
        <img 
          src={getStreetViewImage()}
          alt={`Street view of ${property.address}`}
          className="w-full h-full object-cover hover:opacity-95 transition-opacity"
          onError={(e) => {
            // Fallback to placeholder if Street View fails
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
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
        
        
        {/* Heart with Source Indicator */}
        <div className="absolute top-3 right-3">
          <button 
            onClick={handleHeartClick}
            className={`p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors cursor-pointer ${getHeartColor()}`}
            title={isFavorited ? "Remove from favorites" : "Removed from favorites"}
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : 'stroke-current fill-none'}`} />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs font-bold border border-gray-200">
              {property.source}
            </div>
          </button>
        </div>

      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Address */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {property.address}
          </h3>
          <div className="flex items-center space-x-2">
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shadow-sm"
            />
          </div>
        </div>
        
        {/* Location and Basic Info */}
        <p className="text-sm text-gray-600 mb-3">
          {property.city}, {property.state} • {property.units} Units • Built {property.built}
        </p>

        {/* Market and Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-3 w-3 mr-1" />
            <select
              value={market || ''}
              onChange={(e) => {
                const selectedValue = e.target.value;
                const newMarket = selectedValue === '' ? null : selectedValue;
                setMarket(newMarket);
                updateFavoriteMarket(newMarket);
                // Update parent component state immediately
                if (onMarketUpdate) {
                  onMarketUpdate(property.property_id || property.id.toString(), newMarket);
                }
              }}
              className="text-xs px-2 py-1 rounded-full font-medium border-0 focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-700"
            >
              {marketOptions.map((marketOption, index) => (
                <option key={marketOption.key || `no-market-${index}`} value={marketOption.key || ''}>
                  {marketOption.name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={pipelineStatus}
              onChange={(e) => {
                const newStatus = e.target.value;
                setPipelineStatus(newStatus);
                updateFavoriteStatus(newStatus);
              }}
              className={`text-xs px-2 py-1 rounded-full font-medium border-0 focus:ring-2 focus:ring-blue-500 ${getStatusColor(pipelineStatus)}`}
            >
              <option value="Reviewing">Reviewing</option>
              <option value="Communicating">Communicating</option>
              <option value="Engaged">Engaged</option>
              <option value="Analyzing">Analyzing</option>
              <option value="LOI Sent">LOI Sent</option>
              <option value="Acquired">Acquired</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="text-xl font-bold text-gray-900">
            {property.estimated}
          </div>
          <div className="text-sm text-gray-600">
            Assessed: <span className="font-medium text-blue-600">{property.assessed}</span>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes... Use @MM/DD/YY for reminders"
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
            rows={2}
            onBlur={async (e) => {
              // Reset height to standard size
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
              
              // Then auto-resize back to 2 rows worth
              setTimeout(() => {
                e.target.style.height = '40px'; // Standard 2-row height
              }, 0);
              
              try {
                const payload = {
                  property_id: property.property_id,
                  notes: notes
                };
                
                const response = await fetch('/api/favorites/update-notes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                  const errorData = await response.text();
                  // Failed to update notes
                }
              } catch (error) {
                // Error updating notes
              }
            }}
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end pt-3 border-t border-gray-100">
          <button 
            onClick={() => {
              const baseUrl = new URL('/engage', window.location.origin);
              if (currentViewMode && currentViewMode !== 'cards') {
                baseUrl.searchParams.set('viewMode', currentViewMode);
              }
              const backUrl = encodeURIComponent(baseUrl.toString());
              window.location.href = `/discover/property/${property.property_id || property.id}?context=engage&back=${backUrl}`;
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}