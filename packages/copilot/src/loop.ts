import {
  COPILOT_MAX_TOOL_CALLS,
  copilotChatEventSchema,
  type CopilotChatEvent,
  type CopilotCitation,
  type CopilotToolCallRecord,
} from "@meridian/schemas";
import { extractCitations, newsMetaFromToolResults } from "./citations";
import { toolByName, type RegisteredReadTool } from "./tools";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; name: string; arguments: unknown }>;
};

export type LlmTurn = {
  content?: string;
  tool_calls?: Array<{ id: string; name: string; arguments: unknown }>;
};

export type LlmPort = {
  complete: (messages: ChatMessage[]) => Promise<LlmTurn>;
};

export type ToolExecutor = (name: string, args: unknown) => Promise<unknown>;

export type OrchestratorResult = {
  assistantContent: string;
  toolCalls: CopilotToolCallRecord[];
  citations: CopilotCitation[];
  toolCallCount: number;
};

function emit(
  onEvent: ((event: CopilotChatEvent) => void) | undefined,
  event: CopilotChatEvent,
): void {
  onEvent?.(copilotChatEventSchema.parse(event));
}

export async function runOrchestratorLoop(input: {
  messages: ChatMessage[];
  executeTool: ToolExecutor;
  llm: LlmPort;
  tools?: readonly RegisteredReadTool[];
  maxToolCalls?: number;
  onEvent?: (event: CopilotChatEvent) => void;
}): Promise<OrchestratorResult> {
  const max = input.maxToolCalls ?? COPILOT_MAX_TOOL_CALLS;
  const history = [...input.messages];
  const recorded: CopilotToolCallRecord[] = [];
  const results: unknown[] = [];
  let toolCallCount = 0;

  while (true) {
    const turn = await input.llm.complete(history);
    const calls = turn.tool_calls ?? [];
    if (calls.length === 0) {
      const content = turn.content ?? "";
      for (const chunk of chunkTokens(content)) {
        emit(input.onEvent, { type: "token", text: chunk });
      }
      const citations = extractCitations(content, newsMetaFromToolResults(results));
      emit(input.onEvent, {
        type: "message",
        role: "assistant",
        content,
        citations,
      });
      return {
        assistantContent: content,
        toolCalls: recorded,
        citations,
        toolCallCount,
      };
    }

    history.push({
      role: "assistant",
      content: turn.content ?? "",
      tool_calls: calls,
    });

    for (const call of calls) {
      if (toolCallCount >= max) {
        const content =
          "Stopped after the tool-call budget. Partial tool results are above — I will not invent missing figures.";
        emit(input.onEvent, { type: "token", text: content });
        emit(input.onEvent, {
          type: "message",
          role: "assistant",
          content,
          citations: extractCitations(content, newsMetaFromToolResults(results)),
        });
        return {
          assistantContent: content,
          toolCalls: recorded,
          citations: [],
          toolCallCount,
        };
      }
      toolCallCount += 1;
      const spec = toolByName(call.name);
      const label = spec?.label ?? `${call.name}…`;
      emit(input.onEvent, {
        type: "tool_start",
        name: call.name,
        label,
        call_id: call.id,
      });
      let parsedArgs: unknown = call.arguments;
      let result: unknown;
      let error: string | undefined;
      try {
        if (spec) {
          parsedArgs = spec.inputSchema.parse(call.arguments);
        }
        result = await input.executeTool(call.name, parsedArgs);
      } catch (caught) {
        error = caught instanceof Error ? caught.message : "TOOL_ERROR";
        result = { error };
      }
      recorded.push({
        id: call.id,
        name: call.name,
        arguments: parsedArgs,
        result,
        error,
      });
      results.push(result);
      emit(input.onEvent, {
        type: "tool_end",
        name: call.name,
        call_id: call.id,
        ok: error === undefined,
      });
      history.push({
        role: "tool",
        name: call.name,
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
}

export function chunkTokens(text: string, size = 24): string[] {
  if (text.length === 0) {
    return [];
  }
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
}
