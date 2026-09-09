import {
  analyticsPortfolioRequestSchema,
  analyticsSnapshotRequestSchema,
  analyticsSnapshotResponseSchema,
  portfolioResponseSchema,
  type AnalyticsPortfolioRequest,
  type AnalyticsSnapshotRequest,
  type AnalyticsSnapshotResponse,
  type PortfolioResponse,
} from "@meridian/schemas";
import { functionsUrl } from "./functions";

export function analyticsServiceUrl(baseUrl: string, path?: "portfolio" | "snapshot"): string {
  const root = functionsUrl(baseUrl, "analytics-service");
  return path ? `${root}/${path}` : root;
}

export async function invokeAnalyticsPortfolio(input: {
  baseUrl: string;
  accessToken: string;
  request?: AnalyticsPortfolioRequest;
  fetchImpl?: typeof fetch;
}): Promise<PortfolioResponse> {
  const payload = analyticsPortfolioRequestSchema.parse({ ...input.request, op: "portfolio" });
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(analyticsServiceUrl(input.baseUrl, "portfolio"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`ANALYTICS_SERVICE_${response.status}`);
  }
  return portfolioResponseSchema.parse(body);
}

export async function invokeAnalyticsSnapshot(input: {
  baseUrl: string;
  accessToken: string;
  request?: AnalyticsSnapshotRequest;
  fetchImpl?: typeof fetch;
}): Promise<AnalyticsSnapshotResponse> {
  const payload = analyticsSnapshotRequestSchema.parse({ ...input.request, op: "snapshot" });
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(analyticsServiceUrl(input.baseUrl, "snapshot"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`ANALYTICS_SERVICE_${response.status}`);
  }
  return analyticsSnapshotResponseSchema.parse(body);
}
