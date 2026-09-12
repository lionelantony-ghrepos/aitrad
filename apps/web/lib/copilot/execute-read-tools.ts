import { loadChartBars } from "@/lib/chart/load-bars";
import {
  stubGetDesProfile,
  stubGetRuleAudit,
  stubInstrumentBySymbol,
  stubListPositions,
  stubListSnapshots,
  stubLoadProvision,
  stubQuoteForInstrument,
  stubQuotesFor,
  stubRunScreener,
  stubSearchNews,
} from "@/lib/auth/stub-store";
import {
  assemblePortfolio,
  explainRuleDecisionToolInputSchema,
  filterEquityCurve,
  getBarsToolInputSchema,
  getFundamentalsToolInputSchema,
  getPortfolioToolInputSchema,
  getQuoteToolInputSchema,
  portfolioResponseSchema,
  screenInstrumentsToolInputSchema,
  searchNewsToolInputSchema,
} from "@meridian/schemas";

export async function executeStubReadTool(input: {
  name: string;
  args: unknown;
  userId: string;
}): Promise<unknown> {
  void input.userId;
  switch (input.name) {
    case "get_quote": {
      const { symbol } = getQuoteToolInputSchema.parse(input.args);
      const instrument = stubInstrumentBySymbol(symbol);
      if (!instrument) {
        throw new Error("SYMBOL_NOT_FOUND");
      }
      return { instrument, quote: stubQuoteForInstrument(instrument.id) ?? null };
    }
    case "get_bars": {
      const { symbol, range } = getBarsToolInputSchema.parse(input.args);
      const loaded = await loadChartBars({
        userId: input.userId,
        token: "stub",
        query: { symbol, range },
      });
      if (!loaded.ok) {
        throw new Error(loaded.message);
      }
      return loaded.data;
    }
    case "search_news": {
      return { items: stubSearchNews(searchNewsToolInputSchema.parse(input.args)) };
    }
    case "get_fundamentals": {
      const { symbol } = getFundamentalsToolInputSchema.parse(input.args);
      const profile = stubGetDesProfile(symbol);
      if (!profile) {
        throw new Error("SYMBOL_NOT_FOUND");
      }
      return profile;
    }
    case "screen_instruments": {
      const request = screenInstrumentsToolInputSchema.parse(input.args);
      const criteria = request.criteria ?? {
        combinator: "and" as const,
        groups: [
          {
            combinator: "and" as const,
            conditions: request.sector
              ? [{ field: "sector" as const, op: "eq" as const, value: request.sector }]
              : [{ field: "sector" as const, op: "any" as const, value: null }],
          },
        ],
      };
      return stubRunScreener({ op: "run", criteria, sort: request.sort });
    }
    case "get_portfolio": {
      const request = getPortfolioToolInputSchema.parse(input.args);
      const provision = stubLoadProvision(input.userId);
      if (!provision.account) {
        throw new Error("Account unavailable.");
      }
      const positions = stubListPositions(input.userId);
      const quotes = stubQuotesFor(positions.map((row) => row.instrument_id));
      const quoteById = new Map(quotes.map((row) => [row.instrument_id, row]));
      return portfolioResponseSchema.parse(
        assemblePortfolio({
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
          snapshots: filterEquityCurve(
            stubListSnapshots(input.userId),
            request.range ?? "1Y",
            new Date(),
          ),
        }),
      );
    }
    case "explain_rule_decision": {
      const { audit_id } = explainRuleDecisionToolInputSchema.parse(input.args);
      const row = stubGetRuleAudit(audit_id);
      if (!row) {
        throw new Error("AUDIT_NOT_FOUND");
      }
      return row;
    }
    default:
      throw new Error(`UNKNOWN_TOOL:${input.name}`);
  }
}
