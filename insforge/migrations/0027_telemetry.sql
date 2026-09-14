-- 0027 · telemetry (PBI-030)
-- Client errors, sampled function latency, realtime connection samples.
-- JWT has no DML; writes stay project_admin (telemetry + health-service).
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  fn TEXT,
  panel_id TEXT,
  request_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  latency_ms NUMERIC(20, 8),
  outcome TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT telemetry_kind_chk CHECK (kind IN ('fn_latency', 'client_error', 'realtime'))
);

CREATE INDEX IF NOT EXISTS telemetry_created_at_idx ON public.telemetry (created_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_fn_created_idx ON public.telemetry (fn, created_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_kind_created_idx ON public.telemetry (kind, created_at DESC);

ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_select_admin ON public.telemetry;
DROP POLICY IF EXISTS telemetry_insert_own ON public.telemetry;

REVOKE ALL ON TABLE public.telemetry FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telemetry TO project_admin;

INSERT INTO public.feature_flags (key, value)
SELECT 'feed.last_heartbeat', '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags WHERE key = 'feed.last_heartbeat' AND user_id IS NULL
);
