import { describe, expect, it } from "vitest";
import { appendAuditChainRow, verifyAuditChain } from "./audit-chain";

describe("TC-029-01 tamper row in test DB → verify fails (AC-029-01)", () => {
  it("verifies a hash chain and detects payload tampering", () => {
    const first = appendAuditChainRow(null, {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      action: "trade:create",
      entity_type: "orders",
      entity_id: "22222222-2222-4222-8222-222222222222",
      payload: { status: "accepted" },
      created_at: "2026-09-14T10:00:00.000Z",
    });
    const second = appendAuditChainRow(first, {
      id: "33333333-3333-4333-8333-333333333333",
      user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      action: "trade:fill",
      entity_type: "executions",
      entity_id: "44444444-4444-4444-8444-444444444444",
      payload: { qty: 10 },
      created_at: "2026-09-14T10:01:00.000Z",
    });
    const db = [first, second];
    expect(verifyAuditChain(db).ok).toBe(true);

    const original = db[1];
    const firstRow = db[0];
    if (!original || !firstRow) {
      throw new Error("expected chained rows");
    }
    const tampered = {
      ...original,
      payload: { qty: 99 },
    };
    const failed = verifyAuditChain([firstRow, tampered]);
    expect(failed.ok).toBe(false);
    expect(failed.broken_id).toBe(second.id);
    expect(failed.reason).toBe("ROW_HASH_MISMATCH");
  });

  it("detects a broken prev_hash link", () => {
    const first = appendAuditChainRow(null, {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: null,
      action: "market-tick",
      entity_type: "quotes_latest",
      entity_id: null,
      payload: {},
      created_at: "2026-09-14T10:00:00.000Z",
    });
    const second = appendAuditChainRow(first, {
      id: "33333333-3333-4333-8333-333333333333",
      user_id: null,
      action: "news-ticker",
      entity_type: "news_items",
      entity_id: null,
      payload: {},
      created_at: "2026-09-14T10:05:00.000Z",
    });
    const broken = { ...second, prev_hash: "deadbeef" };
    const failed = verifyAuditChain([first, broken]);
    expect(failed.ok).toBe(false);
    expect(failed.reason).toBe("PREV_HASH_MISMATCH");
  });
});
