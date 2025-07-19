import React, { useState } from 'react';
import {
    QuadrantType,
    getQuadrantInfo,
    calculateMatrixPosition,
    // determineQuadrant,
    calculatePropertyAge,
    getPropertyValue,
    calculateValuePerUnit,
    formatCurrency
} from './matrixCalculations';
import { PropertyModal } from './PropertyModal';
import { CoreSavedProperty as SavedProperty } from '../types';

interface MatrixViewProps {
    properties: SavedProperty[];
    selectedProperties: Set<string>;
    onToggleSelection: (propertyId: string) => void;
    onRemoveFromFavorites: (propertyId: string) => void;
    onUpdateNotes?: (propertyId: string, notes: string) => void;
    onSkipTrace?: (propertyId: string, property: SavedProperty) => void;
    selectionMode: 'analysis' | 'selection';
    className?: string;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
    properties,
    selectedProperties,
    onToggleSelection,
    onRemoveFromFavorites,
    onUpdateNotes,
    onSkipTrace,
    selectionMode,
    className = ''
}) => {

    // Modal state management
    const [selectedProperty, setSelectedProperty] = useState<SavedProperty | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Use real properties data
    const testProperties = properties;

    console.log('Matrix data check:', {
        totalProperties: testProperties.length,
        sampleProperty: testProperties[0],
        hasAssessedValue: testProperties.filter(p => p.assessed_value && p.assessed_value > 0).length,
        hasYearBuilt: testProperties.filter(p => p.year_built).length
    });

    // Filter properties with complete required data (value and year_built)
    const completeProperties = testProperties.filter(p =>
        (p.assessed_value > 0 || p.estimated_value > 0) &&
        p.year_built &&
        p.year_built > 0 &&
        p.units_count &&
        p.units_count > 0
    );

    // Properties missing required data
    const incompleteProperties = testProperties.filter(p =>
        (!p.assessed_value && !p.estimated_value) ||
        (p.assessed_value === 0 && p.estimated_value === 0) ||
        !p.year_built ||
        p.year_built === 0 ||
        !p.units_count ||
        p.units_count === 0
    );

    // DYNAMIC Y-AXIS: Filter out selected properties in selection mode for axis calculation
    const propertiesForAxisCalculation = completeProperties.filter(p => !selectedProperties.has(p.property_id));

    // Calculate value range for Y-axis labels based on VISIBLE properties only
    const propertyValues = propertiesForAxisCalculation.map(p => getPropertyValue(p)).filter(v => v > 0).sort((a, b) => a - b);
    const minValue = propertyValues.length > 0 ? propertyValues[0] : 0;
    const actualMaxValue = propertyValues.length > 0 ? Math.max(...propertyValues) : 1000000;
    const maxValue = actualMaxValue * 1.1;
    const valueRange = maxValue - minValue;

    // Calculate positions for complete properties (SIMPLIFIED - no quadrant determination needed)
    const matrixProperties = completeProperties
        .filter(property => !selectedProperties.has(property.property_id))
        .map(property => ({
            ...property,
            // Use the VISIBLE properties for position calculation to get accurate scaling
            position: calculateMatrixPosition(property, propertiesForAxisCalculation),
            propertyValue: getPropertyValue(property),
            valuePerUnit: calculateValuePerUnit(property),
            propertyAge: calculatePropertyAge(property.year_built)
        }));

    // Count properties by visual position in quadrants (simplified)
    const quadrantCounts = {
        GOLDMINES: matrixProperties.filter(p => p.position.x >= 50 && p.position.y >= 67).length,
        FIXERS: matrixProperties.filter(p => p.position.x >= 50 && p.position.y <= 33).length,
        SLEEPERS: matrixProperties.filter(p => p.position.x <= 50 && p.position.y >= 67).length,
        AVOID: matrixProperties.filter(p => p.position.x <= 50 && p.position.y <= 33).length,
        MIDDLE: matrixProperties.filter(p => p.position.y > 33 && p.position.y < 67).length,
    };

    // Calculate clean axis values for Y-axis labels - MOVED HERE!
    // Add safety checks to prevent NaN values
    const safeMaxValue = maxValue && !isNaN(maxValue) ? maxValue : 1000000;
    const safeMinValue = minValue && !isNaN(minValue) ? minValue : 0;

    const maxInMillions = Math.ceil(safeMaxValue / 1000000);
    const minInMillions = Math.floor(safeMinValue / 1000000);
    const cleanMaxValue = maxInMillions * 1000000;
    const cleanMinValue = minInMillions * 1000000;
    const cleanRange = cleanMaxValue - cleanMinValue;

    // Handle property click - opens modal
    const handlePropertyClick = (propertyId: string) => {
        console.log('Property clicked:', propertyId);
        const property = testProperties.find(p => p.property_id === propertyId);
        if (property) {
            setSelectedProperty(property);
            setIsModalOpen(true);
        }
    };

    // Handle modal close
    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedProperty(null);
    };

    const handlePropertyDotClick = (propertyId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        console.log('Property dot clicked:', propertyId);
        const property = testProperties.find(p => p.property_id === propertyId);
        if (property) {
            setSelectedProperty(property);
            setIsModalOpen(true);
        }
    };

    const handleMissingPropertyClick = (propertyId: string) => {
        handlePropertyClick(propertyId);
    };

    return (
        <>
            <div className={`w-full h-full bg-white ${className}`}>
                <div className="flex flex-col h-full">

                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Deal Quality Matrix</h2>
                        <p className="text-gray-600">
                            Properties positioned by Property Age vs Assessed Value ({matrixProperties.length} plotted)
                            {selectionMode === 'selection' && selectedProperties.size > 0 && (
                                <span className="text-blue-600"> • {selectedProperties.size} hidden for analysis</span>
                            )}
                        </p>
                    </div>

                    {/* Main Matrix Area */}
                    <div className="flex-1 flex">
                        <div className="flex-1 relative">

                            {/* Y-Axis Label */}
                            <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 -rotate-90">
                                <span className="text-sm font-medium text-gray-700">Assessed Value</span>
                            </div>

                            {/* Matrix Grid - Fixed width */}
                            <div className="relative mx-auto border-2 border-gray-300" style={{ width: '1000px', height: '320px' }}>

                                {/* Grid Lines */}
                                <div className="absolute inset-0">
                                    {/* Vertical lines */}
                                    <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gray-200"></div>
                                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-600"></div>
                                    <div className="absolute left-3/4 top-0 bottom-0 w-px bg-gray-200"></div>

                                    {/* Horizontal lines */}
                                    <div className="absolute top-1/4 left-0 right-0 h-px bg-gray-200"></div>
                                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-600"></div>
                                    <div className="absolute top-3/4 left-0 right-0 h-px bg-gray-200"></div>
                                </div>

                                {/* Quadrant Backgrounds - Updated for Value/Age */}
                                {/* SLEEPERS: Top-left (new, high value) */}
                                <div className="absolute opacity-15"
                                    style={{
                                        left: '0%',
                                        top: '0%',
                                        width: '25%',
                                        height: '33%',
                                        backgroundColor: getQuadrantInfo('SLEEPERS').color
                                    }}></div>

                                {/* GOLDMINES: Top-right (old, high value) */}
                                <div className="absolute opacity-15"
                                    style={{
                                        left: '50%',
                                        top: '0%',
                                        width: '50%',
                                        height: '33%',
                                        backgroundColor: getQuadrantInfo('GOLDMINES').color
                                    }}></div>

                                {/* MIDDLE ZONE: Full width middle band (all ages, medium value) */}
                                <div className="absolute opacity-5"
                                    style={{
                                        left: '0%',
                                        top: '33%',
                                        width: '100%',
                                        height: '34%',
                                        backgroundColor: getQuadrantInfo('MIDDLE').color
                                    }}></div>

                                {/* AVOID: Bottom-left (new, low value) */}
                                <div className="absolute opacity-15"
                                    style={{
                                        left: '0%',
                                        top: '67%',
                                        width: '25%',
                                        height: '33%',
                                        backgroundColor: getQuadrantInfo('AVOID').color
                                    }}></div>

                                {/* FIXERS: Bottom-right (old, low value) */}
                                <div className="absolute opacity-15"
                                    style={{
                                        left: '50%',
                                        top: '67%',
                                        width: '50%',
                                        height: '33%',
                                        backgroundColor: getQuadrantInfo('FIXERS').color
                                    }}></div>

                                {/* MIDDLE TRANSITION ZONES: Fill the 25-50% age gaps */}
                                {/* Top middle transition (medium age, high value) */}
                                <div className="absolute opacity-7"
                                    style={{
                                        left: '25%',
                                        top: '0%',
                                        width: '25%',
                                        height: '33%',
                                        backgroundColor: getQuadrantInfo('MIDDLE').color
                                    }}></div>

                                {/* Bottom middle transition (medium age, low value) */}
                                <div className="absolute opacity-7"
                                    style={{
                                        left: '25%',
                                        top: '67%',
                                        width: '25%',
                                        height: '33%',
                                        backgroundColor: getQuadrantInfo('MIDDLE').color
                                    }}></div>

                                {/* Property Dots - All Light Grey with Dynamic Sizing */}
                                <div className="absolute inset-0">
                                    {(() => {
                                        // Calculate dynamic dot sizing based on visible properties
                                        const valuePerUnits = matrixProperties
                                            .map(p => p.valuePerUnit)
                                            .filter(v => v > 0)
                                            .sort((a, b) => a - b);

                                        const minValuePerUnit = valuePerUnits[0] || 0;
                                        const maxValuePerUnit = valuePerUnits[valuePerUnits.length - 1] || 100000;

                                        // Define min and max dot sizes
                                        const minDotSize = 16;
                                        const maxDotSize = 40;

                                        const calculateDynamicDotSize = (valuePerUnit: number) => {
                                            if (!valuePerUnit || valuePerUnit === 0 || maxValuePerUnit === minValuePerUnit) {
                                                return 24; // Default size if no value or all values same
                                            }

                                            // Scale linearly between min and max dot sizes
                                            const ratio = (valuePerUnit - minValuePerUnit) / (maxValuePerUnit - minValuePerUnit);
                                            return Math.round(minDotSize + (ratio * (maxDotSize - minDotSize)));
                                        };

                                        return matrixProperties.map(property => {
                                            const dotSize = calculateDynamicDotSize(property.valuePerUnit);

                                            return (
                                                <div
                                                    key={property.property_id}
                                                    className="absolute rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform shadow-sm"
                                                    style={{
                                                        width: `${dotSize}px`,
                                                        height: `${dotSize}px`,
                                                        left: `${property.position.x}%`,
                                                        bottom: `${property.position.y}%`,
                                                        backgroundColor: '#d1d5db', // Always light grey
                                                        border: '2px solid white', // White border for contrast
                                                        opacity: 1 // Normal opacity
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePropertyDotClick(property.property_id, e);
                                                    }}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        onToggleSelection(property.property_id);
                                                    }}
                                                    title={`${property.address_full} - ${formatCurrency(property.propertyValue)}, ${property.propertyAge} years old, ${formatCurrency(property.valuePerUnit)}/unit • Right-click to remove`}
                                                />
                                            );
                                        });
                                    })()}
                                </div>

                                {/* Y-Axis Labels - Now Dynamic based on visible properties */}
                                <div className="absolute -left-20 top-0 text-xs text-gray-600 font-medium">
                                    {formatCurrency(cleanMaxValue)}
                                </div>
                                <div className="absolute -left-20 top-1/4 text-xs text-gray-600">
                                    {formatCurrency(cleanMinValue + (cleanRange * 0.75))}
                                </div>
                                <div className="absolute -left-20 top-1/2 text-xs text-gray-600">
                                    {formatCurrency(cleanMinValue + (cleanRange * 0.5))}
                                </div>
                                <div className="absolute -left-20 top-3/4 text-xs text-gray-600">
                                    {formatCurrency(cleanMinValue + (cleanRange * 0.25))}
                                </div>
                                <div className="absolute -left-20 bottom-0 text-xs text-gray-600 font-medium">
                                    {formatCurrency(cleanMinValue)}
                                </div>

                                {/* X-Axis Labels */}
                                <div className="absolute -bottom-6 left-0 text-xs text-gray-600 font-medium">0y</div>
                                <div className="absolute -bottom-6 left-1/4 text-xs text-gray-600">25y</div>
                                <div className="absolute -bottom-6 left-1/2 text-xs text-gray-600">50y</div>
                                <div className="absolute -bottom-6 right-0 text-xs text-gray-600 font-medium">100y+</div>

                                {/* Quadrant Labels */}
                                <div className="absolute top-2 left-2 text-sm font-medium text-blue-700 flex items-center">
                                    <span className="mr-1">{getQuadrantInfo('SLEEPERS').emoji}</span>
                                    <span>{getQuadrantInfo('SLEEPERS').name}</span>
                                </div>

                                <div className="absolute top-2 right-2 text-sm font-medium text-green-700 flex items-center">
                                    <span className="mr-1">{getQuadrantInfo('GOLDMINES').emoji}</span>
                                    <span>{getQuadrantInfo('GOLDMINES').name}</span>
                                </div>

                                <div className="absolute bottom-2 left-2 text-sm font-medium text-red-700 flex items-center">
                                    <span className="mr-1">{getQuadrantInfo('AVOID').emoji}</span>
                                    <span>{getQuadrantInfo('AVOID').name}</span>
                                </div>

                                <div className="absolute bottom-2 right-2 text-sm font-medium text-orange-700 flex items-center">
                                    <span className="mr-1">{getQuadrantInfo('FIXERS').emoji}</span>
                                    <span>{getQuadrantInfo('FIXERS').name}</span>
                                </div>

                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-medium text-purple-700 flex items-center">
                                    <span className="mr-1">{getQuadrantInfo('MIDDLE').emoji}</span>
                                    <span>{getQuadrantInfo('MIDDLE').name}</span>
                                </div>
                            </div>

                            {/* X-Axis Label */}
                            <div className="text-center mt-4">
                                <span className="text-sm font-medium text-gray-700">Property Age (Years)</span>
                            </div>
                        </div>
                    </div>

                    {/* Legend & Missing Data */}
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Quadrant Legend */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Investment Quadrants</h3>
                            <div className="space-y-2">
                                {(['GOLDMINES', 'FIXERS', 'SLEEPERS', 'AVOID', 'MIDDLE'] as QuadrantType[]).map(quadrant => {
                                    const info = getQuadrantInfo(quadrant);
                                    const count = quadrantCounts[quadrant] || 0;
                                    return (
                                        <div key={quadrant} className="flex items-center space-x-3">
                                            {/*<div
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: info.color }}
                                            ></div>*/}
                                            <span className="text-lg">{info.emoji}</span>
                                            <div className="flex-1">
                                                <span className="font-medium text-gray-900">{info.name}</span>
                                                <span className="text-sm text-gray-600 ml-2">({info.description})</span>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                                {count} {count === 1 ? 'property' : 'properties'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Missing Data Section */}
                        <div className="bg-yellow-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                <span className="mr-2">⚠️</span>
                                Missing Required Data ({incompleteProperties.length})
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                Properties without value, year built, or unit count cannot be positioned on the matrix.
                            </p>

                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {incompleteProperties.length === 0 ? (
                                    <div className="text-sm text-gray-500 italic">
                                        All properties have complete data
                                    </div>
                                ) : (
                                    incompleteProperties.map(property => (
                                        <div
                                            key={property.property_id}
                                            className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-gray-50"
                                            onClick={() => handleMissingPropertyClick(property.property_id)}
                                        >
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {property.address_full}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {property.address_city}, {property.address_state}
                                                </div>
                                            </div>
                                            <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white"></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Property Modal */}
            <PropertyModal
                isOpen={isModalOpen}
                property={selectedProperty}
                selectedProperties={selectedProperties}
                onClose={handleModalClose}
                onToggleSelection={onToggleSelection}
                onRemoveFromFavorites={onRemoveFromFavorites}
                onUpdateNotes={onUpdateNotes}
                onSkipTrace={onSkipTrace}
                hideActions={true}
            />
        </>
    );
};