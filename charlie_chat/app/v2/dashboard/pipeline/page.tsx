'use client';

import { useState, useEffect, useRef } from 'react';
import { Columns, Filter, ChevronDown, BarChart3, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PropertyIntelligenceChart from '@/components/v2/PropertyIntelligenceChart';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  rectIntersection,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Draggable Property Card Component
function DraggablePropertyCard({ property }: { property: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: property.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 transition-all duration-200 cursor-grab active:cursor-grabbing select-none touch-none ${
        isDragging 
          ? 'shadow-xl border-blue-300 bg-blue-50' 
          : 'hover:shadow-md hover:border-gray-300'
      }`}
    >
      {/* Property Address */}
      <h4 className="font-semibold text-gray-900 truncate mb-1">
        {property.address}
      </h4>
      
      {/* Location and Units */}
      <p className="text-sm text-gray-600 mb-2">
        {property.city}, {property.state} • {property.units} Units
      </p>

      {/* Price */}
      <p className="text-lg font-bold text-gray-900 mb-2">
        {property.assessed}
      </p>

      {/* Market Badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {property.market}
        </span>
      </div>

      {/* Notes Preview */}
      {property.notes && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate">
            {property.notes}
          </p>
        </div>
      )}
    </div>
  );
}

// Droppable Column Component  
function DroppableColumn({ stage, properties }: { stage: any, properties: any[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${stage.id}`,
  });

  return (
    <div className="w-full">
      {/* Column Header */}
      <div className={`rounded-t-lg border-2 ${stage.color} p-3 mb-0`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
          <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
            {properties.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div 
        ref={setNodeRef}
        className={`rounded-b-lg border-2 border-t-0 ${stage.color} h-[600px] p-3 space-y-3 transition-all duration-200 overflow-y-auto ${
          isOver ? 'bg-blue-50 border-blue-400 shadow-inner ring-2 ring-blue-200' : ''
        }`}
        style={{ scrollBehavior: 'smooth' }}
      >
        <SortableContext items={properties.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {properties.map((property) => (
            <DraggablePropertyCard key={property.id} property={property} />
          ))}
        </SortableContext>
        
        {/* Empty State */}
        {properties.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No properties in this stage</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [propertiesData, setPropertiesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const marketDropdownRef = useRef<HTMLDivElement>(null);
  
  // Property Intelligence Chart state
  const [intelligenceData, setIntelligenceData] = useState<any[]>([]);
  const [intelligenceSummary, setIntelligenceSummary] = useState<any>({});
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'mixed' | 'funnel' | 'pie'>('mixed');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const availableSources = ['manual', 'algorithm'];
  // Load favorites data
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user || authLoading) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/favorites');
        if (!response.ok) {
          throw new Error('Failed to fetch favorites');
        }
        
        const data = await response.json();
        
        // Transform favorites data to match pipeline format
        const transformedProperties = data.favorites.map((favorite: any) => {
          const property = favorite.property_data;
          
          // Map status to pipeline stage
          const statusToStage: { [key: string]: string } = {
            'Reviewing': 'reviewing',
            'Communicating': 'reviewing', // Map to reviewing for now
            'Engaged': 'engaged', 
            'Analyzing': 'analyzing',
            'LOI Sent': 'loi-sent',
            'Acquired': 'acquired',
            'Rejected': 'rejected'
          };
          
          return {
            id: property?.property_id || favorite.property_id,
            address: property?.address_street || property?.address_full || 'Unknown Address',
            city: property?.address_city || '',
            state: property?.address_state || '',
            units: property?.units_count || 0,
            assessed: property?.assessed_value ? `$${property.assessed_value.toLocaleString()}` : 'N/A',
            stage: statusToStage[favorite.status] || 'reviewing',
            market: favorite.market_name || 'Unknown',
            notes: favorite.notes || ''
          };
        });
        
        setPropertiesData(transformedProperties);
      } catch (err) {
        console.error('Error loading favorites:', err);
        setError('Failed to load properties');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFavorites();
  }, [user, authLoading]);

  // Create a stable dependency for properties data changes
  const propertiesDataKey = propertiesData.map(p => `${p.id}-${p.stage}`).join(',');

  // Fetch intelligence data for chart
  useEffect(() => {
    const fetchIntelligenceData = async () => {
      if (!user || authLoading) return;
      
      setIntelligenceLoading(true);
      setIntelligenceError(null);
      
      try {
        const params = new URLSearchParams();
        params.set('userId', user.id);
        if (selectedMarkets.length > 0) {
          params.set('markets', selectedMarkets.join(','));
        }
        if (selectedSources.length > 0) {
          params.set('sources', selectedSources.join(','));
        }
        
        const response = await fetch(`/api/v2/metrics/property-intelligence?${params.toString()}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.details || result.error || 'Failed to fetch intelligence data');
        }
        
        setIntelligenceData(result.data || []);
        setIntelligenceSummary(result.summary || {});
      } catch (err: any) {
        console.error('Error fetching intelligence data:', err);
        setIntelligenceError(err.message || 'Failed to load data');
      } finally {
        setIntelligenceLoading(false);
      }
    };
    
    fetchIntelligenceData();
  }, [user, authLoading, selectedMarkets, selectedSources, propertiesDataKey]);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(event.target as Node)) {
        setShowMarketDropdown(false);
      }
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setShowSourceDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Pipeline stages in order
  const pipelineStages = [
    { id: 'reviewing', name: 'Reviewing', color: 'bg-gray-100 border-gray-300' },
    { id: 'analyzing', name: 'Analyzing', color: 'bg-yellow-100 border-yellow-300' },
    { id: 'engaged', name: 'Engaged', color: 'bg-blue-100 border-blue-300' },
    { id: 'loi-sent', name: 'LOI Sent', color: 'bg-purple-100 border-purple-300' },
    { id: 'acquired', name: 'Acquired', color: 'bg-green-100 border-green-300' },
    { id: 'rejected', name: 'Rejected', color: 'bg-red-100 border-red-300' }
  ];

  // Get unique markets from properties (excluding null/undefined)
  const availableMarkets = Array.from(new Set(propertiesData.map(p => p.market).filter(Boolean)));

  // Filter properties by selected markets
  const filteredProperties = selectedMarkets.length === 0 
    ? propertiesData 
    : propertiesData.filter(p => selectedMarkets.includes(p.market));

  // Handle market filter changes
  const handleMarketChange = (market: string) => {
    setSelectedMarkets(prev => 
      prev.includes(market)
        ? prev.filter(m => m !== market)
        : [...prev, market]
    );
  };

  const selectAllMarkets = () => {
    setSelectedMarkets(availableMarkets);
  };

  const clearAllMarkets = () => {
    setSelectedMarkets([]);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag over for smoother feedback
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // Add visual feedback during drag over
    const overId = String(over.id);
    if (overId.includes('droppable-')) {
      // Visual feedback can be added here
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = String(over.id);

    // Extract stage id from droppable id
    let stageId = overId;
    let targetStage = null;
    
    if (overId.includes('droppable-')) {
      // Direct drop on column
      stageId = overId.replace('droppable-', '');
      targetStage = pipelineStages.find(stage => stage.id === stageId);
    } else {
      // Drop on a property card - find which column the property belongs to
      const targetProperty = propertiesData.find(p => String(p.id) === overId);
      if (targetProperty) {
        stageId = targetProperty.stage;
        targetStage = pipelineStages.find(stage => stage.id === stageId);
      }
    }
    
    if (!targetStage) return;

    // Find current property
    const currentProperty = propertiesData.find(p => p.id === activeId);
    if (!currentProperty || currentProperty.stage === targetStage.id) return;

    // Optimistically update the property's stage
    const previousStage = currentProperty.stage;
    setPropertiesData(prev => 
      prev.map(property => 
        property.id === activeId 
          ? { ...property, stage: targetStage.id }
          : property
      )
    );

    // Make API call to update database using favorites status API
    try {
      // Map stage back to status
      const stageToStatus: { [key: string]: string } = {
        'reviewing': 'Reviewing',
        'analyzing': 'Analyzing', 
        'engaged': 'Engaged',
        'loi-sent': 'LOI Sent',
        'acquired': 'Acquired',
        'rejected': 'Rejected'
      };
      
      const newStatus = stageToStatus[targetStage.id] || 'Reviewing';
      
      const response = await fetch('/api/favorites/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: activeId,
          favorite_status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update property status');
      }

      console.log(`Successfully moved property ${activeId} to ${newStatus}`);
    } catch (error) {
      console.error('Error updating property status:', error);
      // Revert the change on error
      setPropertiesData(prev => 
        prev.map(property => 
          property.id === activeId 
            ? { ...property, stage: previousStage }
            : property
        )
      );
    }
  };

  // Group properties by stage
  const propertiesByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = filteredProperties.filter(p => p.stage === stage.id);
    return acc;
  }, {} as Record<string, any[]>);


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Columns className="h-6 w-6 mr-3 text-blue-600" />
                Deal Pipeline
              </h1>
              <p className="text-gray-600 mt-1">
                Track your properties through each stage of the investment process
              </p>
            </div>

            {/* Market Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <div className="relative" ref={marketDropdownRef}>
                <button
                  onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px] text-left"
                >
                  Markets ({selectedMarkets.length} selected)
                </button>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                
                {showMarketDropdown && (
                  <div 
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      {/* Select All / Clear All */}
                      <div className="flex items-center justify-between p-2 border-b border-gray-200 mb-2">
                        <button
                          onClick={selectAllMarkets}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          onClick={clearAllMarkets}
                          className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                      
                      {/* Market Options */}
                      {availableMarkets.map((market) => (
                        <label key={market} className="flex items-center p-2 hover:bg-gray-50 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMarkets.includes(market)}
                            onChange={() => handleMarketChange(market)}
                            className="mr-2 h-3 w-3 text-blue-600"
                          />
                          {market}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Property Pipeline Chart */}
        <div className="mb-6 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Property Pipeline Analytics
            </h3>
            
            {/* Chart Controls */}
            <div className="flex items-center space-x-4">
              {/* Source Filter */}
              <div className="relative" ref={sourceDropdownRef}>
                <button
                  onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px] text-left"
                >
                  Sources ({selectedSources.length} selected)
                </button>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                
                {showSourceDropdown && (
                  <div 
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[150px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      {availableSources.map((source) => (
                        <label key={source} className="flex items-center p-2 hover:bg-gray-50 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSources.includes(source)}
                            onChange={() => {
                              setSelectedSources(prev => 
                                prev.includes(source)
                                  ? prev.filter(s => s !== source)
                                  : [...prev, source]
                              );
                            }}
                            className="mr-2 h-3 w-3 text-blue-600"
                          />
                          {source.charAt(0).toUpperCase() + source.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chart Type Selector */}
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'mixed' | 'funnel' | 'pie')}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="mixed">Mixed Chart</option>
                <option value="funnel">Funnel Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>
          </div>

          {intelligenceLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : intelligenceError ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-red-600">{intelligenceError}</p>
            </div>
          ) : intelligenceData.length > 0 ? (
            <div className="h-96">
              <PropertyIntelligenceChart 
                data={intelligenceData} 
                chartType={chartType}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your properties...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Pipeline Kanban Board */}
            <div className="w-full">
              {/* Full Width Grid Container */}
              <div className="grid grid-cols-6 gap-4">
          {pipelineStages.map((stage) => {
            const stageProperties = propertiesByStage[stage.id] || [];
            return (
              <DroppableColumn 
                key={stage.id} 
                stage={stage} 
                properties={stageProperties} 
              />
            );
          })}
              </div>
            </div>

        {/* Pipeline Statistics */}
        <div className="mt-6 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {pipelineStages.map((stage) => {
              const count = propertiesByStage[stage.id]?.length || 0;
              const totalProperties = filteredProperties.length;
              const percentage = totalProperties > 0 ? Math.round((count / totalProperties) * 100) : 0;
              
              return (
                <div key={stage.id} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{stage.name}</div>
                  <div className="text-xs text-gray-400">{percentage}%</div>
                </div>
              );
            })}
            </div>
          </div>

        {/* Deal Quality Matrix */}
        <div className="mt-8">
          <DealQualityMatrix user={user} authLoading={authLoading} />
        </div>
          </>
        )}
      </div>
    </div>
    
    {/* Drag Overlay */}
    <DragOverlay>
      {activeId ? (
        <div className="bg-white rounded-lg p-4 shadow-xl border-2 border-blue-400 bg-blue-50 opacity-95 rotate-3 scale-105 cursor-grabbing">
          {(() => {
            const draggedProperty = propertiesData.find(p => String(p.id) === String(activeId));
            return draggedProperty ? (
              <>
                <h4 className="font-semibold text-gray-900 truncate mb-1">
                  {draggedProperty.address}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {draggedProperty.city}, {draggedProperty.state} • {draggedProperty.units} Units
                </p>
                <p className="text-lg font-bold text-gray-900 mb-2">
                  {draggedProperty.assessed}
                </p>
              </>
            ) : null;
          })()}
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}

// Deal Quality Matrix Dashboard Component
function DealQualityMatrix({ user, authLoading }: { user: any; authLoading: boolean }) {
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [quadrantCounts, setQuadrantCounts] = useState({
    GOLDMINES: 0,
    FIXERS: 0, 
    SLEEPERS: 0,
    CAUTIONARIES: 0,
    TWEENERS: 0
  });

  // Fetch user's saved properties for matrix
  useEffect(() => {
    const fetchMatrixData = async () => {
      if (!user || authLoading) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Direct Supabase query for user's favorites with property data
        const { createBrowserClient } = await import('@supabase/ssr');
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        console.log('DealQualityMatrix - Querying for user_id:', user.id);
        
        const { data, error } = await supabase
          .from('user_favorites')
          .select(`
            property_id,
            favorite_status,
            recommendation_type,
            saved_properties!inner (
              property_id,
              address_full,
              address_city,
              address_state,
              units_count,
              year_built,
              assessed_value,
              estimated_value,
              estimated_equity,
              years_owned,
              out_of_state_absentee_owner,
              auction,
              reo,
              tax_lien,
              pre_foreclosure,
              private_lender
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        // Debug: Log the raw data received
        console.log('DealQualityMatrix - Raw data received:', data?.length, 'favorites');
        console.log('DealQualityMatrix - Sample data:', data?.slice(0, 2));
        console.log('DealQualityMatrix - Query was filtering by user_id:', user.id, 'and is_active: true');

        // Transform the data to flatten the property information
        const properties = data?.map(favorite => ({
          property_id: favorite.property_id,
          favorite_status: favorite.favorite_status,
          recommendation_type: favorite.recommendation_type,
          // Flatten property data
          ...favorite.saved_properties
        })) || [];
        
        // Filter properties with required data for matrix positioning
        const filteredProperties = properties.filter((p: any) =>
          (p.assessed_value > 0 || p.estimated_value > 0) &&
          p.year_built && p.year_built > 0 &&
          p.units_count && p.units_count > 0
        ).map((property: any) => ({
          ...property,
          propertyValue: property.estimated_value || property.assessed_value || 0,
          propertyAge: new Date().getFullYear() - property.year_built
        }));
        
        // Calculate thresholds based on visual position ranges
        const values = filteredProperties.map(p => p.propertyValue).sort((a, b) => a - b);
        const valueMedian = values[Math.floor(values.length / 2)] || 500000;
        
        // Calculate min/max values for consistent positioning
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        
        // Now assign quadrants based on EXACT VISUAL POSITION matching the display logic
        const matrixProperties = filteredProperties.map((property: any) => {
          // Use EXACT same positioning calculation as the visual display
          const agePosition = Math.min(Math.max((property.propertyAge / 100) * 98, 1), 99);
          const valuePosition = values.length > 1 
            ? ((property.propertyValue - minValue) / (maxValue - minValue)) * 96 + 2
            : 50;
          
          let quadrant = 'TWEENERS';
          
          // Count based on visual quadrant areas - matching what we can actually see:
          // Use more inclusive boundaries to capture border properties
          if (agePosition < 50 && valuePosition <= 33) {
            quadrant = 'CAUTIONARIES';  // Bottom-left: left half, bottom third
          } else if (agePosition >= 50 && valuePosition <= 33) {
            quadrant = 'FIXERS';        // Bottom-right: right half, bottom third
          } else if (agePosition < 50 && valuePosition > 50) {
            quadrant = 'SLEEPERS';      // Top-left: left half, upper half
          } else if (agePosition >= 50 && valuePosition > 50) {
            quadrant = 'GOLDMINES';     // Top-right: right half, upper half
          }
          // Everything else stays TWEENERS (all middle areas and 25-50% age range)
          
          return {
            ...property,
            quadrant
          };
        });
        
        // Count properties by quadrant
        const counts = {
          GOLDMINES: matrixProperties.filter((p: any) => p.quadrant === 'GOLDMINES').length,
          FIXERS: matrixProperties.filter((p: any) => p.quadrant === 'FIXERS').length,
          SLEEPERS: matrixProperties.filter((p: any) => p.quadrant === 'SLEEPERS').length,
          CAUTIONARIES: matrixProperties.filter((p: any) => p.quadrant === 'CAUTIONARIES').length,
          TWEENERS: matrixProperties.filter((p: any) => p.quadrant === 'TWEENERS').length,
        };
        
        setMatrixData(matrixProperties);
        setQuadrantCounts(counts);
        
      } catch (err: any) {
        console.error('Error fetching matrix data:', err);
        setError(err.message || 'Failed to load matrix data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMatrixData();
  }, [user, authLoading]);

  const quadrantInfo = {
    GOLDMINES: { 
      name: 'Goldmines', 
      emoji: '🏆', 
      color: '#10B981', 
      desc: 'High value, older buildings',
      fullDesc: 'Prime established properties'
    },
    FIXERS: { 
      name: 'Fixers', 
      emoji: '🔧', 
      color: '#F59E0B', 
      desc: 'Low value, older buildings',
      fullDesc: 'Value-add opportunities'
    },
    SLEEPERS: { 
      name: 'Sleepers', 
      emoji: '💎', 
      color: '#3B82F6', 
      desc: 'High value, newer buildings',
      fullDesc: 'Premium modern properties'
    },
    CAUTIONARIES: { 
      name: 'Cautionaries', 
      emoji: '❌', 
      color: '#EF4444', 
      desc: 'Low value, newer buildings',
      fullDesc: 'Likely poor location/overbuilt'
    },
    TWEENERS: { 
      name: 'Tweeners', 
      emoji: '⚖️', 
      color: '#8B5CF6', 
      desc: 'No clear verdict',
      fullDesc: 'Dig deeper'
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Deal Quality Matrix</h3>
          <p className="text-sm text-gray-600 mt-1">Properties categorized by age vs value analysis</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {Object.values(quadrantCounts).reduce((sum, count) => sum + count, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Properties</div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="h-48 bg-red-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Quadrant Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {Object.entries(quadrantCounts).map(([quadrant, count]) => {
              const info = quadrantInfo[quadrant as keyof typeof quadrantInfo];
              const totalCount = Object.values(quadrantCounts).reduce((sum, c) => sum + c, 0);
              const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              
              return (
                <div key={quadrant} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">{info.emoji}</div>
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-sm font-medium text-gray-800">{info.name}</div>
                  <div className="text-xs text-gray-600 mt-1">({info.desc})</div>
                  <div className="text-xs text-gray-500 mt-1 italic">{info.fullDesc}</div>
                  <div className="text-xs text-gray-500 mt-1">{percentage}%</div>
                </div>
              );
            })}
          </div>

          {/* Large Interactive Matrix */}
          <div className="w-full">
            {/* Matrix Grid - Full width and larger */}
            <div className="relative w-full bg-white border border-gray-300" style={{ height: '400px' }}>
              
              {/* Y-Axis Label */}
              <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 -rotate-90">
                <span className="text-sm font-medium text-gray-700">Assessed Value</span>
              </div>
              {/* Grid Lines */}
              <div className="absolute inset-0">
                {/* Vertical lines */}
                <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gray-300"></div>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400"></div>
                <div className="absolute left-3/4 top-0 bottom-0 w-px bg-gray-300"></div>
                
                {/* Horizontal lines */}
                <div className="absolute top-1/3 left-0 right-0 h-px bg-gray-400"></div>
                <div className="absolute top-2/3 left-0 right-0 h-px bg-gray-400"></div>
              </div>

              {/* Quadrant Backgrounds */}
              {/* Sleepers - Top Left (High Value, New) */}
              <div className="absolute" style={{
                left: '0%', top: '0%', width: '25%', height: '33%',
                backgroundColor: '#dbeafe', opacity: 0.7
              }}></div>
              
              {/* Gold Mines - Top Right (High Value, Old) */}
              <div className="absolute" style={{
                left: '50%', top: '0%', width: '50%', height: '33%',
                backgroundColor: '#dcfce7', opacity: 0.7
              }}></div>
              
              {/* Cautionaries - Bottom Left (Low Value, New) */}
              <div className="absolute" style={{
                left: '0%', top: '67%', width: '25%', height: '33%',
                backgroundColor: '#fef2f2', opacity: 0.7
              }}></div>
              
              {/* Fixers - Bottom Right (Low Value, Old) */}
              <div className="absolute" style={{
                left: '50%', top: '67%', width: '50%', height: '33%',
                backgroundColor: '#fef3c7', opacity: 0.7
              }}></div>
              
              {/* Tweeners - Middle sections */}
              <div className="absolute" style={{
                left: '25%', top: '0%', width: '25%', height: '33%',
                backgroundColor: '#f3e8ff', opacity: 0.3
              }}></div>
              <div className="absolute" style={{
                left: '0%', top: '33%', width: '100%', height: '34%',
                backgroundColor: '#f3e8ff', opacity: 0.3
              }}></div>
              <div className="absolute" style={{
                left: '25%', top: '67%', width: '25%', height: '33%',
                backgroundColor: '#f3e8ff', opacity: 0.3
              }}></div>

              {/* Background Quadrant Labels */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Sleepers - Top Left */}
                <div className="absolute top-12 left-12 text-3xl font-medium text-blue-400 opacity-30 select-none" 
                     style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.2em' }}>
                  SLEEPERS
                </div>
                
                {/* Goldmines - Top Right */}
                <div className="absolute top-12 right-12 text-3xl font-medium text-green-400 opacity-30 select-none" 
                     style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.2em' }}>
                  GOLDMINES
                </div>
                
                {/* Cautionaries - Bottom Left */}
                <div className="absolute bottom-12 left-12 text-2xl font-medium text-red-400 opacity-30 select-none" 
                     style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.2em' }}>
                  CAUTIONARIES
                </div>
                
                {/* Fixers - Bottom Right */}
                <div className="absolute bottom-12 right-12 text-3xl font-medium text-orange-400 opacity-30 select-none" 
                     style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.2em' }}>
                  FIXERS
                </div>
                
                {/* Tweeners - Center */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-medium text-purple-400 opacity-25 select-none" 
                     style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.2em' }}>
                  TWEENERS
                </div>
              </div>

              {/* Property Dots */}
              <div className="absolute inset-0">
                {(() => {
                  // Calculate dot sizing based on estimated_value
                  const values = matrixData.map(p => p.estimated_value || 0).filter(v => v > 0).sort((a, b) => a - b);
                  const minValue = values[0] || 0;
                  const maxValue = values[values.length - 1] || 1000000;
                  const minSize = 8;
                  const maxSize = 32;

                  return matrixData.map((property, index) => {
                    // Calculate position based on age and value
                    const agePosition = Math.min(Math.max((property.propertyAge / 100) * 98, 1), 99);
                    const valuePosition = values.length > 1 
                      ? ((property.propertyValue - minValue) / (maxValue - minValue)) * 96 + 2
                      : 50;

                    // Calculate dot size based on estimated_value
                    const estimatedValue = property.estimated_value || 0;
                    const dotSize = estimatedValue && maxValue > minValue
                      ? Math.round(minSize + ((estimatedValue - minValue) / (maxValue - minValue)) * (maxSize - minSize))
                      : minSize + 4;

                    return (
                      <div
                        key={`${property.property_id}-${index}`}
                        className="absolute rounded-full cursor-pointer bg-gray-700 hover:bg-blue-600 border-2 border-white shadow-sm transition-all duration-200 hover:scale-110 hover:z-10"
                        style={{
                          width: `${dotSize}px`,
                          height: `${dotSize}px`,
                          left: `${agePosition}%`,
                          bottom: `${valuePosition}%`,
                          transform: 'translate(-50%, 50%)'
                        }}
                        onClick={() => setSelectedProperty(property)}
                        title={`${property.address_full}\nAge: ${property.propertyAge}y, Value: $${property.estimated_value?.toLocaleString()}`}
                      />
                    );
                  });
                })()}
                
                {/* Overflow indicator */}
                {matrixData.length > 200 && (
                  <div className="absolute top-4 right-20 text-sm bg-white px-3 py-1 rounded shadow border border-gray-300">
                    +{matrixData.length - 200} more properties
                  </div>
                )}
              </div>

              {/* Y-Axis Value Labels */}
              {(() => {
                const values = matrixData.map(p => p.estimated_value || p.assessed_value || 0).filter(v => v > 0).sort((a, b) => a - b);
                const minValue = values[0] || 0;
                const maxValue = values[values.length - 1] || 1000000;
                
                const formatValue = (value: number) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                  return `$${value.toLocaleString()}`;
                };
                
                return (
                  <>
                    <div className="absolute -left-20 top-0 text-xs text-gray-600 font-medium">
                      {formatValue(maxValue)}
                    </div>
                    <div className="absolute -left-20 top-1/3 text-xs text-gray-600">
                      {formatValue(minValue + ((maxValue - minValue) * 2/3))}
                    </div>
                    <div className="absolute -left-20 top-2/3 text-xs text-gray-600">
                      {formatValue(minValue + ((maxValue - minValue) * 1/3))}
                    </div>
                    <div className="absolute -left-20 bottom-0 text-xs text-gray-600 font-medium">
                      {formatValue(minValue)}
                    </div>
                  </>
                );
              })()}

              {/* X-Axis Labels */}
              <div className="absolute -bottom-6 left-0 text-xs text-gray-600 font-medium">0y</div>
              <div className="absolute -bottom-6 left-1/4 text-xs text-gray-600">25y</div>
              <div className="absolute -bottom-6 left-1/2 text-xs text-gray-600">50y</div>
              <div className="absolute -bottom-6 left-3/4 text-xs text-gray-600">75y</div>
              <div className="absolute -bottom-6 right-0 text-xs text-gray-600 font-medium">100y+</div>
            </div>
            
            {/* X-Axis Title */}
            <div className="text-center mt-4">
              <span className="text-sm font-medium text-gray-700">Property Age (Years)</span>
            </div>
            
            <div className="mt-2 text-center text-xs text-gray-500">
              Circle size = Estimated Value | Click circles for details
            </div>
            
            {/* Matrix Legend */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="flex flex-wrap justify-center gap-6">
                {Object.entries(quadrantInfo).map(([key, info]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: info.color, opacity: 0.7 }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">{info.name}</span>
                    <span className="text-xs text-gray-500">({info.desc})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Property Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Property Details</h4>
              <button
                onClick={() => setSelectedProperty(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-900">{selectedProperty.address_full}</div>
                <div className="text-xs text-gray-600">{selectedProperty.address_city}, {selectedProperty.address_state}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Units:</span>
                  <span className="ml-2 font-medium">{selectedProperty.units_count}</span>
                </div>
                <div>
                  <span className="text-gray-600">Built:</span>
                  <span className="ml-2 font-medium">{selectedProperty.year_built}</span>
                </div>
                <div>
                  <span className="text-gray-600">Age:</span>
                  <span className="ml-2 font-medium">{selectedProperty.propertyAge}y</span>
                </div>
                <div>
                  <span className="text-gray-600">Value:</span>
                  <span className="ml-2 font-medium text-green-600">
                    ${selectedProperty.propertyValue?.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {selectedProperty.out_of_state_absentee_owner && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Absentee Owner</span>
                )}
                {selectedProperty.auction && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Auction</span>
                )}
                {selectedProperty.reo && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">REO</span>
                )}
                {selectedProperty.tax_lien && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Tax Lien</span>
                )}
                {selectedProperty.pre_foreclosure && (
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">Pre-Foreclosure</span>
                )}
                {selectedProperty.private_lender && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Private Lender</span>
                )}
              </div>
              
              <div className="pt-3 border-t">
                <div className="text-sm">
                  <span className="text-gray-600">Quadrant:</span>
                  <span className="ml-2 font-medium">
                    {quadrantInfo[selectedProperty.quadrant as keyof typeof quadrantInfo]?.emoji} 
                    {quadrantInfo[selectedProperty.quadrant as keyof typeof quadrantInfo]?.name}
                  </span>
                </div>
              </div>
              
              {/* View Details Link */}
              <div className="pt-3 border-t">
                <a
                  href={`/v2/discover/property/${selectedProperty.property_id}?back=${encodeURIComponent('/v2/dashboard/pipeline')}`}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Details →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}