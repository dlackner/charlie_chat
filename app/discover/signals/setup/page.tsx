/*
 * Deal Signals Setup
 * Multiple watched markets (up to 5), each with its own location + property criteria,
 * plus one shared signal-weighting config - standalone from Buy Box / user_markets.
 * Persists to deal_signal_markets + deal_signal_weights via the regular client (RLS-scoped
 * to the signed-in user). No scan job yet - saving just stores the watch configuration.
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, RotateCcw, Info, Plus, X, Check } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useDealSignalsAccess } from '@/lib/hooks/useDealSignalsAccess';
import { SIGNALS, defaultWeights, type SignalDef as SignalDefFromCatalog } from '@/lib/dealSignalsCatalog';

const MAX_MARKETS = 5;

// US states for recognition (full names and abbreviations)
const US_STATES: Record<string, string> = {
  'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
  'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
  'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
  'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
  'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
  'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
  'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
  'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
};

const capitalizeWords = (str: string) =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

interface ParsedLocation {
  type: 'city' | 'zip' | 'county';
  city: string;
  state: string;
  zip: string;
  county: string;
}

const emptyLocation: ParsedLocation = { type: 'city', city: '', state: '', zip: '', county: '' };

function parseLocationInput(locationInput: string): ParsedLocation {
  if (!locationInput.trim()) {
    return { ...emptyLocation };
  }

  const cleanedInput = locationInput.replace(/,\s*(USA|US|United States)$/i, '');
  const locationParts = cleanedInput.split(',').map((s) => s.trim());
  const zipMatch = cleanedInput.match(/\b\d{5}(-\d{4})?\b/);

  if (zipMatch && locationParts.length === 1) {
    return { type: 'zip', zip: zipMatch[0], city: '', state: '', county: '' };
  }

  if (locationParts.length >= 2) {
    const firstPart = locationParts[0];
    const lastPart = locationParts[1].trim();
    const firstPartUpper = firstPart.toUpperCase();
    const isStateFirst =
      US_STATES.hasOwnProperty(firstPartUpper) || Object.values(US_STATES).includes(firstPartUpper);

    if (isStateFirst && (lastPart.toUpperCase() === 'USA' || lastPart.toUpperCase() === 'US')) {
      return {
        type: 'city',
        city: '',
        state: US_STATES[firstPartUpper] || firstPartUpper,
        zip: zipMatch ? zipMatch[0] : '',
        county: ''
      };
    }

    const stateZipMatch = lastPart.match(/^([a-zA-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
    const parsed: ParsedLocation = { type: 'city', city: '', state: '', zip: '', county: '' };

    if (firstPart.toLowerCase().includes('county')) {
      parsed.type = 'county';
      parsed.county = capitalizeWords(firstPart);
      parsed.city = capitalizeWords(firstPart);
    } else {
      parsed.city = capitalizeWords(firstPart);
    }

    if (stateZipMatch) {
      parsed.state = stateZipMatch[1].toUpperCase();
      if (stateZipMatch[2]) parsed.zip = stateZipMatch[2];
    } else {
      parsed.state = lastPart.toUpperCase();
    }

    return parsed;
  }

  const firstPart = locationParts[0];
  if (zipMatch) {
    return { type: 'zip', zip: zipMatch[0], city: '', state: '', county: '' };
  }
  if (firstPart.toLowerCase().includes('county')) {
    return { type: 'county', county: capitalizeWords(firstPart), city: capitalizeWords(firstPart), state: '', zip: '' };
  }
  return { type: 'city', city: capitalizeWords(firstPart), state: '', zip: '', county: '' };
}

function getMarketDisplayName(location: ParsedLocation): string {
  if (location.type === 'zip' && location.zip) return `ZIP ${location.zip.split(',')[0].trim()}`;
  if (location.type === 'county' && location.county && location.state) return `${location.county}, ${location.state}`;
  if (location.city && location.state) return `${location.city}, ${location.state}`;
  return '';
}

function getLocationDisplayValue(location: ParsedLocation): string {
  if (location.type === 'zip' && location.zip) return location.zip;
  if (location.type === 'county' && location.county && location.state) return `${location.county}, ${location.state}`;
  if (location.city && location.state) return `${location.city}, ${location.state}`;
  if (location.city) return location.city;
  if (location.zip) return location.zip;
  return '';
}

// Preserves the distinction between "left blank" (null - no filter) and an explicit
// "0" (a real value, e.g. units_min=0 to include unknown unit counts) - unlike parseNumber,
// which collapses both to 0 and is only used for the live candidate-count check.
function toNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const cleaned = trimmed.replace(/,/g, '');
  const parsed = Number(cleaned);
  return isNaN(parsed) ? null : parsed;
}

interface FilterState {
  units_min: string;
  units_max: string;
  assessed_value_min: string;
  assessed_value_max: string;
  estimated_value_min: string;
  estimated_value_max: string;
  year_built_min: string;
  year_built_max: string;
}

const emptyFilters: FilterState = {
  units_min: '',
  units_max: '',
  assessed_value_min: '',
  assessed_value_max: '',
  estimated_value_min: '',
  estimated_value_max: '',
  year_built_min: '',
  year_built_max: ''
};

const parseNumber = (value: string): number => {
  const cleaned = value.replace(/,/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
};

const formatThousands = (value: string): string => {
  const num = parseNumber(value);
  return num > 0 ? num.toLocaleString() : value;
};

interface MarketDraft {
  id: string;
  locationInput: string;
  parsedLocation: ParsedLocation;
  filters: FilterState;
  candidateCount: number | null;
  isChecking: boolean;
  error: string;
}

const makeEmptyMarket = (): MarketDraft => ({
  id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `market-${Date.now()}-${Math.random()}`,
  locationInput: '',
  parsedLocation: { ...emptyLocation },
  filters: { ...emptyFilters },
  candidateCount: null,
  isChecking: false,
  error: ''
});

type SignalDef = SignalDefFromCatalog;

export default function DealSignalsSetupPage() {
  const { user, supabase } = useAuth();
  const router = useRouter();
  const { hasAccess, isLoading: isLoadingAccess } = useDealSignalsAccess();
  const [markets, setMarkets] = useState<MarketDraft[]>([makeEmptyMarket()]);
  const [activeMarketId, setActiveMarketId] = useState<string>(markets[0].id);
  const [activeTab, setActiveTab] = useState<'markets' | 'weights'>('markets');
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [weights, setWeights] = useState<Record<string, number>>(defaultWeights);

  useEffect(() => {
    if (!isLoadingAccess && !hasAccess) {
      router.replace('/pricing');
    }
  }, [isLoadingAccess, hasAccess, router]);

  // Load any previously saved markets + weights for this user.
  useEffect(() => {
    const loadSetup = async () => {
      if (!user || !supabase) return;

      try {
        const { data: marketRows } = await supabase
          .from('deal_signal_markets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (marketRows && marketRows.length > 0) {
          const loadedMarkets: MarketDraft[] = marketRows.map((row: any) => {
            const parsedLocation: ParsedLocation = {
              type: row.market_type,
              city: row.city || '',
              state: row.state || '',
              zip: row.zip || '',
              county: row.county || ''
            };
            return {
              id: row.id,
              locationInput: getLocationDisplayValue(parsedLocation),
              parsedLocation,
              filters: {
                units_min: row.units_min != null ? String(row.units_min) : '',
                units_max: row.units_max != null ? String(row.units_max) : '',
                assessed_value_min: row.assessed_value_min != null ? String(row.assessed_value_min) : '',
                assessed_value_max: row.assessed_value_max != null ? String(row.assessed_value_max) : '',
                estimated_value_min: row.estimated_value_min != null ? String(row.estimated_value_min) : '',
                estimated_value_max: row.estimated_value_max != null ? String(row.estimated_value_max) : '',
                year_built_min: row.year_built_min != null ? String(row.year_built_min) : '',
                year_built_max: row.year_built_max != null ? String(row.year_built_max) : ''
              },
              candidateCount: row.candidate_count,
              isChecking: false,
              error: ''
            };
          });
          setMarkets(loadedMarkets);
          setActiveMarketId(loadedMarkets[0].id);
        }

        const { data: weightsRow } = await supabase
          .from('deal_signal_weights')
          .select('weights')
          .eq('user_id', user.id)
          .maybeSingle();

        if (weightsRow?.weights && Object.keys(weightsRow.weights).length > 0) {
          setWeights({ ...defaultWeights, ...weightsRow.weights });
        }
      } catch {
        // No saved setup yet, or a transient load error - fall back to the blank template.
      } finally {
        setIsLoadingSetup(false);
      }
    };

    loadSetup();
  }, [user, supabase]);

  const activeMarket = markets.find((m) => m.id === activeMarketId) || markets[0];

  const updateMarket = (id: string, updates: Partial<MarketDraft>) => {
    setMarkets((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setShowSuggestions(false);
      return;
    }

    const hasCommas = input.includes(',');
    const zipPattern = /^\d{5}(-\d{4})?$/;
    const parts = input.split(',').map((s) => s.trim());
    if (hasCommas && parts.every((part) => zipPattern.test(part))) {
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.predictions && Array.isArray(data.predictions)) {
          setSuggestions(data.predictions);
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    } catch {
      setShowSuggestions(false);
    }
  }, []);

  const checkCandidateCount = useCallback(async (marketId: string, location: ParsedLocation, currentFilters: FilterState) => {
    updateMarket(marketId, { isChecking: true, error: '' });

    try {
      const payload: any = {
        property_type: 'MFR',
        count: true,
        ids_only: false
      };

      if (location.type === 'zip' && location.zip) {
        payload.zip = location.zip;
      } else if (location.type === 'county' && location.county && location.state) {
        payload.county = location.county;
        payload.state = location.state;
      } else if (location.city && location.state) {
        payload.city = location.city;
        payload.state = location.state;
      } else if (location.state) {
        payload.state = location.state;
      } else {
        updateMarket(marketId, { isChecking: false });
        return;
      }

      const unitsMin = toNullableNumber(currentFilters.units_min);
      const unitsMax = toNullableNumber(currentFilters.units_max);
      if (unitsMin !== null) payload.units_min = unitsMin;
      if (unitsMax !== null) payload.units_max = unitsMax;

      const assessedMin = toNullableNumber(currentFilters.assessed_value_min);
      const assessedMax = toNullableNumber(currentFilters.assessed_value_max);
      if (assessedMin !== null) payload.assessed_value_min = assessedMin;
      if (assessedMax !== null) payload.assessed_value_max = assessedMax;

      const estValueMin = toNullableNumber(currentFilters.estimated_value_min);
      const estValueMax = toNullableNumber(currentFilters.estimated_value_max);
      if (estValueMin !== null) payload.value_min = estValueMin;
      if (estValueMax !== null) payload.value_max = estValueMax;

      const yearMin = toNullableNumber(currentFilters.year_built_min);
      const yearMax = toNullableNumber(currentFilters.year_built_max);
      if (yearMin !== null) payload.year_built_min = yearMin;
      if (yearMax !== null) payload.year_built_max = yearMax;

      const response = await fetch('/api/realestateapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        updateMarket(marketId, { error: 'Could not check this market. Please try again.' });
        return;
      }

      const data = await response.json();
      updateMarket(marketId, { candidateCount: data.resultCount ?? 0 });
    } catch {
      updateMarket(marketId, { error: 'Could not check this market. Please try again.' });
    } finally {
      updateMarket(marketId, { isChecking: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSuggestion = (suggestion: any) => {
    setShowSuggestions(false);
    const input = suggestion.description;
    updateMarket(activeMarket.id, { locationInput: input, parsedLocation: parseLocationInput(input) });
  };

  // Recompute the active market's candidate count whenever its location or filters change, debounced.
  useEffect(() => {
    const location = activeMarket.parsedLocation;
    const hasEnoughToSearch =
      (location.type === 'zip' && location.zip) ||
      (location.city && location.state) ||
      (location.type === 'county' && location.county && location.state) ||
      location.state;

    if (!hasEnoughToSearch) {
      return;
    }

    clearTimeout(countDebounceRef.current);
    const marketId = activeMarket.id;
    const filters = activeMarket.filters;
    countDebounceRef.current = setTimeout(() => {
      checkCandidateCount(marketId, location, filters);
    }, 500);

    return () => clearTimeout(countDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMarket.id, activeMarket.parsedLocation, activeMarket.filters]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setSaveSuccess(false);
    updateMarket(activeMarket.id, { filters: { ...activeMarket.filters, [key]: value } });
  };

  const addMarket = () => {
    if (markets.length >= MAX_MARKETS) return;
    setSaveSuccess(false);
    const newMarket = makeEmptyMarket();
    setMarkets((prev) => [...prev, newMarket]);
    setActiveMarketId(newMarket.id);
    setShowSuggestions(false);
  };

  const removeMarket = (id: string) => {
    if (markets.length <= 1) return;
    setSaveSuccess(false);
    const remaining = markets.filter((m) => m.id !== id);
    setMarkets(remaining);
    if (activeMarketId === id) {
      setActiveMarketId(remaining[0].id);
    }
  };

  const updateWeight = (key: string, value: number) => {
    setSaveSuccess(false);
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const resetWeights = () => setWeights(defaultWeights);

  const saveSetup = async () => {
    if (!user || !supabase) return;

    const validMarkets = markets.filter((m) => {
      const loc = m.parsedLocation;
      return (
        (loc.type === 'zip' && loc.zip) ||
        (loc.city && loc.state) ||
        (loc.type === 'county' && loc.county && loc.state)
      );
    });

    if (validMarkets.length === 0) {
      setSaveError('Add at least one market with a valid location before saving.');
      setSaveSuccess(false);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      // Delete only markets the user actually removed - an upsert-by-id below preserves
      // baseline_completed_at on markets that already exist, instead of wiping it on every
      // save (which would silently re-trigger a full baseline for already-tracked markets).
      const { data: existingMarkets, error: existingError } = await supabase
        .from('deal_signal_markets')
        .select('id')
        .eq('user_id', user.id);
      if (existingError) throw existingError;

      const currentIds = new Set(validMarkets.map((m) => m.id));
      const idsToDelete = (existingMarkets || []).map((m) => m.id).filter((id) => !currentIds.has(id));

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('deal_signal_markets').delete().in('id', idsToDelete);
        if (deleteError) throw deleteError;
      }

      const rows = validMarkets.map((m) => ({
        id: m.id,
        user_id: user.id,
        market_type: m.parsedLocation.type,
        city: m.parsedLocation.city || null,
        state: m.parsedLocation.state || null,
        zip: m.parsedLocation.zip || null,
        county: m.parsedLocation.county || null,
        units_min: toNullableNumber(m.filters.units_min),
        units_max: toNullableNumber(m.filters.units_max),
        assessed_value_min: toNullableNumber(m.filters.assessed_value_min),
        assessed_value_max: toNullableNumber(m.filters.assessed_value_max),
        estimated_value_min: toNullableNumber(m.filters.estimated_value_min),
        estimated_value_max: toNullableNumber(m.filters.estimated_value_max),
        year_built_min: toNullableNumber(m.filters.year_built_min),
        year_built_max: toNullableNumber(m.filters.year_built_max),
        candidate_count: m.candidateCount,
        updated_at: new Date().toISOString()
      }));

      const { error: upsertError } = await supabase.from('deal_signal_markets').upsert(rows, { onConflict: 'id' });
      if (upsertError) throw upsertError;

      const { error: weightsError } = await supabase
        .from('deal_signal_weights')
        .upsert({ user_id: user.id, weights, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (weightsError) throw weightsError;

      setMarkets(validMarkets);
      if (!validMarkets.some((m) => m.id === activeMarketId)) {
        setActiveMarketId(validMarkets[0].id);
      }
      setSaveSuccess(true);

      // Fire-and-forget: kick off a baseline scan for each market. The route itself is a
      // no-op for markets already baselined, so it's safe to call for all of them.
      validMarkets.forEach((m) => {
        fetch('/api/deal-signals/baseline-market', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marketId: m.id })
        }).catch(() => {
          // Best-effort - no retry/catch-up mechanism yet if this fails silently.
        });
      });
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingAccess || !hasAccess) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Deal Signals</h1>
              <a
                href="/Deal-Signals-Guide.pdf"
                target="_blank"
                rel="noopener noreferrer"
                title="How Deal Signals works"
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Info size={20} />
              </a>
            </div>
            <p className="text-base text-gray-600 mt-1.5">
              Get alerted the moment properties in your markets show motivation to sell - before they ever hit the
              MLS.
            </p>
          </div>

          {/* Tabs */}
          <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('markets')}
              className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-colors ${
                activeTab === 'markets' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Markets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weights')}
              className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-colors ${
                activeTab === 'weights' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Signal Weights
            </button>
          </div>

          <div className="space-y-6">
            {/* Markets tab */}
            {activeTab === 'markets' && (
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-6 sm:p-8">
              <SectionHeading
                title="Markets you're watching"
                subtitle={`Add up to ${MAX_MARKETS} - each can have its own location and property criteria. Tighter criteria means fewer properties to watch, and fewer chances to catch a signal - if your feed stays empty, try widening your filters.`}
              />

              {/* Market tabs */}
              <div className="flex flex-wrap items-center gap-2 mt-5">
                {markets.map((market, index) => {
                  const displayName = getMarketDisplayName(market.parsedLocation) || `Market ${index + 1}`;
                  const isActive = market.id === activeMarketId;
                  return (
                    <div
                      key={market.id}
                      className={`group flex items-center gap-1.5 rounded-full pl-4 pr-2 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                        isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => {
                        setActiveMarketId(market.id);
                        setShowSuggestions(false);
                      }}
                    >
                      <span>{displayName}</span>
                      {markets.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMarket(market.id);
                          }}
                          className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                            isActive ? 'hover:bg-white/20' : 'hover:bg-gray-300'
                          }`}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {markets.length < MAX_MARKETS && (
                  <button
                    type="button"
                    onClick={addMarket}
                    className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 pl-3 pr-4 py-1.5 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <Plus size={14} />
                    Add market
                  </button>
                )}
              </div>

              {/* Active market: location input */}
              <div className="relative mt-6">
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={activeMarket.locationInput}
                    placeholder="City, county, or zip code (e.g. Pittsburgh, PA or 15201)"
                    onChange={(e) => {
                      const value = e.target.value;
                      setSaveSuccess(false);
                      updateMarket(activeMarket.id, { locationInput: value, parsedLocation: parseLocationInput(value) });

                      clearTimeout(inputDebounceRef.current);
                      inputDebounceRef.current = setTimeout(() => {
                        fetchSuggestions(value);
                      }, 300);
                    }}
                    onFocus={() => {
                      if (activeMarket.locationInput.length >= 3) fetchSuggestions(activeMarket.locationInput);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setShowSuggestions(false);
                    }}
                    className="w-full pl-11 pr-4 py-3.5 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-300 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none first:rounded-t-xl last:rounded-b-xl transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {suggestion.structured_formatting?.main_text || suggestion.description}
                            </div>
                            <div className="text-xs text-gray-500">
                              {suggestion.structured_formatting?.secondary_text || ''}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Candidate count */}
              <div className="mt-5 min-h-[3.5rem] flex items-center">
                {activeMarket.isChecking && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 size={16} className="animate-spin" />
                    Checking candidate properties…
                  </div>
                )}

                {!activeMarket.isChecking && activeMarket.error && (
                  <div className="text-sm text-red-600">{activeMarket.error}</div>
                )}

                {!activeMarket.isChecking && !activeMarket.error && activeMarket.candidateCount !== null && (
                  <div>
                    <div className="text-3xl font-bold text-blue-600 tabular-nums leading-none">
                      {activeMarket.candidateCount.toLocaleString()}
                    </div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1.5">
                      Candidate {activeMarket.candidateCount === 1 ? 'property' : 'properties'}
                    </div>
                  </div>
                )}
              </div>

              {/* Active market: property criteria */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 mb-1">Property criteria</h3>
                <p className="text-xs text-gray-500 mb-5">
                  Optional. Properties must match every filter you set. Leave a field blank to skip it. You can
                  always come back and adjust these later.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <RangeField
                    label="Units"
                    minValue={activeMarket.filters.units_min}
                    maxValue={activeMarket.filters.units_max}
                    onMinChange={(v) => updateFilter('units_min', v)}
                    onMaxChange={(v) => updateFilter('units_max', v)}
                    minPlaceholder="5"
                    maxPlaceholder="No max"
                    tip="Set Min to 0 to include properties with unknown unit count."
                  />
                  <RangeField
                    label="Year Built"
                    minValue={activeMarket.filters.year_built_min}
                    maxValue={activeMarket.filters.year_built_max}
                    onMinChange={(v) => updateFilter('year_built_min', v)}
                    onMaxChange={(v) => updateFilter('year_built_max', v)}
                    minPlaceholder="1980"
                    maxPlaceholder="No max"
                  />
                  <RangeField
                    label="Assessed Value"
                    minValue={activeMarket.filters.assessed_value_min}
                    maxValue={activeMarket.filters.assessed_value_max}
                    onMinChange={(v) => updateFilter('assessed_value_min', v)}
                    onMaxChange={(v) => updateFilter('assessed_value_max', v)}
                    minPlaceholder="500,000"
                    maxPlaceholder="No max"
                    prefix="$"
                    format={formatThousands}
                  />
                  <RangeField
                    label="Estimated Value"
                    minValue={activeMarket.filters.estimated_value_min}
                    maxValue={activeMarket.filters.estimated_value_max}
                    onMinChange={(v) => updateFilter('estimated_value_min', v)}
                    onMaxChange={(v) => updateFilter('estimated_value_max', v)}
                    minPlaceholder="500,000"
                    maxPlaceholder="No max"
                    prefix="$"
                    format={formatThousands}
                  />
                </div>
              </div>
            </section>
            )}

            {/* Signal Weights tab */}
            {activeTab === 'weights' && (
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <SectionHeading
                  title="Weight your signals"
                  subtitle="Adjust these weights to match your investment strategy - they don't need to add up to 100. Applies across all of your watched markets."
                />
                <button
                  type="button"
                  onClick={resetWeights}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors mt-1"
                >
                  <RotateCcw size={13} />
                  Reset to defaults
                </button>
              </div>

              <div className="mt-6 space-y-5">
                {SIGNALS.map((signal) => (
                  <WeightRow
                    key={signal.key}
                    signal={signal}
                    value={weights[signal.key]}
                    onChange={(v) => updateWeight(signal.key, v)}
                  />
                ))}
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>
                  Weights combine into a raw score used to rank properties against each other. When we show you a
                  "signal strength," we normalize against your current total automatically.
                </span>
              </div>
            </section>
            )}

            {/* Save */}
            <div className="flex items-center justify-end gap-3 pb-4">
              {saveError && <span className="text-sm text-red-600">{saveError}</span>}
              {saveSuccess && !saveError && (
                <span className="inline-flex items-center gap-1.5 text-sm text-blue-700">
                  <Check size={15} />
                  Saved
                </span>
              )}
              <button
                type="button"
                onClick={saveSetup}
                disabled={isSaving || isLoadingSetup}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white transition-colors"
              >
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {isSaving ? 'Saving…' : 'Save Setup'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function RangeField({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
  prefix,
  format,
  tip
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  minPlaceholder: string;
  maxPlaceholder: string;
  prefix?: string;
  format?: (v: string) => string;
  tip?: string;
}) {
  const display = (v: string) => (format ? format(v) : v);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{prefix}</span>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={display(minValue)}
            onChange={(e) => onMinChange(e.target.value)}
            placeholder={minPlaceholder}
            className={`w-full ${prefix ? 'pl-6' : 'pl-3'} pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          />
        </div>
        <span className="text-gray-300 text-sm">–</span>
        <div className="relative flex-1">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{prefix}</span>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={display(maxValue)}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder={maxPlaceholder}
            className={`w-full ${prefix ? 'pl-6' : 'pl-3'} pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          />
        </div>
      </div>
      {tip && <p className="text-xs text-gray-500 mt-2">{tip}</p>}
    </div>
  );
}

function WeightRow({
  signal,
  value,
  onChange
}: {
  signal: SignalDef;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-56 shrink-0">
        <div className="text-sm font-medium text-gray-900">{signal.label}</div>
        <div className="text-xs text-gray-500">{signal.description}</div>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="flex-1 accent-blue-600"
      />
      <div className="w-8 shrink-0 text-right text-sm font-semibold text-gray-900 tabular-nums">{value}</div>
    </div>
  );
}
