"use client";

import { useCopilotDraft } from "@/lib/copilot-draft";

export function CopilotPanel(): React.JSX.Element {
  const query = useCopilotDraft((s) => s.query);
  const setQuery = useCopilotDraft((s) => s.setQuery);
  return (
    <div
      className="flex h-full flex-col gap-1 overflow-auto bg-background p-1 text-xs text-muted-foreground"
      data-testid="panel-copilot"
    >
      <p>Copilot</p>
      <label className="sr-only" htmlFor="copilot-input">
        Copilot question
      </label>
      <input
        id="copilot-input"
        data-testid="copilot-input"
        className="w-full border border-input bg-background px-2 py-1 font-mono text-sm text-foreground outline-none"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        placeholder="Ask a question…"
      />
    </div>
  );
}
