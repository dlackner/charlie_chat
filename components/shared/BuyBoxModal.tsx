/*
 * CHARLIE2 V2 - Buy Box Modal Component
 * User investment criteria configuration with market setup
 * Part of the new V2 application architecture
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPropertiesAccess } from "@/app/my-properties/components/useMyPropertiesAccess";
import { Home, X, Star, Plus, Info, MapPin } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { PropertyCountRangeIndicator } from "@/components/ui/PropertyCountRangeIndicator";
import { getPropertyCountStatus, MarketTier, MARKET_TIERS } from "@/lib/marketSizeUtil";

// Utility function for capitalizing words (proper case)
const capitalizeWords = (str: string) =>
    str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// Address validation and suggestions (same logic as discover page)
const validateAndSuggestAddress = async (input: string, marketId: string, setShowSuggestions: (marketId: string, show: boolean) => void, setSuggestions: (marketId: string, suggestions: any[]) => void) => {
    if (!input.trim() || input.length < 3) {
        setShowSuggestions(marketId, false);
        return;
    }
    
    // Check if this is multiple zip codes (contains commas and looks like zip codes)
    const hasCommas = input.includes(',');
    const zipPattern = /^\d{5}(-\d{4})?$/;
    const parts = input.split(',').map(s => s.trim());
    
    // If it's all zip codes, don't suggest
    if (hasCommas && parts.every(part => zipPattern.test(part))) {
        setShowSuggestions(marketId, false);
        return;
    }
    
    try {
        const response = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
        if (response.ok) {
            const data = await response.json();
            if (data.predictions && Array.isArray(data.predictions)) {
                setSuggestions(marketId, data.predictions);
                setShowSuggestions(marketId, true);
            } else {
                setShowSuggestions(marketId, false);
            }
        } else {
            setShowSuggestions(marketId, false);
        }
    } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setShowSuggestions(marketId, false);
    }
};

// Parse location input and extract location components (same logic as discover page)
const parseLocationInput = (locationInput: string): { type: 'city' | 'zip' | 'county', city: string, state: string, zip: string, county: string } => {
    if (!locationInput.trim()) {
        return { type: 'city', city: '', state: '', zip: '', county: '' };
    }

    const locationParts = locationInput.split(',').map(s => s.trim());
    const zipMatch = locationInput.match(/\b\d{5}(-\d{4})?\b/);
    
    if (zipMatch && locationParts.length === 1) {
        // Just a ZIP code
        return { type: 'zip', zip: zipMatch[0], city: '', state: '', county: '' };
    } else if (locationParts.length >= 2) {
        const firstPart = locationParts[0];
        const lastPart = locationParts[1].trim();
        const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
        
        let parsedData: { type: 'city' | 'zip' | 'county', city: string, state: string, zip: string, county: string } = {
            type: 'city',
            city: '',
            state: '',
            zip: '',
            county: ''
        };

        // Check if first part contains "County"
        if (firstPart.toLowerCase().includes('county')) {
            parsedData.type = 'county';
            parsedData.county = capitalizeWords(firstPart);
            parsedData.city = capitalizeWords(firstPart); // Store county in city field for API compatibility
        } else {
            parsedData.city = capitalizeWords(firstPart);
        }
        
        if (stateZipMatch) {
            parsedData.state = stateZipMatch[1].toUpperCase();
            if (stateZipMatch[2]) parsedData.zip = stateZipMatch[2];
        }
        
        return parsedData;
    } else {
        // Single input - could be city or zip
        if (zipMatch) {
            return { type: 'zip', zip: zipMatch[0], city: '', state: '', county: '' };
        } else {
            const firstPart = locationParts[0];
            if (firstPart.toLowerCase().includes('county')) {
                return { 
                    type: 'county' as const, 
                    county: capitalizeWords(firstPart),
                    city: capitalizeWords(firstPart), // Store county in city field for API compatibility
                    state: '', 
                    zip: '' 
                };
            } else {
                return { 
                    type: 'city' as const, 
                    city: capitalizeWords(firstPart), 
                    state: '', 
                    zip: '', 
                    county: '' 
                };
            }
        }
    }
};

// Get current location display value for the unified input
const getLocationDisplayValue = (market: any) => {
    if (market.type === 'zip' && market.zip) {
        return market.zip;
    } else if (market.type === 'city' && market.city && market.state) {
        return `${market.city}, ${market.state}`;
    } else if (market.city && market.state) {
        return `${market.city}, ${market.state}`;
    } else if (market.city) {
        return market.city;
    } else if (market.zip) {
        return market.zip;
    }
    return '';
};

// Generate a stable market key for recommendation system mapping (never changes)
// Always uses sequential Market1-5 format regardless of location type
const generateMarketKey = (index: number): string => {
    return `Market${index + 1}`;
};

// Generate next sequential market key (don't fill gaps, just continue sequence)
const generateNextMarketKey = (existingMarkets: Market[]): string => {
    const marketNumbers = existingMarkets
        .map(m => m.market_key)
        .filter(key => key.startsWith('Market'))
        .map(key => parseInt(key.replace('Market', '')))
        .filter(num => !isNaN(num));
    
    const maxNumber = marketNumbers.length > 0 ? Math.max(...marketNumbers) : 0;
    return `Market${maxNumber + 1}`;
};

// Generate a descriptive market name based on location (or use custom name)
const getMarketDisplayName = (market: Market, index: number): string => {
    if (market.customName?.trim()) {
        return market.customName.trim();
    }
    
    if (market.type === 'city' && market.city && market.state) {
        return `${market.city}, ${market.state}`;
    } else if (market.type === 'county' && market.county && market.state) {
        return `${market.county}, ${market.state}`;
    } else if (market.type === 'zip' && market.zip) {
        const firstZip = market.zip.split(',')[0].trim();
        return `ZIP ${firstZip}`;
    } else {
        return '';
    }
};

// Utility function to generate a hash of market criteria for cache validation
const generateCriteriaHash = (market: Market): string => {
    const criteriaString = JSON.stringify({
        type: market.type,
        city: market.city,
        state: market.state,
        zip: market.zip,
        units_min: market.units_min,
        units_max: market.units_max,
        assessed_value_min: market.assessed_value_min,
        assessed_value_max: market.assessed_value_max,
        estimated_value_min: market.estimated_value_min,
        estimated_value_max: market.estimated_value_max,
        year_built_min: market.year_built_min,
        year_built_max: market.year_built_max
    });
    
    let hash = 0;
    for (let i = 0; i < criteriaString.length; i++) {
        const char = criteriaString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
};

interface Market {
    id: string;
    user_id: string;
    market_key: string;
    market_name?: string;
    market_type: 'city' | 'zip' | 'county';
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
    units_min: number;
    units_max: number;
    assessed_value_min: number;
    assessed_value_max: number;
    estimated_value_min: number;
    estimated_value_max: number;
    year_built_min: number;
    year_built_max: number;
    latitude?: number;
    longitude?: number;
    property_count?: number;
    market_tier?: number;
    rental_region_id?: number;
    property_ids?: string[];
    cache_criteria_hash?: string;
    cache_updated_at?: string;
    lambda_value?: number;
    exploration_score?: number;
    total_decisions_made: number;
    learning_phase?: 'discovery' | 'learning' | 'mastery' | 'production';
    learning_completed_at?: string;
    created_at?: string;
    updated_at?: string;
    // UI compatibility fields
    type?: 'city' | 'zip' | 'county';
    customName?: string;
    marketKey?: string;
    isExpanded?: boolean;
    propertyCountChecked?: boolean;
    marketTier?: MarketTier;
    weekly_recommendations_enabled?: boolean;
}

interface BuyBoxData {
    markets: Market[];
    weekly_recommendations_enabled: boolean;
}

const initialBuyBoxData: BuyBoxData = {
    markets: [],
    weekly_recommendations_enabled: false,
};

interface BuyBoxModalProps {
    isOpen: boolean;
    onClose: () => void;
    focusedMarket?: string | null; // Market name to focus on, null for add mode, undefined for show all
}

export const BuyBoxModal: React.FC<BuyBoxModalProps> = ({ isOpen, onClose, focusedMarket }) => {
    const { user, supabase } = useAuth();
    const { hasAccess } = useMyPropertiesAccess();
    const [buyBoxData, setBuyBoxData] = useState<BuyBoxData>(initialBuyBoxData);
    const [isLoading, setIsLoading] = useState(false);
    const [marketConvergence, setMarketConvergence] = useState<{ [marketKey: string]: { phase: 'discovery' | 'learning' | 'mastery' | 'production'; progress: number } }>({});
    const [errorMessage, setErrorMessage] = useState("");
    const [savingMarkets, setSavingMarkets] = useState<Set<string>>(new Set());
    const [successMessage, setSuccessMessage] = useState("");
    const [showLearningPhasesModal, setShowLearningPhasesModal] = useState(false);
    const [maxMarkets, setMaxMarkets] = useState(5); // Default for Pro users
    // Location input states (separate from parsed location data, like discover page)
    const [locationInputs, setLocationInputs] = useState<{ [marketId: string]: string }>({});
    const [showAddressSuggestions, setShowAddressSuggestions] = useState<{ [marketId: string]: boolean }>({});
    const [addressSuggestions, setAddressSuggestions] = useState<{ [marketId: string]: any[] }>({});

    // Memoized function to close learning phases modal
    const handleCloseLearningPhases = useCallback(() => {
        setShowLearningPhasesModal(false);
    }, []);

    // Helper functions for address suggestions (same pattern as discover page)
    const updateAddressSuggestions = useCallback((marketId: string, suggestions: any[]) => {
        setAddressSuggestions(prev => ({ ...prev, [marketId]: suggestions }));
    }, []);

    const updateShowAddressSuggestions = useCallback((marketId: string, show: boolean) => {
        setShowAddressSuggestions(prev => ({ ...prev, [marketId]: show }));
    }, []);

    const selectAddressSuggestion = useCallback((marketId: string, suggestion: any) => {
        const suggestionText = suggestion.description;
        setLocationInputs(prev => ({ ...prev, [marketId]: suggestionText }));
        setShowAddressSuggestions(prev => ({ ...prev, [marketId]: false }));
        
        // Parse and update market data when suggestion is selected
        const parsedLocation = parseLocationInput(suggestionText);
        setBuyBoxData(prev => ({
            ...prev,
            markets: prev.markets.map(market => {
                if (market.id === marketId) {
                    return {
                        ...market,
                        type: parsedLocation.type,
                        city: parsedLocation.city,
                        state: parsedLocation.state,
                        zip: parsedLocation.zip,
                        county: parsedLocation.county
                    };
                }
                return market;
            })
        }));
    }, []);

    // Load existing buy box data when modal opens
    useEffect(() => {
        const loadBuyBoxData = async () => {
            if (!isOpen || !user || !supabase || !hasAccess) return;

            setIsLoading(true);
            try {
                // Load markets from user_markets table
                const { data: marketsData, error: marketsError } = await supabase
                    .from("user_markets")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("market_key");

                // Load weekly recommendations setting from profiles table
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("weekly_recommendations_enabled")
                    .eq("user_id", user.id)
                    .single();

                if (marketsError) {
                    // Handle market loading errors silently
                    setErrorMessage("Failed to load markets");
                    return;
                }

                if (profileError) {
                    // Handle profile loading errors silently
                }

                // Convert database fields to UI format
                const marketsWithUIState = (marketsData || []).map((market: any) => {
                    // Remove is_locked field completely - all markets should be editable
                    const { is_locked, ...marketWithoutLock } = market;
                    
                    return {
                        ...marketWithoutLock,
                        // Add UI state
                        isExpanded: false,
                        propertyCountChecked: market.property_count > 0,
                        // Map database field names to UI field names for compatibility
                        type: market.market_type,
                        customName: market.market_name,
                        marketKey: market.market_key,
                        // Convert market_tier integer to MarketTier object
                        marketTier: market.market_tier ? MARKET_TIERS.find(tier => tier.tier === market.market_tier) || MARKET_TIERS[3] : null,
                        // Load per-market weekly recommendations setting (fallback to global if not set)
                        weekly_recommendations_enabled: market.weekly_recommendations_enabled ?? profileData?.weekly_recommendations_enabled ?? false
                    };
                });

                setBuyBoxData({
                    markets: marketsWithUIState,
                    weekly_recommendations_enabled: profileData?.weekly_recommendations_enabled ?? false
                });

                // Initialize location inputs for existing markets (same as discover page approach)
                const initialLocationInputs: { [marketId: string]: string } = {};
                marketsWithUIState.forEach((market: any) => {
                    initialLocationInputs[market.id] = getLocationDisplayValue(market) || '';
                });
                setLocationInputs(initialLocationInputs);

            } catch (error) {
                // Handle unexpected loading errors silently
                setErrorMessage("Failed to load buy box data");
            } finally {
                setIsLoading(false);
            }
        };


        // Load convergence data using shared utility
        const loadMarketConvergence = async () => {
            if (!user || !supabase) return;
            
            try {
                const { updateMarketConvergence } = await import('@/lib/convergenceAnalysis');
                const convergenceData = await updateMarketConvergence(user.id, supabase);
                setMarketConvergence(convergenceData);
                // Market convergence loaded successfully
            } catch (error) {
                // Handle market convergence loading errors silently
            }
        };

        loadBuyBoxData();
        loadMarketConvergence();
        checkUserMarketLimit();
    }, [isOpen, user, supabase, hasAccess]);

    // Add template market when in add mode
    useEffect(() => {
        if (isOpen && focusedMarket === null) {
            // Check if we already have a template market for new market creation
            const hasTemplateMarket = buyBoxData.markets.some(market => market.id === 'template-new-market');
            if (!hasTemplateMarket) {
                // Create and add a template market for adding with proper Market1 naming
                const templateMarket: Market = {
                    id: 'template-new-market',
                    user_id: user?.id || '',
                    market_key: 'Market1',
                    market_name: '',
                    market_type: 'city',
                    city: '',
                    state: '',
                    zip: '',
                    units_min: 15,
                    units_max: 35,
                    assessed_value_min: 1000000,
                    assessed_value_max: 2500000,
                    estimated_value_min: 1200000,
                    estimated_value_max: 2800000,
                    year_built_min: 1990,
                    year_built_max: 2010,
                    total_decisions_made: 0,
                    learning_phase: 'discovery',
                    type: 'city',
                    customName: '',
                    marketKey: 'Market1',
                    isExpanded: true,
                    propertyCountChecked: false,
                    weekly_recommendations_enabled: true
                };
                
                setBuyBoxData(prev => ({
                    ...prev,
                    markets: [...prev.markets, templateMarket]
                }));

                // Initialize location input for template market
                setLocationInputs(prev => ({ ...prev, [templateMarket.id]: '' }));
                // Added template market to state for add mode
            }
        }
    }, [isOpen, focusedMarket, buyBoxData.markets.length, user]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setBuyBoxData(initialBuyBoxData);
            setErrorMessage("");
            setSuccessMessage("");
            setSavingMarkets(new Set());
        }
    }, [isOpen]);

    // Number formatting functions
    const formatCurrency = (value: number | undefined): string => {
        return !value || value === 0 ? '' : value.toLocaleString();
    };

    const parseCurrency = (value: string): number => {
        const cleaned = value.replace(/,/g, '');
        const parsed = parseInt(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Allow unlimited markets for all users
    const checkUserMarketLimit = async () => {
        setMaxMarkets(999); // Unlimited markets for all users
    };

    const addMarket = async () => {
        if (user) {
            // Query database to get all existing market keys for this user
            const { data: existingMarkets } = await supabase
                .from("user_markets")
                .select("market_key")
                .eq("user_id", user.id);
            
            const existingKeys = (existingMarkets || []).map(m => m.market_key);
            // Existing market keys loaded from database
            
            // Generate next key based on actual database content
            const marketNumbers = existingKeys
                .filter(key => key.startsWith('Market'))
                .map(key => parseInt(key.replace('Market', '')))
                .filter(num => !isNaN(num));
            
            const maxNumber = marketNumbers.length > 0 ? Math.max(...marketNumbers) : 0;
            const nextMarketKey = `Market${maxNumber + 1}`;
            
            // Generated next market key
            const newMarket: Market = {
                id: crypto.randomUUID(),
                user_id: user.id,
                market_key: nextMarketKey,
                market_name: '',
                market_type: 'city',
                city: '',
                state: '',
                zip: '',
                units_min: 0,
                units_max: 0,
                assessed_value_min: 0,
                assessed_value_max: 0,
                estimated_value_min: 0,
                estimated_value_max: 0,
                year_built_min: 0,
                year_built_max: 0,
                total_decisions_made: 0,
                learning_phase: 'discovery',
                // UI compatibility fields
                type: 'city',
                marketKey: nextMarketKey,
                customName: '',
                isExpanded: true,  // Auto-expand new market for immediate editing
            };
            setBuyBoxData(prev => ({
                ...prev,
                markets: [...prev.markets, newMarket]
            }));
        }
    };

    const removeMarket = async (marketId: string) => {
        if (!user || !supabase) return;

        try {
            const updatedMarkets = buyBoxData.markets.filter(m => m.id !== marketId);
            
            setBuyBoxData(prev => ({
                ...prev,
                markets: updatedMarkets
            }));

            // Delete the market from user_markets table
            const { error } = await supabase
                .from("user_markets")
                .delete()
                .eq("user_id", user.id)
                .eq("id", marketId);

            if (error) {
                // Handle market removal errors silently
                setErrorMessage("Failed to remove market");
                setBuyBoxData(prev => ({
                    ...prev,
                    markets: buyBoxData.markets
                }));
            }
        } catch (error) {
            // Handle market removal errors silently
            setErrorMessage("Failed to remove market");
        }
    };

    const updateMarket = (marketId: string, updates: Partial<Market>) => {
        setBuyBoxData(prev => {
            // Check if this is a template market that doesn't exist in state yet
            const existingMarket = prev.markets.find(market => market.id === marketId);
            
            if (!existingMarket && marketId.startsWith('template-')) {
                // This is a template market being updated for the first time - add it to state
                // Keep the template ID instead of generating a new one to maintain consistency
                let templateMarket: Market;
                
                if (marketId === 'template-new-market') {
                    // Create the new market template - use temporary key, will be fixed during save
                    templateMarket = {
                        id: marketId, // Keep the template ID for now
                        user_id: user?.id || '',
                        market_key: 'temp-new-market', // Temporary key, will be replaced during save
                        market_name: '',
                        market_type: 'city',
                        city: '',
                        state: '',
                        zip: '',
                        units_min: 15,
                        units_max: 35,
                        assessed_value_min: 1000000,
                        assessed_value_max: 2500000,
                        estimated_value_min: 1200000,
                        estimated_value_max: 2800000,
                        year_built_min: 1990,
                        year_built_max: 2010,
                        total_decisions_made: 0,
                        learning_phase: 'discovery',
                        type: 'city',
                        customName: '',
                        marketKey: `Market${prev.markets.length + 1}`,
                        isExpanded: true,
                        propertyCountChecked: false,
                        weekly_recommendations_enabled: true,
                        ...updates
                    };
                } else {
                    // This is a focused market template - extract market name from marketId
                    const focusedMarketName = marketId.replace('template-', '').replace(/-/g, ' ');
                    const [city, state] = focusedMarketName.split(' ');
                    templateMarket = {
                        id: marketId, // Keep the template ID for now
                        user_id: user?.id || '',
                        market_key: 'temp-focused-market', // Temporary key, will be replaced during save
                        market_name: focusedMarketName,
                        market_type: 'city',
                        city: city || '',
                        state: state || '',
                        zip: '',
                        units_min: 15,
                        units_max: 35,
                        assessed_value_min: 1000000,
                        assessed_value_max: 2500000,
                        estimated_value_min: 1200000,
                        estimated_value_max: 2800000,
                        year_built_min: 1990,
                        year_built_max: 2010,
                        total_decisions_made: 0,
                        learning_phase: 'discovery',
                        type: 'city',
                        customName: focusedMarketName,
                        marketKey: `Market${prev.markets.length + 1}`,
                        isExpanded: true,
                        propertyCountChecked: false,
                        weekly_recommendations_enabled: true,
                        ...updates
                    };
                }
                
                // Sync UI fields with database fields
                if ('type' in updates) {
                    templateMarket.market_type = updates.type as 'city' | 'zip' | 'county';
                }
                if ('customName' in updates) {
                    templateMarket.market_name = updates.customName;
                    
                    // Clear error message if user enters a name
                    if (updates.customName?.trim()) {
                        setErrorMessage("");
                    }
                }
                
                // Initialize location input for new template market
                setLocationInputs(prevInputs => ({ 
                    ...prevInputs, 
                    [templateMarket.id]: getLocationDisplayValue(templateMarket) || '' 
                }));

                return {
                    ...prev,
                    markets: [...prev.markets, templateMarket]
                };
            }
            
            // Normal market update logic
            return {
                ...prev,
                markets: prev.markets.map((market, index) => {
                    if (market.id === marketId) {
                        const updatedMarket = { ...market, ...updates };
                        
                        // Sync UI fields with database fields
                        if ('type' in updates) {
                            updatedMarket.market_type = updates.type as 'city' | 'zip' | 'county';
                        }
                        if ('customName' in updates) {
                            updatedMarket.market_name = updates.customName;
                            
                            // Clear error message if user enters a name
                            if (updates.customName?.trim()) {
                                setErrorMessage("");
                            }
                        }
                        
                        // Don't regenerate market_key once it's been set - this preserves the unique key
                        // generated during addMarket and prevents constraint violations
                        return updatedMarket;
                    }
                    return market;
                })
            };
        });
    };

    const toggleMarketExpansion = (marketId: string) => {
        setBuyBoxData(prev => ({
            ...prev,
            markets: prev.markets.map(market => {
                if (market.id === marketId) {
                    return { ...market, isExpanded: !market.isExpanded };
                }
                return market;
            })
        }));
    };

    const checkPropertyCount = async (market: Market): Promise<{ count: number; propertyIds: string[]; coordinates?: { lat: number; lng: number } }> => {
        try {
            const searchPayload: any = {
                size: 8000,  // Cap at 8,000 properties for API limit
                resultIndex: 0,
                count: true,
                ids_only: true,  // Only get IDs and count, not full property details
                property_type: "MFR",
                obfuscate: false,
                summary: false
            };

            let locationCondition: any = {};
            if (market.type === 'city' && market.city && market.state) {
                // Check if this is actually a county stored in the city field
                if (market.city.toLowerCase().includes('county')) {
                    locationCondition.county = market.city;
                    locationCondition.state = market.state;
                } else {
                    locationCondition.city = market.city;
                    locationCondition.state = market.state;
                }
            } else if (market.type === 'county' && market.county && market.state) {
                locationCondition.county = market.county;
                locationCondition.state = market.state;
            } else if (market.type === 'zip' && market.zip) {
                locationCondition.zip = market.zip;
            } else {
                return { count: 0, propertyIds: [], coordinates: undefined };
            }

            const orCriteria: any[] = [];

            if (market.units_min > 0 || market.units_max > 0) {
                const unitsCondition: any = {};
                if (market.units_min > 0) unitsCondition.units_min = market.units_min;
                if (market.units_max > 0) unitsCondition.units_max = market.units_max;
                orCriteria.push(unitsCondition);
            }

            if (market.assessed_value_min > 0 || market.assessed_value_max > 0) {
                const assessedValueCondition: any = {};
                if (market.assessed_value_min > 0) assessedValueCondition.assessed_value_min = market.assessed_value_min;
                if (market.assessed_value_max > 0) assessedValueCondition.assessed_value_max = market.assessed_value_max;
                orCriteria.push(assessedValueCondition);
            }

            if (market.estimated_value_min > 0 || market.estimated_value_max > 0) {
                const estimatedValueCondition: any = {};
                if (market.estimated_value_min > 0) estimatedValueCondition.value_min = market.estimated_value_min;
                if (market.estimated_value_max > 0) estimatedValueCondition.value_max = market.estimated_value_max;
                orCriteria.push(estimatedValueCondition);
            }

            if (market.year_built_min > 0 || market.year_built_max > 0) {
                const yearBuiltCondition: any = {};
                if (market.year_built_min > 0) yearBuiltCondition.year_built_min = market.year_built_min;
                if (market.year_built_max > 0) yearBuiltCondition.year_built_max = market.year_built_max;
                orCriteria.push(yearBuiltCondition);
            }

            if (orCriteria.length > 0) {
                searchPayload.and = [
                    locationCondition,
                    { or: orCriteria }
                ];
            } else {
                Object.assign(searchPayload, locationCondition);
            }

            searchPayload.ids_only = true;
            
            const response = await fetch('/api/realestateapi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchPayload),
            });

            if (!response.ok) {
                return { count: 0, propertyIds: [] };
            }

            const data = await response.json();
            
            let propertyIds: string[] = [];
            if (data.ids && Array.isArray(data.ids)) {
                propertyIds = data.ids;
            } else if (data.data && Array.isArray(data.data)) {
                propertyIds = data.data.map((property: any) => property.id || property.propertyId).filter(Boolean);
            }
            
            // Use actual number of IDs returned (respects size limit) rather than total available
            const count = propertyIds.length || 0;
            
            let coordinates: { lat: number; lng: number } | undefined;
            
            if (propertyIds.length > 0) {
                const coordResponse = await fetch('/api/realestateapi', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ids: [parseInt(propertyIds[0])],
                        size: 1,
                        ids_only: false,
                        obfuscate: false,
                        summary: false
                    }),
                });
                
                if (coordResponse.ok) {
                    const coordData = await coordResponse.json();
                    if (coordData.data && coordData.data.length > 0) {
                        const firstProperty = coordData.data[0];
                        
                        if (firstProperty.latitude && firstProperty.longitude) {
                            coordinates = {
                                lat: parseFloat(firstProperty.latitude),
                                lng: parseFloat(firstProperty.longitude)
                            };
                        } else if (firstProperty.lat && firstProperty.lng) {
                            coordinates = {
                                lat: parseFloat(firstProperty.lat),
                                lng: parseFloat(firstProperty.lng)
                            };
                        }
                    }
                }
            }
            
            return { count, propertyIds, coordinates };
        } catch (error) {
            // Handle property count check errors silently
            return { count: 0, propertyIds: [], coordinates: undefined };
        }
    };

    // Find nearest rental market within radius using market_rental_data table
    const findNearestRentalMarket = async (lat: number, lng: number): Promise<{region_id: number, market_tier: number} | null> => {
        try {
            const { data: rentalMarkets, error } = await supabase
                .from('market_rental_data')
                .select('region_id, latitude, longitude, radius, city_state, market_tier');

            if (error || !rentalMarkets) {
                // Handle rental market fetch errors silently
                return null;
            }

            // Calculate distance to each rental market and check if within radius
            for (const market of rentalMarkets) {
                if (market.latitude && market.longitude) {
                    const distance = calculateDistance(lat, lng, market.latitude, market.longitude);
                    if (distance <= market.radius) {
                        // Found rental market within radius
                        return {
                            region_id: market.region_id,
                            market_tier: market.market_tier
                        };
                    }
                }
            }

            // No rental market found within radius
            return null;
        } catch (error) {
            // Handle findNearestRentalMarket errors silently
            return null;
        }
    };

    // Calculate distance between two lat/long points using Haversine formula
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in miles
    };

    const saveMarket = async (marketId: string) => {
        if (!user || !supabase) return;

        setSavingMarkets(prev => new Set(prev).add(marketId));

        try {
            const market = buyBoxData.markets.find(m => m.id === marketId);
            if (!market) {
                setErrorMessage("Market not found");
                return;
            }

            // If this is a template market, generate a new ID for database storage and update the market in state
            const isTemplate = market.id.startsWith('template-');
            const actualMarketId = isTemplate ? crypto.randomUUID() : market.id;
            
            // If template, update the market ID in state to the new UUID for future operations
            if (isTemplate) {
                setBuyBoxData(prev => ({
                    ...prev,
                    markets: prev.markets.map(m => 
                        m.id === marketId ? { ...m, id: actualMarketId } : m
                    )
                }));
            }

            // Validate that market has a name before saving
            const marketName = market.customName?.trim() || market.market_name?.trim();
            if (!marketName) {
                setErrorMessage("Please enter a name for the market before saving");
                return;
            }

            // Check for duplicate market names for this user
            const { data: existingMarkets, error: duplicateCheckError } = await supabase
                .from("user_markets")
                .select("id, market_name")
                .eq("user_id", user.id)
                .eq("market_name", marketName);

            if (duplicateCheckError) {
                setErrorMessage("Error checking for duplicate market names");
                return;
            }

            // If we found existing markets with this name, check if it's not the current market
            if (existingMarkets && existingMarkets.length > 0) {
                const isDuplicate = existingMarkets.some(existingMarket => existingMarket.id !== actualMarketId);
                if (isDuplicate) {
                    setErrorMessage(`A market named "${marketName}" already exists. Please choose a different name.`);
                    return;
                }
            }

            // Validate that at least one filter criteria is set
            const hasUnitsFilter = (market.units_min > 0 || market.units_max > 0);
            const hasAssessedValueFilter = (market.assessed_value_min > 0 || market.assessed_value_max > 0);
            const hasEstimatedValueFilter = (market.estimated_value_min > 0 || market.estimated_value_max > 0);
            const hasYearBuiltFilter = (market.year_built_min > 0 || market.year_built_max > 0);

            if (!hasUnitsFilter && !hasAssessedValueFilter && !hasEstimatedValueFilter && !hasYearBuiltFilter) {
                setErrorMessage("Please set at least one filter criteria (Units, Year Built, Assessed Value, or Estimated Value) before saving");
                return;
            }

            // Proceed with property count check and tier calculation
            const { count: rawPropertyCount, propertyIds, coordinates } = await checkPropertyCount(market);
            // Cap property count at 8,000 for display and storage (API limit)
            const propertyCount = Math.min(rawPropertyCount, 8000);

            let marketTier: MarketTier | null = null;
            let rentalRegionId: number | null = null;

            if (coordinates) {
                // Looking for rental market near coordinates
                // Get both rental region and market tier from market_rental_data table
                const rentalMarket = await findNearestRentalMarket(coordinates.lat, coordinates.lng);
                if (rentalMarket) {
                    rentalRegionId = rentalMarket.region_id;
                    marketTier = rentalMarket.market_tier ? MARKET_TIERS.find(tier => tier.tier === rentalMarket.market_tier) || MARKET_TIERS[3] : null;
                    // Found rental market for coordinates
                } else {
                    // No rental market found for coordinates - defaulting to Tier 4
                    // Default to Tier 4 when no market found within radius
                    marketTier = MARKET_TIERS[3]; // Tier 4 (Small City)
                    // Using default Tier 4 for unmatched location
                }
            }

            const criteriaHash = generateCriteriaHash(market);

            const updatedMarkets = buyBoxData.markets.map(m =>
                m.id === marketId 
                    ? { 
                        ...m, 
                        propertyCount, 
                        propertyCountChecked: true, 
                        marketTier: marketTier || undefined,
                        rentalRegionId: rentalRegionId || undefined
                    } 
                    : m
            );

            setBuyBoxData(prev => ({
                ...prev,
                markets: updatedMarkets
            }));

            // Save/update the individual market in user_markets table
            const marketToSave = updatedMarkets.find(m => m.id === marketId);
            if (marketToSave) {
                // Generate proper market key for template markets or Market1 (new users)
                let finalMarketKey = marketToSave.market_key;
                if (finalMarketKey.startsWith('temp-') || finalMarketKey === 'Market1') {
                    // This is a template market - generate proper market key
                    const { data: existingMarkets } = await supabase
                        .from("user_markets")
                        .select("market_key")
                        .eq("user_id", user.id);
                    
                    const existingKeys = (existingMarkets || []).map(m => m.market_key);
                    const marketNumbers = existingKeys
                        .filter(key => key.startsWith('Market'))
                        .map(key => parseInt(key.replace('Market', '')))
                        .filter(num => !isNaN(num));
                    
                    const maxNumber = marketNumbers.length > 0 ? Math.max(...marketNumbers) : 0;
                    finalMarketKey = `Market${maxNumber + 1}`;
                }
                
                // Validate and prepare data for upsert
                const marketData = {
                    id: actualMarketId,
                    user_id: user.id,
                    market_key: finalMarketKey,
                    market_name: marketToSave.market_name || null,
                    market_type: marketToSave.market_type,
                    city: marketToSave.city || null,
                    state: marketToSave.state || null,
                    zip: marketToSave.zip || null,
                    county: marketToSave.county || null,
                    units_min: Number(marketToSave.units_min) || 0,
                    units_max: Number(marketToSave.units_max) || 0,
                    assessed_value_min: Number(marketToSave.assessed_value_min) || 0,
                    assessed_value_max: Number(marketToSave.assessed_value_max) || 0,
                    estimated_value_min: Number(marketToSave.estimated_value_min) || 0,
                    estimated_value_max: Number(marketToSave.estimated_value_max) || 0,
                    year_built_min: Number(marketToSave.year_built_min) || 0,
                    year_built_max: Number(marketToSave.year_built_max) || 0,
                    latitude: coordinates?.lat || null,
                    longitude: coordinates?.lng || null,
                    property_count: Number(propertyCount) || 0,
                    property_ids: propertyIds || null,
                    rental_region_id: rentalRegionId || null,
                    market_tier: marketTier?.tier || null,
                    cache_criteria_hash: criteriaHash,
                    cache_updated_at: new Date().toISOString(),
                    total_decisions_made: 0,
                    learning_phase: 'discovery',
                    updated_at: new Date().toISOString(),
                };

                // Saving market data

                const { error: marketError } = await supabase
                    .from("user_markets")
                    .upsert(marketData, {
                        onConflict: "id"
                    });

                if (marketError) {
                    // Handle market save errors silently
                    throw new Error(`Database error: ${marketError.message} (${marketError.code})`);
                }
            }

            if (propertyIds.length > 0 && coordinates) {
                const marketKey = market.type === 'city' 
                    ? `city_${market.city}_${market.state}`.replace(/[^a-zA-Z0-9_]/g, '_')
                    : `zip_${market.zip}`.replace(/[^a-zA-Z0-9_]/g, '_');

                // Note: Property cache data is now saved directly to user_markets table above
                // No need for separate cache table operation
            }

            setBuyBoxData(prev => ({
                ...prev,
                markets: prev.markets.map(market =>
                    market.id === marketId ? { 
                        ...market, 
                        property_count: propertyCount,
                        marketTier: marketTier || undefined
                    } : market
                )
            }));
            
        } catch (error: any) {
            // Handle unexpected market save errors silently
            setErrorMessage(`Error saving market: ${error.message || JSON.stringify(error)}`);
        } finally {
            setSavingMarkets(prev => {
                const newSet = new Set(prev);
                newSet.delete(marketId);
                return newSet;
            });
        }
    };


    // Show upgrade screen if no access
    if (!hasAccess) {
        return (
            <Dialog open={isOpen} onClose={onClose} className="relative z-50">
                <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                        <div className="text-center">
                            <Star size={48} className="mx-auto mb-4 text-gray-400" />
                            
                            <Dialog.Title className="text-2xl font-bold text-gray-900 mb-2">
                                Upgrade Required
                            </Dialog.Title>
                            
                            <p className="text-gray-600 mb-2">
                                My Buy Box is available for Pro and Cohort members.
                            </p>
                            
                            <p className="text-gray-600 mb-6">
                                Upgrade your account to set investment criteria and receive weekly property recommendations.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        onClose();
                                        window.open("/pricing", "_blank");
                                    }}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                >
                                    View Pricing
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 text-gray-600 hover:text-gray-800 py-3 px-6 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        );
    }

    return (
        <>
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                                <Home size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <Dialog.Title className="text-2xl font-semibold text-gray-900">
                                    My Buy Box
                                </Dialog.Title>
                                <p className="text-sm text-gray-600 mt-1">Set your investment criteria to receive personalized weekly property recommendations</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                        {/* Messages */}
                        {successMessage && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium shadow-sm">
                                {successMessage}
                            </div>
                        )}

                        {errorMessage && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium shadow-sm">
                                {errorMessage}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading buy box...</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Target Markets */}
                                <div>
                                    {/* Header and Add Market button removed - not needed in focused/add modes */}

                                    {/* Market List */}
                                    <div className="space-y-4">
                                        {(() => {
                                            // Filter markets based on focusedMarket prop
                                            // Modal debug information
                                            let marketsToShow = buyBoxData.markets;
                                            
                                            if (focusedMarket === null) {
                                                // Add new market mode - show only new/empty markets and template markets
                                                marketsToShow = buyBoxData.markets.filter(market => 
                                                    (!market.market_name && !market.city) || 
                                                    market.id === 'template-new-market'
                                                );
                                            } else if (focusedMarket) {
                                                // Focus on specific market - find by market_key or display name with flexible matching
                                                marketsToShow = buyBoxData.markets.filter(market => {
                                                    const marketName = market.market_name || market.customName || `${market.city}, ${market.state}`;
                                                    const marketKey = market.market_key;
                                                    // Matching market found
                                                    // Match either the market key (like "Market1") or the display name (like "Newport, RI")
                                                    return marketKey === focusedMarket || marketName === focusedMarket;
                                                });
                                                // Markets filtered for display
                                            }
                                            // If focusedMarket is undefined, show all markets (original behavior) - marketsToShow is already set to buyBoxData.markets

                                            // If no markets found in add mode, the useEffect should have created a template market
                                            // No need for fallback creation here as it causes duplicate keys

                                            // If no market found but we're in focused mode, create a template market to edit
                                            if (marketsToShow.length === 0 && focusedMarket) {
                                                // Create a template market based on the focused market name
                                                const [city, state] = focusedMarket.split(', ');
                                                const templateMarket = {
                                                    id: 'template-' + focusedMarket.replace(/[^a-zA-Z0-9]/g, '-'),
                                                    user_id: user?.id || '',
                                                    market_key: 'Market1',
                                                    market_name: focusedMarket,
                                                    market_type: 'city' as 'city',
                                                    city: city || '',
                                                    state: state || '',
                                                    zip: '',
                                                    units_min: 15,
                                                    units_max: 35,
                                                    assessed_value_min: 1000000,
                                                    assessed_value_max: 2500000,
                                                    estimated_value_min: 1200000,
                                                    estimated_value_max: 2800000,
                                                    year_built_min: 1990,
                                                    year_built_max: 2010,
                                                    total_decisions_made: 0,
                                                    learning_phase: 'discovery' as 'discovery',
                                                    type: 'city' as 'city',
                                                    customName: focusedMarket,
                                                    marketKey: 'Market1',
                                                    isExpanded: true,
                                                    propertyCountChecked: false,
                                                    weekly_recommendations_enabled: true
                                                };
                                                marketsToShow = [templateMarket];
                                            }

                                            if (marketsToShow.length === 0 && focusedMarket === undefined) {
                                                return (
                                                    <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                                                        No markets added yet. Click "Add Market" to get started.
                                                    </div>
                                                );
                                            }

                                            // If in add mode but no template market was created, create one inline
                                            if (marketsToShow.length === 0 && focusedMarket === null) {
                                                const templateMarket = {
                                                    id: 'template-new-market-inline',
                                                    user_id: user?.id || '',
                                                    market_key: 'Market1',
                                                    market_name: '',
                                                    market_type: 'city' as 'city',
                                                    city: '',
                                                    state: '',
                                                    zip: '',
                                                    units_min: 15,
                                                    units_max: 35,
                                                    assessed_value_min: 1000000,
                                                    assessed_value_max: 2500000,
                                                    estimated_value_min: 1200000,
                                                    estimated_value_max: 2800000,
                                                    year_built_min: 1990,
                                                    year_built_max: 2010,
                                                    total_decisions_made: 0,
                                                    learning_phase: 'discovery' as 'discovery',
                                                    type: 'city' as 'city',
                                                    customName: '',
                                                    marketKey: 'Market1',
                                                    isExpanded: true,
                                                    propertyCountChecked: false,
                                                    weekly_recommendations_enabled: true
                                                };
                                                marketsToShow = [templateMarket];
                                            }

                                            return marketsToShow.map((market, index) => {
                                            const isSavingThis = savingMarkets.has(market.id);
                                            // Auto-expand when in focused market mode
                                            const isExpanded = focusedMarket ? true : (market.isExpanded !== false);
                                            
                                            return (
                                                <div key={market.id} className={`border rounded-xl transition-all duration-200 ${
                                                    isExpanded 
                                                        ? 'border-blue-500 shadow-lg bg-blue-50/50 ring-1 ring-blue-500/20' 
                                                        : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                                                }`}>
                                                    <div 
                                                        className={`p-4 transition-colors ${focusedMarket ? '' : 'cursor-pointer hover:bg-gray-50'}`}
                                                        onClick={focusedMarket ? undefined : () => toggleMarketExpansion(market.id)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center space-x-2">
                                                                    <input
                                                                        type="text"
                                                                        value={market.customName !== undefined ? market.customName : getMarketDisplayName(market, index)}
                                                                        placeholder="Enter name for market"
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            updateMarket(market.id, { customName: e.target.value });
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        onBlur={(e) => {
                                                                            if (e.target.value === getMarketDisplayName({ ...market, customName: undefined }, index)) {
                                                                                updateMarket(market.id, { customName: undefined });
                                                                            }
                                                                        }}
                                                                        onFocus={(e) => {
                                                                            e.stopPropagation();
                                                                            if (market.customName === undefined) {
                                                                                // Use setTimeout to avoid immediate re-render that could lose focus
                                                                                setTimeout(() => {
                                                                                    updateMarket(market.id, { customName: getMarketDisplayName(market, index) });
                                                                                }, 0);
                                                                            }
                                                                        }}
                                                                        className="font-semibold text-gray-900 bg-transparent border border-gray-200 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3 py-2 min-w-[8ch] max-w-[40ch] hover:border-gray-300 transition-all duration-200 text-base"
                                                                        title="Click to edit market name"
                                                                    />
                                                                    {market.propertyCountChecked && (() => {
                                                                        const marketTier = market.marketTier || { 
                                                                            tier: 4, 
                                                                            name: "Estimated", 
                                                                            description: "General guidance", 
                                                                            minRank: 301, 
                                                                            maxRank: 915,
                                                                            recommendedMin: 50,
                                                                            recommendedMax: 300,
                                                                            sweetSpotMin: 100,
                                                                            sweetSpotMax: 200
                                                                        };
                                                                        const status = getPropertyCountStatus(market.property_count || 0, marketTier);
                                                                        return (
                                                                            <span 
                                                                                className={`text-xs px-2 py-1 rounded-full ${status.color}`}
                                                                                title={status.message}
                                                                            >
                                                                                {market.property_count?.toLocaleString()} properties
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {/* Save button - Only visible when expanded */}
                                                                {isExpanded && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            saveMarket(market.id);
                                                                        }}
                                                                        disabled={isSavingThis}
                                                                        className="px-4 py-2 rounded text-sm font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        title="Save market configuration"
                                                                    >
                                                                        {isSavingThis ? 'Updating...' : 'Update Criteria'}
                                                                    </button>
                                                                )}
                                                                {!focusedMarket && (
                                                                    <span className={`transform transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                        ▼
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="px-6 pb-6 border-t border-gray-100">
                                                            {/* Market configuration form - keeping existing structure but with smaller text */}
                                                            <div className="mb-6 mt-6">
                                                                <div className="mb-3 relative">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Enter city, county, or zip code (e.g., Newport, RI or Newport County, RI or 02840)"
                                                                        value={locationInputs[market.id] || ''}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            const locationInput = e.target.value;
                                                                            
                                                                            // Update the input state (allows free typing like discover page)
                                                                            setLocationInputs(prev => ({ ...prev, [market.id]: locationInput }));
                                                                            
                                                                            // Parse and update market data
                                                                            const parsedLocation = parseLocationInput(locationInput);
                                                                            updateMarket(market.id, {
                                                                                type: parsedLocation.type,
                                                                                city: parsedLocation.city,
                                                                                state: parsedLocation.state,
                                                                                zip: parsedLocation.zip,
                                                                                county: parsedLocation.county
                                                                            });
                                                                            
                                                                            // Trigger address validation after 300ms delay (same as discover page)
                                                                            clearTimeout((window as any).addressValidationTimeout);
                                                                            (window as any).addressValidationTimeout = setTimeout(() => {
                                                                                validateAndSuggestAddress(locationInput, market.id, updateShowAddressSuggestions, updateAddressSuggestions);
                                                                            }, 300);
                                                                        }}
                                                                        onFocus={(e) => {
                                                                            e.stopPropagation();
                                                                            const currentInput = locationInputs[market.id] || '';
                                                                            if (currentInput.length >= 3) {
                                                                                validateAndSuggestAddress(currentInput, market.id, updateShowAddressSuggestions, updateAddressSuggestions);
                                                                            }
                                                                        }}
                                                                        onBlur={() => {
                                                                            // Delay hiding suggestions to allow for clicks
                                                                            setTimeout(() => updateShowAddressSuggestions(market.id, false), 200);
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="w-full px-4 py-3 text-sm font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                    />
                                                                    
                                                                    {/* Address Suggestions Dropdown (same as discover page) */}
                                                                    {showAddressSuggestions[market.id] && addressSuggestions[market.id] && addressSuggestions[market.id].length > 0 && (
                                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                                                            {addressSuggestions[market.id].map((suggestion: any, index: number) => (
                                                                                <button
                                                                                    key={index}
                                                                                    onClick={() => selectAddressSuggestion(market.id, suggestion)}
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

                                                            {/* Property Filters */}
                                                            <div className="grid grid-cols-2 gap-6">
                                                                <div>
                                                                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                                        Units Range
                                                                    </label>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={market.units_min || ''}
                                                                            placeholder="Min"
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                updateMarket(market.id, { units_min: parseInt(e.target.value) || 0 });
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onFocus={(e) => e.stopPropagation()}
                                                                            className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                        />
                                                                        <span className="text-gray-600 text-sm font-medium">to</span>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={market.units_max || ''}
                                                                            placeholder="Max"
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                updateMarket(market.id, { units_max: parseInt(e.target.value) || 0 });
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onFocus={(e) => e.stopPropagation()}
                                                                            className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                                        Year Built Range
                                                                    </label>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="number"
                                                                            min="1800"
                                                                            max={new Date().getFullYear()}
                                                                            value={market.year_built_min || ''}
                                                                            placeholder="Min"
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                updateMarket(market.id, { year_built_min: parseInt(e.target.value) || 0 });
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onFocus={(e) => e.stopPropagation()}
                                                                            className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                        />
                                                                        <span className="text-gray-600 text-sm font-medium">to</span>
                                                                        <input
                                                                            type="number"
                                                                            min="1800"
                                                                            max={new Date().getFullYear()}
                                                                            value={market.year_built_max || ''}
                                                                            placeholder="Max"
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                updateMarket(market.id, { year_built_max: parseInt(e.target.value) || 0 });
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onFocus={(e) => e.stopPropagation()}
                                                                            className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                                <div>
                                                                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                                        Assessed Value Range
                                                                    </label>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="text"
                                                                            value={formatCurrency(market.assessed_value_min)}
                                                                            placeholder="Min value"
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                updateMarket(market.id, { assessed_value_min: parseCurrency(e.target.value) });
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onFocus={(e) => e.stopPropagation()}
                                                                            className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                        />
                                                                        <span className="text-gray-600 text-sm font-medium">to</span>
                                                                        <input
                                                                            type="text"
                                                                            value={formatCurrency(market.assessed_value_max)}
                                                                            placeholder="Max value"
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                updateMarket(market.id, { assessed_value_max: parseCurrency(e.target.value) });
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onFocus={(e) => e.stopPropagation()}
                                                                            className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                                        Estimated Value Range
                                                                    </label>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="text"
                                                                            value={formatCurrency(market.estimated_value_min)}
                                                                            placeholder="Min value"
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                updateMarket(market.id, { estimated_value_min: parseCurrency(e.target.value) });
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onFocus={(e) => e.stopPropagation()}
                                                                            className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                        />
                                                                        <span className="text-gray-600 text-sm font-medium">to</span>
                                                                        <input
                                                                            type="text"
                                                                            value={formatCurrency(market.estimated_value_max)}
                                                                            placeholder="Max value"
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                updateMarket(market.id, { estimated_value_max: parseCurrency(e.target.value) });
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onFocus={(e) => e.stopPropagation()}
                                                                            className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Market Range Indicator */}
                                                            {market.propertyCountChecked && (() => {
                                                                const debugMarketTier = market.marketTier || (market.market_tier ? MARKET_TIERS.find(t => t.tier === market.market_tier) || MARKET_TIERS[3] : MARKET_TIERS[3]);
                                                                return (
                                                                    <PropertyCountRangeIndicator
                                                                        propertyCount={market.property_count || 0}
                                                                        marketTier={debugMarketTier}
                                                                        cityName={market.type === 'city' ? market.city : market.zip}
                                                                    />
                                                                );
                                                            })()}

                                                            {/* Per-Market Weekly Recommendations Toggle - shown when in focused mode */}
                                                            {focusedMarket && (
                                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                                    <label className="flex items-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={market.weekly_recommendations_enabled ?? buyBoxData.weekly_recommendations_enabled}
                                                                            onChange={async (e) => {
                                                                                const enabled = e.target.checked;
                                                                                // Update the specific market
                                                                                updateMarket(market.id, { weekly_recommendations_enabled: enabled });
                                                                                
                                                                                // Auto-save to database
                                                                                if (user && supabase) {
                                                                                    try {
                                                                                        const { error } = await supabase
                                                                                            .from("user_markets")
                                                                                            .update({
                                                                                                weekly_recommendations_enabled: enabled,
                                                                                                updated_at: new Date().toISOString(),
                                                                                            })
                                                                                            .eq("id", market.id);
                                                                                        
                                                                                        if (error) {
                                                                                            // Handle weekly recommendations save errors silently
                                                                                        }
                                                                                    } catch (error) {
                                                                                        // Handle weekly recommendations save errors silently
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                        />
                                                                        <div>
                                                                            <span className="text-base font-semibold text-gray-900">
                                                                                Enable weekly recommendations for this market
                                                                            </span>
                                                                            <p className="text-sm text-gray-600 mt-1">
                                                                                Get curated properties for this market delivered every Monday
                                                                            </p>
                                                                        </div>
                                                                    </label>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Global Weekly Recommendations Toggle - only show when not in focused mode and not in add mode */}
                                {focusedMarket === undefined && (
                                    <div className="border-t border-gray-200 pt-6">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={buyBoxData.weekly_recommendations_enabled}
                                            onChange={async (e) => {
                                                const enabled = e.target.checked;
                                                setBuyBoxData(prev => ({ ...prev, weekly_recommendations_enabled: enabled }));
                                                
                                                // Auto-save weekly recommendations setting immediately
                                                if (user && supabase) {
                                                    try {
                                                        const { error } = await supabase
                                                            .from("profiles")
                                                            .update({
                                                                weekly_recommendations_enabled: enabled,
                                                                updated_at: new Date().toISOString(),
                                                            })
                                                            .eq("user_id", user.id);
                                                        
                                                        if (error) {
                                                            // Handle weekly recommendations setting save errors silently
                                                        }
                                                    } catch (error) {
                                                        // Handle weekly recommendations setting save errors silently
                                                    }
                                                }
                                            }}
                                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-gray-900">
                                                Enable weekly property recommendations
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLearningPhasesModal(true)}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors ml-1 inline-flex"
                                                    title="How I learn your preferences"
                                                >
                                                    <Info size={14} />
                                                </button>
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Get curated properties per market every Friday, delivered right to your home page!
                                            </p>
                                        </div>
                                    </label>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer with Done button */}
                    <div className="px-8 py-4 border-t border-gray-100 bg-gray-50">
                        <div className="flex justify-end">
                            <button
                                onClick={onClose}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>

                </Dialog.Panel>
            </div>
        </Dialog>

        {/* Learning Phases Explanation Modal */}
        <Dialog open={showLearningPhasesModal} onClose={handleCloseLearningPhases} className="relative z-[70]">
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
                    {/* Header with Charlie */}
                    <div className="flex items-start gap-4 mb-4">
                        <img
                            src="/charlie.png"
                            alt="Charlie"
                            className="w-12 h-12 rounded-full shadow-md border flex-shrink-0"
                        />
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                How I Learn Your Investment Style
                            </h3>
                            <p className="text-gray-700 text-sm">
                                Plot twist: I'm actually getting smarter! My machine learning algorithms are always watching and learning, getting better at predicting what makes you say "YES!" to a property.
                            </p>
                        </div>
                    </div>
                    
                    {/* Learning Phase Explanations */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Discovery Phase */}
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-1.5 flex-shrink-0 mt-0.5">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-sm"></div>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 mb-1">Discovery Phase</h4>
                                <p className="text-sm text-gray-700">
                                    I'm just getting started! I'm watching your early property choices to understand what catches your eye. 
                                    Every property you favorite teaches me something new about your investment style.
                                </p>
                            </div>
                        </div>

                        {/* Learning Phase */}
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-1.5 flex-shrink-0 mt-0.5">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-sm"></div>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 mb-1">Learning Phase</h4>
                                <p className="text-sm text-gray-700">
                                    Getting smarter! I'm analyzing patterns in your favorites and building your unique investment profile. 
                                    I'm starting to understand your preferred neighborhoods, property types, and price ranges.
                                </p>
                            </div>
                        </div>

                        {/* Mastery Phase */}
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-1.5 flex-shrink-0 mt-0.5">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-sm"></div>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 mb-1">Mastery Phase</h4>
                                <p className="text-sm text-gray-700">
                                    I've got it! I understand your preferences and can recommend properties that match your investment style. 
                                    My recommendations are becoming more targeted and relevant to your goals.
                                </p>
                            </div>
                        </div>

                        {/* Production Phase */}
                        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-1.5 flex-shrink-0 mt-0.5">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 shadow-sm"></div>
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-green-700 shadow-sm"></div>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 mb-1">Production Phase</h4>
                                <p className="text-sm text-gray-700">
                                    I'm in the zone! Using everything I've learned to find you the perfect investment opportunities. 
                                    My recommendations are now highly personalized and optimized for your specific investment criteria.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Close Button */}
                    <div className="flex justify-center pt-4">
                        <button
                            type="button"
                            onClick={handleCloseLearningPhases}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-150"
                        >
                            Got it, Charlie!
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
        </>
    );
};