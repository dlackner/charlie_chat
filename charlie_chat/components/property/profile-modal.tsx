// profile-modal.tsx - Property Profile Modal Component

'use client';

import { PropertyNavigation } from './navigation';
import { PropertyDetails } from './details';
import { PropertyActions } from './actions';

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
  outOfStateAbsenteeOwner?: boolean;
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

interface PropertyProfileModalProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  userClass: 'trial' | 'charlie_chat' | 'charlie_chat_pro' | 'cohort';
}

export const PropertyProfileModal = ({
  listing,
  isOpen,
  onClose,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  userClass
}: PropertyProfileModalProps) => {
  if (!isOpen || !listing) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/20"
      onClick={onClose}
    >
      <div
        className="bg-white px-14 py-6 rounded-lg shadow-xl max-w-3xl w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
        >
          ×
        </button>

        {/* Navigation */}
        <PropertyNavigation
          onPrev={onPrev}
          onNext={onNext}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
        />

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-800 inline">
            {listing.address?.address || "No Address"}
          </h2>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address?.address || "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            View Map
          </a>
        </div>

        {/* Property Details */}
        <PropertyDetails listing={listing} />

        {/* Action Buttons */}
        <PropertyActions 
          listing={listing}
          userClass={userClass}
        />
      </div>
    </div>
  );
};