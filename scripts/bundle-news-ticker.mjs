import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(
  path.join(root, "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/package.json"),
);
const { build } = require("esbuild");
const { rewriteInsforgeWorkerBundle } = await import("./insforge-worker-rewrite.mjs");
const fs = await import("node:fs");

await build({
  absWorkingDir: root,
  entryPoints: [path.join(root, "insforge/functions/news-ticker-src.ts")],
  outfile: path.join(root, "insforge/functions/news-ticker.ts"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "esnext",
  loader: { ".json": "json" },
  banner: { js: "// insforge/functions/news-ticker-src.ts\n" },
  external: ["npm:@insforge/sdk"],
});

const outfile = path.join(root, "insforge/functions/news-ticker.ts");
fs.writeFileSync(outfile, rewriteInsforgeWorkerBundle(fs.readFileSync(outfile, "utf8")));
