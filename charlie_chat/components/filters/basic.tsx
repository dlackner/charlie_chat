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
}

export const BasicFilters: React.FC<BasicFiltersProps> = ({
  zipcode,
  setZipcode,
  minUnits,
  setMinUnits,
  maxUnits,
  setMaxUnits,
  locationError
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">Zipcode</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          value={zipcode}
          onChange={(e) => setZipcode(e.target.value)}
        />
      </div>
      
      {locationError && (
        <p className="text-gray-400 text-xs mt-1">{locationError}</p>
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