/*
 * CHARLIE2 V2 - Buy Box Page
 * Weekly property recommendations based on user-defined buy box criteria
 * Integrates with existing weekly recommendations system architecture
 */
'use client';

import { useState, useEffect } from 'react';
import { Settings, Heart, X, Star, Grid3x3, Map } from 'lucide-react';
import { BuyBoxModal } from '@/components/BuyBoxModal';
import { useAuth } from '@/contexts/AuthContext';
import { StreetViewImage } from '@/components/ui/StreetViewImage';
import { updateMarketConvergence } from '@/lib/v2/convergenceAnalysis';

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
    tax_lien?: boolean;
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

export default function BuyBoxPage() {
  const { user, supabase } = useAuth();
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
  const [marketConvergence, setMarketConvergence] = useState<{ [marketKey: string]: { phase: 'discovery' | 'learning' | 'mastery' | 'production'; progress: number } }>({});

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
        console.error('Error loading markets:', marketsError);
        setError('Failed to load your markets. Please check your Buy Box settings.');
        return;
      }
      
      if (!markets || markets.length === 0) {
        setError('No markets found. Please set up your Buy Box first.');
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
      console.error('Error loading user data:', error);
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
        .gte('generated_at', weekStart)
        .order('saved_at', { ascending: true });
        
      if (error) {
        console.error('Error loading recommendations:', error);
        return;
      }
      
      if (!existingRecs || existingRecs.length === 0) {
        console.log('No existing recommendations found for this week');
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
      console.log('Loaded recommendations for markets:', Object.keys(recsByMarket));
      
    } catch (error) {
      console.error('Error loading recommendations:', error);
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
    if (!user || !supabase) return;
    
    const isCurrentlyHearted = heartedProperties.has(propertyId);
    
    try {
      if (isCurrentlyHearted) {
        // Remove from favorites (set status to rejected)
        await supabase
          .from('user_favorites')
          .update({ 
            status: 'rejected',
            is_active: false 
          })
          .eq('user_id', user.id)
          .eq('property_id', propertyId);
          
        setHeartedProperties(prev => {
          const updated = new Set(prev);
          updated.delete(propertyId);
          return updated;
        });
        
        console.log('Removed property from favorites:', propertyId);
      } else {
        // Add to favorites (set status to active)
        await supabase
          .from('user_favorites')
          .update({ status: 'active', is_active: true })
          .eq('user_id', user.id)
          .eq('property_id', propertyId);
          
        setHeartedProperties(prev => new Set([...prev, propertyId]));
        
        // Log the decision for learning
        const property = recommendations.find(r => r.property_id === propertyId);
        if (property && selectedMarket) {
          await logPropertyDecision(propertyId, 'favorite', property, selectedMarket);
          // Update convergence analysis after decision
          const convergenceData = await updateMarketConvergence(user.id, supabase);
          setMarketConvergence(convergenceData);
        }
        
        console.log('Added property to favorites:', propertyId);
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const handleNotInterested = async (propertyId: string) => {
    if (!user || !supabase) return;
    
    try {
      // Set status to rejected
      await supabase
        .from('user_favorites')
        .update({ 
          status: 'rejected',
          is_active: false 
        })
        .eq('user_id', user.id)
        .eq('property_id', propertyId);
        
      // Remove from hearted properties if it was hearted
      setHeartedProperties(prev => {
        const updated = new Set(prev);
        updated.delete(propertyId);
        return updated;
      });
      
      // Log the decision for learning
      const property = recommendations.find(r => r.property_id === propertyId);
      if (property && selectedMarket) {
        await logPropertyDecision(propertyId, 'not_interested', property, selectedMarket);
        // Update convergence analysis after decision
        const convergenceData = await updateMarketConvergence(user.id, supabase);
        setMarketConvergence(convergenceData);
      }
      
      console.log('Marked property as not interested:', propertyId);
    } catch (error) {
      console.error('Error marking property as not interested:', error);
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
            tax_lien: property.tax_lien,
            auction: property.auction,
            pre_foreclosure: property.pre_foreclosure
          },
          market_key: market.market_key,
          fit_score: property.fit_score,
          decided_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error logging decision:', error);
      } else {
        console.log(`✅ Logged ${decision} decision for property ${propertyId}`);
        
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
      console.error('Error logging property decision:', error);
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
  
  if (!loading && userMarkets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Buy Box Markets Found</h2>
          <p className="text-gray-600 mb-6">Set up your first market to start receiving personalized property recommendations.</p>
          <button 
            onClick={() => setShowBuyBoxModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Set Up Buy Box
          </button>
        </div>
      </div>
    );
  }

  return (
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
                  setFocusedMarket(null); // null means add new market mode
                  setShowBuyBoxModal(true);
                }}
                className="whitespace-nowrap py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm transition-colors flex items-center"
              >
                <span className="text-lg mr-1">+</span>
                Add Market
              </button>
            </nav>
          </div>
        </div>

        {/* Buy Box Criteria Summary - Market Specific */}
        {selectedMarket && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
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
              {recommendations.length > 0 
                ? `${recommendations.length} properties this week matching your buy box criteria`
                : 'No new recommendations this week. Weekly recommendations are generated automatically each Monday morning.'
              }
            </p>
          </div>
        )}

        {/* Weekly Recommendations - Grid or Map View */}
        {recommendations.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((property, index) => (
                <RecommendationCard 
                  key={property.property_id}
                  property={property}
                  onFavorite={() => handleFavorite(property.property_id)}
                  onNotInterested={() => handleNotInterested(property.property_id)}
                  index={index + 1}
                  total={recommendations.length}
                  isHearted={heartedProperties.has(property.property_id)}
                />
              ))}
            </div>
          ) : (
            <MapView 
              properties={recommendations}
              selectedMarket={selectedMarket ? getMarketDisplayName(selectedMarket) : ''}
              onFavorite={handleFavorite}
              onNotInterested={handleNotInterested}
            />
          )
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-600 mb-4">
              No recommendations available for this market this week.
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Weekly recommendations are generated automatically each Monday morning based on your buy box criteria.
            </p>
            <button 
              onClick={() => {
                setFocusedMarket(selectedMarketKey);
                setShowBuyBoxModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Review Buy Box Criteria
            </button>
          </div>
        )}

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
      </div>
    </div>
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
      <div className="relative h-96 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <Map className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedMarket} Property Map
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Interactive map showing {properties.length} recommendations in this market
          </p>
          <div className="text-xs text-gray-500">
            Map integration with Google Maps or Mapbox would go here
          </div>
        </div>

        {/* Sample Map Pins/Markers */}
        <div className="absolute inset-0">
          {properties.map((property, index) => (
            <div
              key={property.property_id}
              className={`absolute w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-all ${
                property.fit_score >= 90 
                  ? 'bg-green-500' 
                  : property.fit_score >= 85 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              style={{
                left: `${20 + (index * 15)}%`,
                top: `${30 + (index * 10)}%`
              }}
              title={`${property.address_full || property.address_street} - ${Math.round(property.fit_score)}% match`}
            >
              <span className="text-white text-xs font-bold flex items-center justify-center w-full h-full">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
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
  isHearted
}: {
  property: MMRProperty;
  onFavorite: () => void;
  onNotInterested: () => void;
  index: number;
  total: number;
  isHearted: boolean;
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
      <div className="relative w-full h-full bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        {/* Property Image */}
        <div className="relative h-48">
          <StreetViewImage
            address={`${property.address_street || property.address_full}, ${property.address_city}, ${property.address_state}`}
            className="h-full w-full object-cover"
            width={400}
            height={200}
          />
          
          {/* Property counter */}
          <div className="absolute top-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs">
            Property {index} of {total}
          </div>
          
          {/* Zillow Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const address = property.address_full || property.address_street || '';
              const zillowUrl = `https://www.zillow.com/homes/${address.replace(/\s+/g, '-')}-${property.address_city}-${property.address_state}-${property.address_zip}_rb/`;
              window.open(zillowUrl, '_blank');
            }}
            className="absolute bottom-3 right-3 bg-white/95 hover:bg-white rounded-lg p-1.5 shadow-sm transition-colors group cursor-pointer"
            title="View on Zillow"
          >
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12h3v8h4v-6h6v6h4v-8h3L12 2z"/>
            </svg>
          </button>
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
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(property.assessed_value)}
            </div>
            {property.estimated_equity && (
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
                window.location.href = `/v2/discover/property/${property.property_id}?back=${backUrl}`;
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
              isHearted 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-gray-600 hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isHearted ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}