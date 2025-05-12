"use client";

import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { Range, getTrackBackground } from "react-range";


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
  lastSaleAmount?: number;
  lotSquareFeet?: number;
  yearsOwned?: number;
  outOfStateAbsenteeOwner?: number;
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
  isLoggedIn: boolean;
  triggerAuthModal: () => void;
};

export const Sidebar = ({
  onSearch,
  listings,
  selectedListings,
  toggleListingSelect,
  onSendToGPT,
  isLoggedIn: userIsLoggedIn,
  triggerAuthModal,
}: Props) => {
  const [zipcode, setZipcode] = useState("90210");
  const [minUnits, setMinUnits] = useState(2);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mlsActive, setMlsActive] = useState(false);
  const [radius, setRadius] = useState(5);

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");

  const [foreclosure, setForeclosure] = useState(false);
  const [preForeclosure, setPreForeclosure] = useState(false);
  const [floodZone, setFloodZone] = useState("");
  const [assumable, setAssumable] = useState("");
  const [lastSaleArmsLength, setLastSaleArmsLength] = useState("");

  const [yearBuiltRange, setYearBuiltRange] = useState<[number, number]>([1800, 2025]);
  const [lotSizeRange, setLotSizeRange] = useState<[number, number]>([0, 100000]);
  const [storiesRange, setStoriesRange] = useState<[number, number]>([1, 10]);
  const [mortgageBalanceRange, setMortgageBalanceRange] = useState<[number, number]>([0, 1000000]);
  const [assessedValueRange, setAssessedValueRange] = useState<[number, number]>([0, 1000000]);
  const [estimatedValueRange, setEstimatedValueRange] = useState<[number, number]>([0, 1000000]);
  const [estimatedEquityRange, setEstimatedEquityRange] = useState<[number, number]>([0, 1000000]);

  const [yearsOwnedRange, setYearsOwnedRange] = useState<[number, number]>([0, 50]); // <-- New state for Years Owned (e.g., 0-50 years)

  const [inStateOwner, setInStateOwner] = useState<string>("");
  const [outOfStateOwner, setOutOfStateOwner] = useState<string>(""); // Ensure this exists
  const [corporateOwned, setCorporateOwned] = useState<string>(""); // Ensure this exists

  const [activeListingIndex, setActiveListingIndex] = useState<number | null>(null);
  const activeListing = activeListingIndex !== null ? listings[activeListingIndex] : null;

  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const panelRef = useRef<HTMLDivElement>(null);
  const advancedFiltersToggleRef = useRef<HTMLButtonElement>(null);

  const renderRange = (
    label: string,
    values: [number, number],
    onValuesChange: (newValues: [number, number]) => void,
    min: number,
    max: number,
    step = 1
  ) => {
    // Helper function to format the display values based on the label
    const formatDisplayValue = (value: number, rangeLabel: string): string => {
      if (rangeLabel === "Year Built") {
        return value.toString(); // Displays year without a comma
      } else if (rangeLabel === "Lot Size") {
        return `${value.toLocaleString()} sq ft`; // Adds "sq ft"
      } else if (
        rangeLabel === "Mortgage Balance" ||
        rangeLabel === "Assessed Value" ||
        rangeLabel === "Estimated Value" ||
        rangeLabel === "Estimated Equity"
      ) {
        return value.toLocaleString('en-US', { // Formats as currency (USD, no cents)
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
      }
      // Default formatting for other ranges like "Number of Stories"
      return value.toLocaleString();
    };
  
    return (
      <div className="col-span-2">
        <label className="text-sm block mb-1">
          {/* Use the helper function for formatting */}
          {label}: {formatDisplayValue(values[0], label)} – {formatDisplayValue(values[1], label)}
        </label>
  
        <Range
          values={values}
          step={step}
          min={min}
          max={max}
          onChange={(updatedValuesFromReactRange: number[]) => {
            if (Array.isArray(updatedValuesFromReactRange) && updatedValuesFromReactRange.length === 2) {
              onValuesChange(updatedValuesFromReactRange as [number, number]);
            } else {
              console.warn("Range onChange callback provided an unexpected value:", updatedValuesFromReactRange);
            }
          }}
          renderTrack={({ props: trackProps, children }) => {
            return (
              <div
                {...trackProps}
                style={{
                  ...trackProps.style,
                  height: 8,
                  borderRadius: 4,
                  background: getTrackBackground({
                    values: values,
                    colors: ["#d1d5db", "#2563eb", "#d1d5db"],
                    min,
                    max,
                  }),
                }}
              >
                {children}
              </div>
            );
          }}
          renderThumb={({ props: thumbProps }) => {
            const { key: thumbKey, ...restOfThumbProps } = thumbProps;
            return (
              <div
                key={thumbKey}
                {...restOfThumbProps}
                style={{
                  ...restOfThumbProps.style,
                  height: 16,
                  width: 16,
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  boxShadow: "0 0 2px rgba(0,0,0,0.4)",
                }}
              />
            );
          }}
        />
      </div>
    );
  };
  
  

  const useClickOutside = (
    panelToCloseRef: React.RefObject<HTMLElement | null>,
    ignoreClickRefs: Array<React.RefObject<HTMLElement | null>>, // Accepts an array of refs to ignore
    onOutsideClickCallback: () => void
  ) => {
    useEffect(() => {
      const handleClick = (event: MouseEvent) => {
        const target = event.target as Node;
  
        // 1. Check if the click was inside any of the ignored elements
        for (const ignoreRef of ignoreClickRefs) {
          if (ignoreRef.current && ignoreRef.current.contains(target)) {
            return; // Click is on an ignored element, so do nothing from this hook.
          }
        }
  
        // 2. If not on an ignored element, check if it was outside the main panel
        if (panelToCloseRef.current && !panelToCloseRef.current.contains(target)) {
          onOutsideClickCallback(); // Call the callback to close the panel
        }
      };
  
      document.addEventListener("mousedown", handleClick);
      return () => {
        document.removeEventListener("mousedown", handleClick);
      };
      // Add ignoreClickRefs to the dependency array
    }, [panelToCloseRef, ignoreClickRefs, onOutsideClickCallback]);
  };


  useClickOutside(
    panelRef,
    [advancedFiltersToggleRef], // Pass the toggle button's ref here
    () => setShowAdvanced(false)
  );


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

    doc.addImage("/MFOS.png", "PNG", 10, 8, 50, 10);

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
      ["Last Sale Amount:", formatCurrency(listing.lastSaleAmount)],
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
            <label className="block text-sm font-medium text-gray-600">Zip Code*</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">Min # of Units*</label>
            <input
              type="number"
              min={1}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={minUnits}
              onChange={(e) => setMinUnits(parseInt(e.target.value) || 0)}
            />
          </div>

          <button
            ref={advancedFiltersToggleRef} // <-- Assign the ref here
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-sm text-blue-700 underline hover:text-blue-900 transition"
          >
            {showAdvanced ? "Hide Advanced Filters" : "Show Advanced Filters"}
          </button>
        </div>

        <button
          onClick={() => {
            if (!isLoggedIn) {
              triggerAuthModal();;
              return;
            }
            onSearch({
              zip: zipcode,
              units_min: minUnits,
              propertyType: "MFR",
              mls_active: mlsActive,
              flood_zone: floodZone || undefined,
              year_built_min: yearBuiltRange[0],
              year_built_max: yearBuiltRange[1],
              lot_size_min: lotSizeRange[0],
              lot_size_max: lotSizeRange[1],
              mortgage_min: mortgageBalanceRange[0],
              mortgage_max: mortgageBalanceRange[1],
              assessed_value_min: assessedValueRange[0],
              assessed_value_max: assessedValueRange[1],
              value_min: estimatedValueRange[0],
              value_max: estimatedValueRange[1],
              estimated_equity_min: estimatedEquityRange[0],
              estimated_equity_max: estimatedEquityRange[1],
              stories_min: storiesRange[0],
              stories_max: storiesRange[1],              
              street,
              city,
              state,
              county,
              radius,
              foreclosure,
              pre_foreclosure: preForeclosure,
            });;
          }}
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
              <p><strong>Property ID:</strong> {activeListing.id ?? "N/A"}</p>
              <p><strong>Out-of-State Absentee Owner:</strong> {activeListing.outOfStateAbsenteeOwner ? "Yes" : "No"}</p>
              <p><strong>Units:</strong> {activeListing.unitsCount ?? "N/A"}</p>
              <p><strong>Flood Zone Description:</strong> {activeListing.floodZoneDescription ?? "N/A"}</p>
              <p><strong>Year Built:</strong> {activeListing.yearBuilt ?? "N/A"}</p>
              <p><strong>MLS Active:</strong> {activeListing.mlsActive ? "Yes" : "No"}</p>
              <p><strong>Lot Size:</strong> {activeListing.lotSquareFeet ? `${activeListing.lotSquareFeet.toLocaleString()} sq ft` : "N/A"}</p>
              <p><strong>Last Sale Date:</strong> {activeListing.lastSaleDate ?? "N/A"}</p>
              <p><strong>Years Owned:</strong> {activeListing.yearsOwned ?? "N/A"}</p>
              <p><strong>Last Sale Amount:</strong>{" "}{activeListing.lastSaleAmount ? `$${Number(activeListing.lastSaleAmount).toLocaleString()}` : "N/A"}</p>
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
        <div ref={panelRef} className="absolute top-0 left-[260px] w-[440px] h-full bg-white border-r border-gray-200 p-6 shadow-xl z-30 overflow-y-auto">
          <h3 className="text-lg text-gray-800 mb-4 font-semibold">Advanced Filters</h3>
          
          {/* Ownership & Sales History */}
          <h4 className="text-md font-semibold text-gray-700 mt-6 mb-2">Ownership & Sales History</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* In State Owner Dropdown */}
            <select
              value={inStateOwner}
              onChange={(e) => setInStateOwner(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            >
              <option value="">In State Owner?</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            {/* Out of State Owner Dropdown */}
            <select
              value={outOfStateOwner}
              onChange={(e) => setOutOfStateOwner(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            >
              <option value="">Out of State Owner?</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            {/* Corporate Owned Dropdown */}
            <select
              value={corporateOwned}
              onChange={(e) => setCorporateOwned(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            >
              <option value="">Corporate Owned?</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            {/* Years Owned Slider */}
            {renderRange(
              "Years Owned",
              yearsOwnedRange,
              setYearsOwnedRange,
              0,  // Min years
              75, // Max years (adjust as needed)
              1   // Step
            )}

            {/* Existing inputs/selects like Last Sale Price, Last Sale Date, etc. */}
            <input type="text" placeholder="Last Sale Price" className="border px-2 py-1 rounded text-sm" />
            <input type="text" placeholder="Last Sale Date" className="border px-2 py-1 rounded text-sm" />
            <select
              value={String(mlsActive)}
              onChange={(e) => setMlsActive(e.target.value === "true")}
              className="border px-2 py-1 rounded text-sm">
              <option value="">Active MLS?</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            <select value={lastSaleArmsLength} onChange={(e) => setLastSaleArmsLength(e.target.value)} className="border px-2 py-1 rounded text-sm">
              <option value="">Last Sale Arms Length?</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Physical Characteristics */}
          <h4 className="text-md font-semibold text-gray-700 mt-6 mb-2">Physical Characteristics</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {renderRange("Year Built", yearBuiltRange, setYearBuiltRange, 1800, 2025)}
            {renderRange("Lot Size", lotSizeRange, setLotSizeRange, 0, 100000)}
            {renderRange("Number of Stories", storiesRange, setStoriesRange, 1, 10)}
            <select value={floodZone} onChange={(e) => setFloodZone(e.target.value)} className="col-span-2 border px-2 py-1 rounded text-sm">
              <option value="">Flood Zone?</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Financials */}
          <h4 className="text-md font-semibold text-gray-700 mt-6 mb-2">Financials</h4>
          <div className="grid grid-cols-2 gap-4">
            {renderRange("Mortgage Balance", mortgageBalanceRange, setMortgageBalanceRange, 0, 1000000, 10000)}
            {renderRange("Assessed Value", assessedValueRange, setAssessedValueRange, 0, 1000000, 10000)}
            {renderRange("Estimated Value", estimatedValueRange, setEstimatedValueRange, 0, 1000000, 10000)}
            {renderRange("Estimated Equity", estimatedEquityRange, setEstimatedEquityRange, 0, 1000000, 10000)}

            <select value={assumable} onChange={(e) => setAssumable(e.target.value)} className="col-span-2 border px-2 py-1 rounded text-sm">
              <option value="">Assumable?</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

          </div>
        </div>

      )}
    </div>
  );
};
