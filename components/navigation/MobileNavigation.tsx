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
  submenu?: { name: string; href?: string; action?: () => void; disabled?: boolean; description?: string; }[];
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

      // Onboard - new section for onboarding and buy box
      {
        name: 'ONBOARD',
        href: '/dashboard/onboarding',
        icon: BarChart3,
        disabled: isNotLoggedIn,
        submenu: [
          { 
            name: 'Onboarding Lessons', 
            href: hasAccess(currentUserClass, 'dashboard_onboarding') ? '/dashboard/onboarding' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_onboarding')
          },
          { 
            name: 'Buy Box', 
            href: hasAccess(currentUserClass, 'discover_buybox') ? '/discover/buybox' : undefined,
            disabled: !hasAccess(currentUserClass, 'discover_buybox')
          }
        ]
      },

      // Discover
      {
        name: 'DISCOVER',
        href: '/discover',
        icon: Search,
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !canAccessDiscover(currentUserClass))
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
          // Hide Create Submission on mobile
          ...(isMobile ? [] : [{ 
            name: 'Create Submission', 
            href: hasAccess(currentUserClass, 'fund_create') ? '/fund/create' : undefined,
            disabled: !hasAccess(currentUserClass, 'fund_create')
          }]),
          { 
            name: 'Browse Submissions', 
            href: hasAccess(currentUserClass, 'fund_browse') ? '/fund/browse' : undefined,
            disabled: !hasAccess(currentUserClass, 'fund_browse')
          },
          { 
            name: 'About', 
            href: '/fund/about',
            disabled: false,
            description: 'Capital Club requirements'
          }
        ]
      },

      // Manage
      {
        name: 'MANAGE',
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
          { 
            name: 'Community', 
            href: hasAccess(currentUserClass, 'dashboard_community') ? '/dashboard/community' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_community')
          }
          // Note: Pipeline is hidden on mobile as requested
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

  // Build desktop two-tier navigation structure
  const buildDesktopNavigation = () => {
    const currentUserClass = (localUserClass || userClass) as UserClass;
    const isLoadingUserClass = !currentUserClass && user?.id;
    const isNotLoggedIn = !user;

    // Top bar items
    const topBarItems = {
      home: { name: 'HOME', href: '/', disabled: false },
      pricing: { name: 'PRICING', href: '/pricing', disabled: false },
      help: { name: 'HELP', action: () => {/* Will add help modal */}, disabled: false },
      account: {
        name: 'ACCOUNT',
        icon: User,
        disabled: isNotLoggedIn,
        submenu: [
          { name: 'Profile', href: '/account/profile' },
          { name: 'Subscription', action: () => setShowSubscriptionModal(true) },
          { name: 'Sign Out', action: handleSignOut }
        ]
      }
    };

    // Main menu bar items (navy bar)
    const mainMenuItems = [
      {
        name: 'ONBOARD',
        submenu: [
          { 
            name: 'Onboarding Lessons', 
            href: hasAccess(currentUserClass, 'dashboard_onboarding') ? '/dashboard/onboarding' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_onboarding'),
            description: 'Learn the platform'
          },
          { 
            name: 'Buy Box', 
            href: hasAccess(currentUserClass, 'discover_buybox') ? '/discover/buybox' : undefined,
            disabled: !hasAccess(currentUserClass, 'discover_buybox'),
            description: 'Set investment criteria'
          }
        ],
        disabled: isNotLoggedIn
      },
      {
        name: 'DISCOVER',
        href: '/discover',
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !canAccessDiscover(currentUserClass))
      },
      {
        name: 'ENGAGE',
        href: '/engage',
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !canAccessEngage(currentUserClass))
      },
      {
        name: 'FUND',
        submenu: [
          { 
            name: 'Create Submission', 
            href: hasAccess(currentUserClass, 'fund_create') ? '/fund/create' : undefined,
            disabled: !hasAccess(currentUserClass, 'fund_create'),
            description: 'Submit your deal for funding'
          },
          { 
            name: 'Browse Submissions', 
            href: hasAccess(currentUserClass, 'fund_browse') ? '/fund/browse' : undefined,
            disabled: !hasAccess(currentUserClass, 'fund_browse'),
            description: 'View investment opportunities'
          },
          { 
            name: 'About', 
            href: '/fund/about',
            disabled: false,
            description: 'Capital Club requirements'
          }
        ],
        disabled: isNotLoggedIn
      },
      {
        name: 'MANAGE',
        submenu: [
          { 
            name: 'Headlines', 
            href: hasAccess(currentUserClass, 'dashboard_headlines') ? '/dashboard/headlines' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_headlines'),
            description: 'Latest news & insights'
          },
          { 
            name: 'Activity Metrics', 
            href: hasAccess(currentUserClass, 'dashboard_metrics') ? '/dashboard/metrics' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_metrics'),
            description: 'Performance dashboard'
          },
          { 
            name: 'Community', 
            href: hasAccess(currentUserClass, 'dashboard_community') ? '/dashboard/community' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_community'),
            description: 'News & Trends'
          },
          { 
            name: 'Pipeline', 
            href: hasAccess(currentUserClass, 'dashboard_pipeline') ? '/dashboard/pipeline' : undefined,
            disabled: !hasAccess(currentUserClass, 'dashboard_pipeline'),
            description: 'Track your deals'
          }
        ],
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !canAccessDashboard(currentUserClass))
      },
      {
        name: 'COACH',
        href: '/ai-coach',
        disabled: isNotLoggedIn || (isLoadingUserClass ? false : !hasAccess(currentUserClass, 'ai_coach'))
      }
    ];

    return { topBarItems, mainMenuItems };
  };

  const desktopNav = buildDesktopNavigation();

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
            <Link href="/">
              <Image 
                src="/MFOS AI Logo.png" 
                alt="MultifamilyOS" 
                width={160} 
                height={40}
                className="h-10 w-auto cursor-pointer"
              />
            </Link>
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
            {user && <MultiFamilyChatWidget />}
            
            <div className="text-xs text-gray-500 text-center mt-4">
              Mobile-First Real Estate Platform
            </div>
            <div className="text-xs text-red-500 text-center mt-1">
           {/*}  Debug: userClass = {userClass || 'null'}*/}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation - Two Tier Structure */}
      <div className="hidden lg:block">
        {/* Top Menu Bar */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14">
              {/* Left side - Logo */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <Image 
                    src="/MFOS AI Logo.png" 
                    alt="MultifamilyOS" 
                    width={160} 
                    height={40}
                    className="h-8 w-auto mr-3 cursor-pointer"
                  />
                  <span className="text-xl font-bold text-blue-600">MultifamilyOS</span>
                </Link>
              </div>

              {/* Right side - Top Menu Items */}
              <div className="flex items-center space-x-6">
                <Link href={desktopNav.topBarItems.home.href} className="text-gray-600 hover:text-blue-600 font-medium text-sm">
                  {desktopNav.topBarItems.home.name}
                </Link>
                <Link href={desktopNav.topBarItems.pricing.href} className="text-gray-600 hover:text-blue-600 font-medium text-sm">
                  {desktopNav.topBarItems.pricing.name}
                </Link>
                {user && <MultiFamilyChatWidget />}
                
                {/* Account Dropdown */}
                <div className="relative" onMouseLeave={handleMouseLeave} onMouseEnter={handleMouseEnter}>
                  <button
                    onClick={() => !desktopNav.topBarItems.account.disabled && toggleSubmenu('ACCOUNT')}
                    disabled={desktopNav.topBarItems.account.disabled}
                    className={`
                      flex items-center text-sm font-medium
                      ${desktopNav.topBarItems.account.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-blue-600'
                      }
                    `}
                  >
                    {desktopNav.topBarItems.account.name}
                    <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${openSubmenus['ACCOUNT'] ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {openSubmenus['ACCOUNT'] && !desktopNav.topBarItems.account.disabled && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-blue-600 z-50">
                      {desktopNav.topBarItems.account.submenu?.map((subItem) => {
                        if (subItem.action) {
                          return (
                            <button
                              key={subItem.name}
                              onClick={() => {
                                subItem.action!();
                                closeAllSubmenus();
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            >
                              {subItem.name}
                            </button>
                          );
                        }
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href!}
                            onClick={closeAllSubmenus}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          >
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Menu Bar (Navy) */}
        <div className="fixed top-14 left-0 right-0 z-30 bg-[#1e2532] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center space-x-0">
              {desktopNav.mainMenuItems.map((item) => {
                const isActive = item.href && (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
                const isSubmenuOpen = openSubmenus[item.name];
                
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
                            text-white hover:bg-blue-600 px-6 py-4 font-medium text-sm flex items-center transition-colors
                            ${item.disabled
                              ? 'text-gray-400 cursor-not-allowed opacity-50'
                              : isActive 
                                ? 'bg-blue-600' 
                                : ''
                            }
                          `}
                        >
                          {item.name}
                          <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Main Menu Dropdown */}
                        {isSubmenuOpen && !item.disabled && (
                          <div className="absolute left-0 mt-0 w-56 bg-white rounded-md shadow-lg border border-blue-600 z-50">
                            {item.submenu?.map((subItem) => {
                              
                              if (subItem.disabled || !subItem.href) {
                                return (
                                  <div
                                    key={subItem.name}
                                    className="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-50 cursor-not-allowed border-b border-gray-100"
                                  >
                                    <div className="font-medium text-gray-400">{subItem.name}</div>
                                    {subItem.description && (
                                      <div className="text-xs text-gray-400">{subItem.description}</div>
                                    )}
                                  </div>
                                );
                              }
                              
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  onClick={closeAllSubmenus}
                                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100"
                                >
                                  <div className="font-medium text-blue-600">{subItem.name}</div>
                                  {subItem.description && (
                                    <div className="text-xs text-gray-500">{subItem.description}</div>
                                  )}
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
                          className="text-white px-6 py-4 font-medium text-sm text-gray-400 cursor-not-allowed opacity-50 transition-colors"
                        >
                          {item.name}
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={closeAllSubmenus}
                          className={`
                            text-white hover:bg-blue-600 px-6 py-4 font-medium text-sm transition-colors
                            ${isActive 
                              ? 'bg-blue-600' 
                              : ''
                            }
                          `}
                        >
                          {item.name}
                        </Link>
                      )
                    )}
                  </div>
                );
              })}
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