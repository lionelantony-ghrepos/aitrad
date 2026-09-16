import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Public InsForge keys that `.env.local` must win over ambient process env. */
export const LOCAL_INSFORGE_ENV_KEYS = [
  "NEXT_PUBLIC_INSFORGE_URL",
  "NEXT_PUBLIC_INSFORGE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type LocalInsforgeEnvKey = (typeof LOCAL_INSFORGE_ENV_KEYS)[number];

export function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function overlayLocalInsforgeEnv(
  target: Record<string, string | undefined>,
  fileContents: string,
): LocalInsforgeEnvKey[] {
  const parsed = parseDotEnv(fileContents);
  const applied: LocalInsforgeEnvKey[] = [];
  for (const key of LOCAL_INSFORGE_ENV_KEYS) {
    const value = parsed[key];
    if (typeof value === "string" && value.length > 0) {
      target[key] = value;
      applied.push(key);
    }
  }
  return applied;
}

/**
 * Next.js does not let `.env.local` override variables already in `process.env`.
 * Cloud Agent (and similar) inject hosted `NEXT_PUBLIC_INSFORGE_*`, which would
 * send the terminal at a different project than `insforge local start`.
 * Project-local `.env.local` is the linked Docker/cloud file from docs/07.
 */
export function applyInsforgeDotEnvLocal(webRoot: string): LocalInsforgeEnvKey[] {
  const candidates = [path.join(webRoot, "..", ".env.local"), path.join(webRoot, ".env.local")];
  const applied: LocalInsforgeEnvKey[] = [];
  const seen = new Set<LocalInsforgeEnvKey>();
  for (const file of candidates) {
    if (!existsSync(file)) {
      continue;
    }
    const keys = overlayLocalInsforgeEnv(process.env, readFileSync(file, "utf8"));
    for (const key of keys) {
      if (!seen.has(key)) {
        seen.add(key);
        applied.push(key);
      }
    }
  }
  return applied;
}
