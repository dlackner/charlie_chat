/*
 * CHARLIE2 V2 - Mobile Navigation Component
 * Updated navigation menu for V2 application with proper routing to /v2/ paths
 * Features responsive mobile/desktop navigation with dropdown menus
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { SubscriptionModal } from '@/app/components/SubscriptionModal';
import SubscriptionSupportModal from '@/components/ui/SubscriptionSupportModal';
import { hasAccess, canAccessDashboard, canAccessDiscover, canAccessEngage } from '@/lib/v2/accessControl';
import type { UserClass } from '@/lib/v2/accessControl';
import { useTrialStatus } from '@/lib/v2/useTrialStatus';
import TrialEndModal from '@/app/components/TrialEndModal';
import MultiFamilyChatWidget from '@/app/components/help/MultiFamilyChatWidget';
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
  House,
  BarChart3,
  TrendingUp
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  disabled?: boolean;
  submenu?: { name: string; href?: string; action?: () => void; disabled?: boolean; }[];
}

// Note: We'll define navigation inside the component to access handleSignOut

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({});
  const [mouseLeaveTimeout, setMouseLeaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { supabase, user } = useAuth();
  
  // Get search params safely for client-side only
  const [contextParam, setContextParam] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setContextParam(params.get('context'));
    }
  }, [pathname]);

  // Helper function to determine if a navigation item is active
  const isNavItemActive = (item: NavigationItem) => {
    if (item.href === '/' && pathname === '/') return true;
    if (item.href === '/' && pathname !== '/') return false;
    
    // Special handling for property details pages
    if (pathname.startsWith('/discover/property/')) {
      if (contextParam === 'engage' && item.href === '/engage') return true;
      if (contextParam === 'buybox' && item.href === '/discover') return true;
      if (!contextParam && item.href === '/discover') return true;
      return false;
    }
    
    return pathname.startsWith(item.href);
  };
  const { showSubscriptionModal, setShowSubscriptionModal } = useModal();
  const { userClass, showTrialEndModal, setShowTrialEndModal } = useTrialStatus();
  
  // Local state for user class
  const [localUserClass, setLocalUserClass] = useState<string | null>(null);
  
  // Fetch user class directly from profiles table and check trial status
  useEffect(() => {
    if (user?.id && !localUserClass) {
      const fetchUserClassAndCheckTrial = async () => {
        try {
          // Call trial status API endpoint
          const trialResponse = await fetch('/api/trial-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (trialResponse.ok) {
            const { wasExpired, userClass } = await trialResponse.json();
            
            console.log('Trial check response:', { wasExpired, userClass });
            
            // If trial was expired, show modal
            if (wasExpired) {
              console.log('Trial expired, showing modal');
              setShowTrialEndModal(true);
            }
            
            // Set the user class
            if (userClass) {
              console.log('Setting user class to:', userClass);
              setLocalUserClass(userClass);
            }
          } else {
            // Fallback: fetch user class directly from database
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_class')
              .eq('user_id', user.id)
              .single();
              
            if (profile?.user_class) {
              setLocalUserClass(profile.user_class);
            }
          }
        } catch (error) {
          console.error('Error fetching user class and checking trial:', error);
          
          // Fallback: fetch user class directly from database
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_class')
              .eq('user_id', user.id)
              .single();
              
            if (profile?.user_class) {
              setLocalUserClass(profile.user_class);
            }
          } catch (fallbackError) {
            console.error('Error in fallback user class fetch:', fallbackError);
          }
        }
      };
      
      fetchUserClassAndCheckTrial();
    }
  }, [user?.id, supabase, localUserClass]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseLeaveTimeout) {
        clearTimeout(mouseLeaveTimeout);
      }
    };
  }, [mouseLeaveTimeout]);

  // Sign out handler
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      setIsOpen(false);
      setOpenSubmenus({});
      router.push("/");
    }
  };

  // Build navigation based on user permissions
  const buildNavigation = (): NavigationItem[] => {
    const currentUserClass = (localUserClass || userClass) as UserClass;
    
    // If user class is still loading, show all items as enabled to avoid flash of disabled state
    const isLoadingUserClass = !currentUserClass && user?.id;
    
    // If user is not logged in, disable protected items
    const isNotLoggedIn = !user;
    
    // Check if we're on mobile (screen width less than 768px)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Build all navigation items with access control
    const allItems: (NavigationItem & { disabled?: boolean })[] = [
      // Home - now the About/signup page for all users
      {
        name: 'HOME',
        href: '/',
        icon: House,
        disabled: false
      },

      // Dashboard - always show, but control submenu access
      {
        name: 'DASHBOARD',
        href: '/dashboard',
        icon: BarChart3,
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !canAccessDashboard(currentUserClass)),
        submenu: [
          { 
            name: 'Headlines', 
            href: hasAccess(currentUserClass, 'dashboard_headlines') ? '/dashboard/headlines' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_headlines')
          },
          { 
            name: 'Activity Metrics', 
            href: hasAccess(currentUserClass, 'dashboard_metrics') ? '/dashboard/metrics' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_metrics')
          },
          // Hide Pipeline on mobile
          ...(isMobile ? [] : [{ 
            name: 'Pipeline', 
            href: hasAccess(currentUserClass, 'dashboard_pipeline') ? '/dashboard/pipeline' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_pipeline')
          }]),
          { 
            name: 'Community', 
            href: hasAccess(currentUserClass, 'dashboard_community') ? '/dashboard/community' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_community')
          },
          { 
            name: 'Onboarding & Resources', 
            href: hasAccess(currentUserClass, 'dashboard_onboarding') ? '/dashboard/onboarding' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_onboarding')
          }
        ] // Show all submenu items, disabled ones will be greyed out
      },

      // Discover
      {
        name: 'DISCOVER',
        href: '/discover',
        icon: Search,
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !canAccessDiscover(currentUserClass)),
        submenu: [
          { 
            name: 'Property Search', 
            href: hasAccess(currentUserClass, 'discover') ? '/discover' : undefined,
            disabled: !hasAccess(currentUserClass, 'discover')
          },
          { 
            name: 'Buy Box', 
            href: hasAccess(currentUserClass, 'discover_buybox') ? '/discover/buybox' : undefined,
            disabled: !hasAccess(currentUserClass, 'discover_buybox')
          }
        ] // Show all submenu items, disabled ones will be greyed out
      },

      // Engage
      {
        name: 'ENGAGE',
        href: '/engage',
        icon: Users,
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !canAccessEngage(currentUserClass))
      },

      // Fund
      {
        name: 'FUND',
        href: '/fund',
        icon: TrendingUp,
        disabled: isNotLoggedIn,
        submenu: [
          { 
            name: 'Create Submission', 
            href: hasAccess(currentUserClass, 'fund_create') ? '/fund/create' : undefined,
            disabled: !hasAccess(currentUserClass, 'fund_create')
          },
          { 
            name: 'Browse Submissions', 
            href: hasAccess(currentUserClass, 'fund_browse') ? '/fund/browse' : undefined,
            disabled: !hasAccess(currentUserClass, 'fund_browse')
          }
        ]
      },

      // AI Coach
      {
        name: 'AI COACH',
        href: '/ai-coach',
        icon: MessageCircle,
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !hasAccess(currentUserClass, 'ai_coach'))
      },


      // Pricing - always available
      {
        name: 'PRICING',
        href: '/pricing',
        icon: DollarSign,
        disabled: false
      },

      // Account - always available
      {
        name: 'ACCOUNT',
        href: '/account',
        icon: User,
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !hasAccess(currentUserClass, 'account')),
        submenu: [
          { name: 'Profile', href: '/account/profile' },
          { name: 'Subscription', action: () => setShowSubscriptionModal(true) },
          { name: 'Sign Out', action: handleSignOut }
        ]
      }
    ];

    return allItems;
  };

  const navigation = buildNavigation();

  const toggleSubmenu = (itemName: string) => {
    setOpenSubmenus(prev => ({
      // Close all other submenus and toggle the clicked one
      [itemName]: !prev[itemName]
    }));
  };


  const closeAllSubmenus = () => {
    setOpenSubmenus({});
  };

  // Handle delayed mouse leave for dropdown menus
  const handleMouseLeave = () => {
    // Clear any existing timeout
    if (mouseLeaveTimeout) {
      clearTimeout(mouseLeaveTimeout);
    }
    
    // Set a new timeout to close menus after a brief delay
    const timeout = setTimeout(() => {
      closeAllSubmenus();
    }, 300); // 300ms delay allows time to move mouse to submenu
    
    setMouseLeaveTimeout(timeout);
  };

  const handleMouseEnter = () => {
    // Cancel the close timeout when mouse enters the menu area
    if (mouseLeaveTimeout) {
      clearTimeout(mouseLeaveTimeout);
      setMouseLeaveTimeout(null);
    }
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
              src="/MFOS AI Logo.png" 
              alt="Charlie Chat AI" 
              width={160} 
              height={40}
              className="h-10 w-auto"
            />
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = isNavItemActive(item);
              const isSubmenuOpen = openSubmenus[item.name];
              const Icon = item.icon;
              
              return (
                <div key={item.name}>
                  {item.submenu ? (
                    // Items with submenu - show dropdown
                    <>
                      <button
                        onClick={() => !item.disabled && toggleSubmenu(item.name)}
                        disabled={item.disabled}
                        className={`
                          w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors
                          ${item.disabled 
                            ? 'text-gray-400 cursor-not-allowed opacity-50'
                            : isActive 
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
                      {isSubmenuOpen && !item.disabled && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.submenu.map((subItem) => {
                            const isSubActive = subItem.href && pathname === subItem.href;
                            
                            if (subItem.action) {
                              // Action button (like Sign Out)
                              return (
                                <button
                                  key={subItem.name}
                                  onClick={() => {
                                    if (!subItem.disabled) {
                                      subItem.action!();
                                      setIsOpen(false);
                                    }
                                  }}
                                  disabled={subItem.disabled}
                                  className={`
                                    block w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                                    ${subItem.disabled 
                                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                                      : 'text-blue-600 hover:bg-blue-50'
                                    }
                                  `}
                                >
                                  {subItem.name}
                                </button>
                              );
                            }
                            
                            // Regular link or disabled item
                            if (subItem.disabled || !subItem.href) {
                              return (
                                <div
                                  key={subItem.name}
                                  className="block px-3 py-2 rounded-md text-sm text-gray-400 cursor-not-allowed opacity-50"
                                >
                                  {subItem.name}
                                </div>
                              );
                            }
                            
                            return (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
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
                    // Items without submenu - direct link or disabled
                    item.disabled ? (
                      <div
                        className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed opacity-50"
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {item.name}
                      </div>
                    ) : (
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
                    )
                  )}
                </div>
              );
            })}
          </nav>

          {/* Mobile Help Section */}
          <div className="p-4 border-t border-gray-200">
            <MultiFamilyChatWidget />
            
            <div className="text-xs text-gray-500 text-center mt-4">
              Mobile-First Real Estate Platform
            </div>
            <div className="text-xs text-red-500 text-center mt-1">
           {/*}  Debug: userClass = {userClass || 'null'}*/}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation - Horizontal Bar */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 w-48">
              <Image 
                src="/MFOS AI Logo.png" 
                alt="Charlie Chat AI" 
                width={160} 
                height={40}
                className="h-8 w-auto"
              />
              <div className="text-xs text-red-500 mt-1">
             {/* Debug: userClass = {localUserClass || userClass || 'null'}*/}
              </div>
            </div>

            {/* Centered Navigation */}
            <nav className="flex-1 flex justify-center items-center">
              <div className="flex space-x-6">
              {navigation.filter(item => item.name !== 'ACCOUNT' && item.name !== 'PRICING').map((item) => {
                const isActive = isNavItemActive(item);
                const isSubmenuOpen = openSubmenus[item.name];
                const Icon = item.icon;
                
                return (
                  <div 
                    key={item.name} 
                    className="relative"
                    onMouseLeave={handleMouseLeave}
                    onMouseEnter={handleMouseEnter}
                  >
                    {item.submenu ? (
                      // Items with submenu - show dropdown
                      <>
                        <button
                          onClick={() => !item.disabled && toggleSubmenu(item.name)}
                          disabled={item.disabled}
                          className={`
                            flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                            ${item.disabled
                              ? 'text-gray-400 cursor-not-allowed opacity-50'
                              : isActive 
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
                        {isSubmenuOpen && !item.disabled && (
                          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                            {item.submenu.map((subItem) => {
                              const isSubActive = subItem.href && pathname === subItem.href;
                              
                              if (subItem.action) {
                                // Action button (like Sign Out)
                                return (
                                  <button
                                    key={subItem.name}
                                    onClick={() => {
                                      if (!subItem.disabled) {
                                        subItem.action!();
                                        closeAllSubmenus();
                                      }
                                    }}
                                    disabled={subItem.disabled}
                                    className={`
                                      block w-full text-left px-4 py-2 text-sm transition-colors
                                      ${subItem.disabled
                                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                                        : 'text-blue-600 hover:bg-blue-50'
                                      }
                                    `}
                                  >
                                    {subItem.name}
                                  </button>
                                );
                              }
                              
                              // Regular link or disabled item
                              if (subItem.disabled || !subItem.href) {
                                return (
                                  <div
                                    key={subItem.name}
                                    className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed opacity-50"
                                  >
                                    {subItem.name}
                                  </div>
                                );
                              }
                              
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
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
                      // Items without submenu - direct link or disabled
                      item.disabled ? (
                        <div
                          className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed opacity-50"
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {item.name}
                        </div>
                      ) : (
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
                      )
                    )}
                  </div>
                );
              })}
              </div>
            </nav>

            {/* Right-aligned Pricing and Account */}
            <div className="flex-shrink-0 flex space-x-3 items-center justify-end w-48">
              {/* Pricing Button */}
              {(() => {
                const pricingItem = navigation.find(item => item.name === 'PRICING');
                if (!pricingItem) return null;
                
                const isActive = pricingItem.href === '/' ? pathname === '/' : pathname.startsWith(pricingItem.href);
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
                
                const isActive = accountItem.href === '/' ? pathname === '/' : pathname.startsWith(accountItem.href);
                const isSubmenuOpen = openSubmenus[accountItem.name];
                const Icon = accountItem.icon;
                
                return (
                  <div 
                    className="relative"
                    onMouseLeave={handleMouseLeave}
                    onMouseEnter={handleMouseEnter}
                  >
                    {accountItem.submenu ? (
                      <>
                        <button
                          onClick={() => !accountItem.disabled && toggleSubmenu(accountItem.name)}
                          disabled={accountItem.disabled}
                          className={`
                            flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                            ${accountItem.disabled
                              ? 'text-gray-400 cursor-not-allowed opacity-50'
                              : isActive 
                                ? 'text-blue-700 bg-blue-50' 
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }
                          `}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {accountItem.name}
                          <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isSubmenuOpen && !accountItem.disabled && (
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
              
              {/* Help Widget */}
              <MultiFamilyChatWidget />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal 
        isOpen={showSubscriptionModal} 
        onClose={() => setShowSubscriptionModal(false)} 
      />

      {/* Subscription Support Modal */}
      <SubscriptionSupportModal />

      {/* Trial End Modal */}
      <TrialEndModal 
        open={showTrialEndModal} 
        onOpenChange={setShowTrialEndModal} 
      />
    </>
  );
}