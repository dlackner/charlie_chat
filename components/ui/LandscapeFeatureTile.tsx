'use client';

import React from 'react';
import Image from 'next/image';

interface LandscapeFeatureTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  imageAlt: string;
  gradient: string;
  badge?: string;
  border?: string;
  textColor?: string;
}

const LandscapeFeatureTile: React.FC<LandscapeFeatureTileProps> = ({
  title,
  description,
  icon,
  image,
  imageAlt,
  gradient,
  badge,
  border,
  textColor = 'text-gray-900'
}) => {
  return (
    <div className={`flex-shrink-0 w-96 bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl ${border || ''}`}>
      {/* Large Image Section - Takes up ~75% of tile */}
      <div className="relative h-64 overflow-hidden">
        <Image
          src={image}
          alt={imageAlt}
          width={600}
          height={400}
          quality={100}
          className="w-full h-full object-cover object-top"
          unoptimized
        />
        
        {/* Subtle gradient overlay for better text readability if needed */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{ background: gradient !== 'white' ? gradient : 'transparent' }}
        />
        
        {/* Badge positioned in top-right corner of image */}
        {badge && (
          <div className="absolute top-3 right-3">
            <span className="bg-white/90 backdrop-blur-sm text-gray-800 text-xs px-3 py-1 rounded-full font-medium shadow-lg">
              {badge}
            </span>
          </div>
        )}
      </div>

      {/* Text Content Section - Below image */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="p-2 rounded-lg flex items-center justify-center"
            style={{ 
              background: gradient !== 'white' ? gradient : '#f3f4f6',
              color: textColor === 'text-white' ? 'white' : '#374151'
            }}
          >
            {icon}
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            {title}
          </h3>
        </div>
        
        <p className="text-gray-600 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default LandscapeFeatureTile;