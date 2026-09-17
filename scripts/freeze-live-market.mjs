/**
 * Capture Yahoo-shaped quotes/bars/52w ranges + original news summaries
 * into mock_data/market-snapshot/. Live HTTP. Not used by seed:all / CI.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  captureSnapshot,
  isSnapshotCaptured,
  loadInstrumentUniverse,
  snapshotDir,
  writeSnapshot,
} from "./lib/live-market.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const universe = loadInstrumentUniverse(repoRoot);
  process.stdout.write(`freeze: capturing ${universe.length} instruments from Yahoo (live)\n`);
  const snapshot = await captureSnapshot({
    universe,
    log: (line) => process.stdout.write(`${line}\n`),
  });
  const dir = snapshotDir(repoRoot);
  writeSnapshot(dir, snapshot);
  const m = snapshot.manifest;
  process.stdout.write(
    `freeze: status=${m.status} asOfUtc=${m.asOfUtc} quotes=${m.counts.quotes} daily=${m.counts.dailyBars} minute=${m.counts.minuteBars} news=${m.counts.news} failed=${m.failedSymbols.length}\n`,
  );
  process.stdout.write(`freeze: wrote ${dir}\n`);
  if (!isSnapshotCaptured(m)) {
    process.stderr.write(
      "freeze: no quotes captured — SOURCE.md has the lja TODO. Do not invent Yahoo prices.\n",
    );
    process.exit(2);
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : err}\n`);
  process.exit(1);
});
