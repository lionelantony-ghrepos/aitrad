"use server";

import { authorizeUser } from "@/lib/auth/authorize-user";
import {
  newsItemSchema,
  newsSearchRequestSchema,
  type NewsItem,
  type NewsSearchHit,
} from "@meridian/schemas";
import { createRecordsClient } from "@/lib/api/client";
import { createNewsItemsRepository } from "@/lib/api/news-items";
import { invokeSearchNews } from "@/lib/api/search-news";
import { isAuthStub } from "@/lib/auth/mode";
import { stubListNews, stubSearchNews } from "@/lib/auth/stub-store";
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

export async function listNewsAction(symbol?: string): Promise<ActionResult<NewsItem[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListNews() };
  }
  const env = readPublicInsforgeEnv();
  const repo = createNewsItemsRepository(
    createRecordsClient({
      baseUrl: env.baseUrl,
      getAccessToken: () => session.token,
    }),
  );
  try {
    const rows = await repo.list({ symbol });
    return { ok: true, data: zArray(rows) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "NEWS_UNAVAILABLE" };
  }
}

function zArray(rows: NewsItem[]): NewsItem[] {
  return newsItemSchema.array().parse(rows);
}

export async function searchNewsAction(input: unknown): Promise<ActionResult<NewsSearchHit[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "news:search",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  const parsed = newsSearchRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid search." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubSearchNews(parsed.data) };
  }
  const env = readPublicInsforgeEnv();
  try {
    const result = await invokeSearchNews({
      baseUrl: env.baseUrl,
      accessToken: session.token,
      request: parsed.data,
    });
    return { ok: true, data: result.items };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "SEARCH_UNAVAILABLE",
    };
  }
}
