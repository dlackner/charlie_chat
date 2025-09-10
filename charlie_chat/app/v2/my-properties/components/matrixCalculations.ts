// matrixCalculations.ts - Deal Quality Matrix Logic (Value vs Property Age) - SIMPLIFIED

export interface MatrixPosition {
    x: number; // 0-100 (percentage across X-axis)
    y: number; // 0-100 (percentage up Y-axis)
}

export interface QuadrantInfo {
    name: string;
    emoji: string;
    color: string;
    description: string;
}

export type QuadrantType = 'GOLDMINES' | 'FIXERS' | 'SLEEPERS' | 'AVOID' | 'MIDDLE';

// Property interface (matches your existing SavedProperty)
interface PropertyForMatrix {
    assessed_value: number;
    estimated_value: number;
    year_built: number;
    units_count: number;
}

// ===== PROPERTY VALUE CALCULATIONS =====

export const getPropertyValue = (property: PropertyForMatrix): number => {
    // Use assessed_value as primary, fallback to estimated_value
    return property.assessed_value || property.estimated_value || 0;
};

// ===== PROPERTY AGE CALCULATIONS =====

export const calculatePropertyAge = (yearBuilt: number): number => {
    const currentYear = new Date().getFullYear();
    return Math.max(0, currentYear - yearBuilt);
};

// ===== VALUE PER UNIT CALCULATION =====

export const calculateValuePerUnit = (property: PropertyForMatrix): number => {
    const value = getPropertyValue(property);
    if (!property.units_count || property.units_count === 0) return 0;
    return value / property.units_count;
};

// ===== QUADRANT METADATA (FOR VISUAL ZONES ONLY) =====

export const getQuadrantInfo = (quadrant: QuadrantType): QuadrantInfo => {
    const quadrantMap: Record<QuadrantType, QuadrantInfo> = {
        GOLDMINES: {
            name: 'Goldmines',
            emoji: '',
            color: '#22c55e', // Green background
            description: 'High value, older buildings - Prime established properties'
        },
        FIXERS: {
            name: 'Fixers',
            emoji: '',
            color: '#f97316', // Orange background
            description: 'Low value, older buildings - Value-add opportunities'
        },
        SLEEPERS: {
            name: 'Sleepers',
            emoji: '',
            color: '#3b82f6', // Blue background
            description: 'High value, newer buildings - Premium modern properties'
        },
        AVOID: {
            name: 'Cautionaries',
            emoji: '',
            color: '#ef4444', // Red background
            description: 'Low value, newer buildings - Likely poor location/overbuilt'
        },
        MIDDLE: {
            name: 'Tweeners',
            emoji: '',
            color: '#8b5cf6', // Purple background
            description: 'No clear verdict - Dig deeper'
        }
    };

    return quadrantMap[quadrant];
};

// ===== MATRIX POSITIONING (SIMPLIFIED) =====

export const calculateMatrixPosition = (
    property: PropertyForMatrix,
    allProperties: PropertyForMatrix[]
): MatrixPosition => {
    const propertyValue = getPropertyValue(property);
    const propertyAge = calculatePropertyAge(property.year_built);

    // X-axis: Property Age (dynamic scaling based on actual age range)
    const ages = allProperties.map(p => calculatePropertyAge(p.year_built)).sort((a, b) => a - b);
    
    if (ages.length === 0) {
        return { x: 50, y: 50 }; // Default to center if no data
    }

    const minAge = ages[0];
    const maxAge = ages[ages.length - 1];
    
    let x: number;
    // Handle case where all properties have the same age
    if (maxAge === minAge) {
        x = 50; // Center horizontally
    } else {
        x = ((propertyAge - minAge) / (maxAge - minAge)) * 100;
    }

    // Y-axis: Property Value (scaled to percentile within all properties)
    const values = allProperties.map(p => getPropertyValue(p)).filter(v => v > 0).sort((a, b) => a - b);

    if (values.length === 0) {
        return { x, y: 50 }; // Default to middle if no values
    }

    const minValue = values[0];
    const actualMaxValue = values[values.length - 1];
    const maxValue = actualMaxValue * 1.1; // Match the display range with 10% buffer

    // Handle case where all values are the same
    if (actualMaxValue === minValue) {
        return { x, y: 50 };
    }

    // Scale value to 0-100 percentage using the buffered max
    const y = ((propertyValue - minValue) / (maxValue - minValue)) * 100;

    return { 
        x: Math.max(0, Math.min(100, x)), 
        y: Math.max(0, Math.min(100, y)) 
    };
};

// ===== UTILITY FUNCTIONS =====

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatPropertyAge = (age: number): string => {
    if (age === 1) return '1 year old';
    return `${age} years old`;
};

export const formatValuePerUnit = (valuePerUnit: number): string => {
    return formatCurrency(valuePerUnit) + '/unit';
};