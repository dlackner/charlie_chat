'use client';

import { useState, useEffect } from 'react';

interface StreetViewImageProps {
  address: string;
  latitude?: number;
  longitude?: number;
  className?: string;
  width?: number;
  height?: number;
}

export const StreetViewImage: React.FC<StreetViewImageProps> = ({
  address,
  latitude,
  longitude,
  className = '',
  width = 400,
  height = 300
}) => {
  const [imageError, setImageError] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasImagery, setHasImagery] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Check Street View image by fetching it and checking file size
  useEffect(() => {
    const checkStreetViewImage = async () => {
      if (!apiKey || apiKey === 'your_google_api_key_here') {
        setIsChecking(false);
        return;
      }

      try {
        const streetViewImageUrl = generateStreetViewImageUrl(width, height);
        
        const response = await fetch(streetViewImageUrl);
        const contentLength = response.headers.get('content-length');
        const fileSizeKB = contentLength ? parseInt(contentLength) / 1024 : 0;
        
        // If file size is small (< 5KB), it's likely Google's "no imagery" placeholder
        if (fileSizeKB < 5) {
          setHasImagery(false);
        } else {
          // Create object URL for the image
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
          setHasImagery(true);
        }
      } catch (error) {
        console.log('Error checking Street View image:', error);
        setImageError(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkStreetViewImage();

    // Cleanup object URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [address, latitude, longitude, apiKey, width, height]);

  if (!apiKey || apiKey === 'your_google_api_key_here') {
    return (
      <div className={`bg-gray-100 rounded border p-2 flex items-center justify-center ${className}`}>
        <span className="text-xs text-gray-500">Street View not configured</span>
      </div>
    );
  }

  const generateStreetViewImageUrl = (w: number, h: number) => {
    const baseUrl = 'https://maps.googleapis.com/maps/api/streetview';
    const params = new URLSearchParams({
      size: `${w}x${h}`,
      location: address,
      key: apiKey,
      fov: '90',
      heading: '0',
      pitch: '0'
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  const generateStreetViewMapUrl = () => {
    // If we have imagery confirmed, use Street View mode with coordinates
    if (hasImagery && latitude && longitude) {
      return `https://www.google.com/maps/@${latitude},${longitude},3a,75y,90h,90t/data=!3m4!1e1!3m2!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail`;
    } else {
      // If no imagery confirmed, use map view with address
      const encodedAddress = encodeURIComponent(address);
      return `https://www.google.com/maps/place/${encodedAddress}`;
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const streetViewUrl = generateStreetViewMapUrl();
    window.open(streetViewUrl, '_blank', 'noopener,noreferrer');
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className={`bg-gray-50 rounded border p-2 flex items-center justify-center ${className}`}>
        <span className="text-xs text-gray-400">Loading...</span>
      </div>
    );
  }

  // Show custom message if no imagery is available or if there's an error
  if (!hasImagery || imageError) {
    return (
      <div 
        className={`bg-gray-100 rounded border flex items-center justify-center cursor-pointer hover:bg-gray-200 relative ${className}`}
        onClick={handleImageClick}
        title="Click to open Google Street View"
      >
        <img 
          src="/Google%20Street%20View.png"
          alt="Street View Placeholder"
          className="w-full h-full object-cover rounded"
        />
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span className="text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">Click for street view</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative cursor-pointer ${className}`}>
      <img
        src={imageUrl || generateStreetViewImageUrl(width, height)}
        alt={`Street view of ${address}`}
        className="w-full h-full object-cover rounded border hover:opacity-90 transition-opacity"
        onClick={handleImageClick}
        onError={() => setImageError(true)}
        title="Click to open live Google Street View"
      />
    </div>
  );
};