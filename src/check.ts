import { getProvider } from "./providers";
import { expandWatch } from "./core/flexSearch";
import { evaluateWatch, type AlertDecision } from "./core/evaluate";
import { buildBookLink } from "./core/bookLink";
import { loadWatches, saveWatches, loadObservations, saveObservations } from "./core/store";
import { sendAlert } from "./notify/email";
import type { Watch, NormalizedOffer, Observation } from "./types";

async function main(): Promise<void> {
  const provider = getProvider();
  const now = new Date();
  console.log(`Fair-Fare Tracker — run @ ${now.toISOString()}  (provider: ${provider.name})`);

  const watches = await loadWatches();
  if (watches.length === 0) {
    console.log('No watches yet. Add one:  npm run cli -- add --from SFO --to NRT --depart 2026-10-12..2026-10-14 --target 800');
    return;
  }

  const priorObs = await loadObservations();
  const newObs: Observation[] = [];

  for (const w of watches) {
    const searches = expandWatch(w);
    const offers: NormalizedOffer[] = [];
    for (const s of searches) {
      try {
        offers.push(...(await provider.search(s)));
      } catch (err) {
        console.error(`  search failed (${s.origin}->${s.dest} ${s.departDate}): ${(err as Error).message}`);
      }
    }

    if (offers.length === 0) {
      console.log(`\n[${label(w)}] no offers found.`);
      continue;
    }

    offers.sort((a, b) => a.price.amount - b.price.amount);
    const best = offers[0];
    const history = priorObs
      .filter((o) => o.watchId === w.id)
      .sort((a, b) => a.ts.localeCompare(b.ts));

    const decision = evaluateWatch(w, best.price.amount, best.price.currency, history, now);

    console.log(
      `\n[${label(w)}] best ${best.price.currency} ${best.price.amount} — ` +
        `${best.carriers.join("/")}, ${best.stops} stop${best.stops === 1 ? "" : "s"}, ${fmtDuration(best.totalDurationMins)}` +
        (decision.median !== null ? `  (typical ~${best.price.currency} ${Math.round(decision.median)})` : "  (no history yet)"),
    );

    newObs.push({
      watchId: w.id,
      ts: now.toISOString(),
      price: best.price.amount,
      currency: best.price.currency,
      carrier: best.carriers[0],
      fareBrand: best.fareBrand,
      stops: best.stops,
      source: best.source,
      offerId: best.id,
    });

    if (decision.shouldAlert) {
      const link = buildBookLink(best);
      const result = await sendAlert({
        subject: alertSubject(w, best),
        text: formatAlert(w, best, decision, link),
      });
      console.log(`  → ALERT: ${decision.reasons.join("; ")}  [email ${result}]`);
      w.lastAlertedAt = now.toISOString();
    } else {
      console.log(`  → no alert${decision.reasons.length ? ` ${decision.reasons.join("; ")}` : " (price not notably low)"}`);
    }
  }

  await saveObservations([...priorObs, ...newObs]);
  await saveWatches(watches); // persists any updated lastAlertedAt
  console.log(`\nDone. ${newObs.length} observation(s) recorded.`);
}

function label(w: Watch): string {
  return w.label ?? `${w.origin.join("/")}->${w.dest.join("/")}`;
}

function fmtDuration(mins: number): string {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function alertSubject(w: Watch, best: NormalizedOffer): string {
  return `Fare drop: ${best.price.currency} ${best.price.amount} — ${label(w)}`;
}

function formatAlert(w: Watch, best: NormalizedOffer, d: AlertDecision, link: string): string {
  return [
    `Fare alert: ${label(w)}`,
    ``,
    `Best price: ${best.price.currency} ${best.price.amount}`,
    `Route: ${best.origin} -> ${best.dest} on ${best.departDate}`,
    `Airline: ${best.carriers.join("/")}  |  ${best.stops} stop${best.stops === 1 ? "" : "s"}  |  ${fmtDuration(best.totalDurationMins)}`,
    d.median !== null ? `Typical: ~${best.price.currency} ${Math.round(d.median)}` : `Typical: (not enough history yet)`,
    ``,
    `Why you're getting this: ${d.reasons.join("; ")}`,
    ``,
    `Book it here (you complete the purchase): ${link}`,
    ``,
    `— Fair-Fare Tracker never books or pays for anything; it just points you to the deal.`,
  ].join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
