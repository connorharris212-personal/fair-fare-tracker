import type { Watch, Observation } from "../types";
import { config } from "../config";

export interface AlertDecision {
  shouldAlert: boolean;
  reasons: string[];
  current: number;
  currency: string;
  median: number | null;
  nDayLow: number | null;
}

// Decide whether the current best price for a watch is worth an alert.
// `history` is this watch's prior observations (chronological), NOT including the current price.
export function evaluateWatch(
  watch: Watch,
  currentBest: number,
  currency: string,
  history: Observation[],
  now: Date,
): AlertDecision {
  const reasons: string[] = [];
  const prices = history.map((o) => o.price);
  const median = prices.length ? percentile(prices, 0.5) : null;

  const cutoff = new Date(now.getTime() - config.lowWindowDays * 86_400_000);
  const windowPrices = history.filter((o) => new Date(o.ts) >= cutoff).map((o) => o.price);
  const nDayLow = windowPrices.length ? Math.min(...windowPrices) : null;

  // 1) at/below explicit target
  if (watch.targetPrice !== undefined && currentBest <= watch.targetPrice) {
    reasons.push(`at/below your target (${currency} ${watch.targetPrice})`);
  }

  // 2) new N-day low
  if (nDayLow !== null && currentBest < nDayLow) {
    reasons.push(`new ${config.lowWindowDays}-day low (prev low ${currency} ${nDayLow})`);
  }

  // 3) meaningfully below typical, sustained across consecutive checks (debounce)
  if (median !== null) {
    const threshold = median * (1 - config.dropPct);
    if (currentBest <= threshold && priorChecksUnder(history, threshold, config.persistChecks - 1)) {
      reasons.push(`${Math.round(config.dropPct * 100)}%+ below typical (~${currency} ${Math.round(median)})`);
    }
  }

  let shouldAlert = reasons.length > 0;

  // per-watch cooldown
  if (shouldAlert && watch.lastAlertedAt) {
    const hoursSince = (now.getTime() - new Date(watch.lastAlertedAt).getTime()) / 3_600_000;
    if (hoursSince < config.cooldownHours) {
      shouldAlert = false;
      reasons.push(`(suppressed: last alert ${hoursSince.toFixed(1)}h ago < ${config.cooldownHours}h cooldown)`);
    }
  }

  return { shouldAlert, reasons, current: currentBest, currency, median, nDayLow };
}

// Require the most recent `count` prior observations to also be under `threshold`,
// so that together with the current price the drop has persisted. Not enough history => false.
function priorChecksUnder(history: Observation[], threshold: number, count: number): boolean {
  if (count <= 0) return true;
  if (history.length < count) return false;
  return history.slice(-count).every((o) => o.price <= threshold);
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
