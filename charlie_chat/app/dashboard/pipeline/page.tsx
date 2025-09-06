'use client';

import { useState, useEffect, useRef } from 'react';
import { Columns, Filter, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
  rectIntersection,
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
    <div className="flex-shrink-0 w-80">
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
        className={`rounded-b-lg border-2 border-t-0 ${stage.color} min-h-[500px] p-3 space-y-3 transition-all duration-200 ${
          isOver ? 'bg-blue-50 border-blue-400 shadow-inner' : ''
        }`}
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
  // Sample properties data (would come from API)
  const properties = [
    {
      id: 1,
      address: '103 Gibbs Ave',
      city: 'Newport',
      state: 'RI',
      units: 10,
      assessed: '$1,202,800',
      stage: 'reviewing',
      market: 'Newport',
      notes: ''
    },
    {
      id: 2,
      address: '9-11 Sherman St',
      city: 'Newport', 
      state: 'RI',
      units: 5,
      assessed: '$1,262,300',
      stage: 'engaged',
      market: 'Newport',
      notes: 'Great property, need to follow up @09/15/25'
    },
    {
      id: 3,
      address: 'Kingston Ave',
      city: 'Newport',
      state: 'RI', 
      units: 286,
      assessed: '$3,468,900',
      stage: 'analyzing',
      market: 'Newport',
      notes: 'Large complex - schedule site visit @09/20/25'
    },
    {
      id: 4,
      address: '14 Everett St',
      city: 'Newport',
      state: 'RI',
      units: 5,
      assessed: '$976,600',
      stage: 'loi-sent',
      market: 'Newport',
      notes: 'Owner responded - waiting for financials'
    }
  ];

  const [selectedMarket, setSelectedMarket] = useState('All');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [propertiesData, setPropertiesData] = useState(properties);
  
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

  // Get unique markets from properties
  const allMarkets = ['All', ...Array.from(new Set(propertiesData.map(p => p.market)))];

  // Filter properties by selected market
  const filteredProperties = selectedMarket === 'All' 
    ? propertiesData 
    : propertiesData.filter(p => p.market === selectedMarket);

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
    if (overId.includes('droppable-')) {
      stageId = overId.replace('droppable-', '');
    }
    
    const targetStage = pipelineStages.find(stage => stage.id === stageId);
    
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

    // Make API call to update database
    try {
      const response = await fetch('/api/pipeline', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: activeId,
          stage: targetStage.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update property stage');
      }

      console.log(`Successfully moved property ${activeId} to stage ${targetStage.id}`);
    } catch (error) {
      console.error('Error updating property stage:', error);
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
  }, {} as Record<string, typeof properties>);

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ 
        left: -320, // Width of one column plus gap
        behavior: 'smooth' 
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ 
        left: 320, // Width of one column plus gap
        behavior: 'smooth' 
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
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
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {allMarkets.map(market => (
                  <option key={market} value={market}>{market}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pipeline Kanban Board */}
        <div className="relative">
          {/* Navigation Chevrons */}
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-200 rounded-full p-3 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-200 rounded-full p-3 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>

          {/* Scrollable Container */}
          <div 
            ref={scrollContainerRef}
            className="flex space-x-4 overflow-x-auto pb-4 mx-12"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none'
            } as React.CSSProperties}
          >
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
      </div>
    </div>
    
    {/* Drag Overlay */}
    <DragOverlay>
      {activeId ? (
        <div className="bg-white rounded-lg p-4 shadow-xl border-2 border-blue-400 bg-blue-50 opacity-95 rotate-3 scale-105 cursor-grabbing">
          {(() => {
            const draggedProperty = propertiesData.find(p => p.id === activeId);
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