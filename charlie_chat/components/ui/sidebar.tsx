"use client";

import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Range, getTrackBackground } from "react-range";
import { Document, Packer, Paragraph, TextRun, ISpacingProperties, LineRuleType } from 'docx';
import { saveAs } from 'file-saver';
import { createBrowserClient } from '@supabase/ssr';

type Listing = {
  id: string;
  address: {
    street?: string;
    address: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  mailAddress?: {
    address?: string;
    city?: string;
    county?: string;
    state?: string;
    street?: string;
    zip?: string;
  };
  lastSaleArmsLength?: boolean;
  mlsActive?: boolean;
  lastSaleAmount?: number;
  lotSquareFeet?: number;
  yearsOwned?: number;
  outOfStateAbsenteeOwner?: number;
  property_type?: string;
  squareFeet?: number;
  rentEstimate?: number;
  assessedLandValue?: number;
  assessedValue?: number;
  assumable?: boolean;
  auction?: boolean;
  corporate_owned?: boolean;
  estimatedEquity?: number;
  estimatedValue?: number;
  floodZone?: boolean;
  foreclosure?: boolean;
  forSale?: boolean;
  privateLender?: boolean;
  inStateAbsenteeOwner?: boolean;
  investorBuyer?: boolean;
  lastSaleDate?: string;
  lenderName?: string;
  listingPrice?: number;
  mortgageBalance?: number;
  mortgageMaturingDate?: string;
  yearBuilt?: number;
  ownerOccupied?: boolean;
  preForeclosure?: boolean;
  reo?: boolean;
  taxLien?: boolean;
  totalPortfolioEquity?: number;  
  totalPortfolioMortgageBalance?: number; 
  totalPropertiesOwned?: number;
  floodZoneDescription?: string;
  unitsCount?: number;
  owner1FirstName?: string;
  owner1LastName?: string;
  stories?: number;
 };

type Props = {
  onSearch: (filters: Record<string, any>) => Promise<void>;
  listings: Listing[];
  selectedListings: Listing[];
  toggleListingSelect: (listing: Listing) => void;
  onSendToGPT: (filteredListings?: any[]) => void;
  isLoggedIn: boolean;
  triggerAuthModal: () => void;
  onCreditsUpdate?: (newBalance: number) => void;
  userClass: 'trial' | 'charlie_chat' | 'charlie_chat_pro' | 'cohort';
  triggerBuyCreditsModal: () => void
};

export const Sidebar = ({
  onSearch,
  listings,
  selectedListings,
  toggleListingSelect,
  onSendToGPT,
  isLoggedIn: userIsLoggedIn,
  triggerAuthModal,
  onCreditsUpdate,
  userClass,
  triggerBuyCreditsModal
}: Props) => {
  const [zipcode, setZipcode] = useState("");
  const [minUnits, setMinUnits] = useState<number | string>(2);
  const [maxUnits, setMaxUnits] = useState<number | string>("");

  // New state and logic for Select All
const currentSearchListings = listings.slice(0, 50);
const allCurrentSelected = currentSearchListings.every(listing => 
  selectedListings.some(selected => selected.id === listing.id)
);
const someCurrentSelected = selectedListings.length > 0;

const handleSelectAll = () => {
  if (allCurrentSelected) {
    // Deselect all current listings
    currentSearchListings.forEach(listing => {
      if (selectedListings.some(selected => selected.id === listing.id)) {
        toggleListingSelect(listing);
      }
    });
  } else {
    // Select all current listings that aren't already selected
    currentSearchListings.forEach(listing => {
      if (!selectedListings.some(selected => selected.id === listing.id)) {
        toggleListingSelect(listing);
      }
    });
  }
};

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTrialUpgradeMessage, setShowTrialUpgradeMessage] = useState(false);

  const [mlsActive, setMlsActive] = useState("");
  const [radius, setRadius] = useState(5);

  const [street, setStreet] = useState("");
  const [house, setNumber] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  useEffect(() => {
  const hasCity = city.trim() !== "";
  const hasState = stateCode.trim() !== "";
  const hasZip = zipcode.trim() !== "";

  // Rule 1: City requires state
  if (hasCity && !hasState) {
    setLocationError("Tip: State is required when a City is provided.");
    return;
  }

  // Rule 2: If both city and state are not filled, then ZIP is required
  if (!hasCity && !hasState && !hasZip) {
    setLocationError("Tip: Zipcode is required when City and State are not provided.");
    return;
  }

  setLocationError(null);
}, [city, stateCode, zipcode]);


  const [preForeclosure, setPreForeclosure] = useState("");
  const [floodZone, setFloodZone] = useState("");
  const [assumable, setAssumable] = useState("");
  const [lastSaleArmsLength, setLastSaleArmsLength] = useState("");

  // New states for the requested boolean filters
  const [auction, setAuction] = useState("");
  const [reo, setReo] = useState("");
  const [taxLien, setTaxLien] = useState("");
  const [privateLender, setPrivateLender] = useState("");

  const DEFAULT_LAST_SALE_PRICE_RANGE: [number, number] = [0, 10000000];
  const [lastSaleDateRange, setlastSaleDateRange] = useState<[number, number]>([0, 2025]);
  const [lastSalePriceRange, setLastSalePriceRange] = useState<[number, number]>(DEFAULT_LAST_SALE_PRICE_RANGE);
  const DEFAULT_YEAR_RANGE: [number, number] = [1800, 2025];
  const [yearBuiltRange, setYearBuiltRange] = useState<[number, number]>(DEFAULT_YEAR_RANGE);
  const DEFAULT_LOT_SIZE_RANGE: [number, number] = [0, 100000];
  const [lotSizeRange, setLotSizeRange] = useState<[number, number]>(DEFAULT_LOT_SIZE_RANGE);
  const DEFAULT_STORIES_RANGE: [number, number] = [0, 20];
  const [storiesRange, setStoriesRange] = useState<[number, number]>(DEFAULT_STORIES_RANGE);
  const DEFAULT_MORTGAGE_BALANCE_RANGE: [number, number] = [0, 10000000];
  const [mortgageBalanceRange, setMortgageBalanceRange] = useState<[number, number]>(DEFAULT_MORTGAGE_BALANCE_RANGE);
  const DEFAULT_ASSESSED_VALUE_RANGE: [number, number] = [0, 10000000];
  const [assessedValueRange, setAssessedValueRange] = useState<[number, number]>(DEFAULT_ASSESSED_VALUE_RANGE);
  const DEFAULT_ESTIMATED_VALUE_RANGE: [number, number] = [0, 10000000];
  const [estimatedValueRange, setEstimatedValueRange] = useState<[number, number]>(DEFAULT_ESTIMATED_VALUE_RANGE);
  const DEFAULT_ESTIMATED_EQUITY_RANGE: [number, number] = [0, 10000000];
  const [estimatedEquityRange, setEstimatedEquityRange] = useState<[number, number]>(DEFAULT_ESTIMATED_EQUITY_RANGE);
  const DEFAULT_YEARS_OWNED_RANGE: [number, number] = [0, 50];
  const [yearsOwnedRange, setYearsOwnedRange] = useState<[number, number]>(DEFAULT_YEARS_OWNED_RANGE);
  const [ownerLocation, setOwnerLocation] = useState<"any" | "instate" | "outofstate">("any");

  //const [inStateOwner, setInStateOwner] = useState("");
  //const [outOfStateOwner, setOutOfStateOwner] = useState("");
  const [corporateOwned, setCorporateOwned] = useState("");
  const [activeListingIndex, setActiveListingIndex] = useState<number | null>(null);
  const activeListing = activeListingIndex !== null ? listings[activeListingIndex] : null;
  const panelRef = useRef<HTMLDivElement>(null);
  const advancedFiltersToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
const [locationError, setLocationError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [isSearching, setIsSearching] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);

  const renderRange = (
    label: string,
    values: [number, number],
    onValuesChange: (newValues: [number, number]) => void,
    min: number,
    max: number,
    step = 1
  ) => {
    const formatDisplayValue = (value: number, rangeLabel: string): string => {
      if (rangeLabel === "Year Built" || rangeLabel === "Last Sale Date") {
        return value.toString();
      } else if (rangeLabel === "Lot Size") {
        return `${value.toLocaleString()} sq ft`;
      } else if (
        rangeLabel === "Mortgage Balance" ||
        rangeLabel === "Last Sale Price" ||
        rangeLabel === "Assessed Value" ||
        rangeLabel === "Estimated Value" ||
        rangeLabel === "Estimated Equity"
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
          {label}: {formatDisplayValue(values[0], label)} – {formatDisplayValue(values[1], label)}
        </label>
        <Range
          values={values}
          step={step}
          min={min}
          max={max}
          onChange={(updatedValuesFromReactRange: number[]) => {
            if (Array.isArray(updatedValuesFromReactRange) && updatedValuesFromReactRange.length === 2) {
              onValuesChange(updatedValuesFromReactRange as [number, number]);
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
const useClickOutside = (
  panelToCloseRef: React.RefObject<HTMLElement | null>,
  ignoreClickRefs: Array<React.RefObject<HTMLElement | null>>,
  onOutsideClickCallback: () => void
) => {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      for (const ignoreRef of ignoreClickRefs) {
        if (ignoreRef.current && ignoreRef.current.contains(target)) {
          return;
        }
      }
      if (panelToCloseRef.current && !panelToCloseRef.current.contains(target)) {
        onOutsideClickCallback();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [panelToCloseRef, ignoreClickRefs, onOutsideClickCallback]);
};

useClickOutside(
  panelRef,
  [advancedFiltersToggleRef, sidebarRef],
  () => setShowAdvanced(false)
);

  const downloadLetter = async (listing: Listing) => {
    const yourDataPlaceholders = {
      name: "[Your Name]",
      address: "[Your Address]",
      cityStateZip: "[City, State, Zip Code]",
      phone: "[Phone Number]",
      email: "[Email Address]",
    };
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const rawOwnerFirstName = listing.owner1FirstName?.trim();
    const rawOwnerLastName = listing.owner1LastName?.trim();
    let displayOwnerFullName: string | null = null;
    let salutationName = "Property Owner";
    if (rawOwnerFirstName && rawOwnerLastName) {
      displayOwnerFullName = `${rawOwnerFirstName} ${rawOwnerLastName}`;
      salutationName = rawOwnerFirstName;
    } else if (rawOwnerFirstName) {
      displayOwnerFullName = rawOwnerFirstName;
      salutationName = rawOwnerFirstName;
    } else if (rawOwnerLastName) {
      displayOwnerFullName = rawOwnerLastName;
    }
    let finalOwnerMailStreet = "";
    let finalOwnerMailCityStateZip = "";
    if (listing.mailAddress) {
      finalOwnerMailStreet = listing.mailAddress.street || "";
      const city = listing.mailAddress.city;
      const stateAbbr = listing.mailAddress.state;
      const zipCode = listing.mailAddress.zip;
      let cityStateZipParts = [];
      if (city) cityStateZipParts.push(city);
      if (stateAbbr) cityStateZipParts.push(stateAbbr);
      if (zipCode) cityStateZipParts.push(zipCode);
      if (city && stateAbbr && zipCode) {
          finalOwnerMailCityStateZip = `${city}, ${stateAbbr} ${zipCode}`;
      } else if (city && stateAbbr) {
          finalOwnerMailCityStateZip = `${city}, ${stateAbbr}`;
      } else if (city && zipCode) {
          finalOwnerMailCityStateZip = `${city} ${zipCode}`;
      } else {
          finalOwnerMailCityStateZip = cityStateZipParts.join(' ');
      }
      if (!finalOwnerMailStreet && listing.mailAddress.address) {
          const addressParts = listing.mailAddress.address.split(',');
          finalOwnerMailStreet = addressParts[0]?.trim() || "";
          if (addressParts.length > 1 && !finalOwnerMailCityStateZip) {
              finalOwnerMailCityStateZip = addressParts.slice(1).join(',').trim();
          }
      }
   } else if (listing.mailAddress) {
  const { street, address, city, state, zip } = listing.mailAddress;
  finalOwnerMailStreet = street || address || "";
  finalOwnerMailCityStateZip = [city, state, zip].filter(Boolean).join(', ');
}
    if (!finalOwnerMailStreet && !finalOwnerMailCityStateZip && !displayOwnerFullName) {
        finalOwnerMailStreet = "[Owner Address Line 1]";
        finalOwnerMailCityStateZip = "[Owner Address Line 2]";
    } else {
        if (!finalOwnerMailStreet) finalOwnerMailStreet = "[Mail Address: Street]";
        if (!finalOwnerMailCityStateZip) finalOwnerMailCityStateZip = "[Mail Address: City, State, Zip]";
    }
    const propertyStreet = listing.address?.street || "[Property Street]";
    const propertyCity = listing.address?.city || "[Property City]";
    const acquisitionFocusState = listing.address?.state || "[Property's State]";
    const createStyledParagraph = (
      text?: string,
      { bold = false, spaceAfterPt = 2, lineRule = LineRuleType.AUTO, lines = 240, children }: {
        bold?: boolean;
        spaceAfterPt?: number;
        lineRule?: "auto" | "exact" | "atLeast";
        lines?: number;
        children?: TextRun[];
      } = {}
    ): Paragraph => {
      const spacingOptions: ISpacingProperties = {
        after: spaceAfterPt * 20,
        line: lines,
        lineRule: lineRule as "auto" | "exact" | "atLeast",
      };
      return new Paragraph({
        children: children || (text !== undefined ? [new TextRun({ text, bold })] : []),
        spacing: spacingOptions,
      });
    };
    const letterElements: Paragraph[] = [];
    letterElements.push(createStyledParagraph(yourDataPlaceholders.name));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.address));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.cityStateZip));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.phone));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.email, { spaceAfterPt: 12 }));
    letterElements.push(createStyledParagraph(today, { spaceAfterPt: 6 }));
    let addedAnyOwnerInfo = false;
    if (displayOwnerFullName) {
      letterElements.push(createStyledParagraph(displayOwnerFullName));
      addedAnyOwnerInfo = true;
    }
    if (finalOwnerMailStreet && finalOwnerMailStreet !== "[Mail Address: Street]") {
      const spaceAfterStreet = (finalOwnerMailCityStateZip && finalOwnerMailCityStateZip !== "[Mail Address: City, State, Zip]" && finalOwnerMailCityStateZip.trim() !== "") ? 2 : 6;
      letterElements.push(createStyledParagraph(finalOwnerMailStreet, { spaceAfterPt: spaceAfterStreet }));
      addedAnyOwnerInfo = true;
    }
    if (finalOwnerMailCityStateZip && finalOwnerMailCityStateZip !== "[Mail Address: City, State, Zip]" && finalOwnerMailCityStateZip.trim() !== "") {
      letterElements.push(createStyledParagraph(finalOwnerMailCityStateZip, { spaceAfterPt: 6 }));
      addedAnyOwnerInfo = true;
    }
    if (!addedAnyOwnerInfo) {
        letterElements.push(createStyledParagraph("[Property Owner Address Block]", { spaceAfterPt: 6 }));
    }
    letterElements.push(createStyledParagraph(`Dear ${salutationName},`, { spaceAfterPt: 6 }));
    letterElements.push(createStyledParagraph(`I hope this note finds you well. I’m reaching out to express sincere interest in your property located at ${propertyStreet}${propertyCity && propertyCity !== "[Property City]" ? `, ${propertyCity}` : ''}. I focus on acquiring multifamily properties in ${acquisitionFocusState}, and this building stood out due to its location, character, and the strength of the local rental market.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`Whether or not you’ve ever considered selling, I understand that owning and managing multifamily assets can be demanding – especially in today’s environment. Rising operating costs, shifting tenant expectations, and market volatility have prompted many property owners to explore their options.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`I’m not a broker, and this isn’t a listing solicitation. I’m a direct buyer looking to engage in a straightforward, respectful conversation about a potential off-market purchase. My goal is to understand your situation and see if there’s a way to align my interest with your goal – on your timeline.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`In past acquisitions, we’ve structured deals with flexible terms including delayed closings, continued property management, partial seller financing, and even 1031 exchange participation for owners looking to defer capital gains taxes. Depending on your goals, there may be creative options available that help maximize value while minimizing tax exposure.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`If you’d simply like to know what your property might be worth in today’s market, I’d be happy to offer an informal valuation – no pressure, no obligation.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`You can reach me directly at ${yourDataPlaceholders.phone} or ${yourDataPlaceholders.email}. Even if now isn’t the right time, I’d welcome the opportunity to stay in touch.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph(`Wishing you all the best and appreciation for your time.`, { spaceAfterPt: 10 }));
    letterElements.push(createStyledParagraph("Best regards,", { spaceAfterPt: 2 }));
    letterElements.push(new Paragraph({ spacing: { after: 240 } }));
    letterElements.push(createStyledParagraph(yourDataPlaceholders.name, { spaceAfterPt: 2 }));
    const doc = new Document({ sections: [{ properties: {}, children: letterElements }] });
    try {
      const blob = await Packer.toBlob(doc);
      const safePropertyAddress = (propertyStreet || "property").replace(/[^a-zA-Z0-9]/g, "_");
      saveAs(blob, `Marketing_Letter_${safePropertyAddress}.docx`);
    } catch (error) {
      console.error("Error generating .docx file:", error);
      alert("Error generating document. Please try again.");
    }
  };

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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(address, centerX, startY, { align: "center" });
    const textWidth = doc.getTextWidth(address);
    const linkX = centerX + textWidth / 2 + 5;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 238);
    doc.textWithLink("View Map", linkX, startY, { url: googleMapsUrl });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");

    startY = 45;
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
    addSection("PROPERTY OVERVIEW", [["Property ID:", listing.id], ["Units:", listing.unitsCount ?? "N/A"], ["Stories:", listing.stories ?? "N/A"], ["Year Built:", listing.yearBuilt ?? "N/A"], ["Lot Size:", `${listing.lotSquareFeet?.toLocaleString()} sq ft`], ["Years Owned:", listing.yearsOwned ?? "N/A"],], leftX, startY);
    addSection("VALUATION & EQUITY", [["Assessed Value:", formatCurrency(listing.assessedValue)], ["Estimated Market Value:", formatCurrency(listing.estimatedValue)], ["Estimated Equity:", formatCurrency(listing.estimatedValue)], ["Listing Price:", "Not listed"],], leftX, startY + 46);
    addSection("MORTGAGE & FINANCING", [["Mortgage Balance:", formatCurrency(listing.mortgageBalance)], ["Lender:", listing.lenderName ?? "N/A"], ["Mortgage Maturity Date:", listing.mortgageMaturingDate ?? "N/A"],], leftX, startY + 81);
    addSection("SALES & TRANSACTION HISTORY", [["Last Sale Date:", listing.lastSaleDate ?? "N/A"], ["Last Sale Amount:", formatCurrency(listing.lastSaleAmount)], ["Arms-Length Sale:", listing.lastSaleArmsLength ? "Yes" : "No"], ["MLS Active:", listing.mlsActive ? "Yes" : "No"],], rightX, startY);
    addSection("FLOOD ZONE INFORMATION", [["Flood Zone:", listing.floodZone ? "Yes" : "No"], ["Flood Zone Description:", listing.floodZoneDescription ?? "N/A"],], rightX, startY + 35);
    addSection("OWNERSHIP DETAILS", [["Owner Name:", `${listing.owner1FirstName ?? ""} ${listing.owner1LastName ?? ""}`], ["Owner Address:", listing.mailAddress ?? "N/A"], ["In-State Absentee Owner:", listing.inStateAbsenteeOwner ? "Yes" : "No"], ["Out-of-State Absentee Owner:", listing.outOfStateAbsenteeOwner ? "Yes" : "No"],], rightX, startY + 60);
    addSection("OTHER INFORMATION", [["Assumable:", listing.assumable ? "Yes" : "No"], ["REO:", listing.reo ? "Yes" : "No"], ["Auction:", listing.auction ? "Yes" : "No"], ["Tax Lien:", listing.taxLien ? "Yes" : "No"],["Pre Foreclosure:", listing.preForeclosure ? "Yes" : "No"], ["Private Lender:", listing.privateLender ? "Yes" : "No"],], rightX, startY + 95);
    const safeAddress = (listing.address?.address || "property").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Property_Profile_${safeAddress}.pdf`);
  };
const filterRelevantFields = (listing: Listing) => {
  return {
    id: listing.id,
    address: listing.address,
    
    // Property basics
    property_type: listing.property_type,
    unitsCount: listing.unitsCount,
    yearBuilt: listing.yearBuilt,
    squareFeet: listing.squareFeet,
    lotSquareFeet: listing.lotSquareFeet,
    stories: listing.stories,
    
    // Financial data
    estimatedValue: listing.estimatedValue,
    assessedValue: listing.assessedValue,
    lastSaleAmount: listing.lastSaleAmount,
    lastSaleDate: listing.lastSaleDate,
    rentEstimate: listing.rentEstimate,
    
    // Owner & financing
    mortgageBalance: listing.mortgageBalance,
    estimatedEquity: listing.estimatedEquity,
    lenderName: listing.lenderName,
    mortgageMaturingDate: listing.mortgageMaturingDate,
    privateLender: listing.privateLender,
    
    // Owner profile
    owner1FirstName: listing.owner1FirstName,
    owner1LastName: listing.owner1LastName,
    mailAddress: listing.mailAddress,
    yearsOwned: listing.yearsOwned,
    ownerOccupied: listing.ownerOccupied,
    corporate_owned: listing.corporate_owned,
    totalPropertiesOwned: listing.totalPropertiesOwned,
    totalPortfolioEquity: listing.totalPortfolioEquity,
    
    // Distress indicators
    preForeclosure: listing.preForeclosure,
    foreclosure: listing.foreclosure,
    reo: listing.reo,
    auction: listing.auction,
    taxLien: listing.taxLien,
    
    // Market indicators
    mlsActive: listing.mlsActive,
    forSale: listing.forSale,
    floodZone: listing.floodZone,
    lastSaleArmsLength: listing.lastSaleArmsLength,
    investorBuyer: listing.investorBuyer,
    assumable: listing.assumable
  };
};

  const goToPrev = () => {
    if (activeListingIndex !== null && activeListingIndex > 0) {
      setActiveListingIndex(activeListingIndex - 1);
    }
  };

  const goToNext = () => {
    if (activeListingIndex !== null && activeListingIndex < listings.length - 1) {
      setActiveListingIndex(activeListingIndex + 1);
    }
  };

  const resetFilters = () => {
    setZipcode("");
    setMinUnits(2);
    setMaxUnits("");
    setMlsActive("");
    setStreet("");
    setNumber("");
    setCity("");
    setStateCode("");
    setPreForeclosure("");
    setFloodZone("");
    setAssumable("");
    setLastSaleArmsLength("");
    setlastSaleDateRange([0, 2025]);
    setLastSalePriceRange(DEFAULT_LAST_SALE_PRICE_RANGE);
    setYearBuiltRange(DEFAULT_YEAR_RANGE);
    setLotSizeRange(DEFAULT_LOT_SIZE_RANGE);
    setStoriesRange(DEFAULT_STORIES_RANGE);
    setMortgageBalanceRange(DEFAULT_MORTGAGE_BALANCE_RANGE);
    setAssessedValueRange(DEFAULT_ASSESSED_VALUE_RANGE);
    setEstimatedValueRange(DEFAULT_ESTIMATED_VALUE_RANGE);
    setEstimatedEquityRange(DEFAULT_ESTIMATED_EQUITY_RANGE);
    setYearsOwnedRange(DEFAULT_YEARS_OWNED_RANGE);
    setOwnerLocation("any");
    setCorporateOwned("");
    // Reset new filters
    setAuction("");
    setReo("");
    setTaxLien("");
    setPrivateLender("");
  };

const handleSearch = async (filters: Record<string, string | number | boolean>) => {
  if (!userIsLoggedIn) {
    triggerAuthModal(); // ✅ still prompts sign-up for guests
    return;
  }

  // ✨ Location Validation
  const hasCity = city.trim() !== "";
  const hasState = stateCode.trim() !== "";
  const hasZip = zipcode.trim() !== "";

  if (hasCity && !hasState) {
    setLocationError("State is required when City is provided.");
    return;
  }

  if (!(hasCity && hasState) && !hasZip) {
    setLocationError("ZIP Code is required when City and State are not both provided.");
    return;
  }

  setLocationError(null); // ✅ Clear any prior errors

  // 🔍 Continue with search
  setIsSearching(true);
  setCreditsError(null);
    try {
      // Build searchParameters FIRST before anything else
      let searchParameters;
      if (
        zipcode && typeof zipcode === 'string' && zipcode.trim() !== '' &&
        house && typeof house === 'string' && house.trim() !== '' &&
        street && typeof street === 'string' && street.trim() !== ''
      ) {
        // Specific address search
        searchParameters = {
          zip: zipcode,
          house: house,
          street: street,
          propertyType: "MFR",
          ids_only: false,
          obfuscate: false,
          summary: false,
        };
      } else {
        // General search
        const [lastSalePriceMin, lastSalePriceMax] = lastSalePriceRange;
        const [lotSizeMin, lotSizeMax] = lotSizeRange;
        const [storiesMin, storiesMax] = storiesRange;
        const [yearsOwnedMin, yearsOwnedMax] = yearsOwnedRange;
        const [yearBuiltMin, yearBuiltMax] = yearBuiltRange;
        const [mortgageMin, mortgageMax] = mortgageBalanceRange;
        const [assessedMin, assessedMax] = assessedValueRange;
        const [estimatedMin, estimatedMax] = estimatedValueRange;
        const [equityMin, equityMax] = estimatedEquityRange;
        const includeIfChanged = (min: number, max: number, defaultRange: [number, number], keys: [string, string]) =>
          min !== defaultRange[0] || max !== defaultRange[1] ? { [keys[0]]: min, [keys[1]]: max } : {};

        searchParameters = {
          zip: zipcode || undefined,
          city: city || undefined,
          state: stateCode || undefined,
          units_min: minUnits || undefined,
          units_max: maxUnits || undefined,
          propertyType: "MFR",
          mls_active: mlsActive || undefined,
          flood_zone: floodZone || undefined,
          ...includeIfChanged(yearBuiltMin, yearBuiltMax, DEFAULT_YEAR_RANGE, ["year_built_min", "year_built_max"]),
          ...includeIfChanged(lotSizeMin, lotSizeMax, DEFAULT_LOT_SIZE_RANGE, ["lot_size_min", "lot_size_max"]),
          ...includeIfChanged(mortgageMin, mortgageMax, DEFAULT_MORTGAGE_BALANCE_RANGE, ["mortgage_min", "mortgage_max"]),
          ...includeIfChanged(assessedMin, assessedMax, DEFAULT_ASSESSED_VALUE_RANGE, ["assessed_value_min", "assessed_value_max"]),
          ...includeIfChanged(estimatedMin, estimatedMax, DEFAULT_ESTIMATED_VALUE_RANGE, ["value_min", "value_max"]),
          ...includeIfChanged(equityMin, equityMax, DEFAULT_ESTIMATED_EQUITY_RANGE, ["estimated_equity_min", "estimated_equity_max"]),
          ...includeIfChanged(storiesMin, storiesMax, DEFAULT_STORIES_RANGE, ["stories_min", "stories_max"]),
          ...includeIfChanged(yearsOwnedMin, yearsOwnedMax, DEFAULT_YEARS_OWNED_RANGE, ["years_owned_min", "years_owned_max"]),
          ...(lastSalePriceMin !== DEFAULT_LAST_SALE_PRICE_RANGE[0] || lastSalePriceMax !== DEFAULT_LAST_SALE_PRICE_RANGE[1]
            ? { last_sale_price_min: lastSalePriceMin, last_sale_price_max: lastSalePriceMax }
            : {}),
          ...(ownerLocation === "instate" && { in_state_owner: true, out_of_state_owner: false }),
          ...(ownerLocation === "outofstate" && { in_state_owner: false, out_of_state_owner: true }),
          corporate_owned: corporateOwned || undefined,
          last_sale_arms_length: lastSaleArmsLength || undefined,
          assumable: assumable || undefined,
          street: street || undefined,
          house: house || undefined,
          // Add new filters to search parameters
          auction: auction || undefined,
          reo: reo || undefined,
          tax_lien: taxLien || undefined,
          pre_foreclosure: preForeclosure || undefined, // Use the new string-based filter here
          private_lender: privateLender || undefined,
          ids_only: false,
          obfuscate: false,
          summary: false,
        };
      }

      const countResponse = await fetch("/api/realestateapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...searchParameters, ids_only: true }),
      });

      if (!countResponse.ok) {
        const errorText = await countResponse.text();
        console.error("Count API failed:", countResponse.status, errorText);
        setCreditsError("There was a problem with your search. Please try again or adjust your filters.");
        setIsSearching(false);
        return;
      }
      const { ids } = await countResponse.json();
      const totalCount = Array.isArray(ids) ? ids.length : 0;

      if (totalCount === 0) {
        setCreditsError("No properties matched your criteria. Try broadening your filters.");
        await onSearch({ clearResults: true });
        setIsSearching(false);
        return;
      }
      
      if (totalCount > 25) {
        setCreditsError(`Your search returned ${totalCount} properties. Think about your Buy Box and refine your filters to 25 or fewer results.`);
        setIsSearching(false);
        return;
      }

      const { data: newCreditBalance, error: rpcError } = await supabase.rpc(
        "decrement_search_credits",
        {
          amount_to_decrement: totalCount,
        }
      );

if (rpcError) {
  const errorMessage =
    typeof rpcError === "object" && rpcError !== null && "message" in rpcError
      ? String(rpcError.message)
      : String(rpcError);

  //console.log("RPC Error:", errorMessage);

  if (errorMessage.includes("Insufficient credits")) {
    //setCreditsError("You’re out of credits.");

    if (userClass === "trial") {
      setShowTrialUpgradeMessage(true);
    } else {
      triggerBuyCreditsModal();
    }

    setIsSearching(false);
    return;
  }

  setCreditsError("There was a problem with your account. Please log in again.");
  setIsSearching(false);
  return;
} else {
  //console.log("New credit balance:", newCreditBalance);
}
  
      if (onCreditsUpdate && typeof newCreditBalance === "number") {
        onCreditsUpdate(newCreditBalance);
      }
  
      await onSearch(searchParameters);
    } catch (error) {
      console.error("Unexpected error during search handling:", error);
      setCreditsError("A critical error occurred with the search. Please try again later.");
    } finally {
      setIsSearching(false);
    }
    setShowAdvanced(false);
  };

  return(
    <div className="relative flex">
      <div ref={sidebarRef} className="w-[260px] shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col space-y-6 overflow-y-auto h-screen z-20">
        <h2 className="text-lg font-medium text-gray-800">Property Search</h2>

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
          <button
            ref={advancedFiltersToggleRef}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-sm text-blue-700 underline hover:text-blue-900 transition"
          >
            {showAdvanced ? "Hide Advanced Filters" : "Show Advanced Filters"}
          </button>
        </div>

<button
  onClick={() => handleSearch({})}
  id="sidebar-search"
  disabled={isSearching}
  className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out transform hover:scale-105 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 hover:shadow-lg active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
>
  {isSearching ? "Processing..." : "Search"}
</button>

        {creditsError && (
          <p className="text-red-600 text-xs mt-1 text-center">{creditsError}</p>
        )}
{showTrialUpgradeMessage && (
  <div
  className="px-6 py-4 rounded-md cursor-pointer text-center font-light text-lg mt-4 transition bg-black text-white hover:bg-gray-800"
  onClick={() => window.location.href = "/pricing"}
>
  Sorry, but you are out of credits.
  <br />
  <span style={{ textDecoration: "underline", fontWeight: "medium" }}>
    Upgrade now
  </span>{" "}
  to continue your analysis and find your next investment.
</div>
)}
        <div className="flex-1 space-y-2 overflow-y-auto relative">

          {listings.length > 0 && (
  <div className="flex items-center space-x-2 mb-2 px-1">
    <input
      type="checkbox"
      checked={allCurrentSelected}
      ref={ref => {
        if (ref) ref.indeterminate = someCurrentSelected && !allCurrentSelected;
      }}
      onChange={handleSelectAll}
      className="h-4 w-4 accent-blue-600"
    />
    <label className="text-sm text-gray-600">
      Select All ({currentSearchListings.length})
    </label>
  </div>
)}
          {Array.isArray(listings) &&
            listings
              .sort((a, b) => (b.rentEstimate ?? 0) - (a.rentEstimate ?? 0))
              .slice(0, 50)
              .map((listing, i) => {
                const isSelected = selectedListings.some((l: Listing) => l.id === listing.id);
                return (
                  <div
                    key={i}
                    className={`
                      border-2 p-3 rounded text-sm shadow-sm bg-white cursor-pointer transition-all
                      ${isSelected ? "border-blue-600 bg-blue-50" : "border-transparent hover:border-gray-400"}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div onClick={() => setActiveListingIndex(i)} className="flex-1 cursor-pointer" title="Click on address to view property profile & marketing letter. Then check the box & let Charlie analyze it for you!" >
                        <p className="font-medium text-gray-800">
                          {listing.address?.street || "No street info"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 font-mono leading-relaxed">
                          Assessed: ${listing.assessedValue?.toLocaleString() ?? "N/A"}<br />
                          Units: {listing.unitsCount ?? "?"} • Year: {listing.yearBuilt ?? "?"}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleListingSelect(listing)}
                        className="h-5 w-5 mt-1 accent-blue-600"
                      />
                    </div>
                  </div>
                );
              })}
        </div>

        {activeListing && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/20"
            onClick={() => setActiveListingIndex(null)}
          >
            <div
              className="bg-white px-14 py-6 rounded-lg shadow-xl max-w-3xl w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setActiveListingIndex(null)} className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl">×</button>
              <button onClick={goToPrev} disabled={activeListingIndex === 0} className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-100 p-2 rounded-full hover:bg-gray-200"><ChevronLeft className="w-5 h-5 text-gray-700" /></button>
              <button onClick={goToNext} disabled={activeListingIndex === listings.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-100 p-2 rounded-full hover:bg-gray-200"><ChevronRight className="w-5 h-5 text-gray-700" /></button>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">{activeListing.address?.address || "No Address"}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <p><strong>Property ID:</strong> {activeListing.id ?? "N/A"}</p>
                <p><strong>Out-of-State Absentee Owner:</strong> {activeListing.outOfStateAbsenteeOwner ? "Yes" : "No"}</p>
                <p><strong>Units:</strong> {activeListing.unitsCount ?? "N/A"}</p>
                <p><strong>Flood Zone Description:</strong> {activeListing.floodZoneDescription ?? "N/A"}</p>
                <p><strong>Year Built:</strong> {activeListing.yearBuilt ?? "N/A"}</p>
                <p><strong>MLS Active:</strong> {activeListing.mlsActive ? "Yes" : "No"}</p>
                <p><strong>Lot Size:</strong> {activeListing.lotSquareFeet ? `${activeListing.lotSquareFeet.toLocaleString()} sq ft` : "N/A"}</p>
                <p><strong>Last Sale Date:</strong> {activeListing.lastSaleDate ?? "N/A"}</p>
                <p><strong>Years Owned:</strong> {activeListing.yearsOwned ?? "N/A"}</p>
                <p><strong>Last Sale Amount:</strong>{" "}{activeListing.lastSaleAmount ? `$${Number(activeListing.lastSaleAmount).toLocaleString()}` : "N/A"}</p>
              </div>
              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => downloadLetter(activeListing)}
                  className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900
                                       transform transition-all duration-150 ease-in-out
                                       hover:scale-105 active:scale-90
                                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Download Letter 📩
                </button>
                <button
                  onClick={() => downloadProfile(activeListing)}
                  className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900
                                       transform transition-all duration-150 ease-in-out
                                       hover:scale-105 active:scale-90
                                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Download Profile 📄
                </button>
             </div>
            </div>
          </div>
        )}
      </div>

      {selectedListings.length > 0 && (
        <div className="fixed bottom-4 left-4 w-[240px] z-40">
          <div className="p-4 border rounded bg-[#D15834] text-sm shadow text-white">
            <p className="mb-2 font-medium">Add {selectedListings.length} {selectedListings.length === 1 ? "property" : "properties"} to Charlie Chat</p>
            <button 
  onClick={() => {
    const filteredListings = selectedListings.map(listing => filterRelevantFields(listing));
    onSendToGPT(filteredListings);
  }} 
  className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 transition w-full"
>
  Begin Analysis
</button>
          </div>
        </div>
      )}

      {showAdvanced && (
        <div ref={panelRef} className="absolute top-0 left-[260px] w-[440px] h-full bg-white border-r border-gray-200 p-6 shadow-xl z-30 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-gray-800 font-semibold">Advanced Filters</h3>
                <button
                onClick={resetFilters}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 border border-gray-300"
            >
              Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
  <div className="mb-4">
    <label htmlFor="advanced-street-number" className="block text-sm font-medium text-gray-700 mb-1">
      Street Number
    </label>
    <input
      type="text"
      id="advanced-street-number"
      className="w-full border border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:ring-orange-500 focus:border-orange-500"
      placeholder=""
      value={house}
      onChange={e => setNumber(e.target.value)}
    />
  </div>

  <div className="mb-4">
    <label htmlFor="advanced-street-name" className="block text-sm font-medium text-gray-700 mb-1">
      Street Name
    </label>
    <input
      type="text"
      id="advanced-street-name"
      className="w-full border border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:ring-orange-500 focus:border-orange-500"
      placeholder=""
      value={street}
      onChange={e => setStreet(e.target.value)}
    />
  </div>

  <div className="mb-4">
    <label htmlFor="advanced-city" className="block text-sm font-medium text-gray-700 mb-1">
      City
    </label>
    <input
      type="text"
      id="advanced-city"
      className="w-45 border border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:ring-orange-500 focus:border-orange-500"
      placeholder=""
      value={city}
      onChange={e => setCity(e.target.value)}
    />
  </div>

  <div className="mb-4">
    <label htmlFor="advanced-state" className="block text-sm font-medium text-gray-700 mb-1">
      State
    </label>
    <input
      type="text"
      id="advanced-state"
      maxLength={2}
      className="w-16 border border-gray-300 rounded px-3 py-2 text-sm shadow-sm text-center uppercase focus:ring-orange-500 focus:border-orange-500"
      placeholder=""
      value={stateCode}
      onChange={e => setStateCode(e.target.value.toUpperCase())}
    />
  </div>

  <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Location</label>
              <div className="flex rounded-md">
                <button
                  type="button"
                  onClick={() => setOwnerLocation("any")}
                  className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                    ownerLocation === "any" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Any
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerLocation("instate")}
                  className={`relative inline-flex items-center px-8 py-2 -ml-px border border-gray-300 text-sm font-medium ${
                    ownerLocation === "instate" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                   In State
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerLocation("outofstate")}
                  className={`relative inline-flex items-center px-8 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${
                    ownerLocation === "outofstate" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Out of State
                </button>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corporate Owned</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setCorporateOwned("")} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${corporateOwned === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setCorporateOwned("true")} className={`relative inline-flex items-center px-4 py-2 -ml-px border border-gray-300 text-sm font-medium ${corporateOwned === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setCorporateOwned("false")} className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${corporateOwned === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
            {renderRange("Years Owned", yearsOwnedRange, setYearsOwnedRange, 0, 100, 1)}
            {renderRange("Last Sale Price", lastSalePriceRange, setLastSalePriceRange, 0, 10000000, 1)}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Active MLS</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setMlsActive("")} className={`relative inline-flex items-center px-8 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${mlsActive === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setMlsActive("true")} className={`relative inline-flex items-center px-8 py-2 -ml-px border border-gray-300 text-sm font-medium ${mlsActive === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setMlsActive("false")} className={`relative inline-flex items-center px-8 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${mlsActive === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Sale Arms Length</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setLastSaleArmsLength("")} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${lastSaleArmsLength === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setLastSaleArmsLength("true")} className={`relative inline-flex items-center px-4 py-2 -ml-px border border-gray-300 text-sm font-medium ${lastSaleArmsLength === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setLastSaleArmsLength("false")} className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${lastSaleArmsLength === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
          </div>

          <h4 className="text-md font-semibold text-gray-700 mt-6 mb-2">Physical Characteristics</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {renderRange("Year Built", yearBuiltRange, setYearBuiltRange, 1800, 2025)}
            {renderRange("Lot Size", lotSizeRange, setLotSizeRange, 0, 100000)}
            {renderRange("Number of Stories", storiesRange, setStoriesRange, 0, 100)}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flood Zone</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setFloodZone("")} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${floodZone === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setFloodZone("true")} className={`relative inline-flex items-center px-4 py-2 -ml-px border border-gray-300 text-sm font-medium ${floodZone === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setFloodZone("false")} className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${floodZone === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
          </div>

          <h4 className="text-md font-semibold text-gray-700 mt-6 mb-2">Financials</h4>
          <div className="grid grid-cols-2 gap-4">
            {renderRange("Mortgage Balance", mortgageBalanceRange, setMortgageBalanceRange, 0, 10000000, 10000)}
            {renderRange("Assessed Value", assessedValueRange, setAssessedValueRange, 0, 10000000, 10000)}
            {renderRange("Estimated Value", estimatedValueRange, setEstimatedValueRange, 0, 10000000, 10000)}
            {renderRange("Estimated Equity", estimatedEquityRange, setEstimatedEquityRange, 0, 10000000, 10000)}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assumable</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setAssumable("")} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${assumable === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setAssumable("true")} className={`relative inline-flex items-center px-4 py-2 -ml-px border border-gray-300 text-sm font-medium ${assumable === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setAssumable("false")} className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${assumable === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
            {/* New boolean filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auction</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setAuction("")} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${auction === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setAuction("true")} className={`relative inline-flex items-center px-4 py-2 -ml-px border border-gray-300 text-sm font-medium ${auction === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setAuction("false")} className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${auction === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">REO</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setReo("")} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${reo === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setReo("true")} className={`relative inline-flex items-center px-4 py-2 -ml-px border border-gray-300 text-sm font-medium ${reo === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setReo("false")} className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${reo === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Lien</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setTaxLien("")} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${taxLien === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setTaxLien("true")} className={`relative inline-flex items-center px-4 py-2 -ml-px border border-gray-300 text-sm font-medium ${taxLien === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setTaxLien("false")} className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${taxLien === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Foreclosure</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setPreForeclosure("")} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${preForeclosure === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setPreForeclosure("true")} className={`relative inline-flex items-center px-4 py-2 -ml-px border border-gray-300 text-sm font-medium ${preForeclosure === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setPreForeclosure("false")} className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${preForeclosure === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Private Lender</label>
              <div className="flex rounded-md">
                <button type="button" onClick={() => setPrivateLender("")} className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${privateLender === "" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Any</button>
                <button type="button" onClick={() => setPrivateLender("true")} className={`relative inline-flex items-center px-4 py-2 -ml-px border border-gray-300 text-sm font-medium ${privateLender === "true" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>Yes</button>
                <button type="button" onClick={() => setPrivateLender("false")} className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${privateLender === "false" ? 'bg-orange-500 text-white z-10 ring-1 ring-orange-500 border-orange-500' : 'bg-white text-gray-700 hover:bg-gray-50'} focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}>No</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};