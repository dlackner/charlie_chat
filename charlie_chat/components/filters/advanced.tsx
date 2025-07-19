// components/filters/advanced.tsx

import React, { useRef, useEffect } from 'react';
import { FilterToggle } from './toggle';
import { FilterRange } from './range';

interface AdvancedFiltersProps {
  // Location fields
  street: string;
  setStreet: (value: string) => void;
  house: string;
  setHouse: (value: string) => void;

  // Owner location
  ownerLocation: "any" | "instate" | "outofstate";
  setOwnerLocation: (value: "any" | "instate" | "outofstate") => void;

  // Boolean filters
  corporateOwned: string;
  setCorporateOwned: (value: string) => void;
  mlsActive: string;
  setMlsActive: (value: string) => void;
  lastSaleArmsLength: string;
  setLastSaleArmsLength: (value: string) => void;
  floodZone: string;
  setFloodZone: (value: string) => void;
  assumable: string;
  setAssumable: (value: string) => void;
  auction: string;
  setAuction: (value: string) => void;
  reo: string;
  setReo: (value: string) => void;
  taxLien: string;
  setTaxLien: (value: string) => void;
  preForeclosure: string;
  setPreForeclosure: (value: string) => void;
  privateLender: string;
  setPrivateLender: (value: string) => void;

  // Range filters
  yearsOwnedRange: [number, number];
  setYearsOwnedRange: (value: [number, number]) => void;
  lastSalePriceRange: [number, number];
  setLastSalePriceRange: (value: [number, number]) => void;
  yearBuiltRange: [number, number];
  setYearBuiltRange: (value: [number, number]) => void;
  lotSizeRange: [number, number];
  setLotSizeRange: (value: [number, number]) => void;
  storiesRange: [number, number];
  setStoriesRange: (value: [number, number]) => void;
  mortgageBalanceRange: [number, number];
  setMortgageBalanceRange: (value: [number, number]) => void;
  assessedValueRange: [number, number];
  setAssessedValueRange: (value: [number, number]) => void;
  estimatedValueRange: [number, number];
  setEstimatedValueRange: (value: [number, number]) => void;
  estimatedEquityRange: [number, number];
  setEstimatedEquityRange: (value: [number, number]) => void;

  // Actions
  onResetFilters: () => void;
  onClose: () => void; // Add this prop for closing the filters
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  // Location fields
  street,
  setStreet,
  house,
  setHouse,

  // Owner location
  ownerLocation,
  setOwnerLocation,

  // Boolean filters
  corporateOwned,
  setCorporateOwned,
  mlsActive,
  setMlsActive,
  lastSaleArmsLength,
  setLastSaleArmsLength,
  floodZone,
  setFloodZone,
  assumable,
  setAssumable,
  auction,
  setAuction,
  reo,
  setReo,
  taxLien,
  setTaxLien,
  preForeclosure,
  setPreForeclosure,
  privateLender,
  setPrivateLender,

  // Range filters
  yearsOwnedRange,
  setYearsOwnedRange,
  lastSalePriceRange,
  setLastSalePriceRange,
  yearBuiltRange,
  setYearBuiltRange,
  lotSizeRange,
  setLotSizeRange,
  storiesRange,
  setStoriesRange,
  mortgageBalanceRange,
  setMortgageBalanceRange,
  assessedValueRange,
  setAssessedValueRange,
  estimatedValueRange,
  setEstimatedValueRange,
  estimatedEquityRange,
  setEstimatedEquityRange,

  // Actions
  onResetFilters,
  onClose
}) => {
  const filtersRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close filters
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        if (typeof onClose === 'function') {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (typeof onClose === 'function') {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  const handleOwnerLocationChange = (value: string) => {
    if (value === "") setOwnerLocation("any");
    else if (value === "true") setOwnerLocation("instate");
    else setOwnerLocation("outofstate");
  };

  const ownerLocationValue = ownerLocation === "any" ? "" : ownerLocation === "instate" ? "true" : "false";

  return (
    <div
      ref={filtersRef}
      className="w-[440px] max-h-screen bg-white border-r border-gray-200 p-6 shadow-xl overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-gray-800 font-semibold">Advanced Filters</h3>
        <div className="flex gap-2">
          <button
            onClick={onResetFilters}
            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 border border-gray-300"
          >
            Reset Filters
          </button>
          <button
            onClick={() => typeof onClose === 'function' && onClose()}
            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 border border-gray-300"
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Location Section */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-700 mb-3">Specific Address</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="advanced-street-number" className="block text-sm font-medium text-gray-700 mb-1">
              Street Number
            </label>
            <input
              type="text"
              id="advanced-street-number"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:ring-orange-500 focus:border-orange-500"
              placeholder=""
              value={house}
              onChange={(e) => setHouse(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="advanced-street-name" className="block text-sm font-medium text-gray-700 mb-1">
              Street Name
            </label>
            <input
              type="text"
              id="advanced-street-name"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:ring-orange-500 focus:border-orange-500"
              placeholder=""
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Owner Information */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-700 mb-3">Owner Information</h4>
        <div className="space-y-4">
          <FilterToggle
            label="Owner Location"
            value={ownerLocationValue}
            onChange={handleOwnerLocationChange}
            options={{
              any: "Any",
              yes: "In State",
              no: "Out of State"
            }}
          />

          <FilterToggle
            label="Corporate Owned"
            value={corporateOwned}
            onChange={setCorporateOwned}
          />

          <FilterRange
            label="Years Owned"
            values={yearsOwnedRange}
            onChange={setYearsOwnedRange}
            min={0}
            max={100}
            step={5}
          />
        </div>
      </div>

      {/* Sale History */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-700 mb-3">Sale History</h4>
        <div className="space-y-4">
          <FilterRange
            label="Last Sale Price"
            values={lastSalePriceRange}
            onChange={setLastSalePriceRange}
            min={0}
            max={100000000}
            step={25000}
          />

          <div className="grid grid-cols-2 gap-4">
            <FilterToggle
              label="Active MLS"
              value={mlsActive}
              onChange={setMlsActive}
            />
            <FilterToggle
              label="Last Sale Arms Length"
              value={lastSaleArmsLength}
              onChange={setLastSaleArmsLength}
            />
          </div>
        </div>
      </div>

      {/* Physical Characteristics */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-700 mb-3">Physical Characteristics</h4>
        <div className="space-y-4">
          <FilterRange
            label="Year Built"
            values={yearBuiltRange}
            onChange={setYearBuiltRange}
            min={1800}
            max={2025}
          />

          <FilterRange
            label="Lot Size"
            values={lotSizeRange}
            onChange={setLotSizeRange}
            min={0}
            max={1000000}
          />

          <FilterRange
            label="Number of Stories"
            values={storiesRange}
            onChange={setStoriesRange}
            min={0}
            max={100}
          />

          <FilterToggle
            label="Flood Zone"
            value={floodZone}
            onChange={setFloodZone}
          />
        </div>
      </div>

      {/* Financial Information */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-700 mb-3">Financial Information</h4>
        <div className="space-y-4">
          <FilterRange
            label="Mortgage Balance"
            values={mortgageBalanceRange}
            onChange={setMortgageBalanceRange}
            min={0}
            max={100000000}
            step={25000}
          />

          <FilterRange
            label="Assessed Value"
            values={assessedValueRange}
            onChange={setAssessedValueRange}
            min={0}
            max={100000000}
            step={25000}
          />

          <FilterRange
            label="Estimated Value"
            values={estimatedValueRange}
            onChange={setEstimatedValueRange}
            min={0}
            max={100000000}
            step={25000}
          />

          <FilterRange
            label="Estimated Equity"
            values={estimatedEquityRange}
            onChange={setEstimatedEquityRange}
            min={0}
            max={100000000}
            step={25000}
          />
        </div>
      </div>

      {/* Distress & Special Conditions */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-700 mb-3">Distress & Special Conditions</h4>
        <div className="grid grid-cols-2 gap-4">
          <FilterToggle
            label="Assumable"
            value={assumable}
            onChange={setAssumable}
          />
          <FilterToggle
            label="Auction"
            value={auction}
            onChange={setAuction}
          />
          <FilterToggle
            label="REO"
            value={reo}
            onChange={setReo}
          />
          <FilterToggle
            label="Tax Lien"
            value={taxLien}
            onChange={setTaxLien}
          />
          <FilterToggle
            label="Pre-Foreclosure"
            value={preForeclosure}
            onChange={setPreForeclosure}
          />
          <FilterToggle
            label="Private Lender"
            value={privateLender}
            onChange={setPrivateLender}
          />
        </div>
      </div>
    </div>
  );
};