/**
 * Orchestration source for `matching-runner`. Deno deploy is a single file:
 * bundle to `matching-runner.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createAdminClient } from "npm:@insforge/sdk";
import {
  evaluateDomainResponseSchema,
  matchingRunnerRequestSchema,
  matchingRunnerResponseSchema,
  quoteTickSchema,
  type EvaluateDomainResponse,
  type ExecConfig,
  type MatchTick,
  type OrderStatus,
  type QuoteTick,
} from "../../packages/schemas/src/index.ts";
import {
  applyFillToLedger,
  applyFillToPosition,
  assertTransition,
  canTransition,
  cashDeltaForFill,
  emptyPosition,
  liquidityCapShares,
  matchOrders,
  parseExecConfig,
} from "../../packages/paper-engine/src/index.ts";

type AdminClient = ReturnType<typeof createAdminClient>;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

type OrderRow = {
  id: string;
  user_id: string;
  account_id: string;
  instrument_id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  filled_qty: number;
  order_type: "market" | "limit" | "stop" | "stop_limit";
  limit_price: number | null;
  stop_price: number | null;
  tif: "DAY" | "GTC" | "IOC";
  status: OrderStatus;
  reserved_amount: number;
  stop_triggered: boolean;
  created_at: string;
};

type InstrumentRow = {
  id: string;
  symbol: string;
  tick_size: number;
  avg_volume: number;
  avg_volume_band: string | null;
};

type PositionRow = {
  account_id: string;
  instrument_id: string;
  symbol: string;
  qty: number;
  avg_cost: number;
  realized_pnl: number;
};

function mapOrder(row: Record<string, unknown>): OrderRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    account_id: String(row.account_id),
    instrument_id: String(row.instrument_id),
    symbol: String(row.symbol),
    side: row.side === "sell" ? "sell" : "buy",
    qty: num(row.qty),
    filled_qty: num(row.filled_qty),
    order_type: row.order_type as OrderRow["order_type"],
    limit_price: row.limit_price == null ? null : num(row.limit_price),
    stop_price: row.stop_price == null ? null : num(row.stop_price),
    tif: (row.tif as OrderRow["tif"]) ?? "DAY",
    status: row.status as OrderStatus,
    reserved_amount: num(row.reserved_amount),
    stop_triggered: Boolean(row.stop_triggered),
    created_at: String(row.created_at),
  };
}

async function evaluateExecution(input: {
  baseUrl: string;
  apiKey: string;
  userId: string;
  context: Record<string, unknown>;
}): Promise<EvaluateDomainResponse> {
  const response = await fetch(`${input.baseUrl.replace(/\/+$/, "")}/functions/rules-service`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: "execution_sim",
      context: input.context,
      userId: input.userId,
    }),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`RULES_SERVICE_${response.status}`);
  }
  return evaluateDomainResponseSchema.parse(body);
}

async function loadOpenOrders(admin: AdminClient, instrumentIds: string[]): Promise<OrderRow[]> {
  if (instrumentIds.length === 0) {
    return [];
  }
  const { data, error } = await admin.database
    .from("orders")
    .select("*")
    .in("instrument_id", instrumentIds)
    .in("status", ["accepted", "working", "partially_filled"]);
  if (error) {
    throw new Error(error.message);
  }
  return asRows<Record<string, unknown>>(data).map(mapOrder);
}

async function publishOrder(admin: AdminClient, order: OrderRow): Promise<void> {
  const { error } = await admin.database.rpc("publish_order_event", {
    p_user_id: order.user_id,
    payload: {
      id: order.id,
      status: order.status,
      symbol: order.symbol,
      filled_qty: order.filled_qty,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function publishPosition(
  admin: AdminClient,
  userId: string,
  position: PositionRow,
): Promise<void> {
  const { error } = await admin.database.rpc("publish_position_event", {
    p_user_id: userId,
    payload: {
      account_id: position.account_id,
      instrument_id: position.instrument_id,
      symbol: position.symbol,
      qty: position.qty,
      avg_cost: position.avg_cost,
      realized_pnl: position.realized_pnl,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const expected = Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY");
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!expected || token !== expected) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL") ?? "";
  const admin = createAdminClient({
    baseUrl,
    apiKey: expected,
  });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = matchingRunnerRequestSchema.parse(body);

  let ticks: QuoteTick[] = parsed.ticks ?? [];
  if (ticks.length === 0) {
    const open = await admin.database
      .from("orders")
      .select("instrument_id")
      .in("status", ["accepted", "working", "partially_filled"]);
    if (open.error) {
      return json(500, { error: open.error.message });
    }
    const ids = [
      ...new Set(asRows<{ instrument_id: string }>(open.data).map((row) => row.instrument_id)),
    ];
    if (ids.length > 0) {
      const quotes = await admin.database
        .from("quotes_latest")
        .select("*")
        .in("instrument_id", ids);
      if (quotes.error) {
        return json(500, { error: quotes.error.message });
      }
      const inst = await admin.database.from("instruments").select("id,symbol").in("id", ids);
      const symbols = new Map(
        asRows<{ id: string; symbol: string }>(inst.data).map((row) => [row.id, row.symbol]),
      );
      ticks = asRows<Record<string, unknown>>(quotes.data).map((row) =>
        quoteTickSchema.parse({
          instrument_id: row.instrument_id,
          symbol: symbols.get(String(row.instrument_id)),
          bid: row.bid,
          ask: row.ask,
          last: row.last,
          prev_close: row.prev_close,
          volume: row.volume,
          ts: row.ts,
        }),
      );
    }
  }

  if (ticks.length === 0) {
    return json(
      200,
      matchingRunnerResponseSchema.parse({ ticks: 0, promoted: 0, fills: 0, triggered: 0 }),
    );
  }

  const instrumentIds = [...new Set(ticks.map((tick) => tick.instrument_id))];
  const instRes = await admin.database
    .from("instruments")
    .select("id,symbol,tick_size,avg_volume,avg_volume_band")
    .in("id", instrumentIds);
  if (instRes.error) {
    return json(500, { error: instRes.error.message });
  }
  const instruments = new Map<string, InstrumentRow>(
    asRows<Record<string, unknown>>(instRes.data).map((row) => [
      String(row.id),
      {
        id: String(row.id),
        symbol: String(row.symbol),
        tick_size: num(row.tick_size, 0.01),
        avg_volume: num(row.avg_volume),
        avg_volume_band: typeof row.avg_volume_band === "string" ? row.avg_volume_band : null,
      },
    ]),
  );

  let orders = await loadOpenOrders(admin, instrumentIds);
  let promoted = 0;
  const now = new Date().toISOString();
  for (const order of orders) {
    if (order.status !== "accepted") {
      continue;
    }
    if (!canTransition(order.status, "working")) {
      continue;
    }
    assertTransition(order.status, "working");
    const update = await admin.database
      .from("orders")
      .update({ status: "working" })
      .eq("id", order.id)
      .eq("user_id", order.user_id);
    if (update.error) {
      return json(500, { error: update.error.message });
    }
    order.status = "working";
    promoted += 1;
    await admin.database.from("audit_log").insert([
      {
        user_id: order.user_id,
        action: "trade:promote",
        entity_type: "orders",
        entity_id: order.id,
        payload: { from: "accepted", to: "working", ts: now },
      },
    ]);
    await publishOrder(admin, order);
  }

  const posRes = await admin.database
    .from("positions")
    .select("account_id,instrument_id,symbol,qty,avg_cost,realized_pnl")
    .in("instrument_id", instrumentIds);
  if (posRes.error) {
    return json(500, { error: posRes.error.message });
  }
  const positions = new Map<string, PositionRow>();
  for (const row of asRows<Record<string, unknown>>(posRes.data)) {
    const mapped: PositionRow = {
      account_id: String(row.account_id),
      instrument_id: String(row.instrument_id),
      symbol: String(row.symbol),
      qty: num(row.qty),
      avg_cost: num(row.avg_cost),
      realized_pnl: num(row.realized_pnl),
    };
    positions.set(`${mapped.account_id}:${mapped.instrument_id}`, mapped);
  }

  const execCache = new Map<string, ExecConfig | null>();
  let fillsApplied = 0;
  let triggered = 0;

  for (const tick of ticks) {
    const instrument = instruments.get(tick.instrument_id);
    const matchTick: MatchTick = {
      instrument_id: tick.instrument_id,
      symbol: tick.symbol ?? instrument?.symbol,
      last: tick.last,
      bid: tick.bid,
      ask: tick.ask,
      ts: tick.ts,
    };
    const working = orders.filter(
      (order) =>
        order.instrument_id === tick.instrument_id &&
        (order.status === "working" || order.status === "partially_filled"),
    );
    if (working.length === 0) {
      continue;
    }

    const resolver = async (order: OrderRow): Promise<ExecConfig | null> => {
      const remaining = Math.max(0, order.qty - order.filled_qty);
      const notional = remaining * tick.last;
      const band = instrument?.avg_volume_band ?? "medium";
      const key = `${band}:${notional}:${instrument?.tick_size ?? ""}`;
      if (execCache.has(key)) {
        return execCache.get(key) ?? null;
      }
      try {
        const evaluated = await evaluateExecution({
          baseUrl,
          apiKey: expected,
          userId: order.user_id,
          context: {
            avg_volume_band: band,
            order_notional: notional,
          },
        });
        const parsedCfg = parseExecConfig(evaluated.outcome);
        if (!parsedCfg) {
          execCache.set(key, null);
          return null;
        }
        const pct = parsedCfg.liquidity_cap_pct_adv;
        const cap =
          parsedCfg.liquidity_cap ??
          (pct == null || instrument == null
            ? undefined
            : liquidityCapShares(instrument.avg_volume, pct));
        const cfg: ExecConfig = {
          slippage_bps: parsedCfg.slippage_bps,
          liquidity_cap: cap,
          tick_size: instrument?.tick_size,
        };
        execCache.set(key, cfg);
        return cfg;
      } catch {
        execCache.set(key, null);
        return null;
      }
    };

    const configs = new Map<string, ExecConfig>();
    for (const order of working) {
      const cfg = await resolver(order);
      if (cfg) {
        configs.set(order.id, cfg);
      }
    }
    if (configs.size === 0) {
      continue;
    }

    const result = matchOrders(
      matchTick,
      working.filter((order) => configs.has(order.id)),
      (orderId) => configs.get(orderId) as ExecConfig,
    );

    for (const orderId of result.triggeredOrderIds) {
      const order = orders.find((row) => row.id === orderId);
      if (!order || order.stop_triggered) {
        continue;
      }
      order.stop_triggered = true;
      triggered += 1;
      await admin.database.from("orders").update({ stop_triggered: true }).eq("id", order.id);
    }

    for (const fill of result.fills) {
      const order = orders.find((row) => row.id === fill.order_id);
      if (!order) {
        continue;
      }
      const filledQty = order.filled_qty + fill.qty;
      const nextStatus: OrderStatus = filledQty >= order.qty ? "filled" : "partially_filled";
      if (!canTransition(order.status, nextStatus)) {
        continue;
      }
      assertTransition(order.status, nextStatus);
      const settled = applyFillToLedger(
        { cashBalance: 0, reservedCash: order.reserved_amount },
        order,
        fill,
      );
      const posKey = `${order.account_id}:${order.instrument_id}`;
      const currentPos = positions.get(posKey) ?? {
        account_id: order.account_id,
        instrument_id: order.instrument_id,
        symbol: order.symbol,
        ...emptyPosition(),
        avg_cost: 0,
        realized_pnl: 0,
      };
      const nextPos = applyFillToPosition(
        { qty: currentPos.qty, avgCost: currentPos.avg_cost, realizedPnl: currentPos.realized_pnl },
        fill,
      );
      const executionId = crypto.randomUUID();
      const applied = await admin.database.rpc("apply_paper_fill", {
        p_user_id: order.user_id,
        p_execution_id: executionId,
        p_order_id: order.id,
        p_qty: fill.qty,
        p_price: fill.price,
        p_order_status: nextStatus,
        p_filled_qty: filledQty,
        p_reserved_amount: settled.reservedRemaining,
        p_stop_triggered: order.stop_triggered,
        p_cash_delta: cashDeltaForFill(fill.side, fill.qty, fill.price),
        p_reserved_release: settled.reservedReleased,
        p_position_qty: nextPos.qty,
        p_position_avg_cost: nextPos.avgCost,
        p_position_realized_pnl: nextPos.realizedPnl,
      });
      if (applied.error) {
        return json(500, { error: applied.error.message });
      }
      const payload = applied.data;
      if (payload && typeof payload === "object" && "ok" in payload && payload.ok !== true) {
        continue;
      }

      order.filled_qty = filledQty;
      order.status = nextStatus;
      order.reserved_amount = settled.reservedRemaining;
      const storedPos: PositionRow = {
        account_id: order.account_id,
        instrument_id: order.instrument_id,
        symbol: order.symbol,
        qty: nextPos.qty,
        avg_cost: nextPos.avgCost,
        realized_pnl: nextPos.realizedPnl,
      };
      positions.set(posKey, storedPos);
      fillsApplied += 1;

      await admin.database.from("audit_log").insert([
        {
          user_id: order.user_id,
          action: "trade:fill",
          entity_type: "executions",
          entity_id: executionId,
          payload: {
            order_id: order.id,
            qty: fill.qty,
            price: fill.price,
            status: nextStatus,
          },
        },
      ]);
      await publishOrder(admin, order);
      await publishPosition(admin, order.user_id, storedPos);
    }
  }

  return json(
    200,
    matchingRunnerResponseSchema.parse({
      ticks: ticks.length,
      promoted,
      fills: fillsApplied,
      triggered,
    }),
  );
}
