"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { AuditLog } from "@meridian/schemas";
import { auditAdminAction } from "@/app/actions/audit-admin";
import { Button } from "@/components/ui/button";

function payloadPreview(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return "{}";
  }
}

export function AuditAdminConsole(props: { canWrite: boolean }): React.JSX.Element {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [verify, setVerify] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<AuditLog[] | null>(null);
  const [retention, setRetention] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setBusy(true);
    const res = await auditAdminAction({
      op: "list",
      user_id: userId.trim() || undefined,
      entity_type: entityType.trim() || undefined,
      entity_id: entityId.trim() || undefined,
      action: action.trim() || undefined,
      from: from.trim() || undefined,
      to: to.trim() || undefined,
      limit: 200,
      offset: 0,
    });
    setBusy(false);
    if (res.status !== 200) {
      setError("Unable to load audit log.");
      setRows([]);
      return;
    }
    const body = res.body as { rows: AuditLog[]; total: number };
    setError(null);
    setRows(body.rows);
    setTotal(body.total);
  }, [action, entityId, entityType, from, to, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 16,
  });

  const items = virtualizer.getVirtualItems();
  const chainLabel = useMemo(() => verify ?? "not verified this session", [verify]);

  async function onVerify(): Promise<void> {
    const res = await auditAdminAction({
      op: "verify",
      from: from.trim() || undefined,
      to: to.trim() || undefined,
    });
    if (res.status !== 200) {
      setVerify("verify failed");
      return;
    }
    const body = res.body as { ok: boolean; reason: string | null; checked: number };
    setVerify(body.ok ? `ok · ${body.checked} rows` : `BROKEN · ${body.reason ?? "mismatch"}`);
  }

  async function onExport(): Promise<void> {
    const res = await auditAdminAction({
      op: "export",
      user_id: userId.trim() || undefined,
      entity_type: entityType.trim() || undefined,
      entity_id: entityId.trim() || undefined,
      action: action.trim() || undefined,
      from: from.trim() || undefined,
      to: to.trim() || undefined,
    });
    if (res.status !== 200) {
      setError("Export failed.");
      return;
    }
    const csv = (res.body as { csv: string }).csv;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onTimeline(row: AuditLog): Promise<void> {
    if (!row.entity_id) {
      return;
    }
    const res = await auditAdminAction({
      op: "timeline",
      entity_type: row.entity_type,
      entity_id: row.entity_id,
    });
    if (res.status !== 200) {
      setError("Timeline failed.");
      return;
    }
    setTimeline((res.body as { rows: AuditLog[] }).rows);
  }

  async function onSaveRetention(): Promise<void> {
    const days = retention.trim() === "" ? null : Number(retention);
    const res = await auditAdminAction({
      op: "setRetention",
      days: days === null || Number.isNaN(days) ? null : days,
    });
    if (res.status !== 200) {
      setError("Retention update denied.");
    }
  }

  if (error && rows.length === 0) {
    return (
      <p className="p-4 text-sm text-destructive" data-testid="audit-error">
        {error}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3" data-testid="audit-admin">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <input
          className="border border-border bg-background px-2 py-1 font-mono text-xs tabular-nums"
          placeholder="user id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          data-testid="audit-filter-user"
        />
        <input
          className="border border-border bg-background px-2 py-1 font-mono text-xs"
          placeholder="entity type"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          data-testid="audit-filter-entity"
        />
        <input
          className="border border-border bg-background px-2 py-1 font-mono text-xs tabular-nums"
          placeholder="entity id"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        />
        <input
          className="border border-border bg-background px-2 py-1 font-mono text-xs"
          placeholder="action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          data-testid="audit-filter-action"
        />
        <input
          className="border border-border bg-background px-2 py-1 font-mono text-xs tabular-nums"
          placeholder="from ISO"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          data-testid="audit-filter-from"
        />
        <input
          className="border border-border bg-background px-2 py-1 font-mono text-xs tabular-nums"
          placeholder="to ISO"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => void load()} disabled={busy}>
          Filter
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void onVerify()}>
          Verify chain
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="audit-export"
          onClick={() => void onExport()}
        >
          Export CSV
        </Button>
        <span className="font-mono text-[11px] text-muted-foreground" data-testid="audit-chain">
          chain: {chainLabel}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {total} rows
        </span>
        {props.canWrite ? (
          <span className="ml-auto flex items-center gap-1" data-testid="audit-retention">
            <input
              className="w-20 border border-border bg-background px-2 py-1 font-mono text-xs tabular-nums"
              placeholder="days"
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onSaveRetention()}
            >
              Save retention
            </Button>
          </span>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="audit-empty">
          No audit rows.
        </p>
      ) : (
        <div ref={parentRef} className="min-h-0 flex-1 overflow-auto border border-border">
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {items.map((item) => {
              const row = rows[item.index];
              if (!row) {
                return null;
              }
              return (
                <button
                  key={row.id}
                  type="button"
                  className="absolute left-0 flex w-full items-center gap-3 border-b border-border px-2 text-left text-xs hover:bg-muted/40"
                  style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                  data-testid="audit-row"
                  onClick={() => void onTimeline(row)}
                >
                  <span className="w-40 shrink-0 font-mono tabular-nums text-muted-foreground">
                    {row.created_at}
                  </span>
                  <span className="w-40 shrink-0 font-mono text-primary">{row.action}</span>
                  <span className="w-28 shrink-0">{row.entity_type}</span>
                  <span className="min-w-0 flex-1 truncate font-mono tabular-nums text-muted-foreground">
                    {payloadPreview(row.payload)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {timeline ? (
        <div className="border border-border p-2" data-testid="audit-timeline">
          <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Entity timeline
          </p>
          {timeline.map((row) => (
            <p key={row.id} className="font-mono text-xs tabular-nums">
              {row.created_at} · {row.action}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
