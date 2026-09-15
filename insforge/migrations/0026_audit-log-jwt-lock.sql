-- 0026 · audit_log JWT has no DML (PBI-029 review)
-- SELECT/INSERT/UPDATE/DELETE stay project_admin (writeAuditLog / audit-service admin).
-- Idempotent. Do not wrap in BEGIN/COMMIT.

DROP POLICY IF EXISTS audit_log_insert_own ON public.audit_log;
DROP POLICY IF EXISTS audit_log_select_own ON public.audit_log;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_log FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_log TO project_admin;
