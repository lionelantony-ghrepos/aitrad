import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { briefServiceUrl } from "./briefs";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/brief-service-src.ts"),
  "utf8",
);

describe("brief-service source", () => {
  it("authorizes generate, evaluates portfolio_analysis, and exports PDF", () => {
    expect(briefServiceUrl("https://app.insforge.app")).toBe(
      "https://app.insforge.app/functions/brief-service",
    );
    expect(src).toContain('action: "copilot:chat"');
    expect(src).toContain("authorizeEdgeUser");
    expect(src).toContain("assemblePortfolio");
    expect(src).toContain('domain: "portfolio_analysis"');
    expect(src).toContain("generateBriefMarkdown");
    expect(src).toContain("renderBriefPdf");
    expect(src).toContain('action: "briefs:generate"');
    expect(src).toContain('action: "briefs:export"');
    expect(src).toContain('op === "cron"');
    expect(src).toContain("morning_brief_opt_in");
    expect(src).toContain("search-news");
    expect(src).not.toContain("docs/kb");
  });
});
