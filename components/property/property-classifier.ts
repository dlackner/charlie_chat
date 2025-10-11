import { Listing } from '../ui/listingTypes';

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
  // Handle both boolean and number formats for out_of_state_absentee_owner
  const isOutOfState = listing.out_of_state_absentee_owner === true;
  // Match SmartQueries: 10+ years owned
  const result = isOutOfState && (listing.years_owned || 0) >= 10;
  console.log('isMotivatedSeller - outOfState:', listing.out_of_state_absentee_owner, 'yearsOwned:', listing.years_owned, 'result:', result);
  return result;
};

const isDistressed = (listing: Listing): boolean => {
  const result = !!(listing.pre_foreclosure ||
    listing.reo ||
    listing.auction ||
    listing.foreclosure);
  console.log('isDistressed - preForeclosure:', listing.pre_foreclosure, 'reo:', listing.reo, 'auction:', listing.auction, 'foreclosure:', listing.foreclosure, 'result:', result);
  return result;
};

const isValueAdd = (listing: Listing): boolean => {
  const yearBuilt = listing.year_built || 0;
  // Handle both boolean and number formats for out_of_state_absentee_owner
  const isOutOfState = listing.out_of_state_absentee_owner === true;
  // Match SmartQueries: 1970-1995 built + out-of-state
  const result = yearBuilt >= 1970 &&
    yearBuilt <= 1995 &&
    isOutOfState;
  console.log('isValueAdd - yearBuilt:', yearBuilt, 'outOfState:', listing.out_of_state_absentee_owner, 'result:', result);
  return result;
};

const isComps = (listing: Listing): boolean => {
  const result = listing.last_sale_arms_length === true && listing.years_owned === 1;
  console.log('isComps - lastSaleArmsLength:', listing.last_sale_arms_length, 'yearsOwned:', listing.years_owned, 'result:', result);
  return result;
};

const isPrivateLender = (listing: Listing): boolean => {
  const result = !!listing.private_lender;
  console.log('isPrivateLender - privateLender:', listing.private_lender, 'result:', result);
  return result;
};

const isHighEquity = (listing: Listing): boolean => {
  if (!listing.estimated_equity || !listing.estimated_value) return false;
  return listing.estimated_equity > (listing.estimated_value * 0.4); // 40%+ equity
};

const isCashFlow = (listing: Listing): boolean => {
  if (!listing.rent_estimate || !listing.assessed_value) return false;
  const annualRent = listing.rent_estimate * 12;
  const rentToValueRatio = annualRent / listing.assessed_value;
  return rentToValueRatio > 0.08; // 8%+ rent-to-value ratio
};

const isSellerFinancing = (listing: Listing): boolean => {
  return !!(listing.assumable ||
    (listing.estimated_equity && listing.estimated_value &&
      listing.estimated_equity > (listing.estimated_value * 0.4) &&
      (listing.out_of_state_absentee_owner || listing.corporate_owned)));
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