// components/filters/basic.tsx

import React from 'react';

interface BasicFiltersProps {
  zipcode: string;
  setZipcode: (value: string) => void;
  minUnits: number | string;
  setMinUnits: (value: number | string) => void;
  maxUnits: number | string;
  setMaxUnits: (value: number | string) => void;
  locationError: string | null;
  city: string;
  setCity: (value: string) => void;
  stateCode: string;
  setStateCode: (value: string) => void;
}

export const BasicFilters: React.FC<BasicFiltersProps> = ({
  zipcode,
  setZipcode,
  minUnits,
  setMinUnits,
  maxUnits,
  setMaxUnits,
  locationError,
  city,
  setCity,
  stateCode,
  setStateCode
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">ZIP code(s)</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          value={zipcode}
          onChange={(e) => setZipcode(e.target.value)}
        />
      </div>

      {/* Add City and State fields here */}
<div className="grid grid-cols-4 gap-2">
  <div className="col-span-3">
    <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
    <input
      type="text"
      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      value={city}
      onChange={(e) => setCity(e.target.value)}
    />
  </div>
  <div className="col-span-1">
    <label className="block text-sm font-medium text-gray-600 mb-1">State</label>
    <input
      type="text"
      maxLength={2}
      className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center uppercase"
      value={stateCode}
      onChange={(e) => setStateCode(e.target.value.toUpperCase())}
    />
  </div>
</div>
      
      {locationError && (
        <p className="text-red-400 text-xs mt-1">{locationError}</p>
      )}
      
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-600 mb-1">Number of Units*</label>
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <input
              type="number"
              min={1}
              name="minUnits"
              placeholder="Min"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={minUnits}
              onChange={(e) => {
                const val = e.target.value;
                setMinUnits(val === "" ? "" : (isNaN(parseInt(val, 10)) ? "" : parseInt(val, 10)));
              }}
              aria-label="Minimum units"
            />
          </div>
          <span className="text-gray-500">-</span>
          <div className="flex-1">
            <input
              type="number"
              min={typeof minUnits === 'number' ? minUnits : 1}
              name="maxUnits"
              placeholder="Max"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={maxUnits}
              onChange={(e) => {
                const val = e.target.value;
                setMaxUnits(val === "" ? "" : (isNaN(parseInt(val, 10)) ? "" : parseInt(val, 10)));
              }}
              aria-label="Maximum units"
            />
          </div>
        </div>
      </div>
    </div>
  );
};