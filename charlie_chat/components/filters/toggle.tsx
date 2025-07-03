// components/filters/toggle.tsx

import React from 'react';

interface FilterToggleProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: {
    any: string;
    yes: string;
    no: string;
  };
}

export const FilterToggle: React.FC<FilterToggleProps> = ({
  label,
  value,
  onChange,
  options = {
    any: "Any",
    yes: "Yes", 
    no: "No"
  }
}) => {
  const baseButtonClass = "relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500";
  const activeClass = "bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500";
  const inactiveClass = "bg-white text-gray-700 hover:bg-gray-50";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="grid grid-cols-3 rounded-md w-full">
        <button
          type="button"
          onClick={() => onChange("")}
          className={`${baseButtonClass} rounded-l-md ${
            value === "" ? activeClass : inactiveClass
          }`}
        >
          {options.any}
        </button>
        <button
          type="button"
          onClick={() => onChange("true")}
          className={`${baseButtonClass} ${
            value === "true" ? activeClass : inactiveClass
          }`}
        >
          {options.yes}
        </button>
        <button
          type="button"
          onClick={() => onChange("false")}
          className={`${baseButtonClass} rounded-r-md ${
            value === "false" ? activeClass : inactiveClass
          }`}
        >
          {options.no}
        </button>
      </div>
    </div>
  );
};