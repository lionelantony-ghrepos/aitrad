import {
  handleHealthServiceRequest,
  handleTelemetryRequest,
  baselineTable,
  evaluate,
  memoryPublishedTables,
} from "@meridian/rules-engine";
import {
  healthSnapshotSchema,
  telemetryIngestResponseSchema,
  telemetryRequestSchema,
  type HealthSnapshot,
  type TelemetryRequest,
} from "@meridian/schemas";
import { functionsUrl } from "./functions";
import { isAuthStub } from "../auth/mode";
import {
  stubGetFeedHeartbeat,
  stubGetRole,
  stubInsertTelemetry,
  stubListTelemetry,
  stubRulesMemory,
  stubAppendAudit,
} from "../auth/stub-store";

export function telemetryServiceUrl(baseUrl: string): string {
  return functionsUrl(baseUrl, "telemetry");
}

export function healthServiceUrl(baseUrl: string): string {
  return functionsUrl(baseUrl, "health-service");
}

function stubEntitlementPorts() {
  const memory = stubRulesMemory();
  return {
    async loadRole(id: string) {
      return stubGetRole(id);
    },
    async evaluateEntitlements(facts: { role: string; action: string }) {
      const table =
        memoryPublishedTables(memory, "entitlements")[0]?.table ?? baselineTable("DT-ENT-01");
      return evaluate(table, facts, new Date());
    },
  };
}

export async function ingestTelemetry(input: {
  userId: string | null;
  accessToken: string;
  request: TelemetryRequest;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: unknown }> {
  const parsed = telemetryRequestSchema.parse(input.request);
  if (isAuthStub()) {
    return handleTelemetryRequest({
      method: "POST",
      body: parsed,
      userId: input.userId,
      isService: false,
      ports: {
        ...stubEntitlementPorts(),
        now: () => new Date(),
        sampleRate: () => 1,
        async insertTelemetry(row) {
          stubInsertTelemetry(row);
        },
        async writeAuditLog(row) {
          if (row.user_id) {
            stubAppendAudit({
              user_id: row.user_id,
              action: row.action,
              entity_type: row.entity_type,
              entity_id: row.entity_id ?? null,
              payload: row.payload,
            });
          }
        },
      },
    });
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(telemetryServiceUrl(input.baseUrl ?? ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsed),
  });
  const body: unknown = await response.json();
  return { status: response.status, body };
}

export async function fetchHealthSnapshot(input: {
  userId: string | null;
  accessToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: unknown }> {
  if (isAuthStub()) {
    return handleHealthServiceRequest({
      method: "POST",
      body: { op: "snapshot" },
      userId: input.userId,
      ports: {
        ...stubEntitlementPorts(),
        now: () => new Date(),
        listTelemetry: async () => stubListTelemetry(),
        getFeedHeartbeat: async () => stubGetFeedHeartbeat(),
      },
    });
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(healthServiceUrl(input.baseUrl ?? ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ op: "snapshot" }),
  });
  const body: unknown = await response.json();
  return { status: response.status, body };
}

export function parseHealthSnapshot(body: unknown): HealthSnapshot {
  return healthSnapshotSchema.parse(body);
}

export function parseTelemetryIngest(body: unknown) {
  return telemetryIngestResponseSchema.parse(body);
}
