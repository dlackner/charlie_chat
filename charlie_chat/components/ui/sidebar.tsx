"use client";

import React, { useEffect, useRef, useState } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { PropertyProfileModal } from '../property/profile-modal';
import { FilterToggle } from '../filters/toggle';
import { FilterRange } from '../filters/range';
import { BasicFilters } from '../filters/basic';

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
    outOfStateAbsenteeOwner?: number;
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
    triggerBuyCreditsModal: () => void
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
    triggerBuyCreditsModal
}: Props) => {
    const [zipcode, setZipcode] = useState("");
    const [minUnits, setMinUnits] = useState<number | string>(2);
    const [maxUnits, setMaxUnits] = useState<number | string>("");

    // New state and logic for Select All
    const currentSearchListings = listings.slice(0, 50);
    const allCurrentSelected = currentSearchListings.every(listing =>
        selectedListings.some(selected => selected.id === listing.id)
    );
    const someCurrentSelected = selectedListings.length > 0;

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
            setLocationError("Tip: Zipcode is required when City and State are not provided.");
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

    const filterRelevantFields = (listing: Listing) => {
        return {
            id: listing.id,
            address: listing.address,

            // Property basics
            property_type: listing.property_type,
            unitsCount: listing.unitsCount,
            yearBuilt: listing.yearBuilt,
            squareFeet: listing.squareFeet,
            lotSquareFeet: listing.lotSquareFeet,
            stories: listing.stories,

            // Financial data
            estimatedValue: listing.estimatedValue,
            assessedValue: listing.assessedValue,
            lastSaleAmount: listing.lastSaleAmount,
            lastSaleDate: listing.lastSaleDate,
            rentEstimate: listing.rentEstimate,

            // Owner & financing
            mortgageBalance: listing.mortgageBalance,
            estimatedEquity: listing.estimatedEquity,
            lenderName: listing.lenderName,
            mortgageMaturingDate: listing.mortgageMaturingDate,
            privateLender: listing.privateLender,

            // Owner profile
            owner1FirstName: listing.owner1FirstName,
            owner1LastName: listing.owner1LastName,
            mailAddress: listing.mailAddress,
            yearsOwned: listing.yearsOwned,
            ownerOccupied: listing.ownerOccupied,
            corporate_owned: listing.corporate_owned,
            totalPropertiesOwned: listing.totalPropertiesOwned,
            totalPortfolioEquity: listing.totalPortfolioEquity,

            // Distress indicators
            preForeclosure: listing.preForeclosure,
            foreclosure: listing.foreclosure,
            reo: listing.reo,
            auction: listing.auction,
            taxLien: listing.taxLien,

            // Market indicators
            mlsActive: listing.mlsActive,
            forSale: listing.forSale,
            floodZone: listing.floodZone,
            lastSaleArmsLength: listing.lastSaleArmsLength,
            investorBuyer: listing.investorBuyer,
            assumable: listing.assumable
        };
    };

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
        setZipcode("");
        setMinUnits(2);
        setMaxUnits("");
        setMlsActive("");
        setStreet("");
        setNumber("");
        setCity("");
        setStateCode("");
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

    const handleSearch = async (filters: Record<string, string | number | boolean>) => {
        if (!userIsLoggedIn) {
            triggerAuthModal(); // ✅ still prompts sign-up for guests
            return;
        }

        // ✨ Location Validation
        const hasCity = city.trim() !== "";
        const hasState = stateCode.trim() !== "";
        const hasZip = zipcode.trim() !== "";

        if (hasCity && !hasState) {
            setLocationError("State is required when City is provided.");
            return;
        }

        if (!(hasCity && hasState) && !hasZip) {
            setLocationError("ZIP Code is required when City and State are not both provided.");
            return;
        }

        setLocationError(null); // ✅ Clear any prior errors

        // 🔍 Continue with search
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
                    ids_only: false,
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
                    ids_only: false,
                    obfuscate: false,
                    summary: false,
                };
            }

            const countResponse = await fetch("/api/realestateapi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...searchParameters, ids_only: true }),
            });

            if (!countResponse.ok) {
                const errorText = await countResponse.text();
                console.error("Count API failed:", countResponse.status, errorText);
                setCreditsError("There was a problem with your search. Please try again or adjust your filters.");
                setIsSearching(false);
                return;
            }
            const { ids } = await countResponse.json();
            const totalCount = Array.isArray(ids) ? ids.length : 0;

            if (totalCount === 0) {
                setCreditsError("No properties matched your criteria. Try broadening your filters.");
                await onSearch({ clearResults: true });
                setIsSearching(false);
                return;
            }

            if (totalCount > 25) {
                setCreditsError(`Your search returned ${totalCount} properties. Think about your Buy Box and refine your filters to 25 or fewer results.`);
                setIsSearching(false);
                return;
            }

            const { data: newCreditBalance, error: rpcError } = await supabase.rpc(
                "decrement_search_credits",
                {
                    amount_to_decrement: totalCount,
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

            await onSearch(searchParameters);
        } catch (error) {
            console.error("Unexpected error during search handling:", error);
            setCreditsError("A critical error occurred with the search. Please try again later.");
        } finally {
            setIsSearching(false);
        }
        setShowAdvanced(false);
    };

    return (
        <div className="relative flex">
            <div ref={sidebarRef} className="w-[260px] shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col space-y-6 overflow-y-auto h-screen z-20">
                <h2 className="text-lg font-medium text-gray-800">Property Search</h2>
                <div className="space-y-4">
                    <BasicFilters
                        zipcode={zipcode}
                        setZipcode={setZipcode}
                        minUnits={minUnits}
                        setMinUnits={setMinUnits}
                        maxUnits={maxUnits}
                        setMaxUnits={setMaxUnits}
                        locationError={locationError}
                    />

                    <button
                        ref={advancedFiltersToggleRef}
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full text-sm text-blue-700 underline hover:text-blue-900 transition"
                    >
                        {showAdvanced ? "Hide Advanced Filters" : "Show Advanced Filters"}
                    </button>
                </div>

                <button
                    onClick={() => handleSearch({})}
                    id="sidebar-search"
                    disabled={isSearching}
                    className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out transform hover:scale-105 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 hover:shadow-lg active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                    {isSearching ? "Processing..." : "Search"}
                </button>

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
                <div className="flex-1 space-y-2 overflow-y-auto relative">

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
                            .slice(0, 50)
                            .map((listing, i) => {
                                const isSelected = selectedListings.some((l: Listing) => l.id === listing.id);
                                return (
                                    <div
                                        key={i}
                                        className={`
                      border-2 p-3 rounded text-sm shadow-sm bg-white cursor-pointer transition-all
                      ${isSelected ? "border-blue-600 bg-blue-50" : "border-transparent hover:border-gray-400"}
                    `}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div onClick={() => setActiveListingIndex(i)} className="flex-1 cursor-pointer" title="Click on address to view property profile & marketing letter. Then check the box & let Charlie analyze it for you!" >
                                                <p className="font-medium text-gray-800">
                                                    {listing.address?.street || "No street info"}
                                                </p>
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

            {selectedListings.length > 0 && (
                <div className="fixed bottom-4 left-4 w-[240px] z-40">
                    <div className="p-4 border rounded-lg bg-orange-500 text-sm shadow text-white">
                        <p className="mb-2 font-medium">Add {selectedListings.length} {selectedListings.length === 1 ? "property" : "properties"} to Charlie Chat</p>
                        <button
                            onClick={() => {
                                const filteredListings = selectedListings.map(listing => filterRelevantFields(listing));
                                onSendToGPT(filteredListings);
                            }}
                            className="bg-blue-900 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-950 transition w-full"
                        >
                            Begin Analysis
                        </button>
                    </div>
                </div>
            )}

            {showAdvanced && (
                <div ref={panelRef} className="absolute top-0 left-[260px] w-[440px] h-full bg-white border-r border-gray-200 p-6 shadow-xl z-30 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg text-gray-800 font-semibold">Advanced Filters</h3>
                        <button
                            onClick={resetFilters}
                            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 border border-gray-300"
                        >
                            Reset Filters
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="mb-4">
                            <label htmlFor="advanced-street-number" className="block text-sm font-medium text-gray-700 mb-1">
                                Street Number
                            </label>
                            <input
                                type="text"
                                id="advanced-street-number"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                placeholder=""
                                value={house}
                                onChange={e => setNumber(e.target.value)}
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="advanced-street-name" className="block text-sm font-medium text-gray-700 mb-1">
                                Street Name
                            </label>
                            <input
                                type="text"
                                id="advanced-street-name"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                placeholder=""
                                value={street}
                                onChange={e => setStreet(e.target.value)}
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="advanced-city" className="block text-sm font-medium text-gray-700 mb-1">
                                City
                            </label>
                            <input
                                type="text"
                                id="advanced-city"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                placeholder=""
                                value={city}
                                onChange={e => setCity(e.target.value)}
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="advanced-state" className="block text-sm font-medium text-gray-700 mb-1">
                                State
                            </label>
                            <input
                                type="text"
                                id="advanced-state"
                                maxLength={2}
                                className="w-16 border border-gray-300 rounded px-3 py-2 text-sm shadow-sm text-center uppercase focus:ring-orange-500 focus:border-orange-500"
                                placeholder=""
                                value={stateCode}
                                onChange={e => setStateCode(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="col-span-2">
                            <FilterToggle
                                label="Owner Location"
                                value={ownerLocation === "any" ? "" : ownerLocation === "instate" ? "true" : "false"}
                                onChange={(value) => {
                                    if (value === "") setOwnerLocation("any");
                                    else if (value === "true") setOwnerLocation("instate");
                                    else setOwnerLocation("outofstate");
                                }}
                                options={{
                                    any: "Any",
                                    yes: "In State",
                                    no: "Out of State"
                                }}
                            />
                        </div>
                    </div>
                    <FilterToggle label="Corporate Owned" value={corporateOwned} onChange={setCorporateOwned} />
                    <div className="h-4"></div>
                    <FilterRange
                        label="Years Owned"
                        values={yearsOwnedRange}
                        onChange={setYearsOwnedRange}
                        min={0}
                        max={100}
                        step={1}
                    />
                    <div className="h-4"></div>
                    <FilterRange
                        label="Last Sale Price"
                        values={lastSalePriceRange}
                        onChange={setLastSalePriceRange}
                        min={0}
                        max={10000000}
                        step={1}
                    />
                    <div className="h-4"></div>
                    <div className="grid grid-cols-2 gap-4">
                    <FilterToggle label="Active MLS" value={mlsActive} onChange={setMlsActive} />
                    <FilterToggle label="Last Sale Arms Length" value={lastSaleArmsLength} onChange={setLastSaleArmsLength} />
                    </div>

                    <h4 className="text-md font-semibold text-gray-700 mt-6 mb-2">Physical Characteristics</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <FilterRange
                            label="Year Built"
                            values={yearBuiltRange}
                            onChange={setYearBuiltRange}
                            min={1800}
                            max={2025}
                        />
                        <FilterRange
                            label="Lot Size"
                            values={lotSizeRange}
                            onChange={setLotSizeRange}
                            min={0}
                            max={100000}
                        />
                        <FilterRange
                            label="Number of Stories"
                            values={storiesRange}
                            onChange={setStoriesRange}
                            min={0}
                            max={100}
                        />
                        <FilterToggle label="Flood Zone" value={floodZone} onChange={setFloodZone} />
                    </div>

                    <h4 className="text-md font-semibold text-gray-700 mt-6 mb-2">Financials</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <FilterRange
                            label="Mortgage Balance"
                            values={mortgageBalanceRange}
                            onChange={setMortgageBalanceRange}
                            min={0}
                            max={10000000}
                            step={10000}
                        />
                        <FilterRange
                            label="Assessed Value"
                            values={assessedValueRange}
                            onChange={setAssessedValueRange}
                            min={0}
                            max={10000000}
                            step={10000}
                        />
                        <FilterRange
                            label="Estimated Value"
                            values={estimatedValueRange}
                            onChange={setEstimatedValueRange}
                            min={0}
                            max={10000000}
                            step={10000}
                        />
                        <FilterRange
                            label="Estimated Equity"
                            values={estimatedEquityRange}
                            onChange={setEstimatedEquityRange}
                            min={0}
                            max={10000000}
                            step={10000}
                        />
                        <FilterToggle label="Assumable" value={assumable} onChange={setAssumable} />
                        <FilterToggle label="Auction" value={auction} onChange={setAuction} />
                        <FilterToggle label="REO" value={reo} onChange={setReo} />
                        <FilterToggle label="Tax Lien" value={taxLien} onChange={setTaxLien} />
                        <FilterToggle label="Pre-Foreclosure" value={preForeclosure} onChange={setPreForeclosure} />
                        <FilterToggle label="Private Lender" value={privateLender} onChange={setPrivateLender} />
                    </div>
                </div>
            )}
        </div>
    );
};