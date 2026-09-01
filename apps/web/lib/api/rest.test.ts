import { describe, expect, it } from "vitest";
import { eqFilter, recordsUrl, recordTables, RECORDS_PATH } from "./rest";

describe("InsForge records URL construction", () => {
  it("builds the documented records path", () => {
    expect(
      recordsUrl({
        baseUrl: "https://example.insforge.app/",
        table: recordTables.accounts,
      }),
    ).toBe(`https://example.insforge.app${RECORDS_PATH}/accounts`);
  });

  it("encodes PostgREST eq filters as query params", () => {
    const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const url = recordsUrl({
      baseUrl: "https://example.insforge.app",
      table: recordTables.accounts,
      query: { id: eqFilter(userB), limit: 1 },
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("id")).toBe(`eq.${userB}`);
    expect(parsed.searchParams.get("limit")).toBe("1");
  });
});
