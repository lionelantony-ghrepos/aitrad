-- 0006 · lock profiles.persona (PBI-012 privilege review)
-- Authenticated clients must not assign or change role. Service/project_admin only.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE OR REPLACE FUNCTION public.profiles_protect_persona()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF CURRENT_USER IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.persona := NULL;
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.persona IS DISTINCT FROM OLD.persona THEN
      RAISE EXCEPTION 'persona is service-managed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_persona ON public.profiles;
CREATE TRIGGER profiles_protect_persona
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_persona();

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND persona IS NULL);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.profiles TO authenticated;
GRANT INSERT (
  id,
  user_id,
  display_name,
  experience_level,
  suitability_tier,
  objectives,
  created_at,
  updated_at
) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (
  display_name,
  experience_level,
  suitability_tier,
  objectives,
  updated_at
) ON TABLE public.profiles TO authenticated;
