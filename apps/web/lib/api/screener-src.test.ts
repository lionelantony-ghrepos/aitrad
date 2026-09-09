import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { screenerServiceUrl } from "./screener";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(path.join(here, "../../../../insforge/functions/screener-src.ts"), "utf8");

describe("screenerServiceUrl", () => {
  it("builds the screener function path", () => {
    expect(screenerServiceUrl("https://app.insforge.app/")).toBe(
      "https://app.insforge.app/functions/screener",
    );
  });
});

describe("screener edge function orchestration", () => {
  it("authorizes, compiles parameterized SQL, and executes via exec_screener", () => {
    expect(src).toContain('authorize({ userId, action: "screener:run" })');
    expect(src).toContain("compileScreenerSql");
    expect(src).toContain('admin.database.rpc("exec_screener"');
    expect(src).toContain("p_params: compiled.params");
    expect(src).toContain("audit_log");
    expect(src).toContain('action: "screener:run"');
    expect(src).not.toContain("${criteria");
  });
});
