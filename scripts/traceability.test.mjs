import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  collectTaggedIds,
  missingP0Tags,
  missingRegressionE2eTags,
  parseP0TestIds,
  REQUIRED_REGRESSION_E2E,
} from "./traceability.mjs";
import { parseVerifyAuditChainRows } from "./verify-audit-parse.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("traceability @TC-031-01", () => {
  it("extracts P0 TC ids from the test plan table", () => {
    const md = `
| TC-004-01 | signup | P0 | ☑ |
| TC-004-03 | oauth | P1 | ☐ |
| TC-031-01 | gate | P0 | ☐ |
`;
    assert.deepEqual(parseP0TestIds(md), ["TC-004-01", "TC-031-01"]);
  });

  it("reports P0 ids without a matching @TC tag", () => {
    const plan = "| TC-099-01 | missing | P0 | ☐ |\n";
    const tagged = collectTaggedIds("test @TC-001-01 and TC-031-01");
    assert.deepEqual(missingP0Tags(plan, tagged), ["TC-099-01"]);
  });

  it("requires Path A e2e TCs in apps/web/e2e/regression", () => {
    assert.ok(REQUIRED_REGRESSION_E2E.includes("TC-003-01"));
    assert.ok(REQUIRED_REGRESSION_E2E.includes("TC-019-01"));
    assert.ok(REQUIRED_REGRESSION_E2E.includes("TC-020-01"));
    assert.ok(REQUIRED_REGRESSION_E2E.includes("TC-023-02"));
    assert.ok(REQUIRED_REGRESSION_E2E.includes("TC-024-01"));
    assert.ok(REQUIRED_REGRESSION_E2E.includes("TC-026-02"));
    const tagged = collectTaggedIds("@TC-004-01 @TC-026-01");
    const missing = missingRegressionE2eTags(tagged);
    assert.ok(missing.includes("TC-003-01"));
    assert.ok(missing.includes("TC-026-02"));
    assert.ok(!missing.includes("TC-004-01"));
  });
});

describe("verify_audit_chain parser @TC-029-01", () => {
  it("reads the RPC row", () => {
    const result = parseVerifyAuditChainRows({
      rows: [{ ok: true, checked: 12, reason: null }],
    });
    assert.equal(result.ok, true);
    assert.equal(result.checked, 12);
  });
});

describe("RELEASE.md runbook @TC-031-02", () => {
  it("lists migrate → seed → verify_audit_chain → e2e → tag in order", () => {
    const md = fs.readFileSync(path.join(repoRoot, "RELEASE.md"), "utf8");
    const headings = [
      "## 1. migrate",
      "## 2. seed",
      "## 3. verify_audit_chain",
      "## 4. e2e",
      "## 5. tag",
    ];
    let last = -1;
    for (const heading of headings) {
      const idx = md.indexOf(heading);
      assert.ok(idx > last, heading);
      last = idx;
    }
  });
});
