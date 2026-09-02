import { describe, expect, it } from "vitest";
import { functionsUrl } from "./functions";

describe("functionsUrl", () => {
  it("builds the compat invoke path", () => {
    expect(functionsUrl("https://app.insforge.app/", "provision-account")).toBe(
      "https://app.insforge.app/functions/provision-account",
    );
  });
});
