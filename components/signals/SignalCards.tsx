/*
 * Deal Signals card components - Signal Feed + Market Watch.
 * Design reference: https://claude.ai/code/artifact/fa1ed9ac-d13f-4029-b7bc-161aac77ecd3
 * SignalCard is wired to real data via /api/dashboard/signals. WatchCard is still
 * unwired - no Market Watch (on-market MLS activity) backend exists yet.
 */
'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, EyeOff, Loader2 } from 'lucide-react';

export interface SignalEvent {
  id: string;
  propertyId: string;
  marketId: string;
  address: string;
  city: string;
  state: string;
  units: number;
  yearBuilt: number;
  estimatedValue: number;
  triggers: string[];
  reason: string;
  supportingTags: string[];
  signalStrength: number; // 0-100
  detectedLabel: string;
  detectedAt: string;
}

export interface MarketWatchItem {
  id: string;
  propertyId: string;
  badge: 'New listing' | 'Price drop';
  address: string;
  city: string;
  state: string;
  detail: string;
  meta: string;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function SignalCard({ signal, onView, onRemoved }: {
  signal: SignalEvent;
  onView?: (signal: SignalEvent) => void;
  onRemoved?: (signalId: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleView = () => {
    if (onView) {
      onView(signal);
      return;
    }
    router.push(`/discover/property/${signal.propertyId}?back=${encodeURIComponent(pathname)}`);
  };

  const handleFavorite = async () => {
    if (isFavoriting || isDismissing) return;
    setIsFavoriting(true);
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: signal.propertyId, action: 'add' })
      });
      if (response.ok) {
        onRemoved?.(signal.id);
      } else {
        const body = await response.text();
        console.error('Favorite failed:', response.status, body);
      }
    } finally {
      setIsFavoriting(false);
    }
  };

  const handleDismiss = async () => {
    if (isFavoriting || isDismissing) return;
    setIsDismissing(true);
    try {
      const response = await fetch('/api/deal-signals/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: signal.propertyId })
      });
      if (response.ok) onRemoved?.(signal.id);
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <article className="relative bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm overflow-hidden pl-[22px] pr-5 py-[18px] sm:pr-8">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {signal.triggers.map((trigger) => (
              <span
                key={trigger}
                className="text-[11.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md"
              >
                {trigger}
              </span>
            ))}
          </div>

          <p className="text-base font-semibold text-gray-900 -tracking-[0.005em] mb-0.5">{signal.address}</p>
          <p className="text-[13px] text-gray-600 tabular-nums mb-2.5">
            {signal.city}, {signal.state}
            <span className="text-gray-400 mx-1.5">·</span>
            {signal.units} units
            <span className="text-gray-400 mx-1.5">·</span>
            Built {signal.yearBuilt}
            <span className="text-gray-400 mx-1.5">·</span>
            Est. {formatCurrency(signal.estimatedValue)}
          </p>

          <p className="text-[13.5px] text-gray-900 max-w-[58ch] mb-2.5">{signal.reason}</p>

          {signal.supportingTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-400 uppercase tracking-wide mr-0.5">Also matches</span>
              {signal.supportingTags.map((tag) => (
                <span key={tag} className="text-xs text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-2.5 shrink-0 sm:min-w-[132px]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isFavoriting || isDismissing}
              title="Not interested right now"
              className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 ring-1 ring-gray-200 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {isDismissing ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
            </button>
            <button
              type="button"
              onClick={handleFavorite}
              disabled={isFavoriting || isDismissing}
              title="Save to favorites"
              className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 ring-1 ring-gray-200 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isFavoriting ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} />}
            </button>
          </div>

          <span className="text-xs text-gray-400 whitespace-nowrap order-2 sm:order-1">Detected {signal.detectedLabel}</span>

          <div className="text-right order-1 sm:order-2">
            <div className="text-xl font-bold text-gray-900 tabular-nums leading-none">{signal.signalStrength}%</div>
            <div className="text-[10.5px] text-gray-400 uppercase tracking-wide mt-0.5">Signal strength</div>
            <div className="w-[92px] h-1 rounded-full bg-gray-100 mt-1.5 overflow-hidden ml-auto">
              <span className="block h-full bg-blue-600 rounded-full" style={{ width: `${signal.signalStrength}%` }} />
            </div>
          </div>

          <div className="flex gap-1.5 order-3">
            <button
              type="button"
              onClick={handleView}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap"
            >
              View
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function WatchCard({ item, onView, onRemoved }: {
  item: MarketWatchItem;
  onView?: (item: MarketWatchItem) => void;
  onRemoved?: (itemId: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleView = () => {
    if (onView) {
      onView(item);
      return;
    }
    router.push(`/discover/property/${item.propertyId}?back=${encodeURIComponent(pathname)}`);
  };

  const handleFavorite = async () => {
    if (isFavoriting || isDismissing) return;
    setIsFavoriting(true);
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: item.propertyId, action: 'add' })
      });
      if (response.ok) onRemoved?.(item.id);
    } finally {
      setIsFavoriting(false);
    }
  };

  const handleDismiss = async () => {
    if (isFavoriting || isDismissing) return;
    setIsDismissing(true);
    try {
      const response = await fetch('/api/deal-signals/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: item.propertyId })
      });
      if (response.ok) onRemoved?.(item.id);
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl ring-1 ring-gray-900/5 shadow-sm px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md whitespace-nowrap">
          {item.badge}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {item.address}, {item.city}, {item.state}
          </div>
          <div className="text-xs text-gray-600 tabular-nums">{item.detail}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400 whitespace-nowrap mr-1">{item.meta}</span>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isFavoriting || isDismissing}
          title="Not interested right now"
          className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 ring-1 ring-gray-200 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {isDismissing ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
        </button>
        <button
          type="button"
          onClick={handleFavorite}
          disabled={isFavoriting || isDismissing}
          title="Save to favorites"
          className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 ring-1 ring-gray-200 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {isFavoriting ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} />}
        </button>
        <button
          type="button"
          onClick={handleView}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap"
        >
          View
        </button>
      </div>
    </div>
  );
}
