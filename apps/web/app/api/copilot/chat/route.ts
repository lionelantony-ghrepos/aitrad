import { NextResponse } from "next/server";
import { baselineTable, evaluate } from "@meridian/rules-engine";
import {
  newsSummaryLlm,
  rateLimitFromAiPolicy,
  runCopilotRequest,
  type CopilotPersistPorts,
} from "@meridian/copilot";
import { copilotChatRequestSchema, type CopilotChatEvent } from "@meridian/schemas";
import { invokeCopilotOrchestrator } from "@/lib/api/copilot";
import { executeStubReadTool } from "@/lib/copilot/execute-read-tools";
import { authorizeUser } from "@/lib/auth/authorize-user";
import { isAuthStub } from "@/lib/auth/mode";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";
import {
  stubAppendCopilotMessage,
  stubCopilotRateLimited,
  stubCountCopilotUserMessages,
  stubCreateCopilotSession,
  stubForceCopilotRateLimit,
  stubListCopilotMessages,
} from "@/lib/auth/stub-store";

function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  const token = await getAccessToken();
  if (!user || !token) {
    return NextResponse.json({ message: "You must be signed in." }, { status: 401 });
  }
  const gate = await authorizeUser({
    userId: user.id,
    token,
    action: "copilot:chat",
  });
  if (!gate.allowed) {
    return NextResponse.json({ message: "Not allowed." }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = copilotChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid chat." }, { status: 400 });
  }

  if (!isAuthStub()) {
    const env = readPublicInsforgeEnv();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          await invokeCopilotOrchestrator({
            baseUrl: env.baseUrl,
            accessToken: token,
            request: parsed.data,
            onEvent: (event) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            },
          });
        } catch (error) {
          const event: CopilotChatEvent = {
            type: "error",
            message: error instanceof Error ? error.message : "COPILOT_FAILED",
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } finally {
          controller.close();
        }
      },
    });
    return sseResponse(stream);
  }

  const persist: CopilotPersistPorts = {
    createSession: async (title) => stubCreateCopilotSession(user.id, title),
    appendMessage: async (row) =>
      stubAppendCopilotMessage({
        userId: user.id,
        sessionId: row.sessionId,
        role: row.role,
        content: row.content,
        tool_calls: row.tool_calls,
      }),
    loadHistory: async (sessionId) => stubListCopilotMessages(user.id, sessionId),
    auditTool: async () => {
      return;
    },
  };

  const messagesToday = stubCountCopilotUserMessages(user.id);
  const clock = new Date();
  const policyOutcome = stubCopilotRateLimited(user.id)
    ? evaluate(baselineTable("DT-AI-01"), { tool: "chat", messages_today: 10_000 }, clock).outcome
    : evaluate(baselineTable("DT-AI-01"), { tool: "chat", messages_today: messagesToday }, clock)
        .outcome;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: CopilotChatEvent): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        const limited = rateLimitFromAiPolicy(policyOutcome);
        if (limited.limited) {
          emit({ type: "rate_limited", message: limited.message });
          return;
        }
        await runCopilotRequest({
          request: parsed.data,
          policyOutcome,
          llm: newsSummaryLlm(),
          executeTool: (name, args) => executeStubReadTool({ name, args, userId: user.id }),
          persist,
          onEvent: emit,
        });
      } catch (error) {
        emit({
          type: "error",
          message: error instanceof Error ? error.message : "COPILOT_FAILED",
        });
      } finally {
        controller.close();
      }
    },
  });
  return sseResponse(stream);
}

/** E2E helper: next chat for this user is rate-limited via DT-AI-01 evaluation. */
export async function PUT(): Promise<NextResponse> {
  if (!isAuthStub()) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "You must be signed in." }, { status: 401 });
  }
  stubForceCopilotRateLimit(user.id);
  return NextResponse.json({ ok: true });
}
