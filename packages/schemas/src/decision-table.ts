import { z } from "zod";

export const conditionOperatorSchema = z.enum([
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
  "not_in",
  "between",
  "regex",
  "is_null",
  "any",
]);

export const hitPolicySchema = z.enum(["FIRST", "ALL", "COLLECT"]);

export const decisionConditionSchema = z.object({
  input: z.string().min(1),
  op: conditionOperatorSchema,
  value: z.unknown().optional(),
  /** Encodes doc 05 prose such as “not between” (no dedicated operator). */
  negate: z.boolean().optional(),
});

export const decisionOutputsSchema = z.record(z.unknown());

export const decisionRowSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int(),
  conditions: z.array(decisionConditionSchema),
  outputs: decisionOutputsSchema,
  effective_from: z.string().nullable().optional(),
  effective_to: z.string().nullable().optional(),
});

export const decisionTableSchema = z.object({
  id: z.string().min(1),
  hit_policy: hitPolicySchema,
  default_outputs: decisionOutputsSchema,
  rows: z.array(decisionRowSchema),
});

export type ConditionOperator = z.infer<typeof conditionOperatorSchema>;
export type HitPolicy = z.infer<typeof hitPolicySchema>;
export type DecisionCondition = z.infer<typeof decisionConditionSchema>;
export type DecisionRow = z.infer<typeof decisionRowSchema>;
export type DecisionTable = z.infer<typeof decisionTableSchema>;
