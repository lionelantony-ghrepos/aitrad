import { describe, expect, it } from "vitest";
import { rewriteInsforgeWorkerBundle } from "../../../../scripts/insforge-worker-rewrite.mjs";

describe("InsForge worker bundle rewrite", () => {
  it("strips ESM import/export and assigns module.exports", () => {
    const raw = `import { createAdminClient } from "npm:@insforge/sdk";
async function handler(req) { return createAdminClient({}); }
export {
  handler as default
};
`;
    const out = rewriteInsforgeWorkerBundle(raw);
    expect(out).not.toContain("import ");
    expect(out).not.toContain("export {");
    expect(out).toContain("function createAdminClient");
    expect(out).toContain("module.exports = handler");
  });

  it("rewrites export default async function handlers", () => {
    const raw = `import { createClient } from "npm:@insforge/sdk";
export default async function (req) {
  return createClient({});
}
`;
    const out = rewriteInsforgeWorkerBundle(raw);
    expect(out).not.toContain("import ");
    expect(out).not.toContain("export default");
    expect(out).toContain("async function __insforgeHandler");
    expect(out).toContain("module.exports = __insforgeHandler");
  });
});
