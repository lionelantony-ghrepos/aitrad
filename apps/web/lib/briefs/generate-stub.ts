import { baselineTable, evaluate } from "@meridian/rules-engine";
import {
  assemblePortfolio,
  briefSchema,
  filterEquityCurve,
  type Brief,
  type BriefKind,
  type CopilotCitation,
} from "@meridian/schemas";
import {
  fakeBriefLlm,
  flagsFromCollectOutcome,
  generateBriefMarkdown,
  portfolioAnalysisFactsFromBook,
  renderBriefPdf,
  type BriefPack,
} from "@meridian/copilot";
import {
  stubGetBrief,
  stubGetDesProfile,
  stubInsertBrief,
  stubInstrumentBySymbol,
  stubListAlerts,
  stubListNews,
  stubListPositions,
  stubListSnapshots,
  stubListWatchlistItems,
  stubListWatchlists,
  stubLoadProvision,
  stubPatchBrief,
  stubQuotesFor,
  stubSearchNews,
  STUB_INSTRUMENTS,
} from "@/lib/auth/stub-store";

function bytesToDataUrl(bytes: Uint8Array): string {
  const bin = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${bin}`;
}

async function stubPortfolio(userId: string) {
  const provision = stubLoadProvision(userId);
  if (!provision.account) {
    throw new Error("Account unavailable.");
  }
  const positions = stubListPositions(userId);
  const quotes = stubQuotesFor(positions.map((row) => row.instrument_id));
  const quoteById = new Map(quotes.map((row) => [row.instrument_id, row]));
  return assemblePortfolio({
    account: {
      id: provision.account.id,
      cash: provision.account.cash_balance,
      reserved_cash: provision.account.reserved_cash ?? 0,
      currency: provision.account.currency,
    },
    positions: positions.map((row) => {
      const quote = quoteById.get(row.instrument_id);
      const instrument = stubInstrumentBySymbol(row.symbol);
      return {
        id: row.id,
        instrument_id: row.instrument_id,
        symbol: row.symbol,
        sector: instrument?.sector ?? null,
        qty: row.qty,
        avg_cost: row.avg_cost,
        realized_pnl: row.realized_pnl,
        last: quote?.last ?? 0,
        prev_close: quote?.prev_close ?? 0,
      };
    }),
    snapshots: filterEquityCurve(stubListSnapshots(userId), "1Y", new Date()),
  });
}

export async function stubGenerateBrief(input: {
  userId: string;
  kind: BriefKind;
  subject?: string;
}): Promise<{ brief: Brief; citations: CopilotCitation[] }> {
  const portfolio = await stubPortfolio(input.userId);
  let pack: BriefPack;
  let subject = input.subject?.toUpperCase() ?? input.kind;
  if (input.kind === "portfolio") {
    const facts = portfolioAnalysisFactsFromBook({
      portfolio,
      betaClassBySymbol: Object.fromEntries(
        portfolio.positions.map((row) => {
          const inst = stubInstrumentBySymbol(row.symbol);
          return [row.symbol, inst?.beta_class ?? "medium"];
        }),
      ),
    });
    const result = evaluate(baselineTable("DT-RISK-02"), facts, new Date());
    pack = {
      kind: "portfolio",
      facts,
      flags: flagsFromCollectOutcome(result.outcome),
      outcome: result.outcome,
      audit_id: "stub-dt-risk-02",
      table_versions: [{ table_key: "DT-RISK-02", version: 1 }],
    };
    subject = "portfolio";
  } else if (input.kind === "instrument") {
    const symbol = (input.subject ?? portfolio.positions[0]?.symbol ?? "AAPL").toUpperCase();
    const news = stubSearchNews({ query: symbol, symbols: [symbol], limit: 5 });
    pack = {
      kind: "instrument",
      symbol,
      fundamentals: stubGetDesProfile(symbol) ?? { symbol },
      news,
    };
    subject = symbol;
  } else {
    const lists = stubListWatchlists(input.userId);
    const movers = lists.flatMap((list) =>
      stubListWatchlistItems(input.userId, list.id).map((item) => {
        const instrument = STUB_INSTRUMENTS.find((row) => row.id === item.instrument_id);
        return { symbol: instrument?.symbol ?? item.instrument_id };
      }),
    );
    pack = {
      kind: "morning",
      as_of: new Date().toISOString(),
      session: "OPEN",
      portfolio,
      watchlist_movers: movers,
      news: stubListNews().slice(0, 5),
      alerts: stubListAlerts(input.userId).slice(0, 5),
      calendar: { session_date: new Date().toISOString().slice(0, 10) },
    };
    subject = "morning";
  }
  const generated = await generateBriefMarkdown({ pack, llm: fakeBriefLlm() });
  const brief = stubInsertBrief(
    briefSchema.parse({
      id: crypto.randomUUID(),
      user_id: input.userId,
      kind: input.kind,
      subject,
      content_md: generated.content_md,
      data: { pack, citations: generated.citations },
      pdf_key: null,
      pdf_url: null,
      created_at: new Date().toISOString(),
    }),
  );
  return { brief, citations: generated.citations };
}

export function stubExportBriefPdf(
  userId: string,
  briefId: string,
): { brief: Brief; download_url: string } | null {
  const brief = stubGetBrief(userId, briefId);
  if (!brief) {
    return null;
  }
  const pdf = renderBriefPdf(
    brief.kind === "morning"
      ? "Morning Brief"
      : brief.kind === "instrument"
        ? `Instrument Brief ${brief.subject}`
        : "Portfolio Health",
    brief.content_md,
  );
  const download_url = bytesToDataUrl(pdf);
  const patched = stubPatchBrief(userId, briefId, {
    pdf_key: `${userId}/${briefId}.pdf`,
    pdf_url: download_url,
  });
  if (!patched) {
    return null;
  }
  return { brief: patched, download_url };
}
