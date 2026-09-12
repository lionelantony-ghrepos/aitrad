-- 0016 · user_roles (PBI-024)
-- Spec prompt called this 0011; 0011 is already news-items.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'trader',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_roles_role_chk CHECK (role IN ('trader', 'admin', 'compliance'))
);

DROP TRIGGER IF EXISTS user_roles_set_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_set_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.user_roles_default_trader()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'trader')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_users_default_user_role ON auth.users;
CREATE TRIGGER auth_users_default_user_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.user_roles_default_trader();

INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id,
  CASE
    WHEN p.persona IN ('trader', 'admin', 'compliance') THEN p.persona
    ELSE 'trader'
  END
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO project_admin;

CREATE OR REPLACE FUNCTION public.list_user_directory()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
  SELECT
    u.id,
    u.email::text,
    p.display_name,
    COALESCE(r.role, 'trader')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles r ON r.user_id = u.id
  ORDER BY u.email;
$$;

REVOKE ALL ON FUNCTION public.list_user_directory() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_user_directory() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_directory() TO project_admin;
