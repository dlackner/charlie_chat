// actions.tsx - Property Action Card Component

'use client';

import { useState } from 'react';
import jsPDF from "jspdf";
import type { Listing } from '../ui/listingTypes';
import { classifyProperty } from '../property/property-classifier';
import { StreetViewImage } from '../ui/StreetViewImage';

interface PropertyActionsProps {
  listing: Listing;
  userClass?: 'trial' | 'charlie_chat' | 'charlie_chat_pro' | 'cohort';
}

export const PropertyActions = ({ listing }: PropertyActionsProps) => {
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  // Helper functions
  const calculateAge = (yearBuilt: number) => {
    return new Date().getFullYear() - yearBuilt;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getInvestmentFlags = (listing: Listing) => {
    const flags = [];
    if (listing.auction) flags.push('Auction');
    if (listing.reo) flags.push('REO');
    if (listing.tax_lien) flags.push('Tax Lien');
    if (listing.pre_foreclosure) flags.push('Pre-Foreclosure');
    if (listing.private_lender) flags.push('Private Lender');
    if (listing.out_of_state_absentee_owner) flags.push('Absentee Owner');
    return flags;
  };

  const handleCardClick = () => {
    setCardSide(cardSide === 'front' ? 'back' : 'front');
  };

  const downloadProfile = (listing: Listing) => {
    const doc = new jsPDF({ orientation: "landscape" });
    const leftX = 10;
    const rightX = 150;
    let startY = 30;

    doc.addImage("/MFOS.png", "PNG", 10, 8, 50, 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const address = listing.address?.address || "No Address";
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(address)}`;
    const centerX = doc.internal.pageSize.getWidth() / 2;
    doc.text(address, centerX, startY, { align: "center" });
    const textWidth = doc.getTextWidth(address);
    const linkX = centerX + textWidth / 2 + 5;
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.textWithLink("View Map", linkX, startY, { url: googleMapsUrl });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");

    startY = 45;

    const classifications = classifyProperty(listing);
    const classificationText = classifications.length > 0
      ? classifications.map(c => c.label).join(", ")
      : "Standard";

    const addSection = (title: string, fields: [string, any][], x: number, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, x, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      fields.forEach(([label, value], i) => {
        doc.text(`${label} ${value}`, x, y + 7 + i * 6);
      });
    };

    addSection("PROPERTY OVERVIEW", [
      ["Property ID:", listing.id],
      ["Classification:", classificationText],
      ["Units:", listing.units_count ?? "N/A"],
      ["Stories:", listing.stories ?? "N/A"],
      ["Year Built:", listing.year_built ?? "N/A"],
      ["Lot Size:", `${listing.lot_square_feet?.toLocaleString()} sq ft`],
      ["Years Owned:", listing.years_owned ?? "N/A"],
    ], leftX, startY);

    addSection("VALUATION & EQUITY", [
      ["Assessed Value:", formatCurrency(listing.assessed_value)],
      ["Estimated Market Value:", formatCurrency(listing.estimated_value)],
      ["Estimated Equity:", formatCurrency(listing.estimated_equity)],
      ["Listing Price:", "Not listed"],
    ], leftX, startY + 54);

    addSection("MORTGAGE & FINANCING", [
      ["Mortgage Balance:", formatCurrency(listing.mortgage_balance)],
      ["Lender:", listing.lender_name ?? "N/A"],
      ["Mortgage Maturity Date:", listing.mortgage_maturing_date ?? "N/A"],
    ], leftX, startY + 89);

    addSection("SALES & TRANSACTION HISTORY", [
      ["Last Sale Date:", listing.last_sale_date ?? "N/A"],
      ["Last Sale Amount:", formatCurrency(listing.last_sale_amount)],
      ["Arms-Length Sale:", listing.last_sale_arms_length ? "Yes" : "No"],
      ["MLS Active:", listing.mls_active ? "Yes" : "No"],
      ["MLS Days on Market:", listing.mls_days_on_market ?? "N/A"],
    ], rightX, startY);

    addSection("FLOOD ZONE INFORMATION", [
      ["Flood Zone:", listing.flood_zone ? "Yes" : "No"],
      ["Flood Zone Description:", listing.flood_zone_description ?? "N/A"],
    ], rightX, startY + 41);

    addSection("OWNERSHIP DETAILS", [
      ["Owner Name:", `${listing.owner_first_name ?? ""} ${listing.owner_last_name ?? ""}`],
      ["Owner Address:", listing.mail_address
        ? `${listing.mail_address.street ?? ""}, ${listing.mail_address.city ?? ""}, ${listing.mail_address.state ?? ""} ${listing.mail_address.zip ?? ""}`
        : "N/A"],

      ["In-State Absentee Owner:", listing.in_state_absentee_owner ? "Yes" : "No"],
      ["Out-of-State Absentee Owner:", listing.out_of_state_absentee_owner ? "Yes" : "No"],
    ], rightX, startY + 66);

    addSection("OTHER INFORMATION", [
      ["Assumable:", listing.assumable ? "Yes" : "No"],
      ["REO:", listing.reo ? "Yes" : "No"],
      ["Auction:", listing.auction ? "Yes" : "No"],
      ["Tax Lien:", listing.tax_lien ? "Yes" : "No"],
      ["Pre Foreclosure:", listing.pre_foreclosure ? "Yes" : "No"],
      ["Private Lender:", listing.private_lender ? "Yes" : "No"],
    ], rightX, startY + 101);

    const safeAddress = (listing.address?.address || "property").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Property_Profile_${safeAddress}.pdf`);
  };

  // Component state
  const investmentFlags = getInvestmentFlags(listing);

  // Card styles matching PropertyCard
  const cardStyles = `
    relative bg-white rounded-lg border shadow-sm transition-all
    border-gray-200 hover:border-gray-300 cursor-pointer
  `;

  return (
    <div 
      className={cardStyles}
      onClick={handleCardClick}
    >
      {/* FRONT SIDE */}
      {cardSide === 'front' && (
        <div className="p-3">
          <div className="flex gap-3">
            {/* Left side - Property details */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    <div className="truncate">
                      {listing.address?.address || listing.address_street || listing.address_full}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {[listing.address_city, listing.address_state, listing.address_zip].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-600 mb-3">
                <div className="flex">
                  <span>Units:&nbsp;</span>
                  <span className="font-medium">{listing.units_count || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span>Built:&nbsp;</span>
                  <span className="font-medium">
                    {listing.year_built ? `${listing.year_built} (${calculateAge(listing.year_built)} years old)` : 'N/A'}
                  </span>
                </div>
                <div className="flex">
                  <span>Assessed:&nbsp;</span>
                  <span className="font-medium text-green-600">{formatCurrency(listing.assessed_value)}</span>
                </div>
                <div className="flex">
                  <span>Est. Equity:&nbsp;</span>
                  <span className="font-medium text-blue-600">{formatCurrency(listing.estimated_equity)}</span>
                </div>
              </div>

              {/* Investment flags */}
              <div className="mb-2 min-h-[24px]">
                {investmentFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {investmentFlags.map(flag => (
                      <span
                        key={flag}
                        className="inline-block px-1 py-0.5 text-xs rounded bg-orange-100 text-orange-800"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Download button */}
              <div className="flex items-center justify-center pt-2 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadProfile(listing);
                  }}
                  className="text-white px-4 py-2 rounded-lg font-medium hover:opacity-80 transition w-full"
                  style={{ backgroundColor: '#1C599F' }}
                >
                  Download Profile
                </button>
              </div>
            </div>

            {/* Right side - Street View */}
            <div className="w-32 flex-shrink-0 min-w-0">
              <StreetViewImage
                address={`${listing.address?.address || listing.address_street || listing.address_full}, ${listing.address_city}, ${listing.address_state}`}
                latitude={listing.latitude}
                longitude={listing.longitude}
                className="h-[120px]"
                width={300}
                height={200}
              />
            </div>
          </div>
        </div>
      )}

      {/* BACK SIDE - Property Details */}
      {cardSide === 'back' && (
        <div className="p-3">
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-800 mb-1">Current Ownership</h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
              <div className="flex">
                <span>Last Sale:&nbsp;</span>
                <span className="font-medium">{formatDate(listing.last_sale_date)}</span>
              </div>
              <div className="flex">
                <span>Years Owned:&nbsp;</span>
                <span className="font-medium">{listing.years_owned || 'N/A'}</span>
              </div>
              <div className="flex">
                <span>Out-of-State Owner:&nbsp;</span>
                <span className="font-medium">{listing.out_of_state_absentee_owner ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex">
                <span>Last Sale Amount:&nbsp;</span>
                <span className="font-medium">{formatCurrency(listing.last_sale_amount)}</span>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-800 mb-1">Property Flags</h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
              <div className="flex">
                <span>Auction:&nbsp;</span>
                <span className="font-medium">{listing.auction ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex">
                <span>REO:&nbsp;</span>
                <span className="font-medium">{listing.reo ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex">
                <span>Tax Lien:&nbsp;</span>
                <span className="font-medium">{listing.tax_lien ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex">
                <span>Pre-Foreclosure:&nbsp;</span>
                <span className="font-medium">{listing.pre_foreclosure ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Download button on back side too */}
          <div className="flex items-center justify-center pt-2 border-t border-gray-100 mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadProfile(listing);
              }}
              className="text-white px-4 py-2 rounded-lg font-medium hover:opacity-80 transition w-full"
              style={{ backgroundColor: '#1C599F' }}
            >
              Download Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
