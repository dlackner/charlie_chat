/*
 * Shared Deal Signals catalog - the 10 tracked signals, their labels/descriptions, and
 * rarity-informed default weights. Used by both the setup page (client) and the feed
 * aggregation route (server) so signal names/weights can't drift between the two.
 */

export interface SignalDef {
  key: string;
  label: string;
  description: string;
  population: string;
  defaultWeight: number;
  // Triggers can independently fire an event (via the scan job's snapshot diff).
  // Non-triggers (absentee_owner, high_equity, years_owned) only ever contribute to
  // scoring alongside a real trigger - see project_offmarket_signal_agent memory.
  isTrigger: boolean;
}

// Default weights are rarity-informed (rarer signal = higher default), based on the
// real Pittsburgh MFR volume test - see project_offmarket_signal_agent memory.
// No sum-to-100 constraint; normalized only at signal-strength display time.
export const SIGNALS: SignalDef[] = [
  { key: 'pre_foreclosure', label: 'Pre-Foreclosure', description: 'Notice of default filed, before auction', population: 'Rare', defaultWeight: 10, isTrigger: true },
  { key: 'auction', label: 'Scheduled Auction', description: 'Foreclosure auction date set', population: 'Rare', defaultWeight: 9, isTrigger: true },
  { key: 'foreclosure', label: 'Foreclosure', description: 'Active foreclosure proceeding', population: 'Rare', defaultWeight: 9, isTrigger: true },
  { key: 'death', label: 'Owner Death / Probate', description: 'Likely in probate after an owner’s death', population: 'Rare', defaultWeight: 8, isTrigger: true },
  { key: 'reo', label: 'REO (Bank-Owned)', description: 'Bank repossessed after a failed foreclosure', population: 'Uncommon', defaultWeight: 7, isTrigger: true },
  { key: 'tax_delinquent', label: 'Tax Delinquent', description: 'Owner is behind on property taxes', population: 'Uncommon', defaultWeight: 6, isTrigger: true },
  { key: 'vacant', label: 'Vacant', description: 'USPS reports the property as vacant', population: 'Uncommon', defaultWeight: 5, isTrigger: true },
  { key: 'years_owned', label: 'Long-Term Ownership (15+ yrs)', description: 'Held long enough that retirement/exit is plausible', population: 'Common', defaultWeight: 2, isTrigger: false },
  { key: 'absentee_owner', label: 'Absentee Owner', description: 'Owner does not live at the property', population: 'Very common', defaultWeight: 1, isTrigger: false },
  { key: 'high_equity', label: 'High Equity', description: 'Owner holds substantial equity in the property', population: 'Very common', defaultWeight: 1, isTrigger: false }
];

export const TRIGGER_SIGNAL_KEYS = SIGNALS.filter((s) => s.isTrigger).map((s) => s.key);

export const defaultWeights: Record<string, number> = SIGNALS.reduce((acc, s) => {
  acc[s.key] = s.defaultWeight;
  return acc;
}, {} as Record<string, number>);

export function getSignalLabel(key: string): string {
  return SIGNALS.find((s) => s.key === key)?.label || key;
}

// Thresholds for the 3 derived (non-trigger) signals - see project_offmarket_signal_agent memory.
export const HIGH_EQUITY_THRESHOLD_PERCENT = 50;
export const LONG_TERM_OWNERSHIP_YEARS = 15;
