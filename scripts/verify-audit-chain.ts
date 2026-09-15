import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseVerifyAuditChainRows } from "./verify-audit-parse.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VERIFY_SQL = `SELECT ok, checked, broken_id, reason FROM public.verify_audit_chain(NULL, NULL)`;

export function runVerifyAuditChain(): { ok: boolean; checked: number; reason?: string } {
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const raw = execFileSync(npxBin, ["-y", "@insforge/cli", "db", "query", VERIFY_SQL, "--json"], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  return parseVerifyAuditChainRows(JSON.parse(raw) as unknown);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    const result = runVerifyAuditChain();
    process.stdout.write(
      `verify_audit_chain ok=${String(result.ok)} checked=${String(result.checked)}\n`,
    );
    if (!result.ok) {
      process.stderr.write(`${result.reason ?? "CHAIN_BROKEN"}\n`);
      process.exit(1);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}
