import { copilotCitationSchema, type CopilotCitation } from "@meridian/schemas";

const NEWS_RE = /\[news:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi;
const DES_RE = /\[des:([A-Z][A-Z0-9.]{0,9})\]/g;

export function extractCitations(
  text: string,
  newsMeta: ReadonlyMap<string, { headline?: string; symbol?: string }>,
): CopilotCitation[] {
  const out: CopilotCitation[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(NEWS_RE)) {
    const id = match[1];
    if (!id || seen.has(`news:${id}`)) {
      continue;
    }
    seen.add(`news:${id}`);
    const meta = newsMeta.get(id);
    out.push(
      copilotCitationSchema.parse({
        kind: "news",
        id,
        label: "news",
        headline: meta?.headline,
        symbol: meta?.symbol,
      }),
    );
  }
  for (const match of text.matchAll(DES_RE)) {
    const symbol = match[1];
    if (!symbol || seen.has(`des:${symbol}`)) {
      continue;
    }
    seen.add(`des:${symbol}`);
    out.push(
      copilotCitationSchema.parse({
        kind: "des",
        id: symbol,
        label: symbol,
        symbol,
      }),
    );
  }
  return out;
}

export function newsMetaFromToolResults(
  results: readonly unknown[],
): Map<string, { headline?: string; symbol?: string }> {
  const map = new Map<string, { headline?: string; symbol?: string }>();
  for (const result of results) {
    const items = collectNewsItems(result);
    for (const item of items) {
      map.set(item.id, { headline: item.headline, symbol: item.symbols?.[0] });
    }
  }
  return map;
}

function collectNewsItems(value: unknown): Array<{
  id: string;
  headline?: string;
  symbols?: string[];
}> {
  if (!value || typeof value !== "object") {
    return [];
  }
  const record = value as Record<string, unknown>;
  const bag = Array.isArray(record.items) ? record.items : Array.isArray(value) ? value : [];
  const out: Array<{ id: string; headline?: string; symbols?: string[] }> = [];
  for (const row of bag) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const item = row as { id?: unknown; headline?: unknown; symbols?: unknown };
    if (typeof item.id === "string") {
      out.push({
        id: item.id,
        headline: typeof item.headline === "string" ? item.headline : undefined,
        symbols: Array.isArray(item.symbols)
          ? item.symbols.filter((s): s is string => typeof s === "string")
          : undefined,
      });
    }
  }
  return out;
}

export type MarkdownPart =
  { type: "text"; text: string } | { type: "citation"; citation: CopilotCitation };

export function splitMarkdownCitations(
  text: string,
  citations: readonly CopilotCitation[],
): MarkdownPart[] {
  const byKey = new Map<string, CopilotCitation>();
  for (const citation of citations) {
    byKey.set(`${citation.kind}:${citation.id}`, citation);
  }
  const parts: MarkdownPart[] = [];
  const tokenRe =
    /\[news:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]|\[des:([A-Z][A-Z0-9.]{0,9})\]/gi;
  let last = 0;
  for (const match of text.matchAll(tokenRe)) {
    const index = match.index ?? 0;
    if (index > last) {
      parts.push({ type: "text", text: text.slice(last, index) });
    }
    const newsId = match[1];
    const des = match[2];
    if (newsId) {
      parts.push({
        type: "citation",
        citation:
          byKey.get(`news:${newsId}`) ??
          copilotCitationSchema.parse({ kind: "news", id: newsId, label: "news" }),
      });
    } else if (des) {
      parts.push({
        type: "citation",
        citation:
          byKey.get(`des:${des}`) ??
          copilotCitationSchema.parse({ kind: "des", id: des, label: des, symbol: des }),
      });
    }
    last = index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", text: text.slice(last) });
  }
  return parts;
}
