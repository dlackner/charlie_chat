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
        tooltip: 'Finds out-of-state owners who have owned for 10+ years with high equity ($500k+)',
        filters: [
            'Out-of-state owners',
            '10+ years owned',
            'High equity ($500k+)'
        ],
        apiFields: {
            out_of_state_owner: true,
            years_owned_min: 10,
            estimated_equity_min: 500000
        },
        unitsConfig: { min: 2, max: '' }
    },
    'distressed-assets': {
        id: 'distressed-assets',
        icon: '>',
        title: 'Distressed Assets',
        tooltip: 'Properties in financial distress: pre-foreclosure, tax liens, REO, or auction',
        filters: [
            'Pre-foreclosure',
            'Tax liens',
            'REO properties',
            'Auction properties'
        ],
        apiFields: {
            pre_foreclosure: true,
            tax_lien: true,
            reo: true,
            auction: true
        },
        unitsConfig: { min: 2, max: '' }
    },
    'value-add-deals': {
        id: 'value-add-deals',
        icon: '>',
        title: 'Value-Add Deals',
        tooltip: 'Properties built 1970-1995 with out-of-state, non-corporate owners',
        filters: [
            'Built 1970-1995',
            'Absentee owners',
            'Non-corporate owned'
        ],
        apiFields: {
            year_built_min: 1970,
            year_built_max: 1995,
            out_of_state_owner: true,
            corporate_owned: false
        },
        unitsConfig: { min: 2, max: 50 }
    },
    'private-lender-deals': {
        id: 'private-lender-deals',
        icon: '>',
        title: 'Private Lender Deals',
        tooltip: 'Properties with private financing, out-of-state owners, and high equity ($200k+)',
        filters: [
            'Private financing',
            'Recent sales (2-7 years)',
            'High equity ($200k+)',
            'Absentee owners'
        ],
        apiFields: {
            private_lender: true,
            estimated_equity_min: 200000,
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

        // Reset all filters first before applying the smart query
        resetFilters();

        setActiveSmartQuery(queryId);


        const { apiFields } = query;

        setShowSmartQueries(false);

        // Clear selected listings before starting new search
        if (clearSelectedListings) {
            clearSelectedListings();
        }

        // Build filter parameters directly from the smart query configuration
        const filterParams: Record<string, any> = {};

        // Only add max units if specified in the query
        if (query.unitsConfig.max && query.unitsConfig.max !== '') {
            filterParams.units_max = query.unitsConfig.max;
        }
        // Add API field mappings to filterParams

        if (apiFields.out_of_state_owner) {
            filterParams.out_of_state_owner = true;
        }
        if (apiFields.corporate_owned === false) {
            filterParams.corporate_owned = 'false';
        }
        if (apiFields.corporate_owned === true) {
            filterParams.corporate_owned = 'true';
        }
        if (apiFields.private_lender) {
            filterParams.private_lender = 'true';
        }
        if (apiFields.pre_foreclosure) {
            filterParams.pre_foreclosure = 'true';
        }
        if (apiFields.tax_lien) {
            filterParams.tax_lien = 'true';
        }
        if (apiFields.reo) {
            filterParams.reo = 'true';
        }
        if (apiFields.auction) {
            filterParams.auction = 'true';
        }
        if (apiFields.years_owned_min) {
            filterParams.years_owned_min = apiFields.years_owned_min;
        }
        if (apiFields.estimated_equity_min) {
            filterParams.estimated_equity_min = apiFields.estimated_equity_min;
        }
        if (apiFields.year_built_min && apiFields.year_built_max) {
            filterParams.year_built_min = apiFields.year_built_min;
            filterParams.year_built_max = apiFields.year_built_max;
        }

        // Pass the filters directly to handleSearch
        handleSearch(filterParams);
    };

    const clearSmartQueryFilters = () => {
        setActiveSmartQuery(null);
        resetFilters();
    };

    return (
        <div className="space-y-2">
            <button
                onClick={() => setShowSmartQueries(!showSmartQueries)}
                className="w-48 py-2 px-4 text-white rounded-lg transition text-sm flex items-center justify-between hover:opacity-80"
                style={{ backgroundColor: '#1C599F' }}
            >
                <span>Charlie's Picks</span>
                {showSmartQueries ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSmartQueries && (
                <div className="space-y-1 pl-2">
                    {Object.values(smartQueries).map((query) => (
                        <button
                            key={query.id}
                            onClick={() => applySmartQuery(query.id)}
                            title={query.tooltip}
                            className="w-full text-left text-sm text-gray-600 cursor-pointer"
                        >
                            {query.icon} {query.title}
                        </button>
                    ))}
                </div>
            )}


        </div>
    );
};