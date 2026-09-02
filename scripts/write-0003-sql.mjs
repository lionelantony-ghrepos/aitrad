import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marketCalendarInsertSql } from "../packages/mock-data/src/calendar-sql.ts";

const header = `-- 0003 · market_calendar (NYSE 2026), feed flags, quotes realtime channel
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.market_calendar (
  venue TEXT NOT NULL DEFAULT 'NYSE',
  session_date DATE NOT NULL,
  session_kind TEXT NOT NULL,
  open_minute INTEGER NOT NULL,
  close_minute INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT market_calendar_pkey PRIMARY KEY (venue, session_date),
  CONSTRAINT market_calendar_kind_chk CHECK (session_kind IN ('regular', 'half')),
  CONSTRAINT market_calendar_minutes_chk CHECK (close_minute > open_minute AND open_minute >= 0)
);

DROP TRIGGER IF EXISTS market_calendar_set_updated_at ON public.market_calendar;
CREATE TRIGGER market_calendar_set_updated_at
  BEFORE UPDATE ON public.market_calendar
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.market_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_calendar_select_public ON public.market_calendar;
CREATE POLICY market_calendar_select_public ON public.market_calendar
  FOR SELECT TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.market_calendar FROM anon, authenticated;
GRANT SELECT ON TABLE public.market_calendar TO anon, authenticated;

INSERT INTO public.feature_flags (key, value, user_id)
SELECT 'feed.paused', 'false'::jsonb, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags WHERE key = 'feed.paused' AND user_id IS NULL
);

INSERT INTO public.feature_flags (key, value, user_id)
SELECT 'feed.speed', '1'::jsonb, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags WHERE key = 'feed.speed' AND user_id IS NULL
);

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('quotes', 'Coalesced mock quote batches', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

ALTER TABLE realtime.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quotes_channel_select ON realtime.channels;
CREATE POLICY quotes_channel_select ON realtime.channels
  FOR SELECT TO anon, authenticated
  USING (pattern = 'quotes');

CREATE OR REPLACE FUNCTION public.publish_quotes_batch(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime
AS $$
BEGIN
  PERFORM realtime.publish('quotes', 'tick_batch', payload);
END;
$$;

`;

writeFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../insforge/migrations/0003_market-calendar-and-feed.sql",
  ),
  `${header}\n${marketCalendarInsertSql(2026)}\n`,
);
