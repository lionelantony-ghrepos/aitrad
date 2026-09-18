-- 0028 · InsForge-compat audit RPCs (Path A migrate PE)
-- Forward replacement for hosts that already applied 0025 with function
-- session options / session-config helpers the InsForge runner rejects.
-- Fresh Path A uses the edited 0025; this file is a no-op-shaped CREATE OR REPLACE.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE OR REPLACE FUNCTION public.audit_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Retention DELETE is apply_audit_retention only (EXECUTE project_admin).
  -- JWT has no DELETE (0026). InsForge migrations forbid session-config GUC gates.
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_audit_chain(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  ok boolean,
  checked integer,
  broken_id uuid,
  expected_hash text,
  actual_hash text,
  reason text
)
LANGUAGE plpgsql
STABLE
-- InsForge migrations forbid SET search_path; objects are schema-qualified.
AS $$
DECLARE
  r public.audit_log;
  prev_row public.audit_log;
  n integer := 0;
  expected text;
  first boolean := true;
BEGIN
  FOR r IN
    SELECT *
    FROM public.audit_log
    WHERE (p_from IS NULL OR created_at >= p_from)
      AND (p_to IS NULL OR created_at <= p_to)
    ORDER BY created_at ASC, id ASC
  LOOP
    n := n + 1;
    IF first THEN
      expected := public.audit_log_compute_hash(public.audit_log_canonical(r), COALESCE(r.prev_hash, ''));
      IF r.row_hash IS DISTINCT FROM expected THEN
        ok := false;
        checked := n;
        broken_id := r.id;
        expected_hash := expected;
        actual_hash := r.row_hash;
        reason := 'ROW_HASH_MISMATCH';
        RETURN NEXT;
        RETURN;
      END IF;
      first := false;
      prev_row := r;
      CONTINUE;
    END IF;
    IF r.prev_hash IS DISTINCT FROM prev_row.row_hash THEN
      ok := false;
      checked := n;
      broken_id := r.id;
      expected_hash := prev_row.row_hash;
      actual_hash := r.prev_hash;
      reason := 'PREV_HASH_MISMATCH';
      RETURN NEXT;
      RETURN;
    END IF;
    expected := public.audit_log_compute_hash(public.audit_log_canonical(r), r.prev_hash);
    IF r.row_hash IS DISTINCT FROM expected THEN
      ok := false;
      checked := n;
      broken_id := r.id;
      expected_hash := expected;
      actual_hash := r.row_hash;
      reason := 'ROW_HASH_MISMATCH';
      RETURN NEXT;
      RETURN;
    END IF;
    prev_row := r;
  END LOOP;

  ok := true;
  checked := n;
  broken_id := NULL;
  expected_hash := NULL;
  actual_hash := NULL;
  reason := NULL;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_audit_retention(p_days integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
-- InsForge migrations forbid SET search_path; objects are schema-qualified.
AS $$
DECLARE
  n integer;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    RAISE EXCEPTION 'AUDIT_RETENTION_INVALID';
  END IF;
  -- InsForge migrations forbid session-config helpers; JWT has no DELETE (0026).
  DELETE FROM public.audit_log
  WHERE created_at < (NOW() - make_interval(days => p_days));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_audit_chain(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain(timestamptz, timestamptz) TO project_admin;

REVOKE ALL ON FUNCTION public.apply_audit_retention(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_audit_retention(integer) TO project_admin;
