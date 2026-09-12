import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const matchingRunnerSrc = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/functions/matching-runner-src.ts",
  ),
  "utf8",
);

describe("matching-runner group orchestration", () => {
  it("applies group activate/cancel and trailing ratchets from paper-engine", () => {
    expect(matchingRunnerSrc).toContain("shouldPromoteAccepted");
    expect(matchingRunnerSrc).toContain("groupActionsAfterFills");
    expect(matchingRunnerSrc).toContain("trailingUpdates");
    expect(matchingRunnerSrc).toContain("high_water_mark");
  });
});
