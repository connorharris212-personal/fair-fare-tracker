# Fair-Fare Tracker

A personal flight fare watcher. It checks your watched routes on a schedule, detects a
**genuine** price drop (not noise), and emails you with the best options plus a link to go
book it yourself.

**What it does not do, by design:**

- No scraping. It uses official flight APIs (Duffel).
- No in-app booking and no payment handling. It deep-links you out to Google Flights / the
  airline; you complete the purchase.
- No tracking-evasion / fingerprint-spoofing. The "searching raises your price" idea is
  largely a myth, so there's nothing to evade.

## Quick start (no API keys needed)

```bash
npm install
npm run check
```

Out of the box this uses a **mock** flight provider and prints any alert to the console
(a "dry run"). You'll see it search the sample watch, record a price, and decide whether to
alert. Nothing leaves your machine.

## Add / list / remove watches

```bash
# list current watches
npm run cli -- list

# add a watch (flexible dates with START..END; nearby airports comma-separated)
npm run cli -- add --from SFO --to NRT,HND --depart 2026-10-12..2026-10-14 \
  --return 2026-10-24..2026-10-26 --pax 1 --cabin economy --target 800 --label "Tokyo fall"

# remove
npm run cli -- remove <id>
```

Watches live in `data/watches.json`; price history accumulates in `data/observations.json`.

## Going live (optional)

Set keys in `.env` (copy from `.env.example`):

- `DUFFEL_API_KEY` — a Duffel sandbox token switches the data source from mock to real fares.
- `RESEND_API_KEY` + `ALERT_TO` — makes alerts actually email you instead of printing.

## Hosting (later, separate personal GitHub account)

This project is intentionally **not** a git repo yet. When you're ready to run it unattended,
the plan is a brand-new personal GitHub account with a dedicated SSH key, GitHub Actions cron
every 6h, and price history committed back as state. See the project plan for the exact,
isolated setup. It never touches any other account.

## How "real drop vs. noise" works

Per watch, it tracks rolling price history and only alerts when one of:

1. price is at or below your `target`, or
2. price is a new low over the last N days, or
3. price is meaningfully (default 10%) below the typical (median), and has stayed there
   across consecutive checks (debounce).

A 24h per-watch cooldown prevents repeat spam.
