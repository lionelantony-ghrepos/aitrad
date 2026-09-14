-- 0021 · monitors (PBI-027)
-- Spec prompt called this 0014; 0014 is already alerts.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.copilot_sessions (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  nl_instruction TEXT NOT NULL,
  compiled_condition JSONB NOT NULL,
  scope JSONB NOT NULL,
  cadence TEXT NOT NULL DEFAULT '5m',
  last_run TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  throttle_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  propose_action JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT monitors_name_nonempty CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT monitors_nl_nonempty CHECK (char_length(btrim(nl_instruction)) > 0),
  CONSTRAINT monitors_condition_object CHECK (jsonb_typeof(compiled_condition) = 'object'),
  CONSTRAINT monitors_scope_object CHECK (jsonb_typeof(scope) = 'object'),
  CONSTRAINT monitors_cadence_chk CHECK (cadence IN ('5m', '15m', '1h', '1d'))
);

CREATE INDEX IF NOT EXISTS monitors_user_id_idx ON public.monitors (user_id);
CREATE INDEX IF NOT EXISTS monitors_active_idx ON public.monitors (active) WHERE active = true;

DROP TRIGGER IF EXISTS monitors_set_updated_at ON public.monitors;
CREATE TRIGGER monitors_set_updated_at
  BEFORE UPDATE ON public.monitors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS monitors_select_own ON public.monitors;
CREATE POLICY monitors_select_own ON public.monitors
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS monitors_insert_own ON public.monitors;
CREATE POLICY monitors_insert_own ON public.monitors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS monitors_update_own ON public.monitors;
CREATE POLICY monitors_update_own ON public.monitors
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS monitors_delete_own ON public.monitors;
CREATE POLICY monitors_delete_own ON public.monitors
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.monitors FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitors TO project_admin;

ALTER TABLE public.alerts
  ALTER COLUMN alert_rule_id DROP NOT NULL;

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS monitor_id UUID REFERENCES public.monitors (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS alerts_monitor_id_idx ON public.alerts (monitor_id);

ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_source_chk;
ALTER TABLE public.alerts ADD CONSTRAINT alerts_source_chk CHECK (
  (alert_rule_id IS NOT NULL AND monitor_id IS NULL)
  OR (alert_rule_id IS NULL AND monitor_id IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.count_user_monitors(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COUNT(*)::INTEGER FROM public.monitors WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.count_user_monitors(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_user_monitors(UUID) TO project_admin;
