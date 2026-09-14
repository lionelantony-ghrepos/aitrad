-- 0022 · monitors JWT owner PATCH columns (PBI-027 follow-up)
-- Eval/fire (`last_run`, compiled fields) stay service/project_admin.
-- Authenticated may CRUD own rows but UPDATE only name/active/throttle_state.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

REVOKE INSERT, UPDATE ON TABLE public.monitors FROM anon, authenticated;

GRANT INSERT (
  user_id,
  session_id,
  name,
  nl_instruction,
  compiled_condition,
  scope,
  cadence,
  active,
  throttle_state,
  propose_action
) ON TABLE public.monitors TO authenticated;

GRANT UPDATE (name, active, throttle_state) ON TABLE public.monitors TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitors TO project_admin;
