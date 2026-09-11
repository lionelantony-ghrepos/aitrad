export const packageName = "@meridian/copilot" as const;

export { COPILOT_SYSTEM_PROMPT, buildContextPreamble } from "./prompt";
export {
  READ_TOOLS,
  READ_TOOL_LABELS,
  openaiToolSpecs,
  toolByName,
  type RegisteredReadTool,
} from "./tools";
export {
  runOrchestratorLoop,
  chunkTokens,
  type ChatMessage,
  type LlmPort,
  type LlmTurn,
  type OrchestratorResult,
  type ToolExecutor,
} from "./loop";
export { scriptedLlm, newsSummaryLlm } from "./fake-llm";
export { extractCitations, newsMetaFromToolResults, splitMarkdownCitations } from "./citations";
export { extractFigures, ungroundedFigures, assertGroundedOrThrow } from "./grounding";
export { evaluateCopilotRateLimit, rateLimitFromAiPolicy } from "./rate-limit";
export { COPILOT_SLASH_SUGGESTIONS, expandSlashPrompt, matchingSlashSuggestions } from "./slash";
export {
  DEFAULT_OPENROUTER_CHAT_MODEL,
  DEFAULT_OPENROUTER_CHAT_URL,
  openRouterLlm,
} from "./gateway";
export { runCopilotRequest, type CopilotPersistPorts } from "./run-request";
export { assertOwnedCopilotSession, COPILOT_SESSION_NOT_FOUND } from "./session-access";
