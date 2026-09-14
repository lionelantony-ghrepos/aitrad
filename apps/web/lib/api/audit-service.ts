import {
  auditAdminRequestSchema,
  auditAdminListResponseSchema,
  auditAdminTimelineResponseSchema,
  auditAdminExportResponseSchema,
  auditAdminConfigResponseSchema,
  auditChainVerifyResultSchema,
  auditAdminCronResponseSchema,
  auditAdminAppendResponseSchema,
  type AuditAdminRequest,
  type AuditAdminListResponse,
  type AuditAdminTimelineResponse,
  type AuditAdminExportResponse,
  type AuditAdminConfigResponse,
  type AuditAdminCronResponse,
  type AuditAdminAppendResponse,
  type AuditChainVerifyResult,
} from "@meridian/schemas";
import { isAuthStub } from "../auth/mode";
import { stubAppendAudit } from "../auth/stub-store";
import { readPublicInsforgeEnv } from "../insforge/env";
import { functionsUrl } from "./functions";

export function auditServiceUrl(baseUrl: string): string {
  return functionsUrl(baseUrl, "audit-service");
}

export async function invokeAuditService(input: {
  baseUrl: string;
  accessToken: string;
  request: AuditAdminRequest;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: unknown }> {
  const payload = auditAdminRequestSchema.parse(input.request);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(auditServiceUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  return { status: response.status, body };
}

export type AppendAuditLogInput = {
  userId: string;
  accessToken: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  payload?: Record<string, unknown>;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Append an audit_log row for the authenticated user.
 * Stub: in-memory chain. Live: audit-service `op: "append"` (admin writer; JWT user_id).
 */
export async function appendAuditLog(input: AppendAuditLogInput): Promise<void> {
  if (isAuthStub()) {
    stubAppendAudit({
      user_id: input.userId,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      payload: input.payload ?? {},
    });
    return;
  }
  const baseUrl = input.baseUrl ?? readPublicInsforgeEnv().baseUrl;
  const result = await invokeAuditService({
    baseUrl,
    accessToken: input.accessToken,
    request: {
      op: "append",
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      payload: input.payload ?? {},
    },
    fetchImpl: input.fetchImpl,
  });
  if (result.status !== 200) {
    const message =
      typeof result.body === "object" && result.body && "error" in result.body
        ? String((result.body as { error?: unknown }).error)
        : `AUDIT_APPEND_${result.status}`;
    throw new Error(message);
  }
}

export function parseAuditList(body: unknown): AuditAdminListResponse {
  return auditAdminListResponseSchema.parse(body);
}

export function parseAuditTimeline(body: unknown): AuditAdminTimelineResponse {
  return auditAdminTimelineResponseSchema.parse(body);
}

export function parseAuditExport(body: unknown): AuditAdminExportResponse {
  return auditAdminExportResponseSchema.parse(body);
}

export function parseAuditConfig(body: unknown): AuditAdminConfigResponse {
  return auditAdminConfigResponseSchema.parse(body);
}

export function parseAuditVerify(body: unknown): AuditChainVerifyResult {
  return auditChainVerifyResultSchema.parse(body);
}

export function parseAuditCron(body: unknown): AuditAdminCronResponse {
  return auditAdminCronResponseSchema.parse(body);
}

export function parseAuditAppend(body: unknown): AuditAdminAppendResponse {
  return auditAdminAppendResponseSchema.parse(body);
}
