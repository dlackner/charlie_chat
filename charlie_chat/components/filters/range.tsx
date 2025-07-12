// components/filters/range.tsx

import React from 'react';
import { Range, getTrackBackground } from "react-range";

interface FilterRangeProps {
  label: string;
  values: [number, number];
  onChange: (newValues: [number, number]) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
}

export const FilterRange: React.FC<FilterRangeProps> = ({
  label,
  values,
  onChange,
  min,
  max,
  step = 1,
  formatValue
}) => {
  const formatDisplayValue = (value: number): string => {
    if (formatValue) {
      return formatValue(value);
    }
    
    // Default formatting based on label
    if (label === "Year Built" || label === "Last Sale Date") {
      return value.toString();
    } else if (label === "Lot Size" || label === "Number of Stories") {
      return label === "Lot Size" 
        ? `${value.toLocaleString()} sq ft`
        : value.toLocaleString();
    } else if (
      label === "Mortgage Balance" ||
      label === "Last Sale Price" ||
      label === "Assessed Value" ||
      label === "Estimated Value" ||
      label === "Estimated Equity"
    ) {
      return value.toLocaleString('en-US', {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }
    return value.toLocaleString();
  };

  return (
    <div className="col-span-2">
      <label className="text-sm block mb-1">
        {label}: {formatDisplayValue(values[0])} – {formatDisplayValue(values[1])}
      </label>
      <Range
        values={values}
        step={step}
        min={min}
        max={max}
        onChange={(updatedValuesFromReactRange: number[]) => {
          if (Array.isArray(updatedValuesFromReactRange) && updatedValuesFromReactRange.length === 2) {
            onChange(updatedValuesFromReactRange as [number, number]);
          } else {
            console.warn("Range onChange callback provided an unexpected value:", updatedValuesFromReactRange);
          }
        }}
        renderTrack={({ props: trackProps, children }) => (
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
        )}
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