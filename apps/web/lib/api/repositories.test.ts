import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { auditLogSchema } from "@meridian/schemas";
import { createAccountsRepository } from "./accounts";
import { createRecordsClient } from "./client";
import { InsForgeApiError, eqFilter, recordTables } from "./rest";

const BASE_URL = "https://example.insforge.app";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ACCOUNT_A = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "22222222-2222-4222-8222-222222222222";

const accountA = {
  id: ACCOUNT_A,
  user_id: USER_A,
  cash_balance: "2500.5",
  currency: "USD",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const accountB = {
  id: ACCOUNT_B,
  user_id: USER_B,
  cash_balance: "99",
  currency: "USD",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

function bearerSubject(header: string | null): string | undefined {
  if (header === `Bearer ${USER_A}`) {
    return USER_A;
  }
  if (header === `Bearer ${USER_B}`) {
    return USER_B;
  }
  return undefined;
}

const server = setupServer(
  http.get(`${BASE_URL}/api/database/records/accounts`, ({ request }) => {
    const subject = bearerSubject(request.headers.get("authorization"));
    const idEq = new URL(request.url).searchParams.get("id");
    const visible = [accountA, accountB].filter((row) => row.user_id === subject);
    if (idEq) {
      const id = idEq.replace(/^eq\./, "");
      return HttpResponse.json(visible.filter((row) => row.id === id));
    }
    return HttpResponse.json(visible);
  }),
  http.patch(`${BASE_URL}/api/database/records/audit_log`, () => {
    return HttpResponse.json(
      { error: "APPEND_ONLY", message: "audit_log is append-only", statusCode: 400 },
      { status: 400 },
    );
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("TC-002-02 accounts repository RLS via REST", () => {
  it("returns only caller A's rows and nothing for B's account id", async () => {
    const repo = createAccountsRepository(
      createRecordsClient({
        baseUrl: BASE_URL,
        getAccessToken: () => USER_A,
      }),
    );

    const mine = await repo.listMine();
    expect(mine).toHaveLength(1);
    const own = mine[0];
    expect(own).toBeDefined();
    if (!own) {
      return;
    }
    expect(own.id).toBe(ACCOUNT_A);
    expect(own.cash_balance).toBe(2500.5);

    const foreign = await repo.getById(ACCOUNT_B);
    expect(foreign).toBeNull();
  });

  it("requests the eq filter URL for a foreign id", async () => {
    const seen: string[] = [];
    server.use(
      http.get(`${BASE_URL}/api/database/records/accounts`, ({ request }) => {
        seen.push(request.url);
        return HttpResponse.json([]);
      }),
    );

    const repo = createAccountsRepository(
      createRecordsClient({
        baseUrl: BASE_URL,
        getAccessToken: () => USER_A,
      }),
    );
    await repo.getById(ACCOUNT_B);
    expect(seen[0]).toBe(
      `${BASE_URL}/api/database/records/accounts?id=${encodeURIComponent(eqFilter(ACCOUNT_B))}`,
    );
  });
});

describe("TC-002-03 audit_log update is rejected", () => {
  it("raises when PATCH is issued against audit_log", async () => {
    const client = createRecordsClient({
      baseUrl: BASE_URL,
      getAccessToken: () => USER_A,
    });

    await expect(
      client.update(
        recordTables.audit_log,
        auditLogSchema,
        { id: eqFilter(ACCOUNT_A) },
        { action: "tamper" },
      ),
    ).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof InsForgeApiError &&
        error.message.includes("append-only") &&
        error.status === 400
      );
    });
  });
});
