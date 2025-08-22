"use client";

import FeaturesShowcase from '@/components/ui/FeaturesShowcase';
import TypewriterChatDemo from '@/components/ui/TypewriterChatDemo';

export default function LoginPage() {

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content - Canva Style */}
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          {/* Charlie Image */}
          <div className="mb-8">
            <img
              src="/charlie.png"
              alt="Charlie"
              className="w-32 h-32 mx-auto rounded-full shadow-lg border-4 border-white"
            />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-light text-gray-900 mb-4">
            Let's find your next <span className="text-orange-500">great multifamily investment</span>
          </h1>
          
          <div className="mb-16 max-w-2xl mx-auto">
            <p className="text-lg text-gray-900 mb-4">
              With Charlie Chat, you can search our database of every multifamily property in the United States, use AI to identify the best ones, conduct rigorous investment analyses, generate marketing letters and LOI's, and track your favorites every step of the way. I'm here to help you make smarter real estate investment decisions.
            </p>
            <p className="text-right text-gray-800 italic">
              -- Charles Dobens
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Chat Demo */}
      <div className="px-6 pb-8">
        <TypewriterChatDemo />
      </div>

      {/* Features Showcase */}
      <FeaturesShowcase />
    </div>
  );
}