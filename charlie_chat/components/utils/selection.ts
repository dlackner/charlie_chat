// components/utils/selection.ts

import type { Listing } from '../legacy/sidebar';

/**
 * Checks if all current listings are selected
 */
export const areAllListingsSelected = (
  currentListings: Listing[],
  selectedListings: Listing[]
): boolean => {
  return currentListings.every(listing =>
    selectedListings.some(selected => selected.id === listing.id)
  );
};

/**
 * Gets listings that need to be selected (not already selected)
 */
export const getListingsToSelect = (
  currentListings: Listing[],
  selectedListings: Listing[]
): Listing[] => {
  return currentListings.filter(listing =>
    !selectedListings.some(selected => selected.id === listing.id)
  );
};

/**
 * Gets currently selected listings that need to be deselected
 */
export const getListingsToDeselect = (
  currentListings: Listing[],
  selectedListings: Listing[]
): Listing[] => {
  return currentListings.filter(listing =>
    selectedListings.some(selected => selected.id === listing.id)
  );
};

/**
 * Creates a select all handler function
 */
export const createSelectAllHandler = (
  currentListings: Listing[],
  selectedListings: Listing[],
  toggleListingSelect: (listing: Listing) => void
) => {
  const allSelected = areAllListingsSelected(currentListings, selectedListings);
  
  if (allSelected) {
    // Deselect all current listings
    const listingsToDeselect = getListingsToDeselect(currentListings, selectedListings);
    listingsToDeselect.forEach(listing => toggleListingSelect(listing));
  } else {
    // Select all current listings that aren't already selected
    const listingsToSelect = getListingsToSelect(currentListings, selectedListings);
    listingsToSelect.forEach(listing => toggleListingSelect(listing));
  }
};