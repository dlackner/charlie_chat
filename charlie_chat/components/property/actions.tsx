// actions.tsx - Property Actions/Download Buttons Component

'use client';

import { useState, useEffect } from 'react';
import jsPDF from "jspdf";
import { saveAs } from 'file-saver';
import type { Listing } from '../ui/sidebar';
import { classifyProperty } from '../property/property-classifier';
import { useAuth } from '@/contexts/AuthContext';

interface PropertyActionsProps {
  listing: Listing;
  userClass: 'trial' | 'charlie_chat' | 'charlie_chat_pro' | 'cohort';
}

interface UserProfile {
  first_name: string;
  last_name: string;
  street_address: string;
  city: string;
  state: string;
  zipcode: string;
  phone_number: string;
  business_name?: string;
  job_title?: string;
}

export const PropertyActions = ({ listing }: PropertyActionsProps) => {
  const { user, supabase } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !supabase) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, street_address, city, state, zipcode, phone_number, business_name, job_title")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setUserProfile(data as UserProfile);
      }
    };

    if (user) loadProfile();
  }, [user, supabase]);

  const formatCurrency = (val: number | undefined) =>
    val ? `$${val.toLocaleString()}` : "N/A";

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
      ["Units:", listing.unitsCount ?? "N/A"],
      ["Stories:", listing.stories ?? "N/A"],
      ["Year Built:", listing.yearBuilt ?? "N/A"],
      ["Lot Size:", `${listing.lotSquareFeet?.toLocaleString()} sq ft`],
      ["Years Owned:", listing.yearsOwned ?? "N/A"],
    ], leftX, startY);

    addSection("VALUATION & EQUITY", [
      ["Assessed Value:", formatCurrency(listing.assessedValue)],
      ["Estimated Market Value:", formatCurrency(listing.estimatedValue)],
      ["Estimated Equity:", formatCurrency(listing.estimatedValue)],
      ["Listing Price:", "Not listed"],
    ], leftX, startY + 54);

    addSection("MORTGAGE & FINANCING", [
      ["Mortgage Balance:", formatCurrency(listing.mortgageBalance)],
      ["Lender:", listing.lenderName ?? "N/A"],
      ["Mortgage Maturity Date:", listing.mortgageMaturingDate ?? "N/A"],
    ], leftX, startY + 89);

    addSection("SALES & TRANSACTION HISTORY", [
      ["Last Sale Date:", listing.lastSaleDate ?? "N/A"],
      ["Last Sale Amount:", formatCurrency(listing.lastSaleAmount)],
      ["Arms-Length Sale:", listing.lastSaleArmsLength ? "Yes" : "No"],
      ["MLS Active:", listing.mlsActive ? "Yes" : "No"],
    ], rightX, startY);

    addSection("FLOOD ZONE INFORMATION", [
      ["Flood Zone:", listing.floodZone ? "Yes" : "No"],
      ["Flood Zone Description:", listing.floodZoneDescription ?? "N/A"],
    ], rightX, startY + 35);

    addSection("OWNERSHIP DETAILS", [
      ["Owner Name:", `${listing.owner1FirstName ?? ""} ${listing.owner1LastName ?? ""}`],
      ["Owner Address:", listing.mailAddress
        ? `${listing.mailAddress.street ?? ""}, ${listing.mailAddress.city ?? ""}, ${listing.mailAddress.state ?? ""} ${listing.mailAddress.zip ?? ""}`
        : "N/A"],

      ["In-State Absentee Owner:", listing.inStateAbsenteeOwner ? "Yes" : "No"],
      ["Out-of-State Absentee Owner:", listing.outOfStateAbsenteeOwner ? "Yes" : "No"],
    ], rightX, startY + 60);

    addSection("OTHER INFORMATION", [
      ["Assumable:", listing.assumable ? "Yes" : "No"],
      ["REO:", listing.reo ? "Yes" : "No"],
      ["Auction:", listing.auction ? "Yes" : "No"],
      ["Tax Lien:", listing.taxLien ? "Yes" : "No"],
      ["Pre Foreclosure:", listing.preForeclosure ? "Yes" : "No"],
      ["Private Lender:", listing.privateLender ? "Yes" : "No"],
    ], rightX, startY + 95);

    const safeAddress = (listing.address?.address || "property").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Property_Profile_${safeAddress}.pdf`);
  };

  return (
    <div className="mt-6 flex gap-4">
      <button
        onClick={() => downloadProfile(listing)}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900
                   transform transition-all duration-150 ease-in-out
                   hover:scale-105 active:scale-90
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
      >
        Download Profile 📄
      </button>
    </div>
  );
};
