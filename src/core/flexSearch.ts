import type { Watch } from "../types";
import type { SearchParams } from "../providers";
import { config } from "../config";

// Expand one watch into a bounded set of concrete searches:
// every origin x dest x (each date in the window, plus +/- flexDays around the edges).
export function expandWatch(w: Watch): SearchParams[] {
  const flex = w.flexDays ?? config.flexDays;
  const departDates = datesInWindow(w.departWindow, flex);
  const returnDates: (string | undefined)[] = w.returnWindow
    ? datesInWindow(w.returnWindow, flex)
    : [undefined];

  const params: SearchParams[] = [];
  for (const origin of w.origin) {
    for (const dest of w.dest) {
      for (const departDate of departDates) {
        for (const returnDate of returnDates) {
          params.push({
            origin,
            dest,
            departDate,
            returnDate,
            pax: w.pax,
            cabin: w.cabin,
            currency: w.currency,
            limit: config.offersPerSearch,
          });
        }
      }
    }
  }
  // Keep each run within a sane API budget.
  return params.slice(0, config.maxApiCallsPerRun);
}

function datesInWindow(win: { start: string; end: string }, flex: number): string[] {
  const out = new Set<string>();
  const start = new Date(win.start + "T00:00:00Z");
  const end = new Date(win.end + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.add(d.toISOString().slice(0, 10));
  }
  for (let k = 1; k <= flex; k++) {
    const before = new Date(start);
    before.setUTCDate(before.getUTCDate() - k);
    const after = new Date(end);
    after.setUTCDate(after.getUTCDate() + k);
    out.add(before.toISOString().slice(0, 10));
    out.add(after.toISOString().slice(0, 10));
  }
  return [...out].sort();
}
