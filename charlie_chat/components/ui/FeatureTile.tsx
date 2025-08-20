'use client';

import React from 'react';
import Image from 'next/image';

interface FeatureTileProps {
  title: string;
  icon: React.ReactNode;
  image: string;
  imageAlt: string;
  gradient: string;
  badge?: string;
  border?: string;
  textColor?: string;
}

const FeatureTile: React.FC<FeatureTileProps> = ({
  title,
  icon,
  image,
  imageAlt,
  gradient,
  badge,
  border,
  textColor = 'text-white'
}) => {
  return (
    <div 
      className={`relative flex-shrink-0 w-64 h-80 rounded-2xl p-4 overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 ${border || ''}`}
      style={{ background: gradient }}
    >
      {/* Header with icon and title */}
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <div className={textColor}>
          {icon}
        </div>
        <h3 className={`${textColor} font-semibold text-base`}>
          {title}
        </h3>
        {badge && (
          <span className={`${textColor === 'text-white' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'} text-xs px-2 py-1 rounded-full font-medium`}>
            {badge}
          </span>
        )}
      </div>

      {/* Feature image/screenshot */}
      <div className="absolute bottom-3 left-3 right-3 rounded-lg overflow-hidden shadow-lg" style={{ height: '60%' }}>
        <Image
          src={image}
          alt={imageAlt}
          width={480}
          height={400}
          quality={100}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    </div>
  );
};

export default FeatureTile;