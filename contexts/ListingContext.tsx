'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Listing = { id: string; address: { address: string }; [key: string]: any };

interface ListingContextType {
  listings: Listing[];
  selectedListings: Listing[];
  setListings: (listings: Listing[]) => void;
  toggleListingSelect: (listing: Listing) => void;
}

const ListingContext = createContext<ListingContextType | undefined>(undefined);

export const ListingProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListings, setSelectedListings] = useState<Listing[]>([]);

  const toggleListingSelect = (listing: Listing) => {
    const exists = selectedListings.some((l) => l.id === listing.id);
    setSelectedListings((prev) =>
      exists ? prev.filter((l) => l.id !== listing.id) : [...prev, listing]
    );
  };

  return (
    <ListingContext.Provider value={{ listings, selectedListings, setListings, toggleListingSelect }}>
      {children}
    </ListingContext.Provider>
  );
};

export const useListingContext = () => {
  const context = useContext(ListingContext);
  if (!context) {
    throw new Error('useListingContext must be used within a ListingProvider');
  }
  return context;
};