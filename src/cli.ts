import { loadWatches, saveWatches } from "./core/store";
import type { Watch, CabinClass, DateWindow } from "./types";

function parseFlags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      out[key] = next && !next.startsWith("--") ? (i++, next) : "true";
    }
  }
  return out;
}

function parseWindow(s: string): DateWindow {
  const [start, end] = s.includes("..") ? s.split("..") : [s, s];
  return { start, end };
}

function list(watches: Watch[]): void {
  if (watches.length === 0) {
    console.log('No watches. Add one:  npm run cli -- add --from SFO --to NRT --depart 2026-10-12..2026-10-14 --target 800');
    return;
  }
  for (const w of watches) {
    const ret = w.returnWindow ? `return ${w.returnWindow.start}..${w.returnWindow.end}` : "one-way";
    const target = w.targetPrice ? `target ${w.currency} ${w.targetPrice}` : "no target";
    console.log(
      `${w.id}  ${w.label ?? ""}  ${w.origin.join("/")}->${w.dest.join("/")}  ` +
        `depart ${w.departWindow.start}..${w.departWindow.end}  ${ret}  ${w.pax}x ${w.cabin}  ${target}`,
    );
  }
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const watches = await loadWatches();

  if (!cmd || cmd === "list") {
    list(watches);
    return;
  }

  if (cmd === "add") {
    const f = parseFlags(rest);
    if (!f.from || !f.to || !f.depart) {
      console.error("add requires --from, --to and --depart (YYYY-MM-DD or START..END)");
      process.exit(1);
    }
    const w: Watch = {
      id: crypto.randomUUID().slice(0, 8),
      label: f.label,
      origin: f.from.split(",").map((s) => s.trim().toUpperCase()),
      dest: f.to.split(",").map((s) => s.trim().toUpperCase()),
      departWindow: parseWindow(f.depart),
      returnWindow: f.return ? parseWindow(f.return) : undefined,
      pax: f.pax ? Number(f.pax) : 1,
      cabin: (f.cabin as CabinClass) ?? "economy",
      targetPrice: f.target ? Number(f.target) : undefined,
      currency: (f.currency ?? "USD").toUpperCase(),
      flexDays: f.flex ? Number(f.flex) : undefined,
      createdAt: new Date().toISOString(),
    };
    watches.push(w);
    await saveWatches(watches);
    console.log(`Added watch ${w.id}: ${w.origin.join("/")}->${w.dest.join("/")}`);
    return;
  }

  if (cmd === "remove" || cmd === "rm") {
    const id = rest[0];
    const next = watches.filter((w) => w.id !== id);
    await saveWatches(next);
    console.log(next.length === watches.length ? `No watch with id ${id}` : `Removed ${id}`);
    return;
  }

  console.error(`Unknown command: ${cmd}. Use: list | add | remove`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
