/**
 * Apply the committed Yahoo-shaped snapshot to a seeded InsForge DB (offline).
 * Pass --live to fetch Yahoo and apply without rewriting fixtures (not CI).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applySnapshot,
  captureSnapshot,
  isSnapshotCaptured,
  loadAdmin,
  loadInstrumentUniverse,
  readSnapshot,
  snapshotDir,
} from "./lib/live-market.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function log(line) {
  process.stdout.write(`${line}\n`);
}

async function main() {
  const live = process.argv.includes("--live");
  let snapshot;
  if (live) {
    log("overlay: LIVE Yahoo fetch (not for CI / seed:all)");
    const universe = loadInstrumentUniverse(repoRoot);
    snapshot = await captureSnapshot({ universe, log });
    if (!isSnapshotCaptured(snapshot.manifest)) {
      process.stderr.write("overlay: live Yahoo returned no quotes\n");
      process.exit(2);
    }
  } else {
    snapshot = readSnapshot(snapshotDir(repoRoot));
    if (!isSnapshotCaptured(snapshot.manifest)) {
      log("overlay: frozen snapshot not captured; skipping (GBM seed unchanged)");
      process.exit(0);
    }
    log(`overlay: applying frozen snapshot asOfUtc=${snapshot.manifest.asOfUtc} (offline)`);
  }

  const admin = loadAdmin(repoRoot);
  log(`overlay: targeting ${admin.url}`);
  await applySnapshot(admin, snapshot, { log });
  log("overlay: done");
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : err}\n`);
  process.exit(1);
});
