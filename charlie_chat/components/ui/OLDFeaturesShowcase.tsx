'use client';

import React from 'react';
import FullWidthFeatureTile from './FullWidthFeatureTile';
import { Search, BarChart3, Calculator, MapPin, MessageSquare, GitBranch, Mail, ChevronLeft, ChevronRight } from 'lucide-react';

const FeaturesShowcase = () => {
  const [currentFeatureIndex, setCurrentFeatureIndex] = React.useState(0);

  const goToPrevious = () => {
    setCurrentFeatureIndex((prev) => (prev === 0 ? features.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentFeatureIndex((prev) => (prev === features.length - 1 ? 0 : prev + 1));
  };
  const features = [
    {
      title: "Property Search",
      description: "Find profitable multifamily properties faster with advanced filters and AI-powered analyses",
      icon: <Search size={24} />,
      image: "/feature-images/search.png",
      imageAlt: "Property search interface",
      gradient: "linear-gradient(135deg, #1C599F, #164a87)", // Brand blue
      badge: undefined
    },
    {
      title: "AI Chat Assistant",
      description: "Get instant answers about properties, markets, and investment strategies from your personal AI advisor",
      icon: <MessageSquare size={24} />,
      image: "/feature-images/AI chat.png",
      imageAlt: "AI chat interface",
      gradient: "linear-gradient(135deg, #1C599F, #164a87)", // Brand blue
      badge: undefined,
      imagePosition: "object-bottom"
    },
    {
      title: "Location Intel",
      description: "Unlock neighborhood insights, property details and ownership information to make smarter investment decisions",
      icon: <MapPin size={24} />,
      image: "/feature-images/cards.png",
      imageAlt: "Location intelligence",
      gradient: "linear-gradient(135deg, #1C599F, #164a87)", // Brand blue
      badge: undefined,
      textColor: "text-white"
    },
    {
      title: "Mapping",
      description: "Visualize properties on interactive maps with rent overlays showing investment opportunities",
      icon: <MapPin size={24} />,
      image: "/feature-images/mapping.png",
      imageAlt: "Property mapping interface",
      gradient: "linear-gradient(135deg, #1C599F, #164a87)", // Brand blue
      badge: undefined
    },
    {
      title: "Offer Analytics",
      description: "Calculate precise offers with IRR, Cap Rate, and cash flow projections to maximize your returns",
      icon: <Calculator size={24} />,
      image: "/feature-images/investment.png",
      imageAlt: "Offer analytics tool",
      gradient: "linear-gradient(135deg, #1C599F, #164a87)", // Brand blue
      badge: undefined
    },
    {
      title: "Investment Analysis",
      description: "Generate detailed financial reports and performance metrics for confident investment decisions",
      icon: <BarChart3 size={24} />,
      image: "/feature-images/financial.png",
      imageAlt: "Investment analysis dashboard",
      gradient: "linear-gradient(135deg, #1C599F, #164a87)", // Brand blue
      badge: undefined
    },
    {
      title: "Owner Engagement",
      description: "Create professional LOIs and marketing letters to connect with property owners effectively",
      icon: <Mail size={24} />,
      image: "/feature-images/LOI.png",
      imageAlt: "Owner engagement and LOI functionality",
      gradient: "linear-gradient(135deg, #1C599F, #164a87)", // Brand blue
      badge: undefined
    },
    {
      title: "Pipeline Tracking",
      description: "Manage your entire deal pipeline from initial contact to closing with organized workflows",
      icon: <GitBranch size={24} />,
      image: "/feature-images/pipeline.png",
      imageAlt: "Pipeline tracking interface",
      gradient: "linear-gradient(135deg, #1C599F, #164a87)", // Brand blue
      badge: undefined,
      textColor: "text-white"
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Large heading text */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-light text-gray-900 leading-tight">
            Discover, analyze, and acquire multifamily properties with confidence
          </h2>
        </div>

        {/* Full-Width Feature Display */}
        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
          >
            <ChevronLeft size={20} className="text-gray-800" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
          >
            <ChevronRight size={20} className="text-gray-800" />
          </button>

          {/* Single Full-Width Tile */}
          <div className="w-full flex justify-center">
            <FullWidthFeatureTile
              title={features[currentFeatureIndex].title}
              description={features[currentFeatureIndex].description}
              icon={features[currentFeatureIndex].icon}
              image={features[currentFeatureIndex].image}
              imageAlt={features[currentFeatureIndex].imageAlt}
              gradient={features[currentFeatureIndex].gradient}
              badge={features[currentFeatureIndex].badge}
              border={(features[currentFeatureIndex] as any).border}
              textColor={features[currentFeatureIndex].textColor}
              imagePosition={(features[currentFeatureIndex] as any).imagePosition}
            />
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center mt-8 gap-2">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentFeatureIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  index === currentFeatureIndex
                    ? 'bg-orange-500'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {/* Feature Counter */}
          <div className="text-center mt-4">
            <span className="text-sm text-gray-800">
              {currentFeatureIndex + 1} of {features.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesShowcase;