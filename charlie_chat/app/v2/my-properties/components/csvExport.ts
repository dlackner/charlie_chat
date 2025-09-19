// components/csvExport.ts
import { CompleteSavedProperty as SavedProperty } from '../types';

export const exportPropertiesToCSV = (
  properties: SavedProperty[],
  selectedPropertyIds: Set<string>,
  onError?: (message: string) => void
) => {
  if (selectedPropertyIds.size === 0) {
    if (onError) {
      onError("Please select at least one property to download.");
    } else {
      console.warn("CSV Export: Please select at least one property to download.");
    }
    return;
  }

  // Get the selected properties
  const selectedProps = properties.filter(p =>
    selectedPropertyIds.has(p.property_id)
  );

  // ALL 59 Supabase fields plus calculated fields
  const csvHeaders = [
    // Core identifiers
    'ID',
    'Property ID',

    // Property address
    'Address Street',
    'Address Full',
    'Address City',
    'Address State',
    'Address Zip',
    'Latitude',
    'Longitude',

    // Mailing address
    'Mail Address Full',
    'Mail Address Street',
    'Mail Address City',
    'Mail Address County',
    'Mail Address State',
    'Mail Address Zip',

    // Property details
    'Property Type',
    'Units Count',
    'Stories',
    'Year Built',
    'Property Age (Calculated)', // Calculated field
    'Square Feet',
    'Lot Square Feet',
    'Flood Zone',
    'Flood Zone Description',

    // Financial data
    'Assessed Value',
    'Assessed Land Value',
    'Estimated Value',
    'Estimated Equity',
    'Rent Estimate',
    'Listing Price',
    'Mortgage Balance',
    'Mortgage Maturing Date',
    'Value Per Unit (Calculated)', // Calculated field

    // Sale history
    'Last Sale Date',
    'Last Sale Amount',
    'Last Sale Arms Length',
    'Years Owned',

    // Property status
    'MLS Active',
    'For Sale',
    'Assumable',
    'Auction',
    'REO',
    'Tax Lien',
    'Pre Foreclosure',
    'Foreclosure',
    'Private Lender',

    // Owner information
    'Owner First Name',
    'Owner Last Name',
    'Out of State Absentee Owner',
    'In State Absentee Owner',
    'Owner Occupied',
    'Corporate Owned',
    'Investor Buyer',
    'Lender Name',

    // Portfolio data
    'Total Portfolio Equity',
    'Total Portfolio Mortgage Balance',
    'Total Properties Owned',

    // Metadata
    'Created At',
    'Updated At',
    'Notes',
    'Saved At',

    // Skip Trace
    'Skip Trace Name',
    'Skip Trace Age',
    'Skip Trace Gender',
    'Skip Trace Occupation',
    'Skip Trace Phone 1',
    'Skip Trace Phone 2',
    'Skip Trace Email',
    'Skip Trace Current Address',
    'Skip Trace Run Date'
  ];

  // Helper functions
  const calculateAge = (yearBuilt: number) => {
    return yearBuilt ? new Date().getFullYear() - yearBuilt : '';
  };

  const calculateValuePerUnit = (property: SavedProperty) => {
    const value = property.assessed_value || property.estimated_value || 0;
    return property.units_count > 0 ? Math.round(value / property.units_count) : 0;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount || amount === 0) return '';
    return `${amount.toLocaleString()}`;
  };

  const formatBoolean = (value: boolean | null | undefined) => {
    if (value === null || value === undefined) return '';
    return value ? 'Yes' : 'No';
  };

  const escapeCSV = (value: any) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Convert properties to CSV rows
  const csvRows = selectedProps.map(property => {
    // Access mail address properties from flat fields
    const getMailAddress = (field: string) => {
      const fieldMap: { [key: string]: string | undefined } = {
        street: property.mail_address_street,
        city: property.mail_address_city,
        state: property.mail_address_state,
        zip: property.mail_address_zip
      };
      return fieldMap[field] || '';
    };

    return [
      // Core identifiers
      escapeCSV(property.id || ''),
      escapeCSV(property.property_id || ''),

      // Property address
      escapeCSV(property.address_street || ''),
      escapeCSV(property.address_full || ''),
      escapeCSV(property.address_city || ''),
      escapeCSV(property.address_state || ''),
      escapeCSV(property.address_zip || ''),
      escapeCSV(property.latitude || ''),
      escapeCSV(property.longitude || ''),

      // Mailing address
      escapeCSV(property.mail_address_full || ''),
      escapeCSV(property.mail_address_street || getMailAddress('street')),
      escapeCSV(property.mail_address_city || getMailAddress('city')),
      escapeCSV(property.mail_address_county || ''),
      escapeCSV(property.mail_address_state || getMailAddress('state')),
      escapeCSV(property.mail_address_zip || getMailAddress('zip')),

      // Property details
      escapeCSV(property.property_type || ''),
      escapeCSV(property.units_count || ''),
      escapeCSV(property.stories || ''),
      escapeCSV(property.year_built || ''),
      escapeCSV(calculateAge(property.year_built)),
      escapeCSV(property.square_feet || ''),
      escapeCSV(property.lot_square_feet || ''),
      escapeCSV(property.flood_zone || ''),
      escapeCSV(property.flood_zone_description || ''),

      // Financial data
      escapeCSV(formatCurrency(property.assessed_value)),
      escapeCSV(formatCurrency(property.assessed_land_value)),
      escapeCSV(formatCurrency(property.estimated_value)),
      escapeCSV(formatCurrency(property.estimated_equity)),
      escapeCSV(formatCurrency(property.rent_estimate)),
      escapeCSV(formatCurrency(property.listing_price)),
      escapeCSV(formatCurrency(property.mortgage_balance)),
      escapeCSV(formatDate(property.mortgage_maturing_date)),
      escapeCSV(formatCurrency(calculateValuePerUnit(property))),

      // Sale history
      escapeCSV(formatDate(property.last_sale_date)),
      escapeCSV(formatCurrency(property.last_sale_amount)),
      escapeCSV(formatBoolean(property.last_sale_arms_length)),
      escapeCSV(property.years_owned || ''),

      // Property status
      escapeCSV(formatBoolean(property.mls_active)),
      escapeCSV(formatBoolean(property.for_sale)),
      escapeCSV(formatBoolean(property.assumable)),
      escapeCSV(formatBoolean(property.auction)),
      escapeCSV(formatBoolean(property.reo)),
      escapeCSV(formatBoolean(property.tax_lien)),
      escapeCSV(formatBoolean(property.pre_foreclosure)),
      escapeCSV(formatBoolean(property.foreclosure)),
      escapeCSV(formatBoolean(property.private_lender)),

      // Owner information
      escapeCSV(property.owner_first_name || ''),
      escapeCSV(property.owner_last_name || ''),
      escapeCSV(formatBoolean(property.out_of_state_absentee_owner)),
      escapeCSV(formatBoolean(property.in_state_absentee_owner)),
      escapeCSV(formatBoolean(property.owner_occupied)),
      escapeCSV(formatBoolean(property.corporate_owned)),
      escapeCSV(formatBoolean(property.investor_buyer)),
      escapeCSV(property.lender_name || ''),

      // Portfolio data
      escapeCSV(formatCurrency(property.total_portfolio_equity)),
      escapeCSV(formatCurrency(property.total_portfolio_mortgage_balance)),
      escapeCSV(property.total_properties_owned || ''),

      // Metadata
      escapeCSV(formatDate(property.created_at)),
      escapeCSV(formatDate(property.updated_at)),
      escapeCSV(property.notes || ''),
      escapeCSV(formatDate(property.saved_at)),

      // Skip Trace - FIXED: Access from property.skipTraceData instead of property.mailAddress.skipTraceData
      escapeCSV(property.skipTraceData?.name || ''),
      escapeCSV(property.skipTraceData?.age || ''),
      escapeCSV(property.skipTraceData?.gender || ''),
      escapeCSV(property.skipTraceData?.occupation || ''),
      escapeCSV(property.skipTraceData?.phone1Label || property.skipTraceData?.phone1 || ''),
      escapeCSV(property.skipTraceData?.phone2Label || property.skipTraceData?.phone2 || ''),
      escapeCSV(property.skipTraceData?.email || ''),
      escapeCSV(property.skipTraceData?.currentAddress || ''),
      escapeCSV(formatDate(property.skipTraceData?.skipTracedAt)),

    ].join(',');
  });

  // Combine headers and rows
  const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `my-properties-complete-${today}.csv`;

    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }
};