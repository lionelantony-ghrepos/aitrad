import { z } from "zod";
import { auditLogSchema } from "./entities";
import { timestamptzSchema, uuidSchema } from "./primitives";

export const auditAdminOpSchema = z.enum([
  "list",
  "timeline",
  "verify",
  "export",
  "getConfig",
  "setRetention",
  "cron",
]);

export const auditAdminFilterSchema = z.object({
  user_id: uuidSchema.optional(),
  entity_type: z.string().min(1).optional(),
  entity_id: uuidSchema.optional(),
  action: z.string().min(1).optional(),
  from: timestamptzSchema.optional(),
  to: timestamptzSchema.optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const auditAdminListRequestSchema = auditAdminFilterSchema.extend({
  op: z.literal("list"),
});

export const auditAdminTimelineRequestSchema = z.object({
  op: z.literal("timeline"),
  entity_type: z.string().min(1),
  entity_id: uuidSchema,
});

export const auditAdminVerifyRequestSchema = z.object({
  op: z.literal("verify"),
  from: timestamptzSchema.optional(),
  to: timestamptzSchema.optional(),
});

export const auditAdminExportRequestSchema = auditAdminFilterSchema.extend({
  op: z.literal("export"),
});

export const auditAdminGetConfigRequestSchema = z.object({
  op: z.literal("getConfig"),
});

export const auditAdminSetRetentionRequestSchema = z.object({
  op: z.literal("setRetention"),
  days: z.coerce.number().int().positive().nullable(),
});

export const auditAdminCronRequestSchema = z.object({
  op: z.literal("cron"),
  force: z.boolean().optional(),
});

export const auditAdminRequestSchema = z.discriminatedUnion("op", [
  auditAdminListRequestSchema,
  auditAdminTimelineRequestSchema,
  auditAdminVerifyRequestSchema,
  auditAdminExportRequestSchema,
  auditAdminGetConfigRequestSchema,
  auditAdminSetRetentionRequestSchema,
  auditAdminCronRequestSchema,
]);

export const auditChainVerifyResultSchema = z.object({
  ok: z.boolean(),
  checked: z.number().int().nonnegative(),
  broken_id: uuidSchema.nullable(),
  expected_hash: z.string().nullable(),
  actual_hash: z.string().nullable(),
  reason: z.string().nullable(),
});

export const auditAdminListResponseSchema = z.object({
  rows: z.array(auditLogSchema),
  total: z.number().int().nonnegative(),
  can_write: z.boolean(),
});

export const auditAdminTimelineResponseSchema = z.object({
  rows: z.array(auditLogSchema),
});

export const auditAdminExportResponseSchema = z.object({
  csv: z.string(),
  rows: z.number().int().nonnegative(),
});

export const auditAdminConfigResponseSchema = z.object({
  retention_days: z.number().int().positive().nullable(),
  chain: auditChainVerifyResultSchema,
  can_write: z.boolean(),
});

export const auditAdminCronResponseSchema = z.object({
  verified: z.boolean(),
  chain: auditChainVerifyResultSchema,
  purged: z.number().int().nonnegative(),
  alerted: z.number().int().nonnegative(),
  skipped: z.boolean(),
});

export type AuditAdminOp = z.infer<typeof auditAdminOpSchema>;
export type AuditAdminFilter = z.infer<typeof auditAdminFilterSchema>;
export type AuditAdminRequest = z.infer<typeof auditAdminRequestSchema>;
export type AuditChainVerifyResult = z.infer<typeof auditChainVerifyResultSchema>;
export type AuditAdminListResponse = z.infer<typeof auditAdminListResponseSchema>;
export type AuditAdminTimelineResponse = z.infer<typeof auditAdminTimelineResponseSchema>;
export type AuditAdminExportResponse = z.infer<typeof auditAdminExportResponseSchema>;
export type AuditAdminConfigResponse = z.infer<typeof auditAdminConfigResponseSchema>;
export type AuditAdminCronResponse = z.infer<typeof auditAdminCronResponseSchema>;
