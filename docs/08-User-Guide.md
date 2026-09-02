# Meridian — User Guide

**Version:** 1.0 (pre-release draft — finalize screenshots and any UI copy changes after the build ships)

## 1. Getting started
Sign up with email or Google. Complete the profile wizard (your experience level tunes risk guardrails). You start with a **$100,000 paper account** — all trading is simulated; no real money moves.

## 2. The workspace
Meridian is a multi-panel terminal. Open **`/workspace`**. Drag panel edges to resize, drag tabs to rearrange, and your layout is saved automatically (**Reset layout** in the top command bar). The status bar shows the market clock (America/New_York, OPEN/CLOSED) and a connection indicator.

Placeholder panels in this build: Chart, Watchlist, Order ticket, Blotter, News, Screener, Portfolio, Copilot. Their live content ships in later PBIs.

**Command palette.** Press **Ctrl+K** (or the command-bar **Ctrl+K** control). The palette shell is available now; function parsing is not. When it ships, type:
| Command | Action |
|---|---|
| `AAPL` | Fuzzy symbol search |
| `DES AAPL` | Instrument profile (fundamentals, peers, analyst ratings) |
| `GIP AAPL` | Chart |
| `NEWS TSLA` | News filtered to a symbol |
| `ORD NVDA` | Order ticket prefilled |
| `WL` / `PORT` / `SCR` | Watchlists / Portfolio / Screener |
| `AI <question>` | Ask the Copilot |

Panels are linked: clicking a symbol anywhere retargets the chart, news, DES, and order ticket.

## 3. Watchlists & charts
Create named watchlists; add symbols via typeahead. Rows show live price, change, bid/ask and a sparkline, flashing green/red on ticks. The chart offers 1D–5Y ranges, volume, and SMA/EMA/VWAP/RSI indicators; the crosshair shows OHLCV.

## 4. Trading (paper)
Open the order ticket (`ORD <symbol>` or Shift+B / Shift+S). Choose side, quantity (shares or dollars), order type (market, limit, stop, stop-limit), and time-in-force. The ticket previews estimated cost, simulated fees, and **pre-trade checks in real time** — if a rule blocks your order (e.g., size limit, concentration limit, market closed), you'll see exactly why. Advanced: **bracket orders** (entry + take-profit + stop-loss), **OCO pairs**, and **trailing stops**.

Track orders in the **Blotter** (cancel/modify from the row; rejected orders have an *Explain* link showing the exact rule that fired). The **Portfolio** panel shows positions, live P&L, allocation, and your equity curve.

## 5. Intelligence
- **News panel:** live headlines with sentiment badges; filters by symbol/event type; semantic search ("earnings beats in semis this week").
- **DES page:** company profile, key stats, financial charts, analyst ratings, peer quick-switch.
- **Screener:** build criteria (sector, P/E, yield, %change, RSI…), save screens, send results to a watchlist.
- **Alerts:** set price/%change/RSI/news alerts from any watchlist row; the bell in the status bar collects them.

## 6. Copilot (AI)
Open the Copilot panel or type `AI <question>`. It can quote prices, chart data, search news with citations, screen the market, and analyze your portfolio — everything it says is pulled live from data tools, with citation chips you can click.

It can also **act**: "add NVDA to my watchlist", "alert me if AAPL drops below 200", "buy 10 MSFT at market". Safe actions run instantly; **orders always come back as an approval card** — nothing trades without your explicit click, and approved orders still pass every risk rule. **Monitors** are standing instructions ("watch my portfolio and tell me if any position drops 5% in a day") that run continuously and alert you with an explanation. **Briefs** generate a Morning Brief, Instrument Brief, or Portfolio Health report (exportable to PDF).

Meridian Copilot provides information and analysis, not personalized financial advice.

## 7. For administrators
`/admin/rules`: edit decision tables (risk limits, fees, entitlements, AI policy) in a spreadsheet-like editor — simulate against recent activity, then publish; changes apply instantly, no deployment. `/admin/users`: role management. `/admin/audit`: tamper-evident audit trail of every action (compliance role has read-only access). `/admin/health`: feed and service status.

## 8. FAQ
**Is my money real?** No — v1 is paper trading with simulated fills (realistic slippage and partial fills).
**Why was my order rejected?** Click *Explain* on the blotter row — it shows the exact rule and values.
**Can the AI trade without me?** No. Order execution always requires your approval, enforced by a policy table admins can only tighten, not bypass silently (every AI action is audited).
**Data is delayed/stale?** A STALE watermark appears if the feed gaps; check the connection dot, or ask an admin to check /admin/health.
