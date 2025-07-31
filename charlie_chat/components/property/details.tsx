// details.tsx - Property Details Grid Component

'use client';

import type { Listing } from '../ui/listingTypes';

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
        {listing.out_of_state_absentee_owner ? "Yes" : "No"}
      </p>
      <p>
        <strong>Units:</strong> {listing.units_count ?? "N/A"}
      </p>
      <p>
        <strong>Flood Zone Description:</strong>{" "}
        {listing.flood_zone_description ?? "N/A"}
      </p>
      <p>
        <strong>Year Built:</strong> {listing.year_built ?? "N/A"}
      </p>
      <p>
        <strong>MLS Active:</strong> {listing.mls_active ? "Yes" : "No"}
      </p>
      <p>
        <strong>Lot Size:</strong>{" "}
        {listing.lot_square_feet 
          ? `${listing.lot_square_feet.toLocaleString()} sq ft` 
          : "N/A"}
      </p>
      <p>
        <strong>Last Sale Date:</strong> {listing.last_sale_date ?? "N/A"}
      </p>
      <p>
        <strong>Years Owned:</strong> {listing.years_owned ?? "N/A"}
      </p>
      <p>
        <strong>Last Sale Amount:</strong>{" "}
        {listing.last_sale_amount 
          ? `$${Number(listing.last_sale_amount).toLocaleString()}` 
          : "N/A"}
      </p>
    </div>
  );
};