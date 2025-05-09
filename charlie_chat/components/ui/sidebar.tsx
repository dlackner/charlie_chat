"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Listing = {
  id: string;
  address: {
    street?: string;
    address: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  rentEstimate?: number;
  assessedValue?: number;
  estimatedValue?: number;
  lastSaleDate?: string;
  yearBuilt?: number;
  pool?: boolean;
  ownerOccupied?: boolean;
  floodZoneDescription?: string;
  unitsCount?: number;
  [key: string]: any;
};

type Props = {
  onSearch: (filters: Record<string, any>) => Promise<void>;
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

  const [activeListingIndex, setActiveListingIndex] = useState<number | null>(null);
  const activeListing = activeListingIndex !== null ? listings[activeListingIndex] : null;

  const downloadLetter = (listing: Listing) => {
    const doc = new jsPDF();
    doc.text(`Dear Property Owner,`, 10, 20);
    doc.text(
      `I'm writing to express my interest in your property at ${listing.address?.address}.`,
      10,
      30
    );
    doc.text("Please contact me if you're open to selling.", 10, 40);
    doc.save("letter.pdf");
  };

  const formatCurrency = (val: number | undefined) =>
    val ? `$${val.toLocaleString()}` : "N/A";
  
  const downloadProfile = (listing: Listing) => {
    const doc = new jsPDF({ orientation: "landscape" });

    const leftX = 10;
    const rightX = 150;
    let startY = 30;

    doc.addImage("/logo.png", "PNG", 10, 8, 40, 15);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(listing.address?.address || "No Address", doc.internal.pageSize.getWidth() / 2, startY, { align: "center" });


    startY = 45;
    const addSection = (title: string, fields: [string, any][], x: number, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, x, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      fields.forEach(([label, value], i) => {
        doc.text(`${label} ${value}`, x, y + 7 + i * 6);
      });
    };

    addSection("PROPERTY OVERVIEW", [
      ["Property ID:", listing.id],
      ["Units:", listing.unitsCount ?? "N/A"],
      ["Stories:", listing.stories ?? "N/A"],
      ["Year Built:", listing.yearBuilt ?? "N/A"],
      ["Lot Size:", `${listing.lotSquareFeet?.toLocaleString()} sq ft`],
      ["Years Owned:", listing.yearsOwned ?? "N/A"],
    ], leftX, startY);

    addSection("VALUATION & EQUITY", [
      ["Assessed Value:", formatCurrency(listing.assessedValue)],
      ["Estimated Market Value:", formatCurrency(listing.estimatedValue)],
      ["Estimated Equity:", formatCurrency(listing.estimatedValue)],
      ["Listing Price:", "Not listed"],
    ], leftX, startY + 46);

    addSection("MORTGAGE & FINANCING", [
      ["Mortgage Balance:", formatCurrency(listing.openMortgageBalance)],
      ["Lender:", listing.lenderName ?? "N/A"],
      ["Mortgage Maturity Date:", listing.maturingDate ?? "N/A"],
    ], leftX, startY + 81);

    addSection("SALES & TRANSACTION HISTORY", [
      ["Last Sale Date:", listing.lastSaleDate ?? "N/A"],
      ["Last Sale Amount:", formatCurrency(listing.lastSaleamount)],
      ["Arms-Length Sale:", listing.lastSaleArmsLength ? "Yes" : "No"],
      ["MLS Active:", listing.mlsActive ? "Yes" : "No"],
    ], rightX, startY);

    addSection("FLOOD ZONE INFORMATION", [
      ["Flood Zone:", listing.floodZone ? "Yes" : "No"],
      ["Flood Zone Description:", listing.floodZoneDescription ?? "N/A"],
    ], rightX, startY + 35);

    addSection("OWNERSHIP DETAILS", [
      ["Owner Name:", `${listing.ownerFirstName ?? ""} ${listing.ownerLastName ?? ""}`],
      ["Owner Address:", listing.ownerAddress ?? "N/A"],
      ["In-State Absentee Owner:", listing.inStateAbsenteeOwner ? "Yes" : "No"],
      ["Out-of-State Absentee Owner:", listing.outOfStateAbsenteeOwner ? "Yes" : "No"],
    ], rightX, startY + 60);

    doc.save("property-profile.pdf");
  };

  const goToPrev = () => {
    if (activeListingIndex !== null && activeListingIndex > 0) {
      setActiveListingIndex(activeListingIndex - 1);
    }
  };

  const goToNext = () => {
    if (activeListingIndex !== null && activeListingIndex < listings.length - 1) {
      setActiveListingIndex(activeListingIndex + 1);
    }
  };

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
                const isSelected = selectedListings.some((l: Listing) => l.id === listing.id);
                return (
                  <div
                    key={i}
                    className={`
                      border-2 p-3 rounded text-sm shadow-sm bg-white cursor-pointer transition-all 
                      ${isSelected ? "border-blue-600 bg-blue-50" : "border-transparent hover:border-gray-400"}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div onClick={() => setActiveListingIndex(i)} className="flex-1 cursor-pointer">
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
          onClick={() => setActiveListingIndex(null)}
        >
          <div
            className="bg-white px-14 py-6 rounded-lg shadow-xl max-w-3xl w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveListingIndex(null)}
              className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
            >
              &times;
            </button>

            <button
              onClick={goToPrev}
              disabled={activeListingIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-100 p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              disabled={activeListingIndex === listings.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-100 p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
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

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => downloadLetter(activeListing)}
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition"
              >
                Download Letter 📩
              </button>
              <button
                onClick={() => downloadProfile(activeListing)}
                className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 transition"
              >
                Download Profile 📄
              </button>
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
