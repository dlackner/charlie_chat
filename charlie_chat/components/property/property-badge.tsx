// property-badge.tsx
import React from 'react';
import { PropertyClassification } from './property-classifier';

interface PropertyBadgeProps {
    classification: PropertyClassification;
    size?: 'sm' | 'md';
    totalCount?: number; // Total number of classifications for this property
}

// Tooltip content for each classification type
const getTooltipText = (type: PropertyClassification['type']): string => {
    const tooltips = {
        'motivated-seller': 'Out-of-state or absentee owner for 5+ years',
        'distressed': 'Pre-foreclosure, foreclosure, tax liens, or auction',
        'value-add': 'Built before 1980 with renovation potential',
        'comps':  'Arms-length sale in the past year - good market intel',
        'high-equity': '40%+ estimated equity in the property',
        'cash-flow': '8%+ annual rent-to-value ratio',
        'seller-financing': 'Assumable mortgage or high-equity absentee owner',
        'private-lender': 'Currently has private/non-bank financing'
    };

    return tooltips[type];
};

export const PropertyBadge: React.FC<PropertyBadgeProps> = ({
    classification,
    size = 'sm',
    totalCount = 1
}) => {
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm'
    };

    const additionalCount = totalCount > 1 ? totalCount - 1 : 0;

    return (
        <span
            className={`inline-flex items-center rounded-full font-medium cursor-help ${sizeClasses[size]} relative group`}
            style={{
                color: classification.color,
                backgroundColor: classification.bgColor,
                border: `1px solid ${classification.color}20`
            }}
        //title={getTooltipText(classification.type)}
        >
            {classification.label}
            {additionalCount > 0 && (
                <span className="ml-1">
                    ...
                </span>
            )}

            {/* Custom tooltip */}
            <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-lg"
                style={{ transform: 'translateX(-60%) translateY(-2px)' }}>
                {getTooltipText(classification.type)}
                {additionalCount > 0 && ` (${totalCount} classes)`}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
        </span>
    );
};