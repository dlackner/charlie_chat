'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Users, 
  MessageCircle, 
  User, 
  Menu, 
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  submenu?: { name: string; href: string; }[];
}

const navigation: NavigationItem[] = [
  { 
    name: 'DASHBOARD', 
    href: '/dashboard', 
    icon: Home,
    submenu: [
      { name: 'Metrics', href: '/dashboard/metrics' },
      { name: 'Pipeline', href: '/dashboard/pipeline' },
      { name: 'Performance', href: '/dashboard/performance' },
      { name: 'Analytics', href: '/dashboard/analytics' }
    ]
  },
  { 
    name: 'DISCOVER', 
    href: '/discover', 
    icon: Search,
    submenu: [
      { name: 'Property Search', href: '/discover' },
      { name: 'Buy Box', href: '/discover/buybox' },
      { name: 'Saved Searches', href: '/discover/saved' }
    ]
  },
  { 
    name: 'ENGAGE', 
    href: '/engage', 
    icon: Users
  },
  { 
    name: 'AI CHAT', 
    href: '/chat', 
    icon: MessageCircle,
    submenu: [
      { name: 'Property Assistant', href: '/chat/property' },
      { name: 'Deal Analysis', href: '/chat/deals' },
      { name: 'Market Insights', href: '/chat/market' },
      { name: 'Chat History', href: '/chat/history' }
    ]
  },
  { 
    name: 'ACCOUNT', 
    href: '/account', 
    icon: User,
    submenu: [
      { name: 'Profile', href: '/account/profile' },
      { name: 'Subscription', href: '/account/subscription' },
      { name: 'Billing', href: '/account/billing' },
      { name: 'Settings', href: '/account/settings' }
    ]
  },
];

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({});
  const pathname = usePathname();

  const toggleSubmenu = (itemName: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
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
                            const isSubActive = pathname === subItem.href;
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
      <div className="hidden lg:block bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
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

            {/* Navigation */}
            <nav className="flex space-x-8">
              {navigation.map((item) => {
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
                              const isSubActive = pathname === subItem.href;
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  onClick={() => setOpenSubmenus({})}
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
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}