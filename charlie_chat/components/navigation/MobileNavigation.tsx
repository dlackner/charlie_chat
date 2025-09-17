/*
 * CHARLIE2 V2 - Mobile Navigation Component
 * Updated navigation menu for V2 application with proper routing to /v2/ paths
 * Features responsive mobile/desktop navigation with dropdown menus
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { SubscriptionModal } from '@/app/v2/components/SubscriptionModal';
import { 
  Home, 
  Search, 
  Users, 
  MessageCircle, 
  User, 
  Menu, 
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  LogOut
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  submenu?: { name: string; href?: string; action?: () => void; }[];
}

// Note: We'll define navigation inside the component to access handleSignOut

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({});
  const pathname = usePathname();
  const router = useRouter();
  const { supabase } = useAuth();
  const { showSubscriptionModal, setShowSubscriptionModal } = useModal();

  // Sign out handler
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      setIsOpen(false);
      setOpenSubmenus({});
      router.push("/v2/loginnew");
    }
  };

  const navigation: NavigationItem[] = [
    { 
      name: 'DASHBOARD', 
      href: '/v2/dashboard', 
      icon: Home,
      submenu: [
        { name: 'Metrics', href: '/v2/dashboard/metrics' },
        { name: 'Pipeline', href: '/v2/dashboard/pipeline' },
        { name: 'Community', href: '/v2/dashboard/community' },
        { name: 'Onboarding', href: '/v2/dashboard/onboarding' }
      ]
    },
    { 
      name: 'DISCOVER', 
      href: '/v2/discover', 
      icon: Search,
      submenu: [
        { name: 'Property Search', href: '/v2/discover' },
        { name: 'Buy Box', href: '/v2/discover/buybox' }
      ]
    },
    { 
      name: 'ENGAGE', 
      href: '/v2/engage', 
      icon: Users
    },
    { 
      name: 'AI COACH', 
      href: '/v2/ai-coach', 
      icon: MessageCircle
    },
    { 
      name: 'PRICING', 
      href: '/pricing', 
      icon: DollarSign
    },
    { 
      name: 'ACCOUNT', 
      href: '/account', 
      icon: User,
      submenu: [
        { name: 'Profile', href: '/account/profile' },
        { name: 'Subscription', action: () => setShowSubscriptionModal(true) },
        { name: 'Sign Out', action: handleSignOut }
      ]
    },
  ];

  const toggleSubmenu = (itemName: string) => {
    setOpenSubmenus(prev => ({
      // Close all other submenus and toggle the clicked one
      [itemName]: !prev[itemName]
    }));
  };


  const closeAllSubmenus = () => {
    setOpenSubmenus({});
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white p-3 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40 lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <Image 
              src="/MFOS.png" 
              alt="Charlie Chat AI" 
              width={160} 
              height={40}
              className="h-10 w-auto"
            />
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const isSubmenuOpen = openSubmenus[item.name];
              const Icon = item.icon;
              
              return (
                <div key={item.name}>
                  {item.submenu ? (
                    // Items with submenu - show dropdown
                    <>
                      <button
                        onClick={() => toggleSubmenu(item.name)}
                        className={`
                          w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors
                          ${isActive 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 mr-3" />
                          {item.name}
                        </div>
                        {isSubmenuOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      
                      {/* Submenu */}
                      {isSubmenuOpen && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.submenu.map((subItem) => {
                            const isSubActive = subItem.href && pathname === subItem.href;
                            
                            if (subItem.action) {
                              // Action button (like Sign Out)
                              return (
                                <button
                                  key={subItem.name}
                                  onClick={() => {
                                    subItem.action!();
                                    setIsOpen(false);
                                  }}
                                  className="block w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-blue-600 hover:bg-blue-50"
                                >
                                  {subItem.name}
                                </button>
                              );
                            }
                            
                            // Regular link
                            return (
                              <Link
                                key={subItem.name}
                                href={subItem.href!}
                                onClick={() => setIsOpen(false)}
                                className={`
                                  block px-3 py-2 rounded-md text-sm transition-colors
                                  ${isSubActive 
                                    ? 'bg-blue-100 text-blue-700 font-medium' 
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  }
                                `}
                              >
                                {subItem.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    // Items without submenu - direct link
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Mobile-First Real Estate Platform
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation - Horizontal Bar */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Image 
                src="/MFOS.png" 
                alt="Charlie Chat AI" 
                width={160} 
                height={40}
                className="h-8 w-auto"
              />
            </div>

            {/* Centered Navigation */}
            <nav className="flex-1 flex justify-center">
              <div className="flex space-x-8">
              {navigation.filter(item => item.name !== 'ACCOUNT' && item.name !== 'PRICING').map((item) => {
                const isActive = pathname.startsWith(item.href);
                const isSubmenuOpen = openSubmenus[item.name];
                const Icon = item.icon;
                
                return (
                  <div key={item.name} className="relative">
                    {item.submenu ? (
                      // Items with submenu - show dropdown
                      <>
                        <button
                          onClick={() => toggleSubmenu(item.name)}
                          className={`
                            flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                            ${isActive 
                              ? 'text-blue-700 bg-blue-50' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }
                          `}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {item.name}
                          <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Desktop Dropdown */}
                        {isSubmenuOpen && (
                          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                            {item.submenu.map((subItem) => {
                              const isSubActive = subItem.href && pathname === subItem.href;
                              
                              if (subItem.action) {
                                // Action button (like Sign Out)
                                return (
                                  <button
                                    key={subItem.name}
                                    onClick={() => {
                                      subItem.action!();
                                      closeAllSubmenus();
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm transition-colors text-blue-600 hover:bg-blue-50"
                                  >
                                    {subItem.name}
                                  </button>
                                );
                              }
                              
                              // Regular link
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href!}
                                  onClick={closeAllSubmenus}
                                  className={`
                                    block px-4 py-2 text-sm transition-colors
                                    ${isSubActive 
                                      ? 'bg-blue-50 text-blue-700 font-medium' 
                                      : 'text-gray-700 hover:bg-gray-50'
                                    }
                                  `}
                                >
                                  {subItem.name}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      // Items without submenu - direct link
                      <Link
                        href={item.href}
                        onClick={closeAllSubmenus}
                        className={`
                          flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                          ${isActive 
                            ? 'text-blue-700 bg-blue-50' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }
                        `}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </Link>
                    )}
                  </div>
                );
              })}
              </div>
            </nav>

            {/* Right-aligned Pricing and Account */}
            <div className="flex-shrink-0 flex space-x-6">
              {/* Pricing Button */}
              {(() => {
                const pricingItem = navigation.find(item => item.name === 'PRICING');
                if (!pricingItem) return null;
                
                const isActive = pathname.startsWith(pricingItem.href);
                const Icon = pricingItem.icon;
                
                return (
                  <Link
                    href={pricingItem.href}
                    onClick={closeAllSubmenus}
                    className={`
                      flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive 
                        ? 'text-blue-700 bg-blue-50' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {pricingItem.name}
                  </Link>
                );
              })()}

              {/* Account Button */}
              {(() => {
                const accountItem = navigation.find(item => item.name === 'ACCOUNT');
                if (!accountItem) return null;
                
                const isActive = pathname.startsWith(accountItem.href);
                const isSubmenuOpen = openSubmenus[accountItem.name];
                const Icon = accountItem.icon;
                
                return (
                  <div className="relative">
                    {accountItem.submenu ? (
                      <>
                        <button
                          onClick={() => toggleSubmenu(accountItem.name)}
                          className={`
                            flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                            ${isActive 
                              ? 'text-blue-700 bg-blue-50' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }
                          `}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {accountItem.name}
                          <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isSubmenuOpen && (
                          <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                            {accountItem.submenu.map((subItem) => {
                              const isSubActive = subItem.href && pathname === subItem.href;
                              
                              if (subItem.action) {
                                // Action button (like Sign Out)
                                return (
                                  <button
                                    key={subItem.name}
                                    onClick={() => {
                                      subItem.action!();
                                      closeAllSubmenus();
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm transition-colors text-blue-600 hover:bg-blue-50"
                                  >
                                    {subItem.name}
                                  </button>
                                );
                              }
                              
                              // Regular link
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href!}
                                  onClick={closeAllSubmenus}
                                  className={`
                                    block px-4 py-2 text-sm transition-colors
                                    ${isSubActive 
                                      ? 'bg-blue-50 text-blue-700 font-medium' 
                                      : 'text-gray-700 hover:bg-gray-50'
                                    }
                                  `}
                                >
                                  {subItem.name}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={accountItem.href}
                        onClick={closeAllSubmenus}
                        className={`
                          flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                          ${isActive 
                            ? 'text-blue-700 bg-blue-50' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }
                        `}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {accountItem.name}
                      </Link>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal 
        isOpen={showSubscriptionModal} 
        onClose={() => setShowSubscriptionModal(false)} 
      />
    </>
  );
}