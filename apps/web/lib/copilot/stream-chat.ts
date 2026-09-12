import { parseSseBlock } from "@/lib/api/copilot";
import {
  copilotChatRequestSchema,
  type CopilotChatEvent,
  type CopilotChatRequest,
} from "@meridian/schemas";

export async function streamCopilotChat(input: {
  request: CopilotChatRequest;
  onEvent: (event: CopilotChatEvent) => void;
}): Promise<void> {
  const payload = copilotChatRequestSchema.parse(input.request);
  const response = await fetch("/api/copilot/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) {
    throw new Error(response.status === 403 ? "Not allowed." : "COPILOT_UNAVAILABLE");
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
}
