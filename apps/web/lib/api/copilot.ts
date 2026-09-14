import {
  copilotActionDecideRequestSchema,
  copilotActionSchema,
  copilotChatEventSchema,
  copilotChatRequestSchema,
  type CopilotAction,
  type CopilotActionDecideRequest,
  type CopilotChatEvent,
  type CopilotChatRequest,
} from "@meridian/schemas";
import { functionsUrl } from "./functions";

export function copilotOrchestratorUrl(baseUrl: string): string {
  return functionsUrl(baseUrl, "copilot-orchestrator");
}

export async function invokeCopilotActionDecide(input: {
  baseUrl: string;
  accessToken: string;
  request: CopilotActionDecideRequest;
  fetchImpl?: typeof fetch;
}): Promise<CopilotAction> {
  const payload = copilotActionDecideRequestSchema.parse(input.request);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(copilotOrchestratorUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof body === "object" && body && "error" in body
        ? String((body as { error?: unknown }).error)
        : `COPILOT_ACTION_${response.status}`,
    );
  }
  return copilotActionSchema.parse(body);
}

export function parseSseBlock(block: string): CopilotChatEvent | null {
  const line = block
    .split("\n")
    .map((row) => row.trim())
    .find((row) => row.startsWith("data:"));
  if (!line) {
    return null;
  }
  const payload = line.slice(5).trim();
  if (!payload) {
    return null;
  }
  const parsed = copilotChatEventSchema.safeParse(JSON.parse(payload) as unknown);
  return parsed.success ? parsed.data : null;
}

export async function invokeCopilotOrchestrator(input: {
  baseUrl: string;
  accessToken: string;
  request: CopilotChatRequest;
  fetchImpl?: typeof fetch;
  onEvent: (event: CopilotChatEvent) => void;
}): Promise<void> {
  const payload = copilotChatRequestSchema.parse(input.request);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(copilotOrchestratorUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) {
    throw new Error(`COPILOT_${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const event = parseSseBlock(part);
      if (event) {
        input.onEvent(event);
      }
    }
  }
  if (buffer.trim().length > 0) {
    const event = parseSseBlock(buffer);
    if (event) {
      input.onEvent(event);
    }
  }
}
