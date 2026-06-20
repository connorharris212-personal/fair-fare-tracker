import type { FlightProvider, SearchParams } from "./index";
import type { NormalizedOffer, FlightSegment } from "../types";

// Offline provider so the whole pipeline runs with zero API keys.
// Prices are derived from the route plus a slow time-based wiggle, so repeated runs
// show realistic movement and the drop-detection logic has something to chew on.

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const CARRIERS = ["UA", "DL", "AA", "B6", "AS", "WN"];

export class MockProvider implements FlightProvider {
  name = "mock";

  async search(p: SearchParams): Promise<NormalizedOffer[]> {
    const base = 180 + (hashStr(p.origin + p.dest) % 600); // baseline 180..779
    const wiggle = Math.sin(Date.now() / 3.6e6 + hashStr(p.departDate)) * 80; // +/-80 over hours

    const offers: NormalizedOffer[] = [];
    const n = Math.max(1, p.limit);
    for (let i = 0; i < n; i++) {
      const price = Math.max(49, Math.round(base + wiggle + i * (35 + (hashStr(p.origin) % 25))));
      const carrier = CARRIERS[hashStr(p.origin + p.dest + i) % CARRIERS.length];
      const stops = i === 0 ? 0 : i % 2;
      const segments = buildSegments(p, carrier, stops);
      offers.push({
        id: `mock-${p.origin}-${p.dest}-${p.departDate}-${i}`,
        source: "mock",
        price: { amount: price, currency: p.currency },
        segments,
        totalDurationMins: 180 + stops * 120 + i * 15,
        stops,
        carriers: [...new Set(segments.map((s) => s.carrier))],
        fareBrand: i === 0 ? "Basic" : "Main",
        departDate: p.departDate,
        origin: p.origin,
        dest: p.dest,
      });
    }
    return offers.sort((a, b) => a.price.amount - b.price.amount);
  }
}

function buildSegments(p: SearchParams, carrier: string, stops: number): FlightSegment[] {
  const day = p.departDate;
  if (stops === 0) {
    return [
      { from: p.origin, to: p.dest, departAt: `${day}T08:00:00`, arriveAt: `${day}T11:00:00`, carrier },
    ];
  }
  const hub = "ORD";
  return [
    { from: p.origin, to: hub, departAt: `${day}T08:00:00`, arriveAt: `${day}T10:00:00`, carrier },
    { from: hub, to: p.dest, departAt: `${day}T11:30:00`, arriveAt: `${day}T14:00:00`, carrier },
  ];
}
