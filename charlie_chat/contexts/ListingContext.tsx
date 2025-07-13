'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedListings = localStorage.getItem('listings');
      const savedSelectedListings = localStorage.getItem('listingContextSelectedListings');
      
      if (savedListings) {
        setListings(JSON.parse(savedListings));
      }
      if (savedSelectedListings) {
        setSelectedListings(JSON.parse(savedSelectedListings));
      }
      setIsInitialized(true);
    }
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      if (listings.length > 0) {
        localStorage.setItem('listings', JSON.stringify(listings));
      } else {
        localStorage.removeItem('listings');
      }
    }
  }, [listings, isInitialized]);

  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      if (selectedListings.length > 0) {
        localStorage.setItem('listingContextSelectedListings', JSON.stringify(selectedListings));
      } else {
        localStorage.removeItem('listingContextSelectedListings');
      }
    }
  }, [selectedListings, isInitialized]);

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