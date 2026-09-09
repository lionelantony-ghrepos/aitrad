# Meridian — User Guide

**Version:** 1.0 (pre-release draft — finalize screenshots and any UI copy changes after the build ships)

## 1. Getting started
Open **`/signup`** (email + password) or **`/login`**. Google OAuth is available on both pages. After the first sign-in, complete the **profile wizard** (`/onboarding`): display name, experience level (novice / intermediate / advanced), and optional objectives. Experience is stored for later risk/suitability rules; the suitability tier is not set during this wizard.

You receive a **paper cash account** on first login (amount comes from the opening-account seed policy — all trading is simulated; no real money moves). Open **`/workspace`** once the wizard is done. The command-bar **user menu** shows your email and paper cash; **Log out** returns you to `/login`. Reloading the workspace keeps you signed in. Visiting `/workspace` while signed out sends you to `/login`.

## 2. The workspace
Meridian is a multi-panel terminal. Open **`/workspace`**. Drag panel edges to resize, drag tabs to rearrange, and your layout is saved automatically (**Reset layout** in the top command bar). The status bar shows the market clock (America/New_York, OPEN/CLOSED) and a connection indicator.

Placeholder panels in this build: Blotter, News, Screener, Portfolio, Copilot (input only), Description (`DES`). **Watchlist** (PBI-007), **Chart** (PBI-008), and **Order ticket** (PBI-013) are live. `DES <symbol>` opens the Description placeholder until fundamentals ship.

**Linked symbol.** The workspace exposes a shared symbol context. Clicking a watchlist row sets it (debug readout for tests: `symbol-context-readout`) and retargets the Chart panel.

**Command palette.** Press **Ctrl+K** (or the command-bar **Ctrl+K** control). Type a function or ticker, then Enter. Recent commands appear when the box is empty. Arrow keys move the highlight. Examples:
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
Open the **Watchlist** panel. **Create** a named list (tabs along the top). Type a ticker in **Add symbol** and pick a match. Rows show last, net change, % change, volume, bid/ask, and a 30-point sparkline. Last ticks flash green on up / red on down. Click a column header to sort. Click a row to set the linked symbol for other panels. Right-click a row → **Remove**. The selected list is stored with your workspace layout.

The **Chart** panel loads candlesticks and volume for the linked symbol. Use the range buttons (**1D** uses 1-minute bars; **1W**–**5Y** use daily bars). Toggle SMA 20/50/200, EMA 12/26, VWAP, and RSI 14 (RSI opens a sub-pane). The crosshair legend shows OHLCV plus any enabled indicator values. Live ticks update the current candle. If no symbol is selected, the panel asks you to pick one from the watchlist.

## 4. Trading (paper)
Open the **Order ticket** (`ORD <symbol>`, or **Shift+B** / **Shift+S** to prefill Buy/Sell). The ticket follows the linked symbol. Choose side (green Buy / red Sell), quantity as **shares** or **notional** (dollars converted at the live last), type (market, limit, stop, stop-limit, or trailing stop), optional limit/stop/trail fields, and TIF (DAY / GTC / IOC). The **Bracket** tab places an entry plus take-profit and stop-loss legs; offsets show live TP/SL prices against the last. Buying power is the paper cash on the account.

As you edit, a preview runs automatically: each pre-trade check (validation, risk, and market hours) shows pass or fail with the rule reason, plus estimated fees and total. **Submit** stays disabled until every blocking check passes. Confirm opens a summary that repeats those totals; confirming sends the order to paper. If create returns a **rejected** order, the confirm dialog stays open and shows the rule reason plus the rule audit ID when one is present. Market orders while the NYSE session is **CLOSED** are rejected; limit, stop, and stop-limit orders are queued for the open. Paper cash is reserved when a buy is accepted so two overlapping orders cannot spend the same buying power. Working orders fill against the next mock ticks (market with simulated slippage, limits when the last crosses, stops on trigger including gaps). Partial fills can occur when size exceeds the symbol’s liquidity band. After a bracket entry fills, the take-profit and stop-loss become working; filling one cancels the other. A trailing stop ratchets with the market and never loosens. The **Blotter** panel lists working and filled legs (including bracket status). Full blotter cancel/explain UI is PBI-017.

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
`/admin/rules`: entitlement-gated spreadsheet editor (draft, side-by-side diff, history/rollback, simulate against recent `rule_audit` contexts, searchable evaluation traces). Publish applies immediately with no deploy. Traders are denied. `/admin/users`: role management. `/admin/audit`: tamper-evident audit trail of every action (compliance role has read-only access). `/admin/health`: feed and service status.

## 8. FAQ
**Is my money real?** No — v1 is paper trading with simulated fills (realistic slippage and partial fills).
**Why was my order rejected?** Click *Explain* on the blotter row — it shows the exact rule and values.
**Can the AI trade without me?** No. Order execution always requires your approval, enforced by a policy table admins can only tighten, not bypass silently (every AI action is audited).
**Data is delayed/stale?** A STALE watermark appears if the feed gaps; check the connection dot, or ask an admin to check /admin/health.
