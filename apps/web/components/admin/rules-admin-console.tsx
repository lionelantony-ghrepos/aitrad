"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  enumOptionsForInput,
  groupTablesByDomain,
  inferConditionCellKind,
  reorderDecisionRows,
} from "@meridian/rules-engine";
import type {
  CatalogTableItem,
  DecisionCondition,
  DecisionRow,
  DecisionTable,
  RulesAdminGetTableResponse,
  SimulateResult,
  TableHistoryItem,
  RuleAuditView,
} from "@meridian/schemas";
import { rulesAdminAction, rulesEvaluateAction } from "@/app/actions/rules-admin";
import { Button } from "@/components/ui/button";

type TabId = "editor" | "diff" | "history" | "simulate" | "audit";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "editor", label: "Editor" },
  { id: "diff", label: "Diff" },
  { id: "history", label: "History" },
  { id: "simulate", label: "Simulate" },
  { id: "audit", label: "Audit" },
];

export function RulesAdminConsole(): React.JSX.Element {
  const [catalog, setCatalog] = useState<CatalogTableItem[]>([]);
  const [tableKey, setTableKey] = useState("DT-RISK-01");
  const [detail, setDetail] = useState<RulesAdminGetTableResponse | null>(null);
  const [draft, setDraft] = useState<DecisionTable | null>(null);
  const [tab, setTab] = useState<TabId>("editor");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState<SimulateResult | null>(null);
  const [history, setHistory] = useState<TableHistoryItem[]>([]);
  const [audits, setAudits] = useState<RuleAuditView[]>([]);
  const [auditQuery, setAuditQuery] = useState("");
  const [probeNotional, setProbeNotional] = useState("2000");
  const [probeOutcome, setProbeOutcome] = useState<string>("");
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);

  const grouped = useMemo(() => groupTablesByDomain(catalog), [catalog]);

  const loadCatalog = useCallback(async () => {
    const res = await rulesAdminAction({ op: "listCatalog" });
    if (res.status !== 200) {
      setError("Unable to load rule tables.");
      return;
    }
    setCatalog((res.body as { tables: CatalogTableItem[] }).tables);
  }, []);

  const loadTable = useCallback(async (key: string) => {
    const res = await rulesAdminAction({ op: "getTable", tableKey: key });
    if (res.status !== 200) {
      setError("Unable to load table.");
      return;
    }
    const body = res.body as RulesAdminGetTableResponse;
    setDetail(body);
    setDraft(body.draft);
    setPublishedVersion(body.publishedVersion);
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    void loadTable(tableKey);
  }, [loadTable, tableKey]);

  async function saveDraft(): Promise<void> {
    if (!draft) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await rulesAdminAction({ op: "saveDraft", tableKey, table: draft });
    setBusy(false);
    if (res.status !== 200) {
      setError("Save failed.");
      return;
    }
    setDetail(res.body as RulesAdminGetTableResponse);
  }

  async function publish(): Promise<void> {
    setBusy(true);
    setError(null);
    if (draft) {
      const saved = await rulesAdminAction({ op: "saveDraft", tableKey, table: draft });
      if (saved.status !== 200) {
        setBusy(false);
        setError("Save failed.");
        return;
      }
    }
    const res = await rulesAdminAction({ op: "publish", tableKey });
    setBusy(false);
    if (res.status !== 200) {
      setError("Publish failed.");
      return;
    }
    const body = res.body as { version: number };
    setPublishedVersion(body.version);
    await loadTable(tableKey);
    await loadCatalog();
  }

  async function runSimulate(): Promise<void> {
    if (draft) {
      await rulesAdminAction({ op: "saveDraft", tableKey, table: draft });
    }
    const res = await rulesAdminAction({ op: "simulate", tableKey });
    if (res.status !== 200) {
      setError("Simulate failed.");
      return;
    }
    setSim(res.body as SimulateResult);
  }

  async function loadHistory(): Promise<void> {
    const res = await rulesAdminAction({ op: "listHistory", tableKey });
    if (res.status === 200) {
      setHistory((res.body as { versions: TableHistoryItem[] }).versions);
    }
  }

  async function loadAudits(): Promise<void> {
    const res = await rulesAdminAction({ op: "listAudits", query: auditQuery });
    if (res.status === 200) {
      setAudits((res.body as { audits: RuleAuditView[] }).audits);
    }
  }

  async function rollback(version: number): Promise<void> {
    const res = await rulesAdminAction({ op: "rollback", tableKey, version });
    if (res.status !== 200) {
      setError("Rollback failed.");
      return;
    }
    const body = res.body as { version: number };
    setPublishedVersion(body.version);
    await loadTable(tableKey);
    await loadHistory();
  }

  async function probe(): Promise<void> {
    const notional = Number(probeNotional);
    const res = await rulesEvaluateAction({
      domain: "pre_trade_risk",
      context: {
        order_notional: Number.isFinite(notional) ? notional : 0,
        exceeds_buying_power: false,
        position_pct_post: 1,
        experience_level: "advanced",
        orders_today: 1,
        instrument_beta_class: "low",
        side: "buy",
        exceeds_position_qty: false,
      },
    });
    if (res.status !== 200) {
      setProbeOutcome("error");
      return;
    }
    setProbeOutcome(JSON.stringify((res.body as { outcome: unknown }).outcome));
  }

  function updateRow(index: number, next: DecisionRow): void {
    if (!draft) {
      return;
    }
    const rows = draft.rows.map((row, i) => (i === index ? next : row));
    setDraft({ ...draft, rows });
  }

  function addRow(): void {
    if (!draft) {
      return;
    }
    const id = String(Date.now());
    setDraft({
      ...draft,
      rows: [
        ...draft.rows,
        { id, priority: draft.rows.length + 1, conditions: [], outputs: { decision: "allow" } },
      ],
    });
  }

  function removeRow(index: number): void {
    if (!draft) {
      return;
    }
    setDraft({
      ...draft,
      rows: reorderDecisionRows(
        draft.rows.filter((_, i) => i !== index),
        0,
        0,
      ),
    });
  }

  return (
    <div className="flex min-h-0 flex-1" data-testid="rules-admin">
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-border p-3">
        <p className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Tables
        </p>
        {grouped.length === 0 ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          grouped.map((group) => (
            <div key={group.domain} className="mb-3">
              <p className="text-[10px] text-accent">{group.domain}</p>
              {group.tables.map((item) => (
                <button
                  key={item.tableKey}
                  type="button"
                  data-testid={`table-${item.tableKey}`}
                  className={`mt-1 block w-full px-2 py-1 text-left font-mono text-[11px] ${
                    item.tableKey === tableKey ? "bg-secondary text-primary" : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    setTableKey(item.tableKey);
                    setSim(null);
                  }}
                >
                  {item.tableKey}
                </button>
              ))}
            </div>
          ))
        )}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          {TABS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={tab === item.id ? "default" : "outline"}
              data-testid={`tab-${item.id}`}
              onClick={() => {
                setTab(item.id);
                if (item.id === "history") {
                  void loadHistory();
                }
                if (item.id === "audit") {
                  void loadAudits();
                }
              }}
            >
              {item.label}
            </Button>
          ))}
          <span
            className="ml-auto font-mono text-[11px] tabular-nums"
            data-testid="published-version"
          >
            v{publishedVersion ?? "—"}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="save-draft"
            disabled={busy}
            onClick={() => void saveDraft()}
          >
            Save draft
          </Button>
          <Button
            type="button"
            size="sm"
            data-testid="publish"
            disabled={busy}
            onClick={() => void publish()}
          >
            Publish
          </Button>
        </header>
        {error ? (
          <p className="px-3 py-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {tab === "editor" && draft ? (
            <EditorGrid
              table={draft}
              onAdd={addRow}
              onRemove={removeRow}
              onReorder={(from, to) => {
                setDraft({ ...draft, rows: reorderDecisionRows(draft.rows, from, to) });
              }}
              onChangeRow={updateRow}
            />
          ) : null}
          {tab === "diff" && detail ? <DiffView detail={detail} /> : null}
          {tab === "history" ? (
            <HistoryView versions={history} onRollback={(v) => void rollback(v)} />
          ) : null}
          {tab === "simulate" ? (
            <SimulateView
              result={sim}
              onRun={() => void runSimulate()}
              probeNotional={probeNotional}
              onProbeNotional={setProbeNotional}
              onProbe={() => void probe()}
              probeOutcome={probeOutcome}
            />
          ) : null}
          {tab === "audit" ? (
            <AuditView
              query={auditQuery}
              onQuery={setAuditQuery}
              onSearch={() => void loadAudits()}
              audits={audits}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function EditorGrid({
  table,
  onAdd,
  onRemove,
  onReorder,
  onChangeRow,
}: {
  table: DecisionTable;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onChangeRow: (index: number, row: DecisionRow) => void;
}): React.JSX.Element {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  if (table.rows.length === 0) {
    return (
      <div>
        <p className="text-xs text-muted-foreground">No rows.</p>
        <Button type="button" size="sm" className="mt-2" onClick={onAdd}>
          Add row
        </Button>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          Add row
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="p-1">#</th>
              <th className="p-1">Conditions</th>
              <th className="p-1">Outputs</th>
              <th className="p-1" />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr
                key={row.id}
                className="border-b border-border"
                draggable
                onDragStart={() => {
                  setDragFrom(index);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => {
                  if (dragFrom !== null) {
                    onReorder(dragFrom, index);
                  }
                  setDragFrom(null);
                }}
              >
                <td className="p-1 tabular-nums text-muted-foreground">{row.priority}</td>
                <td className="p-1">
                  <div className="flex flex-col gap-1">
                    {row.conditions.map((cell, cellIndex) => (
                      <ConditionCell
                        key={`${row.id}-${cell.input}-${cellIndex}`}
                        rowId={row.id}
                        cell={cell}
                        onChange={(next) => {
                          const conditions = row.conditions.map((c, i) =>
                            i === cellIndex ? next : c,
                          );
                          onChangeRow(index, { ...row, conditions });
                        }}
                      />
                    ))}
                  </div>
                </td>
                <td className="p-1 font-mono tabular-nums">{JSON.stringify(row.outputs)}</td>
                <td className="p-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(index)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConditionCell({
  rowId,
  cell,
  onChange,
}: {
  rowId: string;
  cell: DecisionCondition;
  onChange: (next: DecisionCondition) => void;
}): React.JSX.Element {
  const kind = inferConditionCellKind(cell.input, cell.op);
  const testId = `cell-${rowId}-${cell.input}`;
  if (kind === "enum") {
    const options = enumOptionsForInput(cell.input);
    return (
      <label className="flex items-center gap-1">
        <span className="text-muted-foreground">{cell.input}</span>
        <select
          data-testid={testId}
          className="border border-input bg-background px-1"
          value={String(cell.value ?? "")}
          onChange={(event) => onChange({ ...cell, value: event.target.value })}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (kind === "range" && Array.isArray(cell.value)) {
    const low = Number(cell.value[0] ?? 0);
    const high = Number(cell.value[1] ?? 0);
    return (
      <label className="flex items-center gap-1">
        <span className="text-muted-foreground">{cell.input}</span>
        <input
          data-testid={testId}
          className="w-20 border border-input bg-background px-1 tabular-nums"
          type="number"
          value={low}
          onChange={(event) => onChange({ ...cell, value: [Number(event.target.value), high] })}
        />
        <input
          className="w-20 border border-input bg-background px-1 tabular-nums"
          type="number"
          value={high}
          onChange={(event) => onChange({ ...cell, value: [low, Number(event.target.value)] })}
        />
      </label>
    );
  }
  if (kind === "number") {
    return (
      <label className="flex items-center gap-1">
        <span className="text-muted-foreground">
          {cell.input} {cell.op}
        </span>
        <input
          data-testid={testId}
          className="w-28 border border-input bg-background px-1 tabular-nums"
          type="number"
          value={typeof cell.value === "number" ? cell.value : Number(cell.value ?? 0)}
          onChange={(event) => onChange({ ...cell, value: Number(event.target.value) })}
        />
      </label>
    );
  }
  return (
    <label className="flex items-center gap-1">
      <span className="text-muted-foreground">{cell.input}</span>
      <input
        data-testid={testId}
        className="border border-input bg-background px-1"
        value={String(cell.value ?? "")}
        onChange={(event) => onChange({ ...cell, value: event.target.value })}
      />
    </label>
  );
}

function DiffView({ detail }: { detail: RulesAdminGetTableResponse }): React.JSX.Element {
  const { diff, published, draft } = detail;
  return (
    <div className="grid gap-3 md:grid-cols-2" data-testid="diff-view">
      <div>
        <p className="mb-1 text-[10px] text-muted-foreground">Published</p>
        <pre className="overflow-auto border border-border bg-card p-2 font-mono text-[10px]">
          {JSON.stringify(published?.rows ?? [], null, 2)}
        </pre>
      </div>
      <div>
        <p className="mb-1 text-[10px] text-muted-foreground">Draft</p>
        <pre className="overflow-auto border border-border bg-card p-2 font-mono text-[10px]">
          {JSON.stringify(draft?.rows ?? [], null, 2)}
        </pre>
      </div>
      <p className="md:col-span-2 font-mono text-[11px]">
        changed: {diff.changedRowIds.join(",") || "none"} added:{" "}
        {diff.addedRowIds.join(",") || "none"}
      </p>
    </div>
  );
}

function HistoryView({
  versions,
  onRollback,
}: {
  versions: TableHistoryItem[];
  onRollback: (version: number) => void;
}): React.JSX.Element {
  if (versions.length === 0) {
    return <p className="text-xs text-muted-foreground">No history loaded.</p>;
  }
  return (
    <ul className="space-y-2" data-testid="history-list">
      {versions.map((row) => (
        <li
          key={row.version}
          className="flex items-center justify-between border border-border px-2 py-1"
        >
          <span className="font-mono text-[11px] tabular-nums">
            v{row.version} {row.status}
          </span>
          {row.status !== "published" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRollback(row.version)}
            >
              Rollback
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SimulateView({
  result,
  onRun,
  probeNotional,
  onProbeNotional,
  onProbe,
  probeOutcome,
}: {
  result: SimulateResult | null;
  onRun: () => void;
  probeNotional: string;
  onProbeNotional: (value: string) => void;
  onProbe: () => void;
  probeOutcome: string;
}): React.JSX.Element {
  return (
    <div>
      <Button type="button" size="sm" data-testid="simulate-run" onClick={onRun}>
        Replay last audits
      </Button>
      {result ? (
        <div className="mt-3">
          <p className="font-mono text-sm tabular-nums" data-testid="simulate-agreement">
            agreement {result.agreementPct}% ({result.sampleSize} samples)
          </p>
          <ul className="mt-2 space-y-1 font-mono text-[11px]">
            {result.deltas.map((delta) => (
              <li key={delta.auditId} className="border border-border px-2 py-1">
                {delta.auditId}: {JSON.stringify(delta.publishedOutcome)} →{" "}
                {JSON.stringify(delta.draftOutcome)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Run a simulation to see deltas.</p>
      )}
      <div className="mt-6 border-t border-border pt-3">
        <p className="mb-2 text-[10px] text-muted-foreground">Probe published evaluation</p>
        <input
          data-testid="probe-notional"
          className="mr-2 w-28 border border-input bg-background px-1 tabular-nums"
          value={probeNotional}
          onChange={(event) => onProbeNotional(event.target.value)}
        />
        <Button type="button" size="sm" data-testid="probe-evaluate" onClick={onProbe}>
          Evaluate
        </Button>
        <p className="mt-2 font-mono text-[11px]" data-testid="probe-outcome">
          {probeOutcome}
        </p>
      </div>
    </div>
  );
}

function AuditView({
  query,
  onQuery,
  onSearch,
  audits,
}: {
  query: string;
  onQuery: (value: string) => void;
  onSearch: () => void;
  audits: RuleAuditView[];
}): React.JSX.Element {
  return (
    <div>
      <div className="mb-2 flex gap-2">
        <input
          data-testid="audit-query"
          className="border border-input bg-background px-2 py-1 text-xs"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search traces"
        />
        <Button type="button" size="sm" onClick={onSearch}>
          Search
        </Button>
      </div>
      {audits.length === 0 ? (
        <p className="text-xs text-muted-foreground">No matching audits.</p>
      ) : (
        <ul className="space-y-2" data-testid="audit-list">
          {audits.map((row) => (
            <li key={row.id} className="border border-border p-2 font-mono text-[10px]">
              <p>
                {row.domain} {row.id}
              </p>
              <pre className="mt-1 overflow-auto">
                {JSON.stringify({ context: row.context, outcome: row.outcome }, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
