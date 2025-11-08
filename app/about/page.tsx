"use client";

import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              About Us
            </h1>
            <div className="text-2xl md:text-3xl font-semibold text-blue-600 mb-8">
              MultifamilyOS.ai
            </div>
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
              Built by Real Estate Operators and AI Technology Innovators
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-2xl md:text-3xl text-white leading-relaxed max-w-6xl mx-auto">
              We're not theorists. We're builders—of businesses, systems, and portfolios.
            </p>
            <p className="text-2xl md:text-3xl text-white leading-relaxed max-w-6xl mx-auto mt-6">
              MultifamilyOS.ai fuses decades of real estate know-how with cutting-edge AI and machine learning software to create the first intelligent operating system built for investors, by people who've actually been in the trenches.
            </p>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Charles Dobens */}
          <div className="mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="text-center lg:text-left">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Charles Dobens
                  </h2>
                  <p className="text-xl text-blue-600 font-semibold mb-8">
                    Co-Founder | Investor, Educator, Deal Architect
                  </p>
                  
                  <div className="text-lg text-gray-700 leading-relaxed space-y-6">
                    <p>
                      Charles is a force in multifamily real estate. Over $50 million in personal transactions. $3 billion in deals guided by his clients. And 45 years of experience bridging law, entrepreneurship, and investing.
                    </p>
                    <p>
                      He's seen every market turn—and he's turned each one into a playbook. As the creator of the original MultifamilyOS training and mentorship program, Charles built a roadmap for thousands of investors to scale with clarity and discipline.
                    </p>
                    <p>
                      In 2023, he launched the groundbreaking Hotel-to-Apartment Conversion Program, helping investors seize one of the most transformative opportunities in today's market.
                    </p>
                  </div>
                  
                  <blockquote className="mt-8 p-6 bg-white rounded-lg shadow-sm border-l-4 border-blue-600">
                    <p className="text-lg italic text-gray-800">
                      "MultifamilyOS.ai is the culmination of everything I've learned—decades of experience, distilled into one system that helps investors build faster, smarter, and with confidence."
                    </p>
                  </blockquote>
                </div>
              </div>
              
              <div className="order-1 lg:order-2">
                <div className="relative mx-auto max-w-md">
                  <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                    <Image
                      src="/team/charles-dobens.jpg"
                      alt="Charles Dobens"
                      width={500}
                      height={500}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daniel Lackner */}
          <div className="mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-1">
                <div className="relative mx-auto max-w-md">
                  <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                    <Image
                      src="/team/daniel-lackner.jpg"
                      alt="Daniel Lackner"
                      width={500}
                      height={500}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              
              <div className="order-2">
                <div className="text-center lg:text-left">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Daniel Lackner
                  </h2>
                  <p className="text-xl text-blue-600 font-semibold mb-8">
                    Co-Founder | AI Visionary, Tech Operator, Innovation Leader
                  </p>
                  
                  <div className="text-lg text-gray-700 leading-relaxed space-y-6">
                    <p>
                      Daniel spent 30+ years helping global software companies grow faster, smarter, and stronger—building the sales and marketing engines that power household-name brands.
                    </p>
                    <p>
                      After decades of leading teams at scale, he turned his focus to AI and emerging technologies, helping early-stage companies punch above their weight by adopting and implementing cutting-edge technology.
                    </p>
                    <p>
                      Now, he's bringing that expertise to MultifamilyOS.ai—leveraging advanced AI, machine learning, and intelligent automation to give individual investors the same cutting-edge technology that Fortune 500 companies use to make data-driven decisions.
                    </p>
                  </div>
                  
                  <blockquote className="mt-8 p-6 bg-white rounded-lg shadow-sm border-l-4 border-blue-600">
                    <p className="text-lg italic text-gray-800">
                      "Technology should do the heavy lifting so investors can focus on building wealth, not spreadsheets."
                    </p>
                  </blockquote>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Together Section */}
      <div className="bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Together
          </h2>
          <div className="text-xl text-white leading-relaxed space-y-6">
            <p>
              We're rewriting the playbook for multifamily investing.
            </p>
            <p>
              We're bringing cutting-edge AI, machine learning automation, and community-sourced capital to individual investors—so you can analyze faster, fund smarter, and scale with the confidence of institutional-grade investors.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}