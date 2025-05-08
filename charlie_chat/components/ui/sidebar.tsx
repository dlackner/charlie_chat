"use client";

import { useState } from "react";

// ...existing Listing and Props types

export const Sidebar = ({
  onSearch,
  listings,
  selectedListings,
  toggleListingSelect,
  onSendToGPT,
}: Props) => {
  const [zipcode, setZipcode] = useState("90210");
  const [minUnits, setMinUnits] = useState(2);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mlsActive, setMlsActive] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [minBeds, setMinBeds] = useState(0);
  const [minBaths, setMinBaths] = useState(0);
  const [hasGarage, setHasGarage] = useState(false);
  const [minYearBuilt, setMinYearBuilt] = useState(0);
  const [minSqFt, setMinSqFt] = useState(0);

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [radius, setRadius] = useState(5);

  const [foreclosure, setForeclosure] = useState(false);
  const [preForeclosure, setPreForeclosure] = useState(false);

  const [activeListing, setActiveListing] = useState<Listing | null>(null);

  return (
    <div className="relative flex">
      <div className="w-[260px] shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col space-y-6 overflow-y-auto h-screen z-20">
        <h2 className="text-lg font-medium text-gray-800">Property Search</h2>

        <div className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-600">Min # of Units</label>
            <input
              type="number"
              min={1}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={minUnits}
              onChange={(e) => setMinUnits(parseInt(e.target.value) || 0)}
            />
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-sm text-blue-700 underline hover:text-blue-900 transition"
          >
            {showAdvanced ? "Hide Advanced Filters" : "Show Advanced Filters"}
          </button>
        </div>

        <button
          onClick={() =>
            onSearch({
              zip: zipcode,
              units_min: minUnits,
              propertyType: "MFR",
              mls_active: mlsActive,
              pool: hasPool,
              garage: hasGarage,
              beds_min: minBeds,
              baths_min: minBaths,
              year_built_min: minYearBuilt,
              building_size_min: minSqFt,
              street,
              city,
              state,
              county,
              radius,
              foreclosure,
              pre_foreclosure: preForeclosure,
            })
          }
          id="sidebar-search"
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 transition"
        >
          Search
        </button>

        <div className="flex-1 space-y-2 overflow-y-auto relative">
          {Array.isArray(listings) &&
            listings
              .sort((a, b) => (b.rentEstimate ?? 0) - (a.rentEstimate ?? 0))
              .slice(0, 50)
              .map((listing, i) => {
                const isSelected = selectedListings.some((l) => l.id === listing.id);
                return (
                  <div
                    key={i}
                    className={`
                      border-2 p-3 rounded text-sm shadow-sm bg-white cursor-pointer transition-all 
                      ${isSelected ? "border-blue-600 bg-blue-50" : "border-transparent hover:border-gray-400"}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div onClick={() => setActiveListing(listing)} className="flex-1 cursor-pointer">
                        <p className="font-medium text-gray-800">
                          {listing.address?.street || "No street info"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 font-mono leading-relaxed">
                          Assessed: ${listing.assessedValue?.toLocaleString() ?? "N/A"}<br />
                          Units: {listing.unitsCount ?? "?"} • Year: {listing.yearBuilt ?? "?"}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleListingSelect(listing)}
                        className="h-5 w-5 mt-1 accent-blue-600"
                      />
                    </div>
                  </div>
                );
              })}
        </div>

        {activeListing && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/20"
            onClick={() => setActiveListing(null)}
          >
            <div
              className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveListing(null)}
                className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
              >
                &times;
              </button>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                {activeListing.address?.address || "No Address"}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <p><strong>Bedrooms:</strong> {activeListing.bedrooms ?? "N/A"}</p>
                <p><strong>Bathrooms:</strong> {activeListing.bathrooms ?? "N/A"}</p>
                <p><strong>Sq Ft:</strong> {activeListing.squareFeet?.toLocaleString() ?? "N/A"}</p>
                <p><strong>Year Built:</strong> {activeListing.yearBuilt ?? "N/A"}</p>
                <p><strong>Estimated Value:</strong> ${activeListing.estimatedValue?.toLocaleString() ?? "N/A"}</p>
                <p><strong>Assessed Value:</strong> ${activeListing.assessedValue?.toLocaleString() ?? "N/A"}</p>
                <p><strong>Flood Zone:</strong> {activeListing.floodZoneDescription ?? "N/A"}</p>
                <p><strong>Pool:</strong> {activeListing.pool ? "Yes" : "No"}</p>
                <p><strong>Owner Occupied:</strong> {activeListing.ownerOccupied ? "Yes" : "No"}</p>
                <p><strong>Last Sale Date:</strong> {activeListing.lastSaleDate ?? "N/A"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedListings.length > 0 && (
        <div className="fixed bottom-4 left-4 w-[240px] z-40">
          <div className="p-4 border rounded bg-[#D15834] text-sm shadow text-white">
            <p className="mb-2 font-medium">
              Add {selectedListings.length} {selectedListings.length === 1 ? "property" : "properties"} to Charlie Chat for analysis
            </p>
            <button
              onClick={onSendToGPT}
              className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 transition w-full"
            >
              Compare in Chat
            </button>
          </div>
        </div>
      )}

      {showAdvanced && (
        <div className="absolute top-0 left-[260px] w-[340px] h-full bg-white border-r border-gray-200 p-6 shadow-xl z-30 overflow-y-auto">
          <h3 className="text-base text-gray-700 mb-4 font-normal">Advanced Filters</h3>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Street" value={street} onChange={(e) => setStreet(e.target.value)} className="border px-2 py-1 rounded text-sm" />
            <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="border px-2 py-1 rounded text-sm" />
            <input type="text" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} className="border px-2 py-1 rounded text-sm" />
            <input type="text" placeholder="County" value={county} onChange={(e) => setCounty(e.target.value)} className="border px-2 py-1 rounded text-sm" />
            <div className="col-span-2">
              <label className="text-sm text-gray-600">Search Radius (miles): {radius}</label>
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.1}
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={foreclosure}
                onChange={(e) => setForeclosure(e.target.checked)}
                className="h-4 w-4"
              />
              <label className="text-sm text-gray-700">Foreclosure</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preForeclosure}
                onChange={(e) => setPreForeclosure(e.target.checked)}
                className="h-4 w-4"
              />
              <label className="text-sm text-gray-700">Pre-Foreclosure</label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
