import type { FlightProvider, SearchParams } from "./index";
import type { NormalizedOffer, FlightSegment } from "../types";

// Real flight data via Duffel's official API. The SDK is imported lazily so the package is
// only required when a DUFFEL_API_KEY is actually configured. Responses are typed loosely
// (`any`) to stay resilient across SDK versions; we only read a small, stable subset of fields.

export class DuffelProvider implements FlightProvider {
  name = "duffel";
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async search(p: SearchParams): Promise<NormalizedOffer[]> {
    const { Duffel } = await import("@duffel/api");
    const duffel = new Duffel({ token: this.token });

    const slices: any[] = [
      { origin: p.origin, destination: p.dest, departure_date: p.departDate },
    ];
    if (p.returnDate) {
      slices.push({ origin: p.dest, destination: p.origin, departure_date: p.returnDate });
    }
    const passengers = Array.from({ length: p.pax }, () => ({ type: "adult" as const }));

    const res: any = await duffel.offerRequests.create({
      slices,
      passengers,
      cabin_class: p.cabin as any,
      return_offers: true,
    });

    const offers: any[] = res?.data?.offers ?? [];
    return offers
      .map((o) => normalize(o, p))
      .sort((a, b) => a.price.amount - b.price.amount)
      .slice(0, p.limit);
  }
}

function normalize(o: any, p: SearchParams): NormalizedOffer {
  const segments: FlightSegment[] = [];
  let totalMins = 0;
  for (const slice of o.slices ?? []) {
    totalMins += isoDurationToMins(slice.duration);
    for (const seg of slice.segments ?? []) {
      segments.push({
        from: seg.origin?.iata_code ?? p.origin,
        to: seg.destination?.iata_code ?? p.dest,
        departAt: seg.departing_at,
        arriveAt: seg.arriving_at,
        carrier: seg.marketing_carrier?.iata_code ?? o.owner?.iata_code ?? "??",
        flightNumber: seg.marketing_carrier_flight_number,
      });
    }
  }
  const sliceCount = (o.slices ?? []).length || 1;
  const stops = Math.max(0, segments.length - sliceCount);
  return {
    id: o.id,
    source: "duffel",
    price: { amount: Number(o.total_amount), currency: o.total_currency ?? p.currency },
    segments,
    totalDurationMins: totalMins,
    stops,
    carriers: [...new Set(segments.map((s) => s.carrier))],
    fareBrand: o.slices?.[0]?.fare_brand_name ?? undefined,
    departDate: p.departDate,
    origin: p.origin,
    dest: p.dest,
  };
}

function isoDurationToMins(iso?: string): number {
  if (!iso) return 0;
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso); // e.g. "PT5H30M"
  if (!m) return 0;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}
