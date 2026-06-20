import "dotenv/config";

function num(name: string, def: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export const config = {
  // Provider selection. "auto" uses Duffel when DUFFEL_API_KEY is set, else the mock provider.
  provider: (process.env.PROVIDER ?? "auto") as "auto" | "duffel" | "mock",
  duffelApiKey: process.env.DUFFEL_API_KEY ?? "",

  // Email (Resend). With no key/recipient, alerts print to the console (dry run).
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  alertFrom: process.env.ALERT_FROM ?? "onboarding@resend.dev",
  alertTo: process.env.ALERT_TO ?? "",

  // Alert tuning.
  dropPct: num("DROP_PCT", 0.1), // fraction below median that counts as a drop
  lowWindowDays: num("LOW_WINDOW_DAYS", 30),
  cooldownHours: num("COOLDOWN_HOURS", 24),
  persistChecks: num("PERSIST_CHECKS", 2), // consecutive checks under threshold for a drop alert
  flexDays: num("FLEX_DAYS", 2),
  maxApiCallsPerRun: num("MAX_API_CALLS_PER_RUN", 10),
  offersPerSearch: num("OFFERS_PER_SEARCH", 3),

  // Where watches + observations live.
  dataDir: process.env.DATA_DIR ?? "data",
};

export function resolveProvider(): "duffel" | "mock" {
  if (config.provider === "duffel") return "duffel";
  if (config.provider === "mock") return "mock";
  return config.duffelApiKey ? "duffel" : "mock";
}
