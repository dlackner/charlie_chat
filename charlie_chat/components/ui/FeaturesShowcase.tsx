'use client';

import React from 'react';
import FeatureTile from './FeatureTile';
import { Search, BarChart3, Calculator, MapPin, MessageSquare, GitBranch, Mail, ChevronLeft, ChevronRight } from 'lucide-react';

const FeaturesShowcase = () => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };
  const features = [
    {
      title: "Property Search",
      description: "Find profitable multifamily properties faster with advanced filters and AI-powered analyses",
      icon: <Search size={24} />,
      image: "/feature-images/search.png",
      imageAlt: "Property search interface",
      gradient: "linear-gradient(135deg, oklch(0.646 0.222 41.116), oklch(0.6 0.2 35))", // Chart-1 based (orange)
      badge: undefined
    },
    {
      title: "AI Chat Assistant",
      description: "Get instant answers about properties, markets, and investment strategies from your personal AI advisor",
      icon: <MessageSquare size={24} />,
      image: "/feature-images/AI chat.png",
      imageAlt: "AI chat interface",
      gradient: "linear-gradient(135deg, oklch(0.21 0.006 285.885), oklch(0.18 0.008 280))", // Primary based
      badge: undefined
    },
    {
      title: "Location Intel",
      description: "Unlock neighborhood insights, demographics, and market trends to make smarter investment decisions",
      icon: <MapPin size={24} />,
      image: "/feature-images/cards.png",
      imageAlt: "Location intelligence",
      gradient: "linear-gradient(135deg, oklch(0.828 0.189 84.429), oklch(0.78 0.17 80))", // Chart-4 based
      badge: undefined,
      textColor: "text-gray-800"
    },
    {
      title: "Mapping",
      description: "Visualize properties on interactive maps with rent overlays showing investment opportunities",
      icon: <MapPin size={24} />,
      image: "/feature-images/mapping.png",
      imageAlt: "Property mapping interface",
      gradient: "linear-gradient(135deg, oklch(0.6 0.118 184.704), oklch(0.55 0.13 180))", // Chart-2 based
      badge: undefined
    },
    {
      title: "Offer Analytics",
      description: "Calculate precise offers with IRR, NPV, and cash flow projections to maximize your returns",
      icon: <Calculator size={24} />,
      image: "/feature-images/investment.png",
      imageAlt: "Offer analytics tool",
      gradient: "linear-gradient(135deg, oklch(0.398 0.07 227.392), oklch(0.35 0.09 230))", // Chart-3 based
      badge: undefined
    },
    {
      title: "Investment Analysis",
      description: "Generate detailed financial reports and performance metrics for confident investment decisions",
      icon: <BarChart3 size={24} />,
      image: "/feature-images/financial.png",
      imageAlt: "Investment analysis dashboard",
      gradient: "linear-gradient(135deg, oklch(0.769 0.188 70.08), oklch(0.72 0.17 65))", // Chart-5 based
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
      gradient: "white",
      badge: undefined,
      border: "border-2 border-teal-500",
      textColor: "text-teal-600"
    }
  ];

  return (
    <section className="py-16 bg-gray-50 overflow-visible">
      <div className="max-w-7xl mx-auto px-6">

        {/* Features Carousel */}
        <div className="relative pt-16">
          {/* Left Arrow */}
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>

          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto overflow-y-visible pb-12 pt-8 scrollbar-hide px-14"
          >
            {features.map((feature, index) => (
              <FeatureTile
                key={index}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                image={feature.image}
                imageAlt={feature.imageAlt}
                gradient={feature.gradient}
                badge={feature.badge}
                border={feature.border}
                textColor={feature.textColor}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesShowcase;