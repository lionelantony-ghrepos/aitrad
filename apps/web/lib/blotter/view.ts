import { canCancel } from "@meridian/paper-engine";
import {
  blotterFiltersSchema,
  blotterTabSchema,
  type BlotterFilters,
  type BlotterTab,
  type ExecutionRecord,
  type OrderRecord,
  type OrderStatus,
} from "@meridian/schemas";

export const WORKING_STATUSES: readonly OrderStatus[] = ["accepted", "working", "partially_filled"];

export type BlotterRow = {
  order: OrderRecord;
  depth: 0 | 1;
  hasChildren: boolean;
  parentId: string | null;
};

export function parseBlotterTab(value: string): BlotterTab {
  return blotterTabSchema.parse(value);
}

export function emptyBlotterFilters(): BlotterFilters {
  return blotterFiltersSchema.parse({
    symbol: "",
    side: "all",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });
}

export function tabIncludesStatus(tab: BlotterTab, status: OrderStatus): boolean {
  if (tab === "all") {
    return true;
  }
  if (tab === "working") {
    return WORKING_STATUSES.includes(status);
  }
  if (tab === "filled") {
    return status === "filled";
  }
  return status === "rejected";
}

export function orderMatchesFilters(order: OrderRecord, filters: BlotterFilters): boolean {
  const parsed = blotterFiltersSchema.parse(filters);
  const symbol = parsed.symbol.trim().toUpperCase();
  if (symbol && !order.symbol.toUpperCase().includes(symbol)) {
    return false;
  }
  if (parsed.side !== "all" && order.side !== parsed.side) {
    return false;
  }
  if (parsed.status !== "all" && order.status !== parsed.status) {
    return false;
  }
  const created = Date.parse(order.created_at);
  if (parsed.dateFrom) {
    const from = Date.parse(parsed.dateFrom);
    if (!Number.isNaN(from) && created < from) {
      return false;
    }
  }
  if (parsed.dateTo) {
    const to = Date.parse(parsed.dateTo);
    if (!Number.isNaN(to)) {
      const end = parsed.dateTo.length <= 10 ? to + 24 * 60 * 60 * 1000 - 1 : to;
      if (created > end) {
        return false;
      }
    }
  }
  return true;
}

export function avgFillPx(orderId: string, executions: readonly ExecutionRecord[]): number | null {
  let qty = 0;
  let notional = 0;
  for (const fill of executions) {
    if (fill.order_id !== orderId) {
      continue;
    }
    qty += fill.qty;
    notional += fill.qty * fill.price;
  }
  if (qty <= 0) {
    return null;
  }
  return notional / qty;
}

export function canModifyOrder(status: OrderStatus): boolean {
  return canCancel(status);
}

function groupSortKey(order: OrderRecord): string {
  if (order.leg_role === "entry") {
    return "0";
  }
  return `1-${order.created_at}-${order.id}`;
}

export function buildBlotterTree(orders: readonly OrderRecord[]): BlotterRow[] {
  const groups = new Map<string, OrderRecord[]>();
  const singles: OrderRecord[] = [];
  for (const order of orders) {
    if (order.group_id) {
      const bucket = groups.get(order.group_id) ?? [];
      bucket.push(order);
      groups.set(order.group_id, bucket);
    } else {
      singles.push(order);
    }
  }

  const roots: BlotterRow[] = [];
  const childrenByParent = new Map<string, BlotterRow[]>();

  for (const members of groups.values()) {
    const sorted = members.slice().sort((a, b) => groupSortKey(a).localeCompare(groupSortKey(b)));
    const parent = sorted[0];
    if (!parent) {
      continue;
    }
    const kids = sorted.slice(1);
    roots.push({
      order: parent,
      depth: 0,
      hasChildren: kids.length > 0,
      parentId: null,
    });
    childrenByParent.set(
      parent.id,
      kids.map((order) => ({
        order,
        depth: 1 as const,
        hasChildren: false,
        parentId: parent.id,
      })),
    );
  }

  for (const order of singles) {
    roots.push({ order, depth: 0, hasChildren: false, parentId: null });
  }

  roots.sort((a, b) => b.order.created_at.localeCompare(a.order.created_at));

  const out: BlotterRow[] = [];
  for (const root of roots) {
    out.push(root);
    const kids = childrenByParent.get(root.order.id);
    if (kids) {
      out.push(...kids);
    }
  }
  return out;
}

export function filterBlotterRows(
  orders: readonly OrderRecord[],
  tab: BlotterTab,
  filters: BlotterFilters,
): BlotterRow[] {
  const tree = buildBlotterTree(orders);
  const keep = new Set<string>();
  for (const row of tree) {
    if (tabIncludesStatus(tab, row.order.status) && orderMatchesFilters(row.order, filters)) {
      keep.add(row.order.id);
      if (row.parentId) {
        keep.add(row.parentId);
      }
      if (row.hasChildren) {
        for (const child of tree) {
          if (child.parentId === row.order.id) {
            keep.add(child.order.id);
          }
        }
      }
    }
  }
  return tree.filter((row) => keep.has(row.order.id));
}

export function blotterCsvRows(
  rows: readonly BlotterRow[],
  executions: readonly ExecutionRecord[],
): string[][] {
  const header = [
    "time",
    "symbol",
    "side",
    "type",
    "qty",
    "filled_qty",
    "avg_fill_px",
    "limit",
    "stop",
    "tif",
    "status",
    "reject_reason",
  ];
  const body = rows.map((row) => {
    const avg = avgFillPx(row.order.id, executions);
    return [
      row.order.created_at,
      row.order.symbol,
      row.order.side,
      row.order.order_type,
      String(row.order.qty),
      String(row.order.filled_qty),
      avg == null ? "" : avg.toFixed(4),
      row.order.limit_price == null ? "" : String(row.order.limit_price),
      row.order.stop_price == null ? "" : String(row.order.stop_price),
      row.order.tif,
      row.order.status,
      row.order.reject_reason ?? "",
    ];
  });
  return [header, ...body];
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows
    .map((line) =>
      line
        .map((cell) => {
          if (/[",\n]/.test(cell)) {
            return `"${cell.replaceAll('"', '""')}"`;
          }
          return cell;
        })
        .join(","),
    )
    .join("\n");
}
