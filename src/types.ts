export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface DateWindow {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface Watch {
  id: string;
  label?: string;
  origin: string[]; // IATA codes; first is primary, extras are nearby airports
  dest: string[];
  departWindow: DateWindow;
  returnWindow?: DateWindow; // omit for one-way
  pax: number;
  cabin: CabinClass;
  targetPrice?: number; // alert at/below this
  currency: string; // e.g. "USD"
  flexDays?: number; // +/- days around the window; defaults to config.flexDays
  lastAlertedAt?: string; // ISO timestamp of the last alert (drives cooldown)
  createdAt: string; // ISO
}

export interface FlightSegment {
  from: string;
  to: string;
  departAt: string; // ISO
  arriveAt: string; // ISO
  carrier: string; // IATA airline code
  flightNumber?: string;
}

export interface NormalizedOffer {
  id: string;
  source: string; // "duffel" | "mock"
  price: { amount: number; currency: string };
  segments: FlightSegment[];
  totalDurationMins: number;
  stops: number;
  carriers: string[]; // unique airline codes
  fareBrand?: string;
  departDate: string; // YYYY-MM-DD of the outbound (for the book link)
  origin: string;
  dest: string;
}

export interface Observation {
  watchId: string;
  ts: string; // ISO
  price: number;
  currency: string;
  carrier: string; // primary carrier of the best offer
  fareBrand?: string;
  stops: number;
  source: string;
  offerId: string;
}
