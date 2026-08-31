# Meridian — Mock Data & Seeding Specification

**Version:** 1.0 | **Date:** 2026-07-03
Static source files live in `mock-data/` (already generated, seed 42, deterministic):

| File | Contents |
|---|---|
| `instruments.json` | 150 US equities & ETFs: symbol, name, exchange, sector, industry, status, currency, tick_size, lot_size, base_price, market_cap_band, beta_class, avg_volume, avg_volume_band |
| `fundamentals.json` | Sector-plausible metrics per instrument (P/E, EPS, revenue, growth, margins, dividend yield, shares out, 52w range, analyst ratings, next earnings; ETFs: expense ratio, AUM) |
| `news-templates.json` | Headline templates by event_type (earnings/analyst/product/macro/regulatory/mna) with sentiment ranges + fill vocabularies |
| `demo-users.json` | 4 demo users (trader/novice/admin/compliance, password `Meridian!Demo1`), demo trader portfolio (6 positions, $34,550 cash) and 3 watchlists |

## 1. Price history generator (`@meridian/mock-data`, PBI-005)
Seeded geometric Brownian motion per instrument, deterministic for a given `(symbol, seed)`:
- `S(t+1) = S(t) · exp((μ − σ²/2)Δt + σ√Δt · Z)` with Z from a seeded PRNG (mulberry32 hashed with symbol).
- Annualized σ by beta_class: low 0.15, medium 0.28, high 0.55 (× DT-SIM-01 `vol_multiplier`). μ drawn once per symbol from N(0.06, 0.08).
- Daily bars: 5 years (~1,255 trading days) ending at seed date, anchored so the final close ≈ `base_price` (generate backward or rescale).
- Intraday: last 5 trading days × 390 one-minute bars, Brownian bridge within each day's OHLC so 1m aggregates match the daily bar.
- Gap events: per DT-SIM-01, prob 0.02/day, magnitude uniform 1–6% (sign random), applied at open.
- Volume: log-normal around avg_volume, ×(1 + 2·|return z-score|).
- OHLC invariants enforced: `l ≤ min(o,c) ≤ max(o,c) ≤ h`; prices rounded to tick_size.

## 2. Live feed (PBI-006)
`market-tick` continues the same GBM per tick while calendar OPEN; news-sentiment shocks nudge drift per DT-SIM-01. Test controls in `feature_flags`: `feed.paused`, `feed.speed`, `feed.force_price:{symbol,price}` (consumed once).

## 3. News generation (PBI-019)
Seeded generator picks instrument (weighted by market_cap_band), event_type (weights: analyst .3, earnings .2, macro .2, product .15, regulatory .1, mna .05), fills template slots, draws sentiment uniformly from the template range, emits body of 2–3 templated sentences. 500 items backfilled over the past 30 days at seed; live: 1–5 per simulated 5 min.

## 4. Seed pipeline (`scripts/seed-all.ts`)
Idempotent, ordered: 1) instruments 2) market calendar (NYSE 2026 sessions incl. half-days 11/27, 12/24) 3) daily+1m bars (batched inserts) 4) quotes_latest from last bars 5) rule tables from doc 05 §6 (publish v1) 6) fundamentals 7) 500 news items + embeddings backfill 8) demo users via auth admin API + roles + accounts 9) demo portfolio (positions + synthetic historical executions that produce those exact avg costs, so audit/blotter history is coherent) 10) watchlists 11) verification report (counts vs expectations, printed and non-zero exit on mismatch).

## 5. Expected post-seed counts (used by TC-005-01)
instruments 150 · daily bars ≈ 188k (150×~1255) · 1m bars 292,500 (150×1950) · decision tables 12 published · news 500 (embeddings 500) · users 4 · demo positions 6 · watchlists 3.
