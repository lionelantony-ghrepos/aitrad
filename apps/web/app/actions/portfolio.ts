"use server";

import { authorizeUser } from "@/lib/auth/authorize-user";
import {
  assemblePortfolio,
  equityCurveRangeSchema,
  filterEquityCurve,
  portfolioResponseSchema,
  type EquityCurveRange,
  type PortfolioResponse,
} from "@meridian/schemas";
import { createAccountsRepository } from "@/lib/api/accounts";
import { invokeAnalyticsPortfolio } from "@/lib/api/analytics-service";
import { createRecordsClient } from "@/lib/api/client";
import { createInstrumentsRepository } from "@/lib/api/instruments";
import { createPortfolioSnapshotsRepository, createPositionsRepository } from "@/lib/api/positions";
import { createQuotesLatestRepository } from "@/lib/api/quotes-latest";
import { isAuthStub } from "@/lib/auth/mode";
import {
  stubInstrumentBySymbol,
  stubListPositions,
  stubListSnapshots,
  stubLoadProvision,
  stubQuotesFor,
} from "@/lib/auth/stub-store";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; message: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

async function requireUser(): Promise<
  { ok: true; userId: string; token: string } | { ok: false; message: string }
> {
  const user = await getSessionUser();
  const token = await getAccessToken();
  if (!user || !token) {
    return { ok: false, message: "You must be signed in." };
  }
  return { ok: true, userId: user.id, token };
}

export async function getPortfolioAction(
  range: EquityCurveRange = "1Y",
): Promise<ActionResult<PortfolioResponse>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    action: "portfolio:read",
    token: session.token,
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  const parsedRange = equityCurveRangeSchema.parse(range);
  if (isAuthStub()) {
    const provision = stubLoadProvision(session.userId);
    if (!provision.account) {
      return { ok: false, message: "Account unavailable." };
    }
    const positions = stubListPositions(session.userId);
    const quotes = stubQuotesFor(positions.map((row) => row.instrument_id));
    const quoteById = new Map(quotes.map((row) => [row.instrument_id, row]));
    const view = assemblePortfolio({
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
      snapshots: filterEquityCurve(stubListSnapshots(session.userId), parsedRange, new Date()),
    });
    return { ok: true, data: portfolioResponseSchema.parse(view) };
  }
  const env = readPublicInsforgeEnv();
  try {
    const data = await assemblePortfolioFromRecords({
      baseUrl: env.baseUrl,
      accessToken: session.token,
      range: parsedRange,
    });
    return { ok: true, data };
  } catch (recordsError) {
    try {
      const data = await invokeAnalyticsPortfolio({
        baseUrl: env.baseUrl,
        accessToken: session.token,
        request: { op: "portfolio", range: parsedRange },
      });
      return { ok: true, data };
    } catch {
      return {
        ok: false,
        message: recordsError instanceof Error ? recordsError.message : "Portfolio load failed.",
      };
    }
  }
}

async function assemblePortfolioFromRecords(input: {
  baseUrl: string;
  accessToken: string;
  range: EquityCurveRange;
}): Promise<PortfolioResponse> {
  const client = createRecordsClient({
    baseUrl: input.baseUrl,
    getAccessToken: () => input.accessToken,
  });
  const accounts = await createAccountsRepository(client).listMine();
  const account = accounts[0];
  if (!account) {
    throw new Error("Account unavailable.");
  }
  const positions = await createPositionsRepository(client).listMine();
  const quotes = await createQuotesLatestRepository(client)
    .listByInstrumentIds(positions.map((row) => row.instrument_id))
    .catch(() => []);
  const quoteById = new Map(quotes.map((row) => [row.instrument_id, row]));
  const instrumentsRepo = createInstrumentsRepository(client);
  const instruments = await Promise.all(
    [...new Set(positions.map((row) => row.instrument_id))].map((id) =>
      instrumentsRepo.getById(id).catch(() => null),
    ),
  );
  const sectorById = new Map(
    instruments
      .filter((row): row is NonNullable<(typeof instruments)[number]> => row !== null)
      .map((row) => [row.id, row.sector ?? null]),
  );
  const snapshots = await createPortfolioSnapshotsRepository(client)
    .listMine()
    .catch(() => []);
  return portfolioResponseSchema.parse(
    assemblePortfolio({
      account: {
        id: account.id,
        cash: account.cash_balance,
        reserved_cash: account.reserved_cash ?? 0,
        currency: account.currency,
      },
      positions: positions.map((row) => {
        const quote = quoteById.get(row.instrument_id);
        return {
          id: row.id,
          instrument_id: row.instrument_id,
          symbol: row.symbol,
          sector: sectorById.get(row.instrument_id) ?? null,
          qty: row.qty,
          avg_cost: row.avg_cost,
          realized_pnl: row.realized_pnl,
          last: quote?.last ?? 0,
          prev_close: quote?.prev_close ?? 0,
        };
      }),
      snapshots: filterEquityCurve(snapshots, input.range, new Date()),
    }),
  );
}
