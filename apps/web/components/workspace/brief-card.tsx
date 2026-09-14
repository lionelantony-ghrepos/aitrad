"use client";

import { splitMarkdownCitations } from "@meridian/copilot";
import type { Brief, CopilotCitation } from "@meridian/schemas";
import { exportBriefPdfAction } from "@/app/actions/briefs";
import { focusPanel } from "@/lib/command-palette/focus-panel";
import { useNewsFocus } from "@/lib/news/focus";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";
import { useState } from "react";

export function BriefCard(props: { brief: Brief }): React.JSX.Element {
  const { dockApi } = useWorkspaceRuntime();
  const setActiveSymbol = useSymbolContext((s) => s.setActiveSymbol);
  const setNewsItem = useNewsFocus((s) => s.setItem);
  const [error, setError] = useState<string | null>(null);
  const citations = splitMarkdownCitations(props.brief.content_md, []).flatMap((part) =>
    part.type === "citation" ? [part.citation] : [],
  );
  const parts = splitMarkdownCitations(props.brief.content_md, citations);

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
        body: citation.headline ?? "Open from brief citation.",
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

  async function exportPdf(): Promise<void> {
    const result = await exportBriefPdfAction(props.brief.id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    window.open(result.data.download_url, "_blank", "noopener,noreferrer");
  }

  const title =
    props.brief.kind === "morning"
      ? "Morning Brief"
      : props.brief.kind === "instrument"
        ? `Instrument Brief · ${props.brief.subject}`
        : "Portfolio Health";

  return (
    <article
      className="border border-border p-1"
      data-testid={`brief-card-${props.brief.kind}`}
      data-brief-id={props.brief.id}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-primary">{title}</p>
        <button
          type="button"
          className="border border-primary px-1 text-primary"
          data-testid={`brief-export-${props.brief.id}`}
          onClick={() => {
            void exportPdf();
          }}
        >
          Export PDF
        </button>
      </div>
      <div className="whitespace-pre-wrap font-mono tabular-nums" data-testid="brief-markdown">
        {parts.map((part, index) => {
          if (part.type === "text") {
            return <span key={index}>{part.text}</span>;
          }
          return (
            <button
              key={`${part.citation.kind}-${part.citation.id}-${index}`}
              type="button"
              className="mx-0.5 border border-primary px-1 text-primary"
              data-testid="brief-citation"
              data-kind={part.citation.kind}
              onClick={() => {
                openCitation(part.citation);
              }}
            >
              {part.citation.kind === "news" ? "news" : part.citation.symbol}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-down" data-testid="brief-export-error">
          {error}
        </p>
      ) : null}
    </article>
  );
}
