"use client";

import React, { useEffect, useRef, useState } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { PropertyProfileModal } from '../property/profile-modal';
import { FilterToggle } from '../filters/toggle';
import { FilterRange } from '../filters/range';
import { BasicFilters } from '../filters/basic';
import { AdvancedFilters } from '../filters/advanced';
import { filterRelevantFields } from '../utils/listing';
import { areAllListingsSelected, createSelectAllHandler } from '../utils/selection';
import { SmartQueries } from '../filters/smart-queries';
import { ChevronRight } from 'lucide-react';
import { getPrimaryClassification, getClassificationCount } from '../property/property-classifier';
import { PropertyBadge } from '../property/property-badge';


export type Listing = {
    id: string;
    address: {
        street?: string;
        address: string;
        city?: string;
        state?: string;
        zip?: string;
    };
    mailAddress?: {
        address?: string;
        city?: string;
        county?: string;
        state?: string;
        street?: string;
        zip?: string;
    };
    lastSaleArmsLength?: boolean;
    mlsActive?: boolean;
    lastSaleAmount?: number;
    lotSquareFeet?: number;
    yearsOwned?: number;
    outOfStateAbsenteeOwner?: boolean;
    property_type?: string;
    squareFeet?: number;
    rentEstimate?: number;
    assessedLandValue?: number;
    assessedValue?: number;
    assumable?: boolean;
    auction?: boolean;
    corporate_owned?: boolean;
    estimatedEquity?: number;
    estimatedValue?: number;
    floodZone?: boolean;
    foreclosure?: boolean;
    forSale?: boolean;
    privateLender?: boolean;
    inStateAbsenteeOwner?: boolean;
    investorBuyer?: boolean;
    lastSaleDate?: string;
    lenderName?: string;
    listingPrice?: number;
    mortgageBalance?: number;
    mortgageMaturingDate?: string;
    yearBuilt?: number;
    ownerOccupied?: boolean;
    preForeclosure?: boolean;
    reo?: boolean;
    taxLien?: boolean;
    totalPortfolioEquity?: number;
    totalPortfolioMortgageBalance?: number;
    totalPropertiesOwned?: number;
    floodZoneDescription?: string;
    unitsCount?: number;
    owner1FirstName?: string;
    owner1LastName?: string;
    stories?: number;
};

type Props = {
    onSearch: (filters: Record<string, any>) => Promise<void>;
    listings: Listing[];
    selectedListings: Listing[];
    toggleListingSelect: (listing: Listing) => void;
    onSendToGPT: (filteredListings?: any[], autoProcessOrBatchIndex?: boolean | number) => void;
    isLoggedIn: boolean;
    triggerAuthModal: () => void;
    onCreditsUpdate?: (newBalance: number) => void;
    userClass: 'trial' | 'charlie_chat' | 'charlie_chat_pro' | 'cohort';
    triggerBuyCreditsModal: () => void;
    clearSelectedListings?: () => void;
};

export const Sidebar = ({
    onSearch,
    listings,
    selectedListings,
    toggleListingSelect,
    onSendToGPT,
    isLoggedIn: userIsLoggedIn,
    triggerAuthModal,
    onCreditsUpdate,
    userClass,
    triggerBuyCreditsModal,
    clearSelectedListings
}: Props) => {
    const [zipcode, setZipcode] = useState("");
    const [minUnits, setMinUnits] = useState<number | string>(2);
    const [maxUnits, setMaxUnits] = useState<number | string>("");

    // New state and logic for Select All
    const currentSearchListings = listings;
    const allCurrentSelected = areAllListingsSelected(currentSearchListings, selectedListings);
    const someCurrentSelected = selectedListings.length > 0;

    //New states to support property paging
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [lastSearchParameters, setLastSearchParameters] = useState<Record<string, any> | null>(null);
    const [hasMoreProperties, setHasMoreProperties] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const handleSelectAll = () => {
        if (allCurrentSelected) {
            // Deselect all current listings
            currentSearchListings.forEach(listing => {
                if (selectedListings.some(selected => selected.id === listing.id)) {
                    toggleListingSelect(listing);
                }
            });
        } else {
            // Select all current listings that aren't already selected
            currentSearchListings.forEach(listing => {
                if (!selectedListings.some(selected => selected.id === listing.id)) {
                    toggleListingSelect(listing);
                }
            });
        }
    };

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showTrialUpgradeMessage, setShowTrialUpgradeMessage] = useState(false);

    const [mlsActive, setMlsActive] = useState("");
    const [radius, setRadius] = useState(5);

    const [street, setStreet] = useState("");
    const [house, setNumber] = useState("");
    const [city, setCity] = useState("");
    const [stateCode, setStateCode] = useState("");

    useEffect(() => {
        const hasCity = city.trim() !== "";
        const hasState = stateCode.trim() !== "";
        const hasZip = zipcode.trim() !== "";

        // Rule 1: City requires state
        if (hasCity && !hasState) {
            setLocationError("Tip: State is required when a City is provided.");
            return;
        }

        // Rule 2: If both city and state are not filled, then ZIP is required
        if (!hasCity && !hasState && !hasZip) {
            setLocationError("Tip: ZIP code(s) is required when city and state are not provided.");
            return;
        }

        setLocationError(null);
    }, [city, stateCode, zipcode]);

    const [preForeclosure, setPreForeclosure] = useState("");
    const [floodZone, setFloodZone] = useState("");
    const [assumable, setAssumable] = useState("");
    const [lastSaleArmsLength, setLastSaleArmsLength] = useState("");

    // New states for the requested boolean filters
    const [auction, setAuction] = useState("");
    const [reo, setReo] = useState("");
    const [taxLien, setTaxLien] = useState("");
    const [privateLender, setPrivateLender] = useState("");
    const DEFAULT_LAST_SALE_PRICE_RANGE: [number, number] = [0, 10000000];
    const [lastSaleDateRange, setlastSaleDateRange] = useState<[number, number]>([0, 2025]);
    const [lastSalePriceRange, setLastSalePriceRange] = useState<[number, number]>(DEFAULT_LAST_SALE_PRICE_RANGE);
    const DEFAULT_YEAR_RANGE: [number, number] = [1800, 2025];
    const [yearBuiltRange, setYearBuiltRange] = useState<[number, number]>(DEFAULT_YEAR_RANGE);
    const DEFAULT_LOT_SIZE_RANGE: [number, number] = [0, 100000];
    const [lotSizeRange, setLotSizeRange] = useState<[number, number]>(DEFAULT_LOT_SIZE_RANGE);
    const DEFAULT_STORIES_RANGE: [number, number] = [0, 20];
    const [storiesRange, setStoriesRange] = useState<[number, number]>(DEFAULT_STORIES_RANGE);
    const DEFAULT_MORTGAGE_BALANCE_RANGE: [number, number] = [0, 10000000];
    const [mortgageBalanceRange, setMortgageBalanceRange] = useState<[number, number]>(DEFAULT_MORTGAGE_BALANCE_RANGE);
    const DEFAULT_ASSESSED_VALUE_RANGE: [number, number] = [0, 10000000];
    const [assessedValueRange, setAssessedValueRange] = useState<[number, number]>(DEFAULT_ASSESSED_VALUE_RANGE);
    const DEFAULT_ESTIMATED_VALUE_RANGE: [number, number] = [0, 10000000];
    const [estimatedValueRange, setEstimatedValueRange] = useState<[number, number]>(DEFAULT_ESTIMATED_VALUE_RANGE);
    const DEFAULT_ESTIMATED_EQUITY_RANGE: [number, number] = [0, 10000000];
    const [estimatedEquityRange, setEstimatedEquityRange] = useState<[number, number]>(DEFAULT_ESTIMATED_EQUITY_RANGE);
    const DEFAULT_YEARS_OWNED_RANGE: [number, number] = [0, 50];
    const [yearsOwnedRange, setYearsOwnedRange] = useState<[number, number]>(DEFAULT_YEARS_OWNED_RANGE);
    const [ownerLocation, setOwnerLocation] = useState<"any" | "instate" | "outofstate">("any");
    const [corporateOwned, setCorporateOwned] = useState("");
    const [activeListingIndex, setActiveListingIndex] = useState<number | null>(null);
    const activeListing = activeListingIndex !== null ? listings[activeListingIndex] : null;
    const panelRef = useRef<HTMLDivElement>(null);
    const advancedFiltersToggleRef = useRef<HTMLButtonElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [isSearching, setIsSearching] = useState(false);
    const [creditsError, setCreditsError] = useState<string | null>(null);

    const useClickOutside = (
        panelToCloseRef: React.RefObject<HTMLElement | null>,
        ignoreClickRefs: Array<React.RefObject<HTMLElement | null>>,
        onOutsideClickCallback: () => void
    ) => {
        useEffect(() => {
            const handleClick = (event: MouseEvent) => {
                const target = event.target as Node;
                for (const ignoreRef of ignoreClickRefs) {
                    if (ignoreRef.current && ignoreRef.current.contains(target)) {
                        return;
                    }
                }
                if (panelToCloseRef.current && !panelToCloseRef.current.contains(target)) {
                    onOutsideClickCallback();
                }
            };
            document.addEventListener("mousedown", handleClick);
            return () => {
                document.removeEventListener("mousedown", handleClick);
            };
        }, [panelToCloseRef, ignoreClickRefs, onOutsideClickCallback]);
    };

    useClickOutside(
        panelRef,
        [advancedFiltersToggleRef, sidebarRef],
        () => setShowAdvanced(false)
    );

    const goToPrev = () => {
        if (activeListingIndex !== null && activeListingIndex > 0) {
            setActiveListingIndex(activeListingIndex - 1);
        }
    };

    const goToNext = () => {
        if (activeListingIndex !== null && activeListingIndex < listings.length - 1) {
            setActiveListingIndex(activeListingIndex + 1);
        }
    };

    const resetFilters = () => {
        setMinUnits(2);
        setMaxUnits("");
        setMlsActive("");
        setStreet("");
        setNumber("");
        setPreForeclosure("");
        setFloodZone("");
        setAssumable("");
        setLastSaleArmsLength("");
        setlastSaleDateRange([0, 2025]);
        setLastSalePriceRange(DEFAULT_LAST_SALE_PRICE_RANGE);
        setYearBuiltRange(DEFAULT_YEAR_RANGE);
        setLotSizeRange(DEFAULT_LOT_SIZE_RANGE);
        setStoriesRange(DEFAULT_STORIES_RANGE);
        setMortgageBalanceRange(DEFAULT_MORTGAGE_BALANCE_RANGE);
        setAssessedValueRange(DEFAULT_ASSESSED_VALUE_RANGE);
        setEstimatedValueRange(DEFAULT_ESTIMATED_VALUE_RANGE);
        setEstimatedEquityRange(DEFAULT_ESTIMATED_EQUITY_RANGE);
        setYearsOwnedRange(DEFAULT_YEARS_OWNED_RANGE);
        setOwnerLocation("any");
        setCorporateOwned("");
        // Reset new filters
        setAuction("");
        setReo("");
        setTaxLien("");
        setPrivateLender("");
    };

    //Handle the Search
    const handleSearch = async (filters: Record<string, any>) => {
        // Clear selected listings FIRST, before any search logic
        if (clearSelectedListings) {
            clearSelectedListings();
        }

        if (!userIsLoggedIn) {
            triggerAuthModal();
            return;
        }

        // Check if this is a compound query from SmartQueries
        if (filters.or || filters.and) {
            console.log("🔧 Handling compound query from SmartQueries:", filters);

            // For compound queries, use the structure as-is and add location data
            const searchParameters = {
                ...filters,
                // Add location data from form
                zip: zipcode || undefined,
                city: city || undefined,
                state: stateCode || undefined,
            };

            console.log("📤 Sending compound query:", searchParameters);

            setIsSearching(true);
            setCreditsError(null);

            try {
                console.log("🚀 ACTUAL API REQUEST BODY:", JSON.stringify(searchParameters, null, 2));
                const response = await fetch("/api/realestateapi", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(searchParameters),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Search API failed:", response.status, errorText);
                    setCreditsError("There was a problem with your search. Please try again or adjust your filters.");
                    setIsSearching(false);
                    return;
                }

                const data = await response.json();

                console.log("🔍 Normal Search API Response Structure:", {
  resultCount: data.resultCount,
  resultIndex: data.resultIndex,
  recordCount: data.recordCount,
  dataLength: data.data?.length,
  hasMoreCalculation: (data.resultIndex || 0) + (data.recordCount || 0) < (data.resultCount || 0)
});

                if (!data.data || data.data.length === 0) {
                    setCreditsError("No properties matched your criteria.");
                    await onSearch({ clearResults: true });
                    setIsSearching(false);
                    return;
                }

                // Store pagination info
                setTotalCount(data.resultCount || 0);
                setCurrentPage(0);
                setLastSearchParameters(searchParameters);
                setHasMoreProperties(data.resultIndex < data.resultCount);

                const { data: newCreditBalance, error: rpcError } = await supabase.rpc(
                    "decrement_search_credits",
                    {
                        amount_to_decrement: data.recordCount || 0,
                    }
                );

                if (rpcError) {
                    const errorMessage =
                        typeof rpcError === "object" && rpcError !== null && "message" in rpcError
                            ? String(rpcError.message)
                            : String(rpcError);

                    if (errorMessage.includes("Insufficient credits")) {
                        if (userClass === "trial") {
                            setShowTrialUpgradeMessage(true);
                        } else {
                            triggerBuyCreditsModal();
                        }

                        setIsSearching(false);
                        return;
                    }

                    setCreditsError("There was a problem with your account. Please log in again.");
                    setIsSearching(false);
                    return;
                }

                if (onCreditsUpdate && typeof newCreditBalance === "number") {
                    onCreditsUpdate(newCreditBalance);
                }

                await onSearch({
                    listings: data.data,
                    totalCount: data.resultCount,
                    hasMore: (data.resultIndex || 0) + (data.recordCount || 0) < (data.resultCount || 0)
                });
            } catch (error) {
                console.error("Unexpected error during search handling:", error);
                setCreditsError("A critical error occurred with the search. Please try again later.");
            } finally {
                setIsSearching(false);
            }
            setShowAdvanced(false);
            return;
        }

        // ✨ Location Validation - Enforce either zipcode OR city+state (not both)
        const hasCity = city.trim() !== "";
        const hasState = stateCode.trim() !== "";
        const hasZip = zipcode.trim() !== "";

        // Check if we have zipcode
        const hasValidZip = hasZip;

        // Check if we have both city and state
        const hasValidCityState = hasCity && hasState;

        // Cannot have both zipcode AND city+state filled in
        if (hasValidZip && hasValidCityState) {
            setLocationError("Enter ZIP code OR city and state, not both.");
            return;
        }

        // Must have either zipcode OR both city and state
        if (!hasValidZip && !hasValidCityState) {
            if (hasCity && !hasState) {
                setLocationError("State is required when City is provided.");
            } else if (!hasCity && hasState) {
                setLocationError("City is required when State is provided.");
            } else {
                setLocationError("Either ZIP code OR both City and State are required.");
            }
            return;
        }

        // Clear any existing errors if validation passes
        setLocationError(null);

        // 🔍 Continue with regular search (non-compound)
        setIsSearching(true);
        setCreditsError(null);
        try {
            // Build searchParameters FIRST before anything else
            let searchParameters;
            if (
                zipcode && typeof zipcode === 'string' && zipcode.trim() !== '' &&
                house && typeof house === 'string' && house.trim() !== '' &&
                street && typeof street === 'string' && street.trim() !== ''
            ) {
                // Specific address search
                searchParameters = {
                    zip: zipcode,
                    house: house,
                    street: street,
                    propertyType: "MFR",
                    count: false,        // Get actual data, not just count
                    size: 10,           // 10 properties per page
                    resultIndex: 0,     // Start at beginning
                    obfuscate: false,
                    summary: false,
                };
            } else {
                // General search
                const [lastSalePriceMin, lastSalePriceMax] = lastSalePriceRange;
                const [lotSizeMin, lotSizeMax] = lotSizeRange;
                const [storiesMin, storiesMax] = storiesRange;
                const [yearsOwnedMin, yearsOwnedMax] = yearsOwnedRange;
                const [yearBuiltMin, yearBuiltMax] = yearBuiltRange;
                const [mortgageMin, mortgageMax] = mortgageBalanceRange;
                const [assessedMin, assessedMax] = assessedValueRange;
                const [estimatedMin, estimatedMax] = estimatedValueRange;
                const [equityMin, equityMax] = estimatedEquityRange;
                const includeIfChanged = (min: number, max: number, defaultRange: [number, number], keys: [string, string]) =>
                    min !== defaultRange[0] || max !== defaultRange[1] ? { [keys[0]]: min, [keys[1]]: max } : {};

                searchParameters = {
                    zip: zipcode || undefined,
                    city: city || undefined,
                    state: stateCode || undefined,
                    units_min: minUnits || undefined,
                    units_max: maxUnits || undefined,
                    propertyType: "MFR",
                    mls_active: mlsActive || undefined,
                    flood_zone: floodZone || undefined,
                    ...includeIfChanged(yearBuiltMin, yearBuiltMax, DEFAULT_YEAR_RANGE, ["year_built_min", "year_built_max"]),
                    ...includeIfChanged(lotSizeMin, lotSizeMax, DEFAULT_LOT_SIZE_RANGE, ["lot_size_min", "lot_size_max"]),
                    ...includeIfChanged(mortgageMin, mortgageMax, DEFAULT_MORTGAGE_BALANCE_RANGE, ["mortgage_min", "mortgage_max"]),
                    ...includeIfChanged(assessedMin, assessedMax, DEFAULT_ASSESSED_VALUE_RANGE, ["assessed_value_min", "assessed_value_max"]),
                    ...includeIfChanged(estimatedMin, estimatedMax, DEFAULT_ESTIMATED_VALUE_RANGE, ["value_min", "value_max"]),
                    ...includeIfChanged(equityMin, equityMax, DEFAULT_ESTIMATED_EQUITY_RANGE, ["estimated_equity_min", "estimated_equity_max"]),
                    ...includeIfChanged(storiesMin, storiesMax, DEFAULT_STORIES_RANGE, ["stories_min", "stories_max"]),
                    ...includeIfChanged(yearsOwnedMin, yearsOwnedMax, DEFAULT_YEARS_OWNED_RANGE, ["years_owned_min", "years_owned_max"]),
                    ...(lastSalePriceMin !== DEFAULT_LAST_SALE_PRICE_RANGE[0] || lastSalePriceMax !== DEFAULT_LAST_SALE_PRICE_RANGE[1]
                        ? { last_sale_price_min: lastSalePriceMin, last_sale_price_max: lastSalePriceMax }
                        : {}),
                    ...(ownerLocation === "instate" && { in_state_owner: true, out_of_state_owner: false }),
                    ...(ownerLocation === "outofstate" && { in_state_owner: false, out_of_state_owner: true }),
                    corporate_owned: corporateOwned || undefined,
                    last_sale_arms_length: lastSaleArmsLength || undefined,
                    assumable: assumable || undefined,
                    street: street || undefined,
                    house: house || undefined,
                    // Add new filters to search parameters
                    auction: auction || undefined,
                    reo: reo || undefined,
                    tax_lien: taxLien || undefined,
                    pre_foreclosure: preForeclosure || undefined, // Use the new string-based filter here
                    private_lender: privateLender || undefined,
                    count: false,        // Get actual data, not just count
                    size: 10,           // 10 properties per page
                    resultIndex: 0,     // Start at beginning
                    ids_only: false,
                    obfuscate: false,
                    summary: false,
                };
                // Merge any NON-compound filters passed from SmartQueries (overrides form state)
                searchParameters = {
                    ...searchParameters,
                    ...filters  // This will add/override with SmartQueries filters
                };
            }

            const response = await fetch("/api/realestateapi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(searchParameters),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Search API failed:", response.status, errorText);
                setCreditsError("There was a problem with your search. Please try again or adjust your filters.");
                setIsSearching(false);
                return;
            }

            const data = await response.json();
            console.log("🔍 External API Response Structure:", {
  resultCount: data.resultCount,
  resultIndex: data.resultIndex,
  recordCount: data.recordCount,
  dataLength: data.data?.length,
  responseKeys: Object.keys(data)
});

            if (!data.data || data.data.length === 0) {
                setCreditsError("No properties matched your criteria.");
                await onSearch({ clearResults: true });
                setIsSearching(false);
                return;
            }

            // Store pagination info
            setTotalCount(data.resultCount || 0);
            setCurrentPage(0);
            setLastSearchParameters(searchParameters);
            setHasMoreProperties(data.resultIndex < data.resultCount);

            const { data: newCreditBalance, error: rpcError } = await supabase.rpc(
                "decrement_search_credits",
                {
                    amount_to_decrement: data.recordCount || 0,
                }
            );

            if (rpcError) {
                const errorMessage =
                    typeof rpcError === "object" && rpcError !== null && "message" in rpcError
                        ? String(rpcError.message)
                        : String(rpcError);

                if (errorMessage.includes("Insufficient credits")) {
                    if (userClass === "trial") {
                        setShowTrialUpgradeMessage(true);
                    } else {
                        triggerBuyCreditsModal();
                    }

                    setIsSearching(false);
                    return;
                }

                setCreditsError("There was a problem with your account. Please log in again.");
                setIsSearching(false);
                return;
            }

            if (onCreditsUpdate && typeof newCreditBalance === "number") {
                onCreditsUpdate(newCreditBalance);
            }

            await onSearch({
                listings: data.data,
                totalCount: data.resultCount,
                hasMore: (data.resultIndex || 0) + (data.recordCount || 0) < (data.resultCount || 0)
            });
        } catch (error) {
            console.error("Unexpected error during search handling:", error);
            setCreditsError("A critical error occurred with the search. Please try again later.");
        } finally {
            setIsSearching(false);
        }
        setShowAdvanced(false);
    };


    //New logic to support paging through properties
    const loadMoreProperties = async () => {
        if (!lastSearchParameters || !hasMoreProperties) return;

        setIsLoadingMore(true);
        setCreditsError(null);

        try {
            const nextResultIndex = listings.length;

            const paginatedParameters = {
                ...lastSearchParameters,
                resultIndex: nextResultIndex,
                size: 10
            };

            const response = await fetch("/api/realestateapi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paginatedParameters),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Load More API failed:", response.status, errorText);
                setCreditsError("There was a problem loading more properties. Please try again.");
                return;
            }

            const data = await response.json();
            console.log("🔍 External API Response Structure:", {
  resultCount: data.resultCount,
  resultIndex: data.resultIndex,
  recordCount: data.recordCount,
  dataLength: data.data?.length,
  responseKeys: Object.keys(data)
});

            // Charge credits for this batch
            const { data: newCreditBalance, error: rpcError } = await supabase.rpc(
                "decrement_search_credits",
                {
                    amount_to_decrement: data.recordCount || 0,
                }
            );

            if (rpcError) {
                const errorMessage = typeof rpcError === "object" && rpcError !== null && "message" in rpcError
                    ? String(rpcError.message)
                    : String(rpcError);

                if (errorMessage.includes("Insufficient credits")) {
                    if (userClass === "trial") {
                        setShowTrialUpgradeMessage(true);
                    } else {
                        triggerBuyCreditsModal();
                    }
                    return;
                }
                setCreditsError("There was a problem with your account. Please log in again.");
                return;
            }

            if (onCreditsUpdate && typeof newCreditBalance === "number") {
                onCreditsUpdate(newCreditBalance);
            }

            // Update state
            const updatedListings = [...listings, ...data.data];
            setCurrentPage(currentPage + 1);
            setHasMoreProperties(data.resultIndex < data.resultCount);

            await onSearch({
                listings: updatedListings,
                totalCount: data.resultCount,
                hasMore: nextResultIndex + (data.recordCount || 0) < (data.resultCount || 0)
            });

        } catch (error) {
            console.error("Unexpected error during load more:", error);
            setCreditsError("A critical error occurred loading more properties. Please try again later.");
        } finally {
            setIsLoadingMore(false);
        }
    };


    // Prepare props for AdvancedFilters component
    const advancedFiltersProps = {
        // Location fields
        street,
        setStreet,
        house,
        setHouse: setNumber,

        // Owner location
        ownerLocation,
        setOwnerLocation,

        // Boolean filters
        corporateOwned,
        setCorporateOwned,
        mlsActive,
        setMlsActive,
        lastSaleArmsLength,
        setLastSaleArmsLength,
        floodZone,
        setFloodZone,
        assumable,
        setAssumable,
        auction,
        setAuction,
        reo,
        setReo,
        taxLien,
        setTaxLien,
        preForeclosure,
        setPreForeclosure,
        privateLender,
        setPrivateLender,

        // Range filters
        yearsOwnedRange,
        setYearsOwnedRange,
        lastSalePriceRange,
        setLastSalePriceRange,
        yearBuiltRange,
        setYearBuiltRange,
        lotSizeRange,
        setLotSizeRange,
        storiesRange,
        setStoriesRange,
        mortgageBalanceRange,
        setMortgageBalanceRange,
        assessedValueRange,
        setAssessedValueRange,
        estimatedValueRange,
        setEstimatedValueRange,
        estimatedEquityRange,
        setEstimatedEquityRange,

        // Actions
        onResetFilters: resetFilters,
        onClose: () => setShowAdvanced(false) 
    };

    return (
        <div className="relative flex">
            <div ref={sidebarRef} className="w-[400px] shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col space-y-6 h-screen z-20 overflow-y-auto overflow-x-visible">
                <h2 className="text-lg font-medium text-gray-800 mb-2">Property Search</h2>

                <div className="space-y-4">
                    <BasicFilters
                        zipcode={zipcode}
                        setZipcode={setZipcode}
                        minUnits={minUnits}
                        setMinUnits={setMinUnits}
                        maxUnits={maxUnits}
                        setMaxUnits={setMaxUnits}
                        locationError={locationError}
                        city={city}
                        setCity={setCity}
                        stateCode={stateCode}
                        setStateCode={setStateCode}
                    />

                    {/* Combined row for Charlie's Picks and Advanced Filters */}
                    <div className="flex space-x-2 items-start">
                        <div className="relative">
                            <SmartQueries
                                setMinUnits={setMinUnits}
                                setMaxUnits={setMaxUnits}
                                setOwnerLocation={setOwnerLocation}
                                setCorporateOwned={setCorporateOwned}
                                setPrivateLender={setPrivateLender}
                                setPreForeclosure={setPreForeclosure}
                                setTaxLien={setTaxLien}
                                setReo={setReo}
                                setAuction={setAuction}
                                setYearsOwnedRange={setYearsOwnedRange}
                                setEstimatedEquityRange={setEstimatedEquityRange}
                                setYearBuiltRange={setYearBuiltRange}
                                yearsOwnedRange={yearsOwnedRange}
                                estimatedEquityRange={estimatedEquityRange}
                                handleSearch={handleSearch}
                                resetFilters={resetFilters}
                                clearSelectedListings={clearSelectedListings}
                            />
                        </div>

                        <button
                            ref={advancedFiltersToggleRef}
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-40 py-2 px-3 text-white rounded-lg transition text-sm flex items-center justify-center hover:opacity-80 whitespace-nowrap h-[40px]"
                            style={{ backgroundColor: '#1C599F' }}
                        >
                            <span className="text-xs">Advanced Filters</span>
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={() => handleSearch({})}
                        id="sidebar-search"
                        disabled={isSearching}
                        className="w-60 bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out transform hover:scale-105 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 hover:shadow-lg active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        {isSearching ? "Searching..." : "Search"}
                    </button>
                </div>

                {creditsError && (
                    <p className="text-red-600 text-xs mt-1 text-center">{creditsError}</p>
                )}
                {showTrialUpgradeMessage && (
                    <div
                        className="px-6 py-4 rounded-md cursor-pointer text-center font-light text-lg mt-4 transition bg-black text-white hover:bg-gray-800"
                        onClick={() => window.location.href = "/pricing"}
                    >
                        Sorry, but you are out of credits.
                        <br />
                        <span style={{ textDecoration: "underline", fontWeight: "medium" }}>
                            Upgrade now
                        </span>{" "}
                        to continue your analysis and find your next investment.
                    </div>
                )}
                <div className="flex-1 space-y-2 relative pb-26" style={{ overflow: 'visible' }}>

                    {listings.length > 0 && (
                        <div className="flex items-center space-x-2 mb-2 px-1">
                            <input
                                type="checkbox"
                                checked={allCurrentSelected}
                                ref={ref => {
                                    if (ref) ref.indeterminate = someCurrentSelected && !allCurrentSelected;
                                }}
                                onChange={handleSelectAll}
                                className="h-4 w-4 accent-blue-600"
                            />
                            <label className="text-sm text-gray-600">
                                Select All ({currentSearchListings.length})
                            </label>
                        </div>
                    )}
                    {Array.isArray(listings) &&
                        listings
                            .sort((a, b) => (b.rentEstimate ?? 0) - (a.rentEstimate ?? 0))
                            .map((listing, i) => {
                                const isSelected = selectedListings.some((l: Listing) => l.id === listing.id);
                                return (
                                    <div
                                        key={listing.id}
                                        className={`
    border-2 p-3 rounded text-sm shadow-sm bg-white cursor-pointer transition-all
    ${isSelected ? "border-blue-600 bg-blue-50" : "border-transparent hover:border-gray-400"}
  `}
                                        style={{ overflow: 'visible' }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div onClick={() => setActiveListingIndex(i)} className="flex-1 cursor-pointer mr-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-medium text-gray-800">
                                                        {listing.address?.street || "No street info"}
                                                    </p>
                                                    {(() => {
                                                        const classification = getPrimaryClassification(listing);
                                                        const totalCount = getClassificationCount(listing);
                                                        return classification ? (
                                                            <PropertyBadge
                                                                classification={classification}
                                                                size="sm"
                                                                totalCount={getClassificationCount(listing)}
                                                            />
                                                        ) : null;
                                                    })()}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 font-mono leading-relaxed">
                                                    Assessed: ${listing.assessedValue?.toLocaleString() ?? "N/A"}<br />
                                                    Units: {listing.unitsCount ?? "?"} • Year: {listing.yearBuilt ?? "?"}
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleListingSelect(listing)}
                                                className="h-5 w-5 mt-1 accent-blue-600"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    {/* Load More Button */}
                    {hasMoreProperties && (
                        <div className="pt-4 pb-2">
                            <button
                                onClick={loadMoreProperties}
                                disabled={isLoadingMore}
                                className="w-full text-white py-2 px-4 rounded-lg font-medium hover:opacity-80 transition disabled:opacity-75 disabled:cursor-not-allowed"
                                style={{ backgroundColor: '#1C599F' }}
                            >
                                {isLoadingMore ? "Loading..." : (
                                    <>
                                        Load more?
                                        <br />
                                        ({totalCount - listings.length} remaining)
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                <PropertyProfileModal
                    listing={activeListing}
                    isOpen={activeListing !== null}
                    onClose={() => setActiveListingIndex(null)}
                    onPrev={goToPrev}
                    onNext={goToNext}
                    canGoPrev={activeListingIndex !== null && activeListingIndex > 0}
                    canGoNext={activeListingIndex !== null && activeListingIndex < listings.length - 1}
                    userClass={userClass}
                />
            </div>

            {
                selectedListings.length > 0 && (
                    <div className="fixed bottom-4 left-4 w-[320px] z-40">
                        <div className="p-4 border rounded-lg bg-orange-500 text-sm shadow text-white">
                            <p className="mb-2 font-medium">Add {selectedListings.length} {selectedListings.length === 1 ? "property" : "properties"} to Charlie Chat</p>
                            <button
                                onClick={() => {
                                    const filteredListings = selectedListings.map(listing => filterRelevantFields(listing));
                                    onSendToGPT(filteredListings);
                                }}
                                className="text-white font-medium px-4 py-2 rounded-lg hover:opacity-90 transition w-full cursor-pointer"
                                style={{ backgroundColor: '#1C599F' }}
                            >
                                Begin Analysis
                            </button>
                        </div>
                    </div>
                )
            }

            {
                showAdvanced && (
                    <div ref={panelRef} className="absolute top-0 left-[260px] z-30">
                        <AdvancedFilters {...advancedFiltersProps} />
                    </div>
                )
            }
        </div >
    );
};