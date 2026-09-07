import type {
  CatalogTableItem,
  DecisionTable,
  RuleAuditView,
  RulesAdminGetTableResponse,
  TableHistoryItem,
  TableStatus,
} from "@meridian/schemas";
import { BASELINE_TABLE_KEYS, DOMAIN_BINDINGS, baselineTable } from "./baseline-tables";
import { diffDecisionTables } from "./rules-admin";

export type StoredTableVersion = {
  version: number;
  status: TableStatus;
  table: DecisionTable;
};

export type RulesAdminMemory = {
  tables: Map<string, { domain: string; versions: StoredTableVersion[] }>;
  audits: RuleAuditView[];
  roles: Map<string, string>;
};

function cloneTable(table: DecisionTable): DecisionTable {
  return structuredClone(table);
}

export function createRulesAdminMemory(seedAudits?: RuleAuditView[]): RulesAdminMemory {
  const tables = new Map<string, { domain: string; versions: StoredTableVersion[] }>();
  for (const key of BASELINE_TABLE_KEYS) {
    const binding = DOMAIN_BINDINGS.find((row) => row.tableKey === key);
    if (!binding) {
      continue;
    }
    tables.set(key, {
      domain: binding.domain,
      versions: [
        {
          version: 1,
          status: "published",
          table: cloneTable(baselineTable(key)),
        },
      ],
    });
  }
  return {
    tables,
    audits: seedAudits ?? defaultRiskAudits(),
    roles: new Map(),
  };
}

function defaultRiskAudits(): RuleAuditView[] {
  const base = {
    exceeds_buying_power: false,
    position_pct_post: 1,
    experience_level: "advanced",
    orders_today: 1,
    instrument_beta_class: "low",
    side: "buy",
    exceeds_position_qty: false,
  };
  return [
    {
      id: "audit-small",
      domain: "pre_trade_risk",
      context: { ...base, order_notional: 100 },
      outcome: { decision: "allow" },
      created_at: "2026-09-05T15:00:00.000Z",
    },
    {
      id: "audit-mid",
      domain: "pre_trade_risk",
      context: { ...base, order_notional: 2_000 },
      outcome: { decision: "allow" },
      created_at: "2026-09-05T15:01:00.000Z",
    },
  ];
}

function latestOf(
  versions: StoredTableVersion[],
  status: TableStatus,
): StoredTableVersion | undefined {
  return [...versions].reverse().find((row) => row.status === status);
}

export function memoryListCatalog(memory: RulesAdminMemory): CatalogTableItem[] {
  return [...memory.tables.entries()].map(([tableKey, rec]) => {
    const published = latestOf(rec.versions, "published");
    const draft = latestOf(rec.versions, "draft");
    return {
      tableKey,
      domain: rec.domain,
      publishedVersion: published?.version ?? null,
      draftVersion: draft?.version ?? null,
    };
  });
}

export function memoryGetTable(
  memory: RulesAdminMemory,
  tableKey: string,
): RulesAdminGetTableResponse | null {
  const rec = memory.tables.get(tableKey);
  if (!rec) {
    return null;
  }
  const published = latestOf(rec.versions, "published");
  const draft = latestOf(rec.versions, "draft");
  const publishedTable = published ? cloneTable(published.table) : null;
  const draftTable = draft ? cloneTable(draft.table) : publishedTable;
  return {
    tableKey,
    domain: rec.domain,
    published: publishedTable,
    publishedVersion: published?.version ?? null,
    draft: draftTable,
    draftVersion: draft?.version ?? published?.version ?? null,
    diff: diffDecisionTables(publishedTable, draftTable, {
      tableKey,
      publishedVersion: published?.version ?? null,
      draftVersion: draft?.version ?? published?.version ?? null,
    }),
  };
}

export function memorySaveDraft(
  memory: RulesAdminMemory,
  tableKey: string,
  table: DecisionTable,
): RulesAdminGetTableResponse {
  const rec = memory.tables.get(tableKey);
  if (!rec) {
    throw new Error(`UNKNOWN_TABLE:${tableKey}`);
  }
  const published = latestOf(rec.versions, "published");
  const existingDraft = latestOf(rec.versions, "draft");
  const version = existingDraft?.version ?? (published?.version ?? 0) + 1;
  if (existingDraft) {
    existingDraft.table = cloneTable({ ...table, id: tableKey });
  } else {
    rec.versions.push({
      version,
      status: "draft",
      table: cloneTable({ ...table, id: tableKey }),
    });
  }
  const loaded = memoryGetTable(memory, tableKey);
  if (!loaded) {
    throw new Error(`UNKNOWN_TABLE:${tableKey}`);
  }
  return loaded;
}

export function memoryPublishDraft(
  memory: RulesAdminMemory,
  tableKey: string,
): { version: number } {
  const rec = memory.tables.get(tableKey);
  if (!rec) {
    throw new Error(`UNKNOWN_TABLE:${tableKey}`);
  }
  const draft = latestOf(rec.versions, "draft");
  const published = latestOf(rec.versions, "published");
  if (!draft) {
    throw new Error(`NO_DRAFT:${tableKey}`);
  }
  if (published) {
    published.status = "retired";
  }
  draft.status = "published";
  return { version: draft.version };
}

export function memoryRollback(
  memory: RulesAdminMemory,
  tableKey: string,
  version: number,
): { version: number } {
  const rec = memory.tables.get(tableKey);
  if (!rec) {
    throw new Error(`UNKNOWN_TABLE:${tableKey}`);
  }
  const source = rec.versions.find((row) => row.version === version);
  if (!source) {
    throw new Error(`UNKNOWN_VERSION:${tableKey}:${version}`);
  }
  const nextVersion = Math.max(...rec.versions.map((row) => row.version)) + 1;
  for (const row of rec.versions) {
    if (row.status === "draft") {
      row.status = "retired";
    }
    if (row.status === "published") {
      row.status = "retired";
    }
  }
  rec.versions.push({
    version: nextVersion,
    status: "published",
    table: cloneTable(source.table),
  });
  return { version: nextVersion };
}

export function memoryListHistory(memory: RulesAdminMemory, tableKey: string): TableHistoryItem[] {
  const rec = memory.tables.get(tableKey);
  if (!rec) {
    return [];
  }
  return rec.versions
    .slice()
    .sort((a, b) => b.version - a.version)
    .map((row) => ({
      version: row.version,
      status: row.status,
      table: cloneTable(row.table),
    }));
}

export function memoryPublishedTables(
  memory: RulesAdminMemory,
  domain: string,
): Array<{ domain: string; tableKey: string; version: number; table: DecisionTable }> {
  const out: Array<{ domain: string; tableKey: string; version: number; table: DecisionTable }> =
    [];
  for (const [tableKey, rec] of memory.tables) {
    if (rec.domain !== domain) {
      continue;
    }
    const published = latestOf(rec.versions, "published");
    if (!published) {
      continue;
    }
    out.push({
      domain,
      tableKey,
      version: published.version,
      table: cloneTable(published.table),
    });
  }
  return out;
}

export function memoryAppendAudit(memory: RulesAdminMemory, row: RuleAuditView): void {
  memory.audits.unshift(row);
}
