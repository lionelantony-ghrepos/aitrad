import {
  evaluateDomainRequestSchema,
  rulesAdminRequestSchema,
  type CatalogTableItem,
  type DecisionTable,
  type RuleAuditView,
  type RuleDomain,
  type RulesAdminGetTableResponse,
  type TableHistoryItem,
  type TableVersionRef,
} from "@meridian/schemas";
import { authorize } from "./authorize";
import { baselineTable, DOMAIN_BINDINGS } from "./baseline-tables";
import {
  evaluate,
  type DecisionRow,
  type EvaluationContext,
  type EvaluationResult,
} from "./evaluate";
import {
  entitlementAllows,
  filterRuleAudits,
  requiredActionForAdminOp,
  simulateDraftAgainstAudits,
} from "./rules-admin";
import {
  PublishedRulesCache,
  RULES_PUBLISHED_EVENT,
  type PublishedDomainTable,
} from "./rules-cache";

export type { PublishedDomainTable };

export type RuleAuditWrite = {
  domain: string;
  table_versions: TableVersionRef[];
  context: EvaluationContext;
  matched_rows: DecisionRow[];
  outcome: EvaluationResult["outcome"];
  latency_ms: number;
};

export type EvaluateDomainPorts = {
  loadPublishedTables: (domain: string) => Promise<PublishedDomainTable[]>;
  writeRuleAudit: (row: RuleAuditWrite) => Promise<{ id: string }>;
};

export type EvaluateDomainOptions = {
  clock?: Date;
  cache?: PublishedRulesCache;
};

export type EvaluateDomainResult = EvaluationResult & {
  auditId: string;
  tableVersions: TableVersionRef[];
};

export function assembleDecisionTable(input: {
  tableKey: string;
  hit_policy: DecisionTable["hit_policy"];
  default_outputs: Record<string, unknown>;
  rows: Array<{
    row_key: string;
    priority: number;
    conditions: DecisionRow["conditions"];
    outputs: Record<string, unknown>;
    effective_from?: string | null;
    effective_to?: string | null;
  }>;
}): DecisionTable {
  return {
    id: input.tableKey,
    hit_policy: input.hit_policy,
    default_outputs: input.default_outputs,
    rows: input.rows.map((row) => ({
      id: row.row_key,
      priority: row.priority,
      conditions: row.conditions,
      outputs: row.outputs,
      effective_from: row.effective_from ?? null,
      effective_to: row.effective_to ?? null,
    })),
  };
}

export async function evaluateDomain(
  domain: string,
  context: EvaluationContext,
  ports: EvaluateDomainPorts,
  options: EvaluateDomainOptions = {},
): Promise<EvaluateDomainResult> {
  const started = Date.now();
  const clock = options.clock ?? new Date();
  const tables = options.cache
    ? await options.cache.get(domain, ports.loadPublishedTables)
    : await ports.loadPublishedTables(domain);
  if (tables.length === 0) {
    throw new Error(`DOMAIN_UNBOUND:${domain}`);
  }

  const evaluations = tables.map((item) => ({
    item,
    result: evaluate(item.table, context, clock),
  }));
  const merged = mergeDomainResults(domain, evaluations);
  const tableVersions = tables.map((item) => ({
    table_key: item.tableKey,
    version: item.version,
  }));
  const audit = await ports.writeRuleAudit({
    domain,
    table_versions: tableVersions,
    context,
    matched_rows: merged.matchedRows,
    outcome: merged.outcome,
    latency_ms: Date.now() - started,
  });

  return {
    ...merged,
    auditId: audit.id,
    tableVersions,
  };
}

function mergeDomainResults(
  domain: string,
  evaluations: Array<{ item: PublishedDomainTable; result: EvaluationResult }>,
): EvaluationResult {
  const policy = DOMAIN_BINDINGS.find((row) => row.domain === domain)?.hitPolicy ?? "FIRST";
  const matchedRows = evaluations.flatMap((row) => row.result.matchedRows);
  const trace = evaluations.flatMap((row) => row.result.trace);

  if (policy === "COLLECT") {
    const collected: Array<Record<string, unknown>> = [];
    for (const row of evaluations) {
      if (row.result.matchedRows.length === 0) {
        continue;
      }
      const outcome = row.result.outcome;
      if (Array.isArray(outcome)) {
        collected.push(...outcome);
      } else {
        collected.push(outcome);
      }
    }
    const fallback = evaluations[0]?.result.outcome;
    const defaultList = Array.isArray(fallback) ? fallback : [fallback ?? { decision: "valid" }];
    return {
      outcome: collected.length > 0 ? collected : defaultList,
      matchedRows,
      trace,
    };
  }

  if (policy === "ALL") {
    const objects = evaluations.map((row) =>
      Array.isArray(row.result.outcome)
        ? Object.assign({}, ...row.result.outcome)
        : row.result.outcome,
    );
    return {
      outcome: Object.assign({}, ...objects) as Record<string, unknown>,
      matchedRows,
      trace,
    };
  }

  const firstMatch = evaluations.find((row) => row.result.matchedRows.length > 0);
  const chosen = firstMatch ?? evaluations[0];
  return {
    outcome: chosen?.result.outcome ?? {},
    matchedRows,
    trace,
  };
}

export type RulesAdminPorts = {
  listCatalog: () => Promise<CatalogTableItem[]>;
  loadAdminTable: (tableKey: string) => Promise<RulesAdminGetTableResponse | null>;
  saveDraft: (tableKey: string, table: DecisionTable) => Promise<RulesAdminGetTableResponse>;
  publishDraft: (tableKey: string) => Promise<{ version: number }>;
  rollbackToVersion: (tableKey: string, version: number) => Promise<{ version: number }>;
  listHistory: (tableKey: string) => Promise<TableHistoryItem[]>;
  listAudits: (input: {
    query?: string;
    domain?: string;
    limit?: number;
  }) => Promise<RuleAuditView[]>;
  loadCallerRole: (userId: string) => Promise<string | null>;
};

export type RulesServicePorts = EvaluateDomainPorts &
  Partial<RulesAdminPorts> & {
    publishTable?: (tableKey: string) => Promise<void>;
    notifyPublished?: (payload: {
      tableKey?: string;
      event: typeof RULES_PUBLISHED_EVENT;
    }) => Promise<void>;
    writeAuditLog: (row: {
      user_id: string | null;
      action: string;
      entity_type: string;
      entity_id?: string | null;
      payload: Record<string, unknown>;
    }) => Promise<void>;
    readPublishGeneration?: () => Promise<string>;
  };

export function resolveRulesServiceApiKey(env: {
  API_KEY?: string;
  INSFORGE_API_KEY?: string;
}): string | null {
  const key = env.API_KEY ?? env.INSFORGE_API_KEY;
  if (typeof key !== "string" || key.length === 0) {
    return null;
  }
  return key;
}

export async function handleRulesServiceRequest(input: {
  method: string;
  body: unknown;
  userId: string | null;
  isService: boolean;
  cache: PublishedRulesCache;
  ports: RulesServicePorts;
  clock?: Date;
}): Promise<{ status: number; body: unknown }> {
  if (input.method !== "POST") {
    return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
  }

  const raw =
    input.body && typeof input.body === "object" ? (input.body as Record<string, unknown>) : {};
  const op = typeof raw.op === "string" ? raw.op : "evaluateDomain";
  const adminOps = new Set([
    "listCatalog",
    "getTable",
    "saveDraft",
    "rollback",
    "simulate",
    "listHistory",
    "listAudits",
  ]);
  if (op === "invalidate" && !input.isService) {
    return { status: 403, body: { error: "SERVICE_ONLY" } };
  }
  if (op === "publish" && !input.isService) {
    return handleAdminRulesOp(input, raw);
  }
  if (adminOps.has(op)) {
    return handleAdminRulesOp(input, raw);
  }
  const actorId = input.isService ? (input.userId ?? "service") : input.userId;
  const action =
    op === "publish"
      ? "rules:publish"
      : op === "invalidate"
        ? "rules:invalidate"
        : "rules:evaluate";
  const gate = authorize({ userId: actorId, action });
  if (!gate.allowed) {
    return { status: 401, body: { error: gate.reason ?? "DENIED" } };
  }

  if (input.ports.readPublishGeneration) {
    input.cache.syncGeneration(await input.ports.readPublishGeneration());
  }

  if (op === "invalidate") {
    input.cache.invalidate({ event: RULES_PUBLISHED_EVENT });
    await input.ports.writeAuditLog({
      user_id: input.userId,
      action: "rules.invalidate",
      entity_type: "decision_tables",
      payload: { event: RULES_PUBLISHED_EVENT },
    });
    return { status: 200, body: { ok: true, event: RULES_PUBLISHED_EVENT } };
  }

  if (op === "publish") {
    const tableKey = typeof raw.tableKey === "string" ? raw.tableKey : "";
    if (!tableKey) {
      return { status: 400, body: { error: "TABLE_KEY_REQUIRED" } };
    }
    if (input.ports.publishTable) {
      await input.ports.publishTable(tableKey);
    }
    input.cache.invalidate({ event: RULES_PUBLISHED_EVENT });
    if (input.ports.notifyPublished) {
      await input.ports.notifyPublished({ tableKey, event: RULES_PUBLISHED_EVENT });
    }
    await input.ports.writeAuditLog({
      user_id: input.userId,
      action: "rules.publish",
      entity_type: "decision_tables",
      payload: { tableKey, event: RULES_PUBLISHED_EVENT },
    });
    return { status: 200, body: { ok: true, tableKey, event: RULES_PUBLISHED_EVENT } };
  }

  const parsed = evaluateDomainRequestSchema.safeParse({
    ...raw,
    op: raw.op === undefined ? undefined : "evaluateDomain",
  });
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_EVALUATE_REQUEST" } };
  }

  const clock =
    input.isService && parsed.data.clock
      ? new Date(parsed.data.clock)
      : (input.clock ?? new Date());
  const result = await evaluateDomain(parsed.data.domain, parsed.data.context, input.ports, {
    clock,
    cache: input.cache,
  });
  await input.ports.writeAuditLog({
    user_id: input.userId,
    action: "rules.evaluate",
    entity_type: "rule_audit",
    entity_id: result.auditId.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
      ? result.auditId
      : null,
    payload: { domain: parsed.data.domain, auditId: result.auditId },
  });
  return { status: 200, body: result };
}

function requireAdminPorts(ports: RulesServicePorts): RulesAdminPorts | null {
  if (
    !ports.listCatalog ||
    !ports.loadAdminTable ||
    !ports.saveDraft ||
    !ports.publishDraft ||
    !ports.rollbackToVersion ||
    !ports.listHistory ||
    !ports.listAudits ||
    !ports.loadCallerRole
  ) {
    return null;
  }
  return {
    listCatalog: ports.listCatalog,
    loadAdminTable: ports.loadAdminTable,
    saveDraft: ports.saveDraft,
    publishDraft: ports.publishDraft,
    rollbackToVersion: ports.rollbackToVersion,
    listHistory: ports.listHistory,
    listAudits: ports.listAudits,
    loadCallerRole: ports.loadCallerRole,
  };
}

async function handleAdminRulesOp(
  input: {
    userId: string | null;
    isService: boolean;
    cache: PublishedRulesCache;
    ports: RulesServicePorts;
    clock?: Date;
  },
  raw: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const parsed = rulesAdminRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_ADMIN_REQUEST" } };
  }
  const actorId = input.isService ? (input.userId ?? "service") : input.userId;
  const session = authorize({ userId: actorId, action: requiredActionForAdminOp(parsed.data.op) });
  if (!session.allowed) {
    return { status: 401, body: { error: session.reason ?? "DENIED" } };
  }

  if (!input.isService) {
    if (!input.ports.loadCallerRole || !input.userId) {
      return { status: 403, body: { error: "FORBIDDEN" } };
    }
    const role = (await input.ports.loadCallerRole(input.userId)) ?? "unknown";
    const entitlementTables = await input.ports.loadPublishedTables("entitlements");
    const table = entitlementTables[0]?.table ?? baselineTable("DT-ENT-01");
    const verdict = evaluate(
      table,
      { role, action: requiredActionForAdminOp(parsed.data.op) },
      input.clock ?? new Date(),
    );
    if (!entitlementAllows(verdict.outcome)) {
      return { status: 403, body: { error: "FORBIDDEN" } };
    }
  }

  const admin = requireAdminPorts(input.ports);
  if (!admin) {
    return { status: 501, body: { error: "ADMIN_PORTS_UNAVAILABLE" } };
  }

  const req = parsed.data;
  if (req.op === "listCatalog") {
    return { status: 200, body: { tables: await admin.listCatalog() } };
  }
  if (req.op === "getTable") {
    const table = await admin.loadAdminTable(req.tableKey);
    if (!table) {
      return { status: 404, body: { error: "TABLE_NOT_FOUND" } };
    }
    return { status: 200, body: table };
  }
  if (req.op === "saveDraft") {
    const saved = await admin.saveDraft(req.tableKey, req.table);
    await input.ports.writeAuditLog({
      user_id: input.userId,
      action: "rules.draft.save",
      entity_type: "decision_tables",
      payload: { tableKey: req.tableKey },
    });
    return { status: 200, body: saved };
  }
  if (req.op === "listHistory") {
    return { status: 200, body: { versions: await admin.listHistory(req.tableKey) } };
  }
  if (req.op === "listAudits") {
    const rows = await admin.listAudits({
      query: req.query,
      domain: req.domain,
      limit: req.limit,
    });
    return {
      status: 200,
      body: {
        audits: filterRuleAudits(
          rows.map((row) => ({ ...row, outcome: row.outcome ?? null })),
          req.query ?? "",
        ),
      },
    };
  }
  if (req.op === "simulate") {
    const table = await admin.loadAdminTable(req.tableKey);
    if (!table?.published || !table.draft) {
      return { status: 404, body: { error: "TABLE_NOT_FOUND" } };
    }
    const domain = table.domain;
    const audits = await admin.listAudits({
      domain,
      limit: req.limit ?? 50,
    });
    const result = simulateDraftAgainstAudits({
      published: table.published,
      draft: table.draft,
      clock: input.clock ?? new Date(),
      audits: audits.map((row) => ({ id: row.id, context: row.context })),
    });
    return { status: 200, body: result };
  }
  if (req.op === "rollback") {
    const rolled = await admin.rollbackToVersion(req.tableKey, req.version);
    input.cache.invalidate({ event: RULES_PUBLISHED_EVENT });
    if (input.ports.notifyPublished) {
      await input.ports.notifyPublished({ tableKey: req.tableKey, event: RULES_PUBLISHED_EVENT });
    }
    if (input.ports.publishTable) {
      await input.ports.publishTable(req.tableKey);
    }
    await input.ports.writeAuditLog({
      user_id: input.userId,
      action: "rules.rollback",
      entity_type: "decision_tables",
      payload: { tableKey: req.tableKey, fromVersion: req.version, version: rolled.version },
    });
    return {
      status: 200,
      body: {
        ok: true,
        tableKey: req.tableKey,
        version: rolled.version,
        event: RULES_PUBLISHED_EVENT,
      },
    };
  }

  const published = await admin.publishDraft(req.tableKey);
  input.cache.invalidate({ event: RULES_PUBLISHED_EVENT });
  if (input.ports.publishTable) {
    await input.ports.publishTable(req.tableKey);
  }
  if (input.ports.notifyPublished) {
    await input.ports.notifyPublished({ tableKey: req.tableKey, event: RULES_PUBLISHED_EVENT });
  }
  await input.ports.writeAuditLog({
    user_id: input.userId,
    action: "rules.publish",
    entity_type: "decision_tables",
    payload: { tableKey: req.tableKey, version: published.version, event: RULES_PUBLISHED_EVENT },
  });
  return {
    status: 200,
    body: {
      ok: true,
      tableKey: req.tableKey,
      version: published.version,
      event: RULES_PUBLISHED_EVENT,
    },
  };
}

export type { RuleDomain };
