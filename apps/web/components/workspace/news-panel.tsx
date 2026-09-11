"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { listNewsAction, searchNewsAction } from "@/app/actions/news";
import type { NewsEventType, NewsItem, NewsSearchHit } from "@meridian/schemas";
import { NEWS_EVENT_TYPES, filterNewsItems } from "@/lib/news/filter";
import { sentimentMixPct, sentimentTone } from "@/lib/news/sentiment";
import {
  createInsforgeNewsTransport,
  createWindowNewsTransport,
  mergeNewsItems,
} from "@/lib/news/transport";
import { useNewsFocus } from "@/lib/news/focus";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";

function formatTs(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("en-US", { hour12: false, timeZone: "America/New_York" });
}

export function NewsPanel(props: IDockviewPanelProps): React.JSX.Element {
  const { e2eFeed } = useWorkspaceRuntime();
  const activeSymbol = useSymbolContext((s) => s.activeSymbol);
  const transport = useMemo(
    () => (e2eFeed ? createWindowNewsTransport() : createInsforgeNewsTransport()),
    [e2eFeed],
  );
  const [items, setItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [allMarkets, setAllMarkets] = useState(false);
  const [eventTypes, setEventTypes] = useState<NewsEventType[]>([]);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const focusedNews = useNewsFocus((s) => s.item);
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<NewsSearchHit[] | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const result = await listNewsAction();
    if (!result.ok) {
      setStatus("error");
      setError(result.message);
      return;
    }
    setItems(result.data);
    setStatus("ready");
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (focusedNews) {
      setSelected(focusedNews);
    }
  }, [focusedNews]);

  useEffect(() => {
    return transport.subscribe((batch) => {
      setItems((current) => mergeNewsItems(current, batch.items));
    });
  }, [transport]);

  const visible = useMemo(
    () =>
      filterNewsItems(items, {
        allMarkets,
        symbol: activeSymbol,
        eventTypes,
      }),
    [items, allMarkets, activeSymbol, eventTypes],
  );

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  function toggleType(type: NewsEventType): void {
    setEventTypes((current) =>
      current.includes(type) ? current.filter((row) => row !== type) : [...current, type],
    );
  }

  async function runSearch(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const next = query.trim();
    if (next.length === 0) {
      setSearchHits(null);
      setSearchStatus("idle");
      setSearchError(null);
      return;
    }
    setSearchStatus("loading");
    const result = await searchNewsAction({
      query: next,
      symbols: allMarkets || !activeSymbol ? undefined : [activeSymbol],
    });
    if (!result.ok) {
      setSearchStatus("error");
      setSearchError(result.message);
      setSearchHits(null);
      return;
    }
    setSearchHits(result.data);
    setSearchStatus("ready");
    setSearchError(null);
  }

  const searching = searchHits !== null || searchStatus === "loading" || searchStatus === "error";

  return (
    <div
      className="relative flex h-full flex-col gap-1 overflow-hidden bg-background p-1 text-xs text-foreground"
      data-testid="panel-news"
      data-dock-id={props.api.id}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-primary">News</p>
        <p className="font-mono text-primary" data-testid="news-symbol">
          {activeSymbol ?? ""}
        </p>
      </div>
      <form className="flex items-center gap-1" onSubmit={(event) => void runSearch(event)}>
        <input
          className="min-w-0 flex-1 border border-border bg-background px-1 text-foreground"
          data-testid="news-semantic-input"
          placeholder="earnings beats in semis this week"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <button
          type="submit"
          className="border border-primary px-1 text-primary"
          data-testid="news-semantic-submit"
        >
          Search
        </button>
        {searching ? (
          <button
            type="button"
            className="border border-border px-1 text-muted-foreground"
            data-testid="news-semantic-clear"
            onClick={() => {
              setQuery("");
              setSearchHits(null);
              setSearchStatus("idle");
              setSearchError(null);
            }}
          >
            Clear
          </button>
        ) : null}
      </form>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-muted-foreground">
          <input
            type="checkbox"
            checked={allMarkets}
            data-testid="news-all-markets"
            onChange={(event) => {
              setAllMarkets(event.target.checked);
            }}
          />
          All markets
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {NEWS_EVENT_TYPES.map((type) => {
          const on = eventTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              className={`border px-1 ${on ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              data-testid={`news-event-filter-${type}`}
              onClick={() => {
                toggleType(type);
              }}
            >
              {type}
            </button>
          );
        })}
      </div>
      {searchStatus === "loading" ? (
        <p className="text-muted-foreground" data-testid="news-search-loading">
          Searching…
        </p>
      ) : null}
      {searchStatus === "error" ? (
        <p className="text-down" data-testid="news-search-error">
          {searchError}
        </p>
      ) : null}
      {searchStatus === "ready" && searchHits && searchHits.length === 0 ? (
        <p className="text-muted-foreground" data-testid="news-search-empty">
          No matching headlines.
        </p>
      ) : null}
      {searchHits && searchHits.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-auto" data-testid="news-search-results">
          {searchHits.map((item, index) => {
            const tone = sentimentTone(item.sentiment);
            const mix = sentimentMixPct(item.sentiment);
            return (
              <button
                key={item.id}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 border-b border-border px-1 py-1 text-left"
                data-testid={`news-search-row-${item.id}`}
                data-rank={String(index)}
                data-symbols={item.symbols.join(",")}
                onClick={() => {
                  setSelected(item);
                }}
              >
                <span className="flex w-full items-center gap-1">
                  <span
                    className="font-mono tabular-nums text-primary"
                    data-testid="news-search-score"
                  >
                    {item.score.toFixed(3)}
                  </span>
                  <span
                    className="px-1 font-mono tabular-nums"
                    data-testid="news-sentiment"
                    data-tone={tone}
                    data-score={String(item.sentiment)}
                    style={{
                      background: `color-mix(in srgb, var(--up) ${mix}%, var(--down))`,
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {item.sentiment.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">{item.event_type}</span>
                  <span className="ml-auto font-mono tabular-nums text-muted-foreground">
                    {formatTs(item.ts)}
                  </span>
                </span>
                <span className="line-clamp-2 text-foreground">{item.headline}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          {status === "loading" ? (
            <p className="text-muted-foreground" data-testid="news-loading">
              Loading news…
            </p>
          ) : null}
          {status === "error" ? (
            <p className="text-down" data-testid="news-error">
              {error}
            </p>
          ) : null}
          {status === "ready" && visible.length === 0 ? (
            <p className="text-muted-foreground" data-testid="news-empty">
              {allMarkets || activeSymbol
                ? "No headlines for this filter."
                : "Select a symbol or enable All markets."}
            </p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto" ref={parentRef} data-testid="news-stream">
            <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
              {virtualizer.getVirtualItems().map((row) => {
                const item = visible[row.index];
                if (!item) {
                  return null;
                }
                const tone = sentimentTone(item.sentiment);
                const mix = sentimentMixPct(item.sentiment);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="absolute left-0 right-0 flex w-full flex-col items-start gap-0.5 border-b border-border px-1 py-1 text-left"
                    style={{ transform: `translateY(${row.start}px)` }}
                    data-testid={`news-row-${item.id}`}
                    data-symbols={item.symbols.join(",")}
                    onClick={() => {
                      setSelected(item);
                    }}
                  >
                    <span className="flex w-full items-center gap-1">
                      <span
                        className="px-1 font-mono tabular-nums"
                        data-testid="news-sentiment"
                        data-tone={tone}
                        data-score={String(item.sentiment)}
                        style={{
                          background: `color-mix(in srgb, var(--up) ${mix}%, var(--down))`,
                          color: "var(--primary-foreground)",
                        }}
                      >
                        {item.sentiment.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">{item.event_type}</span>
                      <span className="ml-auto font-mono tabular-nums text-muted-foreground">
                        {formatTs(item.ts)}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-foreground">{item.headline}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      {selected ? (
        <div
          className="absolute inset-0 z-10 flex justify-end bg-background/80"
          data-testid="news-drawer"
        >
          <div className="flex h-full w-[min(100%,320px)] flex-col gap-2 border-l border-border bg-card p-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-primary">{selected.headline}</p>
              <button
                type="button"
                className="border border-border px-1 text-muted-foreground"
                data-testid="news-drawer-close"
                onClick={() => {
                  setSelected(null);
                }}
              >
                Close
              </button>
            </div>
            <p className="font-mono tabular-nums text-muted-foreground">{formatTs(selected.ts)}</p>
            <p className="text-muted-foreground">
              {selected.source} · {selected.event_type} · {selected.symbols.join(", ")}
            </p>
            <p data-testid="news-drawer-body">{selected.body}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
