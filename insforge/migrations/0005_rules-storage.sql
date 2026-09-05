-- 0005 · rules storage (PBI-011)
-- Spec prompt called this 0004; 0004 is already watchlists.
-- Idempotent: safe to re-execute. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rule_sets_domain_key UNIQUE (domain)
);

CREATE TABLE IF NOT EXISTS public.decision_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES public.rule_sets(id) ON DELETE CASCADE,
  table_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL,
  hit_policy TEXT NOT NULL,
  default_outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT decision_tables_status_chk CHECK (status IN ('draft', 'published', 'retired')),
  CONSTRAINT decision_tables_hit_policy_chk CHECK (hit_policy IN ('FIRST', 'ALL', 'COLLECT')),
  CONSTRAINT decision_tables_version_positive CHECK (version > 0),
  CONSTRAINT decision_tables_key_version_key UNIQUE (table_key, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS decision_tables_one_published_idx
  ON public.decision_tables (table_key)
  WHERE status = 'published';

CREATE TABLE IF NOT EXISTS public.decision_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.decision_tables(id) ON DELETE CASCADE,
  row_key TEXT NOT NULL,
  priority INTEGER NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  CONSTRAINT decision_rows_table_row_key UNIQUE (table_id, row_key)
);

CREATE TABLE IF NOT EXISTS public.rule_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  table_id UUID NOT NULL REFERENCES public.decision_tables(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rule_bindings_domain_table_key UNIQUE (domain, table_id)
);

CREATE TABLE IF NOT EXISTS public.rule_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  table_versions JSONB NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcome JSONB NOT NULL,
  latency_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rule_audit_latency_nonneg CHECK (latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS decision_tables_rule_set_id_idx ON public.decision_tables (rule_set_id);
CREATE INDEX IF NOT EXISTS decision_tables_status_idx ON public.decision_tables (status);
CREATE INDEX IF NOT EXISTS decision_rows_table_id_idx ON public.decision_rows (table_id);
CREATE INDEX IF NOT EXISTS rule_bindings_domain_idx ON public.rule_bindings (domain);
CREATE INDEX IF NOT EXISTS rule_audit_domain_idx ON public.rule_audit (domain);
CREATE INDEX IF NOT EXISTS rule_audit_created_at_idx ON public.rule_audit (created_at);

CREATE OR REPLACE FUNCTION public.rule_audit_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'rule_audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS rule_sets_set_updated_at ON public.rule_sets;
CREATE TRIGGER rule_sets_set_updated_at
  BEFORE UPDATE ON public.rule_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS decision_tables_set_updated_at ON public.decision_tables;
CREATE TRIGGER decision_tables_set_updated_at
  BEFORE UPDATE ON public.decision_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS rule_audit_no_update ON public.rule_audit;
CREATE TRIGGER rule_audit_no_update
  BEFORE UPDATE ON public.rule_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.rule_audit_append_only();

DROP TRIGGER IF EXISTS rule_audit_no_delete ON public.rule_audit;
CREATE TRIGGER rule_audit_no_delete
  BEFORE DELETE ON public.rule_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.rule_audit_append_only();

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('rules', 'Decision-table publish / cache invalidation', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

CREATE OR REPLACE FUNCTION public.publish_rules_published(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, realtime, pg_temp
AS $$
BEGIN
  PERFORM realtime.publish('rules', 'rules:published', payload);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_rules_published(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_rules_published(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_rules_published(jsonb) TO project_admin;

INSERT INTO public.feature_flags (key, value, user_id)
SELECT 'rules.publish_generation', '0'::jsonb, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags WHERE key = 'rules.publish_generation' AND user_id IS NULL
);

ALTER TABLE public.rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rule_sets_select_authenticated ON public.rule_sets;
CREATE POLICY rule_sets_select_authenticated ON public.rule_sets
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS decision_tables_select_authenticated ON public.decision_tables;
CREATE POLICY decision_tables_select_authenticated ON public.decision_tables
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS decision_rows_select_authenticated ON public.decision_rows;
CREATE POLICY decision_rows_select_authenticated ON public.decision_rows
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS rule_bindings_select_authenticated ON public.rule_bindings;
CREATE POLICY rule_bindings_select_authenticated ON public.rule_bindings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS rule_audit_select_own ON public.rule_audit;
CREATE POLICY rule_audit_select_own ON public.rule_audit
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.rule_sets FROM anon, authenticated;
REVOKE ALL ON TABLE public.decision_tables FROM anon, authenticated;
REVOKE ALL ON TABLE public.decision_rows FROM anon, authenticated;
REVOKE ALL ON TABLE public.rule_bindings FROM anon, authenticated;
REVOKE ALL ON TABLE public.rule_audit FROM anon, authenticated;

GRANT SELECT ON TABLE public.rule_sets TO authenticated;
GRANT SELECT ON TABLE public.decision_tables TO authenticated;
GRANT SELECT ON TABLE public.decision_rows TO authenticated;
GRANT SELECT ON TABLE public.rule_bindings TO authenticated;
GRANT SELECT ON TABLE public.rule_audit TO authenticated;
