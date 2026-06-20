import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "../config";
import type { Watch, Observation } from "../types";

const watchesPath = path.join(config.dataDir, "watches.json");
const obsPath = path.join(config.dataDir, "observations.json");

async function ensureDir(): Promise<void> {
  await mkdir(config.dataDir, { recursive: true });
}

export async function loadWatches(): Promise<Watch[]> {
  if (!existsSync(watchesPath)) return [];
  return JSON.parse(await readFile(watchesPath, "utf8")) as Watch[];
}

export async function saveWatches(watches: Watch[]): Promise<void> {
  await ensureDir();
  await writeFile(watchesPath, JSON.stringify(watches, null, 2) + "\n");
}

export async function loadObservations(): Promise<Observation[]> {
  if (!existsSync(obsPath)) return [];
  return JSON.parse(await readFile(obsPath, "utf8")) as Observation[];
}

export async function saveObservations(obs: Observation[]): Promise<void> {
  await ensureDir();
  await writeFile(obsPath, JSON.stringify(obs, null, 2) + "\n");
}
