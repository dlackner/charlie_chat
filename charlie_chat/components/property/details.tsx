// details.tsx - Property Details Grid Component

'use client';

import type { Listing } from '../ui/sidebar';

interface PropertyDetailsProps {
  listing: Listing;
}

export const PropertyDetails = ({ listing }: PropertyDetailsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
      <p>
        <strong>Property ID:</strong> {listing.id ?? "N/A"}
      </p>
      <p>
        <strong>Out-of-State Absentee Owner:</strong>{" "}
        {listing.outOfStateAbsenteeOwner ? "Yes" : "No"}
      </p>
      <p>
        <strong>Units:</strong> {listing.unitsCount ?? "N/A"}
      </p>
      <p>
        <strong>Flood Zone Description:</strong>{" "}
        {listing.floodZoneDescription ?? "N/A"}
      </p>
      <p>
        <strong>Year Built:</strong> {listing.yearBuilt ?? "N/A"}
      </p>
      <p>
        <strong>MLS Active:</strong> {listing.mlsActive ? "Yes" : "No"}
      </p>
      <p>
        <strong>Lot Size:</strong>{" "}
        {listing.lotSquareFeet 
          ? `${listing.lotSquareFeet.toLocaleString()} sq ft` 
          : "N/A"}
      </p>
      <p>
        <strong>Last Sale Date:</strong> {listing.lastSaleDate ?? "N/A"}
      </p>
      <p>
        <strong>Years Owned:</strong> {listing.yearsOwned ?? "N/A"}
      </p>
      <p>
        <strong>Last Sale Amount:</strong>{" "}
        {listing.lastSaleAmount 
          ? `$${Number(listing.lastSaleAmount).toLocaleString()}` 
          : "N/A"}
      </p>
    </div>
  );
};