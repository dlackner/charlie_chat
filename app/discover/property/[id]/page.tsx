/*
 * CHARLIE2 V2 - Property Detail Page
 * Comprehensive property details with AI investment analysis
 * Features: Fixed navigation, working AI analysis, clean UI
 * TODO: Move to app/v2/discover/property/[id]/ for proper V2 organization
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, ExternalLink, ChevronDown, ChevronUp, Zap, Phone, Mail, User, Heart } from 'lucide-react';
import { StreetViewImage } from '@/components/ui/StreetViewImage';
import { PropertyInfoSections } from '@/components/shared/property-details/PropertyInfoSections';
import { AIInvestmentAnalysis } from '@/components/shared/property-details/AIInvestmentAnalysis';
import { EngagementCenter } from '@/components/shared/EngagementCenter';
import { CashFlowReportsModal } from '@/components/shared/CashFlowReportsModal';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generate10YearCashFlowReport } from '@/app/offer-analyzer/cash-flow-report';
import { generateMarketingLetter } from '@/app/templates/generateMarketingLetter';
import { incrementActivityCount } from '@/lib/v2/activityCounter';
import { useAlert } from '@/components/shared/AlertModal';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showError, showWarning, showSuccess, AlertComponent } = useAlert();
  const [property, setProperty] = useState<any>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [selectedPropertyOffers, setSelectedPropertyOffers] = useState<any[]>([]);
  const [showCashFlowReportsModal, setShowCashFlowReportsModal] = useState(false);
  
  // Determine if we're in DISCOVER, ENGAGE, or BUYBOX context
  const context = searchParams.get('context');
  const isEngageContext = context === 'engage' || 
                         (typeof window !== 'undefined' && document.referrer.includes('/engage'));
  const isBuyboxContext = context === 'buybox' || 
                         (typeof window !== 'undefined' && document.referrer.includes('/buybox'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSkipTraceExpanded, setIsSkipTraceExpanded] = useState(false);
  const [isSkipTracing, setIsSkipTracing] = useState(false);
  const [skipTraceData, setSkipTraceData] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Fetch user class
  useEffect(() => {
    if (user?.id && !userClass) {
      const fetchUserClass = async () => {
        try {
          const supabase = createSupabaseBrowserClient();
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_class')
            .eq('user_id', user.id)
            .single();
            
          if (profile?.user_class) {
            setUserClass(profile.user_class);
          }
        } catch (error) {
          console.error('Error fetching user class:', error);
        }
      };
      
      fetchUserClass();
    }
  }, [user?.id, userClass]);

  // Fetch property data when component mounts
  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!params.id) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/realestateapi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: params.id, // Search by specific property ID
            propertyType: "MFR", // Only multifamily properties
            size: 1,
            obfuscate: false,
            summary: false
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch property data');
        }

        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          const foundProperty = data.data[0];
          console.log('Property data received:', foundProperty);
          console.log('Property fields available:', Object.keys(foundProperty));
          setProperty(foundProperty);

          // Check for existing skip trace data in saved_properties table if in ENGAGE context
          console.log('🔍 isEngageContext:', isEngageContext);
          console.log('🔍 context from URL:', context);
          if (isEngageContext) {
            console.log('🔍 Checking for existing skip trace data for property_id:', foundProperty.id);
            const supabase = createSupabaseBrowserClient();
            const { data: savedProperty, error: savedError } = await supabase
              .from('saved_properties')
              .select('id, skip_trace_data, last_skip_trace')
              .eq('property_id', foundProperty.id)
              .single();

            console.log('🔍 Database query result:', { savedProperty, savedError });
            if (!savedError && savedProperty) {
              if (savedProperty.skip_trace_data) {
                console.log('✅ Found existing skip trace data:', savedProperty.skip_trace_data);
                // Parse skip trace data like the email function does
                let parsedSkipTraceData;
                try {
                  if (typeof savedProperty.skip_trace_data === 'string') {
                    parsedSkipTraceData = JSON.parse(savedProperty.skip_trace_data);
                  } else {
                    parsedSkipTraceData = savedProperty.skip_trace_data;
                  }
                } catch (error) {
                  parsedSkipTraceData = savedProperty.skip_trace_data;
                }
                setSkipTraceData(parsedSkipTraceData);
              }
              // Store the saved_properties UUID id
              if (savedProperty.id) {
                console.log('🔍 Found saved_properties UUID:', savedProperty.id);
                foundProperty.id = savedProperty.id; // Override with UUID from saved_properties
              }
            } else {
              console.log('❌ No saved property found or error occurred');
            }
          } else {
            console.log('🔍 Skipping skip trace check - not in engage context');
          }
        } else {
          console.log('No property data found. API response:', data);
          setError('Property not found');
        }
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyData();
  }, [params.id]);

  // Check if property is favorited
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!property?.id || !user?.id) return;
      
      try {
        const response = await fetch(`/api/favorites?property_id=${property.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsFavorited(data.is_favorite);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [property?.id, user?.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleToggleFavorite = async () => {
    if (!property?.id || !user?.id || isToggling) return;
    
    setIsToggling(true);
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.id,
          property_data: property,
          action: isFavorited ? 'remove' : 'add'
        }),
      });

      if (response.ok) {
        setIsFavorited(!isFavorited);
      } else {
        console.error('Failed to toggle favorite');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleBackToSearch = () => {
    // Check if we have a back URL parameter
    const backUrl = searchParams.get('back');
    if (backUrl) {
      try {
        const decodedUrl = decodeURIComponent(backUrl);
        window.location.href = decodedUrl;
      } catch (error) {
        console.error('Error decoding back URL:', error);
        // Fallback based on context
        if (isEngageContext) {
          router.push('/engage');
        } else if (isBuyboxContext) {
          router.push('/discover/buybox');
        } else {
          router.push('/discover');
        }
      }
    } else {
      // Fallback based on context if no back parameter
      if (isEngageContext) {
        router.push('/engage');
      } else if (isBuyboxContext) {
        router.push('/discover/buybox');
      } else {
        router.push('/discover');
      }
    }
  };

  // Handle viewing offers modal
  const handleViewOffers = async () => {
    if (!user) {
      showWarning('Please log in to view offers.', 'Login Required');
      return;
    }

    try {
      // Fetch offers from the offer_scenarios table (all user offers)
      const response = await fetch('/api/offer-scenarios?all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }
      const data = await response.json();

      // Transform the offers data
      const transformedOffers = data.scenarios.map((offer: any) => ({
        id: offer.id,
        name: offer.offer_name || `Offer ${offer.id}`,
        description: offer.offer_description || 'No description',
        property_address: offer.saved_properties?.address_full || 'Unknown Address',
        offer_amount: offer.offer_data?.purchasePrice ? `$${parseInt(offer.offer_data.purchasePrice).toLocaleString()}` : 'N/A',
        created_date: new Date(offer.created_at).toLocaleDateString(),
        property_id: offer.property_id,
        offer_data: offer.offer_data
      }));

      setSelectedPropertyOffers(transformedOffers);
      setShowOffersModal(true);
    } catch (error) {
      // Error fetching offers
      showError('Failed to load analyses. Please try again.', 'Load Failed');
    }
  };

  const handleOfferSelection = (offerId: number, propertyId: string) => {
    // Navigate to offer analyzer with the selected offer ID
    // Use the current property's UUID from the property details page
    const currentPropertyId = property?.id || propertyId; // Use property.id (UUID) if available
    const params = new URLSearchParams({
      offerId: offerId.toString(),
      id: currentPropertyId
    });
    router.push(`/offer-analyzer?${params.toString()}`);
    setShowOffersModal(false);
  };

  const handleGenerateReportFromModal = async (propertyWithOffer: any) => {
    try {
      // Extract the offer data and transform it for the cash flow report
      const offerData = propertyWithOffer.offer_data;
      
      console.log('🔍 Property with offer:', propertyWithOffer);
      console.log('🔍 Offer data:', offerData);
      console.log('🔍 All offer data keys:', Object.keys(offerData || {}));
      console.log('🔍 Sample values:', {
        purchasePrice: offerData?.purchasePrice,
        downPaymentPercentage: offerData?.downPaymentPercentage,
        interestRate: offerData?.interestRate,
        propertyTaxes: offerData?.propertyTaxes,
        insurance: offerData?.insurance,
        numUnits: offerData?.numUnits,
        vacancyRate: offerData?.vacancyRate
      });
      
      if (!offerData) {
        showWarning('No pricing data found for this offer.', 'No Pricing Data');
        return;
      }

      // Get user profile for report branding
      const profileResponse = await fetch('/api/profile');
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const profileData = await profileResponse.json();

      // Generate the cash flow report (using exact same parameters as engage page)
      await generate10YearCashFlowReport({
        // Property address from offer
        propertyStreet: propertyWithOffer.property_address,
        
        // Financial parameters from saved offer data
        purchasePrice: parseFloat(offerData.purchasePrice) || 0,
        downPaymentPercentage: parseFloat(offerData.downPaymentPercentage) || 20,
        interestRate: parseFloat(offerData.interestRate) || 7.0,
        loanStructure: offerData.loanStructure || 'amortizing',
        amortizationPeriodYears: parseInt(offerData.amortizationPeriodYears) || 30,
        interestOnlyPeriodYears: parseInt(offerData.interestOnlyPeriodYears) || 0,
        closingCostsPercentage: parseFloat(offerData.closingCostsPercentage) || 3,
        
        // Income parameters
        numUnits: parseInt(offerData.numUnits) || 1,
        avgMonthlyRentPerUnit: parseFloat(offerData.avgMonthlyRentPerUnit) || 0,
        vacancyRate: parseFloat(offerData.vacancyRate) || 10,
        annualRentalGrowthRate: parseFloat(offerData.annualRentalGrowthRate) || 2,
        otherIncomeAnnual: parseFloat(offerData.otherIncomeAnnual) || 0,
        incomeReductionsAnnual: parseFloat(offerData.incomeReductionsAnnual) || 0,
        
        // Expense parameters
        propertyTaxes: parseFloat(offerData.propertyTaxes) || 0,
        insurance: parseFloat(offerData.insurance) || 0,
        propertyManagementFeePercentage: parseFloat(offerData.propertyManagementFeePercentage) || 6,
        maintenanceRepairsAnnual: parseFloat(offerData.maintenanceRepairsAnnual) || 0,
        utilitiesAnnual: parseFloat(offerData.utilitiesAnnual) || 0,
        contractServicesAnnual: parseFloat(offerData.contractServicesAnnual) || 0,
        payrollAnnual: parseFloat(offerData.payrollAnnual) || 0,
        marketingAnnual: parseFloat(offerData.marketingAnnual) || 0,
        gAndAAnnual: parseFloat(offerData.gAndAAnnual) || 0,
        otherExpensesAnnual: parseFloat(offerData.otherExpensesAnnual) || 0,
        expenseGrowthRate: parseFloat(offerData.expenseGrowthRate) || 3,
        
        // Capital reserves
        capitalReservePerUnitAnnual: parseFloat(offerData.capitalReservePerUnitAnnual) || 300,
        
        // Investment timeline
        holdingPeriodYears: parseInt(offerData.holdingPeriodYears) || 10,
        
        // Mode settings
        usePercentageMode: offerData.usePercentageMode || false,
        operatingExpensePercentage: parseFloat(offerData.operatingExpensePercentage) || 50
      });

      showSuccess('10-Year Cash Flow Report generated and downloaded successfully!', 'Success');
      
      // Increment activity count
      if (user?.id) {
        await incrementActivityCount(user.id, 'offers_created');
      }
    } catch (error) {
      console.error('Cash flow report generation error:', error);
      showError('Failed to generate cash flow report. Please try again.', 'Report Generation Failed');
    }
  };

  // Handle document actions from Engagement Center
  const handleDocumentAction = async (action: string) => {
    if (!property) {
      showWarning('No property data available', 'Property Error');
      return;
    }

    // Transform property data to match engage page format
    const transformedProperty = {
      // Keep ALL raw database fields including property_id
      ...property,
      // Add display mappings without overwriting property_id
      address: property.address_street || property.address_full || 'Unknown Address',
      city: property.address_city || 'Unknown City',
      state: property.address_state || 'Unknown State',
      zip: property.address_zip || 'Unknown Zip',
      owner_first_name: property.owner_first_name,
      owner_last_name: property.owner_last_name,
      skip_trace_data: skipTraceData
    };
    
    // Use the final id from transformedProperty (after spread)
    const propertyId = transformedProperty.id;

    switch (action) {
      case 'marketing-letter':
        handleGenerateMarketingLetters([transformedProperty]);
        break;
      case 'email':
        handleGenerateEmail(transformedProperty);
        break;
      case 'loi':
        // Navigate to templates page with property data for LOI generation
        const loiParams = new URLSearchParams({
          propertyAddress: `${transformedProperty.address}, ${transformedProperty.city}, ${transformedProperty.state} ${transformedProperty.zip}`,
          ownerFirst: transformedProperty.owner_first_name || '',
          ownerLast: transformedProperty.owner_last_name || '',
          propertyId: propertyId.toString(),
          returnUrl: `/discover/property/${propertyId}?context=engage`
        });
        router.push(`/templates?${loiParams.toString()}`);
        break;
      case 'purchase-sale':
        // Navigate to templates page with property data for Purchase & Sale generation
        const psParams = new URLSearchParams({
          propertyAddress: `${transformedProperty.address}, ${transformedProperty.city}, ${transformedProperty.state} ${transformedProperty.zip}`,
          ownerFirst: transformedProperty.owner_first_name || '',
          ownerLast: transformedProperty.owner_last_name || '',
          propertyId: propertyId.toString(),
          returnUrl: `/discover/property/${propertyId}?context=engage`,
          type: 'purchase_sale'
        });
        router.push(`/templates?${psParams.toString()}`);
        break;
      case 'create-offer':
        // Navigate to offer analyzer with property data
        const offerParams = new URLSearchParams({
          address: transformedProperty.address,
          city: transformedProperty.city,
          state: transformedProperty.state,
          units: property.units_count?.toString() || '1',
          assessed: property.assessed_value ? `$${parseInt(property.assessed_value).toLocaleString()}` : 'Unknown',
          built: property.year_built?.toString() || '',
          id: propertyId.toString()
        });
        router.push(`/offer-analyzer?${offerParams.toString()}`);
        break;
      case 'view-offers':
        // Show offers modal
        handleViewOffers();
        break;
      case 'cash-flow-report':
        // Show cash flow reports modal
        setShowCashFlowReportsModal(true);
        break;
      case 'csv':
        handleCSVExport([transformedProperty]);
        break;
      default:
        showWarning(`Action "${action}" not implemented`, 'Feature Coming Soon');
    }
  };

  // Generate marketing letters
  const handleGenerateMarketingLetters = async (propertiesToProcess: any[]) => {
    try {
      if (!user) {
        showWarning('Please log in to generate marketing letters.', 'Login Required');
        return;
      }

      const profileResponse = await fetch('/api/profile');
      const profileData = await profileResponse.json();
      
      if (!profileResponse.ok) {
        showWarning('Unable to load your profile information. Please complete your profile to generate marketing letters.', 'Profile Error');
        return;
      }

      const senderInfo = {
        name: profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || user.email || 'Your Name',
        address: profileData.street_address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        zip: profileData.zipcode || '',
        phone: profileData.phone_number || '',
        email: profileData.email || user.email || '',
        business: profileData.business_name || '',
        title: profileData.job_title || '',
        logoBase64: profileData.logo_base64 || null
      };

      if (!senderInfo.name || !senderInfo.phone || !senderInfo.email) {
        showWarning('Please complete your profile with name, phone, and email to generate marketing letters.', 'Profile Incomplete');
        return;
      }

      for (const loopProperty of propertiesToProcess) {
        const cleanAddressFull = `${loopProperty.address}, ${loopProperty.city}, ${loopProperty.state}${loopProperty.zip ? ' ' + loopProperty.zip : ''}`.trim();
        
        const propertyData = {
          address_full: cleanAddressFull,
          address_state: loopProperty.state,
          owner_first_name: loopProperty.owner_first_name || null,
          owner_last_name: loopProperty.owner_last_name || null,
          property_id: loopProperty.id.toString()
        };
        
        const result = await generateMarketingLetter(propertyData, senderInfo, 'print');
        
        if (!result.success) {
          showError(`Error generating letter: ${result.message}`, 'Letter Generation Error');
          return;
        }

        // Add reminder note to property card
        try {
          if (!user?.id) {
            console.error('User ID not available for updating notes');
            return;
          }

          const supabase = createSupabaseBrowserClient();
          
          // Calculate reminder date (10 days from today)
          const today = new Date();
          const tenDaysLater = new Date(today);
          tenDaysLater.setDate(today.getDate() + 10);
          
          // Format date as MM/DD/YYYY
          const formatDate = (date: Date) => {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
          };
          
          const reminderNote = `@${formatDate(tenDaysLater)} Marketing letter follow-up reminder`;
          
          // Just get existing notes like the engage page does
          const correctPropertyId = property?.property_id || params.id;
          const { data: currentFavorite } = await supabase
            .from('user_favorites')
            .select('notes')
            .eq('user_id', user.id)
            .eq('property_id', correctPropertyId)
            .single();
          
          const existingNotes = currentFavorite?.notes || '';
          
          // Combine existing notes with new reminder note
          const updatedNotes = existingNotes 
            ? `${existingNotes}\n${reminderNote}`
            : reminderNote;
          
          // Update notes with reminder
          const propertyIdForApi = correctPropertyId;
          console.log('Marketing letter - correctPropertyId:', correctPropertyId, 'property.property_id:', property?.property_id, 'params.id:', params.id);
          const response = await fetch('/api/favorites/update-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: correctPropertyId,
              notes: updatedNotes
            })
          });
          
          if (!response.ok) {
            console.error('Marketing letter API call failed:', response.status, response.statusText);
            throw new Error('Failed to update notes');
          }
          
          console.log('Marketing letter reminder note added successfully');
        } catch (error) {
          console.error('Error adding marketing letter reminder note:', error);
          // Don't fail the entire operation if notes update fails
        }
      }

      showSuccess(`Marketing letter generated successfully!`, 'Success');
      if (user?.id) {
        await incrementActivityCount(user.id, 'marketing_letters_created');
      }
    } catch (error) {
      showError('Failed to generate marketing letters. Please try again.', 'Generation Failed');
    }
  };

  // Generate email
  const handleGenerateEmail = async (property: any) => {
    // Parse skip trace data to extract email address
    let skipTraceData;
    try {
      if (property.skip_trace_data) {
        if (typeof property.skip_trace_data === 'string') {
          skipTraceData = JSON.parse(property.skip_trace_data);
        } else {
          skipTraceData = property.skip_trace_data;
        }
      }
    } catch (error) {
      skipTraceData = property.skip_trace_data;
    }

    // Extract email from contacts array
    let emailAddress = null;
    if (skipTraceData?.contacts && Array.isArray(skipTraceData.contacts)) {
      for (const contact of skipTraceData.contacts) {
        if (contact.email) {
          emailAddress = contact.email;
          break;
        }
      }
    }
    // Fallback to old format if exists
    if (!emailAddress && skipTraceData?.email) {
      emailAddress = skipTraceData.email;
    }

    // Check if property has skip trace data with email
    if (!skipTraceData || !emailAddress) {
      showWarning(`No email address found. Skip trace data must be available to send emails.`, 'Email Not Available');
      return;
    }

    try {
      // Get user profile info
      if (!user) {
        showWarning('Please log in to generate emails.', 'Login Required');
        return;
      }

      const profileResponse = await fetch('/api/profile');
      if (!profileResponse.ok) {
        showWarning('Unable to load your profile information. Please complete your profile.', 'Profile Error');
        return;
      }

      const profileData = await profileResponse.json();
      const senderInfo = {
        name: profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || user.email || 'Your Name',
        address: profileData.street_address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        zip: profileData.zipcode || '',
        phone: profileData.phone_number || '',
        email: profileData.email || user.email || '',
        business: profileData.business_name || '',
        title: profileData.job_title || '',
        logoBase64: profileData.logo_base64 || null
      };

      // Prepare property data
      const propertyData = {
        address_full: `${property.address}, ${property.city}, ${property.state}${property.zip ? ' ' + property.zip : ''}`.trim(),
        address_state: property.state,
        owner_first_name: property.owner_first_name || null,
        owner_last_name: property.owner_last_name || null,
        property_id: property.id.toString()
      };

      // Generate email content
      const result = await generateMarketingLetter(propertyData, senderInfo, 'email');
      
      if (!result.success || !result.emailBody) {
        showError(`Failed to generate email content: ${result.message || 'Unknown error'}`, 'Email Generation Failed');
        return;
      }

      // Create and open mailto link
      const subject = `Inquiry About Your Property - ${propertyData.address_full}`;
      const encodedSubject = encodeURIComponent(subject);
      const encodedBody = encodeURIComponent(result.emailBody);
      
      const mailtoLink = `mailto:${emailAddress}?subject=${encodedSubject}&body=${encodedBody}`;
      window.open(mailtoLink, '_blank');

      // Increment activity count
      if (user?.id) {
        await incrementActivityCount(user.id, 'emails_sent');
      }

      // Add reminder notes to property card
      try {
        if (!user?.id) {
          console.error('User ID not available for updating notes');
          return;
        }

        const supabase = createSupabaseBrowserClient();
        
        // Use the numeric ID that works in the API logs
        const correctPropertyId = params.id;
        
        // Calculate reminder dates
        const today = new Date();
        const oneWeekLater = new Date(today);
        oneWeekLater.setDate(today.getDate() + 7);
        const twoWeeksLater = new Date(today);
        twoWeeksLater.setDate(today.getDate() + 14);
        
        // Format date as MM/DD/YYYY
        const formatDate = (date: Date) => {
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        };
        
        const oneWeekReminderNote = `@${formatDate(oneWeekLater)} One week email reminder`;
        const twoWeekReminderNote = `@${formatDate(twoWeeksLater)} Two week email reminder`;

        // Just get existing notes like the engage page does - ignore errors like marketing letter
        let existingNotes = '';
        try {
          const { data: currentFavorite } = await supabase
            .from('user_favorites')
            .select('notes')
            .eq('user_id', user.id)
            .eq('property_id', correctPropertyId)
            .single();
          existingNotes = currentFavorite?.notes || '';
        } catch (error) {
          console.log('Could not get existing notes, starting with empty notes');
          existingNotes = '';
        }
        
        // Combine existing notes with new reminder notes
        const updatedNotes = existingNotes 
          ? `${existingNotes}\n${oneWeekReminderNote}\n${twoWeekReminderNote}`
          : `${oneWeekReminderNote}\n${twoWeekReminderNote}`;
        
        // Update notes with both reminders
        console.log('Email - correctPropertyId:', correctPropertyId, 'property.property_id:', property?.property_id, 'params.id:', params.id);
        const response = await fetch('/api/favorites/update-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_id: correctPropertyId,
            notes: updatedNotes
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update notes');
        }
        
        console.log('Email reminder notes added successfully');
      } catch (error) {
        console.error('Error adding email reminder notes:', error);
        // Don't fail the entire operation if notes update fails
      }

      showSuccess('Email template generated and opened in your email client!', 'Success');
    } catch (error) {
      showError('Failed to generate email. Please try again.', 'Email Generation Failed');
    }
  };

  // Generate cash flow report
  const handleCashFlowReport = async (property: any) => {
    try {
      if (!property || !property.id) {
        showError('Property information missing', 'Error');
        return;
      }

      // The cash flow report expects a property_id
      await generate10YearCashFlowReport(property.original_property_id || property.id);
      
      showSuccess('10-Year Cash Flow Report generated and downloaded successfully!', 'Success');
      
      // Increment activity count
      if (user?.id) {
        await incrementActivityCount(user.id, 'offers_created');
      }
    } catch (error) {
      console.error('Cash flow report generation error:', error);
      showError('Failed to generate cash flow report. Please try again.', 'Report Generation Failed');
    }
  };

  // Export to CSV
  const handleCSVExport = (properties: any[]) => {
    try {
      // Define CSV headers
      const headers = [
        'Property ID', 'Address', 'City', 'State', 'Zip', 'Market',
        'Units', 'Year Built', 'Assessed Value', 'Estimated Value',
        'Owner First Name', 'Owner Last Name', 'Pipeline Status',
        'Source', 'Skip Traced', 'Notes'
      ];

      // Convert properties to CSV rows
      const rows = properties.map(p => [
        p.id || '',
        p.address || '',
        p.city || '',
        p.state || '',
        p.zip || '',
        p.market || '',
        p.units || '',
        p.built || p.year_built || '',
        p.assessed || '',
        p.estimated || '',
        p.owner_first_name || '',
        p.owner_last_name || '',
        p.pipelineStatus || p.status || '',
        p.source === 'A' ? 'Algorithm' : 'Manual',
        p.isSkipTraced ? 'Yes' : 'No',
        p.notes || ''
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        )
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `property_${properties[0]?.id || 'export'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess('Property data exported successfully!', 'Export Complete');
    } catch (error) {
      console.error('CSV export error:', error);
      showError('Failed to export property data. Please try again.', 'Export Failed');
    }
  };

  const handleSkipTrace = async () => {
    if (!property) return;
    
    setIsSkipTracing(true);
    
    try {
      // Step 1: Prepare skip trace request using property's owner mailing address
      const skipTraceRequest = {
        address: property.mail_address_street || property.address_street || '',
        city: property.mail_address_city || property.address_city || '',
        state: property.mail_address_state || property.address_state || '',
        zip: property.mail_address_zip || property.address_zip || '',
        first_name: property.owner_first_name || '',
        last_name: property.owner_last_name || ''
      };

      // Validate required fields
      if (!skipTraceRequest.address || !skipTraceRequest.city || !skipTraceRequest.state) {
        throw new Error('Insufficient address information for skip trace');
      }

      console.log('Skip trace request:', skipTraceRequest);

      // Step 2: Call the skip trace API
      const response = await fetch('/api/skiptrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skipTraceRequest)
      });

      const apiData = await response.json();

      if (!response.ok) {
        // Handle specific "property not found" error without throwing
        if (apiData.message && apiData.message.includes('Unable to locate valid property')) {
          // Update database to record failed skip trace attempt
          try {
            const supabase = createSupabaseBrowserClient();
            await supabase
              .from('saved_properties')
              .update({
                last_skip_trace: new Date().toISOString()
              })
              .eq('property_id', property.id);
          } catch (dbError) {
            console.error('Failed to update skip trace timestamp:', dbError);
          }
          
          // Don't overwrite existing good data on refresh failure
          if (!skipTraceData || skipTraceData.error) {
            setSkipTraceData({
              error: 'No skip trace data available - property address not found in database',
              contacts: [],
              confidence: 'Failed',
              traceDate: new Date().toLocaleDateString()
            });
            setIsSkipTraceExpanded(true);
          } else {
            // Keep existing data and show error message
            showError('Skip trace refresh failed - keeping existing data', 'Refresh Failed');
          }
          setIsSkipTracing(false);
          return;
        }
        throw new Error(apiData.message || apiData.error || 'Skip trace failed');
      }

      console.log('Skip trace API response:', apiData);

      // Step 3: Process the API response into display format
      let processedData = null;
      
      if (apiData.match && apiData.output && apiData.output.identity) {
        const identity = apiData.output.identity;
        const demographics = apiData.output.demographics || {};
        
        // Extract connected phones
        const phones = (identity.phones || [])
          .filter((p: any) => p.isConnected)
          .slice(0, 3); // Limit to first 3 connected phones
        
        // Extract emails  
        const emails = identity.emails || [];
        
        // Create contacts array for display
        const contacts = [];
        
        // Primary contact with owner info
        contacts.push({
          name: `${property.owner_first_name || ''} ${property.owner_last_name || ''}`.trim() || 'Property Owner',
          phone: phones[0]?.phoneDisplay || phones[0]?.phone || '',
          email: emails[0]?.email || '',
          relationship: 'Owner',
          phoneType: phones[0]?.phoneType || '',
          doNotCall: phones[0]?.doNotCall || false
        });

        // Additional phone numbers as separate contacts
        phones.slice(1).forEach((phone: any, index: number) => {
          contacts.push({
            name: `${property.owner_first_name || ''} ${property.owner_last_name || ''}`.trim() || 'Property Owner',
            phone: phone.phoneDisplay || phone.phone || '',
            email: '',
            relationship: `Additional Phone ${index + 2}`,
            phoneType: phone.phoneType || '',
            doNotCall: phone.doNotCall || false
          });
        });

        processedData = {
          contacts: contacts.filter(c => c.phone || c.email), // Only include contacts with phone or email
          confidence: apiData.match ? 'High' : 'Low',
          traceDate: new Date().toLocaleDateString(),
          demographics: {
            age: demographics.age,
            gender: demographics.gender,
            occupation: demographics.jobs?.[0]?.display
          },
          currentAddress: identity.address?.formattedAddress,
          addressHistory: identity.addressHistory || []
        };
      }

      // Step 4: Store results in saved_properties table
      if (processedData) {
        try {
          const supabase = createSupabaseBrowserClient();
          const { error: updateError } = await supabase
            .from('saved_properties')
            .update({
              skip_trace_data: processedData,
              last_skip_trace: new Date().toISOString()
            })
            .eq('property_id', property.id);

          if (updateError) {
            console.warn('Failed to save skip trace data to database:', updateError.message);
          } else {
            console.log('Skip trace data saved successfully to database');
          }
        } catch (dbError) {
          console.error('Database update error:', dbError);
        }
      }

      setSkipTraceData(processedData);
      setIsSkipTraceExpanded(true);

    } catch (error) {
      
      let errorMessage = 'Skip trace failed';
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        // Handle various error types with user-friendly messages
        if (errorText.includes('unable to locate valid property') || 
            errorText.includes('address(es) provided') ||
            errorText.includes('property from address')) {
          errorMessage = 'No skip trace data available - property address not found in database';
        } else if (errorText.includes('insufficient address information')) {
          errorMessage = 'Skip trace requires complete owner mailing address information';
        } else if (errorText.includes('po box')) {
          errorMessage = 'Skip trace not available for PO Box addresses - need a physical mailing address';
        } else if (errorText.includes('network') || errorText.includes('timeout')) {
          errorMessage = 'Network error - please check your connection and try again';
        } else if (errorText.includes('service temporarily unavailable')) {
          errorMessage = 'Skip trace service temporarily unavailable - please try again later';
        } else {
          errorMessage = error.message;
        }
      }
      
      setSkipTraceData({
        error: errorMessage,
        contacts: [],
        confidence: 'Failed',
        traceDate: new Date().toLocaleDateString()
      });
      setIsSkipTraceExpanded(true);
    } finally {
      setIsSkipTracing(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading property details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <ExternalLink className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {error || 'Property not found'}
              </h2>
              <p className="text-gray-600 mb-4">
                The property you're looking for could not be loaded.
              </p>
              <button
                onClick={handleBackToSearch}
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Main Layout - Left Sidebar + Content */}
        <div className="flex gap-6">
          {/* Left Sidebar - Engagement Center (Hidden on mobile) */}
          {isEngageContext && user && (
            <div className="w-80 flex-shrink-0 hidden lg:block">
              <div className="sticky top-6">
                <EngagementCenter
                  selectedProperties={property ? [property] : []}
                  onDocumentAction={handleDocumentAction}
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBackToSearch}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center text-gray-600 hover:text-gray-700 font-medium"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </button>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {property.address_street || property.address_full}, {property.address_city}, {property.address_state} {property.address_zip}
            </h1>
          </div>
          
          {/* Large Property Image */}
          <div className="w-full h-96 relative overflow-hidden">
            <StreetViewImage
              address={`${property.address_street || property.address_full}, ${property.address_city}, ${property.address_state} ${property.address_zip}`}
              latitude={property.latitude}
              longitude={property.longitude}
              className="w-full h-full"
              width={1200}
              height={384}
            />
            
            {/* Heart Favorite Button */}
            {user && (
              <button
                onClick={handleToggleFavorite}
                disabled={isToggling}
                className={`absolute top-4 right-4 p-2 rounded-full shadow-lg transition-all hover:scale-105 ${
                  isFavorited 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
                } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart 
                  className="w-6 h-6" 
                  fill={isFavorited ? 'currentColor' : 'none'} 
                />
              </button>
            )}
            
            {/* Zillow Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const address = property.address_full || property.address_street || '';
                const zillowUrl = `https://www.zillow.com/homes/${address.replace(/\s+/g, '-')}-${property.address_city}-${property.address_state}-${property.address_zip}_rb/`;
                window.open(zillowUrl, '_blank');
              }}
              className="absolute bottom-4 right-4 bg-white/90 hover:bg-white rounded-lg p-2 shadow-lg transition-all hover:scale-105 cursor-pointer"
              title="View on Zillow"
            >
              <img 
                src="/Zillow Logo_Primary_RGB.png" 
                alt="Zillow" 
                className="w-12 h-12 object-contain"
              />
            </button>
          </div>
        </div>

        {/* AI Investment Analysis Component - Hidden on mobile */}
        <div className="hidden lg:block">
          <AIInvestmentAnalysis 
            property={property} 
            isEngageContext={isEngageContext}
            userClass={userClass}
          />
        </div>

        {/* Skip Trace Section - Full Width - Only show in ENGAGE context */}
        {isEngageContext && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div 
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsSkipTraceExpanded(!isSkipTraceExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg mr-3">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Skip Trace Results</h2>
                    <p className="text-sm text-gray-600">Contact information and owner details</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {!skipTraceData && !isSkipTracing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkipTrace();
                      }}
                      className="flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all font-medium text-sm"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Run Skip Trace
                    </button>
                  )}
                  {isSkipTraceExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            
            {isSkipTraceExpanded && (
              <div className="px-6 pb-6 border-t border-gray-100">
                {isSkipTracing ? (
                  <div className="py-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-4 animate-pulse">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Running Skip Trace...</h3>
                    <p className="text-gray-600">Searching for contact information and owner details</p>
                    <div className="mt-4">
                      <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto">
                        <div className="h-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-full animate-pulse" style={{width: '70%'}}></div>
                      </div>
                    </div>
                  </div>
                ) : skipTraceData ? (
                  <div className="py-6">
                    {skipTraceData.error ? (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                          <Zap className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Skip Trace Failed</h3>
                        <p className="text-sm text-gray-600 max-w-md mx-auto">
                          {skipTraceData.error}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                            <p className="text-sm text-gray-600">
                              Trace completed on {skipTraceData.traceDate} • Confidence: {skipTraceData.confidence}
                            </p>
                          </div>
                          <button
                            onClick={handleSkipTrace}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Refresh Data
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {skipTraceData.contacts && Array.isArray(skipTraceData.contacts) ? skipTraceData.contacts.map((contact: any, index: number) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div className="p-2 bg-blue-100 rounded-lg mr-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{contact.name}</h4>
                                    <p className="text-xs text-gray-500">{contact.relationship}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="h-3 w-3 mr-2 text-gray-400" />
                                  <a 
                                    href={`tel:${contact.phone}`}
                                    className="hover:text-blue-600 transition-colors"
                                  >
                                    {contact.phone}
                                  </a>
                                </div>
                                
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="h-3 w-3 mr-2 text-gray-400" />
                                  <a 
                                    href={`mailto:${contact.email}`}
                                    className="hover:text-blue-600 transition-colors truncate"
                                  >
                                    {contact.email}
                                  </a>
                                </div>
                              </div>
                            </div>
                          )) : (
                            // Fallback for single contact object (legacy format)
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div className="p-2 bg-blue-100 rounded-lg mr-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{skipTraceData.name}</h4>
                                    <p className="text-xs text-gray-500">Property Owner</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                {skipTraceData.email && (
                                  <div className="flex items-center text-gray-600">
                                    <Mail className="h-4 w-4 mr-2" />
                                    <span>{skipTraceData.email}</span>
                                  </div>
                                )}
                                {skipTraceData.phone1 && (
                                  <div className="flex items-center text-gray-600">
                                    <Phone className="h-4 w-4 mr-2" />
                                    <span>{skipTraceData.phone1}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-gray-200 bg-blue-50 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="p-1 bg-blue-100 rounded">
                              <Zap className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-blue-900 mb-1">Skip Trace Complete</h4>
                              <p className="text-sm text-blue-700">
                                Found {skipTraceData.contacts?.length || 1} contact records. All information is current as of the trace date.
                                Use this data to reach out to property owners for potential investment opportunities.
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No skip trace data available</p>
                    <p className="text-sm text-gray-500">Click "Run Skip Trace" to search for contact information</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

            <PropertyInfoSections property={property} />
            
            {AlertComponent}
            
            {/* Cash Flow Reports Modal */}
            <CashFlowReportsModal
              isOpen={showCashFlowReportsModal}
              onClose={() => setShowCashFlowReportsModal(false)}
              onGenerate={handleGenerateReportFromModal}
            />
            
            {/* Offers Modal */}
            {showOffersModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Select an Analysis</h3>
                    <button
                      onClick={() => setShowOffersModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedPropertyOffers.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 4z" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">No offers found</h4>
                        <p className="text-sm text-gray-500">No offers have been created yet.</p>
                      </div>
                    ) : (
                      selectedPropertyOffers.map((offer) => (
                        <div
                          key={offer.id}
                          onClick={() => handleOfferSelection(offer.id, offer.property_id)}
                          className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900">{offer.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
                              <p className="text-xs text-gray-500 mt-2">{offer.property_address}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-blue-600">{offer.offer_amount}</div>
                              <div className="text-xs text-gray-500">{offer.created_date}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}