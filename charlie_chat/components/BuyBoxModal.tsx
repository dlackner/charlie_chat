"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPropertiesAccess } from "@/app/my-properties/components/useMyPropertiesAccess";
import { Home, X, Star, Plus, Trash2, Info } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { PropertyCountRangeIndicator } from "@/components/ui/PropertyCountRangeIndicator";
import { getPropertyCountStatus, MarketTier, MARKET_TIERS } from "@/lib/marketSizeUtil";

// Utility function for capitalizing words (proper case)
const capitalizeWords = (str: string) =>
    str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

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
    } else if (market.type === 'zip' && market.zip) {
        const firstZip = market.zip.split(',')[0].trim();
        return `ZIP ${firstZip}`;
    } else {
        return `Market ${index + 1}`;
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
    market_type: 'city' | 'zip';
    city?: string;
    state?: string;
    zip?: string;
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
    is_locked?: boolean;
    // UI compatibility fields
    type?: 'city' | 'zip';
    customName?: string;
    marketKey?: string;
    isExpanded?: boolean;
    propertyCountChecked?: boolean;
    marketTier?: MarketTier;
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
}

export const BuyBoxModal: React.FC<BuyBoxModalProps> = ({ isOpen, onClose }) => {
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

    // Memoized function to close learning phases modal
    const handleCloseLearningPhases = useCallback(() => {
        console.log('Closing learning phases modal');
        setShowLearningPhasesModal(false);
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
                    console.error("Error loading markets:", marketsError);
                    setErrorMessage("Failed to load markets");
                    return;
                }

                if (profileError) {
                    console.warn("Error loading profile:", profileError);
                }

                // Convert database fields to UI format
                const marketsWithUIState = (marketsData || []).map((market: any) => ({
                    ...market,
                    // Add UI state
                    isExpanded: false,
                    propertyCountChecked: market.property_count > 0,
                    // Map database field names to UI field names for compatibility
                    type: market.market_type,
                    customName: market.market_name,
                    marketKey: market.market_key,
                    // Convert market_tier integer to MarketTier object
                    marketTier: market.market_tier ? MARKET_TIERS.find(tier => tier.tier === market.market_tier) || MARKET_TIERS[3] : null
                }));

                setBuyBoxData({
                    markets: marketsWithUIState,
                    weekly_recommendations_enabled: profileData?.weekly_recommendations_enabled ?? false
                });

            } catch (error) {
                console.error("Unexpected error loading buy box data:", error);
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
                console.log('📊 Market convergence loaded:', convergenceData);
            } catch (error) {
                console.error('Error loading market convergence:', error);
            }
        };

        loadBuyBoxData();
        loadMarketConvergence();
        checkUserMarketLimit();
    }, [isOpen, user, supabase, hasAccess]);

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

    // Check user's market limit based on user class
    const checkUserMarketLimit = async () => {
        if (!user || !supabase) return;
        
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_class')
                .eq('user_id', user.id)
                .single();
            
            // Limit trial and charlie_chat users to 1 market
            if (profile?.user_class === 'trial' || profile?.user_class === 'charlie_chat') {
                setMaxMarkets(1);
            } else {
                setMaxMarkets(5); // Default for Pro users
            }
        } catch (error) {
            console.error('Error checking user class:', error);
            setMaxMarkets(5); // Default on error
        }
    };

    const addMarket = async () => {
        if (buyBoxData.markets.length < maxMarkets && user) {
            // Query database to get all existing market keys for this user
            const { data: existingMarkets } = await supabase
                .from("user_markets")
                .select("market_key")
                .eq("user_id", user.id);
            
            const existingKeys = (existingMarkets || []).map(m => m.market_key);
            console.log("📊 Existing market keys in database:", existingKeys);
            
            // Generate next key based on actual database content
            const marketNumbers = existingKeys
                .filter(key => key.startsWith('Market'))
                .map(key => parseInt(key.replace('Market', '')))
                .filter(num => !isNaN(num));
            
            const maxNumber = marketNumbers.length > 0 ? Math.max(...marketNumbers) : 0;
            const nextMarketKey = `Market${maxNumber + 1}`;
            
            console.log("🔑 Generated next market key:", nextMarketKey);
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
                is_locked: false,  // New markets start unlocked
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
                console.error("Error removing market:", error);
                setErrorMessage("Failed to remove market");
                setBuyBoxData(prev => ({
                    ...prev,
                    markets: buyBoxData.markets
                }));
            }
        } catch (error) {
            console.error("Error removing market:", error);
            setErrorMessage("Failed to remove market");
        }
    };

    const updateMarket = (marketId: string, updates: Partial<Market>) => {
        setBuyBoxData(prev => ({
            ...prev,
            markets: prev.markets.map((market, index) => {
                if (market.id === marketId) {
                    const updatedMarket = { ...market, ...updates };
                    
                    // Sync UI fields with database fields
                    if ('type' in updates) {
                        updatedMarket.market_type = updates.type as 'city' | 'zip';
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
        }));
    };

    const toggleMarketExpansion = (marketId: string) => {
        setBuyBoxData(prev => ({
            ...prev,
            markets: prev.markets.map(market => {
                if (market.id === marketId) {
                    const updatedMarket = { ...market, isExpanded: !market.isExpanded };
                    // When expanding a market for the first time, set it to locked state by default
                    if (!market.isExpanded && updatedMarket.isExpanded) {
                        updatedMarket.is_locked = true;
                    }
                    return updatedMarket;
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
                locationCondition.city = market.city;
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
            console.error('Error checking property count:', error);
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
                console.error('Error fetching rental markets:', error);
                return null;
            }

            // Calculate distance to each rental market and check if within radius
            for (const market of rentalMarkets) {
                if (market.latitude && market.longitude) {
                    const distance = calculateDistance(lat, lng, market.latitude, market.longitude);
                    if (distance <= market.radius) {
                        console.log(`🏡 Found rental market ${market.city_state} (region_id: ${market.region_id}, tier: ${market.market_tier}) within ${distance.toFixed(2)} miles (radius: ${market.radius})`);
                        return {
                            region_id: market.region_id,
                            market_tier: market.market_tier
                        };
                    }
                }
            }

            console.log('❌ No rental market found within radius');
            return null;
        } catch (error) {
            console.error('Error in findNearestRentalMarket:', error);
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

            // Validate that market has a name before saving
            const marketName = market.customName?.trim() || market.market_name?.trim();
            if (!marketName) {
                setErrorMessage("Please enter a name for the market before saving");
                return;
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

            // If market is locked, skip property count check and tier recalculation
            // Just save the current state as-is to preserve locked configuration
            if (market.is_locked) {
                const marketToSave = {
                    id: market.id,
                    user_id: user.id,
                    market_key: market.market_key,
                    market_name: market.market_name || null,
                    market_type: market.market_type,
                    city: market.city || null,
                    state: market.state || null,
                    zip: market.zip || null,
                    units_min: Number(market.units_min) || 0,
                    units_max: Number(market.units_max) || 0,
                    assessed_value_min: Number(market.assessed_value_min) || 0,
                    assessed_value_max: Number(market.assessed_value_max) || 0,
                    estimated_value_min: Number(market.estimated_value_min) || 0,
                    estimated_value_max: Number(market.estimated_value_max) || 0,
                    year_built_min: Number(market.year_built_min) || 0,
                    year_built_max: Number(market.year_built_max) || 0,
                    // Keep existing values for locked market
                    latitude: market.latitude || null,
                    longitude: market.longitude || null,
                    property_count: Number(market.property_count) || 0,
                    market_tier: market.market_tier || null,
                    rental_region_id: market.rental_region_id || null,
                    property_ids: market.property_ids || null,
                    cache_criteria_hash: market.cache_criteria_hash || null,
                    cache_updated_at: market.cache_updated_at || new Date().toISOString(),
                    lambda_value: Number(market.lambda_value) || null,
                    exploration_score: Number(market.exploration_score) || null,
                    total_decisions_made: Number(market.total_decisions_made) || 0,
                    learning_phase: market.learning_phase || 'discovery',
                    learning_completed_at: market.learning_completed_at || null,
                    is_locked: true,
                    updated_at: new Date().toISOString()
                };

                console.log("💾 Saving locked market data:", marketToSave);

                const { error: saveError } = await supabase
                    .from('user_markets')
                    .upsert(marketToSave);

                if (saveError) {
                    console.error("Error saving locked market:", {
                        error: saveError,
                        message: saveError.message,
                        details: saveError.details,
                        hint: saveError.hint,
                        code: saveError.code
                    });
                    setErrorMessage(`Failed to save market: ${saveError.message} (${saveError.code})`);
                    return;
                }

                console.log("✅ Saved locked market without recalculation");
                setSavingMarkets(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(marketId);
                    return newSet;
                });
                return;
            }

            // For unlocked markets, proceed with normal property count check and tier calculation
            const { count: rawPropertyCount, propertyIds, coordinates } = await checkPropertyCount(market);
            // Cap property count at 8,000 for display and storage (API limit)
            const propertyCount = Math.min(rawPropertyCount, 8000);

            let marketTier: MarketTier | null = null;
            let rentalRegionId: number | null = null;

            if (coordinates) {
                console.log(`🔍 Looking for rental market near coordinates: ${coordinates.lat}, ${coordinates.lng}`);
                // Get both rental region and market tier from market_rental_data table
                const rentalMarket = await findNearestRentalMarket(coordinates.lat, coordinates.lng);
                if (rentalMarket) {
                    rentalRegionId = rentalMarket.region_id;
                    marketTier = rentalMarket.market_tier ? MARKET_TIERS.find(tier => tier.tier === rentalMarket.market_tier) || MARKET_TIERS[3] : null;
                    console.log(`✅ Found rental market: region_id=${rentalMarket.region_id}, tier=${rentalMarket.market_tier}`);
                } else {
                    console.log(`❌ No rental market found for coordinates ${coordinates.lat}, ${coordinates.lng} - defaulting to Tier 4`);
                    // Default to Tier 4 when no market found within radius
                    marketTier = MARKET_TIERS[3]; // Tier 4 (Small City)
                    console.log(`🔄 Using default Tier 4 for unmatched location: ${marketTier.name}`);
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
                // Validate and prepare data for upsert
                const marketData = {
                    id: marketToSave.id,
                    user_id: user.id,
                    market_key: marketToSave.market_key,
                    market_name: marketToSave.market_name || null,
                    market_type: marketToSave.market_type,
                    city: marketToSave.city || null,
                    state: marketToSave.state || null,
                    zip: marketToSave.zip || null,
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
                    is_locked: true,  // Lock market after first successful save
                    updated_at: new Date().toISOString(),
                };

                console.log("💾 Saving market data:", marketData);

                const { error: marketError } = await supabase
                    .from("user_markets")
                    .upsert(marketData, {
                        onConflict: "id"
                    });

                if (marketError) {
                    console.error("Error saving market:", {
                        error: marketError,
                        message: marketError.message,
                        details: marketError.details,
                        hint: marketError.hint,
                        code: marketError.code
                    });
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
                        is_locked: true,  // Update UI to reflect locked state
                        property_count: propertyCount,
                        marketTier: marketTier || undefined
                    } : market
                )
            }));
            
        } catch (error: any) {
            console.error("Unexpected error saving market:", error);
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
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center">
                            <Home size={24} className="mr-3 text-blue-600" />
                            <div>
                                <Dialog.Title className="text-xl font-semibold text-gray-900">
                                    My Buy Box
                                </Dialog.Title>
                                <p className="text-sm text-gray-600">Set your investment criteria to receive personalized weekly property recommendations</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                        {/* Messages */}
                        {successMessage && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                                {successMessage}
                            </div>
                        )}

                        {errorMessage && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                                {errorMessage}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading buy box...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Target Markets */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Target Markets (up to {maxMarkets})
                                        </label>
                                        <button
                                            onClick={addMarket}
                                            disabled={buyBoxData.markets.length >= maxMarkets}
                                            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus size={16} className="mr-1" />
                                            Add Market
                                        </button>
                                    </div>

                                    {buyBoxData.markets.length === 0 && (
                                        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                                            No markets added yet. Click "Add Market" to get started.
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {buyBoxData.markets.map((market, index) => {
                                            const isSavingThis = savingMarkets.has(market.id);
                                            const isExpanded = market.isExpanded !== false;
                                            
                                            return (
                                                <div key={market.id} className={`border rounded-lg transition-all duration-200 ${
                                                    isExpanded 
                                                        ? 'border-blue-400 border-2 shadow-md bg-blue-50/30' 
                                                        : 'border-gray-200'
                                                }`}>
                                                    <div 
                                                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                                        onClick={() => toggleMarketExpansion(market.id)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center space-x-2">
                                                                    <input
                                                                        type="text"
                                                                        value={market.customName !== undefined ? market.customName : getMarketDisplayName(market, index)}
                                                                        placeholder="Enter name for market"
                                                                        onChange={(e) => updateMarket(market.id, { customName: e.target.value })}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onBlur={(e) => {
                                                                            if (e.target.value === getMarketDisplayName({ ...market, customName: undefined }, index)) {
                                                                                updateMarket(market.id, { customName: undefined });
                                                                            }
                                                                        }}
                                                                        onFocus={() => {
                                                                            if (market.customName === undefined) {
                                                                                updateMarket(market.id, { customName: getMarketDisplayName(market, index) });
                                                                            }
                                                                        }}
                                                                        className="font-medium text-gray-900 bg-transparent border border-gray-300 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded px-2 py-1 min-w-[8ch] max-w-[40ch] hover:border-gray-400 transition-colors text-sm"
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
                                                                {/* Market Convergence Indicator - Moved below city name */}
                                                                {isExpanded && (() => {
                                                                    const marketKey = market.market_key || generateMarketKey(index);
                                                                    const convergence = marketConvergence[marketKey] || { phase: 'discovery', progress: 1 };
                                                                    
                                                                    return (
                                                                        <div className="flex items-center space-x-1.5 mt-2">
                                                                            {[1, 2, 3, 4].map((dotNumber) => {
                                                                                const isActive = dotNumber <= convergence.progress;
                                                                                const isProduction = dotNumber === 4 && convergence.phase === 'production';
                                                                                
                                                                                return (
                                                                                    <div
                                                                                        key={dotNumber}
                                                                                        className={`w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${
                                                                                            isActive
                                                                                                ? isProduction
                                                                                                    ? 'bg-gradient-to-br from-green-400 to-green-700 shadow-green-300/50'
                                                                                                    : 'bg-gradient-to-br from-blue-400 to-blue-700 shadow-blue-300/50'
                                                                                                : 'bg-gradient-to-br from-gray-200 to-gray-400 shadow-gray-200/50'
                                                                                        }`}
                                                                                        style={{
                                                                                            boxShadow: isActive
                                                                                                ? isProduction
                                                                                                    ? '0 3px 6px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                                                                                                    : '0 3px 6px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                                                                                                : '0 2px 4px rgba(156, 163, 175, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                                                                                        }}
                                                                                    />
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {/* Edit/Save Toggle - Only visible when expanded */}
                                                                {isExpanded && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (market.is_locked) {
                                                                                // Switch to edit mode
                                                                                updateMarket(market.id, { is_locked: false });
                                                                            } else {
                                                                                // Save and lock
                                                                                saveMarket(market.id);
                                                                                updateMarket(market.id, { is_locked: true });
                                                                            }
                                                                        }}
                                                                        disabled={!market.is_locked && isSavingThis}
                                                                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                                                            market.is_locked 
                                                                                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                                                                : 'bg-orange-500 text-white hover:bg-orange-600'
                                                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                        title={market.is_locked ? 'Click to edit market criteria' : 'Click to save changes and lock market'}
                                                                    >
                                                                        {market.is_locked ? 'Edit' : (isSavingThis ? 'Saving...' : 'Save')}
                                                                    </button>
                                                                )}
                                                                {/* Trash icon - Only visible when expanded */}
                                                                {isExpanded && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            removeMarket(market.id);
                                                                        }}
                                                                        className="text-red-600 hover:text-red-700 transition-colors"
                                                                        title="Delete market"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                                <span className={`transform transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                    ▼
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="px-4 pb-4 border-t border-gray-100">
                                                            {/* Market configuration form - keeping existing structure but with smaller text */}
                                                            <div className="mb-4 mt-4">
                                                                <div className="flex items-center space-x-4 mb-3">
                                                                    <label className="flex items-center text-xs">
                                                                        <input
                                                                            type="radio"
                                                                            value="city"
                                                                            checked={market.type === 'city'}
                                                                            onChange={() => updateMarket(market.id, { type: 'city', zip: '' })}
                                                                            disabled={market.is_locked}
                                                                            className="mr-2"
                                                                        />
                                                                        City/State
                                                                    </label>
                                                                    <label className="flex items-center text-xs">
                                                                        <input
                                                                            type="radio"
                                                                            value="zip"
                                                                            checked={market.type === 'zip'}
                                                                            onChange={() => updateMarket(market.id, { type: 'zip', city: '', state: '' })}
                                                                            disabled={market.is_locked}
                                                                            className="mr-2"
                                                                        />
                                                                        ZIP Code(s)
                                                                    </label>
                                                                </div>

                                                                {market.type === 'city' && (
                                                                    <div className="flex gap-3">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="City"
                                                                            value={market.city || ''}
                                                                            onChange={(e) => updateMarket(market.id, { city: capitalizeWords(e.target.value) })}
                                                                            disabled={market.is_locked}
                                                                            className={`flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            maxLength={2}
                                                                            placeholder="ST"
                                                                            value={market.state || ''}
                                                                            onChange={(e) => updateMarket(market.id, { state: e.target.value.toUpperCase() })}
                                                                            disabled={market.is_locked}
                                                                            className={`w-16 px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center uppercase ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {market.type === 'zip' && (
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Zip codes (comma-separated: 02840,02841,02842)"
                                                                        value={market.zip || ''}
                                                                        onChange={(e) => updateMarket(market.id, { zip: e.target.value })}
                                                                        disabled={market.is_locked}
                                                                        className={`w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                                            market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                        }`}
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* Property Filters */}
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                                        Units Range
                                                                    </label>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={market.units_min || ''}
                                                                            placeholder="Min"
                                                                            onChange={(e) => updateMarket(market.id, { units_min: parseInt(e.target.value) || 0 })}
                                                                            disabled={market.is_locked}
                                                                            className={`w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                        <span className="text-gray-500">to</span>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={market.units_max || ''}
                                                                            placeholder="Max"
                                                                            onChange={(e) => updateMarket(market.id, { units_max: parseInt(e.target.value) || 0 })}
                                                                            disabled={market.is_locked}
                                                                            className={`w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                                        Year Built Range
                                                                    </label>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="number"
                                                                            min="1800"
                                                                            max={new Date().getFullYear()}
                                                                            value={market.year_built_min || ''}
                                                                            placeholder="Min"
                                                                            onChange={(e) => updateMarket(market.id, { year_built_min: parseInt(e.target.value) || 0 })}
                                                                            disabled={market.is_locked}
                                                                            className={`w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                        <span className="text-gray-500">to</span>
                                                                        <input
                                                                            type="number"
                                                                            min="1800"
                                                                            max={new Date().getFullYear()}
                                                                            value={market.year_built_max || ''}
                                                                            placeholder="Max"
                                                                            onChange={(e) => updateMarket(market.id, { year_built_max: parseInt(e.target.value) || 0 })}
                                                                            disabled={market.is_locked}
                                                                            className={`w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                                        Assessed Value Range
                                                                    </label>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="text"
                                                                            value={formatCurrency(market.assessed_value_min)}
                                                                            placeholder="Min value"
                                                                            onChange={(e) => updateMarket(market.id, { assessed_value_min: parseCurrency(e.target.value) })}
                                                                            disabled={market.is_locked}
                                                                            className={`w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                        <span className="text-gray-500">to</span>
                                                                        <input
                                                                            type="text"
                                                                            value={formatCurrency(market.assessed_value_max)}
                                                                            placeholder="Max value"
                                                                            onChange={(e) => updateMarket(market.id, { assessed_value_max: parseCurrency(e.target.value) })}
                                                                            disabled={market.is_locked}
                                                                            className={`w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                                        Estimated Value Range
                                                                    </label>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="text"
                                                                            value={formatCurrency(market.estimated_value_min)}
                                                                            placeholder="Min value"
                                                                            onChange={(e) => updateMarket(market.id, { estimated_value_min: parseCurrency(e.target.value) })}
                                                                            disabled={market.is_locked}
                                                                            className={`w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                        <span className="text-gray-500">to</span>
                                                                        <input
                                                                            type="text"
                                                                            value={formatCurrency(market.estimated_value_max)}
                                                                            placeholder="Max value"
                                                                            onChange={(e) => updateMarket(market.id, { estimated_value_max: parseCurrency(e.target.value) })}
                                                                            disabled={market.is_locked}
                                                                            className={`w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                                                market.is_locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Market Range Indicator */}
                                                            {market.propertyCountChecked && (() => {
                                                                const debugMarketTier = market.marketTier || (market.market_tier ? MARKET_TIERS.find(t => t.tier === market.market_tier) || MARKET_TIERS[3] : MARKET_TIERS[3]);
                                                                console.log('🔍 PropertyCountRangeIndicator Debug:', {
                                                                    marketName: market.customName || `${market.city}, ${market.state}`,
                                                                    propertyCount: market.property_count,
                                                                    marketTierObject: market.marketTier,
                                                                    marketTierNumber: market.market_tier,
                                                                    resolvedMarketTier: debugMarketTier,
                                                                    resolvedMarketTierDetails: {
                                                                        tier: debugMarketTier?.tier,
                                                                        name: debugMarketTier?.name,
                                                                        description: debugMarketTier?.description,
                                                                        recommendedMin: debugMarketTier?.recommendedMin,
                                                                        recommendedMax: debugMarketTier?.recommendedMax,
                                                                        sweetSpotMin: debugMarketTier?.sweetSpotMin,
                                                                        sweetSpotMax: debugMarketTier?.sweetSpotMax
                                                                    },
                                                                    allMarketData: {
                                                                        city: market.city,
                                                                        state: market.state,
                                                                        latitude: market.latitude,
                                                                        longitude: market.longitude,
                                                                        rental_region_id: market.rental_region_id
                                                                    }
                                                                });
                                                                return (
                                                                    <PropertyCountRangeIndicator
                                                                        propertyCount={market.property_count || 0}
                                                                        marketTier={debugMarketTier}
                                                                        cityName={market.type === 'city' ? market.city : market.zip}
                                                                    />
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Weekly Recommendations Toggle */}
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
                                                            console.error('Error saving weekly recommendations setting:', error);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error saving weekly recommendations setting:', error);
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
                                                Get curated properties per market every Monday, delivered right to your home page!
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Done
                        </button>
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
                            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-150"
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