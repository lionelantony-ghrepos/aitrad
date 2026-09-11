/**
 * Orchestration source for `copilot-orchestrator`. Bundle to `copilot-orchestrator.ts`
 * (`--external:npm:@insforge/sdk`) before deploy.
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  copilotChatRequestSchema,
  copilotMessageSchema,
  copilotSessionSchema,
  getBarsToolInputSchema,
  getFundamentalsToolInputSchema,
  getPortfolioToolInputSchema,
  getQuoteToolInputSchema,
  explainRuleDecisionToolInputSchema,
  screenInstrumentsToolInputSchema,
  searchNewsToolInputSchema,
  type CopilotChatEvent,
  type CopilotMessage,
  type CopilotSession,
} from "../../packages/schemas/src/index.ts";
import {
  baselineTable,
  evaluate,
  resolveRulesServiceApiKey,
} from "../../packages/rules-engine/src/index.ts";
import {
  DEFAULT_OPENROUTER_CHAT_MODEL,
  DEFAULT_OPENROUTER_CHAT_URL,
  newsSummaryLlm,
  openRouterLlm,
  runCopilotRequest,
} from "../../packages/copilot/src/index.ts";
import { authorizeEdgeUser } from "./_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

async function invokeSibling(input: {
  baseUrl: string;
  slug: string;
  token: string;
  body: unknown;
}): Promise<unknown> {
  const origin = input.baseUrl.replace(/\/+$/, "");
  const response = await fetch(`${origin}/functions/${input.slug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body),
  });
  const raw: unknown = await response.json().catch(() => ({ error: "SIBLING_UNAVAILABLE" }));
  if (!response.ok) {
    throw new Error(
      typeof raw === "object" && raw && "error" in raw
        ? String((raw as { error?: unknown }).error)
        : `SIBLING_${response.status}`,
    );
  }
  return raw;
}

function encodeSse(event: CopilotChatEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
  if (!baseUrl) {
    return json(500, { error: "INSFORGE_URL_MISSING" });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = copilotChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: "INVALID_BODY" });
  }

  const userClient = createClient({ baseUrl, accessToken: token });
  const { data: userData } = await userClient.auth.getCurrentUser();
  const userId = userData?.user?.id as string | undefined;
  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  if (!apiKey) {
    return json(500, { error: "API_KEY_MISSING" });
  }
  const admin = createAdminClient({ baseUrl, apiKey });
  const gate = await authorizeEdgeUser({ db: admin.database, userId, action: "copilot:chat" });
  if (!gate.allowed || !userId) {
    return json(gate.reason === "UNAUTHENTICATED" || !userId ? 401 : 403, {
      error: gate.reason ?? "UNAUTHENTICATED",
    });
  }

  const countRpc = await admin.database.rpc("count_copilot_user_messages_today", {
    p_user_id: userId,
  });
  const messagesToday = Number(countRpc.data ?? 0);

  let policyOutcome: unknown = evaluate(
    baselineTable("DT-AI-01"),
    {
      tool: "chat",
      messages_today: messagesToday,
    },
    new Date(),
  ).outcome;
  try {
    const evaluated = await invokeSibling({
      baseUrl,
      slug: "rules-service",
      token,
      body: {
        op: "evaluateDomain",
        domain: "ai_action_policy",
        context: { tool: "chat", messages_today: messagesToday },
      },
    });
    if (evaluated && typeof evaluated === "object" && "outcome" in evaluated) {
      policyOutcome = (evaluated as { outcome: unknown }).outcome;
    }
  } catch {
    // published table unavailable — baseline DT-AI-01 already evaluated
  }

  const mode = (Deno.env.get("MERIDIAN_COPILOT_LLM") ?? "").trim().toLowerCase();
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const llm =
    mode === "fake" || !openRouterKey
      ? newsSummaryLlm()
      : openRouterLlm({
          apiKey: openRouterKey,
          model: Deno.env.get("OPENROUTER_CHAT_MODEL") ?? DEFAULT_OPENROUTER_CHAT_MODEL,
          url: Deno.env.get("OPENROUTER_CHAT_URL") ?? DEFAULT_OPENROUTER_CHAT_URL,
        });

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: CopilotChatEvent): void => {
        controller.enqueue(encodeSse(event));
      };
      try {
        await runCopilotRequest({
          request: parsed.data,
          policyOutcome,
          llm,
          portfolioSummary: undefined,
          executeTool: (name, args) =>
            executeReadTool({
              name,
              args,
              admin,
              baseUrl,
              token,
              userId,
            }),
          persist: {
            async createSession(title) {
              await admin.database
                .from("copilot_sessions")
                .insert([{ user_id: userId, title: title.slice(0, 72) || "New session" }]);
              const { data, error } = await admin.database
                .from("copilot_sessions")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(1);
              if (error) {
                throw new Error(error.message);
              }
              return copilotSessionSchema.parse(asRows<CopilotSession>(data)[0]);
            },
            async appendMessage(row) {
              await admin.database.from("copilot_messages").insert([
                {
                  session_id: row.sessionId,
                  user_id: userId,
                  role: row.role,
                  content: row.content,
                  tool_calls: row.tool_calls,
                },
              ]);
              await admin.database
                .from("copilot_sessions")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", row.sessionId);
              return copilotMessageSchema.parse({
                id: crypto.randomUUID(),
                session_id: row.sessionId,
                user_id: userId,
                role: row.role,
                content: row.content,
                tool_calls: row.tool_calls,
                created_at: new Date().toISOString(),
              });
            },
            async loadHistory(sessionId) {
              const { data, error } = await admin.database
                .from("copilot_messages")
                .select("*")
                .eq("session_id", sessionId)
                .order("created_at", { ascending: true });
              if (error) {
                throw new Error(error.message);
              }
              return asRows<CopilotMessage>(data).map((row) => copilotMessageSchema.parse(row));
            },
            async auditTool(name, args) {
              await admin.database.from("audit_log").insert([
                {
                  user_id: userId,
                  action: `copilot:tool:${name}`,
                  entity_type: "copilot_messages",
                  payload: { tool: name, arguments: args },
                },
              ]);
            },
          },
          onEvent: emit,
        });
      } catch (error) {
        emit({
          type: "error",
          message: error instanceof Error ? error.message : "COPILOT_FAILED",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

async function executeReadTool(input: {
  name: string;
  args: unknown;
  admin: ReturnType<typeof createAdminClient>;
  baseUrl: string;
  token: string;
  userId: string;
}): Promise<unknown> {
  const db = input.admin.database;
  switch (input.name) {
    case "get_quote": {
      const { symbol } = getQuoteToolInputSchema.parse(input.args);
      const inst = await db.from("instruments").select("*").eq("symbol", symbol.toUpperCase());
      const instrument = asRows<Record<string, unknown>>(inst.data)[0];
      if (!instrument) {
        throw new Error("SYMBOL_NOT_FOUND");
      }
      const quotes = await db
        .from("quotes_latest")
        .select("*")
        .eq("instrument_id", String(instrument.id));
      return { instrument, quote: asRows(quotes.data)[0] ?? null };
    }
    case "get_bars": {
      const { symbol, range } = getBarsToolInputSchema.parse(input.args);
      const inst = await db
        .from("instruments")
        .select("id,symbol")
        .eq("symbol", symbol.toUpperCase());
      const instrument = asRows<Record<string, unknown>>(inst.data)[0];
      if (!instrument) {
        throw new Error("SYMBOL_NOT_FOUND");
      }
      const timeframe = range === "1D" ? "1m" : "1d";
      const bars = await db
        .from("market_bars")
        .select("*")
        .eq("instrument_id", String(instrument.id))
        .eq("timeframe", timeframe)
        .order("ts", { ascending: false })
        .limit(80);
      return { symbol: instrument.symbol, range, timeframe, bars: asRows(bars.data).reverse() };
    }
    case "search_news": {
      const request = searchNewsToolInputSchema.parse(input.args);
      return invokeSibling({
        baseUrl: input.baseUrl,
        slug: "search-news",
        token: input.token,
        body: request,
      });
    }
    case "get_fundamentals": {
      const { symbol } = getFundamentalsToolInputSchema.parse(input.args);
      const inst = await db.from("instruments").select("*").eq("symbol", symbol.toUpperCase());
      const instrument = asRows<Record<string, unknown>>(inst.data)[0];
      if (!instrument) {
        throw new Error("SYMBOL_NOT_FOUND");
      }
      const fund = await db
        .from("fundamentals")
        .select("*")
        .eq("instrument_id", String(instrument.id));
      return { symbol: instrument.symbol, instrument, fundamentals: asRows(fund.data)[0] ?? null };
    }
    case "screen_instruments": {
      const request = screenInstrumentsToolInputSchema.parse(input.args);
      const criteria = request.criteria ?? {
        combinator: "and" as const,
        groups: [
          {
            combinator: "and" as const,
            conditions: request.sector
              ? [{ field: "sector", op: "eq", value: request.sector }]
              : [{ field: "sector", op: "any", value: null }],
          },
        ],
      };
      return invokeSibling({
        baseUrl: input.baseUrl,
        slug: "screener",
        token: input.token,
        body: { op: "run", criteria, sort: request.sort },
      });
    }
    case "get_portfolio": {
      const request = getPortfolioToolInputSchema.parse(input.args);
      return invokeSibling({
        baseUrl: input.baseUrl,
        slug: "analytics-service/portfolio",
        token: input.token,
        body: { op: "portfolio", range: request.range ?? "1Y" },
      });
    }
    case "explain_rule_decision": {
      const { audit_id } = explainRuleDecisionToolInputSchema.parse(input.args);
      const { data, error } = await db.from("rule_audit").select("*").eq("id", audit_id);
      if (error) {
        throw new Error(error.message);
      }
      const row = asRows(data)[0];
      if (!row) {
        throw new Error("AUDIT_NOT_FOUND");
      }
      return row;
    }
    default:
      throw new Error(`UNKNOWN_TOOL:${input.name}`);
  }
}
