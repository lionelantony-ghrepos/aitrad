"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listCopilotSessionsAction, loadCopilotSessionAction } from "@/app/actions/copilot";
import { focusPanel } from "@/lib/command-palette/focus-panel";
import { streamCopilotChat } from "@/lib/copilot/stream-chat";
import { useCopilotDraft } from "@/lib/copilot-draft";
import { useNewsFocus } from "@/lib/news/focus";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";
import { matchingSlashSuggestions, splitMarkdownCitations } from "@meridian/copilot";
import type {
  CopilotCitation,
  CopilotChatEvent,
  CopilotMessage,
  CopilotSession,
} from "@meridian/schemas";

type ChatRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: CopilotCitation[];
};

export function CopilotPanel(): React.JSX.Element {
  const { dockApi } = useWorkspaceRuntime();
  const query = useCopilotDraft((s) => s.query);
  const setQuery = useCopilotDraft((s) => s.setQuery);
  const activeSymbol = useSymbolContext((s) => s.activeSymbol);
  const setActiveSymbol = useSymbolContext((s) => s.setActiveSymbol);
  const setNewsItem = useNewsFocus((s) => s.setItem);
  const [sessions, setSessions] = useState<CopilotSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);

  const slashes = useMemo(() => matchingSlashSuggestions(query), [query]);

  const refreshSessions = useCallback(async () => {
    const result = await listCopilotSessionsAction();
    if (!result.ok) {
      setStatus("error");
      setError(result.message);
      return;
    }
    setSessions(result.data);
    setStatus("ready");
    setError(null);
  }, []);

  useEffect(() => {
    setStatus("loading");
    void refreshSessions();
  }, [refreshSessions]);

  async function openSession(id: string): Promise<void> {
    setSessionId(id);
    const result = await loadCopilotSessionAction(id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRows(
      result.data.messages
        .filter((row) => row.role === "user" || row.role === "assistant")
        .map((row) => toRow(row)),
    );
  }

  function openCitation(citation: CopilotCitation): void {
    if (citation.kind === "des" && citation.symbol) {
      setActiveSymbol(citation.symbol);
      if (dockApi) {
        focusPanel(dockApi, "des");
      }
      return;
    }
    if (citation.kind === "news") {
      setNewsItem({
        id: citation.id,
        ts: new Date().toISOString(),
        headline: citation.headline ?? "Cited headline",
        body: citation.headline ?? "Open from Copilot citation.",
        source: "citation",
        symbols: citation.symbol ? [citation.symbol] : [],
        sector: null,
        sentiment: 0,
        event_type: "macro",
      });
      if (dockApi) {
        focusPanel(dockApi, "news");
      }
    }
  }

  async function send(text: string): Promise<void> {
    const message = text.trim();
    if (message.length === 0 || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setStreaming("");
    setActivity(null);
    setRows((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: message, citations: [] },
    ]);
    try {
      await streamCopilotChat({
        request: {
          session_id: sessionId ?? undefined,
          message,
          active_symbol: activeSymbol ?? undefined,
        },
        onEvent: (event: CopilotChatEvent) => {
          if (event.type === "session") {
            setSessionId(event.session_id);
          }
          if (event.type === "tool_start") {
            setActivity(event.label);
          }
          if (event.type === "tool_end") {
            setActivity(null);
          }
          if (event.type === "token") {
            setStreaming((current) => current + event.text);
          }
          if (event.type === "message") {
            setStreaming("");
            setRows((current) => [
              ...current,
              {
                id: `asst-${Date.now()}`,
                role: "assistant",
                content: event.content,
                citations: event.citations,
              },
            ]);
          }
          if (event.type === "rate_limited") {
            setError(event.message);
          }
          if (event.type === "error") {
            setError(event.message);
          }
        },
      });
      await refreshSessions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "COPILOT_FAILED");
    } finally {
      setBusy(false);
      setActivity(null);
    }
  }

  return (
    <div
      className="flex h-full overflow-hidden bg-background text-xs text-foreground"
      data-testid="panel-copilot"
    >
      <aside
        className="flex w-28 shrink-0 flex-col gap-1 border-r border-border p-1"
        data-testid="copilot-sessions"
      >
        <button
          type="button"
          className="border border-primary px-1 text-primary"
          data-testid="copilot-new-session"
          onClick={() => {
            setSessionId(null);
            setRows([]);
          }}
        >
          New
        </button>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground" data-testid="copilot-sessions-empty">
            No sessions
          </p>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`truncate border px-1 text-left ${
                session.id === sessionId ? "border-primary text-primary" : "border-border"
              }`}
              data-testid={`copilot-session-${session.id}`}
              onClick={() => {
                void openSession(session.id);
              }}
            >
              {session.title}
            </button>
          ))
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-1">
        <p className="text-primary">Copilot</p>
        {status === "loading" ? (
          <p className="text-muted-foreground" data-testid="copilot-loading">
            Loading sessions…
          </p>
        ) : null}
        {status === "error" && rows.length === 0 ? (
          <p className="text-down" data-testid="copilot-error">
            {error}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-auto" data-testid="copilot-messages">
          {rows.length === 0 && !streaming ? (
            <p className="text-muted-foreground" data-testid="copilot-empty">
              Ask a question. Prices come from tools only.
            </p>
          ) : null}
          {rows.map((row) => (
            <article
              key={row.id}
              className="mb-2 border-b border-border pb-1"
              data-testid={`copilot-msg-${row.role}`}
            >
              <p className="text-muted-foreground">{row.role}</p>
              <MessageBody content={row.content} citations={row.citations} onCite={openCitation} />
            </article>
          ))}
          {streaming ? (
            <p className="whitespace-pre-wrap" data-testid="copilot-stream">
              {streaming}
            </p>
          ) : null}
        </div>
        {activity ? (
          <p className="text-primary" data-testid="copilot-activity">
            {activity}
          </p>
        ) : null}
        {error && rows.length > 0 ? (
          <p className="text-down" data-testid="copilot-error">
            {error}
          </p>
        ) : null}
        {activeSymbol ? (
          <button
            type="button"
            className="w-fit border border-border px-1 text-primary"
            data-testid="copilot-ask-symbol"
            onClick={() => {
              void send(`summarize ${activeSymbol} news today`);
            }}
          >
            Ask about {activeSymbol}
          </button>
        ) : null}
        {slashes.length > 0 ? (
          <ul className="border border-border p-1" data-testid="copilot-slash-list">
            {slashes.map((row) => (
              <li key={row.command}>
                <button
                  type="button"
                  className="text-primary"
                  onClick={() => {
                    setQuery(`${row.command} `);
                  }}
                >
                  {row.command} — {row.hint}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="sr-only" htmlFor="copilot-input">
          Copilot question
        </label>
        <form
          className="flex gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            void send(query);
          }}
        >
          <input
            id="copilot-input"
            data-testid="copilot-input"
            className="min-w-0 flex-1 border border-input bg-background px-2 py-1 font-mono text-sm text-foreground outline-none"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Ask a question…"
          />
          <button
            type="submit"
            className="border border-primary px-2 text-primary"
            data-testid="copilot-send"
            disabled={busy}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function toRow(row: CopilotMessage): ChatRow {
  const citations =
    row.role === "assistant"
      ? splitMarkdownCitations(row.content, []).flatMap((part) =>
          part.type === "citation" ? [part.citation] : [],
        )
      : [];
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    citations,
  };
}

function MessageBody(props: {
  content: string;
  citations: CopilotCitation[];
  onCite: (citation: CopilotCitation) => void;
}): React.JSX.Element {
  const parts = splitMarkdownCitations(props.content, props.citations);
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.text}</span>;
        }
        return (
          <button
            key={`${part.citation.kind}-${part.citation.id}-${index}`}
            type="button"
            title={part.citation.headline ?? part.citation.label}
            className="mx-0.5 border border-primary px-1 tabular-nums text-primary"
            data-testid="copilot-citation"
            data-kind={part.citation.kind}
            data-id={part.citation.id}
            onClick={() => {
              props.onCite(part.citation);
            }}
          >
            {part.citation.kind === "news" ? "news" : part.citation.symbol}
          </button>
        );
      })}
    </div>
  );
}
