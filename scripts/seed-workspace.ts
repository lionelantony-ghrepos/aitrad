import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminClient } from "@insforge/sdk";
import { seedEnvSchema } from "@meridian/schemas";
import {
  parseDemoUsersJson,
  parseWorkspaceFixturesJson,
  traderPortfolio,
} from "@meridian/mock-data";
import { rsi14Last } from "../packages/indicators/src/index.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type AdminClient = ReturnType<typeof createAdminClient>;
type AdminDatabase = AdminClient["database"];

const TRADER_EMAIL = "demo.trader@meridian.test";

async function must<T>(
  label: string,
  result: { data: T; error: { message: string } | null },
): Promise<T> {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

function asRows<T>(data: T): T extends unknown[] ? T : never {
  if (!Array.isArray(data)) {
    throw new Error("EXPECTED_ARRAY");
  }
  return data as T extends unknown[] ? T : never;
}

async function upsertByName<T extends Record<string, unknown>>(
  db: AdminDatabase,
  table: string,
  userId: string,
  name: string,
  payload: T,
): Promise<string> {
  const existing = await must(
    `${table} ${name}`,
    await db.from(table).select("id").eq("user_id", userId).eq("name", name),
  );
  const found = asRows(existing)[0] as { id?: string } | undefined;
  if (found?.id) {
    const update = await db.from(table).update(payload).eq("id", found.id);
    if (update.error) {
      throw new Error(`${table} update ${name}: ${update.error.message}`);
    }
    return found.id;
  }
  const insert = await db.from(table).insert([{ user_id: userId, name, ...payload }]);
  if (insert.error) {
    throw new Error(`${table} insert ${name}: ${insert.error.message}`);
  }
  const reloaded = await must(
    `${table} reload ${name}`,
    await db.from(table).select("id").eq("user_id", userId).eq("name", name),
  );
  const id = (asRows(reloaded)[0] as { id?: string } | undefined)?.id;
  if (!id) {
    throw new Error(`${table.toUpperCase()}_ID_MISSING:${name}`);
  }
  return id;
}

async function seedDailyRsi(db: AdminDatabase): Promise<void> {
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const raw = execFileSync(
    npxBin,
    [
      "-y",
      "@insforge/cli",
      "db",
      "query",
      `SELECT instrument_id, ts, c FROM (
         SELECT instrument_id, ts, c,
           row_number() OVER (PARTITION BY instrument_id ORDER BY ts DESC) AS rn
         FROM public.market_bars WHERE timeframe = '1d'
       ) ranked WHERE rn <= 20 ORDER BY instrument_id, ts`,
      "--json",
    ],
    { encoding: "utf8", cwd: repoRoot },
  );
  const parsed = JSON.parse(raw) as {
    rows?: Array<{ instrument_id: string; ts: string; c: number }>;
  };
  const byInstrument = new Map<string, Array<{ ts: string; c: number }>>();
  for (const row of parsed.rows ?? []) {
    const list = byInstrument.get(row.instrument_id) ?? [];
    list.push({ ts: row.ts, c: Number(row.c) });
    byInstrument.set(row.instrument_id, list);
  }
  const upserts: Record<string, unknown>[] = [];
  for (const [instrumentId, list] of byInstrument) {
    const closes = list.map((row) => row.c);
    const last = list[list.length - 1];
    if (!last) {
      continue;
    }
    const rsi = rsi14Last(closes);
    upserts.push({
      instrument_id: instrumentId,
      rsi_14: rsi,
      as_of_date: last.ts.slice(0, 10),
    });
  }
  for (let i = 0; i < upserts.length; i += 80) {
    const chunk = upserts.slice(i, i + 80);
    const { error } = await db.from("instrument_daily_rsi").upsert(chunk, {
      onConflict: "instrument_id",
    });
    if (error) {
      throw new Error(`instrument_daily_rsi: ${error.message}`);
    }
  }
}

export async function runWorkspaceSeed(): Promise<void> {
  const env = seedEnvSchema.parse({
    INSFORGE_URL: process.env.INSFORGE_URL,
    INSFORGE_API_KEY: process.env.INSFORGE_API_KEY,
  });
  const admin = createAdminClient({
    baseUrl: env.INSFORGE_URL,
    apiKey: env.INSFORGE_API_KEY,
  });
  const db = admin.database;
  const users = parseDemoUsersJson(
    JSON.parse(
      readFileSync(path.join(repoRoot, "mock_data", "demo-users.json"), "utf8"),
    ) as unknown,
  );
  const fixture = parseWorkspaceFixturesJson(
    JSON.parse(
      readFileSync(path.join(repoRoot, "mock_data", "workspace-fixtures.json"), "utf8"),
    ) as unknown,
  );
  const authUsers = await must(
    "auth users",
    await db.from("profiles").select("user_id, display_name"),
  );
  const traderProfile = (
    asRows(authUsers) as Array<{ user_id: string; display_name: string }>
  ).find(
    (row) => row.display_name === users.users.find((u) => u.email === TRADER_EMAIL)?.display_name,
  );
  const emailLookup = await fetch(
    `${env.INSFORGE_URL.replace(/\/+$/, "")}/api/auth/users?limit=100`,
    {
      headers: { Authorization: `Bearer ${env.INSFORGE_API_KEY}` },
    },
  );
  const listed = (await emailLookup.json().catch(() => null)) as unknown;
  const traderId = findUserId(listed, TRADER_EMAIL) ?? traderProfile?.user_id;
  if (!traderId) {
    throw new Error("WORKSPACE_TRADER_MISSING");
  }

  const { portfolio } = traderPortfolio(users);
  const accounts = await must(
    "accounts",
    await db.from("accounts").select("id, cash_balance").eq("user_id", traderId),
  );
  const accountId = (asRows(accounts)[0] as { id?: string; cash_balance?: number } | undefined)?.id;
  if (!accountId) {
    throw new Error("WORKSPACE_ACCOUNT_MISSING");
  }

  const instruments = await must("instruments", await db.from("instruments").select("id, symbol"));
  const idBySymbol = new Map<string, string>();
  for (const row of asRows(instruments) as Array<{ id: string; symbol: string }>) {
    idBySymbol.set(row.symbol, row.id);
  }
  const quotes = await must("quotes", await db.from("quotes_latest").select("instrument_id, last"));
  const lastByInstrument = new Map<string, number>();
  for (const row of asRows(quotes) as Array<{ instrument_id: string; last: number }>) {
    lastByInstrument.set(row.instrument_id, Number(row.last));
  }

  const profileUpdate = await db
    .from("profiles")
    .update({ morning_brief_opt_in: true })
    .eq("user_id", traderId);
  if (profileUpdate.error) {
    throw new Error(`morning_brief_opt_in: ${profileUpdate.error.message}`);
  }

  for (const screen of fixture.screens) {
    await upsertByName(db, "screens", traderId, screen.name, { criteria: screen.criteria });
  }

  const ruleIds = new Map<string, string>();
  for (const rule of fixture.alert_rules) {
    const instrumentId = idBySymbol.get(rule.symbol);
    if (!instrumentId) {
      throw new Error(`MISSING_INSTRUMENT:${rule.symbol}`);
    }
    const id = await upsertByName(db, "alert_rules", traderId, rule.name, {
      instrument_id: instrumentId,
      kind: rule.kind,
      condition: rule.condition,
      active: true,
      throttle_state: {},
    });
    ruleIds.set(rule.name, id);
  }

  for (const alert of fixture.alerts) {
    const ruleId = ruleIds.get(alert.rule_name);
    const instrumentId = idBySymbol.get(alert.symbol);
    if (!ruleId || !instrumentId) {
      throw new Error(`ALERT_REF:${alert.rule_name}`);
    }
    const existing = await must(
      `alerts ${alert.rule_name}`,
      await db.from("alerts").select("id").eq("alert_rule_id", ruleId).eq("user_id", traderId),
    );
    if (asRows(existing).length > 0) {
      continue;
    }
    const insert = await db.from("alerts").insert([
      {
        user_id: traderId,
        alert_rule_id: ruleId,
        instrument_id: instrumentId,
        message: alert.message,
        payload: { seeded: true, symbol: alert.symbol },
        read: alert.read,
      },
    ]);
    if (insert.error) {
      throw new Error(`alerts insert: ${insert.error.message}`);
    }
  }

  for (const order of fixture.working_orders) {
    const instrumentId = idBySymbol.get(order.symbol);
    if (!instrumentId) {
      throw new Error(`MISSING_INSTRUMENT:${order.symbol}`);
    }
    const existing = await must(
      `orders ${order.symbol} ${order.status}`,
      await db
        .from("orders")
        .select("id")
        .eq("user_id", traderId)
        .eq("instrument_id", instrumentId)
        .eq("status", order.status)
        .eq("order_type", order.order_type),
    );
    if (asRows(existing).length > 0) {
      continue;
    }
    const reserved =
      order.status === "working" && order.side === "buy"
        ? order.qty * (order.limit_price ?? order.stop_price ?? 0)
        : 0;
    const insert = await db.from("orders").insert([
      {
        user_id: traderId,
        account_id: accountId,
        instrument_id: instrumentId,
        symbol: order.symbol,
        side: order.side,
        qty: order.qty,
        filled_qty: 0,
        order_type: order.order_type,
        limit_price: order.limit_price ?? null,
        stop_price: order.stop_price ?? null,
        tif: order.tif,
        status: order.status,
        reserved_amount: reserved,
      },
    ]);
    if (insert.error) {
      throw new Error(`orders insert ${order.symbol}: ${insert.error.message}`);
    }
  }

  const bracketSymbol = fixture.bracket.symbol;
  const bracketInstrument = idBySymbol.get(bracketSymbol);
  if (!bracketInstrument) {
    throw new Error(`MISSING_INSTRUMENT:${bracketSymbol}`);
  }
  const existingBracket = await must(
    "bracket",
    await db
      .from("orders")
      .select("id")
      .eq("user_id", traderId)
      .eq("instrument_id", bracketInstrument)
      .eq("group_type", "bracket"),
  );
  if (asRows(existingBracket).length === 0) {
    const groupId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const entryReserved = fixture.bracket.qty * fixture.bracket.entry_limit;
    const { error } = await db.from("orders").insert([
      {
        user_id: traderId,
        account_id: accountId,
        instrument_id: bracketInstrument,
        symbol: bracketSymbol,
        side: "buy",
        qty: fixture.bracket.qty,
        filled_qty: 0,
        order_type: "limit",
        limit_price: fixture.bracket.entry_limit,
        tif: "GTC",
        status: "working",
        reserved_amount: entryReserved,
        group_id: groupId,
        group_type: "bracket",
        leg_role: "entry",
        group_activated: false,
      },
      {
        user_id: traderId,
        account_id: accountId,
        instrument_id: bracketInstrument,
        symbol: bracketSymbol,
        side: "sell",
        qty: fixture.bracket.qty,
        filled_qty: 0,
        order_type: "limit",
        limit_price: fixture.bracket.take_profit,
        tif: "GTC",
        status: "working",
        reserved_amount: 0,
        group_id: groupId,
        group_type: "bracket",
        leg_role: "take_profit",
        group_activated: false,
      },
      {
        user_id: traderId,
        account_id: accountId,
        instrument_id: bracketInstrument,
        symbol: bracketSymbol,
        side: "sell",
        qty: fixture.bracket.qty,
        filled_qty: 0,
        order_type: "stop",
        stop_price: fixture.bracket.stop_loss,
        limit_price: null,
        tif: "GTC",
        status: "working",
        reserved_amount: 0,
        group_id: groupId,
        group_type: "bracket",
        leg_role: "stop_loss",
        group_activated: false,
      },
    ]);
    if (error) {
      throw new Error(`bracket insert: ${error.message}`);
    }
  }

  const reservedRows = await must(
    "reserved sum",
    await db
      .from("orders")
      .select("reserved_amount")
      .eq("account_id", accountId)
      .eq("status", "working"),
  );
  const reservedCash = (asRows(reservedRows) as Array<{ reserved_amount?: number }>).reduce(
    (sum, row) => sum + Number(row.reserved_amount ?? 0),
    0,
  );
  const cashUpdate = await db
    .from("accounts")
    .update({ reserved_cash: reservedCash })
    .eq("id", accountId);
  if (cashUpdate.error) {
    throw new Error(`reserved_cash: ${cashUpdate.error.message}`);
  }

  for (const monitor of fixture.monitors) {
    await upsertByName(db, "monitors", traderId, monitor.name, {
      nl_instruction: monitor.nl_instruction,
      compiled_condition: monitor.compiled_condition,
      scope: monitor.scope,
      cadence: monitor.cadence,
      active: true,
      throttle_state: {},
      last_run: null,
      propose_action: null,
    });
  }

  for (const brief of fixture.briefs) {
    const existing = await must(
      `briefs ${brief.kind}`,
      await db
        .from("briefs")
        .select("id")
        .eq("user_id", traderId)
        .eq("kind", brief.kind)
        .eq("subject", brief.subject),
    );
    if (asRows(existing).length > 0) {
      continue;
    }
    const insert = await db.from("briefs").insert([
      {
        user_id: traderId,
        kind: brief.kind,
        subject: brief.subject,
        content_md: brief.content_md,
        data: { seeded: true, book: portfolio.positions.map((row) => row.symbol) },
      },
    ]);
    if (insert.error) {
      throw new Error(`briefs insert: ${insert.error.message}`);
    }
  }

  const sessions = await must(
    "copilot sessions",
    await db
      .from("copilot_sessions")
      .select("id")
      .eq("user_id", traderId)
      .eq("title", fixture.copilot.title),
  );
  let sessionId = (asRows(sessions)[0] as { id?: string } | undefined)?.id;
  if (!sessionId) {
    const insert = await db
      .from("copilot_sessions")
      .insert([{ user_id: traderId, title: fixture.copilot.title }]);
    if (insert.error) {
      throw new Error(`copilot_sessions: ${insert.error.message}`);
    }
    const reloaded = await must(
      "copilot sessions reload",
      await db
        .from("copilot_sessions")
        .select("id")
        .eq("user_id", traderId)
        .eq("title", fixture.copilot.title),
    );
    sessionId = (asRows(reloaded)[0] as { id?: string } | undefined)?.id;
  }
  if (!sessionId) {
    throw new Error("COPILOT_SESSION_MISSING");
  }
  const existingMessages = await must(
    "copilot messages",
    await db.from("copilot_messages").select("id").eq("session_id", sessionId),
  );
  if (asRows(existingMessages).length === 0) {
    const { error } = await db.from("copilot_messages").insert(
      fixture.copilot.messages.map((message) => ({
        session_id: sessionId,
        user_id: traderId,
        role: message.role,
        content: message.content,
        tool_calls: [],
      })),
    );
    if (error) {
      throw new Error(`copilot_messages: ${error.message}`);
    }
  }
  const existingActions = await must(
    "copilot actions",
    await db.from("copilot_actions").select("id").eq("session_id", sessionId),
  );
  if (asRows(existingActions).length === 0) {
    const { error } = await db.from("copilot_actions").insert([
      {
        user_id: traderId,
        session_id: sessionId,
        tool: fixture.copilot.action.tool,
        payload: fixture.copilot.action.payload,
        policy_outcome: fixture.copilot.action.policy_outcome,
        status: fixture.copilot.action.status,
        executed_ref: null,
        reject_reason: null,
      },
    ]);
    if (error) {
      throw new Error(`copilot_actions: ${error.message}`);
    }
  }

  let equity = Number(
    (asRows(accounts)[0] as { cash_balance?: number } | undefined)?.cash_balance ?? 0,
  );
  const positions = await must(
    "positions",
    await db.from("positions").select("instrument_id, qty").eq("user_id", traderId),
  );
  for (const pos of asRows(positions) as Array<{ instrument_id: string; qty: number }>) {
    equity += Number(pos.qty) * (lastByInstrument.get(pos.instrument_id) ?? 0);
  }
  const today = new Date();
  for (let i = 0; i < 5; i += 1) {
    const day = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i),
    );
    const asOf = day.toISOString().slice(0, 10);
    const existingSnap = await must(
      `snapshot ${asOf}`,
      await db
        .from("portfolio_snapshots")
        .select("id")
        .eq("account_id", accountId)
        .eq("as_of_date", asOf),
    );
    if (asRows(existingSnap).length > 0) {
      continue;
    }
    const drift = 1 - i * 0.004;
    const { error } = await db.from("portfolio_snapshots").insert([
      {
        user_id: traderId,
        account_id: accountId,
        as_of_date: asOf,
        equity: equity * drift,
        cash: (asRows(accounts)[0] as { cash_balance?: number }).cash_balance,
        buying_power: (asRows(accounts)[0] as { cash_balance?: number }).cash_balance,
      },
    ]);
    if (error) {
      throw new Error(`portfolio_snapshots: ${error.message}`);
    }
  }

  await seedDailyRsi(db);
  process.stdout.write(
    "Workspace seed: screens, alerts, working/bracket orders, monitors, briefs, copilot, snapshots, RSI.\n",
  );
}

function findUserId(payload: unknown, email: string): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const rec = payload as Record<string, unknown>;
  const lists = [rec.users, rec.data, rec.items];
  for (const candidate of lists) {
    if (!Array.isArray(candidate)) {
      continue;
    }
    for (const row of candidate) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const item = row as Record<string, unknown>;
      if (
        typeof item.email === "string" &&
        item.email.toLowerCase() === email &&
        typeof item.id === "string"
      ) {
        return item.id;
      }
    }
  }
  return null;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  runWorkspaceSeed().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
