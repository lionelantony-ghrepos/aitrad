import { z } from "zod";
import type { ChatMessage, LlmPort, LlmTurn } from "./loop";
import { openaiToolSpecs } from "./tools";

export const DEFAULT_OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_OPENROUTER_CHAT_MODEL = "openai/gpt-4.1-mini";

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z
          .object({
            content: z.string().nullable().optional(),
            tool_calls: z
              .array(
                z.object({
                  id: z.string(),
                  function: z.object({
                    name: z.string(),
                    arguments: z.string(),
                  }),
                }),
              )
              .optional(),
          })
          .optional(),
      }),
    )
    .min(1),
});

function toOpenAiMessages(messages: ChatMessage[]): unknown[] {
  return messages.map((row) => {
    if (row.role === "tool") {
      return {
        role: "tool",
        content: row.content,
        tool_call_id: row.tool_call_id,
        name: row.name,
      };
    }
    if (row.role === "assistant" && row.tool_calls && row.tool_calls.length > 0) {
      return {
        role: "assistant",
        content: row.content || null,
        tool_calls: row.tool_calls.map((call) => ({
          id: call.id,
          type: "function",
          function: {
            name: call.name,
            arguments: JSON.stringify(call.arguments ?? {}),
          },
        })),
      };
    }
    return { role: row.role, content: row.content };
  });
}

export function openRouterLlm(input: {
  apiKey: string;
  model?: string;
  url?: string;
  fetchImpl?: typeof fetch;
}): LlmPort {
  const fetchImpl = input.fetchImpl ?? fetch;
  return {
    async complete(messages: ChatMessage[]): Promise<LlmTurn> {
      const response = await fetchImpl(input.url ?? DEFAULT_OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.model ?? DEFAULT_OPENROUTER_CHAT_MODEL,
          messages: toOpenAiMessages(messages),
          tools: openaiToolSpecs(),
        }),
      });
      const raw: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`GATEWAY_${response.status}`);
      }
      const parsed = completionSchema.parse(raw);
      const message = parsed.choices[0]?.message;
      const toolCalls = (message?.tool_calls ?? []).map((call) => {
        let args: unknown = {};
        try {
          args = JSON.parse(call.function.arguments) as unknown;
        } catch {
          args = {};
        }
        return { id: call.id, name: call.function.name, arguments: args };
      });
      return {
        content: message?.content ?? "",
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    },
  };
}
