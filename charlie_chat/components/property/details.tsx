// details.tsx - Property Details Component (now handled by PropertyActions)

'use client';

import type { Listing } from '../ui/listingTypes';

interface PropertyDetailsProps {
  listing: Listing;
}

export const PropertyDetails = ({ listing: _ }: PropertyDetailsProps) => {
  // This component is no longer needed since PropertyActions now handles 
  // all property display in PropertyCard format
  return null;
};