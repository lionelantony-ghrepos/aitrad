import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ARCHITECTURE_PREVIEW_LOAD_RPS,
  ARCHITECTURE_REST_P95_MS,
  ARCHITECTURE_WORKSPACE_TTI_MS,
} from "@meridian/schemas";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

describe("TC-030-02 perf budgets", () => {
  it("k6 order preview script asserts p95 and 50 rps", () => {
    const script = readFileSync(path.join(repoRoot, "scripts/load/order-preview.k6.js"), "utf8");
    expect(script).toContain(String(ARCHITECTURE_PREVIEW_LOAD_RPS));
    expect(script).toContain(`p(95)<${ARCHITECTURE_REST_P95_MS}`);
    expect(script).toContain("/preview");
  });

  it("Lighthouse CI budget enforces workspace TTI", () => {
    const rc = readFileSync(path.join(repoRoot, "lighthouserc.cjs"), "utf8");
    expect(rc).toContain("/workspace");
    expect(rc).toContain(String(ARCHITECTURE_WORKSPACE_TTI_MS));
    expect(rc).toContain("interactive");
  });
});
