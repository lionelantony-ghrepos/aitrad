-- 0013 · screens + daily RSI + parameterized screener RPC (PBI-021)
-- Spec prompt called this 0008; 0008 is already order-service.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT screens_name_nonempty CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT screens_criteria_object CHECK (jsonb_typeof(criteria) = 'object'),
  CONSTRAINT screens_user_name_key UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS screens_user_id_idx ON public.screens (user_id);

DROP TRIGGER IF EXISTS screens_set_updated_at ON public.screens;
CREATE TRIGGER screens_set_updated_at
  BEFORE UPDATE ON public.screens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS screens_select_own ON public.screens;
CREATE POLICY screens_select_own ON public.screens
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS screens_insert_own ON public.screens;
CREATE POLICY screens_insert_own ON public.screens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS screens_update_own ON public.screens;
CREATE POLICY screens_update_own ON public.screens
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS screens_delete_own ON public.screens;
CREATE POLICY screens_delete_own ON public.screens
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.screens FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.screens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.screens TO project_admin;

CREATE TABLE IF NOT EXISTS public.instrument_daily_rsi (
  instrument_id UUID PRIMARY KEY REFERENCES public.instruments (id) ON DELETE CASCADE,
  rsi_14 NUMERIC(20, 8),
  as_of_date DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS instrument_daily_rsi_set_updated_at ON public.instrument_daily_rsi;
CREATE TRIGGER instrument_daily_rsi_set_updated_at
  BEFORE UPDATE ON public.instrument_daily_rsi
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.instrument_daily_rsi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS instrument_daily_rsi_select_public ON public.instrument_daily_rsi;
CREATE POLICY instrument_daily_rsi_select_public ON public.instrument_daily_rsi
  FOR SELECT TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.instrument_daily_rsi FROM anon, authenticated;
GRANT SELECT ON TABLE public.instrument_daily_rsi TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.instrument_daily_rsi TO project_admin;

CREATE OR REPLACE FUNCTION public.exec_screener(p_sql text, p_params jsonb)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  IF p_sql IS NULL OR p_sql !~ '^SELECT ' THEN
    RAISE EXCEPTION 'SCREENER_SQL_REJECTED';
  END IF;
  IF position(';' IN p_sql) > 0 THEN
    RAISE EXCEPTION 'SCREENER_SQL_REJECTED';
  END IF;
  IF p_sql ~* '\m(drop|insert|update|delete|alter|truncate|create|grant|revoke|copy|execute|into|union|pg_sleep)\M' THEN
    RAISE EXCEPTION 'SCREENER_SQL_REJECTED';
  END IF;
  IF position('FROM public.instruments i' IN p_sql) = 0 THEN
    RAISE EXCEPTION 'SCREENER_SQL_REJECTED';
  END IF;
  FOR rec IN EXECUTE p_sql USING COALESCE(p_params, '[]'::jsonb)
  LOOP
    RETURN NEXT to_jsonb(rec);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.exec_screener(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_screener(text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_screener(text, jsonb) TO project_admin;
