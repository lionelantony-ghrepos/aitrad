-- 0024 · briefs JWT is SELECT-only (PBI-028 review)
-- INSERT/UPDATE/DELETE stay project_admin (brief-service admin client).
-- Idempotent. Do not wrap in BEGIN/COMMIT.

DROP POLICY IF EXISTS briefs_insert_own ON public.briefs;
DROP POLICY IF EXISTS briefs_update_own ON public.briefs;
DROP POLICY IF EXISTS briefs_delete_own ON public.briefs;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.briefs FROM anon, authenticated;
GRANT SELECT ON TABLE public.briefs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.briefs TO project_admin;
