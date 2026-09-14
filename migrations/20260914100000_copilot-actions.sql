-- 0019 · copilot_actions (PBI-026)
-- Spec prompt called this 0013; 0013 is already screener.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.copilot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.copilot_sessions (id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  executed_ref TEXT,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT copilot_actions_tool_chk CHECK (
    tool IN ('create_watchlist_item', 'create_alert', 'propose_order', 'create_monitor')
  ),
  CONSTRAINT copilot_actions_status_chk CHECK (
    status IN ('proposed', 'auto_approved', 'approved', 'rejected', 'executed', 'failed')
  ),
  CONSTRAINT copilot_actions_payload_obj CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS copilot_actions_user_status_idx
  ON public.copilot_actions (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS copilot_actions_session_idx
  ON public.copilot_actions (session_id, created_at);
CREATE INDEX IF NOT EXISTS copilot_actions_user_day_idx
  ON public.copilot_actions (user_id, created_at);

DROP TRIGGER IF EXISTS copilot_actions_set_updated_at ON public.copilot_actions;
CREATE TRIGGER copilot_actions_set_updated_at
  BEFORE UPDATE ON public.copilot_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.copilot_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_actions_select_own ON public.copilot_actions;
CREATE POLICY copilot_actions_select_own ON public.copilot_actions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Writes are copilot-orchestrator only (createAdminClient / API_KEY → project_admin).
-- Authenticated JWT is SELECT-only so approve/reject cannot be patched via PostgREST.
DROP POLICY IF EXISTS copilot_actions_insert_own ON public.copilot_actions;
DROP POLICY IF EXISTS copilot_actions_update_own ON public.copilot_actions;
DROP POLICY IF EXISTS copilot_actions_delete_own ON public.copilot_actions;

REVOKE ALL ON TABLE public.copilot_actions FROM anon, authenticated;
GRANT SELECT ON TABLE public.copilot_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.copilot_actions TO project_admin;

CREATE OR REPLACE FUNCTION public.count_copilot_user_actions_today(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COUNT(*)::integer
  FROM public.copilot_actions
  WHERE user_id = p_user_id
    AND created_at >= (timezone('utc', now()))::date;
$$;

REVOKE ALL ON FUNCTION public.count_copilot_user_actions_today(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_copilot_user_actions_today(UUID) TO project_admin;
