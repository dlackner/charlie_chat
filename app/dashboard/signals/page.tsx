/*
 * Deal Signals Feed
 * Running signal history + Market Watch. Signal Feed is wired to /api/dashboard/signals
 * (snapshots + events built by the scan job's trigger-signal pass). Market Watch is wired
 * to /api/dashboard/market-watch (same snapshots/events, the scan job's new_listing/
 * price_reduced pass) - both real, both backed by the same per-market baseline + steady
 * state scan.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Radar, TrendingUp, Settings, ArrowRight, Loader2, Info } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useDealSignalsAccess } from '@/lib/hooks/useDealSignalsAccess';
import { SignalCard, WatchCard, type SignalEvent, type MarketWatchItem } from '@/components/signals/SignalCards';

const DEFAULT_MIN_SIGNAL_STRENGTH = 20;

type RecencyFilter = 'all' | 'today' | 'week' | 'month';

const RECENCY_OPTIONS: { value: RecencyFilter; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' }
];

function isWithinRecency(isoDate: string, filter: RecencyFilter): boolean {
  if (filter === 'all') return true;
  const detected = new Date(isoDate).getTime();
  const now = Date.now();
  const days = filter === 'today' ? 1 : filter === 'week' ? 7 : 30;
  return now - detected <= days * 24 * 60 * 60 * 1000;
}

interface WatchedMarket {
  id: string;
  market_type: 'city' | 'zip' | 'county';
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
}

function getMarketDisplayName(market: WatchedMarket): string {
  if (market.market_type === 'zip' && market.zip) return `ZIP ${market.zip.split(',')[0].trim()}`;
  if (market.market_type === 'county' && market.county && market.state) return `${market.county}, ${market.state}`;
  if (market.city && market.state) return `${market.city}, ${market.state}`;
  return 'Unnamed market';
}

export default function DealSignalsFeedPage() {
  const { user, supabase } = useAuth();
  const router = useRouter();
  const { hasAccess, isLoading: isLoadingAccess } = useDealSignalsAccess();
  const [markets, setMarkets] = useState<WatchedMarket[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [signals, setSignals] = useState<SignalEvent[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  const [minSignalStrength, setMinSignalStrength] = useState(DEFAULT_MIN_SIGNAL_STRENGTH);
  const [isLoadingThreshold, setIsLoadingThreshold] = useState(true);
  const [selectedMarketId, setSelectedMarketId] = useState('all');
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>('all');
  const [watchItems, setWatchItems] = useState<MarketWatchItem[]>([]);
  const [isLoadingWatchItems, setIsLoadingWatchItems] = useState(true);
  const saveThresholdDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const loadMarkets = async () => {
      if (!user || !supabase) return;

      try {
        const { data } = await supabase
          .from('deal_signal_markets')
          .select('id, market_type, city, state, zip, county')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        setMarkets(data || []);
      } catch {
        setMarkets([]);
      } finally {
        setIsLoadingMarkets(false);
      }
    };

    const loadThreshold = async () => {
      if (!user || !supabase) return;

      try {
        const { data } = await supabase
          .from('deal_signal_weights')
          .select('min_signal_strength')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.min_signal_strength != null) {
          setMinSignalStrength(data.min_signal_strength);
        }
      } catch {
        // fall back to the default
      } finally {
        setIsLoadingThreshold(false);
      }
    };

    const loadSignals = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/dashboard/signals');
        if (response.ok) {
          const data = await response.json();
          setSignals(data.signals || []);
        } else {
          setSignals([]);
        }
      } catch {
        setSignals([]);
      } finally {
        setIsLoadingSignals(false);
      }
    };

    const loadWatchItems = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/dashboard/market-watch');
        if (response.ok) {
          const data = await response.json();
          setWatchItems(data.items || []);
        } else {
          setWatchItems([]);
        }
      } catch {
        setWatchItems([]);
      } finally {
        setIsLoadingWatchItems(false);
      }
    };

    loadMarkets();
    loadThreshold();
    loadSignals();
    loadWatchItems();
  }, [user, supabase]);

  useEffect(() => {
    if (!isLoadingAccess && !hasAccess) {
      router.replace('/pricing');
    }
  }, [isLoadingAccess, hasAccess, router]);

  const hasMarkets = markets.length > 0;
  const marketNames = markets.map(getMarketDisplayName);
  const hasAnySignals = signals.length > 0;
  const marketFilteredSignals =
    selectedMarketId === 'all' ? signals : signals.filter((s) => s.marketId === selectedMarketId);
  const recencyFilteredSignals = marketFilteredSignals.filter((s) => isWithinRecency(s.detectedAt, recencyFilter));
  const visibleSignals = recencyFilteredSignals.filter((s) => s.signalStrength >= minSignalStrength);
  const hasVisibleSignals = visibleSignals.length > 0;
  const hiddenByThresholdCount = recencyFilteredSignals.length - visibleSignals.length;

  const handleThresholdChange = (value: number) => {
    setMinSignalStrength(value);

    clearTimeout(saveThresholdDebounceRef.current);
    saveThresholdDebounceRef.current = setTimeout(async () => {
      if (!user || !supabase) return;
      await supabase
        .from('deal_signal_weights')
        .upsert({ user_id: user.id, min_signal_strength: value }, { onConflict: 'user_id' });
    }, 500);
  };

  if (isLoadingAccess || !hasAccess) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
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
                {!isLoadingMarkets && hasMarkets
                  ? `Watching ${marketNames.join(', ')}`
                  : "Your watched markets and everything we've found"}
              </p>
            </div>
            <Link
              href="/discover/signals/setup"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mt-1"
            >
              <Settings size={15} />
              Manage markets
            </Link>
          </div>

          <div className="space-y-8">
            {/* Signal Feed */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <h2 className="text-lg font-bold text-gray-900">Signal Feed</h2>
                {hasMarkets && (
                  <div className="flex flex-wrap items-center gap-4">
                    {markets.length > 1 && (
                      <select
                        value={selectedMarketId}
                        onChange={(e) => setSelectedMarketId(e.target.value)}
                        className="text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All markets</option>
                        {markets.map((m) => (
                          <option key={m.id} value={m.id}>
                            {getMarketDisplayName(m)}
                          </option>
                        ))}
                      </select>
                    )}
                    <select
                      value={recencyFilter}
                      onChange={(e) => setRecencyFilter(e.target.value as RecencyFilter)}
                      className="text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {RECENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-4 px-0.5">
                        <label
                          htmlFor="min-signal-strength"
                          className="text-xs font-extrabold text-gray-700 uppercase tracking-wide whitespace-nowrap"
                        >
                          Minimum Signal
                        </label>
                        <span className="text-sm font-extrabold text-blue-700 tabular-nums leading-none">
                          {minSignalStrength}%
                        </span>
                      </div>
                      <input
                        id="min-signal-strength"
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={minSignalStrength}
                        disabled={isLoadingThreshold}
                        onChange={(e) => handleThresholdChange(parseInt(e.target.value, 10))}
                        className="w-40 accent-blue-600 disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {isLoadingSignals ? (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-10 flex items-center justify-center text-sm text-gray-500 gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Loading signals…
                </div>
              ) : hasVisibleSignals ? (
                <div className="space-y-3">
                  {visibleSignals.map((signal) => (
                    <SignalCard
                      key={signal.id}
                      signal={signal}
                      onRemoved={(id) => setSignals((prev) => prev.filter((s) => s.id !== id))}
                    />
                  ))}
                </div>
              ) : recencyFilteredSignals.length > 0 ? (
                <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-8 sm:p-10 text-center">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {hiddenByThresholdCount} {hiddenByThresholdCount === 1 ? 'signal' : 'signals'} below your minimum
                    strength filter
                  </h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    Lower the filter above to see them.
                  </p>
                </section>
              ) : marketFilteredSignals.length > 0 ? (
                <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-8 sm:p-10 text-center">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">No signals in this time range</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    Choose "Any time" above to see older signals.
                  </p>
                </section>
              ) : hasAnySignals ? (
                <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-8 sm:p-10 text-center">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">No signals for this market yet</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    Choose "All markets" above to see signals from your other watched markets.
                  </p>
                </section>
              ) : (
                <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-8 sm:p-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 mx-auto mb-5">
                    <Radar size={26} className="text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No signals yet</h3>
                  <p className={`text-sm text-gray-600 max-w-md mx-auto ${hasMarkets ? '' : 'mb-6'}`}>
                    {hasMarkets
                      ? `We're watching ${marketNames.join(', ')} for pre-foreclosure, foreclosure, vacancy, probate, and other off-market motivation signals. The moment one shows up, it'll appear here first.`
                      : "We're watching your market for pre-foreclosure, foreclosure, vacancy, probate, and other off-market motivation signals. The moment one shows up, it'll appear here first."}
                  </p>
                  {!hasMarkets && (
                    <Link
                      href="/discover/signals/setup"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 transition-colors"
                    >
                      Set up a market to watch
                      <ArrowRight size={15} />
                    </Link>
                  )}
                </section>
              )}
            </section>

            {/* Market Watch */}
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 px-1">Market Watch</h2>
              {isLoadingWatchItems ? (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-10 flex items-center justify-center text-sm text-gray-500 gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Loading market activity…
                </div>
              ) : watchItems.length > 0 ? (
                <div className="space-y-2.5">
                  {watchItems.map((item) => (
                    <WatchCard
                      key={item.id}
                      item={item}
                      onRemoved={(id) => setWatchItems((prev) => prev.filter((w) => w.id !== id))}
                    />
                  ))}
                </div>
              ) : (
                <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-8 sm:p-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-5">
                    <TrendingUp size={26} className="text-gray-500" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Market Watch</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    No market activity yet. Newly listed properties and price drops will show up here too - just to
                    keep you in the loop between signals.
                  </p>
                </section>
              )}
            </section>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
