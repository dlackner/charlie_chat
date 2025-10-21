/*
 * CHARLIE2 V2 - Property Info Sections Component
 * Organized property information display with consistent formatting
 * Used in property detail pages for the new V2 architecture
 */
'use client';

import { Listing } from '@/components/ui/listingTypes';

interface PropertyInfoSectionsProps {
  property: Listing;
}

export const PropertyInfoSections: React.FC<PropertyInfoSectionsProps> = ({ property }) => {
  // Helper function to format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Helper function to format yes/no values
  const formatYesNo = (value: boolean | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value ? 'Yes' : 'No';
  };

  // Helper function to format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Property Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">PROPERTY OVERVIEW</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Units:</span>
              <span className="font-medium">{property.units_count || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stories:</span>
              <span className="font-medium">{property.stories || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Year Built:</span>
              <span className="font-medium">{property.year_built || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lot Size:</span>
              <span className="font-medium">
                {property.lot_square_feet ? `${property.lot_square_feet.toLocaleString()} sq ft` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Square Feet:</span>
              <span className="font-medium">
                {property.square_feet ? `${property.square_feet.toLocaleString()} sq ft` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Years Owned:</span>
              <span className="font-medium">{property.years_owned || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Valuation & Equity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">VALUATION & EQUITY</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Assessed Value:</span>
              <span className="font-medium">{formatCurrency(property.assessed_value)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Market Value:</span>
              <span className="font-medium">{formatCurrency(property.estimated_value)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Equity:</span>
              <span className="font-medium text-green-600">{formatCurrency(property.estimated_equity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Listing Price:</span>
              <span className="font-medium">{formatCurrency(property.listing_price) || 'Not listed'}</span>
            </div>
          </div>
        </div>

        {/* Mortgage & Financing */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">MORTGAGE & FINANCING</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Mortgage Balance:</span>
              <span className="font-medium">{formatCurrency(property.mortgage_balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lender:</span>
              <span className="font-medium">{property.lender_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mortgage Maturity Date:</span>
              <span className="font-medium">{'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Flood Zone Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">FLOOD ZONE INFORMATION</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Flood Zone:</span>
              <span className="font-medium">{formatYesNo(property.flood_zone)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Flood Zone Description:</span>
              <span className="font-medium">{property.flood_zone_description || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Sales & Transaction History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">SALES & TRANSACTION HISTORY</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Last Sale Date:</span>
              <span className="font-medium">{formatDate(property.last_sale_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Sale Amount:</span>
              <span className="font-medium">{formatCurrency(property.last_sale_amount) || '$0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Arms-Length Sale:</span>
              <span className="font-medium">{formatYesNo(property.last_sale_arms_length)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">MLS Active:</span>
              <span className="font-medium">{formatYesNo(property.mls_active)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">MLS Days on Market:</span>
              <span className="font-medium">{property.mls_days_on_market || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Ownership Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">OWNERSHIP DETAILS</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Owner Name:</span>
              <span className="font-medium">
                {property.owner_first_name && property.owner_last_name 
                  ? `${property.owner_first_name} ${property.owner_last_name}`
                  : property.owner_last_name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Owner Address:</span>
              <span className="font-medium">{property.mail_address_full || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">In-State Absentee Owner:</span>
              <span className="font-medium">{formatYesNo(property.in_state_absentee_owner)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Out-of-State Absentee Owner:</span>
              <span className="font-medium text-orange-600">{formatYesNo(property.out_of_state_absentee_owner)}</span>
            </div>
          </div>
        </div>

        {/* Other Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">OTHER INFORMATION</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Assumable:</span>
              <span className="font-medium">{formatYesNo(property.assumable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">REO:</span>
              <span className="font-medium">{formatYesNo(property.reo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Auction:</span>
              <span className="font-medium">{formatYesNo(property.auction)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pre Foreclosure:</span>
              <span className="font-medium">{formatYesNo(property.pre_foreclosure)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Private Lender:</span>
              <span className="font-medium">{formatYesNo(property.private_lender)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};