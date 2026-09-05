import {
  evaluateDomainRequestSchema,
  type RuleDomain,
  type TableVersionRef,
} from "@meridian/schemas";
import { authorize } from "./authorize";
import { DOMAIN_BINDINGS } from "./baseline-tables";
import {
  evaluate,
  type DecisionRow,
  type DecisionTable,
  type EvaluationContext,
  type EvaluationResult,
} from "./evaluate";
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

export type RulesServicePorts = EvaluateDomainPorts & {
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
  if ((op === "publish" || op === "invalidate") && !input.isService) {
    return { status: 403, body: { error: "SERVICE_ONLY" } };
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

export type { RuleDomain };
