import { describe, expect, it } from "vitest";
import { authorize } from "./authorize";

describe("authorize", () => {
  it("denies missing callers and allows authenticated actions", () => {
    expect(authorize({ userId: null, action: "provision-account" }).allowed).toBe(false);
    expect(
      authorize({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", action: "provision-account" })
        .allowed,
    ).toBe(true);
  });
});
