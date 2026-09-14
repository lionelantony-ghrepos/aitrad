import {
  copilotCitationSchema,
  type CopilotCitation,
  type PortfolioAnalysisFacts,
} from "@meridian/schemas";
import { extractCitations, newsMetaFromToolResults } from "./citations";
import { assertGroundedOrThrow } from "./grounding";
import type { ChatMessage, LlmPort } from "./loop";
import { flagsFromCollectOutcome } from "./brief-facts";

export type BriefNewsItem = {
  id: string;
  headline?: string;
  symbols?: string[];
};

export type MorningBriefPack = {
  kind: "morning";
  as_of: string;
  session: string;
  portfolio: unknown;
  watchlist_movers: unknown;
  news: BriefNewsItem[];
  alerts: unknown;
  calendar: unknown;
};

export type InstrumentBriefPack = {
  kind: "instrument";
  symbol: string;
  fundamentals: unknown;
  news: BriefNewsItem[];
};

export type PortfolioHealthPack = {
  kind: "portfolio";
  facts: PortfolioAnalysisFacts;
  flags: string[];
  outcome: unknown;
  audit_id: string;
  table_versions: unknown;
};

export type BriefPack = MorningBriefPack | InstrumentBriefPack | PortfolioHealthPack;

export function buildBriefPrompt(pack: BriefPack): string {
  const rules = [
    "You are Meridian Copilot writing a research brief.",
    "Never invent prices, P&L, percents, or other figures. Copy numbers from the JSON exactly.",
    "Cite news as [news:uuid] and instruments as [des:SYMBOL].",
    "Not financial advice. Terse markdown.",
  ];
  if (pack.kind === "portfolio") {
    rules.push(
      "Portfolio Health: the FACTS and FLAGS JSON is the source of truth from DT-RISK-02.",
      "Narrate flags; every numeric claim must equal a fact value.",
    );
  }
  return `${rules.join("\n")}\n\nJSON:\n${JSON.stringify(pack)}`;
}

export function renderHealthMarkdown(pack: PortfolioHealthPack): string {
  const { facts, flags, audit_id } = pack;
  const flagLines =
    flags.length === 0
      ? "- No analysis flags from DT-RISK-02."
      : flags.map((flag) => `- ${flag}`).join("\n");
  return [
    "# Portfolio Health",
    "",
    `Equity ${facts.equity}. Cash ${facts.cash_pct}%. Positions ${facts.positions_count}.`,
    `Max position ${facts.max_position_pct}%. Max sector ${facts.max_sector_pct}%. Portfolio beta ${facts.portfolio_beta}.`,
    "",
    "## Flags (DT-RISK-02)",
    flagLines,
    "",
    `Rule audit ${audit_id}. Numbers are the analysis facts, not estimates.`,
  ].join("\n");
}

export function renderMorningMarkdown(pack: MorningBriefPack): string {
  const cites = pack.news
    .slice(0, 3)
    .map((item) => `[news:${item.id}]`)
    .join(" ");
  const symbols = pack.news.flatMap((item) => item.symbols ?? []).slice(0, 3);
  const des = symbols.map((s) => `[des:${s}]`).join(" ");
  return [
    "# Morning Brief",
    "",
    `Session ${pack.session} as of ${pack.as_of}.`,
    pack.news.length > 0 ? `Headlines ${cites} ${des}`.trim() : "No cited news in the digest.",
    "Figures below come from the portfolio and watchlist JSON only.",
  ].join("\n");
}

export function renderInstrumentMarkdown(pack: InstrumentBriefPack): string {
  const cites = pack.news
    .slice(0, 3)
    .map((item) => `[news:${item.id}]`)
    .join(" ");
  return [
    `# Instrument Brief ${pack.symbol}`,
    "",
    `Thesis-style summary for [des:${pack.symbol}].`,
    cites.length > 0 ? `Cited news ${cites}.` : "No news citations.",
    "Fundamentals numbers must come from the JSON pack.",
  ].join("\n");
}

export function citationsForPack(pack: BriefPack, markdown: string): CopilotCitation[] {
  const news = pack.kind === "portfolio" ? [] : pack.news;
  return extractCitations(markdown, newsMetaFromToolResults([{ items: news }])).map((row) =>
    copilotCitationSchema.parse(row),
  );
}

export function assertHealthFiguresMatchAudit(markdown: string, pack: PortfolioHealthPack): void {
  assertGroundedOrThrow(markdown, [
    pack.facts,
    pack.outcome,
    { flags: pack.flags, audit_id: pack.audit_id },
  ]);
  const fromRules = flagsFromCollectOutcome(pack.outcome);
  if (JSON.stringify([...fromRules].sort()) !== JSON.stringify([...pack.flags].sort())) {
    throw new Error("HEALTH_FLAG_NOT_IN_OUTCOME");
  }
  for (const flag of fromRules) {
    if (!markdown.includes(flag)) {
      throw new Error(`HEALTH_FLAG_MISSING:${flag}`);
    }
  }
}

export function fakeBriefLlm(): LlmPort {
  return {
    async complete(messages: ChatMessage[]) {
      const pack = packFromMessages(messages);
      if (!pack) {
        return { content: "Unable to write brief without JSON pack." };
      }
      if (pack.kind === "portfolio") {
        return { content: renderHealthMarkdown(pack) };
      }
      if (pack.kind === "morning") {
        return { content: renderMorningMarkdown(pack) };
      }
      return { content: renderInstrumentMarkdown(pack) };
    },
  };
}

export async function generateBriefMarkdown(input: {
  pack: BriefPack;
  llm: LlmPort;
}): Promise<{ content_md: string; citations: CopilotCitation[] }> {
  const prompt = buildBriefPrompt(input.pack);
  const turn = await input.llm.complete([{ role: "user", content: prompt }]);
  let content = turn.content ?? "";
  if (input.pack.kind === "portfolio") {
    try {
      assertHealthFiguresMatchAudit(content, input.pack);
    } catch {
      content = renderHealthMarkdown(input.pack);
      assertHealthFiguresMatchAudit(content, input.pack);
    }
  } else {
    const payloads =
      input.pack.kind === "morning"
        ? [input.pack.portfolio, input.pack.watchlist_movers, input.pack.news, input.pack.alerts]
        : [input.pack.fundamentals, input.pack.news, { symbol: input.pack.symbol }];
    try {
      assertGroundedOrThrow(content, payloads);
    } catch {
      content =
        input.pack.kind === "morning"
          ? renderMorningMarkdown(input.pack)
          : renderInstrumentMarkdown(input.pack);
    }
  }
  return { content_md: content, citations: citationsForPack(input.pack, content) };
}

function packFromMessages(messages: ChatMessage[]): BriefPack | null {
  const text = [...messages].reverse().find((row) => row.role === "user")?.content ?? "";
  const idx = text.indexOf("JSON:");
  if (idx < 0) {
    return null;
  }
  try {
    return JSON.parse(text.slice(idx + 5).trim()) as BriefPack;
  } catch {
    return null;
  }
}
