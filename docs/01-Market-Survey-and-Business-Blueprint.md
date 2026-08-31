# Meridian — Market Survey & Business Blueprint

**Product:** Meridian — an AI-native, agentic trading workspace (web)
**Version:** 1.0 | **Date:** 2026-07-03 | **Scope:** US equities & ETFs, paper trading (v1)

---

## 1. Market Survey

### 1.1 Competitive landscape (2026)

| Platform | Strengths | Weaknesses | Key features to borrow |
|---|---|---|---|
| **Robinhood (+ Legend, Cortex AI)** | Simplicity, zero-commission UX, Legend desktop pro platform, Cortex AI insights | Shallow research depth, limited institutional analytics | Clean onboarding, instant order flow, AI-generated stock digests |
| **Webull (+ Vega AI)** | Pro-grade charting (50+ indicators), paper trading sandbox, screeners, Vega AI research layer | Cluttered UI, weak portfolio analytics | Paper trading engine, AI watchlist tracking & catalyst detection, technical signal interpretation |
| **Interactive Brokers (TWS)** | 170+ markets, every asset class, lowest margin rates, unrivalled order types & risk tools | Dated UX, steep learning curve | Advanced order types (bracket, trailing, OCO), risk navigator, portfolio margin concepts |
| **TradingView** | Best-in-class charts, social ideas, Pine Script programmability, screeners, alerts | Not a broker; execution via partners | Multi-pane charts, user-programmable alerts/strategies, symbol pages |
| **Bloomberg Terminal** | News + data + analytics + chat in one keyboard-driven workspace; functions (DES, GIP, WEI, TOP, PORT); unmatched breadth | $25k+/yr, legacy UI | Command palette ("functions"), multi-panel linked workspace, integrated news/analytics, portfolio analytics (PORT-style), monitors |
| **thinkorswim (Schwab)** | Options analytics, paper money, scripting (thinkScript) | Complexity | Paper-money mode parity with live, strategy testing |

### 1.2 Gap Meridian exploits
No mainstream product combines: (a) Bloomberg-style multi-panel intelligence workspace, (b) retail-grade UX, (c) a **first-class AI agent** that can research, monitor, explain, and (with guardrails) act, and (d) **fully programmable business rules** (decision tables) governing trading behavior. Meridian is designed AI-native from the schema up: every entity is agent-readable, every action is a tool the agent can call under policy control.

### 1.3 Target users & personas
- **P1 Active retail trader** — wants pro charts, fast orders, screeners, alerts.
- **P2 Research-driven investor** — wants a terminal: news, fundamentals, AI synthesis, portfolio analytics.
- **P3 Power user / quant hobbyist** — wants programmable rules, strategy automation, watchlist agents.
- **P4 Admin/Compliance (internal)** — configures business rules, risk limits, entitlements, audit review.

## 2. Business Blueprint

### 2.1 Value proposition
"A Bloomberg-grade intelligence workspace with an AI copilot that watches the market for you, explains everything, and trades under rules you define."

### 2.2 Product pillars
1. **Terminal Workspace** — multi-panel, linkable, keyboard command palette (Bloomberg-style functions: `DES AAPL`, `NEWS TSLA`, `PORT`).
2. **Trading Core** — full order lifecycle (market/limit/stop/bracket/OCO/trailing) against a paper matching engine; broker-adapter ready for live trading later.
3. **Intelligence Layer** — news, fundamentals, screeners, AI research briefs, catalyst detection, RAG over filings/news (pgvector).
4. **Agentic Copilot** — chat + autonomous monitors ("watch my portfolio, alert me if concentration > 25%"), tool-calling into every app capability, human-in-the-loop approval for orders.
5. **Programmable Governance** — decision tables & rule matrices drive validation, risk, fees, entitlements, alerts. Zero hard-coded business logic.

### 2.3 Feature map (v1 → v3)
- **v1 (this plan):** auth/KYC-lite, instruments & market data (mock feed), watchlists, charts, order ticket + paper engine, portfolio & P&L, news, screeners, alerts, AI copilot (research + explain + monitored actions), rules admin console, audit.
- **v2:** live broker adapter (Alpaca/IBKR), options chain, real market data (Polygon/Databento), social/ideas, mobile.
- **v3:** multi-market (AU/EU/Asia), FX/crypto, margin, strategy backtesting, institutional multi-user desks.

### 2.4 Business model
Freemium: free paper tier → Pro subscription (real-time data, advanced AI quota, unlimited monitors) → Enterprise (team desks, custom rule packs, SSO, audit exports). Revenue later from order-flow/broker rev-share once live trading ships.

### 2.5 Governance & compliance posture (v1)
Paper trading only ⇒ no broker-dealer licensing required. Still built to enterprise discipline: immutable audit log, entitlement matrix, suitability decision table, AI-action approval workflow, full traceability (PBI → AC → TC). This de-risks the path to a licensed v2.

### 2.6 KPIs
Activation (first watchlist + first paper order < 10 min), weekly active traders, AI copilot engagement rate, monitor-alert precision, order-ticket error rate (< 0.5%), p95 quote-to-screen latency (< 500 ms mock feed).

---

## 3. Why InsForge (chosen backend)
InsForge is agent-native: Postgres with auto-generated APIs, JWT/OAuth auth, S3-compatible storage, edge functions, realtime pub/sub, AI model gateway, and pgvector — all operable by coding agents via MCP/CLI. This matches an agentic build in Cursor (the InsForge MCP lets Cursor run migrations, deploy functions, and create buckets directly).

**Honest limits & mitigations** (see Architecture doc §9): a young platform (YC S26) — mitigate with a repository layer isolating InsForge SDK calls, plain-SQL migrations (portable to Supabase/RDS), and the paper matching engine written as portable TypeScript inside edge functions. If InsForge realtime throughput ever limits tick fan-out, swap in a thin WebSocket relay without touching app code.

---
**Sources:** [InsForge](https://insforge.dev/) · [InsForge Docs](https://docs.insforge.dev/introduction) · [InsForge GitHub](https://github.com/InsForge/InsForge) · [StockBrokers.com Webull vs Robinhood 2026](https://www.stockbrokers.com/compare/robinhood-vs-webull) · [NerdWallet Best Trading Apps 2026](https://www.nerdwallet.com/investing/best/stock-trading-apps) · [Forbes Best Online Brokers 2026](https://www.forbes.com/advisor/investing/best-online-brokers/)
