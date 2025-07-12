// components/filters/smart-queries.tsx

import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SmartQuery {
    id: string;
    icon: string;
    title: string;
    tooltip: string;
    filters: string[];
    apiFields: {
        out_of_state_owner?: boolean;
        years_owned_min?: number;
        estimated_equity_min?: number;
        pre_foreclosure?: boolean;
        tax_lien?: boolean;
        reo?: boolean;
        auction?: boolean;
        year_built_min?: number;
        year_built_max?: number;
        corporate_owned?: boolean;
        private_lender?: boolean;
        or?: { [key: string]: boolean }[];
    };
    unitsConfig: { min: number | string; max: number | string };
}

interface SmartQueriesProps {
    // Unit range setters
    setMinUnits: (value: number | string) => void;
    setMaxUnits: (value: number | string) => void;

    // Filter state setters
    setOwnerLocation: (value: "any" | "instate" | "outofstate") => void;
    setCorporateOwned: (value: string) => void;
    setPrivateLender: (value: string) => void;
    setPreForeclosure: (value: string) => void;
    setTaxLien: (value: string) => void;
    setReo: (value: string) => void;
    setAuction: (value: string) => void;
    setYearsOwnedRange: (value: [number, number]) => void;
    setEstimatedEquityRange: (value: [number, number]) => void;
    setYearBuiltRange: (value: [number, number]) => void;

    // Current state for active query tracking
    yearsOwnedRange: [number, number];
    estimatedEquityRange: [number, number];

    // Search handler
    handleSearch: (filters: Record<string, any>) => void;

    // Clear selections when starting new search
    clearSelectedListings?: () => void;

    // Reset function
    resetFilters: () => void;
}

const smartQueries: Record<string, SmartQuery> = {
    'motivated-sellers': {
        id: 'motivated-sellers',
        icon: '>',
        title: 'Motivated Sellers',
        tooltip: 'Out-of-state owners who have owned 10+ years - likely motivated to sell',
        filters: ['Out-of-state owners', '10+ years owned', 'Likely motivated to sell'],
        apiFields: {
            out_of_state_owner: true,
            years_owned_min: 10
        },
        unitsConfig: { min: 2, max: '' }
    },
    'distressed-assets': {
        id: 'distressed-assets',
        icon: '>',
        title: 'Distressed Assets',
        tooltip: 'Properties with legal/financial distress: pre-foreclosure, tax liens, REO, or auction',
        filters: ['Pre-foreclosure', 'Tax liens', 'REO properties', 'Auction properties'],
        apiFields: {
            or: [
                { pre_foreclosure: true },
                { tax_lien: true },
                { reo: true },
                { auction: true }
            ]
        },
        unitsConfig: { min: 2, max: '' }
    },
    'value-add-deals': {
        id: 'value-add-deals',
        icon: '>',
        title: 'Value-Add Deals',
        tooltip: 'Older properties (1970-1995) with absentee owners - likely need updates',
        filters: ['Built 1970-1995', 'Absentee owners', 'Renovation potential'],
        apiFields: {
            year_built_min: 1970,
            year_built_max: 1995,
            out_of_state_owner: true
        },
        unitsConfig: { min: 2, max: 50 }
    },
    'private-lender-deals': {
        id: 'private-lender-deals',
        icon: '>',
        title: 'Private Lender',
        tooltip: 'Properties with private financing and absentee owners',
        filters: ['Private financing', 'Absentee owners', 'Alternative financing'],
        apiFields: {
            private_lender: true,
            out_of_state_owner: true
        },
        unitsConfig: { min: 2, max: '' }
    }
};

export const SmartQueries: React.FC<SmartQueriesProps> = ({
    setMinUnits,
    setMaxUnits,
    setOwnerLocation,
    setCorporateOwned,
    setPrivateLender,
    setPreForeclosure,
    setTaxLien,
    setReo,
    setAuction,
    setYearsOwnedRange,
    setEstimatedEquityRange,
    setYearBuiltRange,
    yearsOwnedRange,
    estimatedEquityRange,
    handleSearch,
    resetFilters,
    clearSelectedListings
}) => {
    const [activeSmartQuery, setActiveSmartQuery] = useState<string | null>(null);
    const [showSmartQueries, setShowSmartQueries] = useState(false);

    const applySmartQuery = (queryId: string) => {
        const query = smartQueries[queryId];
        if (!query) return;

        resetFilters();
        setActiveSmartQuery(queryId);
        setShowSmartQueries(false);

        if (clearSelectedListings) {
            clearSelectedListings();
        }

        const { apiFields } = query;

        // For distressed assets, use compound query structure
        if (queryId === 'distressed-assets' && 'or' in apiFields && Array.isArray(apiFields.or)) {
            const filterParams: Record<string, any> = {
                or: [
                    { pre_foreclosure: true },
                    { tax_lien: true },
                    { reo: true },
                    { auction: true }
                ],
                propertyType: "MFR",
                units_min: query.unitsConfig.min,
                count: false,
                size: 10,
                resultIndex: 0,
                obfuscate: false,
                summary: false
            };

            // Add units_max only if specified
            if (query.unitsConfig.max && query.unitsConfig.max !== '') {
                filterParams.units_max = query.unitsConfig.max;
            }

            console.log("📦 Distressed Assets filterParams:", filterParams);
            handleSearch(filterParams);
            return;
        }

        // For all other queries, use simple parameter structure
        const filterParams: Record<string, any> = {
            propertyType: "MFR",
            units_min: query.unitsConfig.min,
            count: false,
            size: 10,
            resultIndex: 0,
            obfuscate: false,
            summary: false
        };

        // Add regular API fields
        Object.keys(apiFields).forEach(key => {
            if (key !== 'or') {
                filterParams[key] = apiFields[key as keyof typeof apiFields];
            }
        });

        // Add units_max only if specified
        if (query.unitsConfig.max && query.unitsConfig.max !== '') {
            filterParams.units_max = query.unitsConfig.max;
        }

        console.log(`📦 ${query.title} filterParams:`, filterParams);
        handleSearch(filterParams);
    };

    const clearSmartQueryFilters = () => {
        setActiveSmartQuery(null);
        resetFilters();
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowSmartQueries(!showSmartQueries)}
                className="w-40 h-[40px] py-2 px-3 text-white rounded-lg transition text-xs flex items-center justify-between hover:opacity-90 ml-4"
                style={{ backgroundColor: '#1C599F' }}
            >
                <span>Charlie's Picks</span>
                {showSmartQueries ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showSmartQueries && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="space-y-1 p-2">
                        {Object.values(smartQueries).map((query) => (
                            <button
                                key={query.id}
                                onClick={() => applySmartQuery(query.id)}
                                title={query.tooltip}
                                className="w-full text-left text-sm text-gray-600 hover:bg-gray-100 p-2 rounded cursor-pointer"
                            >
                                {query.icon} {query.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};