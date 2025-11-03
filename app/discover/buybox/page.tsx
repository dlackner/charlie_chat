/*
 * CHARLIE2 V2 - Buy Box Page
 * Weekly property recommendations based on user-defined buy box criteria
 * Integrates with existing weekly recommendations system architecture
 */
'use client';

// Add custom keyframes for card animations
const cardAnimationStyles = `
  @keyframes heartFlyOut {
    0% { transform: scale(1) translateX(0) rotate(0deg); opacity: 1; }
    30% { transform: scale(1.1) translateX(0) rotate(0deg); opacity: 1; }
    100% { transform: scale(0.8) translateX(300px) rotate(10deg); opacity: 0; }
  }
  
  @keyframes rejectFlyOut {
    0% { transform: scale(1) translateX(0) rotate(0deg); opacity: 1; }
    30% { transform: scale(0.95) translateX(0) rotate(-3deg); opacity: 1; }
    100% { transform: scale(0.8) translateX(-300px) rotate(-15deg); opacity: 0; }
  }
`;

// Inject styles into the document head
if (typeof document !== 'undefined' && !document.getElementById('card-animations')) {
  const style = document.createElement('style');
  style.id = 'card-animations';
  style.textContent = cardAnimationStyles;
  document.head.appendChild(style);
}

import { useState, useEffect } from 'react';
import { Settings, Heart, X, Star, Grid3x3, Map, Trash2, Home, Target, Calendar, TrendingUp } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { BuyBoxModal } from '@/components/shared/BuyBoxModal';
import { StandardModalWithActions } from '@/components/shared/StandardModal';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StreetViewImage } from '@/components/ui/StreetViewImage';
import { updateMarketConvergence } from '@/lib/v2/convergenceAnalysis';
import PropertyMap from '@/components/shared/PropertyMap';
import { useAlert } from '@/components/shared/AlertModal';

// Enhanced interfaces matching weekly recommendations system
interface MMRProperty {
    property_id: string;
    fit_score: number;
    diversity_score: number;
    total_score: number;
    selection_reasons: string[];
    // Property details from saved_properties
    address_street?: string;
    address_full?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    latitude?: number;
    longitude?: number;
    units_count?: number;
    year_built?: number;
    assessed_value?: number;
    estimated_value?: number;
    estimated_equity?: number;
    last_sale_date?: string;
    last_sale_amount?: number;
    years_owned?: number;
    out_of_state_absentee_owner?: boolean;
    mls_active?: boolean;
    reo?: boolean;
    auction?: boolean;
    pre_foreclosure?: boolean;
    flood_zone?: boolean;
    flood_zone_description?: string;
}

interface UserMarket {
  id: string;
  market_key: string;
  market_name: string;
  market_type: 'city' | 'zip';
  city?: string;
  state?: string;
  zip?: string;
  units_min: number;
  units_max: number;
  assessed_value_min: number;
  assessed_value_max: number;
  estimated_value_min: number;
  estimated_value_max: number;
  year_built_min: number;
  year_built_max: number;
  property_ids?: string[];
  total_decisions_made?: number;
}

// Buy Box Onboarding Modal Component
function BuyBoxOnboardingModal({ 
  isOpen, 
  onClose, 
  onGetStarted 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onGetStarted: () => void; 
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <Target size={24} className="text-blue-600" />
              </div>
              <div>
                <Dialog.Title className="text-2xl font-semibold text-gray-900">
                  Welcome to Buy Box!
                </Dialog.Title>
                <p className="text-sm text-gray-600 mt-1">Your personal property recommendation engine</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-8 py-6">
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Get personalized property recommendations every week
              </h3>
              <p className="text-gray-600 mb-6">
                Buy Box learns your investment preferences and automatically finds properties that match your criteria. 
                Set up your first market to start receiving curated recommendations every Friday.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 mx-auto mb-3">
                  <Home size={20} className="text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Define Your Market</h4>
                <p className="text-sm text-gray-600">Set location, property type, size, and value ranges</p>
              </div>
              
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 mx-auto mb-3">
                  <Calendar size={20} className="text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Weekly Delivery</h4>
                <p className="text-sm text-gray-600">Get fresh recommendations every Friday automatically</p>
              </div>
              
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 mx-auto mb-3">
                  <TrendingUp size={20} className="text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Smart Learning</h4>
                <p className="text-sm text-gray-600">The more you use it, the better the recommendations get</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onGetStarted}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Set Up My First Market
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default function BuyBoxPage() {
  const { user, supabase } = useAuth();
  const { showError, showWarning, AlertComponent } = useAlert();
  const [userMarkets, setUserMarkets] = useState<UserMarket[]>([]);
  const [selectedMarketKey, setSelectedMarketKey] = useState<string | null>(null);
  const [marketRecommendations, setMarketRecommendations] = useState<{ [marketKey: string]: MMRProperty[] }>({});
  // Removed flippedCards state - no longer needed
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showBuyBoxModal, setShowBuyBoxModal] = useState(false);
  const [focusedMarket, setFocusedMarket] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heartedProperties, setHeartedProperties] = useState<Set<string>>(new Set());
  const [decidedProperties, setDecidedProperties] = useState<Set<string>>(new Set()); // Track properties user has decided on
  const [animatingProperties, setAnimatingProperties] = useState<{ [propertyId: string]: 'heart' | 'reject' }>({}); // Track animating properties
  const [marketConvergence, setMarketConvergence] = useState<{ [marketKey: string]: { phase: 'discovery' | 'learning' | 'mastery' | 'production'; progress: number } }>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [marketToDelete, setMarketToDelete] = useState<{ key: string; name: string; favoriteCount?: number } | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Handle delete confirmation
  const handleDeleteMarket = async () => {
    if (!marketToDelete || !user || !supabase) return;
    
    try {
      // First, delete all favorites associated with this market
      const { error: favoritesError } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('market_key', marketToDelete.key);
      
      if (favoritesError) {
        // Continue with market deletion even if favorites cleanup fails
      }
      
      // Delete the market from database
      const { error } = await supabase
        .from('user_markets')
        .delete()
        .eq('user_id', user.id)
        .eq('market_key', marketToDelete.key);
      
      if (error) {
        showError('Failed to delete market. Please try again.', 'Delete Failed');
        return;
      }
      
      // Remove from local state
      const updatedMarkets = userMarkets.filter(m => m.market_key !== marketToDelete.key);
      setUserMarkets(updatedMarkets);
      
      // Remove recommendations for this market
      setMarketRecommendations(prev => {
        const updated = { ...prev };
        delete updated[marketToDelete.key];
        return updated;
      });
      
      // Select a different market or null
      if (updatedMarkets.length > 0) {
        setSelectedMarketKey(updatedMarkets[0].market_key);
      } else {
        setSelectedMarketKey(null);
      }
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setMarketToDelete(null);
      
    } catch (error) {
      showError('Failed to delete market. Please try again.', 'Delete Failed');
      setShowDeleteModal(false);
      setMarketToDelete(null);
    }
  };

  // Load user markets and existing recommendations
  useEffect(() => {
    loadUserData();
  }, [user, supabase]);
  
  const loadUserData = async () => {
    if (!user || !supabase) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load user's markets
      const { data: markets, error: marketsError } = await supabase
        .from('user_markets')
        .select('*')
        .eq('user_id', user.id);
        
      if (marketsError) {
        setError('Failed to load your markets. Please check your Buy Box settings.');
        return;
      }
      
      if (!markets || markets.length === 0) {
        // No markets found - show normal page layout with Add Market option
        setUserMarkets([]);
        setLoading(false);
        // Show onboarding modal for new users
        setTimeout(() => setShowOnboardingModal(true), 1000);
        return;
      }
      
      setUserMarkets(markets);
      if (!selectedMarketKey) {
        setSelectedMarketKey(markets[0].market_key); // Select first market by default
      }
      
      // Load existing weekly recommendations for all markets
      await loadRecommendationsForAllMarkets(markets);
      
      // Update and load market convergence data for learning phases
      const convergenceData = await updateMarketConvergence(user.id, supabase);
      setMarketConvergence(convergenceData);
      
      // Load user's existing hearts (active favorites)
      const { data: activeFavorites } = await supabase
        .from('user_favorites')
        .select('property_id')
        .eq('user_id', user.id)
        .eq('status', 'active');
        
      if (activeFavorites) {
        setHeartedProperties(new Set(activeFavorites.map(f => f.property_id)));
      }
      
    } catch (error) {
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load recommendations for all user markets
  const loadRecommendationsForAllMarkets = async (markets: UserMarket[]) => {
    if (!user || !supabase) return;
    
    try {
      const weekStart = getWeekStart(new Date());
      
      // Load existing recommendations from this week
      const { data: existingRecs, error } = await supabase
        .from('user_favorites')
        .select(`
          recommendation_batch_id,
          fit_score,
          diversity_score,
          total_score,
          selection_reasons,
          market_key,
          saved_properties!inner (*)
        `)
        .eq('user_id', user.id)
        .eq('recommendation_type', 'algorithm')
        .eq('status', 'pending')
        // .gte('generated_at', weekStart)  // Commented out to show all pending recommendations
        .order('saved_at', { ascending: true });
        
      if (error) {
        return;
      }
      
      if (!existingRecs || existingRecs.length === 0) {
        return;
      }
      
      // Group recommendations by market
      const recsByMarket: { [marketKey: string]: MMRProperty[] } = {};
      
      existingRecs.forEach((item: any) => {
        const marketKey = item.market_key;
        if (!recsByMarket[marketKey]) {
          recsByMarket[marketKey] = [];
        }
        
        recsByMarket[marketKey].push({
          ...item.saved_properties,
          property_id: item.saved_properties.property_id,
          fit_score: item.fit_score || 0,
          diversity_score: item.diversity_score || 0,
          total_score: item.total_score || 0,
          selection_reasons: item.selection_reasons || []
        });
      });
      
      setMarketRecommendations(recsByMarket);
      
    } catch (error) {
      // Silently handle recommendation loading errors
    }
  };
  
  // Helper functions
  const getWeekStart = (date: Date): string => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };
  
  const getMarketDisplayName = (market: UserMarket): string => {
    if (market.market_name?.trim()) {
      return market.market_name.trim();
    }
    
    if (market.market_type === 'city' && market.city && market.state) {
      return `${market.city}, ${market.state}`;
    } else if (market.market_type === 'zip' && market.zip) {
      const firstZip = market.zip.split(',')[0].trim();
      return `ZIP ${firstZip}`;
    } else {
      return `Market ${market.market_key}`;
    }
  };
  
  // Get selected market object
  const selectedMarket = userMarkets.find(m => m.market_key === selectedMarketKey);
  
  // Get recommendations for selected market
  const recommendations = selectedMarketKey ? (marketRecommendations[selectedMarketKey] || []) : [];
  
  // Get market counts for tabs
  const marketCounts = userMarkets.reduce((acc, market) => {
    acc[market.market_key] = marketRecommendations[market.market_key]?.length || 0;
    return acc;
  }, {} as { [key: string]: number });


  // Card flip functionality removed - now using direct navigation to property details

  const handleFavorite = async (propertyId: string) => {
    if (!user) return;
    
    try {
      // Start animation immediately
      setAnimatingProperties(prev => ({ ...prev, [propertyId]: 'heart' }));
      
      // Get property data for the API call
      const property = recommendations.find(r => r.property_id === propertyId);
      if (!property) {
        throw new Error(`Property ${propertyId} not found in recommendations`);
      }

      // Use the centralized favorites API endpoint
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: propertyId,
          property_data: property,
          action: 'add'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add favorite');
      }
        
      setHeartedProperties(prev => new Set([...prev, propertyId]));
      
      // Wait for animation to complete before removing from view
      setTimeout(() => {
        setDecidedProperties(prev => new Set([...prev, propertyId]));
        setAnimatingProperties(prev => {
          const updated = { ...prev };
          delete updated[propertyId];
          return updated;
        });
      }, 800); // Animation duration
      
      // Log the decision for learning
      if (selectedMarket) {
        await logPropertyDecision(propertyId, 'favorite', property, selectedMarket);
        // Update convergence analysis after decision
        const convergenceData = await updateMarketConvergence(user.id, supabase);
        setMarketConvergence(convergenceData);
      }
      
    } catch (error) {
      // Silently handle favorite status update errors
      // Remove animation state on error
      setAnimatingProperties(prev => {
        const updated = { ...prev };
        delete updated[propertyId];
        return updated;
      });
    }
  };

  const handleNotInterested = async (propertyId: string) => {
    if (!user) return;
    
    try {
      // Start animation immediately
      setAnimatingProperties(prev => ({ ...prev, [propertyId]: 'reject' }));
      
      // Get property data for the API call
      const property = recommendations.find(r => r.property_id === propertyId);
      if (!property) {
        throw new Error(`Property ${propertyId} not found in recommendations`);
      }

      // Use the centralized favorites API endpoint to remove/reject
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: propertyId,
          property_data: property,
          action: 'remove'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject property');
      }
        
      // Remove from hearted properties if it was hearted
      setHeartedProperties(prev => {
        const updated = new Set(prev);
        updated.delete(propertyId);
        return updated;
      });
      
      // Wait for animation to complete before removing from view
      setTimeout(() => {
        setDecidedProperties(prev => new Set([...prev, propertyId]));
        setAnimatingProperties(prev => {
          const updated = { ...prev };
          delete updated[propertyId];
          return updated;
        });
      }, 800); // Animation duration
      
      // Log the decision for learning
      if (selectedMarket) {
        await logPropertyDecision(propertyId, 'not_interested', property, selectedMarket);
        // Update convergence analysis after decision
        const convergenceData = await updateMarketConvergence(user.id, supabase);
        setMarketConvergence(convergenceData);
      }
      
    } catch (error) {
      // Silently handle rejection status update errors
      // Remove animation state on error
      setAnimatingProperties(prev => {
        const updated = { ...prev };
        delete updated[propertyId];
        return updated;
      });
    }
  };
  
  // Log property decision for learning (adapted from WeeklyRecommendationsModalMMR)
  const logPropertyDecision = async (propertyId: string, decision: 'favorite' | 'not_interested', property: MMRProperty, market: UserMarket) => {
    if (!user || !supabase) return;
    
    try {
      const { error } = await supabase
        .from('user_property_decisions')
        .insert({
          user_id: user.id,
          property_id: propertyId,
          decision: decision,
          property_characteristics: {
            units_count: property.units_count,
            year_built: property.year_built,
            assessed_value: property.assessed_value,
            estimated_value: property.estimated_value,
            estimated_equity: property.estimated_equity,
            address_city: property.address_city,
            address_state: property.address_state,
            years_owned: property.years_owned,
            out_of_state_absentee_owner: property.out_of_state_absentee_owner,
            reo: property.reo,
            auction: property.auction,
            pre_foreclosure: property.pre_foreclosure
          },
          market_key: market.market_key,
          fit_score: property.fit_score,
          decided_at: new Date().toISOString()
        });
        
      if (error) {
        // Silently handle logging errors
      } else {
        // Increment total_decisions_made for this market
        const currentCount = market.total_decisions_made || 0;
        await supabase
          .from('user_markets')
          .update({ 
            total_decisions_made: currentCount + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('market_key', market.market_key);
      }
    } catch (error) {
      // Silently handle property decision errors
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your buy box recommendations...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Buy Box Recommendations</h1>
          <p className="text-gray-600">Weekly personalized recommendations based on your criteria</p>
        </div>

        {/* Market Tabs with Add Market */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {userMarkets.map((market) => {
                const count = marketCounts[market.market_key] || 0;
                const isSelected = selectedMarketKey === market.market_key;
                const displayName = getMarketDisplayName(market);
                
                return (
                  <button
                    key={market.market_key}
                    onClick={() => setSelectedMarketKey(market.market_key)}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      isSelected
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {displayName}
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
              
              {/* Add Market Tab */}
              <button
                onClick={() => {
                  // Check if user has reached the 5-market limit
                  if (userMarkets.length >= 5) {
                    showWarning('Maximum 5 markets allowed. Please delete an existing market first.', 'Market Limit Reached');
                    return;
                  }
                  setFocusedMarket(null); // null means add new market mode
                  setShowBuyBoxModal(true);
                }}
                disabled={userMarkets.length >= 5}
                className={`whitespace-nowrap py-2 px-1 border-b-2 border-transparent font-medium text-sm transition-colors flex items-center ${
                  userMarkets.length >= 5 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-lg mr-1">+</span>
                Add Market
              </button>
            </nav>
          </div>
        </div>

        {/* Buy Box Criteria Summary - Market Specific - Hidden on mobile */}
        {selectedMarket && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {getMarketDisplayName(selectedMarket)} Buy Box Criteria
                </h2>
                {/* Learning Progress Bar */}
                <div className="max-w-xs">
                  <div className="relative w-full bg-gray-200 rounded-full h-6 shadow-inner">
                    {(() => {
                      const convergence = marketConvergence[selectedMarket.market_key];
                      const phase = convergence?.phase || 'discovery';
                      const progress = convergence?.progress || 1;
                      const progressPercent = (progress / 4) * 100; // 4 phases: discovery(1), learning(2), mastery(3), production(4)
                      
                      return (
                        <div 
                          className={`h-6 rounded-full transition-all duration-300 relative overflow-hidden ${
                            phase === 'production' 
                              ? 'bg-gradient-to-r from-green-400 to-green-600' 
                              : 'bg-gradient-to-r from-blue-400 to-blue-600'
                          }`}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        >
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white capitalize">
                            {phase}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3x3 className="h-4 w-4 mr-1.5" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'map' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Map className="h-4 w-4 mr-1.5" />
                  Map
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => {
                    setFocusedMarket(selectedMarketKey); // Focus on the currently selected market
                    setShowBuyBoxModal(true);
                  }}
                  className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Criteria
                </button>
                <button
                  onClick={async () => {
                    if (!selectedMarketKey || !selectedMarket || !supabase || !user) return;
                    
                    // Get count of favorites for this market
                    const { count } = await supabase
                      .from('user_favorites')
                      .select('*', { count: 'exact', head: true })
                      .eq('user_id', user.id)
                      .eq('market_key', selectedMarketKey)
                      .eq('is_active', true);
                    
                    // Set up delete confirmation modal
                    const marketName = getMarketDisplayName(selectedMarket);
                    setMarketToDelete({ 
                      key: selectedMarketKey, 
                      name: marketName,
                      favoriteCount: count || 0
                    });
                    setShowDeleteModal(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                  title="Delete market"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Unit Range</div>
                <div className="font-medium text-gray-900">{selectedMarket.units_min}-{selectedMarket.units_max} units</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Year Built Range</div>
                <div className="font-medium text-gray-900">{selectedMarket.year_built_min}-{selectedMarket.year_built_max}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Assessed Value Range</div>
                <div className="font-medium text-gray-900">
                  ${(selectedMarket.assessed_value_min / 1000000).toFixed(1)}M - ${(selectedMarket.assessed_value_max / 1000000).toFixed(1)}M
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Estimated Value Range</div>
                <div className="font-medium text-gray-900">
                  ${(selectedMarket.estimated_value_min / 1000000).toFixed(1)}M - ${(selectedMarket.estimated_value_max / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Market Results Header */}
        {selectedMarket && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {getMarketDisplayName(selectedMarket)} Recommendations
            </h3>
            <p className="text-gray-600">
              {(() => {
                const undecidedCount = recommendations.filter(p => !decidedProperties.has(p.property_id)).length;
                const decidedCount = decidedProperties.size;
                
                if (undecidedCount > 0) {
                  return `${undecidedCount} properties this week matching your buy box criteria${decidedCount > 0 ? ` (${decidedCount} already reviewed)` : ''}`;
                } else if (decidedCount > 0) {
                  return `All ${decidedCount} recommendations reviewed this week!`;
                } else {
                  return 'No new recommendations this week. Weekly recommendations are generated automatically each Thursday night.';
                }
              })()}
            </p>
          </div>
        )}

        {/* Weekly Recommendations - Grid or Map View */}
        {(() => {
          const undecidedRecommendations = recommendations.filter(p => !decidedProperties.has(p.property_id));
          return undecidedRecommendations.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {undecidedRecommendations.map((property, index) => (
                  <RecommendationCard 
                    key={property.property_id}
                    property={property}
                    onFavorite={() => handleFavorite(property.property_id)}
                    onNotInterested={() => handleNotInterested(property.property_id)}
                    index={index + 1}
                    total={undecidedRecommendations.length}
                    isHearted={heartedProperties.has(property.property_id)}
                    animationType={animatingProperties[property.property_id]}
                  />
                ))}
              </div>
            ) : (
              <MapView 
                properties={undecidedRecommendations}
                selectedMarket={selectedMarket ? getMarketDisplayName(selectedMarket) : ''}
                onFavorite={handleFavorite}
                onNotInterested={handleNotInterested}
              />
            )
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-600 mb-4">
                {decidedProperties.size > 0 
                  ? "Great job! You've reviewed all recommendations for this market this week." 
                  : "No recommendations available for this market this week."
                }
              </div>
              <p className="text-sm text-gray-500">
                {decidedProperties.size > 0
                  ? "New recommendations will be generated next Thursday night."
                  : "`Weekly recommendations are generated automatically each Thursday night based on your buy box criteria.`"
                }
              </p>
            </div>
          );
        })()}

        {/* Onboarding Modal */}
        <BuyBoxOnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          onGetStarted={() => {
            setShowOnboardingModal(false);
            setShowBuyBoxModal(true);
          }}
        />

        {/* Buy Box Modal */}
        <BuyBoxModal
          isOpen={showBuyBoxModal}
          onClose={() => {
            setShowBuyBoxModal(false);
            setFocusedMarket(null); // Reset focus when closing
            // Reload user data after modal closes
            loadUserData();
          }}
          focusedMarket={focusedMarket}
        />

        {/* Delete Confirmation Modal */}
        <StandardModalWithActions
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setMarketToDelete(null);
          }}
          title="Delete Market"
          size="sm"
          primaryAction={{
            label: "Delete Market",
            onClick: handleDeleteMarket,
            variant: "danger"
          }}
          secondaryAction={{
            label: "Cancel",
            onClick: () => {
              setShowDeleteModal(false);
              setMarketToDelete(null);
            }
          }}
        >
          <div className="space-y-4">
            <p className="text-gray-700 text-base">
              Are you sure you want to delete the <span className="font-semibold">"{marketToDelete?.name}"</span> market?
            </p>
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              <strong>This action cannot be undone.</strong> All recommendations and settings for this market will be permanently removed.
            </p>
          </div>
        </StandardModalWithActions>

        {/* Alert Modal */}
        {AlertComponent}
      </div>
      </div>
    </AuthGuard>
  );
}

function MapView({
  properties,
  selectedMarket,
  onFavorite,
  onNotInterested
}: {
  properties: MMRProperty[];
  selectedMarket: string;
  onFavorite: (id: string) => void;
  onNotInterested: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Map Container */}
      <div className="h-96">
        <PropertyMap
          properties={properties.map(property => ({
            id: property.property_id,
            property_id: property.property_id,
            latitude: property.latitude,
            longitude: property.longitude,
            address_street: property.address_street,
            address_full: property.address_full,
            address_city: property.address_city,
            address_state: property.address_state,
            address_zip: property.address_zip,
            units_count: property.units_count,
            year_built: property.year_built,
            assessed_value: property.assessed_value,
          }))}
          className="w-full h-full rounded-lg border border-gray-200"
          context="buybox"
        />
      </div>
    </div>
  );
}

function RecommendationCard({
  property,
  onFavorite,
  onNotInterested,
  index,
  total,
  isHearted,
  animationType
}: {
  property: MMRProperty;
  onFavorite: () => void;
  onNotInterested: () => void;
  index: number;
  total: number;
  isHearted: boolean;
  animationType?: 'heart' | 'reject';
}) {
  
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // const calculateAge = (yearBuilt: number) => {
  //   return new Date().getFullYear() - yearBuilt;
  // };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRelevanceStars = (score: number) => {
    const stars = Math.round((score / 100) * 5); // Convert 0-100 to 0-5 stars
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        size={12} 
        className={i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'} 
      />
    ));
  };
  return (
    <div className="relative h-96">
      <div className={`relative w-full h-full bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-800 ${
        animationType === 'heart' 
          ? 'animate-[heartFlyOut_0.8s_ease-in-out_forwards] bg-green-100 border-green-300 scale-105'
          : animationType === 'reject'
            ? 'animate-[rejectFlyOut_0.8s_ease-in-out_forwards] bg-red-100 border-red-300 -rotate-6'
            : 'transition-shadow'
      }`}>
        {/* Property Image */}
        <div className="relative h-48">
          <StreetViewImage
            address={`${property.address_street || property.address_full}, ${property.address_city}, ${property.address_state}`}
            className="h-full w-full object-cover"
            width={400}
            height={200}
            disableClick={true}
          />
          
          {/* Property counter */}
          <div className="absolute top-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs">
            Property {index} of {total}
          </div>
          
        </div>

        {/* Property Details */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1 truncate">
            {property.address_street || property.address_full}
          </h3>
          
          <p className="text-sm text-gray-600 mb-3">
            {property.address_city}, {property.address_state} • {property.units_count} Units • Built {property.year_built}
          </p>

          <div className="mb-3">
            {property.assessed_value && property.assessed_value > 0 ? (
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(property.assessed_value)}
              </div>
            ) : (
              <div className="text-xl font-bold text-gray-900">
                Price not available
              </div>
            )}
            {property.estimated_equity != null && property.estimated_equity > 0 && (
              <div className="text-sm text-gray-600">
                Est. Equity: <span className="font-medium text-green-600">{formatCurrency(property.estimated_equity)}</span>
              </div>
            )}
          </div>

          {/* Match indicator and View Details */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {getRelevanceStars(property.fit_score)}
              <span className="text-sm font-medium text-gray-900 ml-1">{Math.round(property.fit_score)}% match</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const backUrl = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/discover/property/${property.property_id}?back=${backUrl}`;
              }}
              className="text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onNotInterested();
            }}
            className="p-2 bg-white/90 text-gray-600 rounded-full hover:bg-white hover:text-gray-800 transition-colors shadow-lg border border-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className={`p-2 bg-white/90 rounded-full hover:bg-white transition-colors shadow-lg border border-gray-200 ${
              isHearted || animationType === 'heart'
                ? 'text-red-500 hover:text-red-600' 
                : 'text-gray-600 hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isHearted || animationType === 'heart' ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}