"use client";

import { useCallback, useEffect, useState } from "react";
import {
  generateBriefAction,
  listBriefsAction,
  setMorningBriefOptInAction,
} from "@/app/actions/briefs";
import { BriefCard } from "@/components/workspace/brief-card";
import type { Brief, BriefKind } from "@meridian/schemas";

export function CopilotBriefsTab(): React.JSX.Element {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Brief[]>([]);
  const [busy, setBusy] = useState(false);
  const [optIn, setOptIn] = useState(false);

  const refresh = useCallback(async () => {
    const result = await listBriefsAction();
    if (!result.ok) {
      setStatus("error");
      setError(result.message);
      return;
    }
    setRows(result.data);
    setStatus("ready");
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function generate(kind: BriefKind): Promise<void> {
    setBusy(true);
    const result = await generateBriefAction({ kind });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await refresh();
  }

  if (status === "loading") {
    return (
      <p className="text-muted-foreground" data-testid="copilot-briefs-loading">
        Loading briefs…
      </p>
    );
  }
  if (status === "error") {
    return (
      <p className="text-down" data-testid="copilot-briefs-error">
        {error}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto" data-testid="copilot-briefs">
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="border border-primary px-1 text-primary"
          data-testid="brief-generate-morning"
          disabled={busy}
          onClick={() => {
            void generate("morning");
          }}
        >
          Morning Brief
        </button>
        <button
          type="button"
          className="border border-primary px-1 text-primary"
          data-testid="brief-generate-portfolio"
          disabled={busy}
          onClick={() => {
            void generate("portfolio");
          }}
        >
          Portfolio Health
        </button>
        <button
          type="button"
          className="border border-primary px-1 text-primary"
          data-testid="brief-generate-instrument"
          disabled={busy}
          onClick={() => {
            void generate("instrument");
          }}
        >
          Instrument Brief
        </button>
      </div>
      <label className="flex items-center gap-1 text-muted-foreground">
        <input
          type="checkbox"
          data-testid="brief-morning-opt-in"
          checked={optIn}
          onChange={(event) => {
            const next = event.target.checked;
            setOptIn(next);
            void setMorningBriefOptInAction(next);
          }}
        />
        Morning brief at simulated open
      </label>
      {rows.length === 0 ? (
        <p className="text-muted-foreground" data-testid="copilot-briefs-empty">
          No briefs yet. Generate a Morning Brief, Instrument Brief, or Portfolio Health report.
        </p>
      ) : (
        rows.map((row) => <BriefCard key={row.id} brief={row} />)
      )}
    </div>
  );
}
