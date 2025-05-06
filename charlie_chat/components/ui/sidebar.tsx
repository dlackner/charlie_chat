"use client";

import { useState } from "react";

type Listing = {
  id: string;
  address: string;
  bedrooms?: number;
  rentEstimate?: number;
  squareFootage?: number;
  propertyValue?: number;
  lastSalePrice?: number;
};

type Props = {
  onSearch: (filters: Record<string, string | number>) => Promise<void>;
  listings: Listing[];
  selectedListings: Listing[];
  toggleListingSelect: (listing: Listing) => void;
  onSendToGPT: () => void;
};

export const Sidebar = ({
  onSearch,
  listings,
  selectedListings,
  toggleListingSelect,
  onSendToGPT,
}: Props) => {
  const [zipcode, setZipcode] = useState("90210");
  const [propertyType, setPropertyType] = useState("Multi-Family");

  const PROPERTY_TYPE_LABELS: Record<string, string> = {
    SFR: "Single-Family",
    MFR: "Multi-Family",
    CONDO: "Condo",
    OTHER: "Other",
  };

  return (
    <div className="w-[260px] shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col space-y-6 overflow-y-auto">
      <h2 className="text-lg font-medium text-gray-800">Property Search</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">Zip Code</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          value={zipcode}
          onChange={(e) => setZipcode(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">Property Type</label>
        <div className="flex flex-col space-y-1">
          {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="radio"
                name="propertyType"
                value={value}
                checked={propertyType === value}
                onChange={() => setPropertyType(value)}
                className="accent-blue-600"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>


      <button
        onClick={() => onSearch({ zip: zipcode, propertyType})}
        id="sidebar-search"
        className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 transition"
      >
        Search Rentals
      </button>

      {/* Listings & Compare Section */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {Array.isArray(listings) && listings
          .sort((a, b) => (b.rentEstimate ?? 0) - (a.rentEstimate ?? 0))
          .slice(0, 5)
          .map((listing, i) => {
            const isSelected = selectedListings.some((l) => l.id === listing.id);
            return (
              <div
                key={i}
                className={`border p-3 rounded text-sm shadow-sm bg-white cursor-pointer transition-all ${
                  isSelected ? "border-blue-600 bg-blue-50" : "hover:border-gray-400"
                }`}
                onClick={() => toggleListingSelect(listing)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-800">
                      {listing.address?.address || "No address"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      Assessed: $ {listing.assessedValue?.toLocaleString() ?? "N/A"}
                    </p>

                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-5 w-5 mt-1 accent-blue-600"
                  />
                </div>
              </div>
            );
          })}

        {/* GPT Callout */}
        {selectedListings.length > 0 && (
          <div className="p-4 border rounded bg-[#D15834] text-sm shadow text-white">
            <p className="mb-2 font-medium">
              🧠 Want Charlie to compare these {selectedListings.length} listings?
            </p>
            <button
              onClick={onSendToGPT}
              className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 transition"
            >
              Compare in Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
