import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { analyticsServiceUrl } from "./analytics-service";

const analyticsSrc = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/functions/analytics-service-src.ts",
  ),
  "utf8",
);

describe("analyticsServiceUrl", () => {
  it("builds portfolio and snapshot paths", () => {
    expect(analyticsServiceUrl("https://app.insforge.app/", "portfolio")).toBe(
      "https://app.insforge.app/functions/analytics-service/portfolio",
    );
    expect(analyticsServiceUrl("https://app.insforge.app", "snapshot")).toBe(
      "https://app.insforge.app/functions/analytics-service/snapshot",
    );
  });
});

describe("analytics-service orchestration", () => {
  it("joins quotes, authorizes portfolio:read, and writes snapshots with audit", () => {
    expect(analyticsSrc).toContain('from("quotes_latest")');
    expect(analyticsSrc).toContain("assemblePortfolio");
    expect(analyticsSrc).toContain('authorize({ userId, action: "portfolio:read" })');
    expect(analyticsSrc).toContain('from("portfolio_snapshots")');
    expect(analyticsSrc).toContain('action: "portfolio:snapshot"');
    expect(analyticsSrc).toContain("dailySnapshotDate");
    expect(analyticsSrc).toContain("audit_log");
  });
});
