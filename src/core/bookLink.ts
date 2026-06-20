// Build a Google Flights deep link the USER clicks to find and book the fare.
// The app never books or pays for anything; this is purely a hand-off.
export function buildBookLink(o: { origin: string; dest: string; departDate: string }): string {
  const q = `Flights from ${o.origin} to ${o.dest} on ${o.departDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}
