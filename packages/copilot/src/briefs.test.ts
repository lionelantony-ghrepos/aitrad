import { describe, expect, it } from "vitest";
import { assemblePortfolio } from "@meridian/schemas";
import { baselineTable, evaluate } from "@meridian/rules-engine";
import {
  assertHealthFiguresMatchAudit,
  fakeBriefLlm,
  generateBriefMarkdown,
  renderHealthMarkdown,
} from "./briefs";
import { flagsFromCollectOutcome, portfolioAnalysisFactsFromBook } from "./brief-facts";
import { renderBriefPdf } from "./brief-pdf";
import type { LlmPort } from "./loop";

const NEWS_ID = "55555555-5555-4555-8555-555555555553";

function concentratedPortfolio() {
  return assemblePortfolio({
    account: {
      id: "11111111-1111-4111-8111-111111111111",
      cash: 5_000,
      reserved_cash: 0,
      currency: "USD",
    },
    positions: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        instrument_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        symbol: "NVDA",
        sector: "Technology",
        qty: 100,
        avg_cost: 100,
        realized_pnl: 0,
        last: 200,
        prev_close: 190,
      },
    ],
  });
}

function healthPack() {
  const portfolio = concentratedPortfolio();
  const facts = portfolioAnalysisFactsFromBook({
    portfolio,
    betaClassBySymbol: { NVDA: "high" },
  });
  const result = evaluate(baselineTable("DT-RISK-02"), facts, new Date("2026-09-14T14:00:00.000Z"));
  const flags = flagsFromCollectOutcome(result.outcome);
  return {
    kind: "portfolio" as const,
    facts,
    flags,
    outcome: result.outcome,
    audit_id: "audit-risk-02",
    table_versions: [{ table_key: "DT-RISK-02", version: 1 }],
  };
}

describe("PBI-028 brief generators", () => {
  it("TC-028-02 Portfolio Health numeric claims equal DT-RISK-02 audit facts @TC-028-02", async () => {
    const pack = healthPack();
    expect(pack.facts.max_position_pct).toBeGreaterThan(25);
    expect(pack.flags).toContain("CONCENTRATION_POSITION");
    const { content_md } = await generateBriefMarkdown({ pack, llm: fakeBriefLlm() });
    assertHealthFiguresMatchAudit(content_md, pack);
    expect(content_md).toContain(String(pack.facts.max_position_pct));
    expect(content_md).toContain(String(pack.facts.max_sector_pct));
    expect(content_md).toContain(String(pack.facts.portfolio_beta));
    expect(content_md).toContain(String(pack.facts.cash_pct));
    expect(content_md).toContain(String(pack.facts.equity));
    expect(content_md).toContain("CONCENTRATION_POSITION");
  });

  it("falls back when the LLM invents a figure", async () => {
    const pack = healthPack();
    const liar: LlmPort = {
      async complete() {
        return { content: "Concentration is 99.99% and beta is 9.9 with equity 1." };
      },
    };
    const { content_md } = await generateBriefMarkdown({ pack, llm: liar });
    assertHealthFiguresMatchAudit(content_md, pack);
    expect(content_md).not.toContain("99.99");
    expect(content_md).toBe(renderHealthMarkdown(pack));
  });

  it("generates morning and instrument briefs with citations and a PDF header", async () => {
    const news = [{ id: NEWS_ID, headline: "Apple AI", symbols: ["AAPL"] }];
    const morning = await generateBriefMarkdown({
      pack: {
        kind: "morning",
        as_of: "2026-09-14T13:30:00.000Z",
        session: "OPEN",
        portfolio: { equity: 1000 },
        watchlist_movers: [{ symbol: "AAPL", change_pct: 1.2 }],
        news,
        alerts: [],
        calendar: { session_date: "2026-09-14" },
      },
      llm: fakeBriefLlm(),
    });
    expect(morning.citations.some((row) => row.kind === "news")).toBe(true);
    expect(morning.content_md).toContain(`[news:${NEWS_ID}]`);

    const instrument = await generateBriefMarkdown({
      pack: {
        kind: "instrument",
        symbol: "AAPL",
        fundamentals: { pe: 32.9 },
        news,
      },
      llm: fakeBriefLlm(),
    });
    expect(instrument.content_md).toContain("[des:AAPL]");
    const pdf = renderBriefPdf("Morning Brief", morning.content_md);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  });
});
