import {
  COPILOT_SYSTEM_PROMPT,
  copilotChatRequestSchema,
  type CopilotChatEvent,
  type CopilotMessage,
  type CopilotSession,
  type CopilotToolCallRecord,
} from "@meridian/schemas";
import type { ChatMessage, LlmPort, ToolExecutor } from "./loop";
import { runOrchestratorLoop } from "./loop";
import { buildContextPreamble } from "./prompt";
import { rateLimitFromAiPolicy } from "./rate-limit";
import { expandSlashPrompt } from "./slash";

export type CopilotPersistPorts = {
  createSession: (title: string) => Promise<CopilotSession>;
  appendMessage: (input: {
    sessionId: string;
    role: CopilotMessage["role"];
    content: string;
    tool_calls: CopilotToolCallRecord[];
  }) => Promise<CopilotMessage>;
  loadHistory: (sessionId: string) => Promise<CopilotMessage[]>;
  auditTool: (name: string, args: unknown) => Promise<void>;
};

export async function runCopilotRequest(input: {
  request: unknown;
  policyOutcome: unknown;
  llm: LlmPort;
  executeTool: ToolExecutor;
  persist: CopilotPersistPorts;
  portfolioSummary?: string;
  onEvent?: (event: CopilotChatEvent) => void;
}): Promise<{ sessionId: string; assistantContent: string }> {
  const request = copilotChatRequestSchema.parse(input.request);
  const limited = rateLimitFromAiPolicy(input.policyOutcome);
  if (limited.limited) {
    input.onEvent?.({ type: "rate_limited", message: limited.message });
    return { sessionId: request.session_id ?? "", assistantContent: limited.message };
  }

  const title = request.message.slice(0, 72) || "New session";
  let sessionId = request.session_id;
  if (!sessionId) {
    const created = await input.persist.createSession(title);
    sessionId = created.id;
  }
  input.onEvent?.({ type: "session", session_id: sessionId });

  const prior = request.session_id ? await input.persist.loadHistory(sessionId) : [];
  const userText = expandSlashPrompt(request.message, request.active_symbol);
  await input.persist.appendMessage({
    sessionId,
    role: "user",
    content: userText,
    tool_calls: [],
  });

  const history: ChatMessage[] = [
    { role: "system", content: COPILOT_SYSTEM_PROMPT },
    {
      role: "system",
      content: buildContextPreamble({
        activeSymbol: request.active_symbol,
        portfolioSummary: input.portfolioSummary,
      }),
    },
    ...prior
      .filter((row) => row.role === "user" || row.role === "assistant")
      .slice(-20)
      .map((row) => ({ role: row.role as "user" | "assistant", content: row.content })),
    { role: "user", content: userText },
  ];

  const execute: ToolExecutor = async (name, args) => {
    await input.persist.auditTool(name, args);
    return input.executeTool(name, args);
  };

  const result = await runOrchestratorLoop({
    messages: history,
    llm: input.llm,
    executeTool: execute,
    onEvent: input.onEvent,
  });

  await input.persist.appendMessage({
    sessionId,
    role: "assistant",
    content: result.assistantContent,
    tool_calls: result.toolCalls,
  });

  return { sessionId, assistantContent: result.assistantContent };
}
