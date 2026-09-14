/**
 * Mutating product surfaces that must write audit_log (PBI-029 / AC-029-02).
 * Paths are repo-root relative. Preview/evaluate-only ops are omitted.
 */
export const MUTATING_AUDIT_SOURCES = [
  { id: "provision-account", path: "insforge/functions/provision-account.ts" },
  { id: "order-service", path: "insforge/functions/order-service-src.ts" },
  { id: "matching-runner", path: "insforge/functions/matching-runner-src.ts" },
  { id: "rules-service", path: "insforge/functions/rules-service-src.ts" },
  { id: "admin-users", path: "insforge/functions/admin-users-src.ts" },
  { id: "analytics-service", path: "insforge/functions/analytics-service-src.ts" },
  { id: "screener", path: "insforge/functions/screener-src.ts" },
  { id: "market-tick", path: "insforge/functions/market-tick-src.ts" },
  { id: "news-ticker", path: "insforge/functions/news-ticker-src.ts" },
  { id: "alert-runner", path: "insforge/functions/alert-runner-src.ts" },
  { id: "embed-worker", path: "insforge/functions/embed-worker-src.ts" },
  { id: "search-news", path: "insforge/functions/search-news-src.ts" },
  { id: "copilot-orchestrator", path: "insforge/functions/copilot-orchestrator-src.ts" },
  { id: "monitor-runner", path: "insforge/functions/monitor-runner-src.ts" },
  { id: "brief-service", path: "insforge/functions/brief-service-src.ts" },
  { id: "audit-service", path: "insforge/functions/audit-service-src.ts" },
  { id: "watchlists-actions", path: "apps/web/app/actions/watchlists.ts" },
  { id: "alerts-actions", path: "apps/web/app/actions/alerts.ts" },
  { id: "screener-actions", path: "apps/web/app/actions/screener.ts" },
  { id: "monitors-actions", path: "apps/web/app/actions/monitors.ts" },
  { id: "briefs-actions", path: "apps/web/app/actions/briefs.ts" },
  { id: "auth-actions", path: "apps/web/app/actions/auth.ts" },
] as const;
