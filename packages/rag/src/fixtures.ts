import type { NewsItem } from "@meridian/schemas";

/** Stable fixtures used by TC-023-02. Never sourced from docs/ or docs/kb/. */
export const RAG_CANNED_FIXTURES: ReadonlyArray<{
  query: string;
  item: NewsItem;
}> = [
  {
    query: "earnings beats in semis this week",
    item: {
      id: "02302302-aaaa-4aaa-8aaa-000000000001",
      ts: "2026-09-08T15:00:00.000Z",
      headline: "Semiconductor foundry earnings beats land this week as AI semis demand stays hot",
      body: "Chipmakers posted earnings beats across semis this week, with foundry and GPU customers citing AI accelerator pull-through.",
      source: "Reuters",
      symbols: ["NVDA"],
      sector: "Technology",
      sentiment: 0.58,
      event_type: "earnings",
    },
  },
  {
    query: "federal reserve inflation print and rate path",
    item: {
      id: "02302302-aaaa-4aaa-8aaa-000000000002",
      ts: "2026-09-07T18:00:00.000Z",
      headline: "Federal Reserve flags the inflation print as the key to the rate path",
      body: "Officials said the next inflation print will set the federal reserve rate path, with no preset course for cuts.",
      source: "Bloomberg",
      symbols: ["SPY"],
      sector: "Financials",
      sentiment: 0.05,
      event_type: "macro",
    },
  },
  {
    query: "antitrust review of a mega merger deal",
    item: {
      id: "02302302-aaaa-4aaa-8aaa-000000000003",
      ts: "2026-09-06T16:30:00.000Z",
      headline: "Mega merger faces antitrust review as regulators probe the deal",
      body: "Counsel said antitrust review is the next gating item for the mega merger, with a cash-and-stock mix still in flux.",
      source: "WSJ",
      symbols: ["MSFT"],
      sector: "Technology",
      sentiment: -0.12,
      event_type: "mna",
    },
  },
  {
    query: "FDA warning letter on a drug trial setback",
    item: {
      id: "02302302-aaaa-4aaa-8aaa-000000000004",
      ts: "2026-09-05T13:00:00.000Z",
      headline: "FDA issues a warning letter after a late-stage drug trial setback",
      body: "The agency posted a warning letter tied to the drug trial setback; counsel said the FDA process remains early.",
      source: "AP",
      symbols: ["PFE"],
      sector: "Health Care",
      sentiment: -0.42,
      event_type: "regulatory",
    },
  },
  {
    query: "analyst upgrade on electric vehicle maker",
    item: {
      id: "02302302-aaaa-4aaa-8aaa-000000000005",
      ts: "2026-09-08T12:00:00.000Z",
      headline: "Analysts upgrade the electric vehicle maker after an EV delivery beat",
      body: "The upgrade on the electric vehicle maker cites delivery beat and EV margin expansion versus the prior note.",
      source: "CNBC",
      symbols: ["TSLA"],
      sector: "Consumer Discretionary",
      sentiment: 0.44,
      event_type: "analyst",
    },
  },
];

export const RAG_DISTRACTORS: readonly NewsItem[] = [
  {
    id: "02302302-bbbb-4aaa-8aaa-000000000101",
    ts: "2026-09-08T11:00:00.000Z",
    headline: "Retail chain restates same-store sales after a quiet holiday weekend",
    body: "Management said weather, not product mix, explained the restatement. Peers in consumer staples were mixed.",
    source: "Reuters",
    symbols: ["WMT"],
    sector: "Consumer Staples",
    sentiment: 0.02,
    event_type: "product",
  },
  {
    id: "02302302-bbbb-4aaa-8aaa-000000000102",
    ts: "2026-09-04T11:00:00.000Z",
    headline: "Airline capacity adds remain on track into the next schedule season",
    body: "Fleet deliveries are unchanged. Investors will parse commentary on load factors next month.",
    source: "Bloomberg",
    symbols: ["DAL"],
    sector: "Industrials",
    sentiment: 0.08,
    event_type: "product",
  },
];

export function ragFixtureItems(): NewsItem[] {
  return RAG_CANNED_FIXTURES.map((row) => row.item);
}

export function mergeNewsCorpusWithRagFixtures(generated: readonly NewsItem[]): NewsItem[] {
  const fixtures = ragFixtureItems();
  const skip = new Set(fixtures.map((row) => row.id));
  const rest = generated.filter((row) => !skip.has(row.id));
  const keep = Math.max(0, generated.length - fixtures.length);
  return [...fixtures, ...rest.slice(0, keep)];
}
