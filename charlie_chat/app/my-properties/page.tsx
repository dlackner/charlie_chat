"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPropertiesAccess } from "./components/useMyPropertiesAccess";
import { PropertyCardsView } from './components/PropertyCardsView';
import { MatrixView } from './components/MatrixView';
import { generateMarketingLetter } from '@/app/templates/generateMarketingLetter';
import { exportPropertiesToCSV } from './components/csvExport';
import { handleSkipTraceForProperty } from './components/skipTraceIntegration';
import { PropertyMapView } from './components/PropertyMapView';
import { PageSavedProperty as SavedProperty } from './types';
import { RentDataProcessor } from './components/rentDataProcessor';
import { CharlieAlert } from './components/CharlieAlert';

import {
    Star,
    FileText,
    ChevronDown,
    Grid3X3,
    Map,
    BarChart3,
    Heart,
    Search,
    Filter,
    CheckSquare,
    Square
} from "lucide-react";

type ViewMode = 'cards' | 'map' | 'matrix';
type DocumentTemplate = 'marketing-letter' | 'loi-1' | 'loi-2' | 'loi-3' | 'loi-4' | 'loi-5';

// Skip trace re-run cutoff - easily changeable
const SKIP_TRACE_REFRESH_MONTHS = 6;

export default function MyPropertiesPage() {
    const { user, supabase, isLoading: isAuthLoading } = useAuth();
    const { hasAccess, isLoading: isLoadingAccess } = useMyPropertiesAccess();
    const router = useRouter();

    // State management
    const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
    const [isLoadingProperties, setIsLoadingProperties] = useState(true);
    const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [skipTraceLoading, setSkipTraceLoading] = useState<Set<string>>(new Set());
    const [skipTraceErrors, setSkipTraceErrors] = useState<{ [key: string]: string }>({});
    const [bulkSkipTraceLoading, setBulkSkipTraceLoading] = useState(false);
    const [bulkSkipTraceProgress, setBulkSkipTraceProgress] = useState({ completed: 0, total: 0 });
    const [matrixSelectionMode, setMatrixSelectionMode] = useState<'analysis' | 'selection'>('analysis');
    const [rentData, setRentData] = useState<any[]>([]);
    const [isLoadingRentData, setIsLoadingRentData] = useState(true);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    
    // CharlieAlert state
    const [charlieAlert, setCharlieAlert] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        type?: 'info' | 'warning' | 'error' | 'success';
        showConfirm?: boolean;
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        message: '',
    });

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Helper function to show Charlie alerts
    const showCharlieAlert = (
        message: string,
        options?: {
            title?: string;
            type?: 'info' | 'warning' | 'error' | 'success';
            showConfirm?: boolean;
            onConfirm?: () => void;
            confirmText?: string;
            cancelText?: string;
        }
    ) => {
        setCharlieAlert({
            isOpen: true,
            message,
            ...options,
        });
    };

    // Helper function to check if a property can be skip traced
    const canSkipTrace = (property: SavedProperty): boolean => {
        if (!property.last_skip_trace) return true; // Never attempted
        
        const lastAttempt = new Date(property.last_skip_trace);
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - SKIP_TRACE_REFRESH_MONTHS);
        
        return lastAttempt < cutoffDate; // Can re-run if older than cutoff
    };

    // Close dropdown when clicking outside for More button on Document Generation
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDocumentDropdown(false);
            }
        };

        if (showDocumentDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDocumentDropdown]);

    // Load and process rent data
    useEffect(() => {
        const loadRentData = async () => {
            try {
                console.log('=== STARTING RENT DATA LOAD ===');
                setIsLoadingRentData(true);

                const response = await fetch('/Monthly Rental Rates.csv?v=3');
                console.log('CSV fetch response:', response.ok, response.status);

                if (!response.ok) {
                    throw new Error(`Failed to fetch CSV: ${response.status}`);
                }

                const csvText = await response.text();
                console.log('CSV loaded, length:', csvText.length);
                console.log('First 300 chars:', csvText.substring(0, 300));

                const processor = new RentDataProcessor(csvText);
                const processedData = processor.processRentData();

                console.log('Final processed data:', processedData.length, 'entries');
                console.log('Sample:', processedData.slice(0, 2));

                setRentData(processedData);
                console.log('=== RENT DATA SET SUCCESSFULLY ===');
                console.log('Metros with coordinates:', processedData.filter(d => d.latitude && d.longitude).map(d => d.RegionName));
                console.log('First few metros without coordinates:', processedData.filter(d => !d.latitude || !d.longitude).slice(0, 5).map(d => d.RegionName));
            } catch (error) {
                console.error('=== RENT DATA LOAD FAILED ===', error);
                setRentData([]);
            } finally {
                setIsLoadingRentData(false);
                console.log('=== RENT DATA LOADING FINISHED ===');
            }
        };

        loadRentData();
    }, []);

    // Close dropdown on Escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowDocumentDropdown(false);
            }
        };

        if (showDocumentDropdown) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showDocumentDropdown]);

    // Close delete confirmation modal on Escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showDeleteConfirmation) {
                setShowDeleteConfirmation(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showDeleteConfirmation]);

    // Load saved properties
    useEffect(() => {
        const loadSavedProperties = async () => {
            if (!user || !supabase || !hasAccess) {
                setIsLoadingProperties(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("user_favorites")
                    .select(`
            saved_at,
            saved_properties (*, owner_first_name, owner_last_name, notes)
          `)
                    .eq("user_id", user.id)
                    .eq("is_active", true);

                if (error) {
                    console.error("Error loading saved properties:", error);
                    setErrorMessage("Failed to load your saved properties");
                } else if (data) {
                    const properties: SavedProperty[] = data.map((item: any) => {
                        const prop = item.saved_properties;
                        return {
                            ...prop,
                            saved_at: item.saved_at,
                            skipTraceData: prop.skip_trace_data,
                            mailAddress: {
                                street: prop.owner_street || '',
                                city: prop.owner_city || '',
                                state: prop.owner_state || '',
                                zip: prop.owner_zip || '',
                                address: prop.owner_address || '', // optional
                            },
                        } as SavedProperty;
                    });
                    setSavedProperties(properties);
                }
            } catch (error) {
                console.error("Unexpected error loading saved properties:", error);
                setErrorMessage("An unexpected error occurred");
            } finally {
                setIsLoadingProperties(false);
            }
        };

        if (hasAccess && user && supabase && !isLoadingAccess) {
            loadSavedProperties();
        } else if (!isLoadingAccess) {
            setIsLoadingProperties(false);
        }
    }, [user, supabase, hasAccess, isLoadingAccess]);

    // Handle property selection
    const togglePropertySelection = (propertyId: string) => {
        const newSelected = new Set(selectedProperties);
        if (newSelected.has(propertyId)) {
            newSelected.delete(propertyId);
        } else {
            newSelected.add(propertyId);
        }
        setSelectedProperties(newSelected);
    };

    const selectAllProperties = () => {
        if (selectedProperties.size > 0) {
            // If any properties are selected, deselect all and clear search
            setSelectedProperties(new Set());
            setSearchTerm('');
        } else {
            // If no properties are selected, select all
            setSelectedProperties(new Set(filteredProperties.map(p => p.property_id)));
        }
    };

    // Filter properties based on search
    const filteredProperties = savedProperties.filter(property =>
        property.address_full?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address_state?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // For map view: show selected properties if any are selected, otherwise show all filtered properties
    const mapViewProperties = selectedProperties.size > 0 
        ? filteredProperties.filter(property => selectedProperties.has(property.property_id))
        : filteredProperties;

    // Helper functions
    const calculateAge = (yearBuilt: number) => {
        return new Date().getFullYear() - yearBuilt;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Notes update handler
    const handleUpdateNotes = async (propertyId: string, notes: string) => {
        try {
            const { error } = await supabase
                .from('saved_properties')
                .update({ notes })
                .eq('property_id', propertyId);

            if (error) {
                console.error('Error updating notes:', error);
                // Optional: Add toast notification for error
            } else {
                // Update local state
                setSavedProperties(prev =>
                    prev.map(p =>
                        p.property_id === propertyId
                            ? { ...p, notes }
                            : p
                    )
                );
            }
        } catch (error) {
            console.error('Error saving notes:', error);
        }
    };

    // Bulk actions
    const handleRemoveSelectedProperties = async () => {
        if (selectedProperties.size === 0) return;
        setShowDeleteConfirmation(true);
    };

    // Confirm deletion of selected properties
    const confirmDeleteSelectedProperties = async () => {
        if (selectedProperties.size === 0) return;

        if (user && supabase) {
            try {
                // Remove each selected property
                for (const propertyId of selectedProperties) {
                    console.log("Attempting to remove property:", propertyId, "for user:", user.id);
                    
                    const { data, error } = await supabase
                        .from("user_favorites")
                        .update({ is_active: false })
                        .eq("user_id", user.id)
                        .eq("property_id", propertyId)
                        .select();

                    if (error) {
                        console.error("Error removing property:", propertyId);
                        console.error("Error details:", JSON.stringify(error, null, 2));
                        console.error("Error message:", error.message);
                        console.error("Error code:", error.code);
                    } else if (data && data.length === 0) {
                        console.warn("Property not found in favorites:", propertyId);
                    } else {
                        console.log("Successfully removed property:", propertyId, "Rows affected:", data?.length);
                    }
                }

                // Update local state - remove all selected properties
                setSavedProperties(prev =>
                    prev.filter(p => !selectedProperties.has(p.property_id))
                );

                // Clear the selection
                setSelectedProperties(new Set());

                console.log(`Removed ${selectedProperties.size} properties from My Properties`);
            } catch (error) {
                console.error("Unexpected error removing properties:", error);
            }
        }

        setShowDeleteConfirmation(false);
    };

    const handleCSVDownload = () => {
        exportPropertiesToCSV(savedProperties, selectedProperties, (message) => {
            showCharlieAlert(message, {
                type: 'warning',
                title: 'Selection Required'
            });
        });
    };

    const handleSkipTrace = async (propertyId: string, property: SavedProperty) => {
        // Add to loading state
        setSkipTraceLoading(prev => new Set(prev).add(propertyId));

        // Clear any previous errors
        setSkipTraceErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[propertyId];
            return newErrors;
        });

        // Call the skip trace integration function
        await handleSkipTraceForProperty(
            propertyId,
            property,
            handleSkipTraceSuccess,
            handleSkipTraceError
        );
    };

    const handleSkipTraceSuccess = (propertyId: string, skipTraceData: any) => {
        console.log('Skip trace success for:', propertyId, skipTraceData);

        // Update the property in state with skip trace data
        setSavedProperties(prev =>
            prev.map(p =>
                p.property_id === propertyId
                    ? { ...p, skipTraceData }
                    : p
            )
        );

        // Remove from loading state
        setSkipTraceLoading(prev => {
            const newSet = new Set(prev);
            newSet.delete(propertyId);
            return newSet;
        });

        console.log(`Skip trace completed for ${skipTraceData.name}`);
    };

    const handleSkipTraceError = async (propertyId: string, error: string) => {
        console.log('Skip trace failed for property:', propertyId, '-', error);

        // Update last_skip_trace in database even when it fails
        if (user && supabase) {
            try {
                console.log(`Attempting to update last_skip_trace for property ${propertyId}`);
                const { error: updateError, data: updateData } = await supabase
                    .from('saved_properties')
                    .update({ 
                        last_skip_trace: new Date().toISOString()
                    })
                    .eq('property_id', propertyId)
                    .select();

                console.log('Update result:', { updateError, updateData });

                if (updateError) {
                    console.error('Error updating last_skip_trace for failed attempt:', updateError);
                } else {
                    console.log(`Database updated successfully. Rows affected:`, updateData?.length || 0);
                    // Update local state to reflect the attempt - force new object reference
                    setSavedProperties(prev =>
                        prev.map(p =>
                            p.property_id === propertyId
                                ? { 
                                    ...p, 
                                    last_skip_trace: new Date().toISOString()
                                }
                                : p
                        )
                    );
                    console.log(`Updated last_skip_trace for property ${propertyId} after failed skip trace`);
                }
            } catch (err) {
                console.error('Unexpected error updating last_skip_trace:', err);
            }
        }

        // Add error to state
        setSkipTraceErrors(prev => ({
            ...prev,
            [propertyId]: error
        }));

        // Remove from loading state
        setSkipTraceLoading(prev => {
            const newSet = new Set(prev);
            newSet.delete(propertyId);
            return newSet;
        });

        showCharlieAlert(`Skip trace failed: ${error}`, { 
            type: 'error',
            title: 'Skip Trace Failed'
        });
    };

    const handleBulkSkipTrace = async () => {
        if (filteredProperties.length === 0) return;
        
        setBulkSkipTraceLoading(true);
        setBulkSkipTraceProgress({ completed: 0, total: filteredProperties.length });

        // Get properties that can be skip traced (never attempted or >6 months old)
        const propertiesToTrace = filteredProperties.filter(property => canSkipTrace(property));
        
        if (propertiesToTrace.length === 0) {
            showCharlieAlert('All properties have been recently skip traced. You can re-run skip trace after 6 months from the last attempt.', { 
                type: 'info',
                title: 'Skip Trace Up to Date'
            });
            setBulkSkipTraceLoading(false);
            return;
        }

        console.log(`Starting bulk skip trace for ${propertiesToTrace.length} properties...`);

        let completed = 0;
        const errors: string[] = [];

        // Process properties sequentially to avoid overwhelming the API
        for (const property of propertiesToTrace) {
            try {
                await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
                
                await handleSkipTraceForProperty(
                    property.property_id,
                    property,
                    (propertyId: string, skipTraceData: any) => {
                        handleSkipTraceSuccess(propertyId, skipTraceData);
                        completed++;
                        setBulkSkipTraceProgress({ completed, total: propertiesToTrace.length });
                    },
                    (propertyId: string, error: string) => {
                        errors.push(`${property.address_full}: ${error}`);
                        completed++;
                        setBulkSkipTraceProgress({ completed, total: propertiesToTrace.length });
                    }
                );
            } catch (error) {
                errors.push(`${property.address_full}: ${error}`);
                completed++;
                setBulkSkipTraceProgress({ completed, total: propertiesToTrace.length });
            }
        }

        setBulkSkipTraceLoading(false);
        
        showCharlieAlert('Skip trace complete! Owner contact information has been updated for all selected properties.', { 
            type: 'success',
            title: 'Skip Trace Complete'
        });
    };

    const handleDocumentGeneration = async (template: DocumentTemplate) => {
        if (selectedProperties.size === 0) return;

        const selected = savedProperties.filter(p =>
            selectedProperties.has(p.property_id)
        );

        if (!user || !supabase) {
            showCharlieAlert('Something went wrong with your session. Please refresh the page and try again.', { 
                type: 'error',
                title: 'Session Error'
            });
            return;
        }

        if (template !== 'marketing-letter') {
            console.log(`Document type "${template}" not implemented yet.`);
            return;
        }

        try {
            // Load sender profile
            const { data, error } = await supabase
                .from("profiles")
                .select("first_name, last_name, street_address, city, state, zipcode, phone_number, business_name, job_title, logo_base64")
                .eq("user_id", user.id)
                .single();

            if (error || !data) {
                console.error("Profile error:", error);
                showCharlieAlert('I need your profile information to personalize the marketing letters. Please complete your profile first.', { 
                    type: 'warning',
                    title: 'Profile Required'
                });
                return;
            }
            console.log("Profile data with logo:", { ...data, logo_base64: data.logo_base64 ? "Logo present" : "No logo" });

            const senderInfo = {
                name: `${data.first_name} ${data.last_name}`,
                address: data.street_address,
                cityStateZip: `${data.city}, ${data.state} ${data.zipcode}`,
                phone: data.phone_number?.replace(/(\d{3})(\d{3})(\d{4})/, "$1.$2.$3"),
                email: user.email,
                businessName: data.business_name || null,
                jobTitle: data.job_title || null,
                logoBase64: data.logo_base64 || null,
            };

            for (const property of selected) {
                console.log("Generating letter for:", property.address_full);
                await generateMarketingLetter(property as any, senderInfo as any);
            }

            //alert("Marketing letter(s) downloaded.");
            setShowDocumentDropdown(false);
        } catch (err) {
            console.error("Document generation failed:", err);
            showCharlieAlert('Something went wrong while generating your document. Please try again.', { 
                type: 'error',
                title: 'Document Generation Failed'
            });
        }
    };

    const handleRemoveFromFavorites = async (propertyId: string) => {
        if (!user || !supabase) return;

        try {
            const { error } = await supabase
                .from("user_favorites")
                .update({ is_active: false })
                .eq("user_id", user.id)
                .eq("property_id", propertyId);

            if (error) {
                console.error("Error removing from favorites:", error);
            } else {
                setSavedProperties(prev => prev.filter(p => p.property_id !== propertyId));
                setSelectedProperties(prev => {
                    const newSelected = new Set(prev);
                    newSelected.delete(propertyId);
                    return newSelected;
                });
            }
        } catch (error) {
            console.error("Unexpected error removing from favorites:", error);
        }
    };

    const handleStartSearching = () => {
        router.push("/");
    };

    console.log('About to render PropertyMapView:', {
        propertiesLength: filteredProperties.length,
        rentDataLength: Array.isArray(rentData) ? rentData.length : 'not array',
        isLoadingProperties,
        isLoadingRentData,
        rentDataType: typeof rentData
    });

    // Redirect if not authenticated
    if (!isAuthLoading && !user) {
        router.push("/login");
        return null;
    }

    // Loading state
    if (isAuthLoading || isLoadingAccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Access denied
    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <Star size={48} className="mx-auto text-gray-400 mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Upgrade Required</h1>
                    <p className="text-gray-600 mb-6">
                        My Properties is available for Pro and Cohort members. Upgrade your account to save and manage your investment opportunities.
                    </p>
                    <button
                        onClick={() => router.push("/pricing")}
                        className="text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-colors"
                        style={{ backgroundColor: '#1C599F' }}
                    >
                        View Pricing
                    </button>
                </div>
            </div>
        );
    }

    if (viewMode === 'map') {
        console.log('RENDERING MAP VIEW:', {
            rentDataLength: rentData.length,
            isLoadingRentData,
            hasProperties: filteredProperties.length
        });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center mb-2">
                        <Star size={28} className="mr-3" style={{ color: '#1C599F' }} />
                        <h1 className="text-3xl font-bold text-gray-900">My Properties</h1>
                    </div>
                    <p className="text-gray-600">
                        {isLoadingProperties
                            ? "Loading your saved properties..."
                            : `${filteredProperties.length} saved investment ${filteredProperties.length === 1 ? 'opportunity' : 'opportunities'}`
                        }
                    </p>
                </div>

                {/* Fixed spacing - always maintain the height */}
                <div className="mb-6">
                    {viewMode === 'cards' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                {/* Left side - Selection */}
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={selectAllProperties}
                                        disabled={filteredProperties.length === 0}
                                        className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {selectedProperties.size > 0 ?
                                            <CheckSquare size={16} /> : <Square size={16} />
                                        }
                                        <span>
                                            {selectedProperties.size > 0
                                                ? 'Deselect All'
                                                : 'Select All'
                                            }
                                        </span>
                                    </button>

                                    {selectedProperties.size > 0 && (
                                        <>
                                            <span className="text-sm text-gray-600">
                                                {selectedProperties.size} selected
                                            </span>
                                            <button
                                                onClick={handleRemoveSelectedProperties}
                                                className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                                            >
                                                Delete Favorites?
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Right side - Actions */}
                                <div className="flex items-center space-x-3">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search properties..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>

                                    {/* Skip Trace All */}
                                    <button
                                        onClick={handleBulkSkipTrace}
                                        disabled={filteredProperties.length === 0 || bulkSkipTraceLoading}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                                    >
                                        <Search size={16} />
                                        <span>
                                            {bulkSkipTraceLoading 
                                                ? `Skip Tracing... (${bulkSkipTraceProgress.completed}/${bulkSkipTraceProgress.total})`
                                                : `Skip Trace All (${filteredProperties.length})`
                                            }
                                        </span>
                                    </button>

                                    {/* Document Generation Dropdown */}
                                    <div className="relative" ref={dropdownRef}>
                                        <button
                                            onClick={() => setShowDocumentDropdown(!showDocumentDropdown)}
                                            disabled={selectedProperties.size === 0}
                                            className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                                            style={{ backgroundColor: '#1C599F' }}
                                        >
                                            <FileText size={16} />
                                            <span>Generate Documents</span>
                                            <ChevronDown size={14} />
                                        </button>

                                        {showDocumentDropdown && selectedProperties.size > 0 && (
                                            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]">
                                                <div className="py-2">
                                                    {/* ── Marketing Letter ─────────────────────────── */}
                                                    <button
                                                        onClick={() => {
                                                            handleDocumentGeneration('marketing-letter');
                                                            setShowDocumentDropdown(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    >
                                                        &gt; Marketing Letter
                                                    </button>

                                                    <div className="border-t border-gray-200 my-1"></div>

                                                    {/* ── Letter of Intent ────────────────────────── */}
                                                    <button
                                                        onClick={() => {
                                                            setShowDocumentDropdown(false);

                                                            // Get the selected property IDs
                                                            const selectedPropertyIds = Array.from(selectedProperties);

                                                            // Check if exactly one property is selected
                                                            if (selectedPropertyIds.length === 0) {
                                                                showCharlieAlert('Please select a property first to generate a Letter of Intent.', { 
                                                                    type: 'warning',
                                                                    title: 'No Property Selected'
                                                                });
                                                                return;
                                                            }

                                                            if (selectedPropertyIds.length > 1) {
                                                                showCharlieAlert('Please select only ONE property at a time for Letter of Intent generation.', { 
                                                                    type: 'warning',
                                                                    title: 'Multiple Properties Selected'
                                                                });
                                                                return;
                                                            }

                                                            // Navigate to templates page with the single property ID
                                                            const propertyId = selectedPropertyIds[0];
                                                            router.push(`/templates?propertyId=${propertyId}`);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    >
                                                        &gt; Letter of Intent
                                                    </button>

                                                    <div className="border-t border-gray-200 my-1"></div>

                                                    {/* ── Download CSV ─────────────────────────────── */}
                                                    <button
                                                        onClick={() => {
                                                            handleCSVDownload();
                                                            setShowDocumentDropdown(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    >
                                                        &gt; Download CSV
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: '72px' }}></div>
                    )}
                </div>

                {/* View Mode Tabs */}
                <div className="flex items-center space-x-1 mb-6">
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'cards'
                            ? 'text-white'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                        style={viewMode === 'cards' ? { backgroundColor: '#1C599F' } : {}}
                    >
                        <Grid3X3 size={16} />
                        <span>Cards</span>
                    </button>

                    <button
                        onClick={() => setViewMode('map')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'map'
                            ? 'text-white'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                        style={viewMode === 'map' ? { backgroundColor: '#1C599F' } : {}}
                    >
                        <Map size={16} />
                        <span>Map</span>
                    </button>

                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'matrix'
                            ? 'text-white'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                        style={viewMode === 'matrix' ? { backgroundColor: '#1C599F' } : {}}
                    >
                        <BarChart3 size={16} />
                        <span>Matrix</span>
                    </button>
                </div>

                {/* Error Message */}
                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                        {errorMessage}
                    </div>
                )}

                {/* Content Area */}
                {isLoadingProperties ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : viewMode === 'cards' ? (
                    /* Cards View - Use the new PropertyCardsView component */
                    <PropertyCardsView
                        properties={savedProperties.length === 0 ? [] : filteredProperties}
                        totalPropertiesCount={savedProperties.length}
                        searchTerm={searchTerm}
                        selectedProperties={selectedProperties}
                        onToggleSelection={togglePropertySelection}
                        onRemoveFromFavorites={handleRemoveFromFavorites}
                        onStartSearching={handleStartSearching}
                        onUpdateNotes={handleUpdateNotes}
                        onSkipTrace={handleSkipTrace}
                        onSkipTraceError={handleSkipTraceError}
                        canSkipTrace={canSkipTrace}
                        isLoading={isLoadingProperties}
                    />
                ) : viewMode === 'map' ? (
                    /* Map View */
                    <PropertyMapView
                        properties={savedProperties.length === 0 ? [] : mapViewProperties}
                        selectedProperties={selectedProperties}
                        onToggleSelection={togglePropertySelection}
                        onRemoveFromFavorites={handleRemoveFromFavorites}
                        onStartSearching={handleStartSearching}
                        onUpdateNotes={handleUpdateNotes}
                        onSkipTrace={handleSkipTrace}
                        isLoading={isLoadingProperties || isLoadingRentData}
                        rentData={Array.isArray(rentData) ? rentData : []} // Ensure it's always an array
                    />
                ) : (
                    /* Matrix View */
                    <MatrixView
                        properties={filteredProperties}
                        selectedProperties={selectedProperties}
                        onToggleSelection={togglePropertySelection}
                        onRemoveFromFavorites={handleRemoveFromFavorites}
                        onUpdateNotes={handleUpdateNotes}
                        onSkipTrace={handleSkipTrace}
                        selectionMode={matrixSelectionMode}
                    />
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && (
                <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-mx-4 border-1" style={{ borderColor: '#1C599F' }}>
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Delete Favorites</h3>
                        </div>

                        <p className="text-gray-600 mb-6">
                            {selectedProperties.size > 0 && (
                                <span>
                                    Careful! You are about to remove {selectedProperties.size} selected {selectedProperties.size === 1 ? 'property' : 'properties'} from your favorites.
                                </span>
                            )}
                        </p>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirmation(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteSelectedProperties}
                                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete Favorites
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Charlie Alert Modal */}
            <CharlieAlert
                isOpen={charlieAlert.isOpen}
                onClose={() => setCharlieAlert(prev => ({ ...prev, isOpen: false }))}
                title={charlieAlert.title}
                message={charlieAlert.message}
                type={charlieAlert.type}
                showConfirm={charlieAlert.showConfirm}
                onConfirm={charlieAlert.onConfirm}
                confirmText={charlieAlert.confirmText}
                cancelText={charlieAlert.cancelText}
            />
        </div>
    );
}