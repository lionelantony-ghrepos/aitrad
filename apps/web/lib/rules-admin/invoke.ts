import {
  handleRulesServiceRequest,
  memoryAppendAudit,
  memoryGetTable,
  memoryListCatalog,
  memoryListHistory,
  memoryPublishDraft,
  memoryPublishedTables,
  memoryRollback,
  memorySaveDraft,
  PublishedRulesCache,
  RULES_PUBLISHED_EVENT,
  type RulesServicePorts,
} from "@meridian/rules-engine";
import {
  evaluateDomainRequestSchema,
  evaluateDomainResponseSchema,
  rulesAdminRequestSchema,
  type EvaluateDomainRequest,
  type EvaluateDomainResponse,
  type RulesAdminRequest,
} from "@meridian/schemas";
import { rulesServiceUrl } from "../api/rules-service";
import { stubRulesMemory } from "../auth/stub-store";

const stubCache = new PublishedRulesCache();

export function resetStubRulesCache(): void {
  stubCache.invalidate({ event: RULES_PUBLISHED_EVENT });
}

export function stubRulesAdminPorts(role: string, userId: string): RulesServicePorts {
  const memory = stubRulesMemory();
  memory.roles.set(userId, role);
  return {
    async loadPublishedTables(domain) {
      return memoryPublishedTables(memory, domain);
    },
    async writeRuleAudit(row) {
      const id = crypto.randomUUID();
      memoryAppendAudit(memory, {
        id,
        domain: row.domain,
        context: row.context,
        outcome: row.outcome,
        matched_rows: row.matched_rows,
        table_versions: row.table_versions,
        latency_ms: row.latency_ms,
      });
      return { id };
    },
    async writeAuditLog() {
      return;
    },
    async listCatalog() {
      return memoryListCatalog(memory);
    },
    async loadAdminTable(tableKey) {
      return memoryGetTable(memory, tableKey);
    },
    async saveDraft(tableKey, table) {
      return memorySaveDraft(memory, tableKey, table);
    },
    async publishDraft(tableKey) {
      return memoryPublishDraft(memory, tableKey);
    },
    async rollbackToVersion(tableKey, version) {
      return memoryRollback(memory, tableKey, version);
    },
    async listHistory(tableKey) {
      return memoryListHistory(memory, tableKey);
    },
    async listAudits(input) {
      return memory.audits
        .filter((row) => !input.domain || row.domain === input.domain)
        .slice(0, input.limit ?? 50);
    },
    async loadCallerRole(id) {
      return memory.roles.get(id) ?? role;
    },
  };
}

export async function invokeRulesAdminStub(input: {
  userId: string;
  role: string;
  request: RulesAdminRequest;
}): Promise<{ status: number; body: unknown }> {
  const parsed = rulesAdminRequestSchema.parse(input.request);
  return handleRulesServiceRequest({
    method: "POST",
    body: parsed,
    userId: input.userId,
    isService: false,
    cache: stubCache,
    ports: stubRulesAdminPorts(input.role, input.userId),
  });
}

export async function invokeEvaluateStub(input: {
  userId: string;
  role: string;
  request: EvaluateDomainRequest;
}): Promise<EvaluateDomainResponse> {
  const parsed = evaluateDomainRequestSchema.parse(input.request);
  const result = await handleRulesServiceRequest({
    method: "POST",
    body: parsed,
    userId: input.userId,
    isService: false,
    cache: stubCache,
    ports: stubRulesAdminPorts(input.role, input.userId),
  });
  if (result.status !== 200) {
    throw new Error(`RULES_SERVICE_${result.status}`);
  }
  return evaluateDomainResponseSchema.parse(result.body);
}

export async function invokeRulesAdminRemote(input: {
  baseUrl: string;
  accessToken: string;
  request: RulesAdminRequest;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: unknown }> {
  const payload = rulesAdminRequestSchema.parse(input.request);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(rulesServiceUrl(input.baseUrl), {
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
