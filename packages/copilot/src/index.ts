export const packageName = "@meridian/copilot" as const;

export { COPILOT_SYSTEM_PROMPT, buildContextPreamble } from "./prompt";
export {
  READ_TOOLS,
  WRITE_TOOLS,
  READ_TOOL_LABELS,
  WRITE_TOOL_LABELS,
  openaiToolSpecs,
  toolByName,
  isWriteTool,
  type RegisteredReadTool,
  type RegisteredWriteTool,
  type RegisteredTool,
} from "./tools";
export {
  runOrchestratorLoop,
  chunkTokens,
  extractActionFromToolResult,
  type ChatMessage,
  type LlmPort,
  type LlmTurn,
  type OrchestratorResult,
  type ToolExecutor,
} from "./loop";
export { scriptedLlm, newsSummaryLlm, actionAwareLlm } from "./fake-llm";
export {
  handleWriteToolCall,
  decidePersistedAction,
  evaluateWritePolicyBaseline,
  writeDecisionFromOutcome,
  writePolicyContext,
  parseWriteToolArgs,
  orderNotionalFromPayload,
  type WriteActionPorts,
  type WriteExecuteResult,
} from "./write-actions";
export { summarizeCopilotAction, summarizeWritePayload } from "./write-summary";
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
export {
  assertOwnedCopilotSession,
  persistOwnedCopilotAction,
  COPILOT_SESSION_NOT_FOUND,
} from "./session-access";
export {
  assertOwnedWatchlist,
  insertOwnedWatchlistItemAsAdmin,
  COPILOT_WATCHLIST_NOT_FOUND,
  type AdminWatchlistWritePorts,
} from "./watchlist-access";
