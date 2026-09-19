-- 0025 · audit_log hash chain, verify RPC, retention purge (PBI-029)
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS prev_hash TEXT;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS row_hash TEXT;

CREATE OR REPLACE FUNCTION public.audit_log_canonical(r public.audit_log)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'action', r.action,
    'created_at', r.created_at,
    'entity_id', r.entity_id,
    'entity_type', r.entity_type,
    'id', r.id,
    'payload', COALESCE(r.payload, '{}'::jsonb),
    'user_id', r.user_id
  )::text;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_compute_hash(canonical text, prev_hash text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(convert_to(canonical || COALESCE(prev_hash, ''), 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.audit_log_set_chain()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prev text;
BEGIN
  PERFORM pg_advisory_xact_lock(829029);
  SELECT a.row_hash
    INTO prev
    FROM public.audit_log AS a
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT 1;
  NEW.prev_hash := COALESCE(prev, '');
  NEW.row_hash := public.audit_log_compute_hash(public.audit_log_canonical(NEW), NEW.prev_hash);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON public.audit_log;
DROP TRIGGER IF EXISTS audit_log_no_delete ON public.audit_log;
DROP TRIGGER IF EXISTS audit_log_set_chain ON public.audit_log;

DO $$
DECLARE
  r public.audit_log;
  prev text := '';
  computed text;
BEGIN
  FOR r IN
    SELECT * FROM public.audit_log ORDER BY created_at ASC, id ASC
  LOOP
    computed := public.audit_log_compute_hash(public.audit_log_canonical(r), prev);
    UPDATE public.audit_log
      SET prev_hash = prev, row_hash = computed
      WHERE id = r.id;
    prev := computed;
  END LOOP;
END;
$$;

UPDATE public.audit_log SET prev_hash = '' WHERE prev_hash IS NULL;
UPDATE public.audit_log SET row_hash = repeat('0', 64) WHERE row_hash IS NULL;

ALTER TABLE public.audit_log
  ALTER COLUMN prev_hash SET DEFAULT '';

ALTER TABLE public.audit_log
  ALTER COLUMN prev_hash SET NOT NULL;

ALTER TABLE public.audit_log
  ALTER COLUMN row_hash SET NOT NULL;

CREATE TRIGGER audit_log_set_chain
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_set_chain();

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

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_append_only();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_append_only();

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

CREATE INDEX IF NOT EXISTS audit_log_action_idx ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_row_hash_idx ON public.audit_log (row_hash);

REVOKE ALL ON FUNCTION public.verify_audit_chain(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain(timestamptz, timestamptz) TO project_admin;

REVOKE ALL ON FUNCTION public.apply_audit_retention(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_audit_retention(integer) TO project_admin;
