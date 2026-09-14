import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const fnDir = path.join(repoRoot, "insforge/functions");

describe("edge function structured logging", () => {
  it("wraps every *-src and provision-account with withFunctionLog", () => {
    const names = readdirSync(fnDir).filter(
      (name) => name.endsWith("-src.ts") || name === "provision-account.ts",
    );
    expect(names.length).toBeGreaterThan(10);
    for (const name of names) {
      const text = readFileSync(path.join(fnDir, name), "utf8");
      expect(text, name).toContain("withFunctionLog(");
      expect(text, name).toContain("./_shared/logger.ts");
    }
    const logger = readFileSync(path.join(fnDir, "_shared/logger.ts"), "utf8");
    expect(logger).toContain("request_id");
    expect(logger).toContain("latency_ms");
    expect(logger).toContain("outcome");
  });
});
