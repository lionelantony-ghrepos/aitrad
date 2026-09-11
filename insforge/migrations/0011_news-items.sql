-- 0011 · news_items (PBI-019)
-- Spec prompt called this 0006; 0006 is already profiles.persona protection.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL,
  symbols TEXT[] NOT NULL DEFAULT '{}'::text[],
  sector TEXT,
  sentiment NUMERIC(8, 5) NOT NULL,
  event_type TEXT NOT NULL,
  CONSTRAINT news_items_headline_nonempty CHECK (char_length(btrim(headline)) > 0),
  CONSTRAINT news_items_body_nonempty CHECK (char_length(btrim(body)) > 0),
  CONSTRAINT news_items_sentiment_chk CHECK (sentiment >= -1 AND sentiment <= 1),
  CONSTRAINT news_items_event_type_chk CHECK (
    event_type IN ('earnings', 'analyst', 'macro', 'product', 'regulatory', 'mna')
  )
);

CREATE INDEX IF NOT EXISTS news_items_ts_idx ON public.news_items (ts DESC);
CREATE INDEX IF NOT EXISTS news_items_symbols_idx ON public.news_items USING GIN (symbols);
CREATE INDEX IF NOT EXISTS news_items_event_type_idx ON public.news_items (event_type);

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS news_items_select_public ON public.news_items;
CREATE POLICY news_items_select_public ON public.news_items
  FOR SELECT TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.news_items FROM anon, authenticated;
GRANT SELECT ON TABLE public.news_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.news_items TO project_admin;

INSERT INTO public.feature_flags (key, value, user_id)
SELECT 'news.sim_elapsed_sec', '0'::jsonb, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags WHERE key = 'news.sim_elapsed_sec' AND user_id IS NULL
);

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('news', 'Mock news ticker batches', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

DROP POLICY IF EXISTS news_channel_select ON realtime.channels;

CREATE OR REPLACE FUNCTION public.publish_news_batch(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, realtime, pg_temp
AS $$
BEGIN
  PERFORM realtime.publish('news', 'news_batch', payload);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_news_batch(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_news_batch(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_news_batch(jsonb) TO project_admin;
