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
import { Listing } from './listingTypes';

// Re-export Listing for backward compatibility
export type { Listing };

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
    triggerProModal: () => void;
    clearSelectedListings?: () => void;
    userCredits?: number | null;
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
    triggerProModal,
    clearSelectedListings,
    userCredits
}: Props) => {
    const [zipcode, setZipcode] = useState("");
    const [minUnits, setMinUnits] = useState<number | string>("");
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

    const [mlsActive, setMlsActive] = useState("");
    const [radius, setRadius] = useState(5);

    const [street, setStreet] = useState("");
    const [house, setNumber] = useState("");
    const [city, setCity] = useState("");
    const [stateCode, setStateCode] = useState("");
    const [armsLength, setArmsLength] = useState<string>('any');


    // Save to My Properties function
    const handleSaveToFavorites = async (propertiesToSave: Listing[]) => {
        if (!userIsLoggedIn) {
            triggerAuthModal();
            return;
        }

        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                console.error('Error getting user:', userError);
                return;
            }
            // Save each property to favorites
            for (const listing of propertiesToSave) {
                // FIRST: Insert/update the property details
                const { data: savedProperty, error: propertyError } = await supabase
                    .from('saved_properties')
                    .upsert({
                        property_id: listing.id,
                        address_full: listing.address_full || listing.address_street || '',
                        address_city: listing.address_city || '',
                        address_state: listing.address_state || '',
                        address_zip: listing.address_zip || null,
                        units_count: listing.units_count || 0,
                        year_built: listing.year_built || null,
                        last_sale_date: listing.last_sale_date || null,
                        assessed_value: listing.assessed_value || 0,
                        assessed_land_value: listing.assessed_land_value ?? null,
                        estimated_value: listing.estimated_value || 0,
                        estimated_equity: listing.estimated_equity || 0,
                        years_owned: listing.years_owned || 0,
                        out_of_state_absentee_owner: listing.out_of_state_absentee_owner || false,
                        auction: listing.auction || false,
                        reo: listing.reo || false,
                        tax_lien: listing.tax_lien || false,
                        pre_foreclosure: listing.pre_foreclosure || false,
                        private_lender: listing.private_lender || false,
                        owner_first_name: listing.owner_first_name || null,
                        owner_last_name: listing.owner_last_name || null,
                        mail_address_full: listing.mail_address_full || null,
                        mail_address_street: listing.mail_address_street || null,
                        mail_address_city: listing.mail_address_city || null,
                        mail_address_state: listing.mail_address_state || null,
                        mail_address_zip: listing.mail_address_zip || null,
                        mail_address_county: listing.mail_address_county || null,
                        latitude: listing.latitude ?? null,
                        longitude: listing.longitude ?? null,
                        property_type: listing.property_type || null,
                        square_feet: listing.square_feet ?? null,
                        lot_square_feet: listing.lot_square_feet ?? null,
                        stories: listing.stories ?? null,
                        flood_zone: listing.flood_zone ?? null,
                        flood_zone_description: listing.flood_zone_description || null,
                        rent_estimate: listing.rent_estimate ?? null,
                        listing_price: listing.listing_price ?? null,
                        mortgage_balance: listing.mortgage_balance ?? null,
                        mortgage_maturing_date: null, // fill when your API provides a date
                        last_sale_arms_length: listing.last_sale_arms_length ?? null,
                        mls_active: listing.mls_active ?? null,
                        for_sale: listing.for_sale ?? null,
                        assumable: listing.assumable ?? null,
                        foreclosure: listing.foreclosure ?? null,
                        in_state_absentee_owner: listing.in_state_absentee_owner ?? null,
                        owner_occupied: listing.owner_occupied ?? null,
                        corporate_owned: listing.corporate_owned ?? null,
                        investor_buyer: listing.investor_buyer ?? null,
                        lender_name: listing.lender_name || null,
                        total_portfolio_equity: listing.total_portfolio_equity ?? null,
                        total_portfolio_mortgage_balance: listing.total_portfolio_mortgage_balance ?? null,
                        total_properties_owned: listing.total_properties_owned ?? null,
                        saved_at: new Date().toISOString()
                    }, {
                        onConflict: 'property_id'
                    })
                    .select();

                if (propertyError) {
                    console.error('Property save error details:', propertyError);
                    continue; // Skip this property if it failed
                }

                // Only proceed if property was successfully saved
                if (savedProperty && savedProperty.length > 0) {
                    // SECOND: Upsert into user_favorites (handles duplicates)
                    const { error: favoriteError } = await supabase
                        .from('user_favorites')
                        .upsert({
                            user_id: user.id,
                            property_id: listing.id,
                            is_active: true,
                            saved_at: new Date().toISOString()
                        }, {
                            onConflict: 'user_id,property_id'
                        });

                    if (favoriteError) {
                        console.error('Favorites save error details:', JSON.stringify(favoriteError, null, 2));
                        console.error('Full error object:', favoriteError);
                        console.error('Property ID being saved:', listing.id);
                        console.error('User ID:', user.id);
                    }
                    setSavedPropertyIds(prev => new Set([...prev, listing.id]));
                }
            }


        } catch (error) {
            console.error('Unexpected error saving to favorites:', error);
        }
    };
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
    const DEFAULT_LAST_SALE_PRICE_RANGE: [number, number] = [0, 100000000];
    const [lastSaleDateRange, setlastSaleDateRange] = useState<[number, number]>([0, 2025]);
    const [lastSalePriceRange, setLastSalePriceRange] = useState<[number, number]>(DEFAULT_LAST_SALE_PRICE_RANGE);
    const DEFAULT_YEAR_RANGE: [number, number] = [1800, 2025];
    const [yearBuiltRange, setYearBuiltRange] = useState<[number, number]>(DEFAULT_YEAR_RANGE);
    const DEFAULT_LOT_SIZE_RANGE: [number, number] = [0, 100000];
    const [lotSizeRange, setLotSizeRange] = useState<[number, number]>(DEFAULT_LOT_SIZE_RANGE);
    const DEFAULT_STORIES_RANGE: [number, number] = [0, 100];
    const [storiesRange, setStoriesRange] = useState<[number, number]>(DEFAULT_STORIES_RANGE);
    const DEFAULT_MORTGAGE_BALANCE_RANGE: [number, number] = [0, 100000000];
    const [mortgageBalanceRange, setMortgageBalanceRange] = useState<[number, number]>(DEFAULT_MORTGAGE_BALANCE_RANGE);
    const DEFAULT_ASSESSED_VALUE_RANGE: [number, number] = [0, 100000000];
    const [assessedValueRange, setAssessedValueRange] = useState<[number, number]>(DEFAULT_ASSESSED_VALUE_RANGE);
    const DEFAULT_ESTIMATED_VALUE_RANGE: [number, number] = [0, 100000000];
    const [estimatedValueRange, setEstimatedValueRange] = useState<[number, number]>(DEFAULT_ESTIMATED_VALUE_RANGE);
    const DEFAULT_ESTIMATED_EQUITY_RANGE: [number, number] = [0, 100000000];
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
    const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());

    const hasActiveAdvancedFilters = () => {
        // Check all advanced filter states for non-default values
        return (
            street.trim() !== "" ||
            house.trim() !== "" ||
            mlsActive !== "" ||
            lastSaleArmsLength !== "" ||
            floodZone !== "" ||
            assumable !== "" ||
            auction !== "" ||
            reo !== "" ||
            taxLien !== "" ||
            preForeclosure !== "" ||
            privateLender !== "" ||
            corporateOwned !== "" ||
            ownerLocation !== "any" ||
            !arraysEqual(yearsOwnedRange, DEFAULT_YEARS_OWNED_RANGE) ||
            !arraysEqual(lastSalePriceRange, DEFAULT_LAST_SALE_PRICE_RANGE) ||
            !arraysEqual(yearBuiltRange, DEFAULT_YEAR_RANGE) ||
            !arraysEqual(lotSizeRange, DEFAULT_LOT_SIZE_RANGE) ||
            !arraysEqual(storiesRange, DEFAULT_STORIES_RANGE) ||
            !arraysEqual(mortgageBalanceRange, DEFAULT_MORTGAGE_BALANCE_RANGE) ||
            !arraysEqual(assessedValueRange, DEFAULT_ASSESSED_VALUE_RANGE) ||
            !arraysEqual(estimatedValueRange, DEFAULT_ESTIMATED_VALUE_RANGE) ||
            !arraysEqual(estimatedEquityRange, DEFAULT_ESTIMATED_EQUITY_RANGE)
        );
    };

    const arraysEqual = (a: [number, number], b: [number, number]) => {
        return a[0] === b[0] && a[1] === b[1];
    };
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
        setMinUnits("");
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

        // Check if trial user has no credits - redirect to home to show modal
        if (userClass === 'trial' && (userCredits === 0 || userCredits === null)) {
            window.location.href = '/';
            return;
        }

        // Check if this is a compound query from SmartQueries
        if (filters.or || filters.and) {
            // For compound queries, use the structure as-is and add location data
            const searchParameters = {
                ...filters,
                // Add location data from form
                zip: zipcode || undefined,
                city: city || undefined,
                state: stateCode || undefined,
            };

            setIsSearching(true);
            setCreditsError(null);

            try {
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

                if (!data.data || data.data.length === 0) {
                    setCreditsError("No properties matched your criteria.");
                    setTotalCount(0);
                    setCurrentPage(0);
                    setLastSearchParameters(null);
                    setHasMoreProperties(false);
                    if (clearSelectedListings) {
                        clearSelectedListings();
                    }
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

                    if (errorMessage.includes("Insufficient credits") || errorMessage.includes("No credits remaining")) {
                        if (userClass === "trial") {
                            window.location.href = '/';
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
                    property_type: "MFR",
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
                    property_type: "MFR",
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

            if (!data.data || data.data.length === 0) {
                setCreditsError("No properties matched your criteria.");
                setTotalCount(0);
                setCurrentPage(0);
                setLastSearchParameters(null);
                setHasMoreProperties(false);
                if (clearSelectedListings) {
                    clearSelectedListings();
                }
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

                if (errorMessage.includes("Insufficient credits") || errorMessage.includes("No credits remaining")) {
                    if (userClass === "trial") {
                        window.location.href = '/';
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

                if (errorMessage.includes("Insufficient credits") || errorMessage.includes("No credits remaining")) {
                    if (userClass === "trial") {
                        window.location.href = '/';
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
                                minUnits={minUnits}          // ← Add this
                                maxUnits={maxUnits}          // ← Add this
                                setArmsLength={setArmsLength}
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
                            style={{ backgroundColor: hasActiveAdvancedFilters() ? '#16a34a' : '#1C599F' }}
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
                        className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out transform hover:scale-105 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 hover:shadow-lg active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        {isSearching ? "Searching..." : "Search"}
                    </button>
                </div>

                {creditsError && (
                    <p className="text-red-600 text-xs mt-1 text-center">{creditsError}</p>
                )}
                <div className="flex-1 space-y-2 relative" style={{ overflow: 'visible', paddingBottom: selectedListings.length > 0 ? '120px' : '20px' }}>

                    {listings.length > 0 && (
                        <div className="flex items-center justify-between mb-2 px-1">
                            {/* Left side - Analyze All */}
                            <div className="flex items-center space-x-2">
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
                                    Analyze All ({currentSearchListings.length})
                                </label>
                            </div>

                            {/* Right side - Favorite All Toggle with Auto-Save */}
                            <div className="relative">
                                <button
                                    onClick={async () => {
                                        // Check if user has access to My Properties (favoriting)
                                        if (userClass === "charlie_chat") {
                                            // Show Pro upgrade modal for basic charlie_chat users
                                            triggerProModal();
                                            return;
                                        }
                                        
                                        // Check if all current listings are already favorited
                                        const allCurrentlyFavorited = currentSearchListings.every(listing => 
                                            savedPropertyIds.has(listing.id)
                                        );
                                        
                                        if (allCurrentlyFavorited) {
                                            // Unfavorite: Just remove from UI state (don't remove from database)
                                            setSavedPropertyIds(prev => {
                                                const newSet = new Set(prev);
                                                currentSearchListings.forEach(listing => {
                                                    newSet.delete(listing.id);
                                                });
                                                return newSet;
                                            });
                                        } else {
                                            // Favorite: Add to UI state AND save to database
                                            setSavedPropertyIds(prev => {
                                                const newSet = new Set(prev);
                                                currentSearchListings.forEach(listing => {
                                                    newSet.add(listing.id);
                                                });
                                                return newSet;
                                            });
                                            
                                            // Auto-save all properties to database
                                            await handleSaveToFavorites(currentSearchListings);
                                        }
                                    }}
                                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
                                >
                                    <span>
                                        {currentSearchListings.every(listing => savedPropertyIds.has(listing.id)) 
                                            ? '💔 Unfavorite All' 
                                            : '❤️ Favorite All'
                                        }
                                    </span>
                                </button>

                            </div>
                        </div>
                    )}
                    {Array.isArray(listings) &&
                        listings
                            .sort((a, b) => (b.rent_estimate ?? 0) - (a.rent_estimate ?? 0))
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
                                                        {listing.address_street || listing.address_full || "No street info"}
                                                    </p>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 font-mono leading-relaxed">
                                                    <div>Assessed: ${listing.assessed_value?.toLocaleString() ?? "N/A"}</div>
                                                    <div className="flex items-center justify-between">
                                                        <span>Units: {listing.units_count ?? "?"} • Year: {listing.year_built ?? "?"}</span>

                                                        {/* Individual Heart Icon - visual selection only */}
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                
                                                                // Check if user has access to My Properties (favoriting)
                                                                if (userClass === "charlie_chat") {
                                                                    // Show Pro upgrade modal for basic charlie_chat users
                                                                    triggerProModal();
                                                                    return;
                                                                }
                                                                
                                                                const isCurrentlyFavorited = savedPropertyIds.has(listing.id);
                                                                
                                                                if (isCurrentlyFavorited) {
                                                                    // Unfavorite: Remove from current session and set database to inactive
                                                                    setSavedPropertyIds(prev => {
                                                                        const newSet = new Set(prev);
                                                                        newSet.delete(listing.id);
                                                                        return newSet;
                                                                    });
                                                                    
                                                                    // Update database in background
                                                                    try {
                                                                        const { data: { user } } = await supabase.auth.getUser();
                                                                        if (user) {
                                                                            await supabase
                                                                                .from('saved_properties')
                                                                                .update({ is_active: false })
                                                                                .eq('user_id', user.id)
                                                                                .eq('property_id', listing.id);
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('Background unfavorite failed:', error);
                                                                    }
                                                                } else {
                                                                    // Favorite: Add to current session and save to database
                                                                    setSavedPropertyIds(prev => new Set(prev).add(listing.id));
                                                                    
                                                                    // Save to database using the existing handleSaveToFavorites logic
                                                                    try {
                                                                        await handleSaveToFavorites([listing]);
                                                                    } catch (error) {
                                                                        console.error('Background favorite failed:', error);
                                                                        // Rollback visual state if database save fails
                                                                        setSavedPropertyIds(prev => {
                                                                            const newSet = new Set(prev);
                                                                            newSet.delete(listing.id);
                                                                            return newSet;
                                                                        });
                                                                    }
                                                                }
                                                            }}
                                                            className="p-1 hover:scale-110 transition-transform"
                                                        >
                                                            <svg
                                                                width="16"
                                                                height="16"
                                                                viewBox="0 0 24 24"
                                                                fill="currentColor"
                                                                className={`transition-colors ${savedPropertyIds.has(listing.id)
                                                                    ? 'text-red-500'
                                                                    : 'text-gray-400 hover:text-red-500'
                                                                    }`}
                                                            >
                                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right side - Checkbox only */}
                                            <div className="flex flex-col items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleListingSelect(listing)}
                                                    className="h-5 w-5 mt-1 accent-blue-600"
                                                />
                                            </div>
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const filteredListings = selectedListings.map(listing => filterRelevantFields(listing));
                                        onSendToGPT(filteredListings);
                                    }}
                                    className="text-white font-medium px-4 py-2 rounded-lg hover:opacity-90 transition flex-1 cursor-pointer"
                                    style={{ backgroundColor: '#1C599F' }}
                                >
                                    Begin Analysis
                                </button>
                                <button
                                    onClick={() => {
                                        if (clearSelectedListings) {
                                            clearSelectedListings();
                                        }
                                    }}
                                    className="text-orange-500 bg-white font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition cursor-pointer text-xs"
                                    title="Clear selected properties"
                                >
                                    Clear
                                </button>
                            </div>
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