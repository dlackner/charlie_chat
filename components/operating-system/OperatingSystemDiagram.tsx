/*
 * Operating System Circular Diagram Component
 * EOS-style circular diagram with 5 modules around MANAGE center
 */
'use client';

import { useState, useEffect } from 'react';

const OperatingSystemDiagram = () => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile to disable hover effects
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const modules = [
    {
      id: 'onboard',
      name: 'ONBOARD',
      color: '#93c5fd', // blue-300
      description: 'System initialization and portfolio setup.'
    },
    {
      id: 'discover',
      name: 'DISCOVER',
      color: '#60a5fa', // blue-400
      description: 'AI-powered market analysis and deal discovery.'
    },
    {
      id: 'engage',
      name: 'ENGAGE',
      color: '#3b82f6', // blue-500
      description: 'Marketing automation and stakeholder communication.'
    },
    {
      id: 'fund',
      name: 'FUND',
      color: '#2563eb', // blue-600
      description: 'Community funding of vetted properties.'
    },
    {
      id: 'manage',
      name: 'MANAGE',
      color: '#1d4ed8', // blue-700
      description: 'Portfolio operations and performance monitoring.'
    }
  ];

  const createSlicePath = (index: number, total: number, radius: number, innerRadius: number) => {
    const angle = (2 * Math.PI) / total;
    const startAngle = index * angle - Math.PI / 2; // Start from top
    const endAngle = (index + 1) * angle - Math.PI / 2;
    
    const x1 = Math.cos(startAngle) * radius;
    const y1 = Math.sin(startAngle) * radius;
    const x2 = Math.cos(endAngle) * radius;
    const y2 = Math.sin(endAngle) * radius;
    
    const x3 = Math.cos(endAngle) * innerRadius;
    const y3 = Math.sin(endAngle) * innerRadius;
    const x4 = Math.cos(startAngle) * innerRadius;
    const y4 = Math.sin(startAngle) * innerRadius;
    
    const largeArc = angle > Math.PI ? 1 : 0;
    
    return `M ${x4} ${y4} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`;
  };

  const getTextPosition = (index: number, total: number, radius: number) => {
    const angle = (2 * Math.PI) / total;
    const midAngle = (index + 0.5) * angle - Math.PI / 2;
    const textRadius = radius * 0.75;
    
    return {
      x: Math.cos(midAngle) * textRadius,
      y: Math.sin(midAngle) * textRadius
    };
  };

  return (
    <div className="relative">
      <svg width="100%" height="100%" viewBox="-250 -250 500 500" className="drop-shadow-lg">
        {/* Outer slices */}
        {modules.map((module, index) => {
          const path = createSlicePath(index, modules.length, 230, 120);
          const textPos = getTextPosition(index, modules.length, 230);
          const isHovered = hoveredSlice === module.id;
          
          return (
            <g key={module.id}>
              <path
                d={path}
                fill={module.color}
                stroke="#ffffff"
                strokeWidth="2"
                className={`cursor-pointer transition-all duration-200 ${
                  isHovered ? 'opacity-90 drop-shadow-xl' : 'opacity-90'
                }`}
                onMouseEnter={() => !isMobile && setHoveredSlice(module.id)}
                onMouseLeave={() => !isMobile && setHoveredSlice(null)}
              />
              <text
                x={textPos.x}
                y={textPos.y + 5}
                textAnchor="middle"
                className="fill-white text-lg font-bold pointer-events-none"
                style={{ fontSize: '16px' }}
              >
                {module.name}
              </text>
            </g>
          );
        })}

        {/* Solid blue band around COACHING with gradient shading */}
        <g>
          {/* Define gradient that starts light at ONBOARD and gets dark at MANAGE */}
          <defs>
            <linearGradient id="circularBandGradient" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.9"/>
              <stop offset="25%" stopColor="#2563eb" stopOpacity="0.9"/>
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9"/>
              <stop offset="75%" stopColor="#60a5fa" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.9"/>
            </linearGradient>
          </defs>
          
          {/* Main circular band - rotated so light blue starts at ONBOARD (12 o'clock) */}
          <circle
            cx="0"
            cy="0"
            r="105"
            fill="none"
            stroke="url(#circularBandGradient)"
            strokeWidth="30"
            className="opacity-90"
            transform="rotate(0)"
          />
        </g>

        {/* Center circle for COACHING with background color matching page */}
        <g>
          {/* Shadow circle */}
          <circle
            cx="2"
            cy="2"
            r="90"
            fill="#000000"
            opacity="0.3"
          />
          {/* Main circle - matches bg-gray-900 */}
          <circle
            cx="0"
            cy="0"
            r="90"
            fill="#111827"
            className={`cursor-pointer transition-all duration-200 ${
              hoveredSlice === 'coaching' ? 'opacity-90' : 'opacity-90'
            }`}
            onMouseEnter={() => !isMobile && setHoveredSlice('coaching')}
            onMouseLeave={() => !isMobile && setHoveredSlice(null)}
          />
        </g>

        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white text-xl font-bold pointer-events-none"
          style={{ fontSize: '20px' }}
        >
          COACHING
        </text>
      </svg>
      
      {/* Hover tooltip */}
      {hoveredSlice && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-50">
          <div className="bg-white px-6 py-3 rounded-lg shadow-xl border border-gray-200 max-w-xs">
            <h4 className="font-semibold text-gray-900 mb-1 text-sm">
              {hoveredSlice === 'coaching' ? 'COACHING' : modules.find(m => m.id === hoveredSlice)?.name}
            </h4>
            <p className="text-xs text-gray-600">
              {hoveredSlice === 'coaching' 
                ? 'Personal and AI coaching for strategic guidance and optimization.'
                : modules.find(m => m.id === hoveredSlice)?.description
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatingSystemDiagram;