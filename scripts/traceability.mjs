#!/usr/bin/env node
/**
 * Grep @TC-nnn-xx tags against docs/04 P0 rows (PBI-031 release gate).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseP0TestIds(markdown) {
  const ids = [];
  for (const line of markdown.split("\n")) {
    const match = /^\|\s*(TC-\d{3}-\d{2})\s*\|.+\|\s*P0\s*\|/.exec(line);
    if (match) {
      ids.push(match[1]);
    }
  }
  return ids;
}

export function collectTaggedIds(text) {
  const ids = new Set();
  const re = /@?(TC-\d{3}-\d{2})/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

export function walkSourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "dist") {
        continue;
      }
      walkSourceFiles(p, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(ent.name) && !ent.name.endsWith(".snap")) {
      out.push(p);
    }
  }
  return out;
}

export function missingP0Tags(testPlan, tagged) {
  const required = parseP0TestIds(testPlan);
  return required.filter((id) => !tagged.has(id));
}

export function runTraceability(root = repoRoot) {
  const testPlan = fs.readFileSync(path.join(root, "docs", "04-Test-Plan.md"), "utf8");
  const files = [
    ...walkSourceFiles(path.join(root, "apps")),
    ...walkSourceFiles(path.join(root, "packages")),
    ...walkSourceFiles(path.join(root, "scripts")),
  ];
  const tagged = new Set();
  for (const file of files) {
    for (const id of collectTaggedIds(fs.readFileSync(file, "utf8"))) {
      tagged.add(id);
    }
  }
  const missing = missingP0Tags(testPlan, tagged);
  return { tagged: [...tagged].sort(), missing };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = runTraceability();
  process.stdout.write(
    `tagged=${String(result.tagged.length)} missing_p0=${String(result.missing.length)}\n`,
  );
  if (result.missing.length > 0) {
    process.stderr.write(`Missing @TC tags for P0: ${result.missing.join(", ")}\n`);
    process.exit(1);
  }
}
