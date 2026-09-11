-- 0017 · copilot_sessions + copilot_messages (PBI-025)
-- Spec prompt called this 0012; 0012 is already fundamentals.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.copilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New session',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT copilot_sessions_title_nonempty CHECK (char_length(btrim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS copilot_sessions_user_id_idx ON public.copilot_sessions (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS copilot_sessions_set_updated_at ON public.copilot_sessions;
CREATE TRIGGER copilot_sessions_set_updated_at
  BEFORE UPDATE ON public.copilot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.copilot_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_sessions_select_own ON public.copilot_sessions;
CREATE POLICY copilot_sessions_select_own ON public.copilot_sessions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS copilot_sessions_insert_own ON public.copilot_sessions;
CREATE POLICY copilot_sessions_insert_own ON public.copilot_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS copilot_sessions_update_own ON public.copilot_sessions;
CREATE POLICY copilot_sessions_update_own ON public.copilot_sessions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS copilot_sessions_delete_own ON public.copilot_sessions;
CREATE POLICY copilot_sessions_delete_own ON public.copilot_sessions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.copilot_sessions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.copilot_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.copilot_sessions TO project_admin;

CREATE TABLE IF NOT EXISTS public.copilot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.copilot_sessions (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT copilot_messages_role_chk CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  CONSTRAINT copilot_messages_tool_calls_array CHECK (jsonb_typeof(tool_calls) = 'array')
);

CREATE INDEX IF NOT EXISTS copilot_messages_session_id_idx ON public.copilot_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS copilot_messages_user_day_idx ON public.copilot_messages (user_id, created_at);

ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_messages_select_own ON public.copilot_messages;
CREATE POLICY copilot_messages_select_own ON public.copilot_messages
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS copilot_messages_insert_own ON public.copilot_messages;
CREATE POLICY copilot_messages_insert_own ON public.copilot_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.copilot_sessions s
      WHERE s.id = session_id AND s.user_id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON TABLE public.copilot_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.copilot_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.copilot_messages TO project_admin;

CREATE OR REPLACE FUNCTION public.count_copilot_user_messages_today(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COUNT(*)::integer
  FROM public.copilot_messages
  WHERE user_id = p_user_id
    AND role = 'user'
    AND created_at >= (timezone('utc', now()))::date;
$$;

REVOKE ALL ON FUNCTION public.count_copilot_user_messages_today(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_copilot_user_messages_today(UUID) TO project_admin;
