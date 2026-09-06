import { z } from "zod";
import { decisionTableSchema } from "./decision-table";

export const rulesAdminRoleSchema = z.enum(["trader", "admin", "compliance"]);

export const rulesAdminOpSchema = z.enum([
  "listCatalog",
  "getTable",
  "saveDraft",
  "publish",
  "rollback",
  "simulate",
  "listHistory",
  "listAudits",
]);

export const catalogTableItemSchema = z.object({
  tableKey: z.string().min(1),
  domain: z.string().min(1),
  publishedVersion: z.number().int().positive().nullable(),
  draftVersion: z.number().int().positive().nullable().optional(),
});

export const tableDiffSchema = z.object({
  tableKey: z.string().min(1),
  publishedVersion: z.number().int().nonnegative().nullable(),
  draftVersion: z.number().int().nonnegative().nullable(),
  addedRowIds: z.array(z.string()),
  removedRowIds: z.array(z.string()),
  changedRowIds: z.array(z.string()),
});

export const simulateDeltaSchema = z.object({
  auditId: z.string().min(1),
  publishedOutcome: z.unknown(),
  draftOutcome: z.unknown(),
  publishedRowIds: z.array(z.string()),
  draftRowIds: z.array(z.string()),
});

export const simulateResultSchema = z.object({
  sampleSize: z.number().int().nonnegative(),
  agreementPct: z.number().min(0).max(100),
  deltas: z.array(simulateDeltaSchema),
});

export const ruleAuditViewSchema = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  table_versions: z.unknown().optional(),
  context: z.record(z.unknown()),
  matched_rows: z.unknown().optional(),
  outcome: z.unknown(),
  latency_ms: z.number().int().nonnegative().optional(),
  created_at: z.string().optional(),
  user_id: z.string().nullable().optional(),
});

export const tableHistoryItemSchema = z.object({
  version: z.number().int().positive(),
  status: z.enum(["draft", "published", "retired"]),
  table: decisionTableSchema,
});

export const rulesAdminGetTableResponseSchema = z.object({
  tableKey: z.string().min(1),
  domain: z.string().min(1),
  published: decisionTableSchema.nullable(),
  publishedVersion: z.number().int().positive().nullable(),
  draft: decisionTableSchema.nullable(),
  draftVersion: z.number().int().positive().nullable(),
  diff: tableDiffSchema,
});

const tableKeyField = z.object({ tableKey: z.string().min(1) });

export const rulesAdminRequestSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("listCatalog") }),
  z.object({ op: z.literal("getTable"), tableKey: z.string().min(1) }),
  z.object({
    op: z.literal("saveDraft"),
    tableKey: z.string().min(1),
    table: decisionTableSchema,
  }),
  z.object({ op: z.literal("publish"), tableKey: z.string().min(1) }),
  z.object({
    op: z.literal("rollback"),
    tableKey: z.string().min(1),
    version: z.number().int().positive(),
  }),
  z.object({
    op: z.literal("simulate"),
    tableKey: z.string().min(1),
    limit: z.number().int().positive().max(500).optional(),
  }),
  z.object({ op: z.literal("listHistory"), tableKey: z.string().min(1) }),
  z.object({
    op: z.literal("listAudits"),
    query: z.string().optional(),
    domain: z.string().optional(),
    limit: z.number().int().positive().max(200).optional(),
  }),
]);

export const rulesAdminListCatalogResponseSchema = z.object({
  tables: z.array(catalogTableItemSchema),
});

export const rulesAdminPublishResponseSchema = z.object({
  ok: z.literal(true),
  tableKey: z.string().min(1),
  version: z.number().int().positive(),
  event: z.literal("rules:published"),
});

export type RulesAdminRole = z.infer<typeof rulesAdminRoleSchema>;
export type RulesAdminOp = z.infer<typeof rulesAdminOpSchema>;
export type CatalogTableItem = z.infer<typeof catalogTableItemSchema>;
export type TableDiff = z.infer<typeof tableDiffSchema>;
export type SimulateDelta = z.infer<typeof simulateDeltaSchema>;
export type SimulateResult = z.infer<typeof simulateResultSchema>;
export type RuleAuditView = z.infer<typeof ruleAuditViewSchema>;
export type TableHistoryItem = z.infer<typeof tableHistoryItemSchema>;
export type RulesAdminRequest = z.infer<typeof rulesAdminRequestSchema>;
export type RulesAdminGetTableResponse = z.infer<typeof rulesAdminGetTableResponseSchema>;
export type RulesAdminListCatalogResponse = z.infer<typeof rulesAdminListCatalogResponseSchema>;
export type RulesAdminPublishResponse = z.infer<typeof rulesAdminPublishResponseSchema>;

export { tableKeyField };
