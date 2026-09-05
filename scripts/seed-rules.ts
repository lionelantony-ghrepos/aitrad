import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminClient } from "@insforge/sdk";
import { seedEnvSchema } from "@meridian/schemas";
import {
  BASELINE_TABLE_KEYS,
  DOMAIN_BINDINGS,
  baselineCatalog,
} from "../packages/rules-engine/src/index.ts";

type AdminDatabase = ReturnType<typeof createAdminClient>["database"];

async function must<T>(
  label: string,
  result: { data: T; error: { message: string } | null },
): Promise<T> {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

export async function runRulesSeed(): Promise<{ tableKeys: readonly string[]; domains: number }> {
  const env = seedEnvSchema.parse({
    INSFORGE_URL: process.env.INSFORGE_URL,
    INSFORGE_API_KEY: process.env.INSFORGE_API_KEY,
  });
  const admin = createAdminClient({
    baseUrl: env.INSFORGE_URL,
    apiKey: env.INSFORGE_API_KEY,
  });
  const catalog = baselineCatalog();
  const domains = [...new Set(DOMAIN_BINDINGS.map((row) => row.domain))];

  for (const domain of domains) {
    const existing = await must(
      `rule_sets select ${domain}`,
      await admin.database.from("rule_sets").select("id,domain").eq("domain", domain),
    );
    const rows = Array.isArray(existing) ? existing : [];
    if (rows.length === 0) {
      const insert = await admin.database.from("rule_sets").insert([{ domain, name: domain }]);
      if (insert.error) {
        throw new Error(`rule_sets insert ${domain}: ${insert.error.message}`);
      }
    }
  }

  const sets = await must(
    "rule_sets all",
    await admin.database.from("rule_sets").select("id,domain"),
  );
  const setIdByDomain = new Map<string, string>();
  for (const row of (sets ?? []) as Array<{ id: string; domain: string }>) {
    setIdByDomain.set(row.domain, row.id);
  }

  for (const table of catalog.tables) {
    const binding = DOMAIN_BINDINGS.find((row) => row.tableKey === table.id);
    if (!binding) {
      throw new Error(`NO_BINDING:${table.id}`);
    }
    const ruleSetId = setIdByDomain.get(binding.domain);
    if (!ruleSetId) {
      throw new Error(`NO_RULE_SET:${binding.domain}`);
    }
    const tableId = await upsertPublishedTable(admin.database, {
      ruleSetId,
      table,
    });
    await replaceRows(admin.database, tableId, table);
  }

  const published = await must(
    "decision_tables published",
    await admin.database
      .from("decision_tables")
      .select("id,table_key,status")
      .eq("status", "published"),
  );
  const idByKey = new Map<string, string>();
  for (const row of (published ?? []) as Array<{ id: string; table_key: string }>) {
    idByKey.set(row.table_key, row.id);
  }

  for (const binding of DOMAIN_BINDINGS) {
    const tableId = idByKey.get(binding.tableKey);
    if (!tableId) {
      throw new Error(`UNPUBLISHED:${binding.tableKey}`);
    }
    const existing = await must(
      `rule_bindings ${binding.domain} ${binding.tableKey}`,
      await admin.database
        .from("rule_bindings")
        .select("id")
        .eq("domain", binding.domain)
        .eq("table_id", tableId),
    );
    if (!Array.isArray(existing) || existing.length === 0) {
      const insert = await admin.database
        .from("rule_bindings")
        .insert([{ domain: binding.domain, table_id: tableId }]);
      if (insert.error) {
        throw new Error(`rule_bindings insert: ${insert.error.message}`);
      }
    }
  }

  process.stdout.write(
    `Seeded ${BASELINE_TABLE_KEYS.length} published tables across ${domains.length} domains.\n`,
  );
  return { tableKeys: BASELINE_TABLE_KEYS, domains: domains.length };
}

async function upsertPublishedTable(
  db: AdminDatabase,
  input: {
    ruleSetId: string;
    table: ReturnType<typeof baselineCatalog>["tables"][number];
  },
): Promise<string> {
  const existing = await must(
    `decision_tables ${input.table.id}`,
    await db.from("decision_tables").select("id").eq("table_key", input.table.id).eq("version", 1),
  );
  const found = Array.isArray(existing) ? existing[0] : null;
  const payload = {
    rule_set_id: input.ruleSetId,
    table_key: input.table.id,
    status: "published",
    version: 1,
    hit_policy: input.table.hit_policy,
    default_outputs: input.table.default_outputs,
  };
  if (found && typeof found === "object" && "id" in found) {
    const id = String((found as { id: string }).id);
    const update = await db.from("decision_tables").update(payload).eq("id", id);
    if (update.error) {
      throw new Error(`decision_tables update ${input.table.id}: ${update.error.message}`);
    }
    return id;
  }
  const insert = await db.from("decision_tables").insert([payload]);
  if (insert.error) {
    throw new Error(`decision_tables insert ${input.table.id}: ${insert.error.message}`);
  }
  const reloaded = await must(
    `decision_tables reload ${input.table.id}`,
    await db.from("decision_tables").select("id").eq("table_key", input.table.id).eq("version", 1),
  );
  const id = Array.isArray(reloaded) ? (reloaded[0] as { id: string } | undefined)?.id : undefined;
  if (!id) {
    throw new Error(`decision_tables missing after insert:${input.table.id}`);
  }
  return id;
}

async function replaceRows(
  db: AdminDatabase,
  tableId: string,
  table: ReturnType<typeof baselineCatalog>["tables"][number],
): Promise<void> {
  const existing = await must(
    `decision_rows ${table.id}`,
    await db.from("decision_rows").select("id").eq("table_id", tableId),
  );
  for (const row of (existing ?? []) as Array<{ id: string }>) {
    const removed = await db.from("decision_rows").delete().eq("id", row.id);
    if (removed.error) {
      throw new Error(`decision_rows delete: ${removed.error.message}`);
    }
  }
  if (table.rows.length === 0) {
    return;
  }
  const insert = await db.from("decision_rows").insert(
    table.rows.map((row) => ({
      table_id: tableId,
      row_key: row.id,
      priority: row.priority,
      conditions: row.conditions,
      outputs: row.outputs,
      effective_from: row.effective_from ?? null,
      effective_to: row.effective_to ?? null,
    })),
  );
  if (insert.error) {
    throw new Error(`decision_rows insert ${table.id}: ${insert.error.message}`);
  }
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  runRulesSeed().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
