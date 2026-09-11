"use server";

import { desProfileSchema, instrumentSchema, type DesProfile } from "@meridian/schemas";
import { rankIndustryPeers } from "@meridian/mock-data";
import { createRecordsClient } from "@/lib/api/client";
import { createFundamentalsRepository } from "@/lib/api/fundamentals";
import { createInstrumentsRepository } from "@/lib/api/instruments";
import { createQuotesLatestRepository } from "@/lib/api/quotes-latest";
import { isAuthStub } from "@/lib/auth/mode";
import { stubGetDesProfile } from "@/lib/auth/stub-store";
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

export async function getDesProfileAction(symbol: string): Promise<ActionResult<DesProfile>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const key = symbol.trim().toUpperCase();
  if (key.length === 0) {
    return { ok: false, message: "SYMBOL_REQUIRED" };
  }
  if (isAuthStub()) {
    const profile = stubGetDesProfile(key);
    if (!profile) {
      return { ok: false, message: "INSTRUMENT_NOT_FOUND" };
    }
    return { ok: true, data: desProfileSchema.parse(profile) };
  }
  const env = readPublicInsforgeEnv();
  const client = createRecordsClient({
    baseUrl: env.baseUrl,
    getAccessToken: () => session.token,
  });
  const instruments = createInstrumentsRepository(client);
  const fundamentals = createFundamentalsRepository(client);
  const quotes = createQuotesLatestRepository(client);
  try {
    const matches = await instruments.list({ symbol: key });
    const instrument = matches[0] ? instrumentSchema.parse(matches[0]) : null;
    if (!instrument) {
      return { ok: false, message: "INSTRUMENT_NOT_FOUND" };
    }
    const record = await fundamentals.getByInstrumentId(instrument.id);
    if (!record) {
      return { ok: false, message: "FUNDAMENTALS_NOT_FOUND" };
    }
    const quote = await quotes.getByInstrumentId(instrument.id);
    const industryPeers =
      instrument.industry !== null && instrument.industry.length > 0
        ? await instruments.list({ industry: instrument.industry })
        : [];
    const peerIds = industryPeers.map((row) => row.id);
    const peerFundamentals = await fundamentals.listByInstrumentIds(peerIds);
    const peerQuotes = await quotes.listByInstrumentIds(peerIds);
    const capById = new Map(
      peerFundamentals.map((row) => [
        row.instrument_id,
        row.metrics.valuation.market_cap_b ?? null,
      ]),
    );
    const lastById = new Map(peerQuotes.map((row) => [row.instrument_id, row.last]));
    const ranked = rankIndustryPeers(
      industryPeers.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        industry: row.industry,
        market_cap_band: row.market_cap_band,
        market_cap_b: capById.get(row.id) ?? null,
      })),
      instrument.symbol,
      6,
    );
    const profile = desProfileSchema.parse({
      instrument,
      quote,
      fundamentals: record,
      peers: ranked.map((row) => {
        const peer = industryPeers.find((item) => item.symbol === row.symbol);
        return {
          symbol: row.symbol,
          name: row.name,
          instrument_id: peer?.id ?? instrument.id,
          last: peer ? (lastById.get(peer.id) ?? null) : null,
          market_cap_b: row.market_cap_b,
        };
      }),
    });
    return { ok: true, data: profile };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "DES_UNAVAILABLE",
    };
  }
}
