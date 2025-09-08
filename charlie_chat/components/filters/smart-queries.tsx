// components/filters/smart-queries.tsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SmartQuery {
    id: string;
    icon: string;
    title: string;
    tooltip: string;
    filters: string[];
    apiFields: {
        out_of_state_owner?: boolean;
        estimated_equity_min?: number;
        estimated_value_min?: number;
        pre_foreclosure?: boolean;
        tax_lien?: boolean;
        reo?: boolean;
        auction?: boolean;
        years_owned_min?: number;
        years_owned_max?: number;
        last_sale_arms_length?: boolean;
        year_built_min?: number;
        year_built_max?: number;
        corporate_owned?: boolean;
        private_lender?: boolean;
        or?: { [key: string]: boolean }[];
    };
}

interface SmartQueriesProps {
    // Current unit state
    minUnits: number | string;
    maxUnits: number | string;

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
    setArmsLength: (value: string) => void;
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
        }
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
        }
    },
    'high-cash-flow': {
        id: 'high-cash-flow',
        icon: '>',
        title: 'High Cash Flow Properties',
        tooltip: 'Multi-family properties with strong rental income potential (8-50 units, 1980-2015)',
        filters: ['8-50 units', 'Built 1980-2015', 'Strong cash flow'],
        apiFields: {
            year_built_min: 1980,
            year_built_max: 2015
        }
    },
    'fix-and-flip': {
        id: 'fix-and-flip',
        icon: '>',
        title: 'Fix & Flip Opportunities',
        tooltip: 'Distressed properties with renovation potential (1-4 units, 1950-1990)',
        filters: ['1-4 units', 'Built 1950-1990', 'Distressed properties'],
        apiFields: {
            year_built_min: 1950,
            year_built_max: 1990,
            or: [
                { pre_foreclosure: true },
                { tax_lien: true },
                { reo: true },
                { auction: true }
            ]
        }
    },
    'new-construction': {
        id: 'new-construction',
        icon: '>',
        title: 'New Construction',
        tooltip: 'Recently built properties with modern amenities (2010-2024)',
        filters: ['Built 2010-2024', 'Modern amenities', 'New construction'],
        apiFields: {
            year_built_min: 2010,
            year_built_max: 2024
        }
    },
    'luxury-properties': {
        id: 'luxury-properties',
        icon: '>',
        title: 'Luxury Properties',
        tooltip: 'High-end properties in premium locations ($1M+ value, built 1995+)',
        filters: ['$1M+ value', 'Built 1995+', 'Premium locations'],
        apiFields: {
            year_built_min: 1995,
            estimated_value_min: 1000000
        }
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
        }
    }
};

export const SmartQueries: React.FC<SmartQueriesProps> = ({
    minUnits,
    maxUnits,
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
    setArmsLength,
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
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSmartQueries(false);
            }
        };

        if (showSmartQueries) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSmartQueries]);

    // Close dropdown on Escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowSmartQueries(false);
            }
        };

        if (showSmartQueries) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showSmartQueries]);

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

        // For queries with "or" fields, use compound query structure
        if ('or' in apiFields && Array.isArray(apiFields.or)) {
            const filterParams: Record<string, any> = {
                or: apiFields.or,
                propertyType: "MFR",
                units_min: minUnits || 0,  // Use user's min units
                count: false,
                size: 10,
                resultIndex: 0,
                obfuscate: false,
                summary: false
            };

            // Add other non-"or" fields from apiFields
            Object.keys(apiFields).forEach(key => {
                if (key !== 'or') {
                    filterParams[key] = apiFields[key as keyof typeof apiFields];
                }
            });

            // Add units_max if user has set it
            if (maxUnits && maxUnits !== '') {
                filterParams.units_max = maxUnits;
            }

            console.log(`📦 ${query.title} filterParams:`, filterParams);
            handleSearch(filterParams);
            return;
        }

        // For all other queries, use simple parameter structure
        const filterParams: Record<string, any> = {
            propertyType: "MFR",
            units_min: minUnits || 0,  // Use user's min units
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

        // Add units_max if user has set it
        if (maxUnits && maxUnits !== '') {
            filterParams.units_max = maxUnits;
        }

        console.log(`📦 ${query.title} filterParams:`, filterParams);
        handleSearch(filterParams);
    };

    const clearSmartQueryFilters = () => {
        setActiveSmartQuery(null);
        resetFilters();
    };

    return (
        <div className="relative" ref={dropdownRef}>
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