import {
  briefCronResponseSchema,
  briefExportRequestSchema,
  briefExportResponseSchema,
  briefGenerateRequestSchema,
  briefGenerateResponseSchema,
  briefListResponseSchema,
  briefSchema,
  type Brief,
  type BriefExportResponse,
  type BriefGenerateRequest,
  type BriefGenerateResponse,
  type BriefListResponse,
} from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { functionsUrl } from "./functions";
import { eqFilter, recordTables } from "./rest";

export function briefServiceUrl(baseUrl: string): string {
  return functionsUrl(baseUrl, "brief-service");
}

export function createBriefsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.briefs, briefSchema, {
        query: { order: "created_at.desc" },
      });
    },
    get(id: string) {
      return client.list(recordTables.briefs, briefSchema, {
        query: { id: eqFilter(id) },
      });
    },
  };
}

export async function invokeBriefGenerate(input: {
  baseUrl: string;
  accessToken: string;
  request: BriefGenerateRequest;
  fetchImpl?: typeof fetch;
}): Promise<BriefGenerateResponse> {
  const payload = briefGenerateRequestSchema.parse({ ...input.request, op: "generate" });
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(briefServiceUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, op: "generate" }),
  });
  const body: unknown = await response.json().catch(() => ({ error: "BRIEF_UNAVAILABLE" }));
  if (!response.ok) {
    throw new Error(
      typeof body === "object" && body && "error" in body
        ? String((body as { error?: unknown }).error)
        : `BRIEF_${response.status}`,
    );
  }
  return briefGenerateResponseSchema.parse(body);
}

export async function invokeBriefList(input: {
  baseUrl: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<BriefListResponse> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(briefServiceUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ op: "list" }),
  });
  const body: unknown = await response.json().catch(() => ({ error: "BRIEF_UNAVAILABLE" }));
  if (!response.ok) {
    throw new Error(`BRIEF_${response.status}`);
  }
  return briefListResponseSchema.parse(body);
}

export async function invokeBriefExport(input: {
  baseUrl: string;
  accessToken: string;
  briefId: string;
  fetchImpl?: typeof fetch;
}): Promise<BriefExportResponse> {
  const payload = briefExportRequestSchema.parse({ op: "export", brief_id: input.briefId });
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(briefServiceUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json().catch(() => ({ error: "BRIEF_UNAVAILABLE" }));
  if (!response.ok) {
    throw new Error(`BRIEF_${response.status}`);
  }
  return briefExportResponseSchema.parse(body);
}

export async function invokeBriefCron(input: {
  baseUrl: string;
  accessToken: string;
  force?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<{ generated: number; skipped: number }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(briefServiceUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ op: "cron", force: input.force }),
  });
  const body: unknown = await response.json().catch(() => ({ error: "BRIEF_UNAVAILABLE" }));
  if (!response.ok) {
    throw new Error(`BRIEF_${response.status}`);
  }
  return briefCronResponseSchema.parse(body);
}

export type { Brief };
