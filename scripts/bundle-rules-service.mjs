import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(
  path.join(root, "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/package.json"),
);
const { build } = require("esbuild");

await build({
  absWorkingDir: root,
  entryPoints: [path.join(root, "insforge/functions/rules-service-src.ts")],
  outfile: path.join(root, "insforge/functions/rules-service.ts"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "esnext",
  banner: { js: "// bundled from insforge/functions/rules-service-src.ts\n" },
  external: ["npm:@insforge/sdk"],
});
