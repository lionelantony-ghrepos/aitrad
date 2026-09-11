import { NEWS_EMBEDDING_DIM } from "@meridian/schemas";

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "in",
  "on",
  "to",
  "for",
  "as",
  "at",
  "is",
  "are",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOP.has(token));
}

function tokenIndex(token: string, dim: number): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % dim;
}

/** Deterministic bag-of-tokens unit vector (tests + local seed without a gateway). */
export function hashEmbed(text: string, dim = NEWS_EMBEDDING_DIM): number[] {
  const vec = new Array<number>(dim).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    vec[0] = 1;
    return vec;
  }
  for (const token of tokens) {
    const idx = tokenIndex(token, dim);
    vec[idx] = (vec[idx] ?? 0) + 1;
  }
  let norm = 0;
  for (const n of vec) {
    norm += n * n;
  }
  const mag = Math.sqrt(norm);
  if (mag === 0) {
    vec[0] = 1;
    return vec;
  }
  return vec.map((n) => n / mag);
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) {
    return 0;
  }
  return dot / denom;
}

export function formatVectorLiteral(values: readonly number[]): string {
  return `[${values.join(",")}]`;
}
