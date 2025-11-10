'use client';

import { X, Crown } from 'lucide-react';

interface CapitalClubDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CapitalClubDetailsModal({ isOpen, onClose }: CapitalClubDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50"
        style={{ 
          background: 'rgba(0, 0, 0, 0.15)', 
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-white mr-3" />
              <h2 className="text-2xl font-bold text-white">Welcome to the MFOS Capital Club</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed mb-6">
                If you're like many driven investors looking to acquire multifamily properties to build lasting wealth and cash flow for your family, you already know a few key truths: multifamily investing is a business, every business runs on capital, and those who master their capital strategy stay in the game and win big.
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-6">
                Over the past 20 years of working with investors, we've discovered one essential principle: finding deals and finding capital must go hand in hand. The most successful investors build their capital relationships early—so when that perfect opportunity comes along, they're ready to move fast and close with confidence.
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-6">
                Multifamily success is also a team sport. From the first letter of intent to closing—and all the way through ownership and eventual sale—it takes a network of skilled professionals working together to bring a deal to life.
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-6">
                That's where The MultifamilyOS™ comes in. This comprehensive system walks you through every stage of the multifamily ownership process, empowering you to operate like a pro and achieve your ultimate goal: building a profitable, sustainable multifamily portfolio.
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-8">
                At the heart of this system is our groundbreaking <strong>MFOS Capital Club</strong>—a powerful community and training hub designed to help you cultivate your investor network and create your own consistent source of capital. With the Capital Club, you'll gain the tools, systems, and confidence to raise funds for your deals like never before.
              </p>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4">Here's how it works.</h3>
              
              <p className="text-gray-700 leading-relaxed mb-6">
                If you're a member of the MFOS Professional or MFOS Cohort program, you're already part of something bigger—you're automatically enrolled in the MFOS Capital Club.
              </p>
              
              <div className="space-y-6">
                <div className="bg-white rounded-lg border-l-4 border-blue-500 p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Find and share great opportunities.</h4>
                  <p className="text-gray-700">
                    Start sourcing potential deals and post them on the MFOS Opportunity Page. Collaborate with fellow members to evaluate, refine, and strengthen your opportunity. Use the collective wisdom of the group to position your deal for success.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg border-l-4 border-purple-500 p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Promote the Club and build our collective reach.</h4>
                  <p className="text-gray-700">
                    As a Capital Club member, you'll help spread the word to your investor network, friends, and family. The power of the Club comes from all of us working together—each member expanding the community and creating more capital connections for everyone.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg border-l-4 border-green-500 p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Bring your deal to life.</h4>
                  <p className="text-gray-700">
                    When your opportunity is ready, the MFOS team will step in to help you promote it, host webinars, and connect you with the right partners to get the deal done.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg border-l-4 border-orange-500 p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Support other investors when you're between deals.</h4>
                  <p className="text-gray-700">
                    Even when you don't have an active opportunity, your participation matters. Offer feedback, share insights, and collaborate with other members. Every contribution strengthens the Club and keeps the momentum going.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg border-l-4 border-indigo-500 p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Get ready-made marketing support.</h4>
                  <p className="text-gray-700">
                    Upon joining, you'll receive professional marketing materials and email templates from the MFOS team. Share them with your network to invite new investors to the Club—because the larger our community grows, the more capital and opportunities we all have access to.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg border-l-4 border-gray-500 p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Understand the deal criteria.</h4>
                  <p className="text-gray-700">
                    Properties eligible for Capital Club funding must meet specific investment characteristics outlined in the MFOS program. If your deal doesn't yet fit those parameters, no problem—you can still pursue alternative funding options such as crowdfunding, Regulation A offerings, private money, or 506(b)/(c) exemptions.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white text-center">
                <div className="text-2xl font-bold text-white mb-2">MultifamilyOS</div>
                <p className="text-lg">The future of multifamily deal-making runs on MultifamilyOS.ai</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}