-- 0023 · briefs + morning opt-in (PBI-028)
-- Spec prompt called this 0015; 0015 is news embeddings.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS morning_brief_opt_in BOOLEAN NOT NULL DEFAULT false;

GRANT INSERT (
  id,
  user_id,
  display_name,
  experience_level,
  suitability_tier,
  objectives,
  morning_brief_opt_in,
  created_at,
  updated_at
) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (
  display_name,
  experience_level,
  suitability_tier,
  objectives,
  morning_brief_opt_in,
  updated_at
) ON TABLE public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  content_md TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_key TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT briefs_kind_chk CHECK (kind IN ('morning', 'instrument', 'portfolio')),
  CONSTRAINT briefs_subject_nonempty CHECK (char_length(btrim(subject)) > 0),
  CONSTRAINT briefs_data_object CHECK (jsonb_typeof(data) = 'object')
);

CREATE INDEX IF NOT EXISTS briefs_user_id_created_idx ON public.briefs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS briefs_user_kind_idx ON public.briefs (user_id, kind);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS briefs_select_own ON public.briefs;
CREATE POLICY briefs_select_own ON public.briefs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS briefs_insert_own ON public.briefs;
CREATE POLICY briefs_insert_own ON public.briefs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS briefs_update_own ON public.briefs;
CREATE POLICY briefs_update_own ON public.briefs
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS briefs_delete_own ON public.briefs;
CREATE POLICY briefs_delete_own ON public.briefs
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.briefs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.briefs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.briefs TO project_admin;
