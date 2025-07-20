import { Listing } from '../ui/sidebar';

export interface PropertyClassification {
  type: 'motivated-seller' | 'distressed' | 'value-add' | 'private-lender' | 'comps' |'high-equity' | 'cash-flow' | 'seller-financing';
  label: string;
  color: string;
  bgColor: string;
  priority: number; // Lower number = higher priority
}

// Classification definitions
const CLASSIFICATIONS: Record<string, Omit<PropertyClassification, 'type'>> = {
  'motivated-seller': {
    label: 'Motivated',
    color: '#8B5CF6', // Purple
    bgColor: '#F3E8FF',
    priority: 1
  },
  'distressed': {
    label: 'Distressed',
    color: '#EF4444', // Red
    bgColor: '#FEF2F2',
    priority: 2
  },
  'value-add': {
    label: 'Value-Add',
    color: '#3B82F6', // Blue
    bgColor: '#EFF6FF',
    priority: 3
  },
  'comps': {
    label: 'Comps',
    color: '#F97316',   // orange-500
    bgColor: '#FFFAF0', // soft orange-tinted background (lighter than orange-100)
    priority: 3
  },
  'high-equity': {
    label: 'High Equity',
    color: '#10B981', // Green
    bgColor: '#F0FDF4',
    priority: 4
  },
  'cash-flow': {
    label: 'Cash Flow',
    color: '#F59E0B', // Amber
    bgColor: '#FFFBEB',
    priority: 5
  },
  'seller-financing': {
    label: 'Seller Finance',
    color: '#06B6D4', // Cyan
    bgColor: '#F0FDFA',
    priority: 6
  },
  'private-lender': {
    label: 'Private Lender',
    color: '#8B5CF6', // Purple variant
    bgColor: '#FAF5FF',
    priority: 7
  }
};

export { CLASSIFICATIONS };

// Classification logic functions
const isMotivatedSeller = (listing: Listing): boolean => {
  // Handle both boolean and number formats for outOfStateAbsenteeOwner
  const isOutOfState = listing.outOfStateAbsenteeOwner === true;
  // Match SmartQueries: 10+ years owned
  const result = isOutOfState && (listing.yearsOwned || 0) >= 10;
  console.log('isMotivatedSeller - outOfState:', listing.outOfStateAbsenteeOwner, 'yearsOwned:', listing.yearsOwned, 'result:', result);
  return result;
};

const isDistressed = (listing: Listing): boolean => {
  const result = !!(listing.preForeclosure ||
    listing.taxLien ||
    listing.reo ||
    listing.auction ||
    listing.foreclosure);
  console.log('isDistressed - preForeclosure:', listing.preForeclosure, 'taxLien:', listing.taxLien, 'reo:', listing.reo, 'auction:', listing.auction, 'foreclosure:', listing.foreclosure, 'result:', result);
  return result;
};

const isValueAdd = (listing: Listing): boolean => {
  const yearBuilt = listing.yearBuilt || 0;
  // Handle both boolean and number formats for outOfStateAbsenteeOwner
  const isOutOfState = listing.outOfStateAbsenteeOwner === true;
  // Match SmartQueries: 1970-1995 built + out-of-state
  const result = yearBuilt >= 1970 &&
    yearBuilt <= 1995 &&
    isOutOfState;
  console.log('isValueAdd - yearBuilt:', yearBuilt, 'outOfState:', listing.outOfStateAbsenteeOwner, 'result:', result);
  return result;
};

const isComps = (listing: Listing): boolean => {
  const result = listing.lastSaleArmsLength === true && listing.yearsOwned === 1;
  console.log('isComps - lastSaleArmsLength:', listing.lastSaleArmsLength, 'yearsOwned:', listing.yearsOwned, 'result:', result);
  return result;
};

const isPrivateLender = (listing: Listing): boolean => {
  const result = !!listing.privateLender;
  console.log('isPrivateLender - privateLender:', listing.privateLender, 'result:', result);
  return result;
};

const isHighEquity = (listing: Listing): boolean => {
  if (!listing.estimatedEquity || !listing.estimatedValue) return false;
  return listing.estimatedEquity > (listing.estimatedValue * 0.4); // 40%+ equity
};

const isCashFlow = (listing: Listing): boolean => {
  if (!listing.rentEstimate || !listing.assessedValue) return false;
  const annualRent = listing.rentEstimate * 12;
  const rentToValueRatio = annualRent / listing.assessedValue;
  return rentToValueRatio > 0.08; // 8%+ rent-to-value ratio
};

const isSellerFinancing = (listing: Listing): boolean => {
  return !!(listing.assumable ||
    (listing.estimatedEquity && listing.estimatedValue &&
      listing.estimatedEquity > (listing.estimatedValue * 0.4) &&
      (listing.outOfStateAbsenteeOwner || listing.corporate_owned)));
};

// Main classification functions
export const classifyProperty = (listing: Listing): PropertyClassification[] => {
  const classifications: PropertyClassification[] = [];

  // Check each classification type
  if (isMotivatedSeller(listing)) {
    classifications.push({
      type: 'motivated-seller',
      ...CLASSIFICATIONS['motivated-seller']
    });
  }

  if (isDistressed(listing)) {
    classifications.push({
      type: 'distressed',
      ...CLASSIFICATIONS['distressed']
    });
  }

  if (isValueAdd(listing)) {
    classifications.push({
      type: 'value-add',
      ...CLASSIFICATIONS['value-add']
    });
  }

if (isComps(listing)) {
  classifications.push({
    type: 'comps',
    ...CLASSIFICATIONS['comps']
  });
}

  if (isHighEquity(listing)) {
    classifications.push({
      type: 'high-equity',
      ...CLASSIFICATIONS['high-equity']
    });
  }

  if (isCashFlow(listing)) {
    classifications.push({
      type: 'cash-flow',
      ...CLASSIFICATIONS['cash-flow']
    });
  }

  if (isSellerFinancing(listing)) {
    classifications.push({
      type: 'seller-financing',
      ...CLASSIFICATIONS['seller-financing']
    });
  }

  if (isPrivateLender(listing)) {
    classifications.push({
      type: 'private-lender',
      ...CLASSIFICATIONS['private-lender']
    });
  }

  return classifications;
};

export const getPrimaryClassification = (listing: Listing): PropertyClassification | null => {
  // Priority order: Legal issues first, then financial motivation, then physical potential
  if (isDistressed(listing)) {
    return {
      type: 'distressed',
      ...CLASSIFICATIONS['distressed']
    };
  }
  if (isPrivateLender(listing)) {
    return {
      type: 'private-lender',
      ...CLASSIFICATIONS['private-lender']
    };
  }
  if (isMotivatedSeller(listing)) {
    return {
      type: 'motivated-seller',
      ...CLASSIFICATIONS['motivated-seller']
    };

    if (isComps(listing)) {
  return {
    type: 'comps',
    ...CLASSIFICATIONS['comps']
  };
}

  }
  if (isValueAdd(listing)) {
    return {
      type: 'value-add',
      ...CLASSIFICATIONS['value-add']
    };
  }

  return null;
};

export const getClassificationCount = (listing: Listing): number => {
  return classifyProperty(listing).length;
};