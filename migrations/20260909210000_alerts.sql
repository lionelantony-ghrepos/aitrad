-- 0014 · alert_rules + alerts + alerts realtime (PBI-022)
-- Spec prompt called this 0009; 0009 is already paper-matching.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES public.instruments (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  condition JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  throttle_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT alert_rules_name_nonempty CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT alert_rules_kind_chk CHECK (
    kind IN (
      'price_cross_above',
      'price_cross_below',
      'pct_chg',
      'volume',
      'rsi',
      'news_sentiment'
    )
  ),
  CONSTRAINT alert_rules_condition_object CHECK (jsonb_typeof(condition) = 'object')
);

CREATE INDEX IF NOT EXISTS alert_rules_user_id_idx ON public.alert_rules (user_id);
CREATE INDEX IF NOT EXISTS alert_rules_active_idx ON public.alert_rules (active) WHERE active = true;

DROP TRIGGER IF EXISTS alert_rules_set_updated_at ON public.alert_rules;
CREATE TRIGGER alert_rules_set_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alert_rules_select_own ON public.alert_rules;
CREATE POLICY alert_rules_select_own ON public.alert_rules
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS alert_rules_insert_own ON public.alert_rules;
CREATE POLICY alert_rules_insert_own ON public.alert_rules
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS alert_rules_update_own ON public.alert_rules;
CREATE POLICY alert_rules_update_own ON public.alert_rules
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS alert_rules_delete_own ON public.alert_rules;
CREATE POLICY alert_rules_delete_own ON public.alert_rules
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.alert_rules FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alert_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alert_rules TO project_admin;

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_rule_id UUID NOT NULL REFERENCES public.alert_rules (id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES public.instruments (id) ON DELETE SET NULL,
  fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT alerts_message_nonempty CHECK (char_length(btrim(message)) > 0)
);

CREATE INDEX IF NOT EXISTS alerts_user_id_idx ON public.alerts (user_id);
CREATE INDEX IF NOT EXISTS alerts_user_unread_idx ON public.alerts (user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS alerts_fired_at_idx ON public.alerts (user_id, fired_at DESC);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alerts_select_own ON public.alerts;
CREATE POLICY alerts_select_own ON public.alerts
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS alerts_update_own ON public.alerts;
CREATE POLICY alerts_update_own ON public.alerts
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.alerts FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alerts TO project_admin;

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('alerts:*', 'Per-user alert fire events', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

CREATE OR REPLACE FUNCTION public.publish_alert_event(p_user_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, realtime, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'PUBLISH_FORBIDDEN';
  END IF;
  PERFORM realtime.publish('alerts:' || p_user_id::text, 'alert', payload);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_alert_event(uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_alert_event(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_alert_event(uuid, jsonb) TO project_admin;
