// profile-modal.tsx - Property Profile Modal Component

'use client';

import { PropertyNavigation } from './navigation';
import { PropertyDetails } from './details';
import { PropertyActions } from './actions';
import { Listing } from '../ui/listingTypes';

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
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${listing.latitude || 0},${listing.longitude || 0}&heading=0&pitch=0&fov=90`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            View Property
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