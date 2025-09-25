'use client';

import React from 'react';

interface FullWidthFeatureTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  imageAlt: string;
  gradient: string;
  badge?: string;
  border?: string;
  textColor?: string;
  imagePosition?: string;
}

const FullWidthFeatureTile: React.FC<FullWidthFeatureTileProps> = ({
  title,
  description,
  icon,
  image,
  imageAlt,
  gradient,
  badge,
  border,
  textColor = 'text-gray-900',
  imagePosition = 'object-top'
}) => {
  return (
    <div 
      className={`w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 p-8 lg:p-10 ${border || ''}`}
      style={{ background: gradient !== 'white' ? gradient : '#f3f4f6' }}
    >
      {/* Large Full-Width Image Section - Natural Colors */}
      <div className="relative h-80 lg:h-96 overflow-hidden rounded-2xl shadow-lg bg-white mb-6">
        <img
          src={image}
          alt={imageAlt}
          className={`w-full h-full object-cover ${imagePosition}`}
          style={{
            imageRendering: 'auto',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
        
        {/* Badge positioned in top-right corner */}
        {badge && (
          <div className="absolute top-4 right-4">
            <span className="bg-white/95 backdrop-blur-sm text-gray-800 text-sm px-4 py-2 rounded-full font-medium shadow-lg">
              {badge}
            </span>
          </div>
        )}
      </div>

      {/* Content Section Below Image */}
      <div className="flex items-center gap-4 mb-4">
        <div 
          className="p-3 rounded-xl flex items-center justify-center shadow-lg bg-white/20 backdrop-blur-sm"
        >
          <div 
            className="w-6 h-6"
            style={{ color: textColor === 'text-white' ? 'white' : textColor === 'text-black' ? '#1f2937' : 'white' }}
          >
            {icon}
          </div>
        </div>
        <h2 
          className="text-3xl lg:text-4xl font-bold"
          style={{ color: textColor === 'text-white' ? 'white' : textColor === 'text-black' ? '#1f2937' : 'white' }}
        >
          {title}
        </h2>
      </div>
      
      <p 
        className="text-lg lg:text-xl leading-relaxed max-w-3xl"
        style={{ 
          color: textColor === 'text-white' ? 'rgba(255,255,255,0.9)' : 
                 textColor === 'text-black' ? 'rgba(31,41,55,0.8)' : 
                 'rgba(255,255,255,0.9)' 
        }}
      >
        {description}
      </p>
    </div>
  );
};

export default FullWidthFeatureTile;