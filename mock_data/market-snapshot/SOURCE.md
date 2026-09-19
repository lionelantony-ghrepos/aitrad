# Frozen market snapshot (Path A offline replay)

- **As-of (UTC):** 2026-09-17T14:32:09.008Z
- **Status:** captured
- **Source:** Yahoo Finance v8 chart API (quotes / OHLC / 52-week meta) plus public headlines (RSS titles when available, otherwise Yahoo search news titles). Mapped into Meridian seed tables; this is not a vendor dump.
- **Tests / CI / `pnpm seed:all`:** replay this directory **offline**. Gates must not hit Yahoo (ToS + flake). Live HTTP is `pnpm market:freeze` (or `overlay-live-market.mjs --live`) only.

## Symbol universe

Priority (news; first 8 also get 1m bars): AAPL MSFT NVDA AMD AVGO TSM PLTR SNOW DDOG NET JPM XOM SPY QQQ TSLA AMZN GOOGL META

Quotes / latest daily bar / 52-week ranges: seeded instruments from `mock_data/instruments.json` that Yahoo returned.

Ticker aliases (Meridian → Yahoo): SQ→XYZ.

Captured symbols (150): AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSLA, AVGO, BRK.B, JPM, V, MA, LLY, UNH, XOM, JNJ, WMT, PG, HD, COST, ORCL, KO, PEP, BAC, ABBV, CVX, MRK, ADBE, CRM, NFLX, AMD, INTC, QCOM, TXN, MU, AMAT, LRCX, KLAC, ASML, TSM, CSCO, IBM, ACN, NOW, INTU, SNOW, PLTR, DDOG, NET, CRWD, PANW, ZS, FTNT, SHOP, SQ, PYPL, COIN, HOOD, GS, MS, WFC, C, SCHW, BLK, AXP, SPGI, ICE, CME, PGR, ALL, MET, PFE, BMY, AMGN, GILD, VRTX, REGN, MRNA, BIIB, ISRG, MDT, ABT, SYK, BSX, TMO, DHR, CVS, CI, HUM, MCD, SBUX, CMG, NKE, LULU, TJX, LOW, TGT, DG, BKNG, ABNB, MAR, UBER, DASH, F, GM, DIS, CMCSA, T, VZ, TMUS, SPOT, RBLX, EA, TTWO, PINS, BA, LMT, RTX, NOC, GE, CAT, DE, HON, UPS, FDX, UNP, DAL, UAL, COP, SLB, EOG, OXY, NEE, DUK, SO, LIN, FCX, NEM, PLD, AMT, SPY, QQQ, IWM, DIA, XLK, XLF, XLE, GLD, TLT, VTI

Failed / skipped symbols: (none)

## Data ranges / intervals

| Dataset | Yahoo range | interval | Stored |
| --- | --- | --- | --- |
| quotes + latest daily OHLC | 5d | 1d | last, prev_close, bid/ask (±1 tick), volume, latest 1d bar |
| 52-week high/low | chart meta | — | `fundamentals.metrics.ranges.week52_*` |
| 1m bars | 1d | 1m | AAPL, MSFT, NVDA, AMD, AVGO, TSM, PLTR, SNOW |
| news | RSS or search titles | — | up to 4 headlines per priority symbol |

Counts: quotes=150 dailyBars=149 minuteBars=504 fundamentalsRanges=150 news=72.

## News bodies

Headlines are public titles. **Bodies are original two-sentence summaries** written for the paper terminal — not reprints of source articles. Treat as delayed public information for paper trading only.

## Refresh (live Yahoo, not CI)

```bash
pnpm market:freeze
git add mock_data/market-snapshot
git commit -m "chore: refresh frozen market snapshot"
```

Then Path A / Docker: `pnpm seed:all` applies the snapshot offline. Optional live DB apply without rewriting fixtures: `node scripts/overlay-live-market.mjs --live`.
