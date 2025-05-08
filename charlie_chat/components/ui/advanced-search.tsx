import React from "react";

export type AdvancedFilters = {
  units_min?: number;
  year_built_min?: number;
  city?: string;
  state?: string;
};

type Props = {
  filters: AdvancedFilters;
  onChange: (filters: AdvancedFilters) => void;
};

export default function AdvancedSearchPanel({ filters, onChange }: Props) {
  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">Min Units</label>
        <input
          type="number"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          value={filters.units_min ?? ""}
          onChange={(e) => onChange({ ...filters, units_min: parseInt(e.target.value, 10) })}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">Min Year Built</label>
        <input
          type="number"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          value={filters.year_built_min ?? ""}
          onChange={(e) => onChange({ ...filters, year_built_min: parseInt(e.target.value, 10) })}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">City</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          value={filters.city ?? ""}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">State</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          value={filters.state ?? ""}
          onChange={(e) => onChange({ ...filters, state: e.target.value })}
        />
      </div>
    </div>
  );
}