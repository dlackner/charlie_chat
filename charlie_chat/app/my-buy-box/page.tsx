"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPropertiesAccess } from "@/app/my-properties/components/useMyPropertiesAccess";
import { Save, ArrowLeft, Star, Plus, Trash2, Home } from "lucide-react";

// Utility function for capitalizing words (same as in sidebar)
const capitalizeWords = (str: string) =>
    str.replace(/\b\w/g, (c) => c.toUpperCase());

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
    
    // Simple hash function (you could use crypto.subtle.digest for better hashing)
    let hash = 0;
    for (let i = 0; i < criteriaString.length; i++) {
        const char = criteriaString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
};

interface Market {
    id: string;
    type: 'city' | 'zip';
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
    isExpanded?: boolean;
    propertyCount?: number;
    propertyCountChecked?: boolean;
}

interface BuyBoxData {
    target_markets: Market[];
    weekly_recommendations_enabled: boolean;
}

const initialBuyBoxData: BuyBoxData = {
    target_markets: [],
    weekly_recommendations_enabled: true,
};

export default function MyBuyBoxPage() {
    // Check feature flag first - disabled for now to allow testing
    // if (process.env.NEXT_PUBLIC_ENABLE_MY_BUY_BOX !== 'true') {
    //     return (
    //         <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    //             <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
    //                 <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
    //                 <h1 className="text-2xl font-bold text-gray-900 mb-2">Feature Coming Soon</h1>
    //                 <p className="text-gray-600 mb-6">
    //                     My Buy Box is currently under development and will be available soon.
    //                 </p>
    //                 <button
    //                     onClick={() => window.history.back()}
    //                     className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150"
    //                 >
    //                     Go Back
    //                 </button>
    //             </div>
    //         </div>
    //     );
    // }

    const { user, supabase, isLoading: isAuthLoading } = useAuth();
    const { hasAccess, isLoading: isLoadingAccess } = useMyPropertiesAccess();
    const router = useRouter();
    const [buyBoxData, setBuyBoxData] = useState<BuyBoxData>(initialBuyBoxData);
    const [isLoading, setIsLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [savingMarkets, setSavingMarkets] = useState<Set<string>>(new Set());

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push("/login");
        }
    }, [user, isAuthLoading, router]);

    // Load existing buy box data
    useEffect(() => {
        const loadBuyBoxData = async () => {
            if (!user || !supabase || !hasAccess) return;

            try {
                const { data: buyBoxData, error: buyBoxError } = await supabase
                    .from("user_buy_box_preferences")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (buyBoxError && buyBoxError.code !== "PGRST116") {
                    console.warn("Buy box preferences table not found or error loading:", buyBoxError);
                } else if (buyBoxData) {
                    // Add IDs to markets if they don't have them (for existing data)
                    const marketsWithIds = buyBoxData.target_markets.map((market: any) => ({
                        ...market,
                        id: market.id || crypto.randomUUID(),
                        isExpanded: market.isExpanded !== false // Default to expanded
                    }));
                    
                    setBuyBoxData({
                        target_markets: marketsWithIds,
                        weekly_recommendations_enabled: buyBoxData.weekly_recommendations_enabled
                    });
                }
            } catch (error) {
                console.error("Unexpected error loading buy box data:", error);
                setErrorMessage("Failed to load buy box data");
            } finally {
                setIsLoading(false);
            }
        };

        if (user && supabase && !isLoadingAccess) {
            if (hasAccess) {
                loadBuyBoxData();
            } else {
                setIsLoading(false);
            }
        }
    }, [user, supabase, hasAccess, isLoadingAccess]);

    // Number formatting functions for assessed values
    const formatCurrency = (value: number | undefined): string => {
        return !value || value === 0 ? '' : value.toLocaleString();
    };

    const parseCurrency = (value: string): number => {
        const cleaned = value.replace(/,/g, '');
        const parsed = parseInt(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Buy Box helper functions
    const addMarket = () => {
        if (buyBoxData.target_markets.length < 5) {
            const newMarket: Market = {
                id: crypto.randomUUID(),
                type: 'city',
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
                isExpanded: true,
            };
            setBuyBoxData(prev => ({
                ...prev,
                target_markets: [...prev.target_markets, newMarket]
            }));
        }
    };

    const removeMarket = (marketId: string) => {
        setBuyBoxData(prev => ({
            ...prev,
            target_markets: prev.target_markets.filter(m => m.id !== marketId)
        }));
    };

    const updateMarket = (marketId: string, updates: Partial<Market>) => {
        setBuyBoxData(prev => ({
            ...prev,
            target_markets: prev.target_markets.map(market =>
                market.id === marketId ? { ...market, ...updates } : market
            )
        }));
    };

    const toggleMarketExpansion = (marketId: string) => {
        setBuyBoxData(prev => ({
            ...prev,
            target_markets: prev.target_markets.map(market =>
                market.id === marketId ? { ...market, isExpanded: !market.isExpanded } : market
            )
        }));
    };

    const checkPropertyCount = async (market: Market): Promise<{ count: number; propertyIds: string[] }> => {
        try {
            const searchPayload: any = {
                size: 100, // Get more IDs for better caching (ids_only doesn't charge for details)
                resultIndex: 0,
                count: true, // This should return count information
                ids_only: true // Get property IDs without full details to avoid charges
            };

            // Add market-specific filters (these are required)
            if (market.type === 'city' && market.city && market.state) {
                searchPayload.city = market.city;
                searchPayload.state = market.state;
            } else if (market.type === 'zip' && market.zip) {
                searchPayload.zip = market.zip;
            } else {
                // Invalid market configuration
                return { count: 0, propertyIds: [] };
            }

            // Build OR conditions for criteria that might have missing data
            // This allows properties to match if they satisfy any of the specified criteria,
            // even if some data fields are missing
            const orConditions: any[] = [];

            // Create separate OR conditions for each criterion to handle missing data gracefully
            const criteriaGroups: any[] = [];

            // Base location-only search (always included as fallback)
            const baseCondition: any = {};
            if (market.type === 'city' && market.city && market.state) {
                baseCondition.city = market.city;
                baseCondition.state = market.state;
            } else if (market.type === 'zip' && market.zip) {
                baseCondition.zip = market.zip;
            }

            // Add unit constraints with OR logic for missing data
            if (market.units_min > 0 || market.units_max > 0) {
                const unitsCondition = { ...baseCondition };
                if (market.units_min > 0) unitsCondition.units_min = market.units_min;
                if (market.units_max > 0) unitsCondition.units_max = market.units_max;
                criteriaGroups.push(unitsCondition);
            }

            // Add assessed value constraints with OR logic for missing data
            if (market.assessed_value_min > 0 || market.assessed_value_max > 0) {
                const assessedValueCondition = { ...baseCondition };
                if (market.assessed_value_min > 0) assessedValueCondition.assessed_value_min = market.assessed_value_min;
                if (market.assessed_value_max > 0) assessedValueCondition.assessed_value_max = market.assessed_value_max;
                criteriaGroups.push(assessedValueCondition);
            }

            // Add estimated value constraints with OR logic for missing data
            if (market.estimated_value_min > 0 || market.estimated_value_max > 0) {
                const estimatedValueCondition = { ...baseCondition };
                if (market.estimated_value_min > 0) estimatedValueCondition.estimated_value_min = market.estimated_value_min;
                if (market.estimated_value_max > 0) estimatedValueCondition.estimated_value_max = market.estimated_value_max;
                criteriaGroups.push(estimatedValueCondition);
            }

            // Add year built constraints with OR logic for missing data
            if (market.year_built_min > 0 || market.year_built_max > 0) {
                const yearBuiltCondition = { ...baseCondition };
                if (market.year_built_min > 0) yearBuiltCondition.year_built_min = market.year_built_min;
                if (market.year_built_max > 0) yearBuiltCondition.year_built_max = market.year_built_max;
                criteriaGroups.push(yearBuiltCondition);
            }

            // If we have multiple criteria groups, use OR logic
            if (criteriaGroups.length > 0) {
                // Always include the base condition for properties with missing data
                orConditions.push(baseCondition);
                orConditions.push(...criteriaGroups);
                
                // Use OR logic via the external API
                searchPayload.or = orConditions;
            } else {
                // No specific criteria set, just use base location filters
                Object.assign(searchPayload, baseCondition);
            }

            console.log('🔍 Checking property count for market:', searchPayload);

            const response = await fetch('/api/realestateapi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchPayload),
            });

            if (!response.ok) {
                console.error('❌ Failed to check property count', response.status, response.statusText);
                return { count: 0, propertyIds: [] };
            }

            const data = await response.json();
            console.log('📊 API Response for count check:', {
                resultCount: data.resultCount,
                recordCount: data.recordCount,
                dataLength: data.data?.length,
                idsLength: data.ids?.length
            });
            
            // Try different count fields that might be returned
            const count = data.resultCount || data.recordCount || data.totalCount || data.data?.length || 0;
            
            // Extract property IDs for caching
            const propertyIds = data.ids || data.data || [];
            
            console.log(`📊 Found ${count} properties for market, cached ${propertyIds.length} IDs`);
            return { count, propertyIds };
        } catch (error) {
            console.error('❌ Error checking property count:', error);
            return { count: 0, propertyIds: [] };
        }
    };

    const saveMarket = async (marketId: string) => {
        if (!user || !supabase) return;

        setSavingMarkets(prev => new Set(prev).add(marketId));

        try {
            // First, check property count for this market
            const market = buyBoxData.target_markets.find(m => m.id === marketId);
            if (!market) {
                setErrorMessage("Market not found");
                return;
            }

            console.log('🔍 Checking property count before saving market...');
            const { count: propertyCount, propertyIds } = await checkPropertyCount(market);

            // Generate hash of current criteria for cache validation
            const criteriaHash = generateCriteriaHash(market);

            // Update market with property count
            const updatedMarkets = buyBoxData.target_markets.map(m =>
                m.id === marketId 
                    ? { ...m, propertyCount, propertyCountChecked: true } 
                    : m
            );

            // Update local state with property count
            setBuyBoxData(prev => ({
                ...prev,
                target_markets: updatedMarkets
            }));

            // Save to database with cached property IDs
            const { error } = await supabase
                .from("user_buy_box_preferences")
                .upsert({
                    user_id: user.id,
                    target_markets: updatedMarkets,
                    weekly_recommendations_enabled: buyBoxData.weekly_recommendations_enabled,
                    cached_property_ids: propertyIds,
                    cache_updated_at: new Date().toISOString(),
                    cache_criteria_hash: criteriaHash,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: "user_id"
                });

            if (error) {
                console.error("Error saving market:", error);
                
                // Check if it's a table not found error
                if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                    setErrorMessage("Buy Box feature is not set up yet. Please contact support to enable this feature.");
                } else {
                    setErrorMessage(`Failed to save market: ${error.message || error.details || 'Please try again'}`);
                }
            } else {
                // Collapse the market after successful save
                setBuyBoxData(prev => ({
                    ...prev,
                    target_markets: prev.target_markets.map(market =>
                        market.id === marketId ? { ...market, isExpanded: false } : market
                    )
                }));
                
                // Show success message with property count info
                if (propertyCount === 0) {
                    setSuccessMessage("Market saved! ⚠️ No properties found - consider relaxing your criteria.");
                } else if (propertyCount <= 100) {
                    setSuccessMessage(`Market saved! ⚠️ ${propertyCount} properties found - consider expanding your criteria for more variety.`);
                } else if (propertyCount <= 500) {
                    setSuccessMessage(`Market saved! ✅ ${propertyCount.toLocaleString()} properties found - excellent criteria range!`);
                } else {
                    setSuccessMessage(`Market saved! 📈 ${propertyCount.toLocaleString()} properties found - great market with lots of options!`);
                }
                
                setTimeout(() => setSuccessMessage(""), 4000);
            }
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

    if (isAuthLoading || isLoadingAccess || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading My Buy Box...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect to login
    }

    // Show upgrade screen if no access
    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md mx-auto text-center p-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 hover:text-gray-800 mb-8 transition-colors mx-auto"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back
                    </button>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                        <Star size={48} className="mx-auto mb-4 text-gray-400" />
                        
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Upgrade Required
                        </h2>
                        
                        <p className="text-gray-600 mb-2">
                            My Buy Box is available for Pro and Cohort members.
                        </p>
                        
                        <p className="text-gray-600 mb-6">
                            Upgrade your account to set investment criteria and receive weekly property recommendations.
                        </p>

                        <button
                            onClick={() => router.push("/pricing")}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                        >
                            View Pricing
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back
                    </button>

                    <div className="flex items-center mb-2">
                        <Home size={24} className="mr-3 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900">My Buy Box</h1>
                    </div>
                    <p className="text-gray-600">Set your investment criteria to receive personalized weekly property recommendations.</p>
                </div>

                {/* Messages */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                        {successMessage}
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                        {errorMessage}
                    </div>
                )}

                {/* My Buy Box Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* Target Markets */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Target Markets (up to 5)
                            </label>
                            <button
                                onClick={addMarket}
                                disabled={buyBoxData.target_markets.length >= 5}
                                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={16} className="mr-1" />
                                Add Market
                            </button>
                        </div>

                        {buyBoxData.target_markets.length === 0 && (
                            <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                                No markets added yet. Click "Add Market" to get started.
                            </div>
                        )}

                        <div className="space-y-4">
                            {buyBoxData.target_markets.map((market, index) => {
                                const isSavingThis = savingMarkets.has(market.id);
                                const isExpanded = market.isExpanded !== false; // Default to expanded
                                
                                return (
                                    <div key={market.id} className="border border-gray-200 rounded-lg">
                                        <div 
                                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={() => toggleMarketExpansion(market.id)}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-medium text-gray-900">Market {index + 1}</h3>
                                                {market.propertyCountChecked && (
                                                    <span 
                                                        className={`text-xs px-2 py-1 rounded-full ${
                                                            market.propertyCount! <= 50 
                                                                ? 'bg-red-100 text-red-800' 
                                                                : market.propertyCount! <= 100 
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : market.propertyCount! <= 500
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-blue-100 text-blue-800'
                                                        }`}
                                                        title={
                                                            market.propertyCount! <= 50 
                                                                ? 'Very restrictive criteria - consider expanding'
                                                                : market.propertyCount! <= 100 
                                                                ? 'Somewhat targeted - good range'
                                                                : market.propertyCount! <= 500
                                                                ? 'Good balance - plenty of options'
                                                                : 'Very broad - might want to tighten criteria'
                                                        }
                                                    >
                                                        {market.propertyCount?.toLocaleString()} properties
                                                    </span>
                                                )}
                                                <span className={`transform transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}>
                                                    ▼
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {isExpanded && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                saveMarket(market.id);
                                                            }}
                                                            disabled={isSavingThis}
                                                            className="flex items-center px-3 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                                                        >
                                                            <Save size={14} className="mr-1" />
                                                            {isSavingThis ? 'Saving...' : 'Save'}
                                                        </button>
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
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-gray-100">
                                                {/* Market Type Selection */}
                                                <div className="mb-4 mt-4">
                                                    <div className="flex items-center space-x-4 mb-3">
                                                        <label className="flex items-center">
                                                            <input
                                                                type="radio"
                                                                value="city"
                                                                checked={market.type === 'city'}
                                                                onChange={() => updateMarket(market.id, { type: 'city', zip: '' })}
                                                                className="mr-2"
                                                            />
                                                            City/State
                                                        </label>
                                                        <label className="flex items-center">
                                                            <input
                                                                type="radio"
                                                                value="zip"
                                                                checked={market.type === 'zip'}
                                                                onChange={() => updateMarket(market.id, { type: 'zip', city: '', state: '' })}
                                                                className="mr-2"
                                                            />
                                                            ZIP Code(s)
                                                        </label>
                                                    </div>

                                                    {/* City/State Inputs */}
                                                    {market.type === 'city' && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <input
                                                                type="text"
                                                                placeholder="City"
                                                                value={market.city || ''}
                                                                onChange={(e) => updateMarket(market.id, { city: capitalizeWords(e.target.value) })}
                                                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                            <input
                                                                type="text"
                                                                maxLength={2}
                                                                placeholder="State"
                                                                value={market.state || ''}
                                                                onChange={(e) => updateMarket(market.id, { state: e.target.value.toUpperCase() })}
                                                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center uppercase"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Zip Codes Input */}
                                                    {market.type === 'zip' && (
                                                        <input
                                                            type="text"
                                                            placeholder="Zip codes (comma-separated: 02840,02841,02842)"
                                                            value={market.zip || ''}
                                                            onChange={(e) => updateMarket(market.id, { zip: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <span className="text-gray-500">to</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={market.units_max || ''}
                                                                placeholder="Max"
                                                                onChange={(e) => updateMarket(market.id, { units_max: parseInt(e.target.value) || 0 })}
                                                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <span className="text-gray-500">to</span>
                                                            <input
                                                                type="number"
                                                                min="1800"
                                                                max={new Date().getFullYear()}
                                                                value={market.year_built_max || ''}
                                                                placeholder="Max"
                                                                onChange={(e) => updateMarket(market.id, { year_built_max: parseInt(e.target.value) || 0 })}
                                                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <span className="text-gray-500">to</span>
                                                            <input
                                                                type="text"
                                                                value={formatCurrency(market.assessed_value_max)}
                                                                placeholder="Max value"
                                                                onChange={(e) => updateMarket(market.id, { assessed_value_max: parseCurrency(e.target.value) })}
                                                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <span className="text-gray-500">to</span>
                                                            <input
                                                                type="text"
                                                                value={formatCurrency(market.estimated_value_max)}
                                                                placeholder="Max value"
                                                                onChange={(e) => updateMarket(market.id, { estimated_value_max: parseCurrency(e.target.value) })}
                                                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
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
                                onChange={(e) => setBuyBoxData(prev => ({ ...prev, weekly_recommendations_enabled: e.target.checked }))}
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div>
                                <span className="text-sm font-medium text-gray-900">Enable weekly property recommendations</span>
                                <p className="text-xs text-gray-500 mt-1">
                                    Get 3 curated properties per market every Monday, delivered right to your home page!
                                </p>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}