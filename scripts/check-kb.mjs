#!/usr/bin/env node
/**
 * Completeness gate for docs/kb as-built files.
 * Usage: node scripts/check-kb.mjs [commit-subject ...]
 * Commit subjects may also be piped on stdin (one per line).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const asBuiltDir = path.join(repoRoot, "docs", "kb", "as-built");

export const REQUIRED_HEADINGS = [
  "PBI / ACs / TCs",
  "Shipped vs spec",
  "Surfaces",
  "Contracts",
  "Rules",
  "How to extend",
  "Ops",
  "Trace",
];

export function padPbi(id) {
  return String(Number(id)).padStart(3, "0");
}

export function pbisFromCommitMessages(text) {
  const ids = new Set();
  const re = /feat\(PBI-(\d{1,3})\)/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    ids.add(padPbi(match[1]));
  }
  return [...ids].sort();
}

export function asBuiltPath(pbi) {
  return path.join(asBuiltDir, `PBI-${padPbi(pbi)}.md`);
}

/** @returns {{ heading: string, body: string }[]} */
export function splitSections(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    const h2 = /^## (.+)$/.exec(line);
    if (h2) {
      if (current) {
        sections.push(current);
      }
      current = { heading: h2[1].trim(), body: "" };
      continue;
    }
    if (current) {
      current.body += `${line}\n`;
    }
  }
  if (current) {
    sections.push(current);
  }
  return sections;
}

export function isEmptyOrTbd(body) {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return true;
  }
  const normalized = trimmed.replace(/\s+/g, " ").toLowerCase();
  if (/^(tbd\.?|- tbd\.?|n\/a\.?)$/i.test(normalized)) {
    return true;
  }
  if (normalized === "tbd") {
    return true;
  }
  const lines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("<!--"));
  if (lines.length === 0) {
    return true;
  }
  return lines.every((line) => {
    const t = line
      .replace(/^[-*]\s+/, "")
      .replace(/^\|.*\|$/, "")
      .trim();
    return /^tbd\.?$/i.test(t);
  });
}

/**
 * @param {string} markdown
 * @param {string} fileLabel
 * @returns {string[]} errors
 */
export function validateAsBuilt(markdown, fileLabel) {
  const errors = [];
  const sections = splitSections(markdown);
  const found = new Map(sections.map((s) => [s.heading, s.body]));
  for (const heading of REQUIRED_HEADINGS) {
    if (!found.has(heading)) {
      errors.push(`${fileLabel}: missing heading "## ${heading}"`);
      continue;
    }
    if (isEmptyOrTbd(found.get(heading) ?? "")) {
      errors.push(`${fileLabel}: section "## ${heading}" is empty or TBD`);
    }
  }
  return errors;
}

function listAsBuiltFiles() {
  if (!fs.existsSync(asBuiltDir)) {
    return [];
  }
  return fs
    .readdirSync(asBuiltDir)
    .filter((name) => /^PBI-\d{3}\.md$/.test(name))
    .map((name) => path.join(asBuiltDir, name));
}

export function collectCommitText(argv, env = process.env) {
  const idx = argv.indexOf("--commits-file");
  if (idx !== -1 && argv[idx + 1]) {
    return fs.readFileSync(argv[idx + 1], "utf8");
  }
  if (env.KB_COMMIT_SUBJECTS) {
    return env.KB_COMMIT_SUBJECTS;
  }
  return argv
    .slice(2)
    .filter((a) => a !== "--commits-file")
    .join("\n");
}

function main() {
  const errors = [];
  for (const file of listAsBuiltFiles()) {
    const md = fs.readFileSync(file, "utf8");
    errors.push(...validateAsBuilt(md, path.relative(repoRoot, file).replaceAll("\\", "/")));
  }

  const commitText = collectCommitText(process.argv);
  const requiredPbis = pbisFromCommitMessages(commitText);
  for (const pbi of requiredPbis) {
    const file = asBuiltPath(pbi);
    const rel = path.relative(repoRoot, file).replaceAll("\\", "/");
    if (!fs.existsSync(file)) {
      errors.push(`${rel}: required by feat(PBI-${pbi}) commit message but file is missing`);
    }
  }

  if (errors.length > 0) {
    console.error("Knowledge base check failed:\n");
    for (const err of errors) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }
  console.log(
    `Knowledge base check passed (${listAsBuiltFiles().length} as-built file(s); ${requiredPbis.length} PBI(s) from commit messages).`,
  );
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main();
}
