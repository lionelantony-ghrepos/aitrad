import { describe, expect, it } from "vitest";
import { workspaceLayoutV1Schema } from "./workspace-layout";

describe("workspaceLayoutV1Schema", () => {
  it("accepts a version-1 payload with a dockview object", () => {
    const parsed = workspaceLayoutV1Schema.parse({
      version: 1,
      dockview: { grid: { root: { type: "branch" } }, panels: {} },
    });
    expect(parsed.version).toBe(1);
    expect(parsed.dockview["grid"]).toEqual({ root: { type: "branch" } });
  });

  it("accepts an optional selectedWatchlistId", () => {
    expect(
      workspaceLayoutV1Schema.parse({
        version: 1,
        dockview: {},
        selectedWatchlistId: "11111111-1111-4111-8111-111111111111",
      }).selectedWatchlistId,
    ).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("rejects an unversioned or wrong-version payload", () => {
    expect(workspaceLayoutV1Schema.safeParse({ dockview: {} }).success).toBe(false);
    expect(workspaceLayoutV1Schema.safeParse({ version: 2, dockview: {} }).success).toBe(false);
  });

  it("rejects a non-object dockview blob", () => {
    expect(workspaceLayoutV1Schema.safeParse({ version: 1, dockview: "nope" }).success).toBe(false);
  });
});
