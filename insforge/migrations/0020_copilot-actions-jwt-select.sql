-- 0020 · copilot_actions JWT is SELECT-only (PBI-026 review)
-- INSERT/UPDATE stay project_admin (orchestrator / decide service).
-- Idempotent. Do not wrap in BEGIN/COMMIT.

DROP POLICY IF EXISTS copilot_actions_insert_own ON public.copilot_actions;
DROP POLICY IF EXISTS copilot_actions_update_own ON public.copilot_actions;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.copilot_actions FROM anon, authenticated;
GRANT SELECT ON TABLE public.copilot_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.copilot_actions TO project_admin;
