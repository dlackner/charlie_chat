"use client";


export default function CapitalClubSponsors() {
  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Turn Analysis into Action Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Capital Club: Turn Analysis into Action</h2>
          <div className="text-lg text-gray-700 space-y-4">
            <p>
              As a MultifamilyOS user, you know how to find and analyze great multifamily opportunities. Now, it's time to get those properties funded.
            </p>
            <p>
              The Capital Club connects Professional and Cohort MultifamilyOS users with a network of active investors seeking high-quality opportunities. You bring the property — and together, we bring the capital, expertise, and partnerships to make it real.
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-2 bg-green-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Find and Analyze Deals</h3>
                <p className="text-gray-600 text-sm">
                  Use the MFOS system to identify underperforming or value-add properties. Analyze income, expenses, and returns using the system's built-in tools.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-2 bg-blue-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Submit to the Capital Club</h3>
                <p className="text-gray-600 text-sm">
                  Once your opportunity meets your benchmarks, submit it to the Club for investor review. The Capital Club team validates that it meets Club standards and prepares it for presentation.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-2 bg-purple-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Build Your Ownership Team</h3>
                <p className="text-gray-600 text-sm">
                  If your property advances, you'll become the Program Manager, assembling at least two other members to share in ownership and operations.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-2 bg-orange-500"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Funded</h3>
                <p className="text-gray-600 text-sm">
                  The Capital Club investor community votes on qualified properties. When approved, the Club provides equity support to help you close quickly.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Property Criteria Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Typical Property Criteria</h2>
          <div className="mb-6">
            <p className="text-lg text-gray-700">Capital Club investments generally target:</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-green-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-black mb-2">14–18%</div>
              <div className="text-gray-600 font-medium">IRR</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-green-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-black mb-2">7–9%</div>
              <div className="text-gray-600 font-medium">Cash-on-Cash Return</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-green-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-black mb-2">8%</div>
              <div className="text-gray-600 font-medium">Preferred Return Quarterly</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="w-3 h-3 bg-green-500 rounded-full mb-4"></div>
              <div className="text-3xl font-bold text-black mb-2">5–7 years</div>
              <div className="text-gray-600 font-medium">Hold Period</div>
            </div>

          </div>
          <div className="mt-6">
            <p className="text-gray-600">Properties must meet underwriting and operational standards before being presented to investors. Once your property is funded, ownership and management transition to you and your team.</p>
          </div>
        </div>

        {/* Marketing Responsibilities Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Marketing Responsibilities</h2>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Promote the Club and Build Our Collective Reach</h3>
            <div className="text-lg text-gray-700 space-y-4">
              <p>
                As a Capital Club member, you'll help expand our investor community by spreading the word to your own network of colleagues, friends, and family. The strength of the Club comes from all of us working together — each member expanding awareness and creating more capital connections for everyone.
              </p>
              <p>
                The more the Club grows, the more opportunities we can all pursue.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Ready-Made Marketing Support</h3>
            <div className="text-lg text-gray-700 space-y-4">
              <p>
                You won't have to do it alone. Upon joining, you'll receive professional marketing materials, templates, and email campaigns from the MFOS team. Use them to promote your properties, invite new investors to the Club, and strengthen your presence as a trusted operator.
              </p>
              <p>
                Every new investor you bring strengthens the community — and increases your own potential for future property funding.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}