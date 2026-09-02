import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isEmptyOrTbd,
  padPbi,
  pbisFromCommitMessages,
  REQUIRED_HEADINGS,
  validateAsBuilt,
} from "./check-kb.mjs";

describe("check-kb", () => {
  it("parses feat(PBI-N) commit subjects", () => {
    assert.deepEqual(
      pbisFromCommitMessages("feat(PBI-001): scaffold\nfeat(PBI-2): baseline\nchore: docs"),
      ["001", "002"],
    );
  });

  it("pads PBI ids", () => {
    assert.equal(padPbi("7"), "007");
  });

  it("rejects missing headings and TBD bodies", () => {
    const md = REQUIRED_HEADINGS.map((h) => `## ${h}\n\nTBD\n`).join("\n");
    const errors = validateAsBuilt(md, "x.md");
    assert.ok(errors.some((e) => e.includes("TBD")));
  });

  it("accepts a filled skeleton", () => {
    const md = REQUIRED_HEADINGS.map((h) => `## ${h}\n\nFilled content for ${h}.\n`).join("\n");
    assert.deepEqual(validateAsBuilt(md, "x.md"), []);
  });

  it("treats blank and TBD as empty", () => {
    assert.equal(isEmptyOrTbd(""), true);
    assert.equal(isEmptyOrTbd("TBD"), true);
    assert.equal(isEmptyOrTbd("- TBD"), true);
    assert.equal(isEmptyOrTbd("Migrations: 0001_core-baseline.sql"), false);
  });
});
