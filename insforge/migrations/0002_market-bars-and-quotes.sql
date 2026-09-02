-- 0002 · market_bars, quotes_latest, instrument generator columns
-- Idempotent. Do not wrap in BEGIN/COMMIT.

ALTER TABLE public.instruments
  ADD COLUMN IF NOT EXISTS market_cap_band TEXT,
  ADD COLUMN IF NOT EXISTS beta_class TEXT,
  ADD COLUMN IF NOT EXISTS avg_volume NUMERIC(20, 8),
  ADD COLUMN IF NOT EXISTS avg_volume_band TEXT,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(20, 8);

ALTER TABLE public.instruments DROP CONSTRAINT IF EXISTS instruments_market_cap_band_chk;
ALTER TABLE public.instruments
  ADD CONSTRAINT instruments_market_cap_band_chk CHECK (
    market_cap_band IS NULL
    OR market_cap_band IN ('mega', 'large', 'mid', 'small', 'micro')
  );

ALTER TABLE public.instruments DROP CONSTRAINT IF EXISTS instruments_beta_class_chk;
ALTER TABLE public.instruments
  ADD CONSTRAINT instruments_beta_class_chk CHECK (
    beta_class IS NULL
    OR beta_class IN ('low', 'medium', 'high')
  );

ALTER TABLE public.instruments DROP CONSTRAINT IF EXISTS instruments_avg_volume_band_chk;
ALTER TABLE public.instruments
  ADD CONSTRAINT instruments_avg_volume_band_chk CHECK (
    avg_volume_band IS NULL
    OR avg_volume_band IN ('low', 'medium', 'high')
  );

CREATE TABLE IF NOT EXISTS public.market_bars (
  instrument_id UUID NOT NULL REFERENCES public.instruments (id) ON DELETE CASCADE,
  timeframe TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  o NUMERIC(20, 8) NOT NULL,
  h NUMERIC(20, 8) NOT NULL,
  l NUMERIC(20, 8) NOT NULL,
  c NUMERIC(20, 8) NOT NULL,
  v NUMERIC(20, 8) NOT NULL,
  CONSTRAINT market_bars_pkey PRIMARY KEY (instrument_id, timeframe, ts),
  CONSTRAINT market_bars_timeframe_chk CHECK (timeframe IN ('1m', '1d')),
  CONSTRAINT market_bars_volume_non_negative CHECK (v >= 0),
  CONSTRAINT market_bars_ohlc_chk CHECK (
    l > 0
    AND l <= LEAST(o, c)
    AND h >= GREATEST(o, c)
  )
);

CREATE TABLE IF NOT EXISTS public.quotes_latest (
  instrument_id UUID PRIMARY KEY REFERENCES public.instruments (id) ON DELETE CASCADE,
  bid NUMERIC(20, 8) NOT NULL,
  ask NUMERIC(20, 8) NOT NULL,
  last NUMERIC(20, 8) NOT NULL,
  prev_close NUMERIC(20, 8) NOT NULL,
  volume NUMERIC(20, 8) NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  CONSTRAINT quotes_latest_bid_ask_chk CHECK (ask >= bid AND bid > 0),
  CONSTRAINT quotes_latest_volume_non_negative CHECK (volume >= 0)
);

CREATE INDEX IF NOT EXISTS market_bars_timeframe_ts_idx
  ON public.market_bars (timeframe, ts DESC);

ALTER TABLE public.market_bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes_latest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_bars_select_public ON public.market_bars;
CREATE POLICY market_bars_select_public ON public.market_bars
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS quotes_latest_select_public ON public.quotes_latest;
CREATE POLICY quotes_latest_select_public ON public.quotes_latest
  FOR SELECT TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.market_bars FROM anon, authenticated;
GRANT SELECT ON TABLE public.market_bars TO anon, authenticated;

REVOKE ALL ON TABLE public.quotes_latest FROM anon, authenticated;
GRANT SELECT ON TABLE public.quotes_latest TO anon, authenticated;
