-- 0004 · watchlists and watchlist_items (PBI-007)
-- Spec prompt called this 0003; 0003 is already market_calendar/feed.
-- Idempotent: safe to re-execute. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT watchlists_name_nonempty CHECK (char_length(btrim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT watchlist_items_watchlist_instrument_key UNIQUE (watchlist_id, instrument_id)
);

CREATE INDEX IF NOT EXISTS watchlists_user_id_idx ON public.watchlists (user_id);
CREATE INDEX IF NOT EXISTS watchlist_items_watchlist_id_idx ON public.watchlist_items (watchlist_id);
CREATE INDEX IF NOT EXISTS watchlist_items_instrument_id_idx ON public.watchlist_items (instrument_id);

DROP TRIGGER IF EXISTS watchlists_set_updated_at ON public.watchlists;
CREATE TRIGGER watchlists_set_updated_at
  BEFORE UPDATE ON public.watchlists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS watchlists_select_own ON public.watchlists;
CREATE POLICY watchlists_select_own ON public.watchlists
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS watchlists_insert_own ON public.watchlists;
CREATE POLICY watchlists_insert_own ON public.watchlists
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS watchlists_update_own ON public.watchlists;
CREATE POLICY watchlists_update_own ON public.watchlists
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS watchlists_delete_own ON public.watchlists;
CREATE POLICY watchlists_delete_own ON public.watchlists
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS watchlist_items_select_own ON public.watchlist_items;
CREATE POLICY watchlist_items_select_own ON public.watchlist_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.watchlists w
      WHERE w.id = watchlist_id AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS watchlist_items_insert_own ON public.watchlist_items;
CREATE POLICY watchlist_items_insert_own ON public.watchlist_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.watchlists w
      WHERE w.id = watchlist_id AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS watchlist_items_update_own ON public.watchlist_items;
CREATE POLICY watchlist_items_update_own ON public.watchlist_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.watchlists w
      WHERE w.id = watchlist_id AND w.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.watchlists w
      WHERE w.id = watchlist_id AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS watchlist_items_delete_own ON public.watchlist_items;
CREATE POLICY watchlist_items_delete_own ON public.watchlist_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.watchlists w
      WHERE w.id = watchlist_id AND w.user_id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON TABLE public.watchlists FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.watchlists TO authenticated;

REVOKE ALL ON TABLE public.watchlist_items FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.watchlist_items TO authenticated;
