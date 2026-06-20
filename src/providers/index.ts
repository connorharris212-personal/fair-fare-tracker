import type { NormalizedOffer } from "../types";
import { resolveProvider, config } from "../config";
import { MockProvider } from "./mock";
import { DuffelProvider } from "./duffel";

export interface SearchParams {
  origin: string;
  dest: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD (omit for one-way)
  pax: number;
  cabin: string;
  currency: string;
  limit: number;
}

export interface FlightProvider {
  name: string;
  search(params: SearchParams): Promise<NormalizedOffer[]>;
}

export function getProvider(): FlightProvider {
  return resolveProvider() === "duffel"
    ? new DuffelProvider(config.duffelApiKey)
    : new MockProvider();
}
