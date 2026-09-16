import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminClient } from "@insforge/sdk";
import { seedEnvSchema, type DemoPortfolioRecord, type DemoUserRecord } from "@meridian/schemas";
import { parseDemoUsersJson, traderPortfolio } from "@meridian/mock-data";
import { paperAccountSeed } from "../packages/rules-engine/src/index.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type AdminClient = ReturnType<typeof createAdminClient>;
type AdminDatabase = AdminClient["database"];

const authUserSchema = {
  parseId(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const rec = payload as Record<string, unknown>;
    const nested = rec.user;
    if (nested && typeof nested === "object" && "id" in nested && typeof nested.id === "string") {
      return nested.id;
    }
    if (typeof rec.id === "string") {
      return rec.id;
    }
    if (typeof rec.userId === "string") {
      return rec.userId;
    }
    return null;
  },
};

async function must<T>(
  label: string,
  result: { data: T; error: { message: string } | null },
): Promise<T> {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function createOrFindUser(
  origin: string,
  apiKey: string,
  user: DemoUserRecord,
): Promise<string> {
  const created = await fetch(`${origin}/api/auth/users?client_type=server`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      name: user.display_name,
    }),
  });
  const body = (await created.json().catch(() => null)) as unknown;
  if (created.ok) {
    const id = authUserSchema.parseId(body);
    if (!id) {
      throw new Error(`DEMO_USER_ID_MISSING:${user.email}`);
    }
    return id;
  }
  const listed = await fetch(
    `${origin}/api/auth/users?limit=100&search=${encodeURIComponent(user.email)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  const listBody = (await listed.json().catch(() => null)) as unknown;
  const rows = extractUserRows(listBody);
  const match = rows.find((row) => row.email?.toLowerCase() === user.email.toLowerCase());
  if (!match?.id) {
    throw new Error(`DEMO_USER_LOOKUP:${user.email}:${created.status}`);
  }
  return match.id;
}

function extractUserRows(payload: unknown): Array<{ id: string; email?: string }> {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const rec = payload as Record<string, unknown>;
  const candidates = [rec.users, rec.data, rec.items, rec];
  for (const candidate of candidates) {
    const list = Array.isArray(candidate)
      ? candidate
      : candidate && typeof candidate === "object" && "users" in candidate
        ? (candidate as { users: unknown }).users
        : null;
    if (!Array.isArray(list)) {
      continue;
    }
    return list.flatMap((row) => {
      if (!row || typeof row !== "object") {
        return [];
      }
      const item = row as Record<string, unknown>;
      const id = typeof item.id === "string" ? item.id : null;
      const email = typeof item.email === "string" ? item.email : undefined;
      return id ? [{ id, email }] : [];
    });
  }
  return [];
}

async function upsertProfile(
  db: AdminDatabase,
  userId: string,
  user: DemoUserRecord,
): Promise<void> {
  const existing = await must(
    `profiles ${user.email}`,
    await db.from("profiles").select("id").eq("user_id", userId),
  );
  const payload = {
    user_id: userId,
    display_name: user.display_name,
    persona: user.role,
    experience_level: user.experience_level,
    ...(user.objectives ? { objectives: user.objectives } : {}),
  };
  if (Array.isArray(existing) && existing.length > 0) {
    const update = await db.from("profiles").update(payload).eq("user_id", userId);
    if (update.error) {
      throw new Error(`profiles update ${user.email}: ${update.error.message}`);
    }
    return;
  }
  const insert = await db.from("profiles").insert([payload]);
  if (insert.error) {
    throw new Error(`profiles insert ${user.email}: ${insert.error.message}`);
  }
}

async function upsertRole(db: AdminDatabase, userId: string, role: DemoUserRecord["role"]) {
  const existing = await must(
    "user_roles select",
    await db.from("user_roles").select("user_id").eq("user_id", userId),
  );
  if (Array.isArray(existing) && existing.length > 0) {
    const update = await db.from("user_roles").update({ role }).eq("user_id", userId);
    if (update.error) {
      throw new Error(`user_roles update: ${update.error.message}`);
    }
    return;
  }
  const insert = await db.from("user_roles").insert([{ user_id: userId, role }]);
  if (insert.error) {
    throw new Error(`user_roles insert: ${insert.error.message}`);
  }
}

async function upsertAccount(db: AdminDatabase, userId: string, cash: number): Promise<string> {
  const existing = await must(
    "accounts select",
    await db.from("accounts").select("id").eq("user_id", userId),
  );
  const found = Array.isArray(existing) ? (existing[0] as { id?: string } | undefined) : undefined;
  if (found?.id) {
    const update = await db
      .from("accounts")
      .update({ cash_balance: cash, reserved_cash: 0, currency: "USD" })
      .eq("id", found.id);
    if (update.error) {
      throw new Error(`accounts update: ${update.error.message}`);
    }
    return found.id;
  }
  const insert = await db
    .from("accounts")
    .insert([{ user_id: userId, cash_balance: cash, reserved_cash: 0, currency: "USD" }]);
  if (insert.error) {
    throw new Error(`accounts insert: ${insert.error.message}`);
  }
  const reloaded = await must(
    "accounts reload",
    await db.from("accounts").select("id").eq("user_id", userId),
  );
  const id = Array.isArray(reloaded) ? (reloaded[0] as { id?: string } | undefined)?.id : undefined;
  if (!id) {
    throw new Error("ACCOUNT_ID_MISSING");
  }
  return id;
}

async function seedTraderBook(
  db: AdminDatabase,
  userId: string,
  accountId: string,
  portfolio: DemoPortfolioRecord,
): Promise<void> {
  const instruments = await must(
    "instruments symbols",
    await db.from("instruments").select("id, symbol"),
  );
  const idBySymbol = new Map<string, string>();
  for (const row of (instruments ?? []) as Array<{ id: string; symbol: string }>) {
    idBySymbol.set(row.symbol, row.id);
  }

  for (const position of portfolio.positions) {
    const instrumentId = idBySymbol.get(position.symbol);
    if (!instrumentId) {
      throw new Error(`MISSING_INSTRUMENT:${position.symbol}`);
    }
    const existingPos = await must(
      `positions ${position.symbol}`,
      await db
        .from("positions")
        .select("id")
        .eq("account_id", accountId)
        .eq("instrument_id", instrumentId),
    );
    const posPayload = {
      user_id: userId,
      account_id: accountId,
      instrument_id: instrumentId,
      symbol: position.symbol,
      qty: position.qty,
      avg_cost: position.avg_cost,
      realized_pnl: 0,
    };
    if (Array.isArray(existingPos) && existingPos.length > 0) {
      const update = await db
        .from("positions")
        .update(posPayload)
        .eq("account_id", accountId)
        .eq("instrument_id", instrumentId);
      if (update.error) {
        throw new Error(`positions update ${position.symbol}: ${update.error.message}`);
      }
    } else {
      const insert = await db.from("positions").insert([posPayload]);
      if (insert.error) {
        throw new Error(`positions insert ${position.symbol}: ${insert.error.message}`);
      }
    }

    const existingOrders = await must(
      `orders ${position.symbol}`,
      await db
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("instrument_id", instrumentId)
        .eq("status", "filled"),
    );
    if (Array.isArray(existingOrders) && existingOrders.length > 0) {
      continue;
    }
    const orderInsert = await db.from("orders").insert([
      {
        user_id: userId,
        account_id: accountId,
        instrument_id: instrumentId,
        symbol: position.symbol,
        side: "buy",
        qty: position.qty,
        filled_qty: position.qty,
        order_type: "market",
        tif: "DAY",
        status: "filled",
      },
    ]);
    if (orderInsert.error) {
      throw new Error(`orders insert ${position.symbol}: ${orderInsert.error.message}`);
    }
    const orders = await must(
      `orders reload ${position.symbol}`,
      await db
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("instrument_id", instrumentId)
        .eq("status", "filled"),
    );
    const orderId = Array.isArray(orders)
      ? (orders[0] as { id?: string } | undefined)?.id
      : undefined;
    if (!orderId) {
      throw new Error(`ORDER_ID_MISSING:${position.symbol}`);
    }
    const execInsert = await db.from("executions").insert([
      {
        order_id: orderId,
        user_id: userId,
        account_id: accountId,
        instrument_id: instrumentId,
        symbol: position.symbol,
        side: "buy",
        qty: position.qty,
        price: position.avg_cost,
      },
    ]);
    if (execInsert.error) {
      throw new Error(`executions insert ${position.symbol}: ${execInsert.error.message}`);
    }
  }

  for (const [name, symbols] of Object.entries(portfolio.watchlists)) {
    const existingLists = await must(
      `watchlists ${name}`,
      await db.from("watchlists").select("id").eq("user_id", userId).eq("name", name),
    );
    let watchlistId = Array.isArray(existingLists)
      ? (existingLists[0] as { id?: string } | undefined)?.id
      : undefined;
    if (!watchlistId) {
      const insert = await db.from("watchlists").insert([{ user_id: userId, name }]);
      if (insert.error) {
        throw new Error(`watchlists insert ${name}: ${insert.error.message}`);
      }
      const reloaded = await must(
        `watchlists reload ${name}`,
        await db.from("watchlists").select("id").eq("user_id", userId).eq("name", name),
      );
      watchlistId = Array.isArray(reloaded)
        ? (reloaded[0] as { id?: string } | undefined)?.id
        : undefined;
    }
    if (!watchlistId) {
      throw new Error(`WATCHLIST_ID_MISSING:${name}`);
    }
    for (let i = 0; i < symbols.length; i += 1) {
      const symbol = symbols[i];
      if (!symbol) {
        continue;
      }
      const instrumentId = idBySymbol.get(symbol);
      if (!instrumentId) {
        throw new Error(`MISSING_INSTRUMENT:${symbol}`);
      }
      const existingItem = await must(
        `watchlist_items ${name} ${symbol}`,
        await db
          .from("watchlist_items")
          .select("id")
          .eq("watchlist_id", watchlistId)
          .eq("instrument_id", instrumentId),
      );
      if (Array.isArray(existingItem) && existingItem.length > 0) {
        continue;
      }
      const itemInsert = await db
        .from("watchlist_items")
        .insert([{ watchlist_id: watchlistId, instrument_id: instrumentId, sort_order: i }]);
      if (itemInsert.error) {
        throw new Error(`watchlist_items insert ${symbol}: ${itemInsert.error.message}`);
      }
    }
  }
}

export async function enableFeedTestMode(db: AdminDatabase): Promise<void> {
  const flags: Array<{ key: string; value: unknown }> = [
    { key: "feed.paused", value: true },
    { key: "feed.speed", value: 1 },
  ];
  for (const flag of flags) {
    const existing = await must(
      `feature_flags ${flag.key}`,
      await db.from("feature_flags").select("id").eq("key", flag.key).is("user_id", null),
    );
    if (Array.isArray(existing) && existing.length > 0) {
      const update = await db
        .from("feature_flags")
        .update({ value: flag.value })
        .eq("key", flag.key)
        .is("user_id", null);
      if (update.error) {
        throw new Error(`feature_flags update ${flag.key}: ${update.error.message}`);
      }
    } else {
      const insert = await db
        .from("feature_flags")
        .insert([{ key: flag.key, value: flag.value, user_id: null }]);
      if (insert.error) {
        throw new Error(`feature_flags insert ${flag.key}: ${insert.error.message}`);
      }
    }
  }
}

export async function runDemoUserSeed(): Promise<void> {
  const env = seedEnvSchema.parse({
    INSFORGE_URL: process.env.INSFORGE_URL,
    INSFORGE_API_KEY: process.env.INSFORGE_API_KEY,
  });
  const origin = env.INSFORGE_URL.replace(/\/+$/, "");
  const admin = createAdminClient({
    baseUrl: env.INSFORGE_URL,
    apiKey: env.INSFORGE_API_KEY,
  });
  const fixture = parseDemoUsersJson(
    JSON.parse(
      readFileSync(path.join(repoRoot, "mock_data", "demo-users.json"), "utf8"),
    ) as unknown,
  );
  const ids = new Map<string, string>();
  for (const user of fixture.users) {
    process.stdout.write(`Demo user ${user.email}…\n`);
    const id = await createOrFindUser(origin, env.INSFORGE_API_KEY, user);
    ids.set(user.email, id);
    await upsertProfile(admin.database, id, user);
    await upsertRole(admin.database, id, user.role);
    const portfolio = fixture.portfolios[user.email];
    const cash = portfolio?.cash ?? paperAccountSeed().cashBalance;
    const accountId = await upsertAccount(admin.database, id, cash);
    if (user.email === traderPortfolio(fixture).trader.email) {
      await seedTraderBook(admin.database, id, accountId, traderPortfolio(fixture).portfolio);
    }
  }
  await enableFeedTestMode(admin.database);
  process.stdout.write(`Seeded ${ids.size} demo users; feed.paused=true (test mode).\n`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  runDemoUserSeed().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
