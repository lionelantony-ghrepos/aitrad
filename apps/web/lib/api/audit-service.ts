import {
  auditAdminRequestSchema,
  auditAdminListResponseSchema,
  auditAdminTimelineResponseSchema,
  auditAdminExportResponseSchema,
  auditAdminConfigResponseSchema,
  auditChainVerifyResultSchema,
  auditAdminCronResponseSchema,
  type AuditAdminRequest,
  type AuditAdminListResponse,
  type AuditAdminTimelineResponse,
  type AuditAdminExportResponse,
  type AuditAdminConfigResponse,
  type AuditAdminCronResponse,
  type AuditChainVerifyResult,
} from "@meridian/schemas";
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
