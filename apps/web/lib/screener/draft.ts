import {
  SCREENER_FIELD_REGISTRY,
  screenerCriteriaSchema,
  type ConditionOperator,
  type ScreenerCondition,
  type ScreenerCriteria,
  type ScreenerFieldId,
} from "@meridian/schemas";

export type DraftCondition = {
  id: string;
  field: ScreenerFieldId;
  op: ConditionOperator;
  value: string;
};

export type DraftGroup = {
  id: string;
  combinator: "and" | "or";
  conditions: DraftCondition[];
};

export type DraftCriteria = {
  combinator: "and" | "or";
  groups: DraftGroup[];
};

export function newConditionId(): string {
  return crypto.randomUUID();
}

export function emptyDraftCondition(): DraftCondition {
  return {
    id: newConditionId(),
    field: "sector",
    op: "eq",
    value: "Technology",
  };
}

export function emptyDraftGroup(): DraftGroup {
  return {
    id: newConditionId(),
    combinator: "and",
    conditions: [emptyDraftCondition()],
  };
}

export function emptyDraftCriteria(): DraftCriteria {
  return { combinator: "and", groups: [emptyDraftGroup()] };
}

export function criteriaToDraft(criteria: ScreenerCriteria): DraftCriteria {
  return {
    combinator: criteria.combinator,
    groups: criteria.groups.map((group) => ({
      id: newConditionId(),
      combinator: group.combinator,
      conditions: group.conditions.map((condition) => ({
        id: newConditionId(),
        field: condition.field,
        op: condition.op,
        value: serializeValue(condition),
      })),
    })),
  };
}

function serializeValue(condition: ScreenerCondition): string {
  if (condition.op === "is_null" || condition.op === "any") {
    return "";
  }
  const value = condition.value;
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(",");
  }
  if (value == null) {
    return "";
  }
  return String(value);
}

export function parseDraftValue(
  field: ScreenerFieldId,
  op: ConditionOperator,
  raw: string,
): ScreenerCondition["value"] | undefined {
  if (op === "is_null" || op === "any") {
    return undefined;
  }
  const trimmed = raw.trim();
  const def = SCREENER_FIELD_REGISTRY[field];
  if (op === "in" || op === "not_in" || op === "between") {
    const parts = trimmed
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (def.type === "number") {
      return parts.map((part) => Number(part));
    }
    return parts;
  }
  if (def.type === "number") {
    return Number(trimmed);
  }
  return trimmed;
}

export function draftToCriteria(draft: DraftCriteria): ScreenerCriteria | null {
  const groups = draft.groups
    .map((group) => ({
      combinator: group.combinator,
      conditions: group.conditions
        .map((condition) => {
          const value = parseDraftValue(condition.field, condition.op, condition.value);
          if (condition.op === "is_null" || condition.op === "any") {
            return { field: condition.field, op: condition.op };
          }
          return { field: condition.field, op: condition.op, value };
        })
        .filter((condition) => {
          if (condition.op === "is_null" || condition.op === "any") {
            return true;
          }
          const value = "value" in condition ? condition.value : undefined;
          return (
            value !== undefined &&
            value !== "" &&
            !(typeof value === "number" && Number.isNaN(value))
          );
        }),
    }))
    .filter((group) => group.conditions.length > 0);
  const parsed = screenerCriteriaSchema.safeParse({
    combinator: draft.combinator,
    groups,
  });
  return parsed.success ? parsed.data : null;
}
